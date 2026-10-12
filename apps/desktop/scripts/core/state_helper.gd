extends RefCounted
class_name StateHelper
## GameState 的创建与基础操作（日志、效果、资源合并）。
## 状态以 Dictionary 表示，字段含义见各调用处。

static func create_entry_id(prefix: String) -> String:
	return "%s_%d_%d" % [prefix, Time.get_unix_time_from_system(), randi() % 1000000]

static func create_empty_resources() -> Dictionary:
	var resources := {}
	for key in GameData.RESOURCE_KEYS:
		resources[key] = 0
	return resources

static func merge_resource_delta(resources: Dictionary, delta: Dictionary) -> Dictionary:
	var next := resources.duplicate(true)
	for key in GameData.RESOURCE_KEYS:
		if delta.has(key) and delta[key] != null:
			next[key] = max(0, int(resources.get(key, 0)) + int(delta[key]))
	return next

static func has_enough_resources(resources: Dictionary, cost: Dictionary) -> bool:
	for key in GameData.RESOURCE_KEYS:
		if int(resources.get(key, 0)) < int(cost.get(key, 0)):
			return false
	return true

static func consume_resources(resources: Dictionary, cost: Dictionary) -> Dictionary:
	var delta := {}
	for key in GameData.RESOURCE_KEYS:
		var amount := int(cost.get(key, 0))
		if amount > 0:
			delta[key] = -amount
	return merge_resource_delta(resources, delta)

static func create_journal_entry(day: int, type: String, title: String, body: String, source: String = "") -> Dictionary:
	var entry := {
		"id": create_entry_id(type),
		"day": day,
		"type": type,
		"title": title,
		"body": body,
		"createdAt": Time.get_datetime_string_from_system(true),
	}
	if source != "":
		entry.source = source
	return entry

static func append_journal(state: Dictionary, entry: Dictionary) -> Dictionary:
	var journal: Array = state.journal.duplicate()
	journal.push_front(entry)
	journal = journal.slice(0, GameData.JOURNAL_LIMIT)
	var next := state.duplicate(true)
	next.journal = journal
	return next

static func create_initial_state(rng_seed: int = 0) -> Dictionary:
	var seed_value := rng_seed
	if seed_value == 0:
		seed_value = int(Time.get_unix_time_from_system()) ^ OS.get_process_id()
	var seeded := {
		"ash": 4, "ironSand": 4, "salt": 2, "copperFilings": 2, "sulfur": 1,
		"herbEssence": 2, "mercury": 1, "moonDew": 2, "obsidian": 1,
		"crystalShard": 1, "lotusResin": 1,
	}
	return {
		"version": 1,
		"day": 1,
		"actionsLeft": GameData.ACTIONS_PER_DAY,
		"rank": "学徒",
		"knowledge": 4,
		"mastery": 3,
		"reputation": 0,
		"vigor": 8,
		"resources": merge_resource_delta(create_empty_resources(), seeded),
		"unlockedRecipes": GameData.get_recipes_unlocked_by_rank("学徒"),
		"completedRecipes": [],
		"discoveredFormulas": ["triad_prime"],
		"activeEffects": [],
		"journal": [
			create_journal_entry(1, "system", "工坊启程", "你接过师傅留下的铜钥匙，第一炉火在地窖中被点亮。"),
		],
		"ended": false,
		"ending": "none",
		"lastActionSummary": "你在黑土与火之间立下誓言，成为学徒。",
		"rngSeed": seed_value,
	}

## ---------- 临时效果 ----------

static func with_rank_unlocked_recipes(state: Dictionary, rank: String) -> Dictionary:
	var merged := {}
	for id in state.unlockedRecipes:
		merged[id] = true
	for id in GameData.get_recipes_unlocked_by_rank(rank):
		merged[id] = true
	var next := state.duplicate(true)
	next.unlockedRecipes = merged.keys()
	return next

static func add_or_refresh_effect(state: Dictionary, effect: Dictionary) -> Dictionary:
	var effects: Array = state.activeEffects.duplicate()
	var existing_index := -1
	for i in range(effects.size()):
		var item: Dictionary = effects[i]
		if item.kind == effect.kind and item.label == effect.label:
			existing_index = i
			break

	if existing_index < 0:
		var with_id := effect.duplicate()
		with_id.id = create_entry_id("effect")
		effects.append(with_id)
	else:
		var current: Dictionary = effects[existing_index]
		current = current.duplicate()
		current.value = max(int(current.value), int(effect.value))
		current.remainingTransmutations = max(int(current.remainingTransmutations), int(effect.remainingTransmutations))
		current.description = effect.description
		effects[existing_index] = current

	var next := state.duplicate(true)
	next.activeEffects = effects
	return next

static func consume_transmutation_effects(state: Dictionary) -> Dictionary:
	if state.activeEffects.is_empty():
		return state

	var expired: Array = []
	var remained: Array = []
	for effect in state.activeEffects:
		var updated: Dictionary = effect.duplicate()
		updated.remainingTransmutations = int(updated.remainingTransmutations) - 1
		if int(updated.remainingTransmutations) > 0:
			remained.append(updated)
		else:
			expired.append(updated)

	var next := state.duplicate(true)
	next.activeEffects = remained
	if expired.is_empty():
		return next

	var note := "、".join(expired.map(func(item): return "「%s」" % item.label))
	return append_journal(next, create_journal_entry(
		int(state.day), "system", "临时效果消散", "%s 的影响已经消退。" % note
	))
