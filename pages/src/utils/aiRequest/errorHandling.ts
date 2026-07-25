/**
 * HTTP 错误处理
 *
 * 负责从 Response 中提取结构化的错误消息。
 * 从 ai plugin 迁移，保持与上游同步。
 */

/**
 * 从 HTTP Response 中读取错误消息，支持多种格式：
 *  1. JSON 结构化错误：data.message / data.error.message / data.error
 *  2. 纯文本
 *  3. 回退到 statusText
 */
export async function readResponseErrorMessage(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    if (text) {
      try {
        const data = JSON.parse(text);
        const message = data?.message ?? data?.error?.message ?? data?.error;
        if (typeof message === "string" && message.trim()) {
          return message.trim();
        }
      } catch {
        // ignore JSON parse error
      }
      return text;
    }
  } catch {
    // ignore read error
  }
  return response.statusText || `HTTP ${response.status}`;
}
