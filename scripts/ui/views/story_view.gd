extends ViewBase
## 剧情探索：章节推进、行动选项与最近异象。

const CHOICE_SIGILS := ["I", "II", "III", "IV"]
const GUIDANCE_STATUS_LABELS := {
	"locked_rank": "先晋升",
	"missing_prerequisite": "补前置",
	"missing_stats": "补属性",
	"ready_to_research": "可破译",
}

var _scroll: ScrollContainer
var _content: VBoxContainer
var _chapter_title: Label
var _chapter_summary: Label
var _meta_row: HBoxContainer
var _focus_title: Label
var _focus_copy: Label
var _focus_atmosphere: Label
var _cue_button: Button
var _cue_chip: PanelContainer
var _stats_grid: GridContainer
var _choices_box: VBoxContainer
var _last_event_box: VBoxContainer
var _snapshot_grid: GridContainer
var _guidance_box: VBoxContainer
var _atmosphere_quote: Label

func _ready() -> void:
	_scroll = UIFactory.scroll_box()
	_scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_scroll)
	_content = UIFactory.vbox(16)
	_scroll.add_child(_content)
	_build_static()
	Game.state_changed.connect(func(_s): refresh())

func view_id() -> String:
	return "story"

func _build_static() -> void:
	# ---- 英雄卡 ----
	var hero := UIFactory.card(false)
	_content.add_child(hero)
	var hero_box := UIFactory.vbox(10)
	hero.add_child(UIFactory.margin(hero_box, 20, 16, 20, 16))

	hero_box.add_child(UIFactory.eyebrow("章节推进 · Story"))
	_chapter_title = UIFactory.title("-", 24)
	hero_box.add_child(_chapter_title)
	_chapter_summary = UIFactory.label("-", 14, ThemeFactory.PALETTE.ink_soft)
	hero_box.add_child(_chapter_summary)
	_meta_row = UIFactory.hbox(8)
	hero_box.add_child(_meta_row)

	var hero_row := UIFactory.hbox(16)
	hero_box.add_child(hero_row)

	var focus := UIFactory.card(false, true)
	focus.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var focus_box := UIFactory.vbox(6)
	focus.add_child(focus_box)
	focus_box.add_child(UIFactory.eyebrow("章节焦点"))
	_focus_title = UIFactory.label("-", 17, ThemeFactory.PALETTE.ink, true)
	focus_box.add_child(_focus_title)
	_focus_copy = UIFactory.label("-", 13, ThemeFactory.PALETTE.ink_soft)
	focus_box.add_child(_focus_copy)
	_focus_atmosphere = UIFactory.label("-", 12, ThemeFactory.PALETTE.ink_muted)
	focus_box.add_child(_focus_atmosphere)
	var focus_actions := UIFactory.hbox(8)
	_cue_button = UIFactory.button("前往魔法阵炼金", "gold")
	_cue_button.pressed.connect(_on_cue_pressed)
	focus_actions.add_child(_cue_button)
	_cue_chip = UIFactory.chip("可立即执行", "ready")
	focus_actions.add_child(_cue_chip)
	focus_box.add_child(focus_actions)
	hero_row.add_child(focus)

	var rail_panel := UIFactory.card(false)
	rail_panel.custom_minimum_size = Vector2(470, 0)
	_stats_grid = GridContainer.new()
	_stats_grid.columns = 2
	_stats_grid.add_theme_constant_override("h_separation", 8)
	_stats_grid.add_theme_constant_override("v_separation", 8)
	rail_panel.add_child(_stats_grid)
	hero_row.add_child(rail_panel)

	# ---- 主体 ----
	var main_row := UIFactory.hbox(16)
	main_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_child(main_row)

	var left_box := UIFactory.vbox(14)
	left_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	main_row.add_child(left_box)

	# 行动选项
	var choices_card := UIFactory.card(false)
	left_box.add_child(choices_card)
	var choices_inner := UIFactory.vbox(10)
	choices_card.add_child(UIFactory.margin(choices_inner, 18, 14, 18, 14))
	var choices_head := UIFactory.hbox(8)
	var choices_head_text := UIFactory.vbox(1)
	choices_head_text.add_child(UIFactory.eyebrow("当前行动"))
	choices_head_text.add_child(UIFactory.title("行动选项", 19))
	choices_head.add_child(choices_head_text)
	choices_head.add_child(UIFactory.spacer())
	choices_inner.add_child(choices_head)
	_choices_box = UIFactory.vbox(8)
	choices_inner.add_child(_choices_box)

	# 最近异象
	_last_event_box = UIFactory.vbox(8)
	left_box.add_child(_last_event_box)

	# ---- 侧栏 ----
	var sidebar := UIFactory.card(false)
	sidebar.custom_minimum_size = Vector2(360, 0)
	var sidebar_inner := UIFactory.vbox(8)
	sidebar.add_child(UIFactory.margin(sidebar_inner, 16, 12, 16, 12))
	sidebar_inner.add_child(UIFactory.eyebrow("剧情辅助"))
	sidebar_inner.add_child(UIFactory.title("快照与线索", 17))
	_snapshot_grid = GridContainer.new()
	_snapshot_grid.columns = 2
	_snapshot_grid.add_theme_constant_override("h_separation", 8)
	_snapshot_grid.add_theme_constant_override("v_separation", 8)
	sidebar_inner.add_child(_snapshot_grid)
	_guidance_box = UIFactory.vbox(6)
	sidebar_inner.add_child(_guidance_box)
	sidebar_inner.add_child(UIFactory.separator_line())
	_atmosphere_quote = UIFactory.label("-", 12, ThemeFactory.PALETTE.ink_muted)
	sidebar_inner.add_child(_atmosphere_quote)
	main_row.add_child(sidebar)

	# ---- 大工导览 ----
	agenda_slot = UIFactory.vbox(0)
	_content.add_child(agenda_slot)

