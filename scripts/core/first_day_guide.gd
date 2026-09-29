extends RefCounted
class_name FirstDayGuide
## 学徒首日引导。

const STEP_ACTION_LABELS := {
	"story": "前往剧情探索",
	"alchemy": "前往魔法阵炼金",
	"journal": "前往炼金档案",
}

static func get_first_day_guide_signature(guide: Dictionary) -> String:
	var parts: Array = [guide.mode, guide.currentStepId]
	for step in guide.steps:
		parts.append("%s:%s" % [step.id, step.status])
	parts.append(guide.milestone.id if guide.milestone != null else "none")
	return "|".join(parts)

static func _build_first_formula_hint() -> String:
	var formula := GameData.get_formula_by_id("triad_prime")
	if formula.is_empty():
		return "用现有材料试一次基础炼成，熟悉阵盘与投料手感。"
	var materials: Array = []
	for key in formula.ingredients.keys():
		materials.append("%s×%d" % [GameData.RESOURCE_LABELS[key], int(formula.ingredients[key])])
	return "优先尝试「%s」：%s。" % [formula.name, "、".join(materials)]

static func build_first_day_guide(state: Dictionary):
	if state.rank != "学徒" or state.ended:
		return null

	if int(state.day) > 1:
		var current_plan := GrandWorkPlan.build_grand_work_plan(state)
		var recap_step_id := "story"
		match current_plan.actionCue.href:
			"alchemy":
				recap_step_id = "alchemy"
			"journal":
				recap_step_id = "journal"
		return {
			"mode": "recap",
			"headline": "首日回顾",
			"summary": "你已经摸过第一天的基础节奏。今天建议先做「%s」，继续把工坊循环跑顺。" % current_plan.actionCue.title,
			"currentStepId": recap_step_id,
			"currentHref": current_plan.actionCue.href,
			"currentActionLabel": STEP_ACTION_LABELS[recap_step_id],
			"milestone": null,
			"steps": [],
		}

	var has_story_progress: bool = false
	if int(state.knowledge) > 4 or int(state.reputation) > 0:
		has_story_progress = true
	else:
		for entry in state.journal:
			if entry.type == "story" or entry.type == "event":
				has_story_progress = true
				break

	var has_alchemy_progress: bool = state.completedRecipes.size() > 0
	if not has_alchemy_progress:
		for entry in state.journal:
			if entry.type == "craft":
				has_alchemy_progress = true
				break

	var has_archive_review: bool = state.journal.size() >= 3 or int(state.actionsLeft) <= 1

	var current_step_id := "journal"
	if not has_story_progress:
		current_step_id = "story"
	elif not has_alchemy_progress:
		current_step_id = "alchemy"
	elif has_archive_review:
		current_step_id = "journal"

	var steps: Array = [
		{
			"id": "story",
			"title": "先做一次剧情探索",
			"description": "优先拿到第一条线索与属性增长，熟悉今日节奏。",
			"href": "story",
			"status": "done" if has_story_progress else "active",
		},
		{
			"id": "alchemy",
			"title": "再试一次基础炼成",
			"description": _build_first_formula_hint(),
			"href": "alchemy",
			"status": ("done" if has_story_progress else "pending") if has_alchemy_progress else ("active" if has_story_progress else "pending"),
		},
		{
			"id": "journal",
			"title": "最后回档案确认收获",
			"description": "看一眼日志、过场与库存变化，决定明天先补哪一步。",
			"href": "journal",
			"status": ("active" if not has_archive_review else "done") if has_alchemy_progress else "pending",
		},
	]

	var projected := state.duplicate(true)
	projected.day = int(state.day) + 1
	projected.actionsLeft = GameData.ACTIONS_PER_DAY
	projected.vigor = min(GameData.MAX_VIGOR, int(state.vigor) + 2)
	var projected_plan := GrandWorkPlan.build_grand_work_plan(projected)

	var milestone = null
	if has_story_progress and not has_alchemy_progress:
		milestone = {
			"id": "story_complete",
			"label": "阶段完成反馈",
			"title": "第一步完成：你已经拿到第一条线索",
			"summary": "接下来把注意力转到魔法阵，试一次基础炼成，让首日循环真正跑起来。",
			"nextHref": "alchemy",
			"nextActionLabel": STEP_ACTION_LABELS.alchemy,
		}
	elif has_alchemy_progress and not has_archive_review:
		milestone = {
			"id": "alchemy_complete",
			"label": "阶段完成反馈",
			"title": "第二步完成：第一次炼成已经达成",
			"summary": "现在回档案页看日志、库存与回放，你就能完整收束首日收获。",
			"nextHref": "journal",
			"nextActionLabel": STEP_ACTION_LABELS.journal,
		}
	elif has_archive_review:
		milestone = {
			"id": "journal_complete",
			"label": "首日完成总结",
			"title": "首日流程已经跑通",
			"summary": "明天开局更建议先做「%s」，继续把今天摸到的线索推进下去。" % projected_plan.actionCue.title,
			"nextHref": projected_plan.actionCue.href,
			"nextActionLabel": STEP_ACTION_LABELS[projected_plan.actionCue.href],
		}

	var current_step: Dictionary = steps[0]
	for step in steps:
		if step.id == current_step_id:
			current_step = step
			break

	return {
		"mode": "full",
		"headline": "学徒首日路线",
		"summary": "首日不需要记住所有系统，只要先探索、再炼成、最后回看档案即可。",
		"currentStepId": current_step_id,
		"currentHref": current_step.href,
		"currentActionLabel": STEP_ACTION_LABELS[current_step_id],
		"milestone": milestone,
		"steps": steps,
	}
