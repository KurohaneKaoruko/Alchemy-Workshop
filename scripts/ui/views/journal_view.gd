extends ViewBase
## 炼金档案：日志检索、过场筛选与重播。

const JOURNAL_FILTERS := [
	{"id": "all", "label": "全部日志"},
	{"id": "story", "label": "剧情"},
	{"id": "craft", "label": "炼成"},
	{"id": "event", "label": "异象"},
	{"id": "system", "label": "系统"},
]

const ARCHIVE_FILTERS := [
	{"id": "all", "label": "全部过场"},
	{"id": "chapter_intro", "label": "章节"},
	{"id": "event", "label": "事件"},
	{"id": "rank_ascension", "label": "晋升"},
	{"id": "ending", "label": "终局"},
]

var _scroll: ScrollContainer
var _content: VBoxContainer
var _search_edit: LineEdit
var _search_query := ""
var _journal_filter := "all"
var _archive_filter := "all"
var _view_mode := "journal"
var _archive_entries: Array = []
var _journal_chips: Dictionary = {}
var _archive_chips: Dictionary = {}
var _journal_count_label: Label
var _archive_count_label: Label
var _records_box: VBoxContainer
var _view_switch_buttons: Dictionary = {}
var _sidebar_box: VBoxContainer
var _focus_title: Label
var _focus_copy: Label
var _focus_action_button: Button
var _focus_chip: PanelContainer
var _stats_grid: GridContainer
var _status_note := ""
var _agenda_slot: VBoxContainer
var _agenda: PanelContainer = null

func _ready() -> void:
	_archive_entries = Game.get_archive_entries()
	_scroll = UIFactory.scroll_box()
	_scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_scroll)
	_content = UIFactory.vbox(16)
	_scroll.add_child(_content)
	_build_static()
	Game.state_changed.connect(func(_s): refresh())
	Game.archive_changed.connect(func(entries): _archive_entries = entries; refresh())

func view_id() -> String:
	return "journal"

