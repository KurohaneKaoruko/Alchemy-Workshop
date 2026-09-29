extends PanelContainer
## 学徒首日引导提示（对应 FirstDayGuideHint 组件）。

signal navigate(target: String)

var guide = null
var current_step_id := ""
var compact := true

func setup(guide_data, step_id: String, is_compact: bool) -> void:
	guide = guide_data
	current_step_id = step_id
	compact = is_compact

func _ready() -> void:
	add_theme_stylebox_override("panel", ThemeFactory.card_style(false))
	_rebuild()

func _rebuild() -> void:
	for child in get_children():
		child.queue_free()

	if guide == null:
		visible = false
		return
	visible = true

	var box := UIFactory.vbox(8)
	add_child(UIFactory.margin(box, 16, 12, 16, 12))

	var head := UIFactory.hbox(8)
	head.add_child(UIFactory.eyebrow(guide.headline))
	head.add_child(UIFactory.spacer())
	var dismiss_button := UIFactory.button("我知道了", "secondary")
	dismiss_button.custom_minimum_size = Vector2(0, 26)
	dismiss_button.pressed.connect(func(): _emit_dismiss())
	head.add_child(dismiss_button)
	box.add_child(head)

	var step_label_text := ""
	if current_step_id != "":
		var this_step = null
		for step in guide.steps:
			if step.id == current_step_id:
				this_step = step
				break
		if this_step != null:
			if this_step.id == guide.currentStepId:
				step_label_text = "首日引导：当前就该做「%s」" % this_step.title
			elif this_step.status == "done":
				step_label_text = "首日引导：这一步已经完成"
			else:
				step_label_text = "首日引导：这里适合放在后一步"
	box.add_child(UIFactory.label(step_label_text if step_label_text != "" else String(guide.summary), 14, ThemeFactory.PALETTE.ink, true))

	var summary_copy := String(guide.summary)
	if current_step_id != "" and guide.mode == "full":
		summary_copy = "当前更建议先做「%s」。" % guide.currentActionLabel
	box.add_child(UIFactory.label(summary_copy, 13, ThemeFactory.PALETTE.ink_soft))

	var action_row := UIFactory.hbox(8)
	var cta := UIFactory.button(String(guide.currentActionLabel), "gold")
	cta.pressed.connect(func(): navigate.emit(String(guide.currentHref)))
	action_row.add_child(cta)

	if guide.milestone != null:
		var milestone: Dictionary = guide.milestone
		var milestone_note := UIFactory.label("%s：%s" % [milestone.title, milestone.summary], 12, ThemeFactory.PALETTE.ink_muted)
		action_row.add_child(milestone_note)
	box.add_child(action_row)

	if not compact and not guide.steps.is_empty():
		var steps_row := UIFactory.hbox(8)
		for step in guide.steps:
			var cell := _build_step_cell(step)
			steps_row.add_child(cell)
		box.add_child(steps_row)

func _build_step_cell(step: Dictionary) -> PanelContainer:
	var cell := UIFactory.card(false, step.status == "active")
	var inner := UIFactory.vbox(4)
	var status_text: String = {"done": "已完成", "active": "当前步骤", "pending": "稍后再来"}.get(String(step.status), "")
	inner.add_child(UIFactory.eyebrow(status_text))
	inner.add_child(UIFactory.label(String(step.title), 14, ThemeFactory.PALETTE.ink, true))
	inner.add_child(UIFactory.label(String(step.description), 12, ThemeFactory.PALETTE.ink_soft))
	cell.add_child(inner)
	cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return cell

func _emit_dismiss() -> void:
	visible = false
