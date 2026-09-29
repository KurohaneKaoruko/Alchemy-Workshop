extends Control
## 境界晋升过场：自动关闭 2600ms。

signal closed

const AUTO_CLOSE_MS := 2600

const ASCENSION_QUOTES := {
	"学徒": "火焰只是起点。",
	"炼金士": "你已听见汞与硫的回声。",
	"大炼金士": "炉环与你同频，秩序开始臣服。",
	"贤者候补": "赤红之门已在你面前开启。",
	"至高炼金术师": "贤者之石与你同名。",
}

var payload: Dictionary = {}
var _frame_parts: Dictionary = {}

func setup(ascension_payload: Dictionary) -> void:
	payload = ascension_payload

func _ready() -> void:
	_frame_parts = CinematicFrame.build("Ascension")
	add_child(_frame_parts.root)

	var content: VBoxContainer = _frame_parts.content
	var to_rank := String(payload.get("to", ""))
	var title := UIFactory.label(to_rank, 34, ThemeFactory.PALETTE.ink, true)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(title)

	var path_label := UIFactory.label("%s → %s" % [payload.get("from", ""), to_rank], 16, ThemeFactory.PALETTE.ink_soft, false, false)
	path_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(path_label)

	var quote := UIFactory.label(ASCENSION_QUOTES.get(to_rank, "炉火不熄。"), 15, ThemeFactory.PALETTE.ink_muted)
	quote.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(quote)

	var day_label := UIFactory.label("第 %d 日" % int(payload.get("day", 0)), 13, ThemeFactory.PALETTE.ink_muted, false, false)
	day_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(day_label)

	var continue_button := UIFactory.button("继续", "secondary")
	continue_button.pressed.connect(_close)
	_frame_parts.actions.add_child(continue_button)

	var frame: Control = _frame_parts.frame
	frame.modulate.a = 0.0
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(frame, "modulate:a", 1.0, 0.45).set_ease(Tween.EASE_OUT)
	tween.tween_property(frame, "scale", Vector2.ONE, 0.6).from(Vector2(1.08, 1.08)).set_ease(Tween.EASE_OUT)

	var timer := get_tree().create_timer(AUTO_CLOSE_MS / 1000.0)
	timer.timeout.connect(_close)

func _close() -> void:
	closed.emit()
	queue_free()
