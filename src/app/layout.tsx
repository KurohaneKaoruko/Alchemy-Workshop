import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "极简炼金工坊",
  description: "以炼金术为主题的文字冒险网页游戏，含 AI 随机事件与离线回退模式。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
