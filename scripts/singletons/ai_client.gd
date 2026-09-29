extends Node
## AI 叙事客户端：直接调用 OpenAI 兼容 /chat/completions。

const CODE_FENCE := "___CODE_FENCE___"

var _fence: String = String.chr(96) + String.chr(96) + String.chr(96)

func _build_system_prompt() -> String:
	return "\n".join([
		"你是炼金术题材文字冒险事件生成器。",
		"请使用庄重神秘的中文文风。",
		"不要使用列表，不要解释规则，不要出现JSON。",
		"文本长度控制在60到180字，必须包含炼金术意象（火候、坩埚、封印、翠玉录等任意元素）。",
		"避免现代互联网术语。",
		"严格按以下格式输出：",
		"标题：不超过16字，不要与正文首句完全重复。",
		"正文：一段到两段连续叙述。",
	])

func _normalize_base_url(base_url: String) -> String:
	var trimmed := base_url.strip_edges()
	if trimmed == "":
		return "https://api.openai.com/v1"
	return trimmed.rstrip("/")

func _compact_text(content: String) -> String:
	var collapsed := ""
	var pending_space := false
	for i in range(content.length()):
		var ch := content[i]
		if ch == "\n" or ch == "\r" or ch == "\t" or ch == " ":
			pending_space = collapsed.length() > 0
		else:
			if pending_space:
				collapsed += " "
				pending_space = false
			collapsed += ch
	return collapsed

func _derive_title(content: String) -> String:
	var compact := _compact_text(content)
	var unified := compact
	for delimiter in ["！", "？", "!", "?", "."]:
		unified = unified.replace(delimiter, "。")
	var sentence := ""
	for part in unified.split("。"):
		if part.strip_edges().length() > 0:
			sentence = part.strip_edges()
			break
	if sentence == "":
		return "炼金异象"

	var clauses: Array = [sentence]
	for delimiter in ["，", "、", "；", "：", ":", ","]:
		var expanded: Array = []
		for clause in clauses:
			for sub in String(clause).split(delimiter):
				var trimmed := String(sub).strip_edges()
				if trimmed != "":
					expanded.append(trimmed)
		clauses = expanded
		if clauses.is_empty():
			clauses = [sentence]

	for clause in clauses:
		if clause.length() >= 4 and clause.length() <= 16:
			return clause
	for clause in clauses:
		if clause.length() >= 4:
			return clause.substr(0, 18)
	return sentence.substr(0, 18)

func _sanitize_content(raw: String) -> String:
	var cleaned := raw.replace("\r", "")
	var fence_pattern := "%s[\\s\\S]*?%s" % [_fence, _fence]
	var code_block := RegEx.new()
	code_block.compile(fence_pattern)
	cleaned = code_block.sub(cleaned, "", true)
	cleaned = cleaned.strip_edges()
	if cleaned.length() > 260:
		cleaned = cleaned.substr(0, 260)
	return cleaned

func _strip_heading(line: String) -> String:
	var trimmed := line.strip_edges()
	while trimmed.begins_with("#"):
		trimmed = trimmed.substr(1).strip_edges()
	return trimmed

func _parse_narrative_content(raw_content: String) -> Dictionary:
	var cleaned := _sanitize_content(raw_content)
	if cleaned == "":
		return {"title": "炼金异象", "body": ""}

	var labelled := RegEx.new()
	labelled.compile("^\\s*标题[:：]\\s*(.+?)\\s*(?:\\n+)\\s*正文[:：]\\s*([\\s\\S]+)$")
	var regex_match := labelled.search(cleaned)
	if regex_match:
		return {"title": regex_match.get_string(1).strip_edges().substr(0, 40), "body": regex_match.get_string(2).strip_edges()}

	var inline_bold := RegEx.new()
	inline_bold.compile("^\\s*\\*\\*(.+?)\\*\\*(?:[：:\\s-]*)([\\s\\S]*)$")
	regex_match = inline_bold.search(cleaned)
	if regex_match:
		var body := regex_match.get_string(2).strip_edges()
		if body != "":
			return {"title": regex_match.get_string(1).strip_edges().substr(0, 40), "body": body}

	var lines: Array = []
	for line in cleaned.split("\n"):
		var trimmed := String(line).strip_edges()
		if trimmed != "":
			lines.append(trimmed)
	if lines.size() > 1 and String(lines[0]).length() <= 24:
		return {
			"title": _strip_heading(String(lines[0])).substr(0, 40),
			"body": "\n\n".join(lines.slice(1)).strip_edges(),
		}

	return {"title": _derive_title(cleaned), "body": cleaned}

## 协程：返回 {"event": {...}} 或 {"error": "..."}。
func generate_event(context: Dictionary, config: Dictionary) -> Dictionary:
	if not bool(config.get("enabled", false)) or String(config.get("model", "")) == "" or String(config.get("apiKey", "")) == "":
		return {"error": "AI 未启用或配置不完整。"}

	var base_url := _normalize_base_url(String(config.get("baseUrl", "")))
	var user_prompt := "\n".join([
		"日期: 第%d日" % int(context.day),
		"境界: %s" % String(context.rank),
		"章节: %s" % String(context.chapterTitle),
		"触发来源: %s" % String(context.trigger),
		"上一动作: %s" % String(context.lastActionSummary),
		"当前状态: 知识%d 熟练%d 名望%d" % [int(context.knowledge), int(context.mastery), int(context.reputation)],
		"请生成一个可直接展示给玩家的随机事件正文。",
	])

	var body := JSON.stringify({
		"model": String(config.model),
		"temperature": 0.95,
		"max_tokens": 220,
		"messages": [
			{"role": "system", "content": _build_system_prompt()},
			{"role": "user", "content": user_prompt},
		],
	})

	var http := HTTPRequest.new()
	http.timeout = 12.0
	http.use_threads = true
	add_child(http)
	var headers := PackedStringArray([
		"Authorization: Bearer %s" % String(config.apiKey),
		"Content-Type: application/json",
	])
	var err := http.request("%s/chat/completions" % base_url, headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		http.queue_free()
		return {"error": "AI 请求发起失败（%d）。" % err}

	var response: Array = await http.request_completed
	http.queue_free()
	var result: int = response[0]
	var code: int = response[1]
	var response_body: PackedByteArray = response[3]

	if result != HTTPRequest.RESULT_SUCCESS:
		return {"error": "AI 请求超时或网络失败。"}
	if code < 200 or code >= 300:
		return {"error": "AI 请求失败（%d）：%s" % [code, response_body.get_string_from_utf8().substr(0, 200)]}

	var parsed = JSON.parse_string(response_body.get_string_from_utf8())
	if parsed == null or not (parsed is Dictionary):
		return {"error": "AI 返回内容无法解析。"}
	var data: Dictionary = parsed
	var choices: Array = data.get("choices", [])
	var raw_content := ""
	if not choices.is_empty() and choices[0] is Dictionary:
		var message = choices[0].get("message", {})
		if message is Dictionary:
			raw_content = String(message.get("content", ""))

	var narrative := _parse_narrative_content(raw_content)
	if narrative.body == "":
		return {"error": "AI 返回内容为空。"}

	return {
		"event": {
			"id": "ai_%d_%d" % [Time.get_unix_time_from_system(), randi() % 1000000],
			"title": String(narrative.title).substr(0, 40),
			"body": String(narrative.body).substr(0, 260),
			"tags": ["ai", "alchemy"],
			"source": "ai",
		}
	}
