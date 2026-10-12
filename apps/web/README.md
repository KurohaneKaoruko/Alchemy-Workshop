# 炼金工坊（Web 端）

> 本目录是 monorepo 中的 **Web 端**工程，仓库根说明见 [../../README.md](../../README.md)。
> 所有命令默认在本目录（`apps/web`）下执行。

一个基于 Next.js 的文字冒险炼金游戏。  
玩家从学徒出发，通过剧情探索、随机事件与魔法阵炼成逐步提升境界，最终完成贤者之石。

## 核心玩法

- 剧情探索：每回合消耗行动点，提升知识/熟练/名望并触发章节推进。
- 魔法阵炼金：自由投入材料，按等价值规则随机显化产物；命中特定定式必定产出指定物。
- 随机事件：支持 AI 叙事事件（可在设置页配置），失败时自动回退内置事件。
- 境界成长：学徒 -> 炼金士 -> 大炼金士 -> 贤者候补 -> 最强炼金术师。
- 演出系统：章节开场、随机事件演出、晋升过场、终局仪式、过场回顾重播。

## 页面结构

- `/`：首页（游戏展示与入口）
- `/workshop`：工坊总览
- `/workshop/story`：剧情探索
- `/workshop/alchemy`：魔法阵炼金
- `/workshop/journal`：炼金档案与过场回顾
- `/workshop/settings`：AI 与音效设置

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 启动开发环境

```bash
npm run dev
```

3. 打开浏览器

```text
http://localhost:3000
```

## 构建与本地预览

```bash
npm run build      # 静态导出到 out/
npm run preview    # 用 Cloudflare Pages 本地运行时预览 out/
```

本项目为**纯静态导出**（`next.config.ts` 中的 `output: "export"`），`npm run build`
会直接生成静态站点到 `out/`，因此没有 `next start`。本地预览请用 `npm run preview`，
或用任意静态服务器托管 `out/`。

## 部署到 Cloudflare Pages

仓库为 monorepo，Web 端位于 `apps/web`。

### 方式一：连接 Git 自动部署（推荐）

在 Cloudflare 控制台 **Workers & Pages → Create → Pages → Connect to Git**，
选中本仓库后填写：

| 配置项 | 值 |
| --- | --- |
| Root directory | `apps/web` |
| Build command | `npm run build` |
| Build output directory | `out` |

之后每次推送到 `main` 都会自动重新构建发布。

### 方式二：本地直传

```bash
npm run build
npm run deploy     # wrangler pages deploy out
```

`deploy` 脚本里的 `--project-name` 默认为 `alchemy-workshop`，可按需改成你自己的 Pages 项目名。

> 注：Cloudflare Pages 会自动把 `xxx.html` 映射到不带后缀的 `/xxx`，无需额外配置重写规则。

## 质量命令

```bash
npm run lint
npm run test
```

## 配置说明

- AI 事件配置在游戏内 `AI 设置` 页面完成（Base URL / Model / API Key）。
- 网页版是纯静态站点，AI 请求由浏览器**直接**发往你填写的接口，不经过任何中间服务器，
  因此该接口必须允许跨域（CORS）访问；被拒绝时连接测试会给出提示，游戏自动回退内置事件。
- 未配置 AI 或连接失败时，系统自动使用内置事件，不会中断游戏。
- 音效支持开关与音量调节，配置保存在浏览器本地存储。

## 主要目录

```text
src/app/                     路由页面（静态导出）
src/features/ai/             AI 叙事客户端（浏览器直连接口）
src/features/game/           游戏状态、逻辑、组件
src/features/events/         随机事件引擎与内置事件
src/features/storage/        本地存档、偏好、过场档案
```

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Vitest
- 部署：Cloudflare Pages（纯静态导出）
