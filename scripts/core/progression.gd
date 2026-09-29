extends RefCounted
class_name Progression
## 境界晋升、剧情行动与定式线索发现。

static func clamp_value(value: float, lo: float, hi: float) -> float:
	return min(hi, max(lo, value))

static func _chance(rng: RandomNumberGenerator, rate: float) -> bool:
	return rng.randf() < clamp_value(rate, 0.0, 1.0)

static func get_next_rank_goal(state: Dictionary):
	var current_index := GameData.rank_to_index(state.rank)
	if current_index < 0 or current_index + 1 >= GameData.RANK_ORDER.size():
		return null
	var target_rank: String = GameData.RANK_ORDER[current_index + 1]
	if target_rank == "学徒":
		return null
	if not GameData.RANK_REQUIREMENTS.has(target_rank):
		return null
	var req: Dictionary = GameData.RANK_REQUIREMENTS[target_rank]
	var recipe_id: String = req.get("requireRecipe", "")
	return {
		"targetRank": target_rank,
		"knowledge": int(req.knowledge),
		"mastery": int(req.mastery),
		"reputation": int(req.reputation),
		"requireRecipe": recipe_id if recipe_id != "" else null,
		"ready": can_rank_up(state, target_rank),
	}

static func can_rank_up(state: Dictionary, target_rank: String) -> bool:
	if target_rank == "学徒":
		return false
	if not GameData.RANK_REQUIREMENTS.has(target_rank):
		return false
	var req: Dictionary = GameData.RANK_REQUIREMENTS[target_rank]
	if int(state.knowledge) < int(req.knowledge):
		return false
	if int(state.mastery) < int(req.mastery):
		return false
	if int(state.reputation) < int(req.reputation):
		return false
	var require_recipe: String = req.get("requireRecipe", "")
	if require_recipe != "" and not state.completedRecipes.has(require_recipe):
		return false
	return true

static func evaluate_rank_progression(state: Dictionary) -> Dictionary:
	var next := state
	var messages: Array = []
	while true:
		var current_index := GameData.rank_to_index(next.rank)
		if current_index < 0 or current_index + 1 >= GameData.RANK_ORDER.size():
			break
		var target: String = GameData.RANK_ORDER[current_index + 1]
		if target == "至高炼金术师":
			break
		if not can_rank_up(next, target):
			break

		next = StateHelper.with_rank_unlocked_recipes(next, target)
		next = next.duplicate(true)
		next.rank = target
		next = StateHelper.append_journal(next, StateHelper.create_journal_entry(
			int(next.day), "system", "境界突破：%s" % target,
			"你跨入「%s」阶段，新的配方与风险同时向你展开。" % target
		))
		messages.append("你已晋升为%s。" % target)
	return {"state": next, "messages": messages}

