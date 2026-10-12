extends Control
## 随机事件演出：打字机文本（18ms/字符）+ 跳过 + 继续。

signal closed

const TYPING_INTERVAL := 0.018

var digest: Dictionary = {}
var _frame_parts: Dictionary = {}
var _text_label: RichTextLabel
var _typed_length := 0
var _full_text := ""
var _timer: Timer
var _skip_button: Button

func setup(event_digest: Dictionary) -> void:
	digest = event_digest

func _ready() -> void:
	_frame_parts = CinematicFrame.build("工坊秘录" if String(digest.get("source", "fallback")) != "ai" else "AI 异象记录")
	add_child(_frame_parts.root)

	var content: VBoxContainer = _frame_parts.content
	var title := UIFactory.label(String(digest.get("title", "")), 24, ThemeFactory.PALETTE.ink, true)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(title)

	_text_label = RichTextLabel.new()
	_text_label.bbcode_enabled = false
	_text_label.fit_content = false
	_text_label.scroll_active = true
	_text_label.custom_minimum_size = Vector2(0, 220)
	_text_label.add_theme_font_size_override("normal_font_size", 15)
	_text_label.add_theme_color_override("default_color", ThemeFactory.PALETTE.ink_soft)
	content.add_child(_text_label)

	_skip_button = UIFactory.button("跳过演出", "secondary")
	_skip_button.pressed.connect(_skip_typing)
	_frame_parts.actions.add_child(_skip_button)

	var continue_button := UIFactory.button("继续", "gold")
	continue_button.pressed.connect(_close)
	_frame_parts.actions.add_child(continue_button)

	_full_text = "%s\n\n%s" % [String(digest.get("body", "")), String(digest.get("outcomeSummary", ""))]
	_typed_length = 0
	_text_label.text = ""

	_timer = Timer.new()
	_timer.wait_time = TYPING_INTERVAL
	_timer.autostart = true
	_timer.timeout.connect(_tick)
	add_child(_timer)

	var frame: Control = _frame_parts.frame
	frame.modulate.a = 0.0
	var tween := create_tween()
	tween.tween_property(frame, "modulate:a", 1.0, 0.4).set_ease(Tween.EASE_OUT)

func _tick() -> void:
	if _typed_length >= _full_text.length():
		_timer.stop()
		_finish_typing()
		return
	_typed_length += 1
	var visible_text := _full_text.substr(0, _typed_length)
	if _typed_length % 2 == 0:
		visible_text += "▍"
	_text_label.text = visible_text
	_text_label.scroll_to_line(_text_label.get_line_count() - 1)

func _skip_typing() -> void:
	_typed_length = _full_text.length()
	_text_label.text = _full_text
	_finish_typing()

func _finish_typing() -> void:
	if _skip_button != null:
		_skip_button.visible = false
	_text_label.text = _full_text

func _close() -> void:
	closed.emit()
	queue_free()
