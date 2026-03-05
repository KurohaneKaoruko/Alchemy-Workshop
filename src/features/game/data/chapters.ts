import type { ChapterData } from "@/features/game/types";

export const CHAPTERS: ChapterData[] = [
  {
    id: "black-soil-and-fire",
    rank: "学徒",
    title: "第一章：黑土与火",
    summary: "你在潮湿地窖中点起第一炉火，学习分辨盐、硫、汞的征象。",
    atmosphere:
      "炉火噼啪作响，墙上的铜盘映出摇曳光纹，你在焦黑笔记上写下第一条戒律。",
    choices: [
      {
        id: "apprentice-study",
        label: "研读残页",
        action: "study",
        flavorText: "你逐字比对手稿，试图理解“上如其下”最初的含义。",
      },
      {
        id: "apprentice-gather",
        label: "采集原料",
        action: "gather",
        flavorText: "你在旧矿道收集草木灰与赤铁砂，背篓越来越沉。",
      },
      {
        id: "apprentice-distill",
        label: "看炉蒸馏",
        action: "distill",
        flavorText: "你将坩埚火门微微合拢，等待第一滴汞露出现。",
      },
    ],
  },
  {
    id: "seven-seals",
    rank: "炼金士",
    title: "第二章：七重封印",
    summary: "你开始接触更危险的仪式，需在秩序与欲望之间保持平衡。",
    atmosphere:
      "石台上刻着七枚封印符号，风从通风井倒灌而下，带着硫与雨水气味。",
    choices: [
      {
        id: "alchemist-tablet",
        label: "解读翠玉录",
        action: "emerald_tablet",
        flavorText: "你对照星象与注释，尝试破解隐藏在箴言中的工序。",
      },
      {
        id: "alchemist-lecture",
        label: "公开演示",
        action: "lecture",
        flavorText: "你在公会小厅展示稳定盐析，赢得旁观者审视。",
      },
      {
        id: "alchemist-meditate",
        label: "夜半冥想",
        action: "meditate",
        flavorText: "你在熄炉后静坐，听呼吸与炉壁余温同频。",
      },
    ],
  },
  {
    id: "as-above-so-below",
    rank: "大炼金士",
    title: "第三章：天上如是，地下亦然",
    summary: "你终于能将星象、火候与矿相统一在同一公式内。",
    atmosphere:
      "天窗透下微光，玻璃冷凝管像一串垂直的星图，记录着你的每次偏差。",
    choices: [
      {
        id: "master-study",
        label: "推演天象式",
        action: "study",
        flavorText: "你在石板上推导行星周期与炼成窗口的对应关系。",
      },
      {
        id: "master-distill",
        label: "执行换相",
        action: "distill",
        flavorText: "你让三原质在封闭回路内循环，观察颜色跳变。",
      },
      {
        id: "master-gather",
        label: "前往盐湖",
        action: "gather",
        flavorText: "你远行至盐湖采露，风沙在斗篷上结成白痕。",
      },
    ],
  },
  {
    id: "red-completion",
    rank: "贤者候补",
    title: "终章前夜：赤红完成",
    summary: "所有公式都指向同一个核心问题：你能否承受最终统一的代价。",
    atmosphere:
      "工坊被赤色灯焰照亮，铜镜背面出现细密裂纹，像是某种倒计时。",
    choices: [
      {
        id: "candidate-emerald",
        label: "再证翠玉录",
        action: "emerald_tablet",
        flavorText: "你逐句默诵箴言，把每个词映射到一个具体操作。",
      },
      {
        id: "candidate-lecture",
        label: "会盟答辩",
        action: "lecture",
        flavorText: "你在会盟长桌前陈述理论，迎接质疑与赞叹。",
      },
      {
        id: "candidate-meditate",
        label: "炉前守夜",
        action: "meditate",
        flavorText: "你让火焰降到最细一线，守住心神不散。",
      },
    ],
  },
];
