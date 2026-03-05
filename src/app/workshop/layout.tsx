import Link from "next/link";
import type { CSSProperties } from "react";
import { RouteTransitionOverlay } from "@/features/game/components/RouteTransitionOverlay";
import { WorkshopNav } from "@/features/game/components/WorkshopNav";

const NAV_ITEMS = [
  { href: "/workshop", label: "工坊总览" },
  { href: "/workshop/story", label: "剧情探索" },
  { href: "/workshop/alchemy", label: "魔法阵炼金" },
  { href: "/workshop/journal", label: "炼金档案" },
  { href: "/workshop/settings", label: "AI 设置" },
];

export default function WorkshopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const embers = Array.from({ length: 18 }, (_, index) => {
    const style = {
      "--ember-left": `${(index * 17) % 100}%`,
      "--ember-delay": `${(index % 7) * -1.25}s`,
      "--ember-duration": `${9 + (index % 5) * 2.1}s`,
      "--ember-size": `${4 + (index % 4) * 1.2}px`,
    } as CSSProperties;
    return <span key={`ember-${index}`} className="workshop-ember" style={style} />;
  });

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_12%_8%,#f0e4c8_0%,#c9b183_40%,#7a6138_100%)] px-4 py-6 text-[#2f2413] sm:px-8">
      <div className="workshop-ambient">
        <div className="workshop-ambient__fog" />
        <div className="workshop-ambient__runes" />
        {embers}
      </div>

      <div className="relative mx-auto max-w-6xl">
        <header className="game-panel reveal-up rounded-3xl border border-[#70592f]/45 bg-[#f9f1de]/90 p-5 shadow-[0_14px_26px_rgba(66,47,18,0.22)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#6a5632]">Alchemy Workshop</p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">极简炼金工坊</h1>
            </div>
            <Link
              href="/"
              className="game-button rounded-lg border border-[#6b5b37] bg-[#efe3c4] px-3 py-1.5 text-sm hover:bg-[#e6d3a7]"
            >
              返回首页
            </Link>
          </div>
          <WorkshopNav items={NAV_ITEMS} />
        </header>

        <main className="mt-4 reveal-up reveal-delay-1">{children}</main>
      </div>
      <RouteTransitionOverlay />
    </div>
  );
}
