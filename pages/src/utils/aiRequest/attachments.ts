/**
 * Attachment 处理
 *
 * 负责将各种来源的附件（image / pdf / file）识别类型并转换为
 * OpenAI Chat Completions 兼容的 message part。
 * 从 ai plugin 迁移，保持与上游同步。
 */

import {
  AttachmentInputKey,
  ModelCapabilityLike,
  isSupportedInput,
  unsupportedInputText,
} from "./modelCapabilities";

export type MessageAttachment = {
  type?: string;
  content?: string;
  url?: string;
  filename?: string;
  title?: string;
  mime?: string;
  mediaType?: string;
};

/**
 * 将附件类型或 MIME 映射到 ModelCapabilities.input 的字段名。
 * 返回 undefined 表示无需做当前能力判断。
 */
export function attachmentTypeToInputKey(type?: string): AttachmentInputKey | undefined {
  if (!type) return undefined;
  if (type === "image" || type.startsWith("image/")) return "image";
  if (type === "pdf" || type === "application/pdf") return "pdf";
  return undefined;
}

export function getDataUrlMime(value?: string): string | undefined {
  if (!value?.startsWith("data:")) return undefined;
  return value.split(";")[0].replace("data:", "") || undefined;
}

export function isHttpUrl(value?: string): boolean {
  return !!value && /^https?:\/\//i.test(value);
}

export function inferMimeFromUrl(value?: string): string | undefined {
  if (!value || !isHttpUrl(value)) return undefined;
  try {
    const pathname = new URL(value).pathname.toLowerCase();
    if (/\.(png|jpe?g|webp|gif)$/.test(pathname)) return "image";
    if (/\.pdf$/.test(pathname)) return "application/pdf";
  } catch {
    return undefined;
  }
  return undefined;
}

function getAttachmentResource(attachment: MessageAttachment): string {
  return attachment.url ?? attachment.content ?? "";
}

export function getAttachmentInputKey(attachment: MessageAttachment): AttachmentInputKey | undefined {
  const resource = getAttachmentResource(attachment);
  return (
    attachmentTypeToInputKey(attachment.type) ??
    attachmentTypeToInputKey(attachment.mime) ??
    attachmentTypeToInputKey(attachment.mediaType) ??
    attachmentTypeToInputKey(getDataUrlMime(resource)) ??
    attachmentTypeToInputKey(inferMimeFromUrl(resource))
  );
}

export function messagePartToInputKey(part: any): AttachmentInputKey | undefined {
  if (part.type === "image" || part.type === "image_url") {
    const rawMime = getDataUrlMime(part.image_url?.url ?? part.url ?? part.content);
    const urlMime = inferMimeFromUrl(part.image_url?.url ?? part.url ?? part.content);
    return attachmentTypeToInputKey(part.semanticType ?? rawMime ?? urlMime ?? "image");
  }
  if (part.type === "file") {
    const rawMime = getDataUrlMime(part.file?.file_data ?? part.file?.url ?? part.content);
    return attachmentTypeToInputKey(part.semanticType ?? part.mime ?? part.mediaType ?? rawMime);
  }
  return undefined;
}

export function messagePartFilename(part: any): string | undefined {
  return part.filename ?? part.file?.filename;
}

/**
 * 将附件转换为标准的 OpenAI message part（不做能力判断）。
 */
export function attachmentToMessagePart(attachment: MessageAttachment): any {
  const content = getAttachmentResource(attachment);
  const filename = attachment.filename ?? attachment.title;
  const inputKey = getAttachmentInputKey(attachment);

  if (inputKey === "image") {
    return {
      type: "image_url" as const,
      image_url: { url: content, detail: "auto" },
    };
  }

  if (inputKey === "pdf") {
    if (isHttpUrl(content)) {
      return {
        type: "text" as const,
        text: `Attached PDF URL${filename ? ` (${filename})` : ""}: ${content}`,
      };
    }

    return {
      type: "file" as const,
      file: {
        filename: filename ?? "attachment.pdf",
        file_data: content,
      },
      semanticType: "pdf",
    };
  }

  if (isHttpUrl(content)) {
    return {
      type: "text" as const,
      text: `Attached file URL${filename ? ` (${filename})` : ""}: ${content}`,
    };
  }

  return {
    type: "file" as const,
    file: {
      filename: filename ?? "attachment",
      file_data: content,
    },
  };
}

/**
 * 将附件转换为 message part，并根据模型能力过滤不支持的类型。
 */
export function attachmentToSupportedMessagePart(
  attachment: MessageAttachment,
  capabilities?: ModelCapabilityLike
): any {
  const filename = attachment.filename ?? attachment.title;
  const inputKey = getAttachmentInputKey(attachment);

  if (!isSupportedInput(inputKey, capabilities)) {
    return unsupportedInputText(inputKey!, filename);
  }

  return attachmentToMessagePart(attachment);
}
