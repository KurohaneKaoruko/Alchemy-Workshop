extends Node
## Headless 冒烟测试：核心逻辑闭环 + 全流程模拟至贤者之石。
## 运行：godot --headless res://tools/smoke_test.tscn

var _failures: Array = []
var _checks := 0

func _ready() -> void:
	_run_tests()
	if _failures.is_empty():
		print("SMOKE-TEST PASS (%d checks)" % _checks)
		get_tree().quit(0)
	else:
		print("SMOKE-TEST FAIL: %d/%d checks failed" % [_failures.size(), _checks])
		for failure in _failures:
			print("  FAIL: " + failure)
		get_tree().quit(1)

func _check(condition: bool, label: String) -> void:
	_checks += 1
	if not condition:
		_failures.append(label)

func _rng(seed_value: int) -> RandomNumberGenerator:
	var generator := RandomNumberGenerator.new()
	generator.seed = seed_value
	return generator

func _run_tests() -> void:
	_test_initial_state()
	_test_story_choice()
	_test_circle_formula()
	_test_circle_exchange()
	_test_circle_guards()
	_test_crafting()
	_test_events()
	_test_rank_progression()
	_test_plan_and_guide()
	_test_save_roundtrip()
	_test_full_simulation()

# ---------------- 单元测试 ----------------

func _test_initial_state() -> void:
	var state := StateHelper.create_initial_state(42)
	_check(int(state.day) == 1, "initial day")
	_check(int(state.actionsLeft) == 3, "initial actions")
	_check(String(state.rank) == "学徒", "initial rank")
	_check(int(state.knowledge) == 4, "initial knowledge")
	_check(int(state.mastery) == 3, "initial mastery")
	_check(int(state.vigor) == 8, "initial vigor")
	_check(int(state.resources.ash) == 4, "initial ash")
	_check(int(state.resources.moonDew) == 2, "initial moon dew")
	_check(state.discoveredFormulas.has("triad_prime"), "initial formula")
	_check(state.journal.size() == 1, "initial journal")
	_check(state.unlockedRecipes.has("prima_salts"), "initial recipe unlocked")
	_check(not state.unlockedRecipes.has("mercury_distill"), "locked recipe hidden")

func _test_story_choice() -> void:
	var state := StateHelper.create_initial_state(7)
	var rng := _rng(7)
	var result := Progression.apply_chapter_choice(state, "apprentice-gather", rng)
	_check(int(result.state.actionsLeft) == 2, "story consumes action")
	_check(String(result.message) != "", "story message present")
	_check(int(result.state.resources.ash) >= int(state.resources.ash), "gather ash gain")
	_check(result.state.journal.size() > state.journal.size(), "story journal appended")
	var fallback := Progression.apply_chapter_choice(state, "nonexistent", rng)
	_check(String(fallback.message) != "", "unknown choice falls back")

func _test_circle_formula() -> void:
	var state := StateHelper.create_initial_state(11)
	var rng := _rng(11)
	var offer := {"ash": 2, "ironSand": 2, "moonDew": 1}
	var result: Dictionary = AlchemyCircle.transmute_by_circle(state, offer, rng)
	_check(bool(result.success), "triad_prime formula success")
	_check(int(result.state.resources.salt) == int(state.resources.salt) + 3, "formula salt output")
	_check(int(result.state.resources.ash) == int(state.resources.ash) - 2, "formula consumed ash")
	var matched: Dictionary = result.get("formulaMatched", {})
	_check(String(matched.get("id", "")) == "triad_prime", "formula matched id")

func _test_circle_exchange() -> void:
	var state := StateHelper.create_initial_state(13)
	state.resources.salt = 10
	var rng := _rng(13)
	var offer := {"salt": 3}
	var result: Dictionary = AlchemyCircle.transmute_by_circle(state, offer, rng)
	_check(bool(result.success), "equal exchange success")
	_check(int(result.consumedValue) == 6, "consumed value 6")
	_check(int(result.producedValue) == int(result.consumedValue), "value conserved")
	var produced: Dictionary = result.producedResources
	var produced_count := 0
	for key in produced.keys():
		produced_count += int(produced[key])
	_check(produced_count >= 1, "produced resources present")
	_check(not produced.has("philosopherStone"), "no stone from exchange")
	_check(not produced.has("philosopherSeed"), "no seed from exchange")

