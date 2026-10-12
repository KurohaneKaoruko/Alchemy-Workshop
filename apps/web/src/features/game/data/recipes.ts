import { RANK_ORDER, type Rank, type Recipe } from "@/features/game/types";

export const RECIPES: Recipe[] = [
  {
    id: "prima_salts",
    name: "盐之初析",
    description: "将矿盐与灰烬反复焙烧，得到纯化盐晶。",
    minRank: "学徒",
    requiredKnowledge: 0,
    requiredMastery: 0,
    difficulty: 1,
    ingredients: {
      ash: 1,
    },
    outputs: {
      salt: 2,
    },
    successLog: "白色盐晶在坩埚底部析出，炉火稳定。",
  },
  {
    id: "vulcan_sulfur",
    name: "硫之火吻",
    description: "以高温炼取硫质精华，为后续变换准备活性。",
    minRank: "学徒",
    requiredKnowledge: 6,
    requiredMastery: 6,
    difficulty: 2,
    ingredients: {
      ash: 1,
      ironSand: 1,
    },
    outputs: {
      sulfur: 2,
    },
    successLog: "黄色烟雾凝聚成硫滴，火性被驯服了一分。",
  },
  {
    id: "mercury_distill",
    name: "汞之蒸馏",
    description: "以冷凝盘回收活汞，考验火候与耐心。",
    minRank: "炼金士",
    requiredKnowledge: 12,
    requiredMastery: 14,
    difficulty: 3,
    ingredients: {
      sulfur: 1,
      ironSand: 1,
    },
    outputs: {
      mercury: 2,
    },
    successLog: "银色汞珠顺着玻璃管滚落，灵动如蛇。",
  },
  {
    id: "moon_tincture",
    name: "月露酊剂",
    description: "夜半采月露入药，净化金属中的躁性。",
    minRank: "炼金士",
    requiredKnowledge: 18,
    requiredMastery: 20,
    difficulty: 3,
    ingredients: {
      moonDew: 1,
      salt: 1,
    },
    outputs: {
      aetherDust: 2,
    },
    successLog: "酊剂在月光下泛起蓝银色光晕。",
  },
  {
    id: "solar_lacquer",
    name: "日耀漆",
    description: "提取日辉碎屑，制成可固化灵性纹路的漆层。",
    minRank: "大炼金士",
    requiredKnowledge: 26,
    requiredMastery: 30,
    difficulty: 4,
    ingredients: {
      sunShard: 1,
      sulfur: 2,
    },
    outputs: {
      aetherDust: 2,
      mercury: 1,
    },
    successLog: "坩埚内壁浮现金色漆纹，稳定而锐利。",
  },
  {
    id: "iron_transmute",
    name: "赤铁换相",
    description: "以盐硫汞三元比例对赤铁砂进行换相。",
    minRank: "大炼金士",
    requiredKnowledge: 30,
    requiredMastery: 34,
    difficulty: 5,
    ingredients: {
      ironSand: 2,
      salt: 1,
      sulfur: 1,
      mercury: 1,
    },
    outputs: {
      sunShard: 2,
    },
    successLog: "赤铁砂层层剥离，显露出灼亮金片。",
  },
  {
    id: "spirit_seal",
    name: "七印封灵",
    description: "将七重封印刻入灵尘，防止仪式反噬。",
    minRank: "贤者候补",
    requiredKnowledge: 42,
    requiredMastery: 46,
    difficulty: 6,
    ingredients: {
      aetherDust: 3,
      moonDew: 1,
    },
    outputs: {
      philosopherSeed: 1,
    },
    successLog: "封印纹路稳定成形，灵尘不再四散。",
  },
  {
    id: "aurum_vitae",
    name: "活金原液",
    description: "在密闭回路中融合日耀与月露，制得活金原液。",
    minRank: "贤者候补",
    requiredKnowledge: 46,
    requiredMastery: 50,
    difficulty: 7,
    ingredients: {
      sunShard: 2,
      moonDew: 2,
      mercury: 2,
      aetherDust: 1,
    },
    outputs: {
      philosopherSeed: 1,
    },
    successLog: "活金原液在密封球内缓慢旋转，如心脏搏动。",
  },
  {
    id: "quintessence",
    name: "第五精华",
    description: "提炼四元之上之精，作为贤者之石的核心基底。",
    minRank: "贤者候补",
    requiredKnowledge: 52,
    requiredMastery: 54,
    difficulty: 8,
    ingredients: {
      salt: 2,
      sulfur: 2,
      mercury: 2,
      philosopherSeed: 1,
    },
    outputs: {
      aetherDust: 4,
    },
    successLog: "一缕透明而厚重的精华被你封存于石英匣中。",
  },
  {
    id: "philosopher_stone",
    name: "贤者之石",
    description: "终极炼成：将三原质与第五精华统一于一。",
    minRank: "贤者候补",
    requiredKnowledge: 60,
    requiredMastery: 60,
    difficulty: 10,
    ingredients: {
      philosopherSeed: 2,
      aetherDust: 5,
      sunShard: 2,
      moonDew: 2,
    },
    outputs: {
      philosopherStone: 1,
    },
    successLog: "赤红晶核在掌心成形，贤者之石已被点化。",
  },
];

export function rankToIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

export function getRecipesUnlockedByRank(rank: Rank): string[] {
  const rankIndex = rankToIndex(rank);
  return RECIPES.filter((recipe) => rankToIndex(recipe.minRank) <= rankIndex).map(
    (recipe) => recipe.id,
  );
}

export function getRecipeById(recipeId: string): Recipe | undefined {
  return RECIPES.find((recipe) => recipe.id === recipeId);
}
