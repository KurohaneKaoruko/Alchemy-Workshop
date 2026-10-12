extends RefCounted
class_name AlchemyCircle
## 魔法阵炼成：等价交换与定式显化。

const STRICT_FORMULA_OUTPUTS: Array = ["philosopherSeed", "philosopherStone"]

static func get_random_exchange_outputs() -> Array:
	var outputs: Array = []
	for resource in GameData.EQUIVALENT_OUTPUT_OPTIONS:
		if not STRICT_FORMULA_OUTPUTS.has(resource):
			outputs.append(resource)
	return outputs

static func _get_offer_value(offer: Dictionary) -> int:
	var total := 0
	for key in GameData.RESOURCE_KEYS:
		total += int(offer.get(key, 0)) * int(GameData.RESOURCE_VALUES[key])
	return total

static func normalize_offer(offer: Dictionary) -> Dictionary:
	var normalized := {}
	for key in GameData.RESOURCE_KEYS:
		var amount: int = max(0, int(offer.get(key, 0)))
		if amount > 0:
			normalized[key] = amount
	return normalized

static func _is_exact_ingredient_match(source: Dictionary, target: Dictionary) -> bool:
	for key in GameData.RESOURCE_KEYS:
		if int(source.get(key, 0)) != int(target.get(key, 0)):
			return false
	return true

static func _has_rank_for_formula(current_rank: String, formula_rank: String) -> bool:
	return GameData.rank_to_index(current_rank) >= GameData.rank_to_index(formula_rank)

static func get_effect_totals(state: Dictionary) -> Dictionary:
	var totals := {"toleranceBonus": 0, "tolerancePenalty": 0, "yieldBonus": 0}
	for effect in state.activeEffects:
		match effect.kind:
			"tolerance_bonus":
				totals.toleranceBonus += int(effect.value)
			"tolerance_penalty":
				totals.tolerancePenalty += int(effect.value)
			"yield_bonus":
				totals.yieldBonus += int(effect.value)
	return totals

static func format_effect_hint(state: Dictionary) -> String:
	if state.activeEffects.is_empty():
		return ""
	var notes: Array = []
	for effect in state.activeEffects:
		notes.append("%s(%d)" % [effect.label, int(effect.remainingTransmutations)])
	return " 当前效果：%s。" % " / ".join(notes)

static func _pick_weighted_item(items: Array, weights: Array, rng: RandomNumberGenerator):
	var total_weight := 0.0
	for weight in weights:
		total_weight += float(weight)
	var normalized_total := total_weight if total_weight > 0.0 else float(items.size())
	var threshold := rng.randf() * normalized_total
	for i in range(items.size()):
		threshold -= float(weights[i]) if float(weights[i]) > 0.0 else 1.0
		if threshold <= 0.0:
			return items[i]
	return items[items.size() - 1]

static func build_random_equivalent_output(total_value: int, effect_totals: Dictionary, rng: RandomNumberGenerator):
	if total_value <= 0:
		return null
	var pool := get_random_exchange_outputs()
	var sorted_pool: Array = pool.duplicate()
	sorted_pool.sort_custom(func(a, b): return GameData.RESOURCE_VALUES[a] > GameData.RESOURCE_VALUES[b])

	var output := {}
	var remaining := total_value
	var guard := 0
	while remaining > 0 and guard < 512:
		guard += 1
		var candidates: Array = []
		for resource in sorted_pool:
			if int(GameData.RESOURCE_VALUES[resource]) <= remaining:
				candidates.append(resource)
		if candidates.is_empty():
			return null

		var max_value := int(GameData.RESOURCE_VALUES[candidates[0]])
		var min_value := int(GameData.RESOURCE_VALUES[candidates[candidates.size() - 1]])
		var range_span: int = max(1, max_value - min_value)
		var weights: Array = []
		for resource in candidates:
			var value := int(GameData.RESOURCE_VALUES[resource])
			var high_tier_ratio := float(value - min_value) / float(range_span)
			var low_tier_ratio := 1.0 - high_tier_ratio
			var weight := 1.0 				+ float(effect_totals.toleranceBonus) * high_tier_ratio 				+ float(int(effect_totals.tolerancePenalty) + int(effect_totals.yieldBonus)) * low_tier_ratio
			weights.append(max(0.1, weight))

		var picked = _pick_weighted_item(candidates, weights, rng)
		output[picked] = int(output.get(picked, 0)) + 1
		remaining -= int(GameData.RESOURCE_VALUES[picked])

	if remaining == 0:
		return output
	return null

