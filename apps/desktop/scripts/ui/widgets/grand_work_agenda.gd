extends PanelContainer
## 大工导览（对应 GrandWorkAgenda 组件，collapsed 桌面形态 + 可展开细节）。

signal navigate(target: String)

var plan: Dictionary = {}
var current_route := ""
var _details_box: VBoxContainer
var _toggle_button: Button

const STATUS_LABELS := {
	"locked_rank": "先晋升",
	"missing_prerequisite": "补前置",
	"missing_stats": "补属性",
	"ready_to_research": "可破译",
	"ready_to_transmute": "可炼成",
	"complete": "已完成",
}

func setup(work_plan: Dictionary, route: String) -> void:
	plan = work_plan
	current_route = route

func _ready() -> void:
	add_theme_stylebox_override("panel", ThemeFactory.card_style(false))
	_rebuild()

func _rebuild() -> void:
	for child in get_children():
		child.queue_free()

	var box := UIFactory.vbox(8)
	add_child(UIFactory.margin(box, 16, 12, 16, 12))

	var head := UIFactory.hbox(8)
	var title_box := UIFactory.vbox(1)
	title_box.add_child(UIFactory.eyebrow("大工导览"))
	title_box.add_child(UIFactory.label(String(plan.phase.title), 17, ThemeFactory.PALETTE.ink, true))
	head.add_child(title_box)
	head.add_child(UIFactory.spacer())
	_toggle_button = UIFactory.button("展开细节", "secondary")
	_toggle_button.pressed.connect(_toggle_details)
	head.add_child(_toggle_button)
	box.add_child(head)

	box.add_child(UIFactory.label(String(plan.phase.summary), 13, ThemeFactory.PALETTE.ink_soft))

	var chips := UIFactory.hbox(6)
	chips.add_child(UIFactory.chip(String(plan.phase.eyebrow), "neutral"))
	chips.add_child(UIFactory.chip("当前境界：%s" % String(plan.rankGoal.currentRank), "neutral"))
	chips.add_child(UIFactory.chip("今日行动：%d/3" % int(Game.state.actionsLeft), "neutral"))
	var formula_goal = plan.formulaGoal
	if formula_goal != null:
		var tone := "ready" if String(formula_goal.status) == "ready_to_transmute" else ("attention" if String(formula_goal.status) in ["missing_stats", "missing_prerequisite"] else "neutral")
		chips.add_child(UIFactory.chip("定式：%s" % STATUS_LABELS.get(String(formula_goal.status), String(formula_goal.status)), tone))
	box.add_child(chips)

	_details_box = UIFactory.vbox(10)
	_details_box.visible = false
	box.add_child(_details_box)

	# 三栏：当前工序 / 晋升阶梯 / 定式轨迹
	var columns := UIFactory.hbox(12)
	columns.add_child(_build_phase_column())
	columns.add_child(_build_rank_column())
	columns.add_child(_build_formula_column())
	_details_box.add_child(columns)

func _build_phase_column() -> PanelContainer:
	var column := UIFactory.card(false)
	var inner := UIFactory.vbox(6)
	inner.add_child(UIFactory.eyebrow("当前工序"))
	inner.add_child(UIFactory.label(String(plan.phase.title), 15, ThemeFactory.PALETTE.ink, true))
	inner.add_child(UIFactory.label(String(plan.daySignal), 12, ThemeFactory.PALETTE.ink_soft))
	var cue: Dictionary = plan.actionCue
	var cue_box := UIFactory.card(false, true)
	var cue_inner := UIFactory.vbox(4)
	cue_inner.add_child(UIFactory.eyebrow("推荐下一步"))
	cue_inner.add_child(UIFactory.label(String(cue.title), 14, ThemeFactory.PALETTE.ink, true))
	cue_inner.add_child(UIFactory.label(String(cue.description), 12, ThemeFactory.PALETTE.ink_soft))
	var go_button := UIFactory.button(String(cue.label), "gold")
	go_button.pressed.connect(func(): navigate.emit(String(cue.href)))
	cue_inner.add_child(go_button)
	cue_box.add_child(cue_inner)
	inner.add_child(cue_box)
	column.add_child(inner)
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return column

