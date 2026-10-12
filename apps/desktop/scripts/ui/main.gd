extends Control
## 工坊外壳：背景氛围、页头、分区导航、视图切换与过场调度。

const OVERVIEW_VIEW := preload("res://scripts/ui/views/overview_view.gd")
const STORY_VIEW := preload("res://scripts/ui/views/story_view.gd")
const ALCHEMY_VIEW := preload("res://scripts/ui/views/alchemy_view.gd")
const JOURNAL_VIEW := preload("res://scripts/ui/views/journal_view.gd")
const SETTINGS_VIEW := preload("res://scripts/ui/views/settings_view.gd")

const ROUTE_TRANSITION := preload("res://scripts/ui/overlays/route_transition.gd")
const CHAPTER_INTRO := preload("res://scripts/ui/overlays/chapter_intro_overlay.gd")
const EVENT_CINEMATIC := preload("res://scripts/ui/overlays/event_cinematic_overlay.gd")
const RANK_ASCENSION := preload("res://scripts/ui/overlays/rank_ascension_overlay.gd")
const ENDING_RITUAL := preload("res://scripts/ui/overlays/ending_ritual_overlay.gd")

const SECTION_META := {
	"overview": {"sigil": "I", "title": "工坊总览", "summary": "安排今日工序，决定下一步前往哪张工作台。", "label": "总览"},
	"story": {"sigil": "II", "title": "剧情探索", "summary": "推进行动、接收异象、捕捉定式线索。", "label": "剧情"},
	"alchemy": {"sigil": "III", "title": "魔法阵炼金", "summary": "投料入阵，执行等价交换与定式显化。", "label": "炼金"},
	"journal": {"sigil": "IV", "title": "炼金档案", "summary": "查阅日志、统计与过场回放。", "label": "档案"},
	"settings": {"sigil": "V", "title": "工坊设置", "summary": "配置 AI 异象与仪式音效。", "label": "设置"},
}

const VIEW_SCRIPTS := {
	"overview": OVERVIEW_VIEW,
	"story": STORY_VIEW,
	"alchemy": ALCHEMY_VIEW,
	"journal": JOURNAL_VIEW,
	"settings": SETTINGS_VIEW,
}

const BG_SHADER := preload("res://shaders/parchment_background.gdshader")

var _view_host: Control
var _overlay_layer: Control
var _current_view: ViewBase = null
var _current_view_id := ""
var _nav_buttons: Dictionary = {}
var _marquee_labels: Dictionary = {}
var _section_sigil: Label
var _section_title: Label
var _section_summary: Label
var _overlay_queue: Array = []
var _overlay_showing := false

func _ready() -> void:
	theme = ThemeFactory.build_theme()
	set_anchors_preset(Control.PRESET_FULL_RECT)

	_build_background()
	_build_shell()

	Game.state_changed.connect(_on_state_changed)
	Game.cinematic_event_requested.connect(_on_cinematic_event)
	Game.rank_ascension_requested.connect(_on_rank_ascension)
	Game.ending_requested.connect(_on_ending)
	Game.chapter_intro_requested.connect(_on_chapter_intro)

	switch_view("overview")
	_update_marquee()
	if not Game.pending_intro.is_empty():
		var intro := Game.pending_intro
		Game.pending_intro = {}
		_queue_overlay("chapter_intro", intro)

