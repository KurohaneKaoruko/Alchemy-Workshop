extends RefCounted
class_name WorkshopOverview
## 工坊总览摘要。

const ENTRY_TYPE_LABELS := {
	"story": "剧情",
	"craft": "炼成",
	"event": "异象",
	"system": "系统",
}

static func build_journal_preview(body: String, max_length: int = 56) -> String:
	var collapsed := ""
	var pending_space := false
	for i in range(body.length()):
		var ch := body[i]
		if ch == "\n" or ch == "\r" or ch == "\t" or ch == " ":
			pending_space = collapsed.length() > 0
		else:
			if pending_space:
				collapsed += " "
				pending_space = false
			collapsed += ch
	var normalized := collapsed
	if normalized.is_empty():
		return "暂无记录摘要。"

	var first_sentence := ""
	for segment in normalized.split("。"):
		if segment.strip_edges().length() > 0:
			first_sentence = segment.strip_edges()
			break
	if first_sentence != "" and first_sentence.length() <= max_length - 1:
		return "%s。" % first_sentence

	if normalized.length() <= max_length:
		return normalized
	return "%s…" % normalized.substr(0, max(1, max_length - 1)).strip_edges()

static func build_workshop_overview(state: Dictionary, entry_limit: int = 2, resource_limit: int = 4) -> Dictionary:
	var highlights: Array = []
	for key in GameData.RESOURCE_KEYS:
		var value := int(state.resources.get(key, 0))
		if value > 0:
			highlights.append({"key": key, "value": value})
	highlights.sort_custom(func(a, b):
		if a.value != b.value:
			return a.value > b.value
		return a.key < b.key
	)
	var reserve_highlights: Array = highlights.slice(0, resource_limit)

	var total_kinds := 0
	var total_units := 0
	for key in GameData.RESOURCE_KEYS:
		var value := int(state.resources.get(key, 0))
		if value > 0:
			total_kinds += 1
			total_units += value

	var recent_entries: Array = []
	for entry in state.journal.slice(0, entry_limit):
		recent_entries.append({
			"id": entry.id,
			"day": int(entry.day),
			"title": entry.title,
			"type": entry.type,
			"preview": build_journal_preview(entry.body),
		})

	return {
		"reserveHighlights": reserve_highlights,
		"recentEntries": recent_entries,
		"totalResourceKinds": total_kinds,
		"totalResourceUnits": total_units,
	}
