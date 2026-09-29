extends Node
## 游戏管理器：持有状态、驱动回合、桥接 AI 事件与过场演出信号。

signal state_changed(state: Dictionary)
signal status_changed(status_text: String)
signal busy_changed(busy: bool)
signal cinematic_event_requested(digest: Dictionary)
signal rank_ascension_requested(payload: Dictionary)
signal ending_requested(payload: Dictionary)
signal chapter_intro_requested(payload: Dictionary)
signal archive_changed(entries: Array)
signal preferences_changed(preferences: Dictionary)
signal ai_settings_changed(settings: Dictionary)

const DEFAULT_STATUS := "炉火尚温，你可以继续今天的工坊工作。"

var state: Dictionary = {}
var booted := false
var busy := false
var status_text := DEFAULT_STATUS
var preferences: Dictionary = {}
var ai_settings: Dictionary = {}
var runtime_ai_config = null

var _rng := RandomNumberGenerator.new()
var _last_seen_event_id: String = ""
var _previous_rank: String = ""
var _ending_shown := false
var _seen_intro_ids: Dictionary = {}
var pending_intro: Dictionary = {}

func _ready() -> void:
	preferences = Store.load_preferences()
	ai_settings = Store.load_ai_settings()
	runtime_ai_config = Store.to_runtime_config(ai_settings)
	Sfx.configure(bool(preferences.sfxEnabled), float(preferences.sfxVolume))

	var loaded = Store.load_game_state()
	if loaded != null:
		state = loaded
		var last_event = state.get("lastEvent")
		if last_event is Dictionary:
			_last_seen_event_id = String(last_event.id)
	else:
		state = StateHelper.create_initial_state()
	_previous_rank = String(state.rank)
	_ending_shown = bool(state.ended) and String(state.ending) == "philosopher_stone"
	_rng.seed = int(state.get("rngSeed", 0))
	booted = true
	_check_chapter_intro(false)
	state_changed.emit(state)

func get_chapter() -> Dictionary:
	return GameData.get_current_chapter(state)

func set_status(text: String) -> void:
	status_text = text
	status_changed.emit(text)

func _set_busy(value: bool) -> void:
	if busy == value:
		return
	busy = value
	busy_changed.emit(value)

# ---------------- 回合动作 ----------------

func do_story_choice(choice_id: String) -> void:
	if busy or state.ended:
		return
	Sfx.play_cue("tap")
	_set_busy(true)
	var result := Progression.apply_chapter_choice(state, choice_id, _rng)
	Sfx.play_cue("story")
	set_status(result.message)
	var next_state: Dictionary = result.state
	next_state = await _maybe_apply_event(next_state, "choice")
	_apply_state(next_state)
	_set_busy(false)

func do_circle_transmutation(offer: Dictionary) -> Dictionary:
	if busy:
		return {
			"state": state, "success": false,
			"message": "当前有进行中的操作，请稍候。",
			"consumedValue": 0, "producedValue": 0,
		}
	Sfx.play_cue("tap")
	_set_busy(true)
	var result: Dictionary = AlchemyCircle.transmute_by_circle(state, offer, _rng)
	Sfx.play_cue("transmute_success" if result.success else "transmute_fail")
	set_status(result.message)
	var next_state: Dictionary = result.state
	if result.success and not bool(next_state.ended):
		next_state = await _maybe_apply_event(next_state, "craft")
	_apply_state(next_state)
	_set_busy(false)
	result.state = next_state
	return result

func do_craft_recipe(recipe_id: String) -> Dictionary:
	if busy or state.ended:
		return {"state": state, "success": false, "critical": false, "recipeId": recipe_id, "message": "当前不可炼成。"}
	Sfx.play_cue("tap")
	_set_busy(true)
	var result: Dictionary = Crafting.craft_recipe(state, recipe_id, _rng)
	Sfx.play_cue("transmute_success" if result.success else "transmute_fail")
	set_status(result.message)
	var next_state: Dictionary = result.state
	if result.success and not bool(next_state.ended):
		next_state = await _maybe_apply_event(next_state, "craft")
	_apply_state(next_state)
	_set_busy(false)
	result.state = next_state
	return result

func reset_game() -> void:
	Sfx.play_cue("tap")
	Store.clear_game_state()
	state = StateHelper.create_initial_state()
	_last_seen_event_id = ""
	_previous_rank = String(state.rank)
	_ending_shown = false
	_rng.seed = int(state.rngSeed)
	set_status("工坊已经重启，新的炼金日程开始。")
	state_changed.emit(state)
	_check_chapter_intro(false)

# ---------------- 随机事件 ----------------

func _maybe_apply_event(base_state: Dictionary, trigger: String) -> Dictionary:
	if not EventEngine.should_trigger_random_event(base_state, _rng):
		return base_state

	var context := EventEngine.build_event_context(base_state, trigger)
	var event := {}
	if runtime_ai_config != null:
		var result: Dictionary = await AiClient.generate_event(context, runtime_ai_config)
		if result.has("event"):
			event = result.event
	if event.is_empty():
		event = EventEngine.fallback_narrative(_rng)

	Sfx.play_cue("event")
	var outcome := EventEngine.resolve_event_outcome(base_state, event, _rng)
	var next_state := EventEngine.apply_event_outcome(base_state, event, outcome)
	var source_label := "AI" if event.source == "ai" else "内置"
	set_status("%s（%s）：%s" % [event.title, source_label, outcome.summary])
	return next_state

