extends RefCounted
class_name ThemeFactory
## 工坊主题：暗色玄学底 + 羊皮纸卡片 + 金色描边。

const PALETTE := {
	"page_bg": Color("0f0d09"),
	"page_fg": Color("f2e8d1"),
	"parchment": Color("f8ecd0"),
	"parchment_deep": Color("f1e2c0"),
	"parchment_dark": Color("ead6b1"),
	"ink": Color("2a1f12"),
	"ink_soft": Color("5b4727"),
	"ink_muted": Color("6a5432"),
	"gold": Color("b78f4f"),
	"gold_deep": Color("7a5a2c"),
	"gold_button": Color("ead8aa"),
	"gold_button_hover": Color("dfc993"),
	"gold_button_text": Color("3f2d16"),
	"gold_button_border": Color("6b5b37"),
	"button_secondary": Color("efe3c4"),
	"button_secondary_hover": Color("e6d3a7"),
	"danger": Color("f0d6c8"),
	"danger_hover": Color("e7c2ad"),
	"danger_border": Color("7a5442"),
	"dark_card": Color("231a10"),
	"dark_card_deep": Color("18120b"),
	"dark_card_text": Color("f1e4c0"),
	"dark_card_border": Color(0.79, 0.63, 0.34, 0.36),
	"green": Color("6f8c4a"),
	"green_bg": Color("eef4de"),
	"green_text": Color("405c20"),
	"tan": Color("b48d54"),
	"tan_bg": Color("fbf0d8"),
	"tan_text": Color("7a5220"),
	"neutral": Color("8d7a54"),
	"neutral_bg": Color("f6eedb"),
	"neutral_text": Color("6a5432"),
	"error": Color("b5664c"),
	"error_bg": Color("f6e3da"),
	"error_text": Color("7c3f26"),
	"teal": Color("4b7d86"),
	"brown": Color("9b6f45"),
	"veil": Color(0.02, 0.016, 0.008, 0.78),
}

const FONT_STACK := [
	"Noto Serif SC", "Source Han Serif SC", "Source Han Serif CN",
	"SimSun", "Microsoft YaHei UI", "Microsoft YaHei", "serif",
]

const STAR_ICON := "res://assets/cc0/kenney_ui_pack/PNG/Yellow/Default/star_outline_depth.png"

static func build_base_font(size: int = 16) -> SystemFont:
	var font := SystemFont.new()
	font.font_names = PackedStringArray(FONT_STACK)
	font.antialiasing = TextServer.FONT_ANTIALIASING_GRAY
	font.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
	return font

static func build_bold_font() -> FontVariation:
	var variation := FontVariation.new()
	variation.base_font = build_base_font()
	variation.variation_embolden = 0.9
	return variation

static func build_theme() -> Theme:
	var theme := Theme.new()
	var base_font := build_base_font()
	var bold_font := build_bold_font()
	theme.default_font = base_font
	theme.default_font_size = 16

	theme.set_font("font", "Label", base_font)
	theme.set_font("font", "Button", base_font)
	theme.set_font("font", "LineEdit", base_font)
	theme.set_font("font", "CheckBox", base_font)
	theme.set_font("font", "OptionButton", base_font)
	theme.set_font("font", "TabContainer", base_font)
	theme.set_font("font", "ItemList", base_font)
	theme.set_font("font", "RichTextLabel", base_font)
	theme.set_font("font", "CheckButton", base_font)
	theme.set_font("bold_font", "RichTextLabel", bold_font)

	theme.set_color("font_color", "Label", PALETTE.ink)
	theme.set_color("font_color", "Button", PALETTE.gold_button_text)
	theme.set_color("font_color", "LineEdit", PALETTE.ink)
	theme.set_color("font_color", "CheckBox", PALETTE.ink)
	theme.set_color("font_color", "OptionButton", PALETTE.ink)
	theme.set_color("font_color", "CheckButton", PALETTE.ink)

	theme.set_color("font_selected_color", "TabContainer", PALETTE.ink)
	theme.set_color("font_unselected_color", "TabContainer", PALETTE.ink_muted)
	theme.set_color("font_color", "ItemList", PALETTE.ink)

	var line_edit_style := StyleBoxFlat.new()
	line_edit_style.bg_color = Color("fffdf6")
	line_edit_style.border_width_bottom = 1
	line_edit_style.border_width_top = 1
	line_edit_style.border_width_left = 1
	line_edit_style.border_width_right = 1
	line_edit_style.border_color = Color("8c7548").darkened(0.1)
	line_edit_style.set_corner_radius_all(6)
	line_edit_style.content_margin_left = 8
	line_edit_style.content_margin_right = 8
	line_edit_style.content_margin_top = 5
	line_edit_style.content_margin_bottom = 5
	theme.set_stylebox("normal", "LineEdit", line_edit_style)
	theme.set_stylebox("focus", "LineEdit", line_edit_style)

	theme.set_color("font_color", "RichTextLabel", PALETTE.ink)

	var tab_panel := StyleBoxFlat.new()
	tab_panel.bg_color = Color(0, 0, 0, 0.16)
	tab_panel.set_corner_radius_all(10)
	theme.set_stylebox("panel", "TabContainer", tab_panel)

	return theme

