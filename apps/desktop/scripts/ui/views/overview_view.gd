extends ViewBase
## 工坊总览：今日焦点、工作台入口与状态侧栏。

const FORMULA_STATUS_LABELS := {
	"locked_rank": "先晋升",
	"missing_prerequisite": "补前置",
	"missing_stats": "补属性",
	"ready_to_research": "可破译",
	"ready_to_transmute": "可炼成",
	"complete": "已完成",
}

const STATIONS := [
	{"href": "story", "eyebrow": "剧情工位", "sigil": "叙", "title": "剧情探索", "description": "推进章节、触发异象，并在叙事中捕捉新的定式线索。", "footer": "适合提升知识、名望与剧情进度。"},
	{"href": "alchemy", "eyebrow": "炼金圆厅", "sigil": "阵", "title": "魔法阵炼金", "description": "投入材料进入阵位，按等价交换规则显化产物，命中定式时稳定炼成。", "footer": "今天想要赌一把高阶成果，就去这里。"},
	{"href": "journal", "eyebrow": "档案库", "sigil": "录", "title": "炼金档案", "description": "整理库存、回看日志与过场，把分散的线索重新编织成工坊知识。", "footer": "适合复盘与确认下一步目标。"},
	{"href": "settings", "eyebrow": "控制台", "sigil": "律", "title": "工坊设置", "description": "管理 AI 异象来源与仪式音效，让工坊在不同设备上保持稳定体验。", "footer": "默认可完全离线游玩，只把 AI 作为叙事增强。"},
]

var _scroll: ScrollContainer
var _content: VBoxContainer
var _hero_stats: HBoxContainer
var _focus_title: Label
var _focus_copy: Label
var _focus_button: Button
var _chips_row: HBoxContainer
var _station_widgets: Array = []
var _rank_chips_row: HBoxContainer
var _sidebar_box: VBoxContainer

func _ready() -> void:
	_scroll = UIFactory.scroll_box()
	_scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_scroll)

	_content = UIFactory.vbox(16)
	_scroll.add_child(_content)
	_build_static()
	Game.state_changed.connect(func(_s): refresh())

func view_id() -> String:
	return "overview"

func _build_static() -> void:
	# ---- 英雄卡 ----
	var hero := UIFactory.card(false)
	_content.add_child(hero)
	var hero_box := UIFactory.vbox(10)
	hero.add_child(UIFactory.margin(hero_box, 20, 16, 20, 16))

	hero_box.add_child(UIFactory.eyebrow("今日工坊 · Workshop Overview"))
	hero_box.add_child(UIFactory.title("今日工坊", 24))
	hero_box.add_child(UIFactory.label("概览页只负责两件事：告诉你今天的大工重心，以及把你送到正确的工作台。更细的路线、库存和记录都收束到各自的页面里。", 14, ThemeFactory.PALETTE.ink_soft))

	_chips_row = UIFactory.hbox(8)
	hero_box.add_child(_chips_row)

	var hero_row := UIFactory.hbox(16)
	hero_box.add_child(hero_row)

	# 主线标注
	var focus := UIFactory.card(false, true)
	focus.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var focus_box := UIFactory.vbox(6)
	focus.add_child(focus_box)
	focus_box.add_child(UIFactory.eyebrow("今日主线"))
	_focus_title = UIFactory.label("-", 18, ThemeFactory.PALETTE.ink, true)
	focus_box.add_child(_focus_title)
	_focus_copy = UIFactory.label("-", 13, ThemeFactory.PALETTE.ink_soft)
	focus_box.add_child(_focus_copy)
	_focus_button = UIFactory.button("推进剧情探索", "gold")
	_focus_button.pressed.connect(func(): _on_cue_pressed("story"))
	focus_box.add_child(_focus_button)
	hero_row.add_child(focus)

	# 统计栏
	var rail_panel := UIFactory.card(false)
	rail_panel.custom_minimum_size = Vector2(430, 0)
	_hero_stats = UIFactory.hbox(8)
	rail_panel.add_child(_hero_stats)
	hero_row.add_child(rail_panel)

	# ---- 仪表区 ----
	var dashboard := UIFactory.hbox(16)
	dashboard.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_child(dashboard)

	# 左：工作台入口
	var stations_card := UIFactory.card(false)
	stations_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var stations_box := UIFactory.vbox(10)
	stations_card.add_child(UIFactory.margin(stations_box, 18, 14, 18, 14))
	var head := UIFactory.hbox(8)
	var head_text := UIFactory.vbox(1)
	head_text.add_child(UIFactory.eyebrow("工作台入口"))
	head_text.add_child(UIFactory.title("今日工作台", 19))
	head.add_child(head_text)
	head.add_child(UIFactory.spacer())
	_rank_chips_row = UIFactory.hbox(6)
	head.add_child(_rank_chips_row)
	stations_box.add_child(head)

	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 10)
	stations_box.add_child(grid)
	for station in STATIONS:
		var parts := UIFactory.link_card(String(station.sigil), String(station.eyebrow), String(station.title), String(station.description), String(station.footer))
		var button: Button = parts.root
		button.pressed.connect(func(): navigate.emit(String(station.href)))
		grid.add_child(button)
		_station_widgets.append({"station": station, "parts": parts})

	# 右：侧栏
	var sidebar_wrap := UIFactory.scroll_box()
	sidebar_wrap.custom_minimum_size = Vector2(400, 0)
	_sidebar_box = UIFactory.vbox(12)
	sidebar_wrap.add_child(_sidebar_box)
	dashboard.add_child(sidebar_wrap)

