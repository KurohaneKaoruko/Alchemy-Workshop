extends RefCounted
class_name GameData
## 静态游戏数据：境界、材料、章节、配方、定式与内置事件。

const MAX_VIGOR: int = 12
const ACTIONS_PER_DAY: int = 3
const JOURNAL_LIMIT: int = 80
const ARCHIVE_LIMIT: int = 200

const RANK_ORDER: Array = ["学徒", "炼金士", "大炼金士", "贤者候补", "至高炼金术师"]

const RESOURCE_KEYS: Array = [
	"ash", "ironSand", "salt", "copperFilings", "sulfur", "leadIngot",
	"herbEssence", "mercury", "obsidian", "crystalShard", "lotusResin",
	"moonDew", "sunBloom", "nightBloom", "silverLeaf", "mistPearl",
	"sunShard", "voidInk", "runeBone", "aetherDust", "emberCore",
	"goldDust", "etherGlass", "starlightThread", "quicksilverBloom",
	"dragonScale", "auricCatalyst", "philosopherSeed", "philosopherStone",
]

const RESOURCE_LABELS: Dictionary = {
	"ash": "草木灰", "ironSand": "赤铁砂", "salt": "黑土盐", "copperFilings": "铜屑",
	"sulfur": "硫华", "leadIngot": "铅锭", "herbEssence": "药草精", "mercury": "活汞",
	"obsidian": "黑曜片", "crystalShard": "晶簇碎片", "lotusResin": "莲脂", "moonDew": "月露",
	"sunBloom": "日耀花粉", "nightBloom": "夜绽花蜜", "silverLeaf": "银箔叶", "mistPearl": "雾珠",
	"sunShard": "日辉碎片", "voidInk": "虚墨", "runeBone": "符纹骨", "aetherDust": "灵尘",
	"emberCore": "余烬核", "goldDust": "金砂", "etherGlass": "以太玻晶", "starlightThread": "星丝",
	"quicksilverBloom": "汞华", "dragonScale": "龙鳞片", "auricCatalyst": "金辉触媒",
	"philosopherSeed": "贤者种", "philosopherStone": "贤者之石",
}

const RESOURCE_VALUES: Dictionary = {
	"ash": 1, "ironSand": 1, "salt": 2, "copperFilings": 2, "sulfur": 3,
	"leadIngot": 3, "herbEssence": 3, "mercury": 4, "obsidian": 4,
	"crystalShard": 5, "lotusResin": 5, "moonDew": 5, "sunBloom": 6,
	"nightBloom": 6, "silverLeaf": 6, "mistPearl": 6, "sunShard": 7,
	"voidInk": 7, "runeBone": 7, "aetherDust": 8, "emberCore": 8,
	"goldDust": 9, "etherGlass": 9, "starlightThread": 10, "quicksilverBloom": 11,
	"dragonScale": 12, "philosopherSeed": 13, "auricCatalyst": 14,
	"philosopherStone": 34,
}

const CIRCLE_INPUT_ORDER: Array = [
	"ash", "ironSand", "salt", "copperFilings", "sulfur", "leadIngot",
	"herbEssence", "mercury", "obsidian", "crystalShard", "lotusResin",
	"moonDew", "sunBloom", "nightBloom", "silverLeaf", "mistPearl",
	"sunShard", "voidInk", "runeBone", "aetherDust", "emberCore",
	"goldDust", "etherGlass", "starlightThread", "quicksilverBloom",
	"dragonScale", "auricCatalyst", "philosopherSeed", "philosopherStone",
]

const EQUIVALENT_OUTPUT_OPTIONS: Array = [
	"ash", "ironSand", "salt", "copperFilings", "sulfur", "leadIngot",
	"herbEssence", "mercury", "obsidian", "crystalShard", "lotusResin",
	"moonDew", "sunBloom", "nightBloom", "silverLeaf", "mistPearl",
	"sunShard", "voidInk", "runeBone", "aetherDust", "emberCore",
	"goldDust", "etherGlass", "starlightThread", "quicksilverBloom",
	"dragonScale", "auricCatalyst",
]

