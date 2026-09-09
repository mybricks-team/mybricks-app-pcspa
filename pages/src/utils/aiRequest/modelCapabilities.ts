/**
 * Model Capabilities
 *
 * 定义模型能力检查相关的类型和工具函数。
 * 从 ai plugin 迁移，保持与上游同步。
 */

export type AttachmentInputKey = "image" | "pdf";

export type ModelCapabilityLike = {
  input?: {
    image?: boolean;
    pdf?: boolean;
  };
  toolResultMedia?: boolean;
};

/**
 * 检查模型是否支持指定类型的输入
 */
export function isSupportedInput(
  inputKey: AttachmentInputKey | undefined,
  capabilities?: ModelCapabilityLike
): boolean {
  if (!inputKey) return true;
  return capabilities?.input?.[inputKey] ?? true;
}

/**
 * 生成不支持输入类型的错误文本（告知 LLM）
 */
export function unsupportedInputText(inputKey: AttachmentInputKey, filename?: string): any {
  const name = filename ? `"${filename}"` : inputKey;
  return {
    type: "text",
    text: `ERROR: Cannot read ${name} (this model does not support ${inputKey} input). Inform the user.`,
  };
}
