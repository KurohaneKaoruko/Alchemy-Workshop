import Link from "next/link";
import type { CSSProperties } from "react";

export default function Home() {
  const sparks = Array.from({ length: 16 }, (_, index) => {
    const style = {
      "--spark-x": `${(index * 23) % 100}%`,
      "--spark-delay": `${(index % 7) * -1.1}s`,
      "--spark-duration": `${11 + (index % 5) * 1.3}s`,
      "--spark-size": `${4 + (index % 4)}px`,
    } as CSSProperties;
    return <span key={`home-spark-${index}`} className="home-stage__spark" style={style} />;
  });

  return (
    <div>
      <section className="home-stage">
        <div className="home-stage__veil" />
        <div className="home-stage__grid" />
        <div className="home-stage__sigil-outer" />
        <div className="home-stage__sigil-inner" />
        {sparks}

        <div className="relative z-10 flex h-full flex-col px-4 py-4 sm:px-8 sm:py-6">
          <header className="home-topline reveal-up">
            <p className="text-xs tracking-[0.35em] text-[#f1ddaf]/90 uppercase">Text Adventure</p>
          </header>

          <main className="home-hero">
            <section className="home-copy reveal-up">
              <p className="home-copy__eyebrow">The Great Work Begins</p>
              <h1 className="home-copy__title">炼金工坊</h1>
              <p className="home-copy__lead">
                你将从底层学徒起步，在火、盐、硫、汞之间推导秩序。读《翠玉录》，破译定式，在等价交换的边界上持续逼近贤者之石。
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/workshop" className="home-cta home-cta--primary">
                  进入工坊
                </Link>
              </div>
            </section>

            <section className="home-sigil reveal-up reveal-delay-1" aria-hidden>
              <div className="home-sigil__disc" />
              <div className="home-sigil__disc home-sigil__disc--inner" />
              <div className="home-sigil__triangle" />
              <div className="home-sigil__triangle home-sigil__triangle--reverse" />
              <div className="home-sigil__core" />
              <p className="home-sigil__label">Verum · Aequivalentia · Magnum Opus</p>
            </section>
          </main>

          <section
            id="home-features"
            className="home-features reveal-up reveal-delay-2"
          >
            <article className="home-feature-card">
              <h2>文字叙事驱动</h2>
              <p>你将通过章节抉择、异象遭遇与炼成记录，逐步拼出完整的大工序。</p>
            </article>
            <article className="home-feature-card">
              <h2>AI 随机异象</h2>
              <p>启用 API 后自动接入 AI 叙事；不可用时回退内置事件，不中断流程。</p>
            </article>
            <article className="home-feature-card">
              <h2>魔法阵等价交换</h2>
              <p>自由投料，按同价值规则随机显化；命中定式时必定炼出指定成果。</p>
            </article>
          </section>
        </div>
      </section>

    </div>
  );
}
