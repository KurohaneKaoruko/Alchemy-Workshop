extends ViewBase
## 魔法阵炼金：九槽投料、等价交换与定式显化。

const SLOT_COUNT := 9
const SLOT_POSITIONS := [
	Vector2(0.5, 0.09), Vector2(0.21, 0.25), Vector2(0.79, 0.25),
	Vector2(0.13, 0.50), Vector2(0.87, 0.50), Vector2(0.21, 0.75),
	Vector2(0.79, 0.75), Vector2(0.5, 0.91), Vector2(0.5, 0.50),
]

var _slots: Array = []
var _selected_slot_index := -1
var _report := {"tone": "neutral", "title": "等待刻印", "detail": "将材料投入阵位，再执行炼成。", "meta": "", "fullDetail": ""}
var _report_expanded := false
var _material_query := ""
var _sort_mode := "stock"

var _scroll: ScrollContainer
var _content: VBoxContainer
var _ring_holder: Control
var _circle: MagicCircle
var _slot_buttons: Array = []
var _toast_panel: PanelContainer
var _toast_label: Label
var _signature_label: Label
var _status_badge: PanelContainer
var _tone_chip: PanelContainer
var _focus_title: Label
var _focus_copy: Label
var _focus_box: VBoxContainer
var _hero_title_row: HBoxContainer
var _stats_grid: GridContainer
var _quick_box: HBoxContainer
var _action_stats: Label
var _action_message: Label
var _transmute_button: Button
var _clear_button: Button
var _report_title_row: HBoxContainer
var _report_detail: Label
var _report_meta: Label
var _report_full: Label
var _report_expand_button: Button
var _tab_container: TabContainer
var _inventory_box: VBoxContainer
var _reference_box: VBoxContainer
var _agenda_slot: VBoxContainer
var _agenda: PanelContainer = null

func _ready() -> void:
	_slots = []
	for _i in range(SLOT_COUNT):
		_slots.append({"material": "", "amount": 0})

	_scroll = UIFactory.scroll_box()
	_scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_scroll)
	_content = UIFactory.vbox(14)
	_scroll.add_child(_content)
	_build_static()
	Game.state_changed.connect(func(_s): _refresh_dynamic())
	_refresh_dynamic()

func view_id() -> String:
	return "alchemy"

# ---------------- 静态构建 ----------------