func _build_static() -> void:
	# ---- 英雄卡 ----
	var hero := UIFactory.card(false)
	_content.add_child(hero)
	var hero_box := UIFactory.vbox(10)
	hero.add_child(UIFactory.margin(hero_box, 20, 16, 20, 16))
	hero_box.add_child(UIFactory.eyebrow("档案与编年 · Archive"))
	hero_box.add_child(UIFactory.title("炼金档案", 24))
	hero_box.add_child(UIFactory.label("档案页只做三件事：快速检索记录、定位当前最值得回放的片段，以及把你送回下一张该去的工作台。", 14, ThemeFactory.PALETTE.ink_soft))

	var hero_row := UIFactory.hbox(16)
	hero_box.add_child(hero_row)

	var focus := UIFactory.card(false, true)
	focus.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var focus_box := UIFactory.vbox(6)
	focus.add_child(focus_box)
	focus_box.add_child(UIFactory.eyebrow("当前焦点"))
	_focus_title = UIFactory.label("-", 17, ThemeFactory.PALETTE.ink, true)
	focus_box.add_child(_focus_title)
	_focus_copy = UIFactory.label("-", 12, ThemeFactory.PALETTE.ink_soft)
	focus_box.add_child(_focus_copy)
	var focus_actions := UIFactory.hbox(8)
	_focus_action_button = UIFactory.button("重播焦点", "gold")
	_focus_action_button.pressed.connect(_on_replay_focus)
	focus_actions.add_child(_focus_action_button)
	_focus_chip = UIFactory.chip("-", "neutral")
	focus_actions.add_child(_focus_chip)
	focus_box.add_child(focus_actions)
	hero_row.add_child(focus)

	var rail_panel := UIFactory.card(false)
	rail_panel.custom_minimum_size = Vector2(430, 0)
	_stats_grid = GridContainer.new()
	_stats_grid.columns = 4
	_stats_grid.add_theme_constant_override("h_separation", 8)
	rail_panel.add_child(_stats_grid)
	hero_row.add_child(rail_panel)

	# ---- 主体 ----
	var main_row := UIFactory.hbox(16)
	main_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_child(main_row)

	var left_box := UIFactory.vbox(14)
	left_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	main_row.add_child(left_box)

	# 检索台
	var console_card := UIFactory.card(false)
	left_box.add_child(console_card)
	var console_inner := UIFactory.vbox(8)
	console_card.add_child(UIFactory.margin(console_inner, 18, 14, 18, 14))
	console_inner.add_child(UIFactory.eyebrow("档案检索台"))
	_search_edit = UIFactory.line_edit("搜索标题、正文或过场副标题")
	_search_edit.text_changed.connect(func(text):
		_search_query = text
		_refresh_records()
	)
	console_inner.add_child(_search_edit)
	console_inner.add_child(UIFactory.label("同一关键词会同时过滤日志与过场记录。", 11, ThemeFactory.PALETTE.ink_muted))

	var journal_chips_row := UIFactory.hbox(6)
	console_inner.add_child(journal_chips_row)
	for filter in JOURNAL_FILTERS:
		var chip_button := Button.new()
		chip_button.text = String(filter.label)
		chip_button.add_theme_font_size_override("font_size", 12)
		chip_button.custom_minimum_size = Vector2(0, 30)
		chip_button.pressed.connect(func():
			_journal_filter = String(filter.id)
			_refresh_records()
		)
		journal_chips_row.add_child(chip_button)
		_journal_chips[String(filter.id)] = chip_button

	var archive_chips_row := UIFactory.hbox(6)
	console_inner.add_child(archive_chips_row)
	for filter in ARCHIVE_FILTERS:
		var chip_button := Button.new()
		chip_button.text = String(filter.label)
		chip_button.add_theme_font_size_override("font_size", 12)
		chip_button.custom_minimum_size = Vector2(0, 30)
		chip_button.pressed.connect(func():
			_archive_filter = String(filter.id)
			_refresh_records()
		)
		archive_chips_row.add_child(chip_button)
		_archive_chips[String(filter.id)] = chip_button

	# 记录面板
	var records_card := UIFactory.card(false)
	left_box.add_child(records_card)
	var records_inner := UIFactory.vbox(8)
	records_card.add_child(UIFactory.margin(records_inner, 18, 14, 18, 14))
	var records_head := UIFactory.hbox(8)
	var records_head_text := UIFactory.vbox(1)
	records_head_text.add_child(UIFactory.eyebrow("档案记录"))
	records_head_text.add_child(UIFactory.title("日志与过场", 19))
	records_head.add_child(records_head_text)
	records_head.add_child(UIFactory.spacer())
	var journal_switch := UIFactory.button("日志", "secondary")
	journal_switch.pressed.connect(func():
		_view_mode = "journal"
		_refresh_records()
	)
	records_head.add_child(journal_switch)
	_view_switch_buttons["journal"] = journal_switch
	var replay_switch := UIFactory.button("过场", "secondary")
	replay_switch.pressed.connect(func():
		_view_mode = "replay"
		_refresh_records()
	)
	records_head.add_child(replay_switch)
	_view_switch_buttons["replay"] = replay_switch
	records_inner.add_child(records_head)
	_journal_count_label = UIFactory.label("-", 11, ThemeFactory.PALETTE.ink_muted, false, false)
	records_inner.add_child(_journal_count_label)
	_records_box = UIFactory.vbox(8)
	records_inner.add_child(_records_box)

	# 侧栏
	var sidebar_wrap := UIFactory.scroll_box()
	sidebar_wrap.custom_minimum_size = Vector2(380, 0)
	_sidebar_box = UIFactory.vbox(12)
	sidebar_wrap.add_child(_sidebar_box)
	main_row.add_child(sidebar_wrap)

	_agenda_slot = UIFactory.vbox(0)
	_content.add_child(_agenda_slot)

