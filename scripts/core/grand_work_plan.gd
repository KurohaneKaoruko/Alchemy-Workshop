extends RefCounted
class_name GrandWorkPlan
## 大工计划：阶段总结、日程信号、推荐工序、境界与定式目标。

const STATUS_LABELS := {
	"locked_rank": "先晋升",
	"missing_prerequisite": "补前置",
	"missing_stats": "补属性",
	"ready_to_research": "可破译",
	"ready_to_transmute": "可炼成",
	"complete": "已完成",
}

static func _resolve_goal_label(id: String) -> String:
	var recipe := GameData.get_recipe_by_id(id)
	if not recipe.is_empty():
		return recipe.name
	var formula := GameData.get_formula_by_id(id)
	if not formula.is_empty():
		return formula.name
	return id

static func _build_day_signal(state: Dictionary) -> String:
	var vigor_prefix := "炉火平稳"
	if int(state.vigor) <= 3:
		vigor_prefix = "炉火偏弱"
	elif int(state.vigor) >= 9:
		vigor_prefix = "炉火正盛"

	match int(state.actionsLeft):
		3:
			return "%s，今日还有 %d 次行动，适合先探再炼。" % [vigor_prefix, int(state.actionsLeft)]
		2:
			return "%s，还剩 2 次行动，可以继续沿着当前线索推进。" % vigor_prefix
		1:
			return "%s，只剩最后 1 次行动，适合做一次定向操作。" % vigor_prefix
		_:
			return "%s，今日行动已尽，先回档案整理收获。" % vigor_prefix

static func build_rank_goal(state: Dictionary) -> Dictionary:
	var next_rank_goal = Progression.get_next_rank_goal(state)
	if next_rank_goal == null:
		return {
			"currentRank": state.rank,
			"targetRank": null,
			"ready": true,
			"requirements": [
				{"label": "知识", "current": int(state.knowledge), "target": int(state.knowledge), "remaining": 0, "ready": true},
				{"label": "熟练", "current": int(state.mastery), "target": int(state.mastery), "remaining": 0, "ready": true},
				{"label": "名望", "current": int(state.reputation), "target": int(state.reputation), "remaining": 0, "ready": true},
			],
			"recipeRequirement": null,
		}

	var requirements: Array = [
		{
			"label": "知识", "current": int(state.knowledge), "target": int(next_rank_goal.knowledge),
			"remaining": max(0, int(next_rank_goal.knowledge) - int(state.knowledge)),
			"ready": int(state.knowledge) >= int(next_rank_goal.knowledge),
		},
		{
			"label": "熟练", "current": int(state.mastery), "target": int(next_rank_goal.mastery),
			"remaining": max(0, int(next_rank_goal.mastery) - int(state.mastery)),
			"ready": int(state.mastery) >= int(next_rank_goal.mastery),
		},
		{
			"label": "名望", "current": int(state.reputation), "target": int(next_rank_goal.reputation),
			"remaining": max(0, int(next_rank_goal.reputation) - int(state.reputation)),
			"ready": int(state.reputation) >= int(next_rank_goal.reputation),
		},
	]

	var recipe_requirement = null
	if next_rank_goal.requireRecipe != null and next_rank_goal.requireRecipe != "":
		recipe_requirement = {
			"recipeId": next_rank_goal.requireRecipe,
			"label": _resolve_goal_label(next_rank_goal.requireRecipe),
			"completed": state.completedRecipes.has(next_rank_goal.requireRecipe),
		}

	return {
		"currentRank": state.rank,
		"targetRank": next_rank_goal.targetRank,
		"ready": next_rank_goal.ready,
		"requirements": requirements,
		"recipeRequirement": recipe_requirement,
	}

static func build_ingredients(state: Dictionary, formula_id: String) -> Array:
	var formula := GameData.get_formula_by_id(formula_id)
	if formula.is_empty():
		return []
	var goals: Array = []
	for key in formula.ingredients.keys():
		var required := int(formula.ingredients[key])
		var current := int(state.resources.get(key, 0))
		goals.append({
			"key": key, "label": GameData.RESOURCE_LABELS[key],
			"current": current, "required": required,
			"remaining": max(0, required - current),
		})
	goals.sort_custom(func(a, b):
		if a.remaining != b.remaining:
			return a.remaining > b.remaining
		return a.label < b.label
	)
	return goals