func _build_background() -> void:
	var background := ColorRect.new()
	background.set_anchors_preset(Control.PRESET_FULL_RECT)
	background.color = ThemeFactory.PALETTE.page_bg
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(background)

	var shader_layer := ColorRect.new()
	shader_layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	shader_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var material := ShaderMaterial.new()
	material.shader = BG_SHADER
	material.set_shader_parameter("base_color", Color(0.10, 0.07, 0.05, 1.0))
	material.set_shader_parameter("mid_color", Color(0.13, 0.10, 0.07, 1.0))
	material.set_shader_parameter("stain_color", Color(0.18, 0.13, 0.08, 1.0))
	material.set_shader_parameter("edge_color", Color(0.03, 0.02, 0.015, 1.0))
	material.set_shader_parameter("grain_scale", 260.0)
	material.set_shader_parameter("grain_strength", 0.10)
	material.set_shader_parameter("stain_strength", 0.20)
	material.set_shader_parameter("vignette_strength", 0.62)
	material.set_shader_parameter("glow_strength", 0.14)
	shader_layer.material = material
	add_child(shader_layer)

	# 暖光呼吸层。
	var ember := ColorRect.new()
	ember.set_anchors_preset(Control.PRESET_FULL_RECT)
	ember.color = Color(0.62, 0.42, 0.20, 0.05)
	ember.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(ember)
	var ember_tween := create_tween()
	ember_tween.set_loops()
	ember_tween.tween_property(ember, "color:a", 0.10, 5.2).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	ember_tween.tween_property(ember, "color:a", 0.05, 5.2).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	# 四角封印星纹。
	for corner in [
		{"anchor": Control.PRESET_TOP_LEFT, "offsets": Vector2(10, 10)},
		{"anchor": Control.PRESET_TOP_RIGHT, "offsets": Vector2(-70, 10)},
		{"anchor": Control.PRESET_BOTTOM_LEFT, "offsets": Vector2(10, -70)},
		{"anchor": Control.PRESET_BOTTOM_RIGHT, "offsets": Vector2(-70, -70)},
	]:
		var seal := UIFactory.star_icon(60, 0.14)
		seal.set_anchors_preset(corner.anchor)
		seal.offset_left = corner.offsets.x
		seal.offset_top = corner.offsets.y
		seal.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(seal)

func _build_shell() -> void:
	var root_margin := MarginContainer.new()
	root_margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	root_margin.add_theme_constant_override("margin_left", 22)
	root_margin.add_theme_constant_override("margin_top", 14)
	root_margin.add_theme_constant_override("margin_right", 22)
	root_margin.add_theme_constant_override("margin_bottom", 14)
	add_child(root_margin)

	var layout := UIFactory.vbox(10)
	root_margin.add_child(layout)

	# ---- 页头 ----
	var header := PanelContainer.new()
	var header_style := ThemeFactory.card_style(true)
	header.add_theme_stylebox_override("panel", header_style)
	layout.add_child(header)

	var header_box := UIFactory.vbox(8)
	header.add_child(UIFactory.margin(header_box, 16, 12, 16, 12))

	var header_row := UIFactory.hbox(16)
	header_box.add_child(header_row)

	var brand := UIFactory.hbox(10)
	var crest := UIFactory.star_icon(34, 0.95)
	brand.add_child(crest)
	var brand_text := UIFactory.vbox(1)
	var title := UIFactory.label("炼金工坊", 24, ThemeFactory.PALETTE.dark_card_text, true, false)
	brand_text.add_child(title)
	brand_text.add_child(UIFactory.label("Ritual Text Adventure · Alchemy Chronicle", 11, Color(ThemeFactory.PALETTE.dark_card_text.r, ThemeFactory.PALETTE.dark_card_text.g, ThemeFactory.PALETTE.dark_card_text.b, 0.72), false, false))
	brand.add_child(brand_text)
	header_row.add_child(brand)

	header_row.add_child(_build_section_indicator())
	header_row.add_child(UIFactory.spacer())
	header_row.add_child(_build_marquee())

	# ---- 导航 ----
	var nav_row := UIFactory.hbox(8)
	header_box.add_child(nav_row)
	for view_id in ["overview", "story", "alchemy", "journal", "settings"]:
		var meta: Dictionary = SECTION_META[view_id]
		var nav_button := UIFactory.button("%s · %s" % [meta.sigil, meta.title], "nav")
		nav_button.custom_minimum_size = Vector2(150, 34)
		nav_button.pressed.connect(switch_view.bind(view_id))
		nav_row.add_child(nav_button)
		_nav_buttons[view_id] = nav_button

	# ---- 内容区 ----
	_view_host = Control.new()
	_view_host.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_view_host.clip_contents = true
	layout.add_child(_view_host)

	# ---- 过场层 ----
	_overlay_layer = Control.new()
	_overlay_layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	_overlay_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_overlay_layer)