func _build_static() -> void:
	# ---- 英雄卡 ----
	var hero := UIFactory.card(false)
	_content.add_child(hero)
	var hero_box := UIFactory.vbox(8)
	hero.add_child(UIFactory.margin(hero_box, 18, 14, 18, 14))

	hero_box.add_child(UIFactory.eyebrow("炼金圆厅 · Magic Circle"))
	var title_row := UIFactory.hbox(10)
	title_row.add_child(UIFactory.title("魔法阵炼金", 22))
	title_row.add_child(UIFactory.spacer())
	_tone_chip = UIFactory.chip("阵况：平衡", "neutral")
	title_row.add_child(_tone_chip)
	hero_box.add_child(title_row)
	_hero_title_row = title_row

	var hero_row := UIFactory.hbox(16)
	hero_box.add_child(hero_row)

	var focus := UIFactory.card(false, true)
	focus.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var focus_box := UIFactory.vbox(5)
	focus.add_child(focus_box)
	_focus_box = focus_box
	focus_box.add_child(UIFactory.eyebrow("当前刻印焦点"))
	_focus_title = UIFactory.label("自由试配", 17, ThemeFactory.PALETTE.ink, true)
	focus_box.add_child(_focus_title)
	_focus_copy = UIFactory.label("若已选中槽位，会优先投入该槽；否则放入下一个空槽。", 12, ThemeFactory.PALETTE.ink_soft)
	focus_box.add_child(_focus_copy)
	_status_badge = UIFactory.chip("等待刻印", "neutral")
	focus_box.add_child(_status_badge)
	hero_row.add_child(focus)

	var rail_panel := UIFactory.card(false)
	rail_panel.custom_minimum_size = Vector2(470, 0)
	_stats_grid = GridContainer.new()
	_stats_grid.columns = 4
	_stats_grid.add_theme_constant_override("h_separation", 8)
	rail_panel.add_child(_stats_grid)
	hero_row.add_child(rail_panel)

	# ---- 主体两栏 ----
	var main_row := UIFactory.hbox(14)
	main_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_child(main_row)

	# 左：阵台
	var stage_card := UIFactory.card(false)
	stage_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var stage_inner := UIFactory.vbox(8)
	stage_card.add_child(UIFactory.margin(stage_inner, 16, 12, 16, 12))
	stage_inner.add_child(UIFactory.eyebrow("阵式状态"))
	_signature_label = UIFactory.label("自由试配 · 下个空槽", 15, ThemeFactory.PALETTE.ink, true)
	stage_inner.add_child(_signature_label)

	_ring_holder = Control.new()
	_ring_holder.custom_minimum_size = Vector2(500, 500)
	_ring_holder.resized.connect(_layout_slots)
	stage_inner.add_child(_ring_holder)

	_circle = MagicCircle.new()
	_circle.set_anchors_preset(Control.PRESET_FULL_RECT)
	_circle.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_ring_holder.add_child(_circle)

	for i in range(SLOT_COUNT):
		var slot_button := Button.new()
		slot_button.custom_minimum_size = Vector2(96, 52)
		slot_button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		slot_button.pressed.connect(_on_slot_pressed.bind(i))
		_ring_holder.add_child(slot_button)
		_slot_buttons.append(slot_button)

	# 仪式反馈浮层（阵心上方）
	_toast_panel = PanelContainer.new()
	var toast_style := StyleBoxFlat.new()
	toast_style.bg_color = Color(0.10, 0.08, 0.05, 0.88)
	toast_style.set_corner_radius_all(10)
	toast_style.border_color = Color(ThemeFactory.PALETTE.gold.r, ThemeFactory.PALETTE.gold.g, ThemeFactory.PALETTE.gold.b, 0.5)
	toast_style.border_width_bottom = 1
	toast_style.border_width_top = 1
	toast_style.border_width_left = 1
	toast_style.border_width_right = 1
	toast_style.content_margin_left = 14
	toast_style.content_margin_right = 14
	toast_style.content_margin_top = 6
	toast_style.content_margin_bottom = 6
	_toast_panel.add_theme_stylebox_override("panel", toast_style)
	_toast_panel.visible = false
	_toast_label = UIFactory.label("炼成完成", 15, ThemeFactory.PALETTE.dark_card_text, true, false)
	_toast_panel.add_child(_toast_label)
	_ring_holder.add_child(_toast_panel)

	# 快捷投料
	stage_inner.add_child(UIFactory.eyebrow("快捷投料 · 最多六味"))
	_quick_box = UIFactory.hbox(6)
	stage_inner.add_child(_quick_box)

	# 操作条
	var action_card := UIFactory.card(false)
	var action_inner := UIFactory.hbox(10)
	action_card.add_child(UIFactory.margin(action_inner, 16, 10, 16, 10))
	action_inner.add_child(UIFactory.label("当前刻印", 14, ThemeFactory.PALETTE.ink, true, false))
	_action_stats = UIFactory.label("值 0 · 阵 0/9 · 行动 3/3", 12, ThemeFactory.PALETTE.ink_muted, false, false)
	action_inner.add_child(_action_stats)
	_action_message = UIFactory.label("先投料", 12, ThemeFactory.PALETTE.ink_soft, false, false)
	_action_message.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	action_inner.add_child(_action_message)
	_clear_button = UIFactory.button("清空阵位", "secondary")
	_clear_button.pressed.connect(_on_clear_all)
	action_inner.add_child(_clear_button)
	_transmute_button = UIFactory.button("刻印炼成", "gold")
	_transmute_button.pressed.connect(_on_transmute)
	action_inner.add_child(_transmute_button)
	stage_inner.add_child(action_card)

	# 右：报告 + 标签页
	var right_column := UIFactory.vbox(12)
	right_column.custom_minimum_size = Vector2(470, 0)
	main_row.add_child(right_column)

	# 近手报告
	var report_card := UIFactory.card(false)
	var report_inner := UIFactory.vbox(6)
	report_card.add_child(UIFactory.margin(report_inner, 16, 12, 16, 12))
	report_inner.add_child(UIFactory.eyebrow("近手调槽 · Workbench Report"))
	_report_title_row = UIFactory.hbox(6)
	report_inner.add_child(_report_title_row)
	_report_detail = UIFactory.label("将材料投入阵位，再执行炼成。", 13, ThemeFactory.PALETTE.ink_soft)
	report_inner.add_child(_report_detail)
	_report_meta = UIFactory.label("", 12, ThemeFactory.PALETTE.ink_muted)
	report_inner.add_child(_report_meta)
	_report_expand_button = UIFactory.button("详情", "secondary")
	_report_expand_button.pressed.connect(_on_toggle_report)
	report_inner.add_child(_report_expand_button)
	_report_full = UIFactory.label("", 12, ThemeFactory.PALETTE.ink_muted)
	_report_full.visible = false
	report_inner.add_child(_report_full)
	right_column.add_child(report_card)

	# 标签页
	_tab_container = TabContainer.new()
	_tab_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_tab_container.custom_minimum_size = Vector2(0, 520)
	right_column.add_child(_tab_container)

	var inventory_scroll := UIFactory.scroll_box()
	_tab_container.add_child(inventory_scroll)
	_tab_container.set_tab_title(0, "背包投料")
	_inventory_box = UIFactory.vbox(8)
	inventory_scroll.add_child(_inventory_box)

	var reference_scroll := UIFactory.scroll_box()
	_tab_container.add_child(reference_scroll)
	_tab_container.set_tab_title(1, "定式与效果")
	_reference_box = UIFactory.vbox(8)
	reference_scroll.add_child(_reference_box)

	# 大工导览
	_agenda_slot = UIFactory.vbox(0)
	_content.add_child(_agenda_slot)

func _layout_slots() -> void:
	var ring_size := _ring_holder.size
	_circle.base_radius = ring_size.x * 0.34
	for i in range(_slot_buttons.size()):
		var button: Button = _slot_buttons[i]
		var anchor: Vector2 = SLOT_POSITIONS[i]
		var button_size := button.get_combined_minimum_size()
		button.position = Vector2(
			anchor.x * ring_size.x - button_size.x * 0.5,
			anchor.y * ring_size.y - button_size.y * 0.5
		)
	_toast_panel.position = Vector2(ring_size.x * 0.5 - _toast_panel.get_combined_minimum_size().x * 0.5, 16.0)

# ---------------- 派生数据 ----------------

func _effective_slots() -> Array:
	var used := {}
	var result: Array = []
	for slot in _slots:
		if String(slot.material) == "" or int(slot.amount) <= 0:
			result.append({"material": "", "amount": 0})
			continue
		var material := String(slot.material)
		var used_so_far := int(used.get(material, 0))
		var max_allowed: int = max(0, int(Game.state.resources.get(material, 0)) - used_so_far)
		var amount: int = min(int(slot.amount), max_allowed)
		if amount <= 0:
			result.append({"material": "", "amount": 0})
			continue
		used[material] = used_so_far + amount
		result.append({"material": material, "amount": amount})
	return result

