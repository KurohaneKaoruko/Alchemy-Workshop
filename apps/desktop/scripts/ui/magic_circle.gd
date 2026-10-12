extends Control
class_name MagicCircle
## 魔法阵绘制：投料充能、符文旋转、槽位锚点与炼成爆发。
## 魔法阵绘制：投料充能、符文旋转、槽位锚点与炼成爆发。

const SLOT_ANCHORS: Array = [
	Vector2(0.5, 0.08),
	Vector2(0.20, 0.24),
	Vector2(0.80, 0.24),
	Vector2(0.12, 0.50),
	Vector2(0.88, 0.50),
	Vector2(0.20, 0.76),
	Vector2(0.80, 0.76),
	Vector2(0.5, 0.92),
	Vector2(0.5, 0.5),
]

var rotation_speed := 0.55
var pulse_speed := 1.7
var base_radius := 150.0

var _angle := 0.0
var _time := 0.0
var _charge := 0.0
var _target_charge := 0.0
var _flash := 0.0
var _burst_kind := 0  # 0 none / 1 success / -1 fail
var _ring_mode := "neutral"  # neutral / blessed / chaos
var _slot_states: Array = []  # 每槽 0 空 / 1 有料

func set_alchemy_state(offered_value: float, filled_slots: int, can_transmute: bool) -> void:
	var value_ratio: float = clamp(offered_value / 26.0, 0.0, 1.0)
	var slot_ratio: float = clamp(float(filled_slots) / 9.0, 0.0, 1.0)
	_target_charge = clamp(value_ratio * 0.62 + slot_ratio * 0.38, 0.0, 1.0)
	if can_transmute and offered_value > 0.0:
		_target_charge = maxf(_target_charge, 0.80)

func set_slot_states(states: Array) -> void:
	_slot_states = states

func set_ring_mode(mode: String) -> void:
	_ring_mode = mode

func trigger_burst(success: bool) -> void:
	_flash = 1.0
	_burst_kind = 1 if success else -1

func _process(delta: float) -> void:
	_angle += delta * rotation_speed
	_time += delta * pulse_speed
	_charge = lerpf(_charge, _target_charge, minf(delta * 4.5, 1.0))
	_flash = maxf(0.0, _flash - delta * 1.5)
	queue_redraw()

func _ring_colors() -> Dictionary:
	var glow := Color(0.66, 0.44, 0.20, 0.18)
	var ring := Color(0.95, 0.74, 0.40)
	var rune := Color(1.0, 0.88, 0.64)
	match _ring_mode:
		"blessed":
			glow = Color(0.72, 0.56, 0.24, 0.22)
			ring = Color(0.98, 0.82, 0.48)
			rune = Color(1.0, 0.93, 0.72)
		"chaos":
			glow = Color(0.60, 0.30, 0.18, 0.22)
			ring = Color(0.90, 0.58, 0.38)
			rune = Color(0.96, 0.70, 0.52)
	if _burst_kind == 1:
		ring = Color(0.86, 0.95, 0.62)
		rune = Color(0.94, 1.0, 0.76)
	elif _burst_kind == -1:
		ring = Color(0.92, 0.48, 0.36)
		rune = Color(0.98, 0.60, 0.46)
	return {"glow": glow, "ring": ring, "rune": rune}

