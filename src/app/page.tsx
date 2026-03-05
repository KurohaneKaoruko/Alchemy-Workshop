import Link from "next/link";
import type { CSSProperties } from "react";

export default function Home() {
  const embers = Array.from({ length: 14 }, (_, index) => {
    const style = {
      "--ember-left": `${(index * 19) % 100}%`,
      "--ember-delay": `${(index % 6) * -1.15}s`,
      "--ember-duration": `${10 + (index % 5) * 1.7}s`,
      "--ember-size": `${4 + (index % 3)}px`,
    } as CSSProperties;
    return <span key={`home-ember-${index}`} className="workshop-ember" style={style} />;
  });

  return (
    <div className="relative min-h-screen bg-[linear-gradient(160deg,#e9dfc8_0%,#d2bf92_45%,#9f8452_100%)] px-4 py-10 text-[#2d2412] sm:px-8">
      <div className="workshop-ambient">
        <div className="workshop-ambient__fog" />
        <div className="workshop-ambient__runes" />
        {embers}
      </div>

      <main className="relative mx-auto max-w-5xl">
        <section className="game-panel reveal-up rounded-3xl border border-[#6f5a31]/40 bg-[#f8f1de]/92 p-8 shadow-[0_24px_40px_rgba(60,44,16,0.25)]">
          <p className="text-sm uppercase tracking-[0.35em] text-[#6d5832]">Text Alchemy RPG</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">极简炼金工坊</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#4a3b20]">
            你将从底层学徒起步，在火、盐、硫、汞之间逐步掌握炼金秩序。阅读《翠玉录》、完成封印仪式、对抗反噬，最终炼出贤者之石。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/workshop"
              className="game-button rounded-xl border border-[#5f4a24] bg-[#e5ce95] px-5 py-2.5 text-sm font-semibold hover:bg-[#dcbf79]"
            >
              进入工坊
            </Link>
            <a
              href="#highlights"
              className="game-button rounded-xl border border-[#5f4a24]/60 bg-[#f9f4e6] px-5 py-2.5 text-sm hover:bg-[#efe3c6]"
            >
              查看玩法
            </a>
          </div>
        </section>

        <section id="highlights" className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="game-panel reveal-up reveal-delay-1 rounded-2xl border border-[#6f5a31]/35 bg-[#f9f3e3]/92 p-4">
            <h2 className="font-semibold">文字冒险主导</h2>
            <p className="mt-2 text-sm leading-7 opacity-85">
              剧情探索独立成页，你可专注推进章节与事件，不被其他面板打断。
            </p>
          </article>
          <article className="game-panel reveal-up reveal-delay-2 rounded-2xl border border-[#6f5a31]/35 bg-[#f9f3e3]/92 p-4">
            <h2 className="font-semibold">AI 随机事件</h2>
            <p className="mt-2 text-sm leading-7 opacity-85">
              你可自填模型与 Key。未配置时自动使用内置事件，不中断流程。
            </p>
          </article>
          <article className="game-panel reveal-up reveal-delay-3 rounded-2xl border border-[#6f5a31]/35 bg-[#f9f3e3]/92 p-4">
            <h2 className="font-semibold">魔法阵等价交换</h2>
            <p className="mt-2 text-sm leading-7 opacity-85">
              自由填料、按价值交换；满足定式时必定产出指定物质。
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