func _offered_from_slots(effective: Array) -> Dictionary:
	var offered := {}
	for slot in effective:
		if String(slot.material) == "":
			continue
		offered[String(slot.material)] = int(offered.get(String(slot.material), 0)) + int(slot.amount)
	return offered

func _used_materials(effective: Array) -> Dictionary:
	return _offered_from_slots(effective)

func _offered_value(offered: Dictionary) -> int:
	var total := 0
	for key in offered.keys():
		total += int(offered[key]) * int(GameData.RESOURCE_VALUES[key])
	return total

func _get_formula_target(offered: Dictionary):
	var offered_keys: Array = []
	for key in offered.keys():
		if int(offered[key]) > 0:
			offered_keys.append(key)
	var guidance = AlchemyCircle.get_next_formula_guidance(Game.state)
	var next_formula_id := ""
	if guidance != null and String(guidance.status) == "ready_to_research":
		next_formula_id = String(guidance.formulaId)

	var candidates: Array = []
	for formula in GameData.ARCANE_FORMULAS:
		if GameData.rank_to_index(String(Game.state.rank)) < GameData.rank_to_index(String(formula.minRank)):
			continue
		var formula_keys: Array = formula.ingredients.keys()
		var foreign_count := 0
		for key in offered_keys:
			if not formula_keys.has(key):
				foreign_count += 1
		var overlap_count := 0
		var missing: Array = []
		var total_missing := 0
		for key in formula_keys:
			var required := int(formula.ingredients[key])
			var current := int(offered.get(key, 0))
			if int(offered.get(key, 0)) > 0:
				overlap_count += 1
			var remaining: int = max(0, required - current)
			if remaining > 0:
				missing.append({"key": key, "current": current, "required": required, "remaining": remaining})
				total_missing += remaining
		var priority := 1 if String(formula.id) == next_formula_id else 0
		if priority > 0 or overlap_count > 0 or offered_keys.is_empty():
			candidates.append({
				"formula": formula, "foreignCount": foreign_count, "overlapCount": overlap_count,
				"totalMissing": total_missing, "missing": missing, "priority": priority,
			})

	candidates.sort_custom(func(a, b):
		if a.priority != b.priority:
			return a.priority > b.priority
		if a.foreignCount != b.foreignCount:
			return a.foreignCount < b.foreignCount
		if a.overlapCount != b.overlapCount:
			return a.overlapCount > b.overlapCount
		return a.totalMissing < b.totalMissing
	)
	if candidates.is_empty():
		return null
	return candidates[0]

func _formula_progress_rows(target) -> Array:
	if target == null or int(target.foreignCount) > 0:
		return []
	var rows: Array = []
	var ingredients: Dictionary = target.formula.ingredients
	for key in ingredients.keys():
		var required := int(ingredients[key])
		var current := int(_current_offered().get(key, 0))
		rows.append({
			"key": key, "label": GameData.RESOURCE_LABELS[key],
			"current": current, "required": required, "remaining": max(0, required - current),
		})
	rows.sort_custom(func(a, b):
		if a.remaining != b.remaining:
			return a.remaining < b.remaining
		return a.label < b.label
	)
	return rows

var _cached_effective: Array = []
var _cached_offered: Dictionary = {}

func _current_offered() -> Dictionary:
	return _cached_offered

func _effect_totals() -> Dictionary:
	return AlchemyCircle.get_effect_totals(Game.state)

# ---------------- 动态刷新 ----------------