static func _find_formula_match(state: Dictionary, offer: Dictionary) -> Dictionary:
	for formula in GameData.ARCANE_FORMULAS:
		if _has_rank_for_formula(state.rank, formula.minRank) 				and _is_exact_ingredient_match(offer, formula.ingredients):
			return formula
	return {}

static func _find_resonance_formula(state: Dictionary, offer: Dictionary) -> Dictionary:
	var offer_keys: Array = []
	for key in offer.keys():
		if int(offer[key]) > 0:
			offer_keys.append(key)

	for formula in GameData.ARCANE_FORMULAS:
		if state.discoveredFormulas.has(formula.id):
			continue
		if not _has_rank_for_formula(state.rank, formula.minRank):
			continue

		var formula_keys: Array = []
		for key in formula.ingredients.keys():
			if int(formula.ingredients[key]) > 0:
				formula_keys.append(key)
		if formula_keys.is_empty():
			continue

		var has_foreign := false
		for key in offer_keys:
			if not formula_keys.has(key):
				has_foreign = true
				break
		if has_foreign:
			continue

		var overlap_count := 0
		for key in formula_keys:
			if int(offer.get(key, 0)) > 0:
				overlap_count += 1
		if overlap_count >= max(2, formula_keys.size() - 1):
			return formula
	return {}

static func _mark_formula_discovered(state: Dictionary, formula: Dictionary) -> Dictionary:
	if state.discoveredFormulas.has(formula.id):
		return state
	var discovered: Array = state.discoveredFormulas.duplicate()
	discovered.append(formula.id)
	var next := state.duplicate(true)
	next.discoveredFormulas = discovered
	return StateHelper.append_journal(next, StateHelper.create_journal_entry(
		int(state.day), "system", "定式破译：%s" % formula.name,
		"你在阵纹中捕捉到稳定谐振，成功破译了「%s」。" % formula.name
	))

static func _settle_action_turn(state: Dictionary) -> Dictionary:
	if int(state.actionsLeft) > 0:
		return state
	var with_entry := StateHelper.append_journal(state, StateHelper.create_journal_entry(
		int(state.day), "system", "炉环休止", "你擦净魔法阵铜纹，等待下一轮日升。"
	))
	var next := with_entry.duplicate(true)
	next.day = int(with_entry.day) + 1
	next.actionsLeft = GameData.ACTIONS_PER_DAY
	next.vigor = int(min(float(GameData.MAX_VIGOR), float(with_entry.vigor) + 2.0))
	return next

static func _apply_common_success_effects(state: Dictionary, offered_value: int, message: String) -> Dictionary:
	var mastery_gain: int = max(1, int(float(offered_value) / 8.0))
	var knowledge_gain: int = max(1, int(float(offered_value) / 10.0))
	var reputation_gain := 1 if GameData.rank_to_index(state.rank) >= 2 else 0

	var next := state.duplicate(true)
	next.mastery = int(state.mastery) + mastery_gain
	next.knowledge = int(state.knowledge) + knowledge_gain
	next.reputation = int(state.reputation) + reputation_gain
	next.vigor = int(max(0, int(state.vigor) - 1))
	next.lastActionSummary = message
	return StateHelper.append_journal(next, StateHelper.create_journal_entry(
		int(state.day), "craft", "魔法阵炼成", message
	))

