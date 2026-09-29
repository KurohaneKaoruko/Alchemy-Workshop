extends RefCounted
class_name Crafting
## 经典炼成台配方。

static func can_craft(state: Dictionary, recipe_id: String) -> Dictionary:
	var recipe := GameData.get_recipe_by_id(recipe_id)
	if recipe.is_empty():
		return {"ok": false, "reason": "未知配方。"}
	if not state.unlockedRecipes.has(recipe.id):
		return {"ok": false, "reason": "尚未解锁该配方。"}
	if int(state.knowledge) < int(recipe.requiredKnowledge):
		return {"ok": false, "reason": "知识不足（需 %d）。" % int(recipe.requiredKnowledge)}
	if int(state.mastery) < int(recipe.requiredMastery):
		return {"ok": false, "reason": "熟练度不足（需 %d）。" % int(recipe.requiredMastery)}
	if not StateHelper.has_enough_resources(state.resources, recipe.ingredients):
		return {"ok": false, "reason": "材料不足。"}
	if int(state.actionsLeft) <= 0:
		return {"ok": false, "reason": "今日行动次数已耗尽。"}
	return {"ok": true}

static func _settle_action_turn(state: Dictionary) -> Dictionary:
	if int(state.actionsLeft) > 0:
		return state
	var with_entry := StateHelper.append_journal(state, StateHelper.create_journal_entry(
		int(state.day), "system", "炉火休止", "你在黎明前收起器具，为新一天保留炉温。"
	))
	var next := with_entry.duplicate(true)
	next.day = int(with_entry.day) + 1
	next.actionsLeft = GameData.ACTIONS_PER_DAY
	next.vigor = int(min(float(GameData.MAX_VIGOR), float(with_entry.vigor) + 2.0))
	return next

static func craft_recipe(state: Dictionary, recipe_id: String, rng: RandomNumberGenerator) -> Dictionary:
	var check := can_craft(state, recipe_id)
	if not check.ok:
		return {
			"state": state, "success": false, "critical": false,
			"recipeId": recipe_id, "message": check.get("reason", "无法炼成。"),
		}

	var recipe := GameData.get_recipe_by_id(recipe_id)
	var next := state.duplicate(true)
	next.actionsLeft = max(0, int(state.actionsLeft) - 1)
	next.resources = StateHelper.consume_resources(state.resources, recipe.ingredients)

	var rank_depth := GameData.rank_to_index(state.rank)
	var success_rate: float = clamp(
		0.42 + float(state.mastery) * 0.005 + float(state.knowledge) * 0.0025
			- float(recipe.difficulty) * 0.06 - float(rank_depth) * 0.01,
		0.1, 0.92
	)
	var roll := rng.randf()
	var success := roll < success_rate
	var critical := success and rng.randf() < 0.15
	var message := ""

	if success:
		var output_delta := {}
		for key in recipe.outputs.keys():
			var amount := int(recipe.outputs[key])
			if critical:
				amount += 1
			output_delta[key] = amount

		next.resources = StateHelper.merge_resource_delta(next.resources, output_delta)
		next.mastery = int(next.mastery) + 2 + int(recipe.difficulty)
		next.knowledge = int(next.knowledge) + 1 + int(ceil(float(recipe.difficulty) / 2.0))
		next.reputation = int(next.reputation) + int(recipe.difficulty / 3)
		next.vigor = int(max(0, int(next.vigor) - 1))
		if not next.completedRecipes.has(recipe.id):
			var completed: Array = next.completedRecipes.duplicate()
			completed.append(recipe.id)
			next.completedRecipes = completed
		next.lastActionSummary = "%s炼成成功" % recipe.name

		if critical:
			message = "%s 你在关键时刻完成了临界调相，产出额外提升。" % recipe.successLog
		else:
			message = recipe.successLog

		if recipe.id == "philosopher_stone":
			next.rank = "至高炼金术师"
			next.ended = true
			next.ending = "philosopher_stone"
			next = StateHelper.with_rank_unlocked_recipes(next, "至高炼金术师")
			message = "赤红晶核彻底稳定，你炼出了贤者之石，成为至高炼金术师。"
	else:
		next.mastery = max(0, int(next.mastery) + 1)
		next.knowledge = max(0, int(next.knowledge) + 1)
		next.vigor = int(max(0, int(next.vigor) - 2))
		next.lastActionSummary = "%s炼成失败" % recipe.name
		if rng.randf() > 0.7:
			next.resources = StateHelper.merge_resource_delta(next.resources, {"ash": 1})
		message = "配方未能稳定，坩埚中只留下焦黑残渣。你记录下了失败参数。"

	next = StateHelper.append_journal(next, StateHelper.create_journal_entry(
		int(next.day), "craft", recipe.name, message
	))

	if not next.ended:
		next = Progression.evaluate_rank_progression(next).state
	next = _settle_action_turn(next)

	return {
		"state": next, "success": success, "critical": critical,
		"recipeId": recipe.id, "message": message,
	}
