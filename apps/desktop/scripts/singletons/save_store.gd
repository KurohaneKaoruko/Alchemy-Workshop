extends Node
## 本地持久化：存档、偏好、AI 配置与过场档案（user:// 下的 JSON 文件）。

const SAVE_PATH := "user://alchemy_save_v1.json"
const PREFS_PATH := "user://alchemy_preferences_v1.json"
const AI_CONFIG_PATH := "user://alchemy_ai_config_v1.json"
const ARCHIVE_PATH := "user://alchemy_cinematic_archive_v1.json"

const AI_DEFAULTS := {
	"enabled": false,
	"baseUrl": "https://api.openai.com/v1",
	"model": "",
	"apiKey": "",
}

const PREFS_DEFAULTS := {
	"sfxEnabled": true,
	"sfxVolume": 0.7,
}

const _KEY_OBFUSCATION := "alchemy-workshop-local-key-v1"

func _read_json(path: String):
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return null
	var raw := file.get_as_text()
	file.close()
	var parsed = JSON.parse_string(raw)
	return parsed

func _write_json(path: String, data) -> bool:
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(data, "\t"))
	file.close()
	return true

# ---------------- 存档 ----------------

func save_game_state(state: Dictionary) -> void:
	var payload := {
		"version": 1,
		"state": state,
		"updatedAt": Time.get_datetime_string_from_system(true),
	}
	_write_json(SAVE_PATH, payload)

func _is_game_state_like(value) -> bool:
	if value == null or not (value is Dictionary):
		return false
	var candidate: Dictionary = value
	if int(candidate.get("version", 0)) != 1:
		return false
	if not (candidate.get("day") is int or candidate.get("day") is float):
		return false
	for field in ["rank", "lastActionSummary"]:
		if not (candidate.get(field, "") is String):
			return false
	for field in ["actionsLeft", "knowledge", "mastery", "reputation", "vigor", "rngSeed"]:
		var v = candidate.get(field, null)
		if not (v is int or v is float):
			return false
	if not (candidate.get("resources") is Dictionary):
		return false
	if not (candidate.get("unlockedRecipes") is Array):
		return false
	if not (candidate.get("journal") is Array):
		return false
	return true

func _normalize_game_state(state: Dictionary) -> Dictionary:
	var normalized := state.duplicate(true)
	var discovered: Array = ["triad_prime"]
	if normalized.get("discoveredFormulas") is Array:
		discovered = normalized.discoveredFormulas
	normalized.discoveredFormulas = discovered

	var effects: Array = []
	if normalized.get("activeEffects") is Array:
		for effect in normalized.activeEffects:
			if effect is Dictionary and effect.has("id") and effect.has("kind") and effect.has("label") \
					and effect.has("description") and effect.has("value") and effect.has("remainingTransmutations"):
				effects.append(effect)
	normalized.activeEffects = effects

	if normalized.get("lastEvent") is Dictionary:
		var le: Dictionary = normalized.lastEvent
		if le.has("id") and le.has("title") and le.has("body") and le.has("source") and le.has("outcomeSummary"):
			if String(le.id).length() == 0:
				le.id = "legacy_event_%d" % Time.get_unix_time_from_system()
		else:
			normalized.erase("lastEvent")

	for key in ["completedRecipes", "unlockedRecipes", "journal"]:
		if not (normalized.get(key) is Array):
			normalized[key] = []
	if not (normalized.get("resources") is Dictionary):
		normalized.resources = StateHelper.create_empty_resources()
	for resource_key in GameData.RESOURCE_KEYS:
		if not normalized.resources.has(resource_key):
			normalized.resources[resource_key] = 0
	return normalized

func load_game_state():
	var parsed = _read_json(SAVE_PATH)
	if parsed == null or not (parsed is Dictionary):
		return null
	var payload: Dictionary = parsed
	if int(payload.get("version", 0)) != 1:
		return null
	if not _is_game_state_like(payload.get("state")):
		return null
	return _normalize_game_state(payload.state)

func clear_game_state() -> void:
	DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_PATH))

# ---------------- 偏好 ----------------

func load_preferences() -> Dictionary:
	var parsed = _read_json(PREFS_PATH)
	if parsed == null or not (parsed is Dictionary):
		return PREFS_DEFAULTS.duplicate()
	var loaded: Dictionary = parsed
	return {
		"sfxEnabled": bool(loaded.get("sfxEnabled", true)),
		"sfxVolume": clamp(float(loaded.get("sfxVolume", 0.7)), 0.0, 1.0),
	}

func save_preferences(preferences: Dictionary) -> void:
	_write_json(PREFS_PATH, {
		"sfxEnabled": bool(preferences.get("sfxEnabled", true)),
		"sfxVolume": clamp(float(preferences.get("sfxVolume", 0.7)), 0.0, 1.0),
	})