static func get_next_formula_guidance(state: Dictionary):
	var target: Dictionary = {}
	for formula in GameData.ARCANE_FORMULAS:
		if not state.discoveredFormulas.has(formula.id):
			target = formula
			break
	if target.is_empty():
		return null

	var base := {
		"formulaId": target.id,
		"formulaName": target.name,
		"outputLabel": GameData.RESOURCE_LABELS[target.output.resource],
	}
	var rule := GameData.get_story_discovery_rule(target.id)

	if GameData.rank_to_index(state.rank) < GameData.rank_to_index(target.minRank):
		var recommendations: Array = [
			"先提升到「%s」后才能稳定破译此定式。" % target.minRank,
			"优先在剧情页执行探索行动，提升知识、熟练与名望。",
		]
		return base.merged({
			"status": "locked_rank",
			"recommendations": recommendations,
		})

	var require_known: String = rule.get("requireKnown", "")
	if require_known != "" and not state.discoveredFormulas.has(require_known):
		var pre_formula := GameData.get_formula_by_id(require_known)
		var pre_name: String = pre_formula.get("name", require_known)
		var recommendations: Array = [
			"先破译前置定式「%s」。" % pre_name,
			"剧情里优先选择“解读翠玉录”与“午夜冥想”。",
		]
		return base.merged({
			"status": "missing_prerequisite",
			"recommendations": recommendations,
		})

	if not rule.is_empty() and (int(state.knowledge) < int(rule.minKnowledge) or int(state.mastery) < int(rule.minMastery)):
		var action_labels: Array = []
		for action in rule.actions:
			action_labels.append(GameData.STORY_ACTION_LABELS[action])
		var recommendations: Array = [
			"目标属性：知识 ≥ %d，熟练 ≥ %d。" % [int(rule.minKnowledge), int(rule.minMastery)],
			"建议动作：%s。" % " / ".join(action_labels),
		]
		return base.merged({
			"status": "missing_stats",
			"recommendations": recommendations,
		})

	var materials: Array = []
	for key in target.ingredients.keys():
		materials.append("%sx%d" % [GameData.RESOURCE_LABELS[key], int(target.ingredients[key])])
	var action_labels: Array = []
	if not rule.is_empty():
		for action in rule.actions:
			action_labels.append(GameData.STORY_ACTION_LABELS[action])
	var recommendations: Array = []
	if not rule.is_empty():
		recommendations.append("剧情页优先执行：%s。" % " / ".join(action_labels))
	else:
		recommendations.append("继续推进剧情并尝试高价值炼成。")
	recommendations.append("炼金阵目标组合：%s。" % " + ".join(materials))
	return base.merged({
		"status": "ready_to_research",
		"recommendations": recommendations,
	})

