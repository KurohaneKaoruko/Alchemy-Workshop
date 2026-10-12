extends RefCounted
class_name UIFactory
## 常用控件构建助手：卡片、标签、按钮、胶囊、进度条、统计格等。

static func card(dark: bool = false, focus: bool = false, min_size: Vector2 = Vector2.ZERO) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", ThemeFactory.card_style(dark, focus))
	if min_size != Vector2.ZERO:
		panel.custom_minimum_size = min_size
	return panel

static func margin(node: Control, left: int = 14, top: int = 12, right: int = 14, bottom: int = 12) -> MarginContainer:
	var box := MarginContainer.new()
	box.add_theme_constant_override("margin_left", left)
	box.add_theme_constant_override("margin_top", top)
	box.add_theme_constant_override("margin_right", right)
	box.add_theme_constant_override("margin_bottom", bottom)
	box.add_child(node)
	return box

static func vbox(separation: int = 10) -> VBoxContainer:
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", separation)
	return box

static func hbox(separation: int = 10) -> HBoxContainer:
	var box := HBoxContainer.new()
	box.add_theme_constant_override("separation", separation)
	return box

static func spacer(horizontal: bool = true) -> Control:
	var control := Control.new()
	if horizontal:
		control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	else:
		control.size_flags_vertical = Control.SIZE_EXPAND_FILL
	control.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return control

static func label(text: String, size: int = 15, color: Color = ThemeFactory.PALETTE.ink, bold: bool = false, wrap: bool = true) -> Label:
	var node := Label.new()
	node.text = text
	node.add_theme_font_size_override("font_size", size)
	node.add_theme_color_override("font_color", color)
	if bold:
		node.add_theme_font_override("font", ThemeFactory.build_bold_font())
	node.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if wrap else TextServer.AUTOWRAP_OFF
	return node

static func eyebrow(text: String, color: Color = ThemeFactory.PALETTE.ink_muted) -> Label:
	return label(text, 12, color, false)

static func title(text: String, size: int = 22, color: Color = ThemeFactory.PALETTE.ink) -> Label:
	return label(text, size, color, true)

static func button(text: String, kind: String = "gold", min_size: Vector2 = Vector2.ZERO) -> Button:
	var node := Button.new()
	node.text = text
	var styles := ThemeFactory.button_style(kind)
	node.add_theme_stylebox_override("normal", styles.normal)
	node.add_theme_stylebox_override("hover", styles.hover)
	node.add_theme_stylebox_override("pressed", styles.pressed)
	node.add_theme_stylebox_override("disabled", styles.disabled)
	node.add_theme_stylebox_override("focus", styles.hover)
	node.add_theme_color_override("font_color", _button_text_color(kind))
	node.add_theme_color_override("font_hover_color", _button_text_color(kind))
	node.add_theme_color_override("font_pressed_color", _button_text_color(kind).darkened(0.15))
	node.add_theme_color_override("font_disabled_color", Color(_button_text_color(kind).r, _button_text_color(kind).g, _button_text_color(kind).b, 0.5))
	node.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	if min_size != Vector2.ZERO:
		node.custom_minimum_size = min_size
	return node

static func _button_text_color(kind: String) -> Color:
	match kind:
		"danger":
			return Color("6e3a26")
		"nav", "nav_active":
			return ThemeFactory.PALETTE.page_fg
		_:
			return ThemeFactory.PALETTE.gold_button_text

static func chip(text: String, tone: String = "neutral") -> PanelContainer:
	var panel := PanelContainer.new()
	var palette := ThemeFactory.status_palette(tone)
	var style := StyleBoxFlat.new()
	style.bg_color = palette.bg
	style.border_width_bottom = 1
	style.border_width_top = 1
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_color = Color(palette.line.r, palette.line.g, palette.line.b, 0.45)
	style.set_corner_radius_all(999)
	style.content_margin_left = 10
	style.content_margin_right = 10
	style.content_margin_top = 3
	style.content_margin_bottom = 3
	panel.add_theme_stylebox_override("panel", style)
	var text_label := label(text, 12, palette.text, false, false)
	text_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_child(text_label)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return panel

