# 炼金工坊 · Alchemy Workshop

一个文字冒险炼金游戏。本仓库为 **monorepo**，一份游戏代码同时产出 **Web 端** 与 **桌面端**。

玩家从学徒出发，通过剧情探索、随机异象与魔法阵炼成逐步提升境界，最终点化贤者之石。

## 仓库结构

```text
apps/
├── web/       游戏本体：Next.js 16 静态站点（浏览器版，也是桌面端的前端）
└── desktop/   桌面外壳：Tauri 2，直接打包 apps/web 的静态产物
```

| 平台 | 目录 | 技术栈 | 说明 |
| --- | --- | --- | --- |
| Web 端 | `apps/web` | Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 | 纯静态导出，部署到 Cloudflare Pages |
| 桌面端 | `apps/desktop` | Tauri 2 · Rust | 复用系统 WebView2，安装包仅几 MB |

> 桌面端采用「Web 端 + Tauri 外壳」：游戏逻辑只有一份，两端表现完全一致。

## 快速开始

### Web 端（Next.js）

```bash
cd apps/web
npm install
npm run dev        # http://localhost:3000
```

生产构建与质量检查：

```bash
npm run build      # 静态导出到 out/
npm run preview    # 本地预览（Cloudflare Pages 运行时）
npm run lint
npm run test
```

详见 [apps/web/README.md](apps/web/README.md)。

### 桌面端（Tauri）

需要 Rust 工具链（含 MSVC 构建工具）与 Node.js 20+。

```bash
cd apps/desktop
npm install
npm run dev        # 自动拉起 web dev server 并打开桌面窗口
npm run build      # 打包安装包（会先构建 apps/web）
```

详见 [apps/desktop/README.md](apps/desktop/README.md)。

## 发布

- **Web 端**：纯静态导出，部署到 Cloudflare Pages。在控制台连接本仓库后设置
  根目录 `apps/web`、构建命令 `npm run build`、输出目录 `out` 即可；
  也可本地执行 `npm run deploy` 直传。详见 [apps/web/README.md](apps/web/README.md)。

- **桌面端**：推送 `v*` 标签触发 `.github/workflows/build.yml`，在 Windows runner 上
  构建 Tauri 安装包（NSIS / MSI）并上传 Artifacts。

  ```bash
  git tag v0.1.0 && git push origin v0.1.0
  ```

## 仓库约定

- 各平台自身的文件放在 `apps/<平台>/` 下，忽略规则就近维护在该目录的 `.gitignore`：
  - `apps/web/.gitignore` — Node 依赖、Next.js 产物、环境变量
  - `apps/desktop/.gitignore` — Node 依赖、Rust `target/`
- 仓库级 `.gitattributes`、`.editorconfig` 作用于全部平台；前端缩进由 `apps/web/.editorconfig` 单独约束为 2 空格。
- 标签约定：桌面端用 `v*`；Web 端建议 `web-v*`，便于在 monorepo 中区分。
- **两端共用同一份前端代码**：改动 `apps/web` 后 Web 端与桌面端同时生效，不要再另写一套界面实现。