## 材料图示（复用 CC0 药水瓶图标，按价值档位着色）。
const RESOURCE_ICONS: Dictionary = {
	"ash": "potion_white", "ironSand": "potion_white", "salt": "potion_white",
	"copperFilings": "potion_green", "sulfur": "potion_green", "leadIngot": "potion_green",
	"herbEssence": "potion_green", "mercury": "potion_blue", "obsidian": "potion_blue",
	"crystalShard": "potion_blue", "lotusResin": "potion_blue", "moonDew": "potion_blue",
	"sunBloom": "potion_red", "nightBloom": "potion_red", "silverLeaf": "potion_red",
	"mistPearl": "potion_red", "sunShard": "potion_purple", "voidInk": "potion_purple",
	"runeBone": "potion_purple", "aetherDust": "potion_purple", "emberCore": "potion_red",
	"goldDust": "potion_red", "etherGlass": "potion_blue", "starlightThread": "potion_purple",
	"quicksilverBloom": "potion_blue", "dragonScale": "potion_green",
	"auricCatalyst": "potion_red", "philosopherSeed": "potion_white",
	"philosopherStone": "potion_black",
}

const STORY_ACTION_LABELS: Dictionary = {
	"study": "研读残页",
	"gather": "采集原料",
	"distill": "看炉蒸馏",
	"lecture": "公开演示",
	"meditate": "午夜冥想",
	"emerald_tablet": "解读翠玉录",
}

## 章节数据：id / rank / title / summary / atmosphere / choices。
const CHAPTERS: Array = [
	{
		"id": "black-soil-and-fire",
		"rank": "学徒",
		"title": "第一章：黑土与火",
		"summary": "你在潮湿地窖中点起第一炉火，学习分辨盐、硫、汞的征象。",
		"atmosphere": "炉火噼啪作响，墙上的铜盘映出摇曳光纹，你在焦黑笔记上写下第一条戒律。",
		"choices": [
			{"id": "apprentice-study", "label": "研读残页", "action": "study", "flavorText": "你逐字比对手稿，试图理解“其上如其下”最初的含义。"},
			{"id": "apprentice-gather", "label": "采集原料", "action": "gather", "flavorText": "你在旧矿道收集草木灰与赤铁砂，背篓越来越沉。"},
			{"id": "apprentice-distill", "label": "看炉蒸馏", "action": "distill", "flavorText": "你将坩埚火门微微合拢，等待第一滴汞露出现。"},
		],
	},
	{
		"id": "seven-seals",
		"rank": "炼金士",
		"title": "第二章：七重封印",
		"summary": "你开始接触更危险的仪式，需要在秩序与欲望之间保持平衡。",
		"atmosphere": "石台上刻着七枚封印符号，风从通风井倒灌而下，带着硫与雨水气味。",
		"choices": [
			{"id": "alchemist-tablet", "label": "解读翠玉录", "action": "emerald_tablet", "flavorText": "你对照星象与注释，尝试破解隐藏在箴言中的工序。"},
			{"id": "alchemist-lecture", "label": "公开演示", "action": "lecture", "flavorText": "你在公会小厅展示稳定盐析，赢得旁观者审视。"},
			{"id": "alchemist-meditate", "label": "午夜冥想", "action": "meditate", "flavorText": "你在熄炉后静坐，听呼吸与炉壁余温同频。"},
		],
	},
	{
		"id": "as-above-so-below",
		"rank": "大炼金士",
		"title": "第三章：天上如是，地下亦然",
		"summary": "你终于能将星象、火候与矿相统一在同一公式内。",
		"atmosphere": "天窗透下微光，玻璃冷凝管像一串垂直的星图，记录着你的每次偏差。",
		"choices": [
			{"id": "master-study", "label": "推演天象式", "action": "study", "flavorText": "你在石板上推导行星周期与炼成窗口的对应关系。"},
			{"id": "master-distill", "label": "执行换相", "action": "distill", "flavorText": "你让三原质在封闭回路内循环，观察颜色跳变。"},
			{"id": "master-gather", "label": "前往盐湖", "action": "gather", "flavorText": "你远行至盐湖采露，风沙在斗篷上结成白痕。"},
		],
	},
	{
		"id": "red-completion",
		"rank": "贤者候补",
		"title": "终章前夜：赤红完成",
		"summary": "所有公式都指向同一个核心问题：你能否承受最终统一的代价。",
		"atmosphere": "工坊被赤色灯焰照亮，铜镜背面出现细密裂纹，像是某种倒计时。",
		"choices": [
			{"id": "candidate-emerald", "label": "再证翠玉录", "action": "emerald_tablet", "flavorText": "你逐句默诵箴言，把每个词映射到一个具体操作。"},
			{"id": "candidate-lecture", "label": "会盟答辩", "action": "lecture", "flavorText": "你在会盟长桌前陈述理论，迎接质疑与赞许。"},
			{"id": "candidate-meditate", "label": "炉前守夜", "action": "meditate", "flavorText": "你让火焰降到最细一线，守住心神不散。"},
		],
	},
]

