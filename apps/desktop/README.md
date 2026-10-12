# 炼金工坊（桌面端）

> 本目录是 monorepo 中的**桌面端**工程：一个 **Tauri 外壳**，直接打包 `apps/web` 的静态产物。
> 游戏逻辑只有一份，位于 `apps/web`；本目录不含任何游戏代码。

## 设计取向

桌面端只做一件事 —— **把 Web 端装进一个原生窗口**：

- **体积小**：复用系统自带的 WebView2，安装包只有几 MB（Electron 约 150MB）
- **零重复**：改一次 `apps/web`，Web 端与桌面端同时生效
- **留有余地**：需要原生能力时，可通过 Tauri 插件/命令扩展

## 目录结构

```text
apps/desktop/
├── package.json          仅承载 Tauri CLI（游戏代码在 apps/web）
└── src-tauri/
    ├── Cargo.toml        Rust 依赖
    ├── tauri.conf.json   窗口、打包、前端产物路径等配置
    ├── capabilities/     权限（含 http 插件的可访问 URL 范围）
    ├── icons/            应用图标
    └── src/              main.rs / lib.rs
```

## 前置要求

- **Rust 工具链**（含 MSVC 构建工具；Windows 上需安装 Visual Studio 生成工具）
- **Node.js 20+**

## 开发

```bash
cd apps/desktop
npm install
npm run dev        # 自动拉起 apps/web 的 dev server，并打开桌面窗口
```

## 打包

```bash
cd apps/desktop
npm run build      # 先构建 apps/web 的静态导出，再打包桌面端
```

产物位于 `src-tauri/target/release/bundle/`：

- `nsis/*.exe` — Windows 安装包
- `msi/*.msi` — Windows MSI 安装包

## 与 Web 端的衔接

| 配置项 | 说明 |
| --- | --- |
| `build.frontendDist` | 指向 `../../web/out`，即 `apps/web` 的静态导出产物 |
| `build.beforeBuildCommand` | 打包前先执行 `npm --prefix ../web run build` |
| `build.devUrl` | 开发时指向 `http://localhost:3000` |

> Web 端使用 `output: "export"` + `trailingSlash: true`，导出为目录式静态文件，
> 桌面端刷新深层路径（如 `/workshop/story/`）时也能正确命中页面。

## AI 请求与 CORS

桌面端里 AI 请求由 **Rust 后端**发出（`tauri-plugin-http`），不受浏览器 CORS 限制，
因此在 Web 端可能因跨域失败的接口，在桌面端可以正常使用。

可访问的 URL 范围由 `src-tauri/capabilities/default.json` 中的 `http:default` scope 决定，
当前放开了 `https://**` 与 `http://**`（因为玩家可在设置页填写任意 OpenAI 兼容接口）。
如需收紧，改成具体域名即可，例如：

```json
{ "identifier": "http:default", "allow": [{ "url": "https://api.deepseek.com" }] }
```

客户端逻辑见 `apps/web/src/features/ai/client.ts`：运行在 Tauri 内时优先走插件 `fetch`，
否则走原生 `fetch`。
