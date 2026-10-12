/**
 * OpenAI 兼容接口 `/chat/completions` 的最小响应结构。
 * 静态部署下由浏览器直连该接口，不再经过 Next.js 路由处理器。
 */
export interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}