## 炼成台配方（经典配方系统，作为魔法阵之外的定向炼成途径）。
const RECIPES: Array = [
	{
		"id": "prima_salts", "name": "盐之初析",
		"description": "将矿盐与灰烬反复焙烧，得到纯化盐晶。",
		"minRank": "学徒", "requiredKnowledge": 0, "requiredMastery": 0, "difficulty": 1,
		"ingredients": {"ash": 1}, "outputs": {"salt": 2},
		"successLog": "白色盐晶在坩埚底部析出，炉火稳定。",
	},
	{
		"id": "vulcan_sulfur", "name": "硫之火吻",
		"description": "以高温炼取硫质精华，为后续变换准备活性。",
		"minRank": "学徒", "requiredKnowledge": 6, "requiredMastery": 6, "difficulty": 2,
		"ingredients": {"ash": 1, "ironSand": 1}, "outputs": {"sulfur": 2},
		"successLog": "黄色烟雾凝聚成硫滴，火性被驯服了一分。",
	},
	{
		"id": "mercury_distill", "name": "汞之蒸馏",
		"description": "以冷凝盘回收活汞，考验火候与耐心。",
		"minRank": "炼金士", "requiredKnowledge": 12, "requiredMastery": 14, "difficulty": 3,
		"ingredients": {"sulfur": 1, "ironSand": 1}, "outputs": {"mercury": 2},
		"successLog": "银色汞珠顺着玻璃管滚落，灵动如蛇。",
	},
	{
		"id": "moon_tincture", "name": "月露酊剂",
		"description": "夜半采月露入药，净化金属中的躁性。",
		"minRank": "炼金士", "requiredKnowledge": 18, "requiredMastery": 20, "difficulty": 3,
		"ingredients": {"moonDew": 1, "salt": 1}, "outputs": {"aetherDust": 2},
		"successLog": "酊剂在月光下泛起蓝银色光晕。",
	},
	{
		"id": "solar_lacquer", "name": "日耀漆",
		"description": "提取日辉碎屑，制成可固化灵性纹路的漆层。",
		"minRank": "大炼金士", "requiredKnowledge": 26, "requiredMastery": 30, "difficulty": 4,
		"ingredients": {"sunShard": 1, "sulfur": 2}, "outputs": {"aetherDust": 2, "mercury": 1},
		"successLog": "坩埚内壁浮现金色漆纹，稳定而锐利。",
	},
	{
		"id": "iron_transmute", "name": "赤铁换相",
		"description": "以盐硫汞三元比例对赤铁砂进行换相。",
		"minRank": "大炼金士", "requiredKnowledge": 30, "requiredMastery": 34, "difficulty": 5,
		"ingredients": {"ironSand": 2, "salt": 1, "sulfur": 1, "mercury": 1}, "outputs": {"sunShard": 2},
		"successLog": "赤铁砂层层剥离，显露出灼亮金片。",
	},
	{
		"id": "spirit_seal", "name": "七印封灵",
		"description": "将七重封印刻入灵尘，防止仪式反噬。",
		"minRank": "贤者候补", "requiredKnowledge": 42, "requiredMastery": 46, "difficulty": 6,
		"ingredients": {"aetherDust": 3, "moonDew": 1}, "outputs": {"philosopherSeed": 1},
		"successLog": "封印纹路稳定成形，灵尘不再四散。",
	},
	{
		"id": "aurum_vitae", "name": "活金原液",
		"description": "在密闭回路中融合日耀与月露，制得活金原液。",
		"minRank": "贤者候补", "requiredKnowledge": 46, "requiredMastery": 50, "difficulty": 7,
		"ingredients": {"sunShard": 2, "moonDew": 2, "mercury": 2, "aetherDust": 1}, "outputs": {"philosopherSeed": 1},
		"successLog": "活金原液在密封球内缓慢旋转，如心脏搏动。",
	},
	{
		"id": "quintessence", "name": "第五精华",
		"description": "提炼四元之上之精，作为贤者之石的核心基底。",
		"minRank": "贤者候补", "requiredKnowledge": 52, "requiredMastery": 54, "difficulty": 8,
		"ingredients": {"salt": 2, "sulfur": 2, "mercury": 2, "philosopherSeed": 1}, "outputs": {"aetherDust": 4},
		"successLog": "一缕透明而厚重的精华被你封存于石英匣中。",
	},
	{
		"id": "philosopher_stone", "name": "贤者之石",
		"description": "终极炼成：将三原质与第五精华统一于一。",
		"minRank": "贤者候补", "requiredKnowledge": 60, "requiredMastery": 60, "difficulty": 10,
		"ingredients": {"philosopherSeed": 2, "aetherDust": 5, "sunShard": 2, "moonDew": 2}, "outputs": {"philosopherStone": 1},
		"successLog": "赤红晶核在掌心成形，贤者之石已被点化。",
	},
]

