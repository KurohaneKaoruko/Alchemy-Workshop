import Link from "next/link";
import type { CSSProperties } from "react";

const FEATURE_CARDS = [
  {
    sigil: "I",
    title: "文字叙事驱动",
    description: "通过章节选择、随机异象与炼成记录，逐步拼出完整的大工秩序。",
  },
  {
    sigil: "II",
    title: "AI 异象回退",
    description: "启用 API 后接入 AI 叙事；不可用时自动回退内置事件，不中断流程。",
  },
  {
    sigil: "III",
    title: "魔法阵等价交换",
    description: "自由投料，按同价值规则显化结果；命中定式时必定炼出指定成果。",
  },
];

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
            <p className="text-xs uppercase tracking-[0.35em] text-[#f1ddaf]/90">Text Adventure</p>
            <span className="home-topline__divider" />
            <p className="text-xs uppercase tracking-[0.28em] text-[#f1ddaf]/65">Alchemy Chronicle</p>
          </header>

          <main className="home-hero">
            <section className="home-copy reveal-up">
              <p className="home-copy__eyebrow">The Great Work Begins</p>
              <h1 className="home-copy__title">炼金工坊</h1>
              <p className="home-copy__lead">
                你将从底层学徒起步，在火、盐、硫、汞之间推导秩序。阅读《翠玉录》，破译定式，
                在等价交换的边界上持续逼近贤者之石。
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/workshop" className="home-cta home-cta--primary">
                  进入工坊
                </Link>
                <a href="#home-features" className="home-cta home-cta--ghost">
                  查看工序
                </a>
              </div>
              <div className="home-copy__marks">
                <span className="home-copy__mark">章节推进</span>
                <span className="home-copy__mark">仪式炼成</span>
                <span className="home-copy__mark">档案回放</span>
              </div>
              <p className="home-copy__aside">
                现已支持章节探索、魔法阵投料、过场回顾与 AI 异象回退。
              </p>
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

          <section id="home-features" className="home-features reveal-up reveal-delay-2">
            {FEATURE_CARDS.map((card) => (
              <article key={card.title} className="home-feature-card">
                <p className="home-feature-card__sigil">{card.sigil}</p>
                <h2>{card.title}</h2>
                <p>{card.description}</p>
              </article>
            ))}
          </section>
        </div>
      </section>
    </div>
  );
}