func refresh() -> void:
	var state := Game.state
	var summary := ArchiveSummary.build_archive_summary(state, _archive_entries)
	var plan := GrandWorkPlan.build_grand_work_plan(state)
	var keyword := _search_query.strip_edges().to_lower()

	var filtered_journal := _filtered_journal(keyword)
	var filtered_entries := _filtered_entries(keyword)

	# 英雄
	var spotlight = filtered_entries[0] if not filtered_entries.is_empty() else null
	if spotlight != null:
		_focus_title.text = String(spotlight.title)
		var subtitle := String(spotlight.get("subtitle", ""))
		_focus_copy.text = "%s · 第 %d 日%s" % [
			ArchiveSummary.KIND_LABELS.get(String(spotlight.kind), String(spotlight.kind)),
			int(spotlight.day),
			(" · %s" % subtitle) if subtitle != "" else "",
		]
		_focus_action_button.text = "重播焦点"
	else:
		_focus_title.text = "当前筛选下暂无可回放片段"
		_focus_copy.text = "你可以清空搜索词，或先去剧情探索与魔法阵炼金继续积累新记录。"
		_focus_action_button.text = "前往%s" % ("剧情探索" if plan.actionCue.href == "story" else ("魔法阵炼金" if plan.actionCue.href == "alchemy" else "炼金档案"))
	_focus_action_button.set_meta("href", String(plan.actionCue.href))

	if is_instance_valid(_focus_chip):
		_focus_chip.queue_free()
	var chip_text := _status_note if _status_note != "" else String(plan.daySignal)
	_focus_chip = UIFactory.chip(chip_text, "neutral")
	var focus_actions: HBoxContainer = _focus_action_button.get_parent()
	focus_actions.call_deferred("add_child", _focus_chip)

	for child in _stats_grid.get_children():
		child.queue_free()
	var active_kinds := 0
	for key in GameData.RESOURCE_KEYS:
		if int(state.resources.get(key, 0)) > 0:
			active_kinds += 1
	_stats_grid.add_child(UIFactory.stat_cell("日志", str(state.journal.size()), "当前筛中 %d 条" % filtered_journal.size()))
	_stats_grid.add_child(UIFactory.stat_cell("回放", str(_archive_entries.size()), "当前筛中 %d 条" % filtered_entries.size()))
	_stats_grid.add_child(UIFactory.stat_cell("材料", str(active_kinds), "合计 %d 份" % int(summary.totalResourceUnits)))
	_stats_grid.add_child(UIFactory.stat_cell("去向", _route_label(String(plan.actionCue.href)), String(plan.actionCue.title)))

	_refresh_records()
	_refresh_sidebar(summary)

	# 导览
	if _agenda != null and is_instance_valid(_agenda):
		_agenda.queue_free()
	var agenda := preload("res://scripts/ui/widgets/grand_work_agenda.gd").new()
	agenda.setup(plan, "journal")
	agenda.navigate.connect(func(target): navigate.emit(target))
	_agenda_slot.add_child(agenda)
	_agenda = agenda

func _filtered_journal(keyword: String) -> Array:
	var result: Array = []
	for entry in Game.state.journal:
		if _journal_filter != "all" and String(entry.type) != _journal_filter:
			continue
		if keyword != "" and not ("%s\n%s" % [String(entry.title), String(entry.body)]).to_lower().contains(keyword):
			continue
		result.append(entry)
	return result

func _filtered_entries(keyword: String) -> Array:
	var result: Array = []
	for entry in _archive_entries:
		if _archive_filter != "all" and String(entry.kind) != _archive_filter:
			continue
		if keyword != "":
			var haystack := "%s\n%s\n%s" % [String(entry.title), String(entry.body), String(entry.get("subtitle", ""))]
			if not haystack.to_lower().contains(keyword):
				continue
		result.append(entry)
	return result

