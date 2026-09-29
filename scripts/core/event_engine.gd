extends RefCounted
class_name EventEngine
## 随机事件引擎：触发判定、结算与临时效果。

const BASE_EVENT_CHANCE := 0.35

static func build_event_context(state: Dictionary, trigger: String) -> Dictionary:
	var chapter := GameData.get_current_chapter(state)
	return {
		"day": int(state.day),
		"rank": state.rank,
		"chapterTitle": chapter.title,
		"trigger": trigger,
		"lastActionSummary": state.lastActionSummary,
		"mastery": int(state.mastery),
		"knowledge": int(state.knowledge),
		"reputation": int(state.reputation),
	}

static func should_trigger_random_event(state: Dictionary, rng: RandomNumberGenerator, base_chance: float = BASE_EVENT_CHANCE) -> bool:
	if state.ended:
		return false
	var stage_bonus := float(GameData.rank_to_index(state.rank)) * 0.02
	var fatigue_penalty := -0.05 if int(state.vigor) <= 2 else 0.0
	var final_chance: float = clamp(base_chance + stage_bonus + fatigue_penalty, 0.1, 0.7)
	return rng.randf() < final_chance

static func fallback_narrative(rng: RandomNumberGenerator) -> Dictionary:
	var picked: Dictionary = GameData.FALLBACK_EVENTS[rng.randi() % GameData.FALLBACK_EVENTS.size()]
	return {
		"id": "fallback_%d_%d" % [Time.get_unix_time_from_system(), rng.randi() % 1000000],
		"source": "fallback",
		"title": picked.title,
		"body": picked.body,
		"tags": picked.tags,
	}

static func resolve_event_outcome(state: Dictionary, event: Dictionary, rng: RandomNumberGenerator) -> Dictionary:
	var tags: Array = event.get("tags", [])
	var risk_penalty := 0.02
	if tags.has("risk-high"):
		risk_penalty = 0.12
	elif tags.has("risk-medium"):
		risk_penalty = 0.06
	var bonus := 0.04 if tags.has("insight") else 0.0
	var success_rate: float = clamp(
		0.48 + float(state.mastery) * 0.004 + float(state.knowledge) * 0.0025 + bonus - risk_penalty,
		0.16, 0.9
	)
	var roll := rng.randf()
	var success := roll < success_rate
	var critical := success and roll < success_rate * 0.25
	var backlash := (not success) and rng.randf() > 0.8

	if success:
		var material_gain := {}
		if tags.has("material"):
			material_gain = {"moonDew": 1 + int(rng.randf() * 2.0)}
		var insight_gain := 2 if tags.has("emerald") else 1
		var summary := "你平稳处理了这次异象，并从中提炼出可用经验。"
		if critical:
			summary = "你在异象中捉住了极其罕见的共振窗口，收益被显著放大。"
		var resources := material_gain.duplicate(true)
		resources.aetherDust = int(resources.get("aetherDust", 0)) + (1 if tags.has("insight") else 0) + (1 if critical else 0)
		return {
			"success": true,
			"critical": critical,
			"backlash": false,
			"summary": summary,
			"delta": {
				"knowledge": 1 + insight_gain + (2 if critical else 0),
				"mastery": 1 + (2 if critical else 0),
				"reputation": (1 + (1 if critical else 0)) if tags.has("reputation") else 0,
				"vigor": 1 if critical else 0,
				"resources": resources,
			},
		}

	return {
		"success": false,
		"critical": false,
		"backlash": backlash,
		"summary": "仪式余波反噬了炉台，你勉强稳住了核心容器。" if backlash
			else "异象并未转化为收益，但你记录下了关键的失败参数。",
		"delta": {
			"knowledge": 1,
			"mastery": 0,
			"reputation": -1 if backlash else 0,
			"vigor": -2 if backlash else -1,
			"resources": {"ash": 1} if backlash else {},
		},
	}

static func _apply_event_transient_effects(state: Dictionary, event: Dictionary, outcome: Dictionary) -> Dictionary:
	var next := state
	var notes: Array = []
	var tags: Array = event.get("tags", [])

	if outcome.success and (outcome.critical or tags.has("emerald") or tags.has("insight")):
		var tolerance := 2 if outcome.critical else 1
		next = StateHelper.add_or_refresh_effect(next, {
			"kind": "tolerance_bonus",
			"label": "衡律祝福",
			"description": "更容易显化高阶产物（接下来 3 次炼成，高阶权重 +%d）。" % tolerance,
			"value": tolerance,
			"remainingTransmutations": 3,
		})
		notes.append("获得临时效果：衡律祝福（高阶权重 +%d）。" % tolerance)

	if outcome.success and tags.has("material") and (outcome.critical or tags.has("resource-rich")):
		next = StateHelper.add_or_refresh_effect(next, {
			"kind": "yield_bonus",
			"label": "丰饶回响",
			"description": "普通等价交换更容易裂解为细粒产物（接下来 2 次炼成）。",
			"value": 1,
			"remainingTransmutations": 2,
		})
		notes.append("获得临时效果：丰饶回响（细粒产物权重提升）。")

	if not outcome.success and (outcome.backlash or tags.has("risk-high")):
		next = StateHelper.add_or_refresh_effect(next, {
			"kind": "tolerance_penalty",
			"label": "紊乱残渣",
			"description": "接下来的炼成更容易混入低阶杂质（持续 2 次炼成）。",
			"value": 1,
			"remainingTransmutations": 2,
		})
		notes.append("受到负面效果：紊乱残渣（低阶杂质权重提升）。")

	return {"state": next, "notes": notes}

static func apply_event_outcome(state: Dictionary, event: Dictionary, outcome: Dictionary) -> Dictionary:
	var delta: Dictionary = outcome.delta
	var base_next := state.duplicate(true)
	base_next.knowledge = max(0, int(state.knowledge) + int(delta.get("knowledge", 0)))
	base_next.mastery = max(0, int(state.mastery) + int(delta.get("mastery", 0)))
	base_next.reputation = max(0, int(state.reputation) + int(delta.get("reputation", 0)))
	base_next.vigor = int(min(float(GameData.MAX_VIGOR), max(0.0, float(state.vigor) + float(delta.get("vigor", 0)))))
	base_next.resources = StateHelper.merge_resource_delta(state.resources, delta.get("resources", {}))

	var effect_applied := _apply_event_transient_effects(base_next, event, outcome)
	var effect_suffix := "" if effect_applied.notes.is_empty() else " %s" % " ".join(effect_applied.notes)
	var final_summary := "%s%s" % [outcome.summary, effect_suffix]

	var next: Dictionary = effect_applied.state.duplicate(true)
	next.lastEvent = {
		"id": event.id,
		"title": event.title,
		"body": event.body,
		"source": event.source,
		"outcomeSummary": final_summary,
	}
	return StateHelper.append_journal(next, StateHelper.create_journal_entry(
		int(state.day), "event", event.title, "%s\n%s" % [event.body, final_summary], event.source
	))
