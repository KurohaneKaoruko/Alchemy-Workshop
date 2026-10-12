import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出：构建产物输出到 out/，可直接托管在 Cloudflare Pages 等静态平台。
  // 注意：静态导出不支持路由处理器（Route Handler）与图片优化，
  // 因此 AI 异象改为浏览器直连用户配置的 OpenAI 兼容接口（见 src/features/ai/client.ts）。
  output: "export",
  // 目录式导出（workshop/story/index.html），对静态托管与 Tauri 桌面外壳都更友好：
  // 刷新 /workshop/story/ 这类深层路径时，两端都能正确命中页面。
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
