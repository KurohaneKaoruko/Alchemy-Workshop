import type { NarrativeEvent } from "@/features/game/types";

export const FALLBACK_EVENTS: Omit<NarrativeEvent, "id" | "source">[] = [
  {
    title: "坩埚低语",
    body: "炉壁上浮现不完整符号，你意识到温度曲线与某条旧注释完全吻合。",
    tags: ["insight", "medium"],
  },
  {
    title: "市集传闻",
    body: "一名行商悄悄塞给你破损羊皮卷，卷角写着“勿在第三刻启封”。",
    tags: ["reputation", "risk-low"],
  },
  {
    title: "封印震颤",
    body: "地下封印传来细微震颤，尘埃像被看不见的手拨动。",
    tags: ["risk-high", "mastery"],
  },
  {
    title: "冷凝管破裂",
    body: "玻璃管在高压下骤然开裂，你只能在蒸汽散尽前抢救样本。",
    tags: ["risk-high", "material"],
  },
  {
    title: "静夜启示",
    body: "夜色安静得近乎停滞，你忽然理解“太阳是其父，月亮是其母”。",
    tags: ["insight", "emerald"],
  },
  {
    title: "公会质询",
    body: "公会使者要求你公开解释一项实验结果，你必须在真相与保密间权衡。",
    tags: ["reputation", "risk-medium"],
  },
  {
    title: "月露丰收",
    body: "罕见雾潮降临，工坊外的收集盘在黎明前积满月露。",
    tags: ["material", "resource-rich"],
  },
  {
    title: "旧塔回声",
    body: "你在废塔中听到回声般的诵词，像是前代炼金士留下的纠错提示。",
    tags: ["insight", "mastery"],
  },
  {
    title: "汞影试探",
    body: "液汞表面出现不自然涟漪，仿佛在回应你的呼吸节律。",
    tags: ["risk-medium", "material"],
  },
  {
    title: "七印同鸣",
    body: "七枚封印短暂共振，室内温度骤降，你得到一次重排公式的机会。",
    tags: ["mastery", "emerald"],
  },
];