static func _apply_story_action_effect(state: Dictionary, choice: Dictionary, rng: RandomNumberGenerator) -> Dictionary:
	var chapter_depth := int(clamp_value(float(GameData.rank_to_index(state.rank)), 0.0, 3.0))
	var knowledge_gain := 0
	var mastery_gain := 0
	var reputation_gain := 0
	var vigor_delta := 0
	var resource_delta := {}
	var action: String = choice.action

	match action:
		"study":
			knowledge_gain = 2 + int(rng.randf() * 3.0)
			mastery_gain = 1 + int(rng.randf() * 2.0)
			vigor_delta = -1
			if _chance(rng, 0.30 + chapter_depth * 0.05):
				resource_delta.aetherDust = int(resource_delta.get("aetherDust", 0)) + 1
			if _chance(rng, 0.24 + chapter_depth * 0.05):
				resource_delta.voidInk = int(resource_delta.get("voidInk", 0)) + 1
			if _chance(rng, 0.18 + chapter_depth * 0.04):
				resource_delta.runeBone = int(resource_delta.get("runeBone", 0)) + 1
		"gather":
			resource_delta = {
				"ash": 1 + int(rng.randf() * 2.0),
				"ironSand": 1 + int(rng.randf() * 2.0),
			}
			if _chance(rng, 0.35 + chapter_depth * 0.06):
				resource_delta.moonDew = int(resource_delta.get("moonDew", 0)) + 1
			if _chance(rng, 0.20 + chapter_depth * 0.05):
				resource_delta.sunShard = int(resource_delta.get("sunShard", 0)) + 1
			if _chance(rng, 0.44 + chapter_depth * 0.05):
				resource_delta.herbEssence = int(resource_delta.get("herbEssence", 0)) + 1
			if _chance(rng, 0.28 + chapter_depth * 0.04):
				resource_delta.obsidian = int(resource_delta.get("obsidian", 0)) + 1
			if _chance(rng, 0.26 + chapter_depth * 0.05):
				resource_delta.silverLeaf = int(resource_delta.get("silverLeaf", 0)) + 1
			if _chance(rng, 0.22 + chapter_depth * 0.04):
				resource_delta.mistPearl = int(resource_delta.get("mistPearl", 0)) + 1
			mastery_gain = 1
			vigor_delta = -1
		"distill":
			mastery_gain = 2 + int(rng.randf() * 3.0)
			knowledge_gain = 1 + int(rng.randf() * 2.0)
			vigor_delta = -2
			if _chance(rng, 0.55 + chapter_depth * 0.05):
				resource_delta = {"mercury": 1 + int(rng.randf() * 2.0)}
				if _chance(rng, 0.46 + chapter_depth * 0.04):
					resource_delta.sulfur = int(resource_delta.get("sulfur", 0)) + 1
				if _chance(rng, 0.22 + chapter_depth * 0.05):
					resource_delta.quicksilverBloom = int(resource_delta.get("quicksilverBloom", 0)) + 1
				if _chance(rng, 0.20 + chapter_depth * 0.05):
					resource_delta.etherGlass = int(resource_delta.get("etherGlass", 0)) + 1
			else:
				resource_delta = {"ash": 1}
		"lecture":
			reputation_gain = 2 + int(rng.randf() * 2.0)
			knowledge_gain = 1
			vigor_delta = -1
			if _chance(rng, 0.25 + chapter_depth * 0.08):
				resource_delta = {"sunShard": 1}
			if _chance(rng, 0.18 + chapter_depth * 0.05):
				resource_delta.goldDust = int(resource_delta.get("goldDust", 0)) + 1
			if _chance(rng, 0.12 + chapter_depth * 0.04):
				resource_delta.dragonScale = int(resource_delta.get("dragonScale", 0)) + 1
		"meditate":
			mastery_gain = 1 + int(rng.randf() * 2.0)
			knowledge_gain = 1
			vigor_delta = 2
			if _chance(rng, 0.34 + chapter_depth * 0.05):
				resource_delta.nightBloom = int(resource_delta.get("nightBloom", 0)) + 1
			if _chance(rng, 0.18 + chapter_depth * 0.05):
				resource_delta.starlightThread = int(resource_delta.get("starlightThread", 0)) + 1
		"emerald_tablet":
			var threshold := 10 + chapter_depth * 8
			if int(state.knowledge) >= threshold:
				knowledge_gain = 3 + int(rng.randf() * 2.0)
				mastery_gain = 2
				reputation_gain = 1
			else:
				knowledge_gain = 1
				vigor_delta = -1
			if _chance(rng, 0.40):
				resource_delta = {"aetherDust": 1}
			if _chance(rng, 0.22 + chapter_depth * 0.04):
				resource_delta.runeBone = int(resource_delta.get("runeBone", 0)) + 1

	var tentative := state.duplicate(true)
	tentative.knowledge = max(0, int(state.knowledge) + knowledge_gain)
	tentative.mastery = max(0, int(state.mastery) + mastery_gain)
	tentative.reputation = max(0, int(state.reputation) + reputation_gain)
	tentative.vigor = int(clamp_value(float(state.vigor) + float(vigor_delta), 0.0, float(GameData.MAX_VIGOR)))
	tentative.resources = StateHelper.merge_resource_delta(state.resources, resource_delta)
	tentative.actionsLeft = max(0, int(state.actionsLeft) - 1)
	tentative.lastActionSummary = "%s：%s" % [choice.label, choice.flavorText]

	var fragments: Array = []
	if knowledge_gain != 0:
		fragments.append("知识 %+d" % knowledge_gain)
	if mastery_gain != 0:
		fragments.append("熟练 %+d" % mastery_gain)
	if reputation_gain != 0:
		fragments.append("名望 %+d" % reputation_gain)
	if vigor_delta != 0:
		fragments.append("精力 %+d" % vigor_delta)
	var delta_text := "状态稳定" if fragments.is_empty() else " / ".join(fragments)
	var message := "%s（%s）" % [choice.flavorText, delta_text]
	return {"state": tentative, "message": message}

