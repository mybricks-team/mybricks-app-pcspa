import type { ModelCapabilities, RequestAsStreamParams, ToolDescriptor } from "@/types";
import { readSSEStream } from "./SSEParser";
// 当前 preprocessMessagesForModel， sanitizeMessages 和"@mybricks/plugin-ai" 方法完全一致 ，只是"@mybricks/plugin-ai" 没有导出
// 所以这里写到了本地
import { preprocessMessagesForModel, sanitizeMessages } from "./messages";
import { readResponseErrorMessage } from "./errorHandling";

export type CustomRequestConfig = {
  url: string;
  method?: string;
  credentials?: RequestCredentials;
  extraHeaders?: Record<string, string>;
  getBody?: (args: {
    params: RequestAsStreamParams;
    extendParams: { model: string; role: string; turnId?: string };
  }) => unknown | Promise<unknown>;
};

function transfromExtendParams(extendParams: {
  aiRole?: string;
  turnId?: string;
  providerId?: string;
  modelId?: string;
}) {
  const { aiRole = "default", turnId , providerId, modelId} = extendParams;
  const model =  modelId || process.env.MANATEEAI_DEFAULT_MODEL || undefined;

  return { model, role: aiRole, turnId, providerId };
}

function getFileIdFromUrl(): string | undefined {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id") || undefined;
  } catch {
    return undefined;
  }
}

function isAbortError(ex: unknown): boolean {
  return (
    (ex instanceof DOMException && ex.name === "AbortError") ||
    (ex instanceof Error && ex.message.toLowerCase().includes("aborted"))
  );
}

function formatRequestBody(
  _format: "openai" | "anthropic",
  messages: any[],
  model?: string,
  tools?: ToolDescriptor[],
  extraParams?: Record<string, any>
): any {
  // 当前仅支持 openai 格式
  return {
    model,
    messages,
    stream: true,
    ...(tools?.length
      ? {
          tools: tools.map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters ?? { type: "object", properties: {} },
            },
          })),
        }
      : {}),
    ...extraParams,
  };
}

function buildDefaultBody(
  params: RequestAsStreamParams,
  extendParams: { model: string; role: string; turnId?: string },
) {
  // 先预处理多模态附件，再清理内部字段
  const preprocessed = preprocessMessagesForModel(params.messages, params.capabilities);
  const sanitized = sanitizeMessages(preprocessed);

  return formatRequestBody(
    "openai",
    sanitized,
    extendParams.model,
    params.tools,
    {
      role: extendParams.role,
      turnId: extendParams.turnId,
    }
  );
}

function buildDefaultHeaders(
  extendParams: { model: string; role: string; turnId?: string },
  fileId?: string,
  extraHeaders?: Record<string, string>,
) {
  return {
    "Content-Type": "application/json",
    ...(extendParams.role ? { "M-Request-Role": extendParams.role } : {}),
    ...(extendParams.turnId ? { "m-request-turn": extendParams.turnId } : {}),
    ...(fileId ? { "m-request-fileId": fileId } : {}),
    ...(extraHeaders ?? {}),
  };
}

/**
 * 自定义 AI 请求入口：按 requestAsStreamForProductionSSE 的方式组装请求，
 * 只负责发请求，SSE 解析统一走 parser。
 */
export function requestAsStream(config: CustomRequestConfig) {
  const {
    url,
    method = "POST",
    credentials = "include",
    extraHeaders,
    getBody,
  } = config;

  return async function (params: RequestAsStreamParams) {
    const { emits, aiRole, turnId, model, capabilities } = params;
    const { modelId, providerId} = model
    const {
      cancel,
      write,
      complete,
      error,
      onUsage,
      onThinking,
      onToolCalls,
      onToolCallStream,
      onFinishReason,
    } = emits;

    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    try {
      const extendParams = transfromExtendParams({ aiRole, turnId, providerId, modelId  });
      const fileId = getFileIdFromUrl();
      const body = getBody
        ? await Promise.resolve(getBody({ params, extendParams }))
        : buildDefaultBody(params, extendParams);

      const response = await fetch(url, {
        signal: controller.signal,
        method,
        credentials,
        headers: buildDefaultHeaders(extendParams, fileId, extraHeaders),
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      cancel(() => controller.abort());

      if (!response.ok) {
        const message = await readResponseErrorMessage(response);
        error(new Error(message));
        return;
      }
      reader = response.body!.getReader();
      await readSSEStream({
        reader,
        write,
        complete,
        onUsage,
        onThinking,
        onToolCalls,
        onToolCallStream,
        onFinishReason,
      });
    } catch (ex) {
      if (isAbortError(ex)) return;
      error(ex);
    } finally {
      // await reader?.cancel();
    }
  };
}