## 魔法阵定式：精确投料必然显化指定产物。
const ARCANE_FORMULAS: Array = [
	{
		"id": "triad_prime", "name": "三元初衡", "minRank": "学徒",
		"ingredients": {"ash": 2, "ironSand": 2, "moonDew": 1},
		"output": {"resource": "salt", "amount": 3},
		"lore": "黑土之盐在环纹中心凝成白光，最初秩序被确立。",
	},
	{
		"id": "mercurial_ladder", "name": "汞梯升华", "minRank": "炼金士",
		"ingredients": {"sulfur": 2, "mercury": 2, "moonDew": 1},
		"output": {"resource": "aetherDust", "amount": 2},
		"lore": "汞雾沿符线攀升，像一架倒悬的阶梯通往高处。",
	},
	{
		"id": "great_conjunction", "name": "日月合契", "minRank": "大炼金士",
		"ingredients": {"sunShard": 2, "moonDew": 2, "mercury": 2, "aetherDust": 1},
		"output": {"resource": "philosopherSeed", "amount": 1},
		"lore": "天上与地下短暂重叠，贤者种在圆阵中心缓缓发亮。",
	},
	{
		"id": "philosopher_stone", "name": "赤红完成", "minRank": "贤者候补",
		"ingredients": {"philosopherSeed": 2, "aetherDust": 5, "sunShard": 2, "moonDew": 2},
		"output": {"resource": "philosopherStone", "amount": 1},
		"lore": "赤红之核在你掌中稳定，贤者之石已然完成。",
	},
]

## 境界晋升需求。
const RANK_REQUIREMENTS: Dictionary = {
	"炼金士": {"knowledge": 10, "mastery": 12, "reputation": 2},
	"大炼金士": {"knowledge": 24, "mastery": 28, "reputation": 8},
	"贤者候补": {"knowledge": 40, "mastery": 45, "reputation": 18, "requireRecipe": "great_conjunction"},
	"至高炼金术师": {"knowledge": 60, "mastery": 60, "reputation": 30, "requireRecipe": "philosopher_stone"},
}

## 剧情推演出的定式线索规则。
const STORY_DISCOVERY_RULES: Array = [
	{
		"formulaId": "mercurial_ladder", "formulaName": "汞梯升华", "minRank": "炼金士",
		"minKnowledge": 18, "minMastery": 16,
		"actions": ["study", "distill", "emerald_tablet"], "chance": 0.42,
		"lore": "你在蒸汽与汞珠的相位延迟中，看见了一条垂直升华的阶梯纹路。",
	},
	{
		"formulaId": "great_conjunction", "formulaName": "日月合契", "minRank": "大炼金士",
		"minKnowledge": 34, "minMastery": 32,
		"actions": ["emerald_tablet", "meditate"], "chance": 0.38,
		"lore": "你将《翠玉录》句式映射到阵线后，日月双轨的闭合条件终于显现。",
		"requireKnown": "mercurial_ladder",
	},
	{
		"formulaId": "philosopher_stone", "formulaName": "赤红完成", "minRank": "贤者候补",
		"minKnowledge": 54, "minMastery": 56,
		"actions": ["emerald_tablet", "meditate"], "chance": 0.34,
		"lore": "当你让呼吸与炉火同频，赤红终式在脑海中短暂完整地展开。",
		"requireKnown": "great_conjunction",
	},
]