static func _settle_day_turn(state: Dictionary) -> Dictionary:
	if int(state.actionsLeft) > 0:
		return state
	var with_journal := StateHelper.append_journal(state, StateHelper.create_journal_entry(
		int(state.day), "system", "昼夜交替", "工坊钟声敲过午夜，你整理炉台并记录了当日结果。"
	))
	var next := with_journal.duplicate(true)
	next.day = int(with_journal.day) + 1
	next.actionsLeft = GameData.ACTIONS_PER_DAY
	next.vigor = int(clamp_value(float(with_journal.vigor) + 2.0, 0.0, float(GameData.MAX_VIGOR)))
	return next

static func _maybe_discover_formula_by_story(state: Dictionary, choice: Dictionary, rng: RandomNumberGenerator) -> Dictionary:
	for rule in GameData.STORY_DISCOVERY_RULES:
		if state.discoveredFormulas.has(rule.formulaId):
			continue
		var require_known: String = rule.get("requireKnown", "")
		if require_known != "" and not state.discoveredFormulas.has(require_known):
			continue
		if GameData.rank_to_index(state.rank) < GameData.rank_to_index(rule.minRank):
			continue
		if not rule.actions.has(choice.action):
			continue
		if int(state.knowledge) < int(rule.minKnowledge) or int(state.mastery) < int(rule.minMastery):
			continue
		if not _chance(rng, float(rule.chance)):
			continue

		var discovered: Array = state.discoveredFormulas.duplicate()
		discovered.append(rule.formulaId)
		var next := state.duplicate(true)
		next.discoveredFormulas = discovered
		next = StateHelper.append_journal(next, StateHelper.create_journal_entry(
			int(state.day), "system", "定式线索：%s" % rule.formulaName, rule.lore
		))
		return {"state": next, "message": "你通过剧情推演破译了「%s」的线索。" % rule.formulaName}
	return {"state": state}

static func apply_chapter_choice(state: Dictionary, choice_id: String, rng: RandomNumberGenerator) -> Dictionary:
	if state.ended:
		return {"state": state, "message": "贤者之石已成，工坊归于寂静。"}

	var chapter := GameData.get_current_chapter(state)
	var choice := {}
	for item in chapter.choices:
		if item.id == choice_id:
			choice = item
			break
	if choice.is_empty():
		var fallback: Dictionary = chapter.choices[rng.randi() % chapter.choices.size()]
		return apply_chapter_choice(state, fallback.id, rng)

	var effect := _apply_story_action_effect(state, choice, rng)
	var next := StateHelper.append_journal(effect.state, StateHelper.create_journal_entry(
		int(effect.state.day), "story", chapter.title, effect.message
	))

	var discovery := _maybe_discover_formula_by_story(next, choice, rng)
	next = discovery.state

	var progression := evaluate_rank_progression(next)
	next = progression.state
	var extra_messages: Array = []
	if discovery.has("message") and discovery.message != null:
		extra_messages.append(discovery.message)
	extra_messages.append_array(progression.messages)
	var final_message: String = effect.message
	if not extra_messages.is_empty():
		final_message = "%s %s" % [effect.message, " ".join(extra_messages)]

	next = next.duplicate(true)
	next.lastActionSummary = final_message
	next = _settle_day_turn(next)
	return {"state": next, "message": final_message}
