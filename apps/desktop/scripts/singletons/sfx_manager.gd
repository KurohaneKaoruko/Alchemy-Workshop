extends Node
## 仪式音效合成器：以 AudioStreamGenerator 实时合成按键、炼成与异象提示音。

const MIX_RATE := 22050

var enabled := true
var volume := 0.7

var _player: AudioStreamPlayer
var _generator: AudioStreamGenerator
var _tones: Array = []
var _playhead := 0.0
var _processed_frames := 0

func _ready() -> void:
	_player = AudioStreamPlayer.new()
	add_child(_player)
	_generator = AudioStreamGenerator.new()
	_generator.mix_rate = MIX_RATE
	_generator.buffer_length = 0.35
	_player.stream = _generator
	_player.play()

func configure(sfx_enabled: bool, sfx_volume: float) -> void:
	enabled = sfx_enabled
	volume = clamp(sfx_volume, 0.0, 1.0)

func play_cue(cue: String) -> void:
	if not enabled:
		return
	match cue:
		"tap":
			_tone(520.0, 0.06, "square", 0.18, 0.0)
		"story":
			_tone(329.63, 0.10, "triangle", 0.26, 0.0)
			_tone(440.0, 0.12, "triangle", 0.24, 0.08)
		"transmute_success":
			_tone(392.0, 0.12, "triangle", 0.35, 0.0)
			_tone(523.25, 0.16, "triangle", 0.35, 0.08)
			_tone(659.25, 0.18, "sine", 0.28, 0.16)
		"transmute_fail":
			_tone(246.94, 0.16, "sawtooth", 0.30, 0.0)
			_tone(185.0, 0.20, "sawtooth", 0.28, 0.08)
		"event":
			_tone(293.66, 0.09, "sine", 0.20, 0.0)
			_tone(392.0, 0.11, "triangle", 0.22, 0.06)
			_tone(493.88, 0.13, "sine", 0.20, 0.12)

func _tone(freq: float, duration: float, wave_type: String, gain: float, offset: float) -> void:
	var start := _playhead + 0.015 + offset
	if start < _playhead:
		start = _playhead + 0.015
	_tones.append({
		"start": start,
		"freq": freq,
		"duration": duration,
		"type": wave_type,
		"gain": gain,
	})
	var end := start + duration
	if end > _playhead:
		_playhead = end

func _process(_delta: float) -> void:
	if _player == null:
		return
	if not _player.playing:
		_player.play()
	var playback := _player.get_stream_playback()
	if playback == null:
		return
	var frames_available: int = playback.get_frames_available()
	if frames_available <= 0:
		return
	if _tones.is_empty():
		var silence := PackedVector2Array()
		silence.resize(frames_available)
		playback.push_buffer(silence)
		_processed_frames += frames_available
		return

	var master := volume * 0.18
	var buffer := PackedVector2Array()
	buffer.resize(frames_available)
	for i in range(frames_available):
		var t := float(_processed_frames + i) / float(MIX_RATE)
		var sample := 0.0
		for tone in _tones:
			var start: float = tone.start
			var duration: float = tone.duration
			if t < start or t >= start + duration:
				continue
			var local: float = t - start
			var envelope: float = 0.0001
			var attack: float = min(0.03, duration * 0.2)
			if local < attack:
				envelope = exp(lerp(log(0.0001), log(float(tone.gain)), local / attack))
			else:
				var rest: float = (local - attack) / max(0.0001, duration - attack)
				envelope = exp(lerp(log(float(tone.gain)), log(0.0001), rest))
			var phase: float = TAU * float(tone.freq) * local
			var wave: float = 0.0
			match tone.type:
				"sine":
					wave = sin(phase)
				"triangle":
					wave = 2.0 * abs(2.0 * fposmod(phase / TAU, 1.0) - 1.0) - 1.0
				"square":
					wave = 1.0 if fmod(phase, TAU) < PI else -1.0
				"sawtooth":
					wave = 2.0 * fposmod(phase, TAU) / TAU - 1.0
			sample += wave * envelope
		sample = clamp(sample * master, -1.0, 1.0)
		buffer[i] = Vector2(sample, sample)

	playback.push_buffer(buffer)
	_processed_frames += frames_available
	var horizon := float(_processed_frames) / float(MIX_RATE)
	_tones = _tones.filter(func(tone): return float(tone.start) + float(tone.duration) > horizon)