static func pill(text: String, dark: bool = false) -> PanelContainer:
	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	if dark:
		style.bg_color = Color(0.12, 0.09, 0.05, 0.65)
		style.border_color = Color(ThemeFactory.PALETTE.gold.r, ThemeFactory.PALETTE.gold.g, ThemeFactory.PALETTE.gold.b, 0.35)
	else:
		style.bg_color = Color(1, 0.98, 0.93, 0.8)
		style.border_color = Color(ThemeFactory.PALETTE.gold.r, ThemeFactory.PALETTE.gold.g, ThemeFactory.PALETTE.gold.b, 0.4)
	style.border_width_bottom = 1
	style.border_width_top = 1
	style.border_width_left = 1
	style.border_width_right = 1
	style.set_corner_radius_all(999)
	style.content_margin_left = 10
	style.content_margin_right = 10
	style.content_margin_top = 3
	style.content_margin_bottom = 3
	panel.add_theme_stylebox_override("panel", style)
	var text_label := label(text, 12, ThemeFactory.PALETTE.dark_card_text if dark else ThemeFactory.PALETTE.ink_soft, false, false)
	text_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_child(text_label)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return panel

## 进度条：自绘圆角轨道 + 比例填充。
class MeterBar extends Control:
	var ratio := 0.0
	var fill_color: Color = ThemeFactory.PALETTE.green
	var bar_height := 8

	func _init(color: Color = ThemeFactory.PALETTE.green, height: int = 8) -> void:
		fill_color = color
		bar_height = height
		custom_minimum_size = Vector2(0, height)
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func set_value(current: float, max_value: float) -> void:
		if max_value > 0.0:
			ratio = clamp(current / max_value, 0.0, 1.0)
		else:
			ratio = 0.0
		queue_redraw()

	func _draw() -> void:
		var size_vec := Vector2(size.x, float(bar_height))
		var origin := Vector2(0, size.y * 0.5 - float(bar_height) * 0.5)
		draw_rect(Rect2(origin, size_vec), Color(0.24, 0.16, 0.07, 0.16))
		var fill_width := maxf(4.0, size_vec.x * ratio)
		if fill_width > 0.0:
			draw_rect(Rect2(origin, Vector2(minf(fill_width, size_vec.x), size_vec.y)), fill_color)

static func meter(value: float, max_value: float, fill: Color = ThemeFactory.PALETTE.green, height: int = 8) -> MeterBar:
	var bar := MeterBar.new(fill, height)
	bar.set_value(value, max_value)
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return bar

static func set_meter_ratio(bar: Control, value: float, max_value: float) -> void:
	if bar is MeterBar:
		bar.set_value(value, max_value)

static func stat_cell(label_text: String, value_text: String, note_text: String = "") -> PanelContainer:
	var panel := card(false, false)
	var inner := vbox(2)
	inner.add_child(eyebrow(label_text))
	inner.add_child(label(value_text, 19, ThemeFactory.PALETTE.ink, true))
	if note_text != "":
		inner.add_child(label(note_text, 12, ThemeFactory.PALETTE.ink_soft))
	panel.add_child(inner)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return panel

static func icon_rect(path: String, size: int = 18) -> TextureRect:
	var rect := TextureRect.new()
	var texture := load(path)
	if texture is Texture2D:
		rect.texture = texture
	rect.custom_minimum_size = Vector2(size, size)
	rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return rect

static func resource_icon(key: String, size: int = 18) -> TextureRect:
	return icon_rect(GameData.resource_icon_path(key), size)

static func star_icon(size: int = 16, modulate_alpha: float = 0.9) -> TextureRect:
	var rect := icon_rect(ThemeFactory.STAR_ICON, size)
	rect.modulate = Color(0.95, 0.81, 0.58, modulate_alpha)
	return rect

static func separator_line(dark: bool = false) -> HSeparator:
	var line := HSeparator.new()
	line.add_theme_constant_override("separation", 6)
	var style := StyleBoxLine.new()
	style.color = Color(ThemeFactory.PALETTE.gold.r, ThemeFactory.PALETTE.gold.g, ThemeFactory.PALETTE.gold.b, 0.28 if not dark else 0.4)
	line.add_theme_stylebox_override("separator", style)
	return line