func _refresh_dynamic() -> void:
	_cached_effective = _effective_slots()
	_cached_offered = _offered_from_slots(_cached_effective)
	var offered := _cached_offered
	var offered_value := _offered_value(offered)
	var filled_count := 0
	for slot in _cached_effective:
		if String(slot.material) != "":
			filled_count += 1
	var target = _get_formula_target(offered)
	var progress_rows := _formula_progress_rows(target)
	var totals := _effect_totals()
	var state := Game.state

	# ---- 英雄 ----
	var target_label := "自由试配"
	if target != null and int(target.foreignCount) == 0:
		target_label = String(target.formula.name)
	var hint := ""
	if target != null and int(target.foreignCount) == 0:
		var ready := 0
		for row in progress_rows:
			if int(row.remaining) == 0:
				ready += 1
		hint = "已满足「%s」" % target_label if ready == progress_rows.size() and not progress_rows.is_empty() else "趋近「%s」" % target_label

	var plan := GrandWorkPlan.build_grand_work_plan(state)
	if String(plan.actionCue.href) == "alchemy":
		_focus_title.text = target_label
	else:
		_focus_title.text = String(plan.actionCue.title)
	if String(plan.actionCue.href) == "alchemy":
		_focus_copy.text = "%s · %s" % [_slot_target_hint(), _action_bar_message(offered_value, filled_count, target, hint)]
	else:
		_focus_copy.text = "当前大工更建议先%s，炼金页可以作为下一步执行工序。" % ("推进剧情探索" if plan.actionCue.href == "story" else "回看炼金档案")

	for child in _stats_grid.get_children():
		child.queue_free()
	_stats_grid.add_child(UIFactory.stat_cell("行动", "%d/3" % int(state.actionsLeft), "当前境界：%s" % String(state.rank)))
	_stats_grid.add_child(UIFactory.stat_cell("阵位", "%d/9" % filled_count, "聚焦第 %d 槽" % (_selected_slot_index + 1) if _selected_slot_index >= 0 else "未固定聚焦槽位"))
	_stats_grid.add_child(UIFactory.stat_cell("投料", str(offered_value), "%d 种 · %d 份" % [offered.size(), _total_offered_amount()]))
	var ritual_tone := "平衡"
	var ritual_chip_tone := "neutral"
	if int(totals.tolerancePenalty) > 0:
		ritual_tone = "紊乱"
		ritual_chip_tone = "error"
	elif int(totals.toleranceBonus) > 0 or int(totals.yieldBonus) > 0:
		ritual_tone = "受祝"
		ritual_chip_tone = "ready"
	_stats_grid.add_child(UIFactory.stat_cell("阵况", ritual_tone, "临时效果 %d · 定式 %d" % [state.activeEffects.size(), state.discoveredFormulas.size()]))

	# 替换阵况 chip
	if is_instance_valid(_tone_chip):
		_tone_chip.queue_free()
	_tone_chip = UIFactory.chip("阵况：%s" % ritual_tone, ritual_chip_tone)
	_hero_title_row.call_deferred("add_child", _tone_chip)

	_circle.set_ring_mode("chaos" if ritual_tone == "紊乱" else ("blessed" if ritual_tone == "受祝" else "neutral"))

	# ---- 阵台 ----
	_signature_label.text = "%s · %s" % [target_label, _slot_target_compact_hint()]
	var badge_text := String(_report.title)
	if hint != "":
		badge_text = "%s · %s" % [String(_report.title), hint]
	if is_instance_valid(_status_badge):
		_status_badge.queue_free()
	var badge_tone := "ready" if hint != "" else ("neutral" if String(_report.tone) == "neutral" else ("error" if String(_report.tone) == "error" else "attention"))
	_status_badge = UIFactory.chip(badge_text, badge_tone)
	_focus_box.call_deferred("add_child", _status_badge)

	var slot_states: Array = []
	for slot in _cached_effective:
		slot_states.append(1 if String(slot.material) != "" else 0)
	_circle.set_slot_states(slot_states)
	var can_transmute: bool = not Game.busy and not state.ended and int(state.actionsLeft) > 0
	_circle.set_alchemy_state(float(offered_value), filled_count, can_transmute)

	for i in range(_slot_buttons.size()):
		_apply_slot_button_style(i)

	# ---- 快捷投料 ----
	for child in _quick_box.get_children():
		child.queue_free()
	for quick in _quick_access_materials(progress_rows, target):
		var quick_button := UIFactory.button("%s ×%d" % [String(quick.label), int(quick.available)], "ghost")
		quick_button.custom_minimum_size = Vector2(104, 44)
		quick_button.tooltip_text = "%s
价值 %d · %s" % [String(quick.tag), int(GameData.RESOURCE_VALUES[quick.key]), String(quick.note)]
		quick_button.pressed.connect(_on_quick_insert.bind(String(quick.key)))
		_quick_box.add_child(quick_button)

	# ---- 操作条 ----
	_action_stats.text = "值 %d · 阵 %d/9 · 行动 %d/3" % [offered_value, filled_count, int(state.actionsLeft)]
	_action_message.text = _action_bar_message(offered_value, filled_count, target, hint)
	_transmute_button.disabled = not can_transmute
	_clear_button.disabled = filled_count == 0

	# ---- 近手报告 ----
	for child in _report_title_row.get_children():
		child.queue_free()
	var report_tone := String(_report.tone)
	_report_title_row.add_child(UIFactory.chip(String(_report.title), report_tone if report_tone != "warning" else "attention"))
	_report_detail.text = String(_report.detail)
	_report_meta.text = String(_report.meta)
	_report_expand_button.visible = String(_report.fullDetail) != "" and String(_report.fullDetail) != String(_report.detail)
	_report_full.text = String(_report.fullDetail)
	_report_full.visible = _report_expanded and _report_expand_button.visible
	_report_expand_button.text = "收起" if _report_full.visible else "详情"

	# ---- 背包与参考 ----
	_refresh_inventory(target, progress_rows)
	_refresh_reference(progress_rows)

	# ---- 导览 ----
	if _agenda != null and is_instance_valid(_agenda):
		_agenda.queue_free()
	var agenda := preload("res://scripts/ui/widgets/grand_work_agenda.gd").new()
	agenda.setup(plan, "alchemy")
	agenda.navigate.connect(func(target_id): navigate.emit(target_id))
	_agenda_slot.add_child(agenda)
	_agenda = agenda

func _total_offered_amount() -> int:
	var total := 0
	for key in _cached_offered.keys():
		total += int(_cached_offered[key])
	return total

func _slot_target_hint() -> String:
	if _selected_slot_index < 0:
		return "将投入下一个空槽"
	var slot: Dictionary = _cached_effective[_selected_slot_index] if _selected_slot_index < _cached_effective.size() else {}
	if slot.is_empty() or String(slot.material) == "":
		return "当前优先第 %d 槽" % (_selected_slot_index + 1)
	return "当前聚焦第 %d 槽" % (_selected_slot_index + 1)

func _slot_target_compact_hint() -> String:
	if _selected_slot_index < 0:
		return "下个空槽"
	var slot: Dictionary = _cached_effective[_selected_slot_index] if _selected_slot_index < _cached_effective.size() else {}
	if slot.is_empty() or String(slot.material) == "":
		return "第%d槽优先" % (_selected_slot_index + 1)
	return "第%d槽补量" % (_selected_slot_index + 1)