func _refresh_records() -> void:
	var keyword := _search_query.strip_edges().to_lower()
	var filtered_journal := _filtered_journal(keyword)
	var filtered_entries := _filtered_entries(keyword)
	var state := Game.state
	var summary := ArchiveSummary.build_archive_summary(state, _archive_entries)

	_journal_count_label.text = "日志 %d/%d · 过场 %d/%d" % [filtered_journal.size(), state.journal.size(), filtered_entries.size(), _archive_entries.size()]

	for filter in JOURNAL_FILTERS:
		var button: Button = _journal_chips[String(filter.id)]
		var active := String(filter.id) == _journal_filter
		var label_text := String(filter.label)
		if String(filter.id) != "all":
			label_text += " · %d" % int(summary.journalCounts.get(String(filter.id), 0))
		button.text = label_text
		_apply_chip_style(button, active)
	for filter in ARCHIVE_FILTERS:
		var button: Button = _archive_chips[String(filter.id)]
		var active := String(filter.id) == _archive_filter
		var label_text := String(filter.label)
		if String(filter.id) != "all":
			label_text += " · %d" % int(summary.archiveCounts.get(String(filter.id), 0))
		button.text = label_text
		_apply_chip_style(button, active)

	_apply_chip_style(_view_switch_buttons.journal, _view_mode == "journal")
	_apply_chip_style(_view_switch_buttons.replay, _view_mode == "replay")
	(_view_switch_buttons.journal as Button).text = "日志 %d" % filtered_journal.size()
	(_view_switch_buttons.replay as Button).text = "过场 %d" % filtered_entries.size()

	for child in _records_box.get_children():
		child.queue_free()

	if _view_mode == "journal":
		for entry in filtered_journal:
			var item := UIFactory.card(false)
			var inner := UIFactory.vbox(3)
			item.add_child(UIFactory.margin(inner, 14, 10, 14, 10))
			var head := UIFactory.hbox(6)
			head.add_child(UIFactory.chip(ArchiveSummary.JOURNAL_TYPE_LABELS.get(String(entry.type), String(entry.type)), "neutral"))
			head.add_child(UIFactory.label("第 %d 日 · %s" % [int(entry.day), String(entry.title)], 13, ThemeFactory.PALETTE.ink, true, false))
			inner.add_child(head)
			inner.add_child(UIFactory.label(String(entry.body), 12, ThemeFactory.PALETTE.ink_soft))
			_records_box.add_child(item)
		if filtered_journal.is_empty():
			_records_box.add_child(_empty_note("当前筛选下暂无日志。换个类型，或清空搜索词后再看。"))
	else:
		for entry in filtered_entries:
			var item := UIFactory.card(false)
			var inner := UIFactory.vbox(3)
			item.add_child(UIFactory.margin(inner, 14, 10, 14, 10))
			var head := UIFactory.hbox(6)
			head.add_child(UIFactory.chip(ArchiveSummary.KIND_LABELS.get(String(entry.kind), String(entry.kind)), "neutral"))
			head.add_child(UIFactory.label(String(entry.title), 13, ThemeFactory.PALETTE.ink, true, false))
			inner.add_child(head)
			if entry.has("subtitle") and String(entry.subtitle) != "":
				inner.add_child(UIFactory.label(String(entry.subtitle), 12, ThemeFactory.PALETTE.ink_soft))
			inner.add_child(UIFactory.label(String(entry.body), 12, ThemeFactory.PALETTE.ink_soft))
			var footer := UIFactory.hbox(6)
			footer.add_child(UIFactory.label("第 %d 日 · %s" % [int(entry.day), String(entry.createdAt)], 11, ThemeFactory.PALETTE.ink_muted, false, false))
			footer.add_child(UIFactory.spacer())
			var replay_button := UIFactory.button("重播", "secondary")
			replay_button.pressed.connect(_on_replay.bind(entry))
			footer.add_child(replay_button)
			inner.add_child(footer)
			_records_box.add_child(item)
		if filtered_entries.is_empty():
			_records_box.add_child(_empty_note("当前筛选下暂无过场。可先刷新档案，或继续推进剧情与炼成。"))

