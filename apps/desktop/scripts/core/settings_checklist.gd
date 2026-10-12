extends RefCounted
class_name SettingsChecklist
## 设置页校验清单与总览。

static func build_settings_checklist(draft: Dictionary, preferences: Dictionary, runtime_ai_config) -> Array:
	var ai_enabled := bool(draft.get("enabled", false))
	var base_url: String = draft.get("baseUrl", "").strip_edges()
	var model: String = draft.get("model", "").strip_edges()
	var api_key: String = draft.get("apiKey", "").strip_edges()

	var base_url_state := "standby"
	if base_url != "":
		base_url_state = "ready"
	elif ai_enabled:
		base_url_state = "attention"

	var model_state := "standby"
	if model != "":
		model_state = "ready"
	elif ai_enabled:
		model_state = "attention"

	var api_key_state := "standby"
	if api_key != "":
		api_key_state = "ready"
	elif ai_enabled:
		api_key_state = "attention"

	var audio_state := "ready" if bool(preferences.get("sfxEnabled", true)) else "standby"

	return [
		{
			"id": "ai_mode", "label": "AI 异象开关",
			"state": "ready" if runtime_ai_config != null else ("attention" if ai_enabled else "standby"),
			"detail": ("当前已生效，模型为 %s。" % runtime_ai_config.model) if runtime_ai_config != null
				else ("已启用草稿，但仍缺少生效条件。" if ai_enabled
				else "当前关闭，系统会稳定回退到内置事件。"),
		},
		{
			"id": "base_url", "label": "Base URL", "state": base_url_state,
			"detail": base_url if base_url != "" else ("启用 AI 前需要填写兼容接口地址。" if ai_enabled else "保持空白也不会影响离线模式。"),
		},
		{
			"id": "model", "label": "模型名称", "state": model_state,
			"detail": ("将用于生成随机异象文本：%s" % model) if model != "" else ("启用 AI 后必须填写模型名称。" if ai_enabled else "AI 未启用，模型字段当前可稍后再填。"),
		},
		{
			"id": "api_key", "label": "API Key", "state": api_key_state,
			"detail": "已录入本地草稿，可在保存后用于连接测试。" if api_key != "" else ("启用 AI 后必须录入密钥。" if ai_enabled else "AI 未启用，当前无需录入密钥。"),
		},
		{
			"id": "audio", "label": "仪式音效", "state": audio_state,
			"detail": ("当前开启，音量 %d%%。" % int(round(float(preferences.get("sfxVolume", 0.7)) * 100.0))) if audio_state == "ready"
				else "当前关闭，所有按钮与炼成反馈都会静音。",
		},
	]

static func get_connection_feedback_tone(status: String) -> String:
	if status.is_empty():
		return "neutral"
	if status.begins_with("测试连接中"):
		return "pending"
	if status.begins_with("连接成功"):
		return "success"
	if status.begins_with("连接失败"):
		return "error"
	return "neutral"

static func build_settings_overview(checklist: Array, runtime_ai_config, status: String, options: Dictionary) -> Dictionary:
	var readiness_count := 0
	for item in checklist:
		if item.state == "ready":
			readiness_count += 1
	var attention_items: Array = []
	for item in checklist:
		if item.state == "attention":
			attention_items.append(item)

	var connection_tone := get_connection_feedback_tone(status)
	var headline := ""
	var detail := ""
	var tone := ""

	if connection_tone == "error":
		headline = "连接验证失败"
		detail = status
		tone = "error"
	elif connection_tone == "success":
		headline = "连接验证成功"
		detail = status
		tone = "success"
	elif connection_tone == "pending":
		headline = "连接测试进行中"
		detail = status
		tone = "pending"
	elif runtime_ai_config != null:
		headline = "AI 已接入工坊"
		detail = "当前模型为 %s，外部叙事能力已可用。" % runtime_ai_config.model
		tone = "ready"
	elif not attention_items.is_empty():
		var names: Array = []
		for item in attention_items.slice(0, 2):
			names.append(item.label)
		headline = "还有 %d 项待补全" % attention_items.size()
		detail = "优先检查：%s。" % "、".join(names)
		tone = "attention"
	else:
		headline = "当前处于回退模式"
		detail = "未启用 AI 也能稳定游玩，随机异象会自动回退到内置模板。"
		tone = "standby"

	var connection_label := ""
	if connection_tone == "success":
		connection_label = "连接通过"
	elif connection_tone == "error":
		connection_label = "连接失败"
	elif connection_tone == "pending":
		connection_label = "测试中"
	elif bool(options.get("canTestConnection", false)):
		connection_label = "待验证"
	else:
		connection_label = "待补全"

	return {
		"readinessCount": readiness_count,
		"totalCount": checklist.size(),
		"headline": headline,
		"detail": detail,
		"tone": tone,
		"modeLabel": options.get("aiModeLabel", ""),
		"keyLabel": options.get("keyStatus", ""),
		"connectionLabel": connection_label,
	}