## 内置随机事件池。
const FALLBACK_EVENTS: Array = [
	{"title": "坩埚低语", "body": "炉壁上浮现不完整符号，你意识到温度曲线与某条旧注释完全吻合。", "tags": ["insight", "medium"]},
	{"title": "市集传闻", "body": "一名行商悄悄塞给你破损羊皮卷，卷角写着“勿在第三刻启封”。", "tags": ["reputation", "risk-low"]},
	{"title": "封印震颤", "body": "地下封印传来细微震颤，尘埃像被看不见的手拨动。", "tags": ["risk-high", "mastery"]},
	{"title": "冷凝管破裂", "body": "玻璃管在高压下骤然开裂，你只能在蒸汽散尽前抢救样本。", "tags": ["risk-high", "material"]},
	{"title": "静夜启示", "body": "夜色安静得近乎停滞，你忽然理解“太阳是其父，月亮是其母”。", "tags": ["insight", "emerald"]},
	{"title": "公会质询", "body": "公会使者要求你公开解释一项实验结果，你必须在真相与保密间权衡。", "tags": ["reputation", "risk-medium"]},
	{"title": "月露丰收", "body": "罕见雾潮降临，工坊外的收集盘在黎明前积满月露。", "tags": ["material", "resource-rich"]},
	{"title": "旧塔回声", "body": "你在废塔中听到回声般的诵词，像是前代炼金士留下的纠错提示。", "tags": ["insight", "mastery"]},
	{"title": "汞影试探", "body": "液汞表面出现不自然涟漪，仿佛在回应你的呼吸节律。", "tags": ["risk-medium", "material"]},
	{"title": "七印同鸣", "body": "七枚封印短暂共振，室内温度骤降，你得到一次重排公式的机会。", "tags": ["mastery", "emerald"]},
]

static func rank_to_index(rank: String) -> int:
	return RANK_ORDER.find(rank)

static func get_recipe_by_id(recipe_id: String) -> Dictionary:
	for recipe in RECIPES:
		if recipe.id == recipe_id:
			return recipe
	return {}

static func get_recipes_unlocked_by_rank(rank: String) -> Array:
	var rank_index := rank_to_index(rank)
	var ids: Array = []
	for recipe in RECIPES:
		if rank_to_index(recipe.minRank) <= rank_index:
			ids.append(recipe.id)
	return ids

static func get_formula_by_id(formula_id: String) -> Dictionary:
	for formula in ARCANE_FORMULAS:
		if formula.id == formula_id:
			return formula
	return {}

static func get_story_discovery_rule(formula_id: String) -> Dictionary:
	for rule in STORY_DISCOVERY_RULES:
		if rule.formulaId == formula_id:
			return rule
	return {}

static func get_current_chapter(state: Dictionary) -> Dictionary:
	for chapter in CHAPTERS:
		if chapter.rank == state.rank:
			return chapter
	return CHAPTERS[CHAPTERS.size() - 1]

static func resource_icon_path(key: String) -> String:
	var icon_name: String = RESOURCE_ICONS.get(key, "potion_white")
	return "res://assets/cc0/icons/%s.png" % icon_name

static func format_resource_bundle(bundle: Dictionary) -> String:
	## 将 {resource: amount} 格式化为「黑土盐x2、草木灰x1」样式，按价值降序。
	var keys: Array = []
	for key in bundle.keys():
		if int(bundle[key]) > 0:
			keys.append(key)
	if keys.is_empty():
		return "无"
	keys.sort_custom(func(a, b): return RESOURCE_VALUES[a] > RESOURCE_VALUES[b])
	var parts: Array = []
	for key in keys:
		parts.append("%sx%d" % [RESOURCE_LABELS[key], int(bundle[key])])
	return "、".join(parts)