# ---------------- AI 配置 ----------------

func _obfuscate(value: String) -> String:
	var output := PackedByteArray()
	output.resize(value.to_utf8_buffer().size())
	var bytes := value.to_utf8_buffer()
	var key_bytes := _KEY_OBFUSCATION.to_utf8_buffer()
	for i in range(bytes.size()):
		output[i] = bytes[i] ^ key_bytes[i % key_bytes.size()]
	return Marshalls.raw_to_base64(output)

func _deobfuscate(value: String) -> String:
	var bytes := Marshalls.base64_to_raw(value)
	if bytes.is_empty():
		return ""
	var key_bytes := _KEY_OBFUSCATION.to_utf8_buffer()
	var output := PackedByteArray()
	output.resize(bytes.size())
	for i in range(bytes.size()):
		output[i] = bytes[i] ^ key_bytes[i % key_bytes.size()]
	return output.get_string_from_utf8()

func load_ai_settings() -> Dictionary:
	var parsed = _read_json(AI_CONFIG_PATH)
	if parsed == null or not (parsed is Dictionary):
		return AI_DEFAULTS.duplicate()
	var loaded: Dictionary = parsed
	var api_key := ""
	if loaded.has("apiKeyCipher"):
		api_key = _deobfuscate(String(loaded.apiKeyCipher))
	var base_url := String(loaded.get("baseUrl", AI_DEFAULTS.baseUrl))
	if base_url.strip_edges() == "":
		base_url = AI_DEFAULTS.baseUrl
	return {
		"enabled": bool(loaded.get("enabled", false)),
		"baseUrl": base_url,
		"model": String(loaded.get("model", "")),
		"apiKey": api_key,
	}

func save_ai_settings(settings: Dictionary) -> void:
	var base_url := String(settings.get("baseUrl", "")).strip_edges()
	if base_url == "":
		base_url = AI_DEFAULTS.baseUrl
	var payload := {
		"enabled": bool(settings.get("enabled", false)),
		"baseUrl": base_url,
		"model": String(settings.get("model", "")).strip_edges(),
	}
	var key := String(settings.get("apiKey", "")).strip_edges()
	if key != "":
		payload.apiKeyCipher = _obfuscate(key)
	_write_json(AI_CONFIG_PATH, payload)

func to_runtime_config(settings: Dictionary):
	if not bool(settings.get("enabled", false)):
		return null
	var model := String(settings.get("model", "")).strip_edges()
	var api_key := String(settings.get("apiKey", "")).strip_edges()
	if model == "" or api_key == "":
		return null
	var base_url := String(settings.get("baseUrl", "")).strip_edges()
	if base_url == "":
		base_url = AI_DEFAULTS.baseUrl
	return {
		"enabled": true,
		"baseUrl": base_url.rstrip("/"),
		"model": model,
		"apiKey": api_key,
	}

# ---------------- 过场档案 ----------------

func _normalize_archive_entry(value):
	if value == null or not (value is Dictionary):
		return null
	var entry: Dictionary = value
	if not entry.has("id") or not entry.has("kind") or not entry.has("title") \
			or not entry.has("body") or not entry.has("day") or not entry.has("createdAt"):
		return null
	var normalized := {
		"id": String(entry.id),
		"kind": String(entry.kind),
		"title": String(entry.title),
		"body": String(entry.body),
		"day": int(entry.day),
		"createdAt": String(entry.createdAt),
	}
	if entry.has("subtitle"):
		normalized.subtitle = String(entry.subtitle)
	var source := String(entry.get("source", ""))
	if source == "ai" or source == "fallback" or source == "system":
		normalized.source = source
	if entry.get("payload") is Dictionary:
		normalized.payload = entry.payload
	return normalized

func load_cinematic_archive() -> Array:
	var parsed = _read_json(ARCHIVE_PATH)
	var entries: Array = []
	if parsed is Array:
		for value in parsed:
			var entry = _normalize_archive_entry(value)
			if entry != null:
				entries.append(entry)
	entries.sort_custom(func(a, b): return a.createdAt > b.createdAt)
	return entries

func save_cinematic_archive(entries: Array) -> void:
	_write_json(ARCHIVE_PATH, entries.slice(0, 200))

func add_cinematic_archive_entry(entry: Dictionary) -> Array:
	var current := load_cinematic_archive()
	for existing in current:
		if existing.id == entry.id:
			return current
	var with_created := entry.duplicate()
	if not with_created.has("createdAt"):
		with_created.createdAt = Time.get_datetime_string_from_system(true)
	var merged: Array = [with_created] + current
	merged.sort_custom(func(a, b): return a.createdAt > b.createdAt)
	save_cinematic_archive(merged)
	return merged

func clear_cinematic_archive() -> void:
	DirAccess.remove_absolute(ProjectSettings.globalize_path(ARCHIVE_PATH))
