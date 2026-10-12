# 炼金工坊

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
- `/api/ai/event`：AI 事件生成接口

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

## 构建与生产运行

```bash
npm run build
npm run start
```

注意：`npm run start` 只会启动生产服务器，不会自动构建。  
如果未先执行 `npm run build`，会出现 “Could not find a production build in the '.next' directory”。

## 质量命令

```bash
npm run lint
npm run test
```

## 配置说明

- AI 事件配置在游戏内 `AI 设置` 页面完成（Base URL / Model / API Key）。
- 未配置 AI 或连接失败时，系统自动使用内置事件，不会中断游戏。
- 音效支持开关与音量调节，配置保存在浏览器本地存储。

## 主要目录

```text
src/app/                     路由页面
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