func _action_bar_message(offered_value: int, filled_count: int, target, formula_hint: String) -> String:
	if Game.busy:
		return "炼成中"
	if String(_report.tone) == "success":
		return String(_report.meta) if String(_report.meta).begins_with("显化：") else String(_report.title)
	if String(_report.tone) == "error":
		return String(_report.title)
	if filled_count == 0:
		return "先投料"
	if int(Game.state.actionsLeft) <= 0:
		return "行动已尽"
	if _selected_slot_index >= 0 and _selected_slot_index < _cached_effective.size():
		var slot: Dictionary = _cached_effective[_selected_slot_index]
		if String(slot.material) != "":
			return "第%d槽 %s×%d" % [_selected_slot_index + 1, GameData.RESOURCE_LABELS[String(slot.material)], int(slot.amount)]
		return "第%d槽待投料" % (_selected_slot_index + 1)
	if formula_hint != "":
		return formula_hint
	return "可刻印"

func _quick_access_materials(progress_rows: Array, target) -> Array:
	var used := _used_materials(_cached_effective)
	var rows: Array = []
	for key in GameData.CIRCLE_INPUT_ORDER:
		var stock := int(Game.state.resources.get(key, 0))
		var used_amount := int(used.get(key, 0))
		var available: int = max(0, stock - used_amount)
		if available <= 0:
			continue
		var formula_remaining := 0
		for row in progress_rows:
			if String(row.key) == key:
				formula_remaining = int(row.remaining)
		var tag := "备用"
		if formula_remaining > 0:
			tag = "定式缺口"
		var selected_match: bool = _selected_slot_index >= 0 and _selected_slot_index < _cached_effective.size() and String(_cached_effective[_selected_slot_index].material) == key
		if selected_match:
			tag = "当前槽补量"
		var priority := 3
		if selected_match:
			priority = 0
		elif formula_remaining > 0:
			priority = 1
		rows.append({"key": key, "label": GameData.RESOURCE_LABELS[key], "available": available, "tag": tag, "note": ("还差 %d" % formula_remaining) if formula_remaining > 0 else "投入空槽", "priority": priority})
	rows.sort_custom(func(a, b):
		if a.priority != b.priority:
			return a.priority < b.priority
		if a.available != b.available:
			return a.available > b.available
		return a.label < b.label
	)
	return rows.slice(0, 6)

# ---------------- 槽位交互 ----------------

func _on_slot_pressed(index: int) -> void:
	_selected_slot_index = index
	Sfx.play_cue("tap")
	_refresh_dynamic()

func _apply_slot_button_style(index: int) -> void:
	var button: Button = _slot_buttons[index]
	var slot: Dictionary = _cached_effective[index]
	var selected := _selected_slot_index == index
	var filled := String(slot.material) != ""

	var style := StyleBoxFlat.new()
	if filled:
		style.bg_color = Color("fff8e6")
		style.border_color = Color("6b5b37") if not selected else Color("8a6b2a")
	else:
		style.bg_color = Color(1.0, 0.976, 0.93, 0.82)
		style.border_color = Color("8f7c57") if not selected else Color("8a6b2a")
	if selected:
		style.border_width_bottom = 2
		style.border_width_top = 2
		style.border_width_left = 2
		style.border_width_right = 2
	else:
		style.border_width_bottom = 1
		style.border_width_top = 1
		style.border_width_left = 1
		style.border_width_right = 1
	style.set_corner_radius_all(10)
	style.content_margin_left = 6
	style.content_margin_right = 6
	style.content_margin_top = 4
	style.content_margin_bottom = 4

	button.add_theme_stylebox_override("normal", style)
	button.add_theme_stylebox_override("hover", style)
	button.add_theme_stylebox_override("pressed", style)
	button.add_theme_stylebox_override("disabled", style)
	button.add_theme_stylebox_override("focus", style)

	var label_text := "空槽 · 点击选中"
	if filled:
		label_text = "%s
×%d · 库存%d" % [GameData.RESOURCE_LABELS[String(slot.material)], int(slot.amount), int(Game.state.resources.get(String(slot.material), 0))]
	elif selected:
		label_text = "第 %d 槽 · 待投料" % (index + 1)
	button.text = label_text
	button.add_theme_font_size_override("font_size", 12)

func _get_used_by_other_slots(material: String, exclude_index: int) -> int:
	var total := 0
	for i in range(_slots.size()):
		if i == exclude_index:
			continue
		if String(_slots[i].material) == material:
			total += int(_slots[i].amount)
	return total

func _set_slot_material(index: int, material: String) -> void:
	var used_elsewhere := _get_used_by_other_slots(material, index)
	var max_allowed: int = max(0, int(Game.state.resources.get(material, 0)) - used_elsewhere)
	if max_allowed <= 0:
		return
	var current: Dictionary = _slots[index]
	var next_amount := 1
	if String(current.material) == material:
		next_amount = min(max(int(current.amount), 1), max_allowed)
	_slots[index] = {"material": material, "amount": min(next_amount, max_allowed)}
	_selected_slot_index = index

func _set_slot_amount(index: int, amount: int) -> void:
	var current: Dictionary = _slots[index]
	if String(current.material) == "":
		return
	var material := String(current.material)
	var used_elsewhere := _get_used_by_other_slots(material, index)
	var max_allowed: int = max(0, int(Game.state.resources.get(material, 0)) - used_elsewhere)
	var safe_amount: int = min(max(0, int(amount)), max_allowed)
	if safe_amount <= 0:
		_slots[index] = {"material": "", "amount": 0}
	else:
		_slots[index] = {"material": material, "amount": safe_amount}