func _test_circle_guards() -> void:
	var state := StateHelper.create_initial_state(17)
	var rng := _rng(17)
	var empty: Dictionary = AlchemyCircle.transmute_by_circle(state, {}, rng)
	_check(not bool(empty.success), "empty offer rejected")
	var insufficient: Dictionary = AlchemyCircle.transmute_by_circle(state, {"goldDust": 3}, rng)
	_check(not bool(insufficient.success), "insufficient offer rejected")

func _test_crafting() -> void:
	var state := StateHelper.create_initial_state(19)
	var rng := _rng(19)
	var check := Crafting.can_craft(state, "prima_salts")
	_check(bool(check.ok), "prima_salts craftable")
	for _i in range(20):
		if int(state.actionsLeft) <= 1:
			break
		var result: Dictionary = Crafting.craft_recipe(state, "prima_salts", rng)
		state = result.state
	var craft_logged := false
	for entry in state.journal:
		if String(entry.title) == "盐之初析":
			craft_logged = true
			break
	_check(craft_logged, "craft journal logged")

func _test_events() -> void:
	var state := StateHelper.create_initial_state(23)
	var rng := _rng(23)
	var event := EventEngine.fallback_narrative(rng)
	_check(String(event.title) != "", "fallback event title")
	_check(String(event.source) == "fallback", "fallback event source")
	var outcome := EventEngine.resolve_event_outcome(state, event, rng)
	_check(outcome.has("delta"), "outcome has delta")
	var next_state := EventEngine.apply_event_outcome(state, event, outcome)
	_check(next_state.get("lastEvent") is Dictionary, "last event stored")
	_check(next_state.journal.size() > state.journal.size(), "event journal appended")
	_check(int(next_state.knowledge) >= int(state.knowledge), "event knowledge not lost")

func _test_rank_progression() -> void:
	var state := StateHelper.create_initial_state(29)
	state.knowledge = 10
	state.mastery = 12
	state.reputation = 2
	_check(Progression.can_rank_up(state, "炼金士"), "rank up to 炼金士 ready")
	state.reputation = 1
	_check(not Progression.can_rank_up(state, "炼金士"), "rank up blocked by reputation")
	state.reputation = 2
	var result := Progression.evaluate_rank_progression(state)
	_check(String(result.state.rank) == "炼金士", "rank ascended to 炼金士")
	_check(result.messages.size() == 1, "ascension message")
	var candidate: Dictionary = result.state.duplicate(true)
	candidate.knowledge = 60
	candidate.mastery = 60
	candidate.reputation = 30
	var stalled := Progression.evaluate_rank_progression(candidate)
	_check(String(stalled.state.rank) == "大炼金士", "candidate blocked without great_conjunction")
	stalled.state.completedRecipes.append("great_conjunction")
	var passed := Progression.evaluate_rank_progression(stalled.state)
	_check(String(passed.state.rank) == "贤者候补", "candidate ascends with formula done")

func _test_plan_and_guide() -> void:
	var state := StateHelper.create_initial_state(31)
	var plan := GrandWorkPlan.build_grand_work_plan(state)
	_check(String(plan.phase.eyebrow) != "", "plan phase eyebrow")
	_check(plan.rankGoal != null, "plan rank goal")
	var guide = FirstDayGuide.build_first_day_guide(state)
	_check(guide != null, "first day guide present")
	_check(String(guide.mode) == "full", "guide mode full on day 1")
	var overview := WorkshopOverview.build_workshop_overview(state)
	_check(overview.totalResourceKinds > 0, "overview resource kinds")
	_check(not overview.recentEntries.is_empty(), "overview recent entries")

func _test_save_roundtrip() -> void:
	var state := StateHelper.create_initial_state(37)
	state.knowledge = 33
	Store.save_game_state(state)
	var loaded = Store.load_game_state()
	_check(loaded != null, "save loads")
	if loaded != null:
		_check(int(loaded.knowledge) == 33, "save knowledge preserved")
		_check(int(loaded.resources.ash) == 4, "save resources preserved")
	Store.clear_game_state()
	_check(Store.load_game_state() == null, "save cleared")
	var settings := {"enabled": true, "baseUrl": "https://api.example.com/v1", "model": "test-model", "apiKey": "sk-secret-123"}
	Store.save_ai_settings(settings)
	var loaded_settings := Store.load_ai_settings()
	_check(bool(loaded_settings.enabled), "ai settings enabled roundtrip")
	_check(String(loaded_settings.model) == "test-model", "ai model roundtrip")
	_check(String(loaded_settings.apiKey) == "sk-secret-123", "ai key obfuscation roundtrip")
	Store.save_ai_settings(Store.AI_DEFAULTS.duplicate())

