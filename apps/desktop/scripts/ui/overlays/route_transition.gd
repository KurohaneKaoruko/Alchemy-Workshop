extends Control
## 路由转场闪光：0.62s 透明度脉冲 + 中央符记。

const DURATION := 0.62

var _veil: ColorRect
var _sigil: TextureRect

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_preset(Control.PRESET_FULL_RECT)

	_veil = ColorRect.new()
	_veil.set_anchors_preset(Control.PRESET_FULL_RECT)
	_veil.color = Color(0.05, 0.04, 0.02, 0.0)
	_veil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_veil)

	_sigil = UIFactory.star_icon(180, 0.0)
	_sigil.set_anchors_preset(Control.PRESET_CENTER)
	_sigil.position = Vector2(size.x * 0.5 - 90.0, size.y * 0.5 - 90.0)
	_sigil.pivot_offset = Vector2(90, 90)
	_sigil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_sigil)

	var tween := create_tween()
	tween.set_loops(1)
	tween.tween_property(_veil, "color:a", 0.16, DURATION * 0.35).set_ease(Tween.EASE_OUT)
	tween.parallel().tween_property(_sigil, "modulate:a", 0.5, DURATION * 0.35).set_ease(Tween.EASE_OUT)
	tween.parallel().tween_property(_sigil, "rotation", TAU * 0.25, DURATION).set_ease(Tween.EASE_OUT)
	tween.tween_property(_veil, "color:a", 0.0, DURATION * 0.65).set_ease(Tween.EASE_IN)
	tween.parallel().tween_property(_sigil, "modulate:a", 0.0, DURATION * 0.65).set_ease(Tween.EASE_IN)
	tween.tween_callback(queue_free)

	resized.connect(_on_resized)

func _on_resized() -> void:
	if _sigil != null:
		_sigil.position = Vector2(size.x * 0.5 - 90.0, size.y * 0.5 - 90.0)