static func transmute_by_circle(state: Dictionary, offer: Dictionary, rng: RandomNumberGenerator) -> Dictionary:
	var failure_base := {
		"state": state, "success": false, "consumedValue": 0, "producedValue": 0,
	}
	if state.ended:
		return failure_base.merged({"message": "贤者之石已成，炼金仪式已走到尽头。"})
	if int(state.actionsLeft) <= 0:
		return failure_base.merged({"message": "今日行动次数已耗尽。"})

	var effect_totals := get_effect_totals(state)
	var effect_hint := format_effect_hint(state)
	var offered := normalize_offer(offer)
	var offered_value := _get_offer_value(offered)
	if offered_value <= 0:
		return failure_base.merged({"message": "请先向魔法阵投入至少一种材料。%s" % effect_hint})
	if not StateHelper.has_enough_resources(state.resources, offered):
		return failure_base.merged({
			"message": "库存材料不足，无法刻印当前阵式。%s" % effect_hint,
			"consumedValue": offered_value,
		})

	# ---- 定式命中：必定产出 ----
	var formula := _find_formula_match(state, offered)
	if not formula.is_empty():
		var next := state.duplicate(true)
		next.actionsLeft = max(0, int(state.actionsLeft) - 1)
		next.resources = StateHelper.merge_resource_delta(
			StateHelper.consume_resources(state.resources, offered),
			{formula.output.resource: int(formula.output.amount)}
		)
		if not next.completedRecipes.has(formula.id):
			var completed: Array = next.completedRecipes.duplicate()
			completed.append(formula.id)
			next.completedRecipes = completed

		next = _mark_formula_discovered(next, formula)
		next = _apply_common_success_effects(next, offered_value, "%s触发：%s" % [formula.name, formula.lore])
		next = StateHelper.with_rank_unlocked_recipes(next, next.rank)

		if formula.id == "philosopher_stone":
			next = next.duplicate(true)
			next.rank = "至高炼金术师"
			next.ended = true
			next.ending = "philosopher_stone"
		else:
			next = Progression.evaluate_rank_progression(next).state

		next = StateHelper.consume_transmutation_effects(next)
		next = _settle_action_turn(next)

		return {
			"state": next,
			"success": true,
			"message": "%s已完成。满足定式时，结果必定为 %d 份「%s」。%s" % [
				formula.name, int(formula.output.amount), GameData.RESOURCE_LABELS[formula.output.resource], effect_hint,
			],
			"formulaMatched": formula,
			"consumedValue": offered_value,
			"producedValue": int(formula.output.amount) * int(GameData.RESOURCE_VALUES[formula.output.resource]),
			"producedResources": {formula.output.resource: int(formula.output.amount)},
		}

	# ---- 谐振破译 ----
	var resonance_formula := _find_resonance_formula(state, offered)
	var discovered_state := state
	var resonance_hint := ""
	if not resonance_formula.is_empty():
		discovered_state = _mark_formula_discovered(state, resonance_formula)
		resonance_hint = " 你在余波中破译了「%s」的部分阵式。" % resonance_formula.name

	# ---- 等价交换 ----
	var random_output = build_random_equivalent_output(offered_value, effect_totals, rng)
	if random_output == null:
		return {
			"state": discovered_state,
			"success": false,
			"message": "阵式失衡，未能完成可结算的等价交换。%s%s" % [resonance_hint, effect_hint],
			"consumedValue": offered_value,
			"producedValue": 0,
		}

	var produced_value := _get_offer_value(random_output)
	var output_summary := GameData.format_resource_bundle(random_output)
	var tendency_notes: Array = []
	if int(effect_totals.toleranceBonus) > 0:
		tendency_notes.append("高阶产物权重提升")
	if int(effect_totals.tolerancePenalty) > 0:
		tendency_notes.append("低阶杂质权重提升")
	if int(effect_totals.yieldBonus) > 0:
		tendency_notes.append("细粒产物权重提升")
	var tendency_hint := ""
	if not tendency_notes.is_empty():
		tendency_hint = " 当前倾向：%s。" % "，".join(tendency_notes)

	var next := discovered_state.duplicate(true)
	next.actionsLeft = max(0, int(discovered_state.actionsLeft) - 1)
	next.resources = StateHelper.merge_resource_delta(
		StateHelper.consume_resources(discovered_state.resources, offered),
		random_output
	)

	next = _apply_common_success_effects(next, offered_value,
		"魔法阵完成等价交换：投入价值 %d，随机产出 %s（总价值 %d）。" % [offered_value, output_summary, produced_value])
	next = Progression.evaluate_rank_progression(next).state
	next = StateHelper.consume_transmutation_effects(next)
	next = _settle_action_turn(next)

	return {
		"state": next,
		"success": true,
		"message": "交换成立：投入价值 %d，随机产出 %s（总价值 %d）。%s%s%s" % [
			offered_value, output_summary, produced_value, tendency_hint, resonance_hint, effect_hint,
		],
		"formulaMatched": null,
		"consumedValue": offered_value,
		"producedValue": produced_value,
		"producedResources": random_output,
	}