func _insert_into_preferred_slot(material: String) -> bool:
	if _selected_slot_index >= 0 and _selected_slot_index < _slots.size():
		var preferred: Dictionary = _effective_slots()[_selected_slot_index]
		if String(preferred.material) == "":
			_set_slot_material(_selected_slot_index, material)
			_publish_report("success", "投入成功", "第 %d 槽已收入 %s。" % [_selected_slot_index + 1, GameData.RESOURCE_LABELS[material]], "")
			return true
		if String(preferred.material) == material:
			var used_elsewhere := _get_used_by_other_slots(material, _selected_slot_index)
			var max_allowed: int = max(0, int(Game.state.resources.get(material, 0)) - used_elsewhere)
			if int(preferred.amount) >= max_allowed:
				_publish_report("warning", "已达上限", "%s 不能继续投入当前槽位。" % GameData.RESOURCE_LABELS[material], "")
				return false
			_set_slot_amount(_selected_slot_index, int(preferred.amount) + 1)
			_publish_report("success", "补量完成", "第 %d 槽新增 1 份 %s。" % [_selected_slot_index + 1, GameData.RESOURCE_LABELS[material]], "")
			return true
		_publish_report("error", "槽位占用", "第 %d 槽当前是 %s，需先清空再切换。" % [_selected_slot_index + 1, GameData.RESOURCE_LABELS[String(preferred.material)]], "")
		return false

	var target_index := -1
	for i in range(_slots.size()):
		if String(_slots[i].material) == "" or int(_slots[i].amount) <= 0:
			target_index = i
			break
	if target_index < 0:
		_publish_report("error", "阵位已满", "先清空一个槽位，再继续投料。", "")
		return false
	_set_slot_material(target_index, material)
	_publish_report("success", "投入成功", "%s 已进入第 %d 槽。" % [GameData.RESOURCE_LABELS[material], target_index + 1], "")
	return true

func _on_quick_insert(material: String) -> void:
	Sfx.play_cue("tap")
	_insert_into_preferred_slot(material)
	_refresh_dynamic()

func _on_clear_all() -> void:
	Sfx.play_cue("tap")
	for i in range(_slots.size()):
		_slots[i] = {"material": "", "amount": 0}
	_selected_slot_index = -1
	_publish_report("neutral", "阵位已清空", "可以重新刻印新的材料组合。", "")
	_refresh_dynamic()

func _publish_report(tone: String, title_text: String, detail: String, meta: String) -> void:
	_report = {"tone": tone, "title": title_text, "detail": detail, "meta": meta, "fullDetail": detail}
	_report_expanded = false

func _on_toggle_report() -> void:
	_report_expanded = not _report_expanded
	_refresh_dynamic()

# ---------------- 炼成 ----------------

func _on_transmute() -> void:
	if Game.busy:
		return
	var offered := _offered_from_slots(_effective_slots()).duplicate()
	var result: Dictionary = await Game.do_circle_transmutation(offered)
	_circle.trigger_burst(bool(result.success))

	var produced_summary := GameData.format_resource_bundle(result.get("producedResources", {}))
	if bool(result.success):
		_publish_report("success", "炼成完成",
			"交换成立 · 投入 %d · 产出 %d" % [int(result.consumedValue), int(result.producedValue)],
			("显化：%s" % produced_summary) if produced_summary != "无" else "本次未生成额外资源摘要。")
		_show_toast("炼成完成", ("显化：%s" % produced_summary) if produced_summary != "无" else "炼成完成")
		for i in range(_slots.size()):
			_slots[i] = {"material": "", "amount": 0}
		_selected_slot_index = -1
	else:
		var compact := String(result.message)
		var unified := compact.replace("！", "。").replace("？", "。")
		var first_sentence := unified.split("。")[0]
		if first_sentence.length() > 42:
			first_sentence = first_sentence.substr(0, 42) + "…"
		_publish_report("error", "阵式紊乱", first_sentence, "检查材料组合或临时效果后再尝试。")
		_show_toast("阵纹紊乱", "阵式紊乱")
	_refresh_dynamic()

func _show_toast(title_text: String, body_text: String) -> void:
	_toast_label.text = "%s · %s" % [title_text, body_text]
	_toast_panel.visible = true
	_toast_panel.modulate.a = 1.0
	var tween := create_tween()
	tween.tween_interval(1.1)
	tween.tween_property(_toast_panel, "modulate:a", 0.0, 0.25)
	tween.tween_callback(func(): _toast_panel.visible = false)

# ---------------- 背包与参考 ----------------

