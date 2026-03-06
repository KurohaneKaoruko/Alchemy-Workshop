"use client";

import { usePathname } from "next/navigation";

const SECTION_META = [
  {
    href: "/workshop/settings",
    sigil: "V",
    title: "工坊设置",
    summary: "配置 AI 异象与仪式音效。",
  },
  {
    href: "/workshop/journal",
    sigil: "IV",
    title: "炼金档案",
    summary: "查阅日志、统计与过场回放。",
  },
  {
    href: "/workshop/alchemy",
    sigil: "III",
    title: "魔法阵炼金",
    summary: "拖拽投料，执行等价交换与定式显化。",
  },
  {
    href: "/workshop/story",
    sigil: "II",
    title: "剧情探索",
    summary: "推进行动、接收异象、捕捉定式线索。",
  },
  {
    href: "/workshop",
    sigil: "I",
    title: "工坊总览",
    summary: "安排今日工序，决定下一步前往哪张工作台。",
  },
] as const;

export function WorkshopSectionIndicator() {
  const pathname = usePathname();
  const current = SECTION_META.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const meta = current ?? SECTION_META[SECTION_META.length - 1];

  return (
    <div className="workshop-section-indicator">
      <div className="workshop-section-indicator__seal" aria-hidden>
        {meta.sigil}
      </div>
      <div className="workshop-section-indicator__copy">
        <p className="workshop-section-indicator__eyebrow">Current Station</p>
        <p className="workshop-section-indicator__title">{meta.title}</p>
        <p className="workshop-section-indicator__summary">{meta.summary}</p>
      </div>
    </div>
  );
}