## 各类卡片样式。
static func card_style(dark: bool = false, focus: bool = false) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	if dark:
		style.bg_color = PALETTE.dark_card
		style.border_width_bottom = 1
		style.border_width_top = 1
		style.border_width_left = 1
		style.border_width_right = 1
		style.border_color = PALETTE.dark_card_border
		style.set_corner_radius_all(16)
		style.shadow_color = Color(0, 0, 0, 0.35)
		style.shadow_size = 8
	else:
		style.bg_color = PALETTE.parchment
		style.border_width_bottom = 1
		style.border_width_top = 1
		style.border_width_left = 1
		style.border_width_right = 1
		style.border_color = Color(PALETTE.gold.r, PALETTE.gold.g, PALETTE.gold.b, 0.55)
		style.set_corner_radius_all(16)
		style.shadow_color = Color(0, 0, 0, 0.30)
		style.shadow_size = 10
	if focus:
		style.border_width_bottom = 2
		style.border_width_top = 2
		style.border_width_left = 2
		style.border_width_right = 2
		style.border_color = PALETTE.green
	return style

static func button_style(kind: String = "gold") -> Dictionary:
	var normal := StyleBoxFlat.new()
	var hover := StyleBoxFlat.new()
	var pressed := StyleBoxFlat.new()
	var disabled := StyleBoxFlat.new()

	match kind:
		"gold":
			normal.bg_color = PALETTE.gold_button
			hover.bg_color = PALETTE.gold_button_hover
			pressed.bg_color = PALETTE.gold_button_hover.darkened(0.12)
			_set_button_border(normal, PALETTE.gold_button_border)
			_set_button_border(hover, PALETTE.gold_button_border)
			_set_button_border(pressed, PALETTE.gold_button_border)
			_set_button_border(disabled, Color(PALETTE.gold_button_border.r, PALETTE.gold_button_border.g, PALETTE.gold_button_border.b, 0.4))
			disabled.bg_color = Color(PALETTE.gold_button.r, PALETTE.gold_button.g, PALETTE.gold_button.b, 0.45)
		"secondary":
			normal.bg_color = PALETTE.button_secondary
			hover.bg_color = PALETTE.button_secondary_hover
			pressed.bg_color = PALETTE.button_secondary_hover.darkened(0.1)
			_set_button_border(normal, PALETTE.gold_button_border)
			_set_button_border(hover, PALETTE.gold_button_border)
			_set_button_border(pressed, PALETTE.gold_button_border)
			_set_button_border(disabled, Color(PALETTE.gold_button_border.r, PALETTE.gold_button_border.g, PALETTE.gold_button_border.b, 0.4))
			disabled.bg_color = Color(PALETTE.button_secondary.r, PALETTE.button_secondary.g, PALETTE.button_secondary.b, 0.45)
		"danger":
			normal.bg_color = PALETTE.danger
			hover.bg_color = PALETTE.danger_hover
			pressed.bg_color = PALETTE.danger_hover.darkened(0.1)
			_set_button_border(normal, PALETTE.danger_border)
			_set_button_border(hover, PALETTE.danger_border)
			_set_button_border(pressed, PALETTE.danger_border)
			_set_button_border(disabled, Color(PALETTE.danger_border.r, PALETTE.danger_border.g, PALETTE.danger_border.b, 0.4))
			disabled.bg_color = Color(PALETTE.danger.r, PALETTE.danger.g, PALETTE.danger.b, 0.45)
		"ghost":
			normal.bg_color = Color(1, 0.99, 0.96, 0.82)
			hover.bg_color = Color(0.965, 0.93, 0.84, 0.92)
			pressed.bg_color = Color(0.94, 0.9, 0.8, 0.92)
			_set_button_border(normal, Color(PALETTE.gold_button_border.r, PALETTE.gold_button_border.g, PALETTE.gold_button_border.b, 0.2))
			_set_button_border(hover, Color(PALETTE.gold_button_border.r, PALETTE.gold_button_border.g, PALETTE.gold_button_border.b, 0.35))
			_set_button_border(pressed, Color(PALETTE.gold_button_border.r, PALETTE.gold_button_border.g, PALETTE.gold_button_border.b, 0.35))
			_set_button_border(disabled, Color(PALETTE.gold_button_border.r, PALETTE.gold_button_border.g, PALETTE.gold_button_border.b, 0.12))
			disabled.bg_color = Color(1, 0.99, 0.96, 0.4)
		"nav":
			normal.bg_color = Color(0.16, 0.12, 0.07, 0.86)
			hover.bg_color = Color(0.22, 0.17, 0.10, 0.92)
			pressed.bg_color = Color(0.13, 0.10, 0.06, 0.95)
			_set_button_border(normal, Color(PALETTE.gold.r, PALETTE.gold.g, PALETTE.gold.b, 0.3))
			_set_button_border(hover, Color(PALETTE.gold.r, PALETTE.gold.g, PALETTE.gold.b, 0.55))
			_set_button_border(pressed, Color(PALETTE.gold.r, PALETTE.gold.g, PALETTE.gold.b, 0.4))
			_set_button_border(disabled, Color(PALETTE.gold.r, PALETTE.gold.g, PALETTE.gold.b, 0.15))
			disabled.bg_color = Color(0.16, 0.12, 0.07, 0.5)
		"nav_active":
			normal.bg_color = Color(0.26, 0.20, 0.11, 0.95)
			hover.bg_color = Color(0.30, 0.23, 0.13, 0.98)
			pressed.bg_color = Color(0.22, 0.17, 0.10, 0.95)
			_set_button_border(normal, Color("e3bf78"))
			_set_button_border(hover, Color("e3bf78"))
			_set_button_border(pressed, Color("e3bf78"))
			_set_button_border(disabled, Color("e3bf78"))
			disabled.bg_color = normal.bg_color

	for style in [normal, hover, pressed, disabled]:
		style.set_corner_radius_all(10)
		style.content_margin_left = 14
		style.content_margin_right = 14
		style.content_margin_top = 7
		style.content_margin_bottom = 7
	return {"normal": normal, "hover": hover, "pressed": pressed, "disabled": disabled}

static func _set_button_border(style: StyleBoxFlat, color: Color) -> void:
	style.border_width_bottom = 1
	style.border_width_top = 1
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_color = color

static func status_palette(tone: String) -> Dictionary:
	match tone:
		"ready", "success", "active":
			return {"line": PALETTE.green, "bg": PALETTE.green_bg, "text": PALETTE.green_text}
		"attention", "pending", "warning":
			return {"line": PALETTE.tan, "bg": PALETTE.tan_bg, "text": PALETTE.tan_text}
		"error":
			return {"line": PALETTE.error, "bg": PALETTE.error_bg, "text": PALETTE.error_text}
		_:
			return {"line": PALETTE.neutral, "bg": PALETTE.neutral_bg, "text": PALETTE.neutral_text}