static func build_formula_goal(state: Dictionary, rank_goal: Dictionary):
	if state.ended:
		return {
			"formulaId": "philosopher_stone",
			"formulaName": "贤者之石",
			"outputLabel": GameData.RESOURCE_LABELS.philosopherStone,
			"status": "complete",
			"recommendations": ["大工已经完成，现在只需要回顾日志与过场记录。"],
			"ingredients": [],
		}

	var guidance = AlchemyCircle.get_next_formula_guidance(state)
	if guidance != null:
		return {
			"formulaId": guidance.formulaId,
			"formulaName": guidance.formulaName,
			"outputLabel": guidance.outputLabel,
			"status": guidance.status,
			"recommendations": guidance.recommendations,
			"ingredients": build_ingredients(state, guidance.formulaId),
		}

	if rank_goal.recipeRequirement != null and not rank_goal.recipeRequirement.completed:
		var formula := GameData.get_formula_by_id(rank_goal.recipeRequirement.recipeId)
		var output_label: String = GameData.RESOURCE_LABELS.get(formula.get("output", {}).get("resource", ""), rank_goal.recipeRequirement.label) if not formula.is_empty() else rank_goal.recipeRequirement.label
		return {
			"formulaId": rank_goal.recipeRequirement.recipeId,
			"formulaName": formula.get("name", rank_goal.recipeRequirement.label),
			"outputLabel": output_label,
			"status": "ready_to_transmute",
			"recommendations": [
				"下一次精确投料可以直接冲击「%s」。" % rank_goal.recipeRequirement.label,
				"回到魔法阵炼金页，按照定式逐项校准材料与数量。",
			],
			"ingredients": build_ingredients(state, rank_goal.recipeRequirement.recipeId),
		}

	return null

static func build_phase(state: Dictionary, rank_goal: Dictionary, formula_goal) -> Dictionary:
	if state.ended:
		return {
			"eyebrow": "Grand Work Complete",
			"title": "贤者之石已成",
			"summary": "终局已经完成，工坊现在更适合回看档案、整理日志，并复盘整条大工路径。",
		}

	var status: String = formula_goal.status if formula_goal != null else ""
	match status:
		"ready_to_transmute":
			return {
				"eyebrow": "Final Mixture",
				"title": "回阵执行「%s」" % formula_goal.formulaName,
				"summary": "线索已经齐全，下一步不是继续摸索，而是按定式精确投料并完成最终显化。",
			}
		"ready_to_research":
			return {
				"eyebrow": "Research Window",
				"title": "准备破译「%s」" % formula_goal.formulaName,
				"summary": "当前属性和前置都已到位，继续推进剧情探索，就有机会把下一条定式显性化。",
			}
		"missing_stats":
			return {
				"eyebrow": "Rank Conditioning",
				"title": "补足属性后再破译「%s」" % formula_goal.formulaName,
				"summary": "境界已经允许接触下一条线索，但知识与熟练还不够稳，需要先把基础值抬上去。",
			}
		"missing_prerequisite":
			return {
				"eyebrow": "Previous Formula",
				"title": "先补齐前置定式，再追「%s」" % formula_goal.formulaName,
				"summary": "更高阶的仪式还被前一条定式锁住，当前最有效的推进方式是补完旧线索。",
			}
		"locked_rank":
			return {
				"eyebrow": "Ascension Gate",
				"title": "先迈向「%s」" % (rank_goal.targetRank if rank_goal.targetRank != null else state.rank),
				"summary": "下一条定式所在的工序尚未解锁，先通过剧情推进和常规炼成冲击更高境界。",
			}
		"complete":
			return {
				"eyebrow": "Archive Review",
				"title": "大工终局已封存",
				"summary": "你已经走完这轮炼金旅程，可以转去档案页重放过场和整理结果。",
			}
		_:
			if rank_goal.targetRank != null:
				return {
					"eyebrow": "Rank Progress",
					"title": "迈向「%s」" % rank_goal.targetRank,
					"summary": "当前没有新的定式门槛，但境界成长仍然会决定后续工坊的开放范围。",
				}
			return {
				"eyebrow": "Workshop Flow",
				"title": "工坊节律稳定",
				"summary": "当前没有新的阻塞项，可以按自己的节奏探索、炼成与归档。",
			}

static func build_action_cue(state: Dictionary, formula_goal) -> Dictionary:
	if state.ended:
		return {
			"href": "journal",
			"label": "回看炼金档案",
			"title": "整理整轮大工记录",
			"description": "贤者之石已经完成，接下来更适合回看过场、日志与库存轨迹。",
		}
	if formula_goal != null and formula_goal.status == "ready_to_transmute":
		return {
			"href": "alchemy",
			"label": "返回魔法阵炼金",
			"title": "执行精确投料",
			"description": "当前目标已经非常明确，直接去阵盘完成定向炼成的收益最高。",
		}
	return {
		"href": "story",
		"label": "推进剧情探索",
		"title": "继续追线索与属性",
		"description": "这一阶段仍以章节选择、线索破译和属性积累为主要推进方式。",
	}

static func build_grand_work_plan(state: Dictionary) -> Dictionary:
	var rank_goal := build_rank_goal(state)
	var formula_goal = build_formula_goal(state, rank_goal)
	return {
		"phase": build_phase(state, rank_goal, formula_goal),
		"daySignal": _build_day_signal(state),
		"actionCue": build_action_cue(state, formula_goal),
		"rankGoal": rank_goal,
		"formulaGoal": formula_goal,
	}