func _build_section_indicator() -> Control:
	var box := UIFactory.hbox(10)
	var sigil_panel := PanelContainer.new()
	var sigil_style := StyleBoxFlat.new()
	sigil_style.bg_color = Color(0.16, 0.12, 0.07, 0.8)
	sigil_style.set_corner_radius_all(999)
	sigil_style.border_color = Color(ThemeFactory.PALETTE.gold.r, ThemeFactory.PALETTE.gold.g, ThemeFactory.PALETTE.gold.b, 0.5)
	sigil_style.border_width_bottom = 1
	sigil_style.border_width_top = 1
	sigil_style.border_width_left = 1
	sigil_style.border_width_right = 1
	sigil_panel.add_theme_stylebox_override("panel", sigil_style)
	_section_sigil = UIFactory.label("I", 17, ThemeFactory.PALETTE.dark_card_text, true, false)
	_section_sigil.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_section_sigil.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_section_sigil.custom_minimum_size = Vector2(34, 34)
	sigil_panel.add_child(_section_sigil)
	box.add_child(sigil_panel)

	var text_box := UIFactory.vbox(1)
	text_box.add_child(UIFactory.eyebrow("当前分区"))
	_section_title = UIFactory.label("工坊总览", 15, ThemeFactory.PALETTE.dark_card_text, true, false)
	text_box.add_child(_section_title)
	_section_summary = UIFactory.label("安排今日工序，决定下一步前往哪张工作台。", 11, Color(ThemeFactory.PALETTE.dark_card_text.r, ThemeFactory.PALETTE.dark_card_text.g, ThemeFactory.PALETTE.dark_card_text.b, 0.66), false, false)
	text_box.add_child(_section_summary)
	box.add_child(text_box)
	box.add_child(UIFactory.vline_spacer())
	return box

func _build_marquee() -> Control:
	var box := UIFactory.hbox(8)
	for pair in [["日程", "day"], ["境界", "rank"], ["行动", "actions"]]:
		var pill := UIFactory.hbox(6)
		var name_label: String = pair[0]
		var key: String = pair[1]
		var label_node := UIFactory.label(name_label, 11, Color(ThemeFactory.PALETTE.dark_card_text.r, ThemeFactory.PALETTE.dark_card_text.g, ThemeFactory.PALETTE.dark_card_text.b, 0.6), false, false)
		pill.add_child(label_node)
		var value_label := UIFactory.label("-", 15, ThemeFactory.PALETTE.dark_card_text, true, false)
		pill.add_child(value_label)
		_marquee_labels[key] = value_label
		var pill_panel := PanelContainer.new()
		var pill_style := StyleBoxFlat.new()
		pill_style.bg_color = Color(0.10, 0.08, 0.05, 0.72)
		pill_style.set_corner_radius_all(10)
		pill_style.border_color = Color(ThemeFactory.PALETTE.gold.r, ThemeFactory.PALETTE.gold.g, ThemeFactory.PALETTE.gold.b, 0.28)
		pill_style.border_width_bottom = 1
		pill_style.border_width_top = 1
		pill_style.border_width_left = 1
		pill_style.border_width_right = 1
		pill_style.content_margin_left = 10
		pill_style.content_margin_right = 10
		pill_style.content_margin_top = 4
		pill_style.content_margin_bottom = 4
		pill_panel.add_theme_stylebox_override("panel", pill_style)
		pill_panel.add_child(pill)
		box.add_child(pill_panel)
	return box

