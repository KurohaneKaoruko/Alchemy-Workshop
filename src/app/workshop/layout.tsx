import Link from "next/link";
import { RouteTransitionOverlay } from "@/features/game/components/RouteTransitionOverlay";
import { WorkshopNav } from "@/features/game/components/WorkshopNav";
import { WorkshopSectionIndicator } from "@/features/game/components/WorkshopSectionIndicator";
import { WorkshopStatusMarquee } from "@/features/game/components/WorkshopStatusMarquee";

const NAV_ITEMS = [
  { href: "/workshop", label: "工坊总览" },
  { href: "/workshop/story", label: "剧情探索" },
  { href: "/workshop/alchemy", label: "魔法阵炼金" },
  { href: "/workshop/journal", label: "炼金档案" },
  { href: "/workshop/settings", label: "工坊设置" },
];

export default function WorkshopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="workshop-shell">
      <div className="workshop-shell__noise" />
      <div className="workshop-shell__diagram" />
      <div className="workshop-shell__aura workshop-shell__aura--left" />
      <div className="workshop-shell__aura workshop-shell__aura--right" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="workshop-topbar reveal-up">
          <div className="workshop-topbar__lead">
            <Link href="/workshop" className="workshop-brand">
              <span className="workshop-brand__crest" aria-hidden />
              <span className="workshop-brand__copy">
                <p className="workshop-brand__subtitle">Ritual Text Adventure</p>
                <h1 className="workshop-brand__title">炼金工坊</h1>
              </span>
            </Link>
            <WorkshopSectionIndicator />
          </div>

          <div className="workshop-topbar__actions">
            <WorkshopStatusMarquee />
            <WorkshopNav items={NAV_ITEMS} />
            <Link
              href="/"
              className="game-button inline-flex shrink-0 rounded-md border border-[#b79358]/50 bg-[#2f2418]/80 px-3 py-1.5 text-sm text-[#f2dfb8] hover:bg-[#443220]"
            >
              <span className="sm:hidden">首页</span>
              <span className="hidden sm:inline">返回首页</span>
            </Link>
          </div>
        </header>

        <main className="workshop-main reveal-up reveal-delay-1">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
      <RouteTransitionOverlay />
    </div>
  );
}