func _refresh_inventory(target, progress_rows: Array) -> void:
	for child in _inventory_box.get_children():
		child.queue_free()

	var offered := _cached_offered
	var used := _used_materials(_cached_effective)
	var keyword := _material_query.strip_edges()

	# 引导头
	var guide_head := UIFactory.card(false, false)
	var guide_inner := UIFactory.hbox(8)
	guide_head.add_child(UIFactory.margin(guide_inner, 12, 8, 12, 8))
	var guide_text := UIFactory.vbox(2)
	var target_name := "自由试配"
	if target != null and int(target.foreignCount) == 0:
		target_name = String(target.formula.name)
	guide_text.add_child(UIFactory.label("当前目标：%s" % target_name, 14, ThemeFactory.PALETTE.ink, true, false))
	guide_text.add_child(UIFactory.label("若已选中槽位，优先投入该槽；否则放入下一个空槽。", 11, ThemeFactory.PALETTE.ink_muted))
	guide_inner.add_child(guide_text)
	guide_inner.add_child(UIFactory.spacer())
	var assist = _formula_assist_action(progress_rows)
	if assist != null:
		var assist_button := UIFactory.button("补下一味", "gold")
		assist_button.pressed.connect(_on_formula_assist.bind(assist))
		guide_inner.add_child(assist_button)
	_inventory_box.add_child(guide_head)

	# 搜索与排序
	var controls := UIFactory.hbox(6)
	var search := UIFactory.line_edit("搜索材料")
	search.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	search.text = _material_query
	search.text_changed.connect(func(text):
		_material_query = text
		_refresh_inventory_only()
	)
	controls.add_child(search)
	var sort_option := OptionButton.new()
	sort_option.add_theme_font_size_override("font_size", 12)
	sort_option.add_item("按可投数量")
	sort_option.add_item("按价值")
	sort_option.add_item("按名称")
	sort_option.selected = ["stock", "value", "name"].find(_sort_mode)
	sort_option.item_selected.connect(func(index):
		_sort_mode = ["stock", "value", "name"][index]
		_refresh_inventory_only()
	)
	controls.add_child(sort_option)
	_inventory_box.add_child(controls)

	# 分区
	var rows: Array = []
	for key in GameData.CIRCLE_INPUT_ORDER:
		var label_text: String = GameData.RESOURCE_LABELS[key]
		if keyword != "" and not label_text.contains(keyword):
			continue
		var stock := int(Game.state.resources.get(key, 0))
		var used_amount := int(used.get(key, 0))
		var available: int = max(0, stock - used_amount)
		var formula_row = null
		for row in progress_rows:
			if String(row.key) == key:
				formula_row = row
				break
		rows.append({"key": key, "label": label_text, "value": int(GameData.RESOURCE_VALUES[key]), "stock": stock, "used": used_amount, "available": available, "formulaRow": formula_row})

	rows.sort_custom(func(a, b):
		if _sort_mode == "value":
			if a.value != b.value:
				return a.value > b.value
			return a.stock > b.stock
		if _sort_mode == "name":
			return a.label < b.label
		if a.available != b.available:
			return a.available > b.available
		return a.value > b.value
	)

	var sections := [
		{"id": "formula", "title": "定式缺口", "copy": "这些材料会继续把阵式推向「%s」。", "match": func(row): return row.formulaRow != null and int(row.formulaRow.remaining) > 0},
		{"id": "ready", "title": "定式已就位", "copy": "这些材料的定式需求已经满足。", "match": func(row): return row.formulaRow != null and int(row.formulaRow.remaining) == 0},
		{"id": "reserve", "title": "备用材料", "copy": "这些材料暂不直接影响当前阵式。", "match": func(row): return row.formulaRow == null},
	]
	for section in sections:
		var section_rows: Array = []
		for row in rows:
			if section.match.call(row):
				section_rows.append(row)
		if section_rows.is_empty():
			continue
		var section_card := UIFactory.card(false)
		var section_inner := UIFactory.vbox(4)
		section_card.add_child(UIFactory.margin(section_inner, 12, 8, 12, 8))
		var section_head := UIFactory.hbox(6)
		section_head.add_child(UIFactory.label("%s · %d" % [String(section.title), section_rows.size()], 13, ThemeFactory.PALETTE.ink, true, false))
		section_head.add_child(UIFactory.spacer())
		section_head.add_child(UIFactory.label(String(section.copy), 11, ThemeFactory.PALETTE.ink_muted, false, false))
		section_inner.add_child(section_head)
		for row in section_rows:
			section_inner.add_child(_build_inventory_row(row))
		_inventory_box.add_child(section_card)

func _build_inventory_row(row: Dictionary) -> Button:
	var button := Button.new()
	button.custom_minimum_size = Vector2(0, 58)
	var styles := ThemeFactory.button_style("ghost")
	button.add_theme_stylebox_override("normal", styles.normal)
	button.add_theme_stylebox_override("hover", styles.hover)
	button.add_theme_stylebox_override("pressed", styles.pressed)
	button.add_theme_stylebox_override("disabled", styles.disabled)
	button.add_theme_stylebox_override("focus", styles.hover)
	button.disabled = int(row.available) <= 0

	var overlay := VBoxContainer.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.offset_left = 10
	overlay.offset_top = 5
	overlay.offset_right = -10
	overlay.offset_bottom = -5
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.add_theme_constant_override("separation", 1)

	var head := UIFactory.hbox(6)
	head.add_child(UIFactory.icon_rect(GameData.resource_icon_path(String(row.key)), 22))
	head.add_child(UIFactory.label("%s（%d）" % [String(row.label), int(row.value)], 13, ThemeFactory.PALETTE.ink, true, false))
	head.add_child(UIFactory.spacer())
	var tag := ""
	if row.formulaRow != null:
		tag = "还差 %d" % int(row.formulaRow.remaining) if int(row.formulaRow.remaining) > 0 else "定式已就位"
	if tag != "":
		head.add_child(UIFactory.label(tag, 11, ThemeFactory.PALETTE.ink_muted, false, false))
	var insert_label := UIFactory.label("投入 ▸", 12, ThemeFactory.PALETTE.gold_button_text, true, false)
	head.add_child(insert_label)
	overlay.add_child(head)
	overlay.add_child(UIFactory.label("库存 %d · 阵内占用 %d · 可投 %d" % [int(row.stock), int(row.used), int(row.available)], 11, ThemeFactory.PALETTE.ink_soft))
	button.add_child(overlay)

	button.pressed.connect(func(): _on_quick_insert(String(row.key)))
	return button