# ---------------- 状态应用与过场钩子 ----------------

func _apply_state(next_state: Dictionary) -> void:
	state = next_state
	Store.save_game_state(state)

	# 章节开场
	_check_chapter_intro(false)

	# 最近异象 → 演出 + 档案
	var last_event = state.get("lastEvent")
	if last_event is Dictionary and String(last_event.id) != _last_seen_event_id:
		_last_seen_event_id = String(last_event.id)
		var digest: Dictionary = last_event
		_add_archive({
			"id": "event_%s" % String(digest.id),
			"kind": "event",
			"title": String(digest.title),
			"subtitle": "AI 异象记录" if String(digest.source) == "ai" else "工坊秘录",
			"body": "%s\n\n%s" % [String(digest.body), String(digest.outcomeSummary)],
			"day": int(state.day),
			"source": String(digest.source),
			"payload": digest.duplicate(),
		})
		cinematic_event_requested.emit(digest)

	# 境界晋升 → 演出 + 档案
	var current_rank := String(state.rank)
	if _previous_rank != "" and _previous_rank != current_rank \
			and GameData.rank_to_index(current_rank) > GameData.rank_to_index(_previous_rank):
		var payload := {
			"id": "ascension_%d_%s" % [Time.get_unix_time_from_system(), current_rank],
			"from": _previous_rank,
			"to": current_rank,
			"day": int(state.day),
		}
		_add_archive({
			"id": payload.id,
			"kind": "rank_ascension",
			"title": "境界突破：%s" % current_rank,
			"subtitle": "%s → %s" % [_previous_rank, current_rank],
			"body": "第 %d 日，你跨入了「%s」境界。" % [int(state.day), current_rank],
			"day": int(state.day),
			"source": "system",
			"payload": payload.duplicate(),
		})
		rank_ascension_requested.emit(payload)
	_previous_rank = current_rank

	# 终局
	if booted and bool(state.ended) and String(state.ending) == "philosopher_stone" and not _ending_shown:
		_ending_shown = true
		var ending_payload := {
			"id": "ending_%d" % Time.get_unix_time_from_system(),
			"day": int(state.day),
			"ending": "philosopher_stone",
		}
		_add_archive({
			"id": ending_payload.id,
			"kind": "ending",
			"title": "贤者之石完成",
			"subtitle": "Grand Work",
			"body": "第 %d 日，你完成赤红终式，成为至高炼金术师。" % int(state.day),
			"day": int(state.day),
			"source": "system",
			"payload": ending_payload.duplicate(),
		})
		ending_requested.emit(ending_payload)

	state_changed.emit(state)

func _check_chapter_intro(silent: bool) -> void:
	var chapter := get_chapter()
	var intro_id := "%s_%s" % [String(chapter.id), String(state.rank)]
	if _seen_intro_ids.has(intro_id):
		return
	_seen_intro_ids[intro_id] = true
	var payload := {
		"id": intro_id,
		"title": String(chapter.title),
		"summary": String(chapter.summary),
		"rank": String(state.rank),
	}
	pending_intro = payload
	_add_archive({
		"id": "chapter_intro_%s" % intro_id,
		"kind": "chapter_intro",
		"title": String(chapter.title),
		"subtitle": String(state.rank),
		"body": String(chapter.summary),
		"day": int(state.day),
		"source": "system",
		"payload": payload.duplicate(),
	})
	if not silent:
		chapter_intro_requested.emit(payload)

func _add_archive(entry: Dictionary) -> void:
	var entries := Store.add_cinematic_archive_entry(entry)
	archive_changed.emit(entries)

func get_archive_entries() -> Array:
	return Store.load_cinematic_archive()

func clear_archive() -> void:
	Store.clear_cinematic_archive()
	archive_changed.emit([])

# ---------------- 偏好与 AI 设置 ----------------

func set_preferences(next: Dictionary) -> void:
	preferences = {
		"sfxEnabled": bool(next.get("sfxEnabled", true)),
		"sfxVolume": clamp(float(next.get("sfxVolume", 0.7)), 0.0, 1.0),
	}
	Store.save_preferences(preferences)
	Sfx.configure(bool(preferences.sfxEnabled), float(preferences.sfxVolume))
	preferences_changed.emit(preferences)

func save_ai_settings(next: Dictionary) -> void:
	ai_settings = {
		"enabled": bool(next.get("enabled", false)),
		"baseUrl": String(next.get("baseUrl", "")).strip_edges(),
		"model": String(next.get("model", "")).strip_edges(),
		"apiKey": String(next.get("apiKey", "")).strip_edges(),
	}
	if ai_settings.baseUrl == "":
		ai_settings.baseUrl = Store.AI_DEFAULTS.baseUrl
	Store.save_ai_settings(ai_settings)
	runtime_ai_config = Store.to_runtime_config(ai_settings)
	ai_settings_changed.emit(ai_settings)

func test_ai_connection(draft: Dictionary) -> String:
	var runtime = Store.to_runtime_config(draft)
	if runtime == null:
		return "请先启用 AI 并填写模型与 API Key。"
	var context := EventEngine.build_event_context(state, "choice")
	var result: Dictionary = await AiClient.generate_event(context, runtime)
	if result.has("event"):
		return "连接成功，可用于随机事件叙事。"
	return "连接失败：%s" % String(result.get("error", "未知错误"))
