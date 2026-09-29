extends RefCounted
class_name ArchiveSummary
## 档案页统计摘要。

const KIND_LABELS := {
	"chapter_intro": "章节开场",
	"event": "随机事件",
	"rank_ascension": "境界晋升",
	"ending": "终局仪式",
}

const JOURNAL_TYPE_LABELS := {
	"story": "剧情推进",
	"craft": "炼成记录",
	"event": "异象回应",
	"system": "系统纪要",
}

static func build_archive_summary(state: Dictionary, entries: Array) -> Dictionary:
	var journal_counts := {"story": 0, "craft": 0, "event": 0, "system": 0}
	for entry in state.journal:
		journal_counts[entry.type] = int(journal_counts[entry.type]) + 1

	var archive_counts := {"chapter_intro": 0, "event": 0, "rank_ascension": 0, "ending": 0}
	for entry in entries:
		archive_counts[entry.kind] = int(archive_counts[entry.kind]) + 1

	var top: Array = []
	for key in GameData.RESOURCE_KEYS:
		var amount := int(state.resources.get(key, 0))
		if amount > 0:
			top.append({"key": key, "label": GameData.RESOURCE_LABELS[key], "amount": amount})
	top.sort_custom(func(a, b):
		if a.amount != b.amount:
			return a.amount > b.amount
		return a.label < b.label
	)

	var total_units := 0
	for key in GameData.RESOURCE_KEYS:
		total_units += int(state.resources.get(key, 0))

	return {
		"journalCounts": journal_counts,
		"archiveCounts": archive_counts,
		"totalResourceUnits": total_units,
		"topResources": top.slice(0, 4),
		"latestJournalEntry": state.journal[0] if not state.journal.is_empty() else null,
		"latestArchiveEntry": entries[0] if not entries.is_empty() else null,
	}