func _refresh_inventory_only() -> void:
	var target = _get_formula_target(_cached_offered)
	_refresh_inventory(target, _formula_progress_rows(target))

func _formula_assist_action(progress_rows: Array):
	for row in progress_rows:
		if int(row.remaining) > 0:
			var available: int = max(0, int(Game.state.resources.get(String(row.key), 0)) - int(_used_materials(_cached_effective).get(String(row.key), 0)))
			if available > 0:
				return {"key": String(row.key), "label": String(row.label), "available": available}
	return null

func _on_formula_assist(assist: Dictionary) -> void:
	Sfx.play_cue("tap")
	var material := String(assist.key)
	var same_index := -1
	for i in range(_cached_effective.size()):
		if String(_cached_effective[i].material) == material:
			same_index = i
			break
	if same_index >= 0:
		_selected_slot_index = same_index
		_set_slot_amount(same_index, int(_cached_effective[same_index].amount) + 1)
		_publish_report("success", "定式补料", "已为第 %d 槽补入 %s。" % [same_index + 1, String(assist.label)], "继续逼近定式")
	elif _selected_slot_index >= 0 and _selected_slot_index < _slots.size() and String(_effective_slots()[_selected_slot_index].material) == "":
		_set_slot_material(_selected_slot_index, material)
		_publish_report("success", "定式补料", "%s 已投入第 %d 槽。" % [String(assist.label), _selected_slot_index + 1], "继续逼近定式")
	else:
		var inserted := _insert_into_preferred_slot(material)
		if inserted:
			_publish_report("success", "定式补料", "已沿定式补入 %s。" % String(assist.label), "继续逼近定式")
	_refresh_dynamic()

func _refresh_reference(progress_rows: Array) -> void:
	for child in _reference_box.get_children():
		child.queue_free()

	var state := Game.state

	# 临时效果
	var effects_card := UIFactory.card(false)
	var effects_inner := UIFactory.vbox(4)
	effects_card.add_child(UIFactory.margin(effects_inner, 14, 10, 14, 10))
	effects_inner.add_child(UIFactory.eyebrow("炼金临时效果"))
	if state.activeEffects.is_empty():
		effects_inner.add_child(UIFactory.label("当前没有临时效果。你可以先去剧情页触发异象，获得祝福或负面状态。", 12, ThemeFactory.PALETTE.ink_soft))
	else:
		for effect in state.activeEffects:
			var row := UIFactory.vbox(1)
			var head := UIFactory.hbox(6)
			head.add_child(UIFactory.label(String(effect.label), 13, ThemeFactory.PALETTE.ink, true, false))
			head.add_child(UIFactory.spacer())
			head.add_child(UIFactory.label("剩余炼成：%d" % int(effect.remainingTransmutations), 11, ThemeFactory.PALETTE.ink_muted, false, false))
			row.add_child(head)
			row.add_child(UIFactory.label(String(effect.description), 11, ThemeFactory.PALETTE.ink_soft))
			effects_inner.add_child(row)
	_reference_box.add_child(effects_card)

	# 定式指引
	var guidance = AlchemyCircle.get_next_formula_guidance(state)
	if guidance != null:
		var guide_card := UIFactory.card(false, true)
		var guide_inner := UIFactory.vbox(3)
		guide_card.add_child(UIFactory.margin(guide_inner, 14, 10, 14, 10))
		guide_inner.add_child(UIFactory.label("当前建议：%s" % String(guidance.formulaName), 13, ThemeFactory.PALETTE.ink, true, false))
		for recommendation in guidance.recommendations:
			guide_inner.add_child(UIFactory.label("· %s" % String(recommendation), 11, ThemeFactory.PALETTE.ink_soft))
		_reference_box.add_child(guide_card)

	# 定式图谱
	for formula in GameData.ARCANE_FORMULAS:
		var unlocked := GameData.rank_to_index(String(state.rank)) >= GameData.rank_to_index(String(formula.minRank))
		var discovered: bool = state.discoveredFormulas.has(formula.id)
		var card := UIFactory.card(false, false)
		var inner := UIFactory.vbox(2)
		card.add_child(UIFactory.margin(inner, 14, 10, 14, 10))
		var head := UIFactory.hbox(6)
		head.add_child(UIFactory.label(String(formula.name) if discovered else "未解析定式", 14, ThemeFactory.PALETTE.ink, true, false))
		head.add_child(UIFactory.spacer())
		var rank_note := "（尚未达到）" if not unlocked else "（可触发）"
		head.add_child(UIFactory.label("需求境界：%s%s" % [String(formula.minRank), rank_note], 11, ThemeFactory.PALETTE.ink_muted, false, false))
		inner.add_child(head)
		if discovered:
			var materials_text := ""
			for key in formula.ingredients.keys():
				if materials_text != "":
					materials_text += " + "
				materials_text += "%sx%d" % [GameData.RESOURCE_LABELS[key], int(formula.ingredients[key])]
			inner.add_child(UIFactory.label("材料：%s" % materials_text, 12, ThemeFactory.PALETTE.ink_soft))
			inner.add_child(UIFactory.label("结果：%s × %d" % [GameData.RESOURCE_LABELS[formula.output.resource], int(formula.output.amount)], 12, ThemeFactory.PALETTE.ink_soft))
		else:
			inner.add_child(UIFactory.label("尚未破译。尝试靠近正确组合，捕捉阵纹共振以解锁细节。", 11, ThemeFactory.PALETTE.ink_muted))
		if not unlocked:
			card.modulate = Color(1, 1, 1, 0.7)
		_reference_box.add_child(card)

func refresh() -> void:
	_refresh_dynamic()

