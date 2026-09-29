extends Control
## 大工终局仪式：四行分阶段呈现（1300ms/行）+ 快进。

signal closed

const STAGE_INTERVAL := 1.3

var payload: Dictionary = {}
var _frame_parts: Dictionary = {}
var _lines_box: VBoxContainer
var _stage := 0
var _lines: Array = []
var _timer: Timer
var _fast_forward: Button

func setup(ending_payload: Dictionary) -> void:
	payload = ending_payload

func _ready() -> void:
	_frame_parts = CinematicFrame.build("大工终局", 660)
	add_child(_frame_parts.root)

	var content: VBoxContainer = _frame_parts.content
	var title := UIFactory.label("贤者之石完成", 28, ThemeFactory.PALETTE.ink, true)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(title)

	_lines_box = UIFactory.vbox(8)
	content.add_child(_lines_box)

	_lines = [
		"火、盐、硫、汞在阵心重叠。",
		"《翠玉录》的句式与你的呼吸完全一致。",
		"赤红光核凝固，贤者之石在你掌中稳定。",
		"第 %d 日，工坊记录下你的终式：至高炼金术师。" % int(payload.get("day", 0)),
	]

	_fast_forward = UIFactory.button("快进仪式", "secondary")
	_fast_forward.pressed.connect(_finish_all)
	_frame_parts.actions.add_child(_fast_forward)

	var back_button := UIFactory.button("回到工坊", "gold")
	back_button.pressed.connect(_close)
	_frame_parts.actions.add_child(back_button)

	_timer = Timer.new()
	_timer.wait_time = STAGE_INTERVAL
	_timer.autostart = true
	_timer.timeout.connect(_advance_stage)
	add_child(_timer)

	var frame: Control = _frame_parts.frame
	frame.modulate.a = 0.0
	var tween := create_tween()
	tween.tween_property(frame, "modulate:a", 1.0, 0.5).set_ease(Tween.EASE_OUT)

func _advance_stage() -> void:
	if _stage >= _lines.size():
		_timer.stop()
		return
	_append_line(_lines[_stage])
	_stage += 1
	if _stage >= _lines.size():
		_timer.stop()
		_fast_forward.visible = false

func _append_line(text: String) -> void:
	var line := UIFactory.label(text, 16, ThemeFactory.PALETTE.ink_soft)
	line.modulate.a = 0.0
	_lines_box.add_child(line)
	var tween := create_tween()
	tween.tween_property(line, "modulate:a", 1.0, 0.5)

func _finish_all() -> void:
	while _stage < _lines.size():
		_append_line(_lines[_stage])
		_stage += 1
	_timer.stop()
	_fast_forward.visible = false

func _close() -> void:
	closed.emit()
	queue_free()