# ---------------- 全流程模拟 ----------------

func _pick_choice_for_discovery(state: Dictionary, chapter: Dictionary) -> String:
	for rule in GameData.STORY_DISCOVERY_RULES:
		if state.discoveredFormulas.has(rule.formulaId):
			continue
		var require_known: String = rule.get("requireKnown", "")
		if require_known != "" and not state.discoveredFormulas.has(require_known):
			continue
		if GameData.rank_to_index(String(state.rank)) < GameData.rank_to_index(String(rule.minRank)):
			continue
		for choice in chapter.choices:
			if rule.actions.has(choice.action):
				return String(choice.id)
	return ""

func _discovered_formulas_desc(state: Dictionary) -> Array:
	var result: Array = []
	for i in range(GameData.ARCANE_FORMULAS.size() - 1, -1, -1):
		var formula: Dictionary = GameData.ARCANE_FORMULAS[i]
		if not state.discoveredFormulas.has(formula.id):
			continue
		if GameData.rank_to_index(String(state.rank)) < GameData.rank_to_index(String(formula.minRank)):
			continue
		result.append(formula)
	return result

func _feeds_target(candidate: Dictionary, target: Dictionary, state: Dictionary) -> bool:
	# candidate 的产物是 target 需要且仍缺的材料时才允许低阶定式消耗资源。
	var output_key: String = candidate.output.resource
	var needed: int = int(target.ingredients.get(output_key, 0))
	if needed <= 0:
		return false
	return int(state.resources.get(output_key, 0)) < needed

func _try_transmute(state: Dictionary, rng: RandomNumberGenerator) -> Dictionary:
	# 1) 谐振探测最前沿的未破译定式：解锁进度优先。
	for formula in GameData.ARCANE_FORMULAS:
		if state.discoveredFormulas.has(formula.id):
			continue
		if GameData.rank_to_index(String(state.rank)) < GameData.rank_to_index(String(formula.minRank)):
			break
		var probe := {}
		for key in formula.ingredients.keys():
			var affordable: int = min(int(formula.ingredients[key]), int(state.resources.get(key, 0)))
			if affordable > 0:
				probe[key] = affordable
		if not probe.is_empty() and probe.size() >= max(2, formula.ingredients.size() - 1):
			var resonated: Dictionary = AlchemyCircle.transmute_by_circle(state, probe, rng)
			return resonated
		break

	# 2) 目标定式（已破译中最高的一条）：可炼则炼。
	var discovered := _discovered_formulas_desc(state)
	if not discovered.is_empty():
		var target: Dictionary = discovered[0]
		if StateHelper.has_enough_resources(state.resources, target.ingredients):
			var exact: Dictionary = AlchemyCircle.transmute_by_circle(state, target.ingredients, rng)
			return exact
		# 目标不可炼时，只允许“为目标供料”的较低定式运行。
		for i in range(1, discovered.size()):
			var feeder: Dictionary = discovered[i]
			if _feeds_target(feeder, target, state) and StateHelper.has_enough_resources(state.resources, feeder.ingredients):
				var fed: Dictionary = AlchemyCircle.transmute_by_circle(state, feeder.ingredients, rng)
				return fed
	return {}

func _test_full_simulation() -> void:
	var state := StateHelper.create_initial_state(101)
	var rng := _rng(101)
	var chapter := GameData.get_current_chapter(state)
	var iterations := 0

	while not state.ended and iterations < 8000:
		iterations += 1
		var choice_id := _pick_choice_for_discovery(state, chapter)
		if choice_id == "":
			choice_id = String(chapter.choices[iterations % 3].id)

		var result := _try_transmute(state, rng)
		if not result.is_empty():
			state = result.state
			if state.ended:
				break

		var story := Progression.apply_chapter_choice(state, choice_id, rng)
		state = story.state
		if rng.randf() < 0.35:
			var event := EventEngine.fallback_narrative(rng)
			var outcome := EventEngine.resolve_event_outcome(state, event, rng)
			state = EventEngine.apply_event_outcome(state, event, outcome)
		chapter = GameData.get_current_chapter(state)

	_check(state.ended, "simulation reached ending")
	_check(String(state.rank) == "至高炼金术师", "final rank")
	_check(int(state.resources.philosopherStone) >= 1, "stone produced")
	_check(iterations < 8000, "simulation converged in time")
	print("  simulation: day %d, rank %s, formulas %d, iterations %d" % [
			int(state.day), String(state.rank), state.discoveredFormulas.size(), iterations,
	])
