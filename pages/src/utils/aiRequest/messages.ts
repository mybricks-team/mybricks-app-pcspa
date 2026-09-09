/**
 * Message 预处理
 *
 * 负责在发送给 LLM 之前对 messages 做两类处理：
 *  1. sanitizeMessages —— 移除内部扩展字段（status / errorType / cache / attachments）
 *  2. preprocessMessagesForModel —— 多模态附件预处理（user 上传 + tool result 产出）
 *
 * 从 ai plugin 迁移，保持与上游同步。
 */

import {
  MessageAttachment,
  attachmentToSupportedMessagePart,
  messagePartFilename,
  messagePartToInputKey,
} from "./attachments";
import { ModelCapabilityLike, isSupportedInput, unsupportedInputText } from "./modelCapabilities";

/**
 * 发送给 LLM 前清理 messages 中的内部扩展字段（status、errorType、cache 等），
 * 这些字段仅供 agent 内部使用，不是标准 OpenAI / Anthropic 消息格式的一部分。
 */
export function sanitizeMessages(messages: any[]): any[] {
  return messages.map((msg) => {
    // 移除不应发送到 API 的内部字段：
    // - status / errorType：工具调用状态，供内部感知用
    // - cache：prompt cache 标记，已在发送前转换为对应格式
    // - attachments：tool result 附件，已在 preprocessMessagesForModel 中处理，无需裸发
    const { status, errorType, cache, attachments: _attachments, ...rest } = msg;
    return rest;
  });
}

/**
 * 对发送给 LLM 的 messages 做多模态预处理（在 sanitizeMessages 之前调用）。
 *
 * 处理两类附件：
 *
 * 1. role=user 消息中的 image_url / file part（用户上传的图片、PDF）：
 *    - capabilities.input[modality]=true → 直接透传
 *    - capabilities.input[modality]=false → 替换为 ERROR 文本提示，告知 LLM 不支持
 *    - 图片 URL 和 data URL 都走 image_url.url
 *    - PDF/文件按 Chat Completions 的 file part 发送：filename + file_data
 *
 * 2. role=tool 消息中的 attachments 字段（工具执行产出的图片、PDF）：
 *    - attachments 内部格式支持 content/url，content 可为 data URL 或普通 URL
 *    - capabilities.toolResultMedia=true → 内嵌到 content 数组末尾
 *    - capabilities.toolResultMedia=false → 从 tool result 移出，在紧随其后注入合成 user 消息：
 *        { role: "user", content: [{ type: "text", text: "Attached file(s) from tool result:" }, ...mediaParts] }
 *
 * capabilities 不传时视为全支持，但仍会把 tool attachments 转成可发送的 content parts。
 *
 * @param messages 原始 messages（sanitize 之前）
 * @param capabilities 当前 model 的 ModelCapabilities；不传 = 全支持
 */
export function preprocessMessagesForModel(
  messages: any[],
  capabilities?: ModelCapabilityLike
): any[] {
  const result: any[] = [];
  let pendingMediaParts: any[] = [];

  for (const msg of messages) {
    // ── role=user：先把之前收集的 pending 附件注入，再过滤不支持的 file part ──────
    if (msg.role === "user") {
      if (pendingMediaParts.length > 0) {
        result.push({
          role: "user",
          content: [
            { type: "text", text: "Attached file(s) from tool result:" },
            ...pendingMediaParts,
          ],
        });
        pendingMediaParts = [];
      }

      const content = msg.content;
      if (!Array.isArray(content)) {
        result.push(msg);
        continue;
      }

      const filtered = content.map((part: any) => {
        if (part.type !== "image_url" && part.type !== "file" && part.type !== "image") {
          return part;
        }
        const inputKey = messagePartToInputKey(part);
        if (!inputKey) return part;

        if (isSupportedInput(inputKey, capabilities)) return part;

        return unsupportedInputText(inputKey, messagePartFilename(part));
      });

      result.push({ ...msg, content: filtered });
      continue;
    }

    // ── role=tool：处理 attachments 字段 ─────────────────────────────────────
    // attachments 格式：{ type: string; content?: string; url?: string; filename?: string }
    // 与 requestAI attachments / TurnRecord.userAttachments 对齐
    if (msg.role === "tool" && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
      const mediaAttachments: MessageAttachment[] = msg.attachments.filter(
        (a: any) => a?.content || a?.url
      );

      if (!mediaAttachments.length) {
        result.push(msg);
        continue;
      }

      const supportsToolResultMedia = capabilities?.toolResultMedia ?? true;

      const mediaParts = mediaAttachments.map((a) =>
        attachmentToSupportedMessagePart(a, capabilities)
      );

      if (supportsToolResultMedia) {
        // 内嵌到 tool result content 末尾
        const baseContent =
          typeof msg.content === "string"
            ? [{ type: "text", text: msg.content }]
            : Array.isArray(msg.content)
              ? msg.content
              : [{ type: "text", text: String(msg.content) }];
        const { attachments: _removed, ...rest } = msg;
        result.push({ ...rest, content: [...baseContent, ...mediaParts] });
      } else {
        // 不支持内嵌：收集到 pending，tool result 只发纯文本
        pendingMediaParts.push(...mediaParts);
        const { attachments: _removed, ...rest } = msg;
        result.push(rest);
      }
      continue;
    }

    result.push(msg);
  }

  // messages 末尾还有未注入的 pending 附件
  if (pendingMediaParts.length > 0) {
    result.push({
      role: "user",
      content: [
        { type: "text", text: "Attached file(s) from tool result:" },
        ...pendingMediaParts,
      ],
    });
  }

  return result;
}
