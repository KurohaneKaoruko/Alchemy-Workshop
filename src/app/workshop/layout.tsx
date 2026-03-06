import Link from "next/link";
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
  return (
    <div className="workshop-shell">
      <div className="workshop-shell__noise" />
      <div className="workshop-shell__aura workshop-shell__aura--left" />
      <div className="workshop-shell__aura workshop-shell__aura--right" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="workshop-topbar reveal-up">
          <Link href="/workshop" className="workshop-brand">
            <p className="workshop-brand__subtitle">炼金术文字冒险</p>
            <h1 className="workshop-brand__title">炼金工坊</h1>
          </Link>

          <div className="flex items-center gap-2">
            <WorkshopNav items={NAV_ITEMS} />
            <Link
              href="/"
              className="game-button hidden rounded-md border border-[#b79358]/50 bg-[#2f2418]/80 px-3 py-1.5 text-sm text-[#f2dfb8] hover:bg-[#443220] sm:inline-flex"
            >
              首页
            </Link>
          </div>
        </header>

        <main className="workshop-main reveal-up reveal-delay-1">{children}</main>
      </div>
      <RouteTransitionOverlay />
    </div>
  );
}