func _build_rank_column() -> PanelContainer:
	var column := UIFactory.card(false)
	var inner := UIFactory.vbox(6)
	inner.add_child(UIFactory.eyebrow("晋升阶梯"))
	var rank_goal: Dictionary = plan.rankGoal
	if rank_goal.targetRank != null and rank_goal.targetRank != "":
		inner.add_child(UIFactory.label("迈向「%s」" % String(rank_goal.targetRank), 15, ThemeFactory.PALETTE.ink, true))
	else:
		inner.add_child(UIFactory.label("境界已至顶点", 15, ThemeFactory.PALETTE.ink, true))
	for requirement in rank_goal.requirements:
		var row := UIFactory.vbox(2)
		var head := UIFactory.hbox(6)
		head.add_child(UIFactory.label(String(requirement.label), 13, ThemeFactory.PALETTE.ink, false, false))
		head.add_child(UIFactory.spacer())
		var state_text := "已达成" if bool(requirement.ready) else "还差 %d" % int(requirement.remaining)
		head.add_child(UIFactory.label("%d/%d · %s" % [int(requirement.current), int(requirement.target), state_text], 12, ThemeFactory.PALETTE.ink_muted, false, false))
		row.add_child(head)
		row.add_child(UIFactory.meter(float(requirement.current), float(requirement.target) if float(requirement.target) > 0.0 else 1.0, ThemeFactory.PALETTE.green if bool(requirement.ready) else ThemeFactory.PALETTE.tan))
		inner.add_child(row)
	if rank_goal.recipeRequirement != null:
		var recipe_req: Dictionary = rank_goal.recipeRequirement
		var gate := UIFactory.card(false, false)
		var gate_inner := UIFactory.vbox(2)
		gate_inner.add_child(UIFactory.eyebrow("关键门槛"))
		var gate_text := "已完成「%s」，跨阶在即。" % String(recipe_req.label) if bool(recipe_req.completed) else "「%s」待炼成，完成这次关键炼成后，才能正式跨入下一境界。" % String(recipe_req.label)
		gate_inner.add_child(UIFactory.label(gate_text, 12, ThemeFactory.PALETTE.ink_soft))
		gate.add_child(gate_inner)
		inner.add_child(gate)
	column.add_child(inner)
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return column

func _build_formula_column() -> PanelContainer:
	var column := UIFactory.card(false)
	var inner := UIFactory.vbox(6)
	inner.add_child(UIFactory.eyebrow("定式轨迹"))
	var formula_goal = plan.formulaGoal
	if formula_goal == null:
		inner.add_child(UIFactory.label("当前没有新的定式阻塞", 15, ThemeFactory.PALETTE.ink, true))
		inner.add_child(UIFactory.label("可以按自己的节奏推进探索、炼成或档案整理。", 12, ThemeFactory.PALETTE.ink_soft))
	else:
		var tone := "ready" if String(formula_goal.status) == "ready_to_transmute" else ("attention" if String(formula_goal.status) in ["missing_stats", "missing_prerequisite"] else "neutral")
		inner.add_child(UIFactory.label(String(formula_goal.formulaName), 15, ThemeFactory.PALETTE.ink, true))
		var badge_row := UIFactory.hbox(6)
		badge_row.add_child(UIFactory.chip(STATUS_LABELS.get(String(formula_goal.status), String(formula_goal.status)), tone))
		badge_row.add_child(UIFactory.chip("目标产物：%s" % String(formula_goal.outputLabel), "neutral"))
		inner.add_child(badge_row)
		for recommendation in formula_goal.recommendations.slice(0, 2):
			inner.add_child(UIFactory.label("· %s" % String(recommendation), 12, ThemeFactory.PALETTE.ink_soft))
		var ready_count := 0
		for ingredient in formula_goal.ingredients:
			if int(ingredient.remaining) == 0:
				ready_count += 1
		if not formula_goal.ingredients.is_empty():
			inner.add_child(UIFactory.label("材料已就位 %d/%d 项" % [ready_count, formula_goal.ingredients.size()], 12, ThemeFactory.PALETTE.ink_muted))
			for ingredient in formula_goal.ingredients:
				var state := "库存已足量" if int(ingredient.remaining) == 0 else "库存还差 %d" % int(ingredient.remaining)
				inner.add_child(UIFactory.label("%s %d/%d · %s" % [String(ingredient.label), int(ingredient.current), int(ingredient.required), state], 12, ThemeFactory.PALETTE.ink_muted))
	column.add_child(inner)
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return column

func _toggle_details() -> void:
	if _details_box == null:
		return
	_details_box.visible = not _details_box.visible
	_toggle_button.text = "收起细节" if _details_box.visible else "展开细节"