static func vline_spacer() -> VSeparator:
	var line := VSeparator.new()
	line.add_theme_constant_override("separation", 0)
	line.custom_minimum_size = Vector2(2, 0)
	line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return line

static func scroll_box() -> ScrollContainer:
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	return scroll

static func link_card(sigil: String, eyebrow_text: String, title_text: String, copy_text: String, footer_text: String) -> Dictionary:
	## 工作台入口卡片：返回 {root, footer_label} 便于外部更新推荐态。
	var button := Button.new()
	button.custom_minimum_size = Vector2(0, 128)
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var styles := ThemeFactory.button_style("ghost")
	button.add_theme_stylebox_override("normal", styles.normal)
	button.add_theme_stylebox_override("hover", styles.hover)
	button.add_theme_stylebox_override("pressed", styles.pressed)
	button.add_theme_stylebox_override("disabled", styles.disabled)
	button.add_theme_stylebox_override("focus", styles.hover)

	var overlay := VBoxContainer.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.offset_left = 14
	overlay.offset_top = 10
	overlay.offset_right = -14
	overlay.offset_bottom = -10
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.add_theme_constant_override("separation", 4)

	var head := hbox(8)
	var sigil_label := label(sigil, 20, Color("8a6b35"), true, false)
	sigil_label.custom_minimum_size = Vector2(34, 34)
	sigil_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sigil_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	var sigil_panel := PanelContainer.new()
	var sigil_style := StyleBoxFlat.new()
	sigil_style.bg_color = Color(0.94, 0.86, 0.66, 0.6)
	sigil_style.set_corner_radius_all(999)
	sigil_style.border_color = Color("b78f4f")
	sigil_style.border_width_bottom = 1
	sigil_style.border_width_top = 1
	sigil_style.border_width_left = 1
	sigil_style.border_width_right = 1
	sigil_panel.add_theme_stylebox_override("panel", sigil_style)
	sigil_panel.add_child(sigil_label)
	sigil_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	sigil_panel.custom_minimum_size = Vector2(36, 36)
	head.add_child(sigil_panel)
	head.add_child(vbox_spacer_text(eyebrow_text, title_text))
	head.add_child(spacer())
	overlay.add_child(head)
	overlay.add_child(label(copy_text, 13, ThemeFactory.PALETTE.ink_soft))
	var bottom_spacer := spacer(false)
	overlay.add_child(bottom_spacer)
	var footer_row := hbox(6)
	var badge_slot := HBoxContainer.new()
	footer_row.add_child(badge_slot)
	footer_row.add_child(spacer())
	var footer_label := label(footer_text, 12, ThemeFactory.PALETTE.ink_muted, false, false)
	footer_row.add_child(footer_label)
	overlay.add_child(footer_row)
	button.add_child(overlay)

	return {"root": button, "footer_label": footer_label, "badge_slot": badge_slot}

static func vbox_spacer_text(eyebrow_text: String, title_text: String) -> VBoxContainer:
	var box := vbox(1)
	box.add_child(eyebrow(eyebrow_text))
	box.add_child(title(title_text, 17))
	return box

static func checkbox(text: String) -> CheckBox:
	var box := CheckBox.new()
	box.text = text
	box.add_theme_color_override("font_color", ThemeFactory.PALETTE.ink)
	box.add_theme_font_size_override("font_size", 14)
	return box

static func line_edit(placeholder: String = "") -> LineEdit:
	var field := LineEdit.new()
	field.placeholder_text = placeholder
	field.custom_minimum_size = Vector2(0, 34)
	return field

static func slider() -> HSlider:
	var slide := HSlider.new()
	slide.min_value = 0.0
	slide.max_value = 100.0
	slide.step = 1.0
	slide.custom_minimum_size = Vector2(160, 20)
	slide.add_theme_color_override("grabber_area_color", Color("8b6a36"))
	slide.add_theme_color_override("grabber_area_highlight_color", Color("a07c42"))
	return slide

