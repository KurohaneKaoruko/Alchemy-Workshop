extends RefCounted
class_name CinematicFrame
## 过场演出公共框架：暗幕 + 羊皮纸框 + 装饰层。

static func build(eyebrow_text: String, width: int = 620) -> Dictionary:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP

	var backdrop := ColorRect.new()
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.color = ThemeFactory.PALETTE.veil
	root.add_child(backdrop)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(center)

	var frame := PanelContainer.new()
	frame.custom_minimum_size = Vector2(width, 0)
	frame.add_theme_stylebox_override("panel", ThemeFactory.card_style(false))
	center.add_child(frame)

	var box := UIFactory.vbox(10)
	var margin_box := UIFactory.margin(box, 26, 22, 26, 22)
	frame.add_child(margin_box)

	var head := UIFactory.hbox(10)
	head.add_child(UIFactory.spacer())
	head.add_child(UIFactory.star_icon(15, 0.75))
	var eyebrow := UIFactory.label(eyebrow_text, 12, ThemeFactory.PALETTE.ink_muted, false, false)
	eyebrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	head.add_child(eyebrow)
	head.add_child(UIFactory.star_icon(15, 0.75))
	head.add_child(UIFactory.spacer())
	box.add_child(head)

	var content := UIFactory.vbox(8)
	box.add_child(content)

	var actions := UIFactory.hbox(10)
	actions.alignment = BoxContainer.ALIGNMENT_CENTER
	box.add_child(UIFactory.spacer(false))
	box.add_child(actions)

	return {"root": root, "content": content, "actions": actions, "frame": frame}