func _empty_note(text: String) -> PanelContainer:
	var note := UIFactory.card(false)
	note.add_child(UIFactory.margin(UIFactory.label(text, 12, ThemeFactory.PALETTE.ink_muted), 14, 10, 14, 10))
	return note

func _apply_chip_style(button: Button, active: bool) -> void:
	var styles := ThemeFactory.button_style("gold" if active else "ghost")
	button.add_theme_stylebox_override("normal", styles.normal)
	button.add_theme_stylebox_override("hover", styles.hover)
	button.add_theme_stylebox_override("pressed", styles.pressed)
	button.add_theme_stylebox_override("disabled", styles.disabled)
	button.add_theme_color_override("font_color", ThemeFactory.PALETTE.gold_button_text if active else ThemeFactory.PALETTE.ink_muted)
	button.add_theme_color_override("font_hover_color", ThemeFactory.PALETTE.gold_button_text if active else ThemeFactory.PALETTE.ink)

func _refresh_sidebar(summary: Dictionary) -> void:
	for child in _sidebar_box.get_children():
		child.queue_free()

	var state := Game.state
	var support := UIFactory.card(false)
	var support_inner := UIFactory.vbox(8)
	support.add_child(UIFactory.margin(support_inner, 16, 12, 16, 12))
	support_inner.add_child(UIFactory.eyebrow("档案辅助"))
	support_inner.add_child(UIFactory.title("快照与维护", 17))

	var snapshot := GridContainer.new()
	snapshot.columns = 2
	snapshot.add_theme_constant_override("h_separation", 8)
	snapshot.add_theme_constant_override("v_separation", 8)
	support_inner.add_child(snapshot)
	var latest_journal_title := String(summary.latestJournalEntry.title) if summary.latestJournalEntry != null else "暂无"
	var latest_archive_title := String(summary.latestArchiveEntry.title) if summary.latestArchiveEntry != null else "暂无"
	snapshot.add_child(UIFactory.stat_cell("最近日志", latest_journal_title, ""))
	snapshot.add_child(UIFactory.stat_cell("最近回放", latest_archive_title, ""))
	snapshot.add_child(UIFactory.stat_cell("章节", str(int(summary.archiveCounts.chapter_intro)), ""))
	snapshot.add_child(UIFactory.stat_cell("事件", str(int(summary.archiveCounts.event)), ""))
	snapshot.add_child(UIFactory.stat_cell("晋升", str(int(summary.archiveCounts.rank_ascension)), ""))
	snapshot.add_child(UIFactory.stat_cell("终局", str(int(summary.archiveCounts.ending)), ""))

	for resource in summary.topResources:
		var row := UIFactory.hbox(6)
		row.add_child(UIFactory.icon_rect(GameData.resource_icon_path(String(resource.key)), 20))
		var text_box := UIFactory.vbox(1)
		text_box.add_child(UIFactory.label("%s" % String(resource.label), 13, ThemeFactory.PALETTE.ink, true, false))
		text_box.add_child(UIFactory.label("价值 %d · 库存摘要" % int(GameData.RESOURCE_VALUES[resource.key]), 11, ThemeFactory.PALETTE.ink_muted, false, false))
		row.add_child(text_box)
		row.add_child(UIFactory.spacer())
		row.add_child(UIFactory.label(str(int(resource.amount)), 16, ThemeFactory.PALETTE.ink, true, false))
		support_inner.add_child(row)
	if summary.topResources.is_empty():
		support_inner.add_child(UIFactory.label("当前没有可展示的库存高频材料。", 12, ThemeFactory.PALETTE.ink_muted))

	var maintenance := UIFactory.hbox(8)
	var refresh_button := UIFactory.button("刷新档案", "secondary")
	refresh_button.pressed.connect(_on_refresh_archive)
	maintenance.add_child(refresh_button)
	var clear_button := UIFactory.button("清空档案", "danger")
	clear_button.pressed.connect(_on_clear_archive)
	maintenance.add_child(clear_button)
	support_inner.add_child(maintenance)
	support_inner.add_child(UIFactory.label(
		_status_note if _status_note != "" else ("可直接从列表或页头焦点卡片重播过场。" if not _archive_entries.is_empty() else "先推进剧情或完成炼成，档案才会逐渐充实。"),
		11, ThemeFactory.PALETTE.ink_muted
	))
	_sidebar_box.add_child(support)

	if state.get("lastEvent") is Dictionary:
		var last_event: Dictionary = state.lastEvent
		var dark := UIFactory.card(true)
		var dark_inner := UIFactory.vbox(4)
		dark.add_child(UIFactory.margin(dark_inner, 16, 12, 16, 12))
		dark_inner.add_child(UIFactory.eyebrow("最近异象", ThemeFactory.PALETTE.dark_card_text))
		dark_inner.add_child(UIFactory.title("最近异象摘要", 16, ThemeFactory.PALETTE.dark_card_text))
		dark_inner.add_child(UIFactory.label(String(last_event.title), 15, ThemeFactory.PALETTE.dark_card_text, true))
		dark_inner.add_child(UIFactory.label(String(last_event.outcomeSummary), 12, Color(ThemeFactory.PALETTE.dark_card_text.r, ThemeFactory.PALETTE.dark_card_text.g, ThemeFactory.PALETTE.dark_card_text.b, 0.8)))
		_sidebar_box.add_child(dark)