func _update_marquee() -> void:
	if _marquee_labels.is_empty():
		return
	(_marquee_labels.day as Label).text = "第 %d 日" % int(Game.state.day)
	(_marquee_labels.rank as Label).text = String(Game.state.rank)
	(_marquee_labels.actions as Label).text = "%d/3" % int(Game.state.actionsLeft)

func _on_state_changed(_state: Dictionary) -> void:
	_update_marquee()

func switch_view(view_id: String) -> void:
	if view_id == _current_view_id and _current_view != null:
		return
	_current_view_id = view_id

	var transition := ROUTE_TRANSITION.new()
	add_child(transition)

	if _current_view != null:
		_current_view.queue_free()
		_current_view = null

	var script: GDScript = VIEW_SCRIPTS[view_id]
	var view: ViewBase = script.new()
	view.set_anchors_preset(Control.PRESET_FULL_RECT)
	view.navigate.connect(_on_navigate)
	_current_view = view
	_view_host.add_child(view)
	view.refresh()

	for id in _nav_buttons:
		var button: Button = _nav_buttons[id]
		if id == view_id:
			var styles := ThemeFactory.button_style("nav_active")
			button.add_theme_stylebox_override("normal", styles.normal)
			button.add_theme_stylebox_override("hover", styles.hover)
			button.add_theme_stylebox_override("pressed", styles.pressed)
			button.add_theme_stylebox_override("disabled", styles.disabled)
			button.add_theme_color_override("font_color", ThemeFactory.PALETTE.page_fg)
		else:
			var idle_styles := ThemeFactory.button_style("nav")
			button.add_theme_stylebox_override("normal", idle_styles.normal)
			button.add_theme_stylebox_override("hover", idle_styles.hover)
			button.add_theme_stylebox_override("pressed", idle_styles.pressed)
			button.add_theme_stylebox_override("disabled", idle_styles.disabled)
			button.add_theme_color_override("font_color", Color(ThemeFactory.PALETTE.page_fg.r, ThemeFactory.PALETTE.page_fg.g, ThemeFactory.PALETTE.page_fg.b, 0.78))

	var meta: Dictionary = SECTION_META[view_id]
	_section_sigil.text = String(meta.sigil)
	_section_title.text = String(meta.title)
	_section_summary.text = String(meta.summary)

func _on_navigate(target: String) -> void:
	switch_view(target)

# ---------------- 过场队列 ----------------

func _queue_overlay(kind: String, payload: Dictionary) -> void:
	_overlay_queue.append({"kind": kind, "payload": payload})
	_try_next_overlay()

func _try_next_overlay() -> void:
	if _overlay_showing or _overlay_queue.is_empty():
		return
	_overlay_showing = true
	var next: Dictionary = _overlay_queue.pop_front()
	var overlay: Control = null
	match String(next.kind):
		"chapter_intro":
			overlay = CHAPTER_INTRO.new()
			overlay.setup(next.payload)
		"event":
			overlay = EVENT_CINEMATIC.new()
			overlay.setup(next.payload)
		"rank":
			overlay = RANK_ASCENSION.new()
			overlay.setup(next.payload)
		"ending":
			overlay = ENDING_RITUAL.new()
			overlay.setup(next.payload)
	if overlay == null:
		_overlay_showing = false
		_try_next_overlay()
		return
	overlay.closed.connect(_on_overlay_closed)
	_overlay_layer.add_child(overlay)

func _on_overlay_closed() -> void:
	_overlay_showing = false
	_try_next_overlay()

func _on_cinematic_event(digest: Dictionary) -> void:
	_queue_overlay("event", digest)

func _on_rank_ascension(payload: Dictionary) -> void:
	_queue_overlay("rank", payload)

func _on_ending(payload: Dictionary) -> void:
	_queue_overlay("ending", payload)

func _on_chapter_intro(payload: Dictionary) -> void:
	_queue_overlay("chapter_intro", payload)