func _draw() -> void:
	var center := size * 0.5
	var pulse_amp := lerpf(0.028, 0.058, _charge)
	var pulse := 1.0 + sin(_time) * pulse_amp
	var outer_radius := base_radius * pulse
	var mid_radius := outer_radius * 0.72
	var inner_radius := outer_radius * 0.44
	var core_radius := outer_radius * 0.20

	var flash_boost := _flash * 0.42
	var colors := _ring_colors()
	var glow_alpha: float = lerpf(0.12, 0.26, _charge) + flash_boost * 0.2
	var ring_alpha: float = clampf(lerpf(0.70, 0.96, _charge) + flash_boost * 0.16, 0.0, 1.0)
	var rune_alpha: float = clampf(lerpf(0.68, 0.96, _charge) + flash_boost * 0.22, 0.0, 1.0)

	var glow_color := Color(colors.glow.r, colors.glow.g, colors.glow.b, glow_alpha)
	var ring_color := Color(colors.ring.r, colors.ring.g, colors.ring.b, ring_alpha)
	var rune_color := Color(colors.rune.r, colors.rune.g, colors.rune.b, rune_alpha)

	for i in range(4):
		var r: float = outer_radius + 34.0 - float(i) * 10.0
		var alpha: float = glow_color.a * (0.38 + float(i) * 0.22)
		draw_circle(center, r, Color(glow_color.r, glow_color.g, glow_color.b, alpha))

	draw_arc(center, outer_radius, 0.0, TAU, 132, ring_color, 2.4, true)
	draw_arc(center, mid_radius, 0.0, TAU, 112, Color(ring_color.r, ring_color.g, ring_color.b, ring_alpha * 0.78), 1.8, true)
	draw_arc(center, inner_radius, 0.0, TAU, 96, Color(rune_color.r, rune_color.g, rune_color.b, rune_alpha * 0.82), 1.5, true)

	for i in range(16):
		var t: float = _angle + (TAU / 16.0) * i
		var p1 := center + Vector2(cos(t), sin(t)) * (mid_radius - 8.0)
		var p2 := center + Vector2(cos(t), sin(t)) * (outer_radius + 5.0)
		draw_line(p1, p2, Color(rune_color.r, rune_color.g, rune_color.b, rune_alpha * 0.78), 1.4)

	for i in range(14):
		var t: float = _angle * 1.12 + (TAU / 14.0) * i
		var orbit: float = outer_radius + 14.0 + sin(_time * 1.25 + float(i) * 0.55) * 2.4
		var rune_pos := center + Vector2(cos(t), sin(t)) * orbit
		var outward := (rune_pos - center).normalized()
		var tangent := Vector2(-outward.y, outward.x)
		var rune_size: float = 4.6 + _charge * 1.5 + _flash * 1.2
		_draw_rune_diamond(rune_pos, outward, tangent, rune_size, Color(rune_color.r, rune_color.g, rune_color.b, rune_alpha * 0.72))

	for i in range(7):
		var t: float = -_angle * 0.72 + (TAU / 7.0) * i
		var orb_center := center + Vector2(cos(t), sin(t)) * (inner_radius + 10.0)
		draw_circle(orb_center, 2.8 + _charge * 0.6, Color(1.0, 0.88, 0.66, 0.74 + _charge * 0.16))

	for i in range(5):
		var spark_angle: float = -_angle * 1.35 + (TAU / 5.0) * i
		var spark_radius: float = inner_radius * 0.34 + sin(_time * 2.2 + float(i) * 1.4) * 4.0
		var spark_pos := center + Vector2(cos(spark_angle), sin(spark_angle)) * spark_radius
		draw_circle(spark_pos, 1.8, Color(1.0, 0.90, 0.68, 0.42 + _charge * 0.36 + _flash * 0.12))

	draw_circle(center, core_radius + 10.0, Color(0.58, 0.41, 0.20, 0.16 + _charge * 0.12))
	draw_circle(center, core_radius, Color(0.86, 0.63, 0.30, 0.30 + _charge * 0.12 + _flash * 0.18))

	# 槽位锚点装饰环
	for i in range(SLOT_ANCHORS.size()):
		var anchor: Vector2 = center + (SLOT_ANCHORS[i] - Vector2(0.5, 0.5)) * Vector2(size.x, size.y)
		var filled := i < _slot_states.size() and int(_slot_states[i]) > 0
		var anchor_color := ring_color if filled else Color(ring_color.r, ring_color.g, ring_color.b, 0.30)
		if filled:
			draw_circle(anchor, 30.0, Color(0.35, 0.25, 0.13, 0.24))
			draw_arc(anchor, 28.0, 0.0, TAU, 40, anchor_color, 1.6, true)
		else:
			draw_arc(anchor, 24.0, 0.0, TAU, 32, Color(anchor_color.r, anchor_color.g, anchor_color.b, 0.35), 1.0, true)

func _draw_rune_diamond(pos: Vector2, outward: Vector2, tangent: Vector2, rune_size: float, color: Color) -> void:
	var points := PackedVector2Array([
		pos + outward * rune_size,
		pos + tangent * (rune_size * 0.64),
		pos - outward * rune_size,
		pos - tangent * (rune_size * 0.64),
	])
	draw_colored_polygon(points, color)