func _on_refresh_archive() -> void:
	_archive_entries = Game.get_archive_entries()
	_status_note = "档案已刷新。" if not _archive_entries.is_empty() else "暂时没有可回放的记录。"
	refresh()

func _on_clear_archive() -> void:
	Game.clear_archive()
	_archive_entries = []
	_status_note = "过场档案已清空。"
	refresh()

func _on_replay_focus() -> void:
	var keyword := _search_query.strip_edges().to_lower()
	var filtered := _filtered_entries(keyword)
	if filtered.is_empty():
		var href := String(_focus_action_button.get_meta("href", "story"))
		navigate.emit(href)
		return
	_on_replay(filtered[0])

func _on_replay(entry: Dictionary) -> void:
	Sfx.play_cue("tap")
	var kind := String(entry.kind)
	var payload = entry.get("payload", null)
	if not (payload is Dictionary):
		_status_note = "该%s记录缺少可重播数据。" % ("事件" if kind == "event" else ("章节" if kind == "chapter_intro" else ("晋升" if kind == "rank_ascension" else "终局")))
		refresh()
		return
	_status_note = "重播：%s" % String(entry.title)
	match kind:
		"event":
			emit_replay("event", payload)
		"chapter_intro":
			emit_replay("chapter_intro", payload)
		"rank_ascension":
			emit_replay("rank", payload)
		"ending":
			emit_replay("ending", payload)
	refresh()

func emit_replay(kind: String, payload: Dictionary) -> void:
	# 通过 Game 的信号通道复用过场组件。
	match kind:
		"event":
			Game.cinematic_event_requested.emit(payload)
		"chapter_intro":
			Game.chapter_intro_requested.emit(payload)
		"rank":
			Game.rank_ascension_requested.emit(payload)
		"ending":
			Game.ending_requested.emit(payload)

func _route_label(href: String) -> String:
	match href:
		"story":
			return "剧情探索"
		"alchemy":
			return "魔法阵炼金"
		"journal":
			return "炼金档案"
		_:
			return "工坊"