func refresh() -> void:
	var state := Game.state
	var plan := GrandWorkPlan.build_grand_work_plan(state)
	var overview := WorkshopOverview.build_workshop_overview(state)
	var guide = FirstDayGuide.build_first_day_guide(state)
	var runtime_config = Game.runtime_ai_config

	for child in _chips_row.get_children():
		child.queue_free()
	_chips_row.add_child(UIFactory.chip("当前阶段：%s" % String(plan.phase.eyebrow), "neutral"))
	if runtime_config != null:
		_chips_row.add_child(UIFactory.chip("AI 异象：%s" % String(runtime_config.model), "ready"))
	else:
		_chips_row.add_child(UIFactory.chip("AI 异象：内置模式", "neutral"))

	_focus_title.text = String(plan.phase.title)
	_focus_copy.text = String(plan.daySignal)
	var cue: Dictionary = plan.actionCue
	_focus_button.text = String(cue.label)

	for child in _hero_stats.get_children():
		child.queue_free()
	var vigor_note := "节律平稳"
	if int(state.vigor) <= 3:
		vigor_note = "适合收束整理"
	elif int(state.vigor) >= 9:
		vigor_note = "适合连续推进"
	_hero_stats.add_child(_stat_cell("精力", "%d/12" % int(state.vigor), vigor_note))
	_hero_stats.add_child(_stat_cell("定式", str(state.discoveredFormulas.size()), ("下一条：%s" % String(plan.formulaGoal.formulaName)) if plan.formulaGoal != null else "当前无阻塞"))
	_hero_stats.add_child(_stat_cell("成品", str(state.completedRecipes.size()), "%d 条配方已解锁" % state.unlockedRecipes.size()))
	_hero_stats.add_child(_stat_cell("库存种类", str(overview.totalResourceKinds), "合计 %d 份材料" % int(overview.totalResourceUnits)))

	# 晋升 chips
	for child in _rank_chips_row.get_children():
		child.queue_free()
	var ready_count := 0
	for requirement in plan.rankGoal.requirements:
		if bool(requirement.ready):
			ready_count += 1
	_rank_chips_row.add_child(UIFactory.chip("晋升准备：%d/%d" % [ready_count, plan.rankGoal.requirements.size()], "ready" if plan.rankGoal.ready else "attention"))
	if plan.formulaGoal != null:
		var status := String(plan.formulaGoal.status)
		var tone := "ready" if status == "ready_to_transmute" else ("attention" if status in ["missing_stats", "missing_prerequisite"] else "neutral")
		_rank_chips_row.add_child(UIFactory.chip("定式状态：%s" % FORMULA_STATUS_LABELS.get(status, status), tone))
	else:
		_rank_chips_row.add_child(UIFactory.chip("定式状态：当前无阻塞", "neutral"))

	# 工作台推荐态
	for widget in _station_widgets:
		var station: Dictionary = widget.station
		var parts: Dictionary = widget.parts
		var recommended := String(station.href) == String(cue.href)
		var badge_slot: HBoxContainer = parts.badge_slot
		for child in badge_slot.get_children():
			child.queue_free()
		if recommended:
			badge_slot.add_child(UIFactory.chip("推荐", "ready"))
		(parts.footer_label as Label).text = String(cue.title) if recommended else String(station.footer)

	# 侧栏
	for child in _sidebar_box.get_children():
		child.queue_free()
	if guide != null:
		var hint := preload("res://scripts/ui/widgets/first_day_hint.gd").new()
		hint.setup(guide, "", true)
		hint.navigate.connect(func(target): navigate.emit(target))
		_sidebar_box.add_child(hint)

	# 大工焦点
	var focus_card := UIFactory.card(false)
	var focus_inner := UIFactory.vbox(8)
	focus_card.add_child(UIFactory.margin(focus_inner, 16, 12, 16, 12))
	focus_inner.add_child(UIFactory.eyebrow("大工焦点"))
	focus_inner.add_child(UIFactory.title("当前推进", 17))
	var focus_grid := GridContainer.new()
	focus_grid.columns = 1
	focus_grid.add_theme_constant_override("v_separation", 8)
	focus_inner.add_child(focus_grid)

	var recommended_station = null
	for station in STATIONS:
		if String(station.href) == String(cue.href):
			recommended_station = station
			break
	var station_title: String = String(recommended_station.title) if recommended_station != null else String(cue.label)
	focus_grid.add_child(_focus_item("推荐工作台", station_title, String(cue.description)))
	if plan.formulaGoal != null:
		var ready_ingredients := 0
		for ingredient in plan.formulaGoal.ingredients:
			if int(ingredient.remaining) == 0:
				ready_ingredients += 1
		var total_ingredients: int = plan.formulaGoal.ingredients.size()
		var formula_note := "可以按自己的节奏推进探索、炼成或档案整理。"
		if total_ingredients > 0:
			formula_note = "材料已就位 %d/%d 项" % [ready_ingredients, total_ingredients]
		else:
			formula_note = "当前状态：%s" % FORMULA_STATUS_LABELS.get(String(plan.formulaGoal.status), String(plan.formulaGoal.status))
		focus_grid.add_child(_focus_item("定式追踪", String(plan.formulaGoal.formulaName), formula_note))
	else:
		focus_grid.add_child(_focus_item("定式追踪", "当前没有新的定式阻塞", "可以按自己的节奏推进。"))
	_sidebar_box.add_child(focus_card)

	# 工坊状态
	var status_card := UIFactory.card(false)
	var status_inner := UIFactory.vbox(8)
	status_card.add_child(UIFactory.margin(status_inner, 16, 12, 16, 12))
	status_inner.add_child(UIFactory.eyebrow("工坊状态"))
	status_inner.add_child(UIFactory.title("状态与记录", 17))

	var meter_specs: Array = [
		{"label": "知识", "value": int(state.knowledge), "color": ThemeFactory.PALETTE.green, "ready": false},
		{"label": "熟练", "value": int(state.mastery), "color": ThemeFactory.PALETTE.teal, "ready": false},
		{"label": "名望", "value": int(state.reputation), "color": ThemeFactory.PALETTE.brown, "ready": false},
	]
	for requirement in plan.rankGoal.requirements:
		for spec in meter_specs:
			if spec.label == requirement.label:
				spec.ready = bool(requirement.ready)
	for spec in meter_specs:
		var meter_box := UIFactory.vbox(3)
		var meter_head := UIFactory.hbox(6)
		meter_head.add_child(UIFactory.label(String(spec.label), 13, ThemeFactory.PALETTE.ink, false, false))
		meter_head.add_child(UIFactory.spacer())
		meter_head.add_child(UIFactory.label(str(spec.value), 13, ThemeFactory.PALETTE.ink_muted, false, false))
		meter_box.add_child(meter_head)
		meter_box.add_child(UIFactory.meter(float(spec.value), 100.0, spec.color))
		var note := "仍可继续补足" if not spec.ready else "晋升要求已达标"
		if spec.label == "熟练" and not spec.ready:
			note = "建议再做几次定向炼成"
		if spec.label == "名望" and not spec.ready:
			note = "剧情推进仍有收益"
		meter_box.add_child(UIFactory.label(note, 11, ThemeFactory.PALETTE.ink_muted))
		status_inner.add_child(meter_box)

	for entry in overview.recentEntries:
		var entry_box := UIFactory.vbox(2)
		var entry_head := UIFactory.hbox(6)
		entry_head.add_child(UIFactory.label("第 %d 日 · %s" % [int(entry.day), String(entry.title)], 13, ThemeFactory.PALETTE.ink, true, false))
		entry_head.add_child(UIFactory.spacer())
		entry_head.add_child(UIFactory.label(WorkshopOverview.ENTRY_TYPE_LABELS.get(String(entry.type), String(entry.type)), 11, ThemeFactory.PALETTE.ink_muted, false, false))
		entry_box.add_child(entry_head)
		entry_box.add_child(UIFactory.label(String(entry.preview), 12, ThemeFactory.PALETTE.ink_soft))
		status_inner.add_child(entry_box)
	if overview.recentEntries.is_empty():
		status_inner.add_child(UIFactory.label("还没有新的工坊记录，先去推进一次剧情或炼成吧。", 12, ThemeFactory.PALETTE.ink_muted))

	var reserve_row := UIFactory.hbox(6)
	for highlight in overview.reserveHighlights:
		reserve_row.add_child(UIFactory.pill("%s ×%d" % [GameData.RESOURCE_LABELS[highlight.key], int(highlight.value)]))
	status_inner.add_child(reserve_row)
	status_inner.add_child(UIFactory.label("当前共有 %d 种材料，总量 %d。" % [int(overview.totalResourceKinds), int(overview.totalResourceUnits)], 11, ThemeFactory.PALETTE.ink_muted))

	var action_row := UIFactory.hbox(8)
	var journal_button := UIFactory.button("前往档案", "ghost")
	journal_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	journal_button.pressed.connect(func(): navigate.emit("journal"))
	action_row.add_child(journal_button)
	var reset_button := UIFactory.button("重开", "secondary")
	reset_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	reset_button.pressed.connect(_on_reset)
	action_row.add_child(reset_button)
	status_inner.add_child(action_row)
	_sidebar_box.add_child(status_card)

func _stat_cell(label_text: String, value_text: String, note_text: String) -> PanelContainer:
	var cell := UIFactory.stat_cell(label_text, value_text, note_text)
	return cell

func _focus_item(label_text: String, value_text: String, copy_text: String) -> PanelContainer:
	var item := UIFactory.card(false)
	var inner := UIFactory.vbox(2)
	inner.add_child(UIFactory.eyebrow(label_text))
	inner.add_child(UIFactory.label(value_text, 15, ThemeFactory.PALETTE.ink, true))
	inner.add_child(UIFactory.label(copy_text, 12, ThemeFactory.PALETTE.ink_soft))
	item.add_child(inner)
	return item

func _on_cue_pressed(_href: String) -> void:
	var plan := GrandWorkPlan.build_grand_work_plan(Game.state)
	navigate.emit(String(plan.actionCue.href))

func _on_reset() -> void:
	Game.reset_game()
