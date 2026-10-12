extends Control
## 章节开场过场：自动关闭 2800ms。

signal closed

const AUTO_CLOSE_MS := 2800

var payload: Dictionary = {}
var _frame_parts: Dictionary = {}

func setup(intro_payload: Dictionary) -> void:
	payload = intro_payload

func _ready() -> void:
	_frame_parts = CinematicFrame.build("章节开场")
	add_child(_frame_parts.root)

	var content: VBoxContainer = _frame_parts.content
	var title := UIFactory.label(String(payload.get("title", "")), 26, ThemeFactory.PALETTE.ink, true)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(title)

	var rank := UIFactory.label(String(payload.get("rank", "")), 15, ThemeFactory.PALETTE.ink_soft)
	rank.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(rank)

	var summary := UIFactory.label(String(payload.get("summary", "")), 15, ThemeFactory.PALETTE.ink_soft)
	summary.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(summary)

	var continue_button := UIFactory.button("继续", "secondary")
	continue_button.pressed.connect(_close)
	_frame_parts.actions.add_child(continue_button)

	_fade_in()
	var timer := get_tree().create_timer(AUTO_CLOSE_MS / 1000.0)
	timer.timeout.connect(_close)

func _fade_in() -> void:
	var frame: Control = _frame_parts.frame
	frame.modulate.a = 0.0
	frame.pivot_offset = frame.size * 0.5
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(frame, "modulate:a", 1.0, 0.45).set_ease(Tween.EASE_OUT)
	tween.tween_property(frame, "scale", Vector2.ONE, 0.45).from(Vector2(0.94, 0.94)).set_ease(Tween.EASE_OUT)

func _close() -> void:
	closed.emit()
	queue_free()