var agenda_slot: VBoxContainer
var _agenda: PanelContainer = null

func refresh() -> void:
	var state := Game.state
	var chapter := Game.get_chapter()
	var plan := GrandWorkPlan.build_grand_work_plan(state)
	var guide = FirstDayGuide.build_first_day_guide(state)
	var guidance = AlchemyCircle.get_next_formula_guidance(state)

	_chapter_title.text = String(chapter.title)
	_chapter_summary.text = String(chapter.summary)

	for child in _meta_row.get_children():
		child.queue_free()
	var discovered_count := 0
	for formula in GameData.ARCANE_FORMULAS:
		if state.discoveredFormulas.has(formula.id):
			discovered_count += 1
	_meta_row.add_child(UIFactory.pill("第 %d 日" % int(state.day)))
	_meta_row.add_child(UIFactory.pill("当前境界：%s" % String(state.rank)))
	_meta_row.add_child(UIFactory.pill("今日行动：%d/3" % int(state.actionsLeft)))
	_meta_row.add_child(UIFactory.pill("已解出定式：%d/%d" % [discovered_count, GameData.ARCANE_FORMULAS.size()]))

	_focus_title.text = String(plan.actionCue.title)
	_focus_copy.text = Game.status_text
	_focus_atmosphere.text = String(chapter.atmosphere)
	if String(plan.actionCue.href) != "story":
		_cue_button.visible = true
		_cue_button.text = "前往%s" % ("剧情探索" if plan.actionCue.href == "story" else ("魔法阵炼金" if plan.actionCue.href == "alchemy" else "炼金档案"))
	else:
		_cue_button.visible = false
	var immediate := "可立即执行"
	if Game.busy or state.ended:
		immediate = "暂不可执行"
	elif int(state.actionsLeft) <= 0:
		immediate = "等待明日恢复"
	if _cue_chip != null and is_instance_valid(_cue_chip):
		_cue_chip.queue_free()
	var tone := "ready" if immediate == "可立即执行" else "neutral"
	_cue_chip = UIFactory.chip(immediate, tone)
	# 重新挂到焦点按钮行
	var focus_actions: HBoxContainer = _cue_button.get_parent()
	focus_actions.call_deferred("add_child", _cue_chip)

	for child in _stats_grid.get_children():
		child.queue_free()
	var clue_entries: Array = []
	for entry in state.journal:
		if String(entry.title).begins_with("定式线索："):
			clue_entries.append(entry)
		if clue_entries.size() >= 3:
			break
	_stats_grid.add_child(_stat_cell("行动", "%d/3" % int(state.actionsLeft), "终局已封存" if state.ended else "仍可推进"))
	_stats_grid.add_child(_stat_cell("定式", "%d/%d" % [discovered_count, GameData.ARCANE_FORMULAS.size()], ("下一条：%s" % String(guidance.formulaName)) if guidance != null else "已全部解析"))
	_stats_grid.add_child(_stat_cell("线索", str(clue_entries.size()), (String(clue_entries[0].title).replace("定式线索：", "") if not clue_entries.is_empty() else "尚待发现")))
	_stats_grid.add_child(_stat_cell("去向", _route_label(String(plan.actionCue.href)), String(plan.actionCue.title)))

	# 行动选项
	for child in _choices_box.get_children():
		child.queue_free()
	for i in range(chapter.choices.size()):
		var choice: Dictionary = chapter.choices[i]
		var parts := UIFactory.link_card(
			CHOICE_SIGILS[i] if i < CHOICE_SIGILS.size() else "0%d" % (i + 1),
			"Action Option", String(choice.label), String(choice.flavorText), ""
		)
		var button: Button = parts.root
		button.custom_minimum_size = Vector2(0, 96)
		button.disabled = Game.busy or int(state.actionsLeft) <= 0 or state.ended
		button.pressed.connect(func(): _on_choice_selected(String(choice.id)))
		_choices_box.add_child(button)

	# 最近异象
	for child in _last_event_box.get_children():
		child.queue_free()
	if state.get("lastEvent") is Dictionary:
		var last_event: Dictionary = state.lastEvent
		var card := UIFactory.card(true)
		var inner := UIFactory.vbox(6)
		card.add_child(UIFactory.margin(inner, 18, 14, 18, 14))
		inner.add_child(UIFactory.eyebrow("最近异象", ThemeFactory.PALETTE.dark_card_text))
		inner.add_child(UIFactory.title("最近一次异象", 17, ThemeFactory.PALETTE.dark_card_text))
		inner.add_child(UIFactory.label("%s · %s" % [String(last_event.title), "AI" if String(last_event.source) == "ai" else "内置"], 15, ThemeFactory.PALETTE.dark_card_text, true))
		inner.add_child(UIFactory.label(String(last_event.body), 13, Color(ThemeFactory.PALETTE.dark_card_text.r, ThemeFactory.PALETTE.dark_card_text.g, ThemeFactory.PALETTE.dark_card_text.b, 0.82)))
		inner.add_child(UIFactory.label(String(last_event.outcomeSummary), 13, Color(ThemeFactory.PALETTE.dark_card_text.r, ThemeFactory.PALETTE.dark_card_text.g, ThemeFactory.PALETTE.dark_card_text.b, 0.72)))
		_last_event_box.add_child(card)

	# 侧栏快照
	for child in _snapshot_grid.get_children():
		child.queue_free()
	_snapshot_grid.add_child(_stat_cell("精力", str(int(state.vigor)), "适合短线行动" if int(state.vigor) <= 3 else "还可连续推进"))
	_snapshot_grid.add_child(_stat_cell("知识", str(int(state.knowledge)), "仍需补足" if guidance != null and String(guidance.status) == "missing_stats" else "足以支撑当前阶段"))
	_snapshot_grid.add_child(_stat_cell("熟练", str(int(state.mastery)), "建议再做几轮练习" if guidance != null and String(guidance.status) == "missing_stats" else "阵式稳定"))
	_snapshot_grid.add_child(_stat_cell("名望", str(int(state.reputation)), ("晋升目标：%s" % String(plan.rankGoal.targetRank)) if plan.rankGoal.targetRank != null else "已抵达上限"))

	# 引导卡
	for child in _guidance_box.get_children():
		child.queue_free()
	if guidance != null:
		var guide_card := UIFactory.card(false, false)
		var guide_inner := UIFactory.vbox(4)
		guide_card.add_child(guide_inner)
		var guide_head := UIFactory.hbox(6)
		guide_head.add_child(UIFactory.label("下一目标：%s" % String(guidance.formulaName), 14, ThemeFactory.PALETTE.ink, true, false))
		guide_head.add_child(UIFactory.spacer())
		guide_head.add_child(UIFactory.chip(GUIDANCE_STATUS_LABELS.get(String(guidance.status), String(guidance.status)), "attention"))
		guide_inner.add_child(guide_head)
		guide_inner.add_child(UIFactory.label("目标产物：%s" % String(guidance.outputLabel), 12, ThemeFactory.PALETTE.ink_muted))
		if not clue_entries.is_empty():
			for entry in clue_entries:
				guide_inner.add_child(UIFactory.label("· %s" % String(entry.title).replace("定式线索：", ""), 12, ThemeFactory.PALETTE.ink_soft))
		else:
			for recommendation in guidance.recommendations.slice(0, 2):
				guide_inner.add_child(UIFactory.label("· %s" % String(recommendation), 12, ThemeFactory.PALETTE.ink_soft))
		_guidance_box.add_child(guide_card)
	else:
		var done_card := UIFactory.card(false, false)
		done_card.add_child(UIFactory.label("所有定式均已解析，接下来只需专注于终局炼成。", 13, ThemeFactory.PALETTE.ink_soft))
		_guidance_box.add_child(done_card)

	_atmosphere_quote.text = String(chapter.atmosphere)

	# 大工导览
	if _agenda != null and is_instance_valid(_agenda):
		_agenda.queue_free()
	var agenda := preload("res://scripts/ui/widgets/grand_work_agenda.gd").new()
	agenda.setup(plan, "story")
	agenda.navigate.connect(func(target): navigate.emit(target))
	_agenda_slot_add(agenda)

func _agenda_slot_add(agenda: PanelContainer) -> void:
	agenda_slot.add_child(agenda)
	_agenda = agenda

func _route_label(href: String) -> String:
	match href:
		"story":
			return "本页推进"
		"alchemy":
			return "魔法阵炼金"
		"journal":
			return "炼金档案"
		_:
			return href

func _stat_cell(label_text: String, value_text: String, note_text: String) -> PanelContainer:
	return UIFactory.stat_cell(label_text, value_text, note_text)

func _on_choice_selected(choice_id: String) -> void:
	Game.do_story_choice(choice_id)

func _on_cue_pressed() -> void:
	var plan := GrandWorkPlan.build_grand_work_plan(Game.state)
	navigate.emit(String(plan.actionCue.href))
