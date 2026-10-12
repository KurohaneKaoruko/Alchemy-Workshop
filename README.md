# 炼金工坊 · Alchemy Workshop

一个文字冒险炼金游戏。本仓库为 **monorepo**，统一管理 **桌面端** 与 **Web 端** 两个平台。

玩家从学徒出发，通过剧情探索、随机异象与魔法阵炼成逐步提升境界，最终点化贤者之石。

## 仓库结构

```text
apps/
├── desktop/   Godot 4.7 桌面端（Windows 离线客户端）
└── web/       Next.js 16 Web 端（浏览器版）
```

| 平台 | 目录 | 技术栈 | 说明 |
| --- | --- | --- | --- |
| 桌面端 | `apps/desktop` | Godot 4.7 · GDScript | 离线可玩，可选 AI 异象增强 |
| Web 端 | `apps/web` | Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 | 浏览器版，含 AI 事件接口 |

## 快速开始

### 桌面端（Godot）

1. 安装 [Godot 4.7](https://godotengine.org/download)（标准版即可）。
2. 用 Godot 打开 `apps/desktop/project.godot`，按 F5 运行。
3. 本地一键出包（需先备好项目内引擎与导出模板）：

   ```powershell
   pwsh -File apps/desktop/tools/build.ps1
   ```

详见 [apps/desktop/README.md](apps/desktop/README.md)。

### Web 端（Next.js）

```bash
cd apps/web
npm install
npm run dev        # http://localhost:3000
```

生产构建与质量检查：

```bash
npm run build
npm run lint
npm run test
```

详见 [apps/web/README.md](apps/web/README.md)。

## 发布

- **桌面端**：推送 `v*` 标签触发 `.github/workflows/build.yml`，构建 Windows 版并上传 Artifacts。

  ```bash
  git tag v0.1.0 && git push origin v0.1.0
  ```

  版本号取自标签（并会与 `apps/desktop/project.godot` 的 `config/version` 校验一致性）。

- **Web 端**：在 Vercel 等平台部署时，将项目根目录指向 `apps/web`；或自建 Node 环境执行 `npm run build && npm run start`。

## 仓库约定

- 各平台自身的文件放在 `apps/<平台>/` 下，忽略规则就近维护在该目录的 `.gitignore`：
  - `apps/desktop/.gitignore` — Godot 生成物、本地引擎/导出模板、构建产物
  - `apps/web/.gitignore` — Node 依赖、Next.js 产物、环境变量
- 仓库级 `.gitattributes`、`.editorconfig` 作用于全部平台；前端缩进由 `apps/web/.editorconfig` 单独约束为 2 空格。
- 标签约定：桌面端用 `v*`；Web 端建议 `web-v*`，便于在 monorepo 中区分。
