/**
 * AI 设置本地存储层
 *
 * 对标 VSCode 插件的 globalState.get/update('aiSetting')，
 * 独立部署使用 localStorage 持久化用户配置的 LLM providers。
 */

const STORAGE_KEY = "taro-vibe-coding:ai-setting";

/**
 * 从 localStorage 读取 AI 设置
 */
export function getAISetting() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[AI Setting] 读取配置失败", err);
    return {};
  }
}

/**
 * 保存 AI 设置到 localStorage
 */
export function setAISetting(value): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (err) {
    console.error("[AI Setting] 保存配置失败", err);
    throw err;
  }
}
