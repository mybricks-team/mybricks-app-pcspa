/** 检查是否符合大驼峰命名规范 */
export function isValidPascalCase(name: string) {
  // 大驼峰命名规范：每个单词的首字母大写，无空格或特殊字符
  var pattern = /^[A-Z][a-zA-Z0-9]*$/;
  return pattern.test(name);
}

function isEmptyObj (obj: any) {
  if (!obj) return true
  if (typeof obj === 'object' && Object.keys(obj).length === 0) return true
  return false
}

function parseObject (str: string | object | undefined) {
  if (!str) return null
  const result = typeof str === 'string' ? JSON.parse(str) : str
  return result || null
}

export function getAppAiConfig (allConfig: any) {
  const appConfig = parseObject(allConfig[APP_NAME]?.config)
  const groupConfig = parseObject(Object.values<any>(allConfig).find(i => i?.appNamespace?.startsWith(`${APP_NAME}@group`))?.config)
  const aiConfig = isEmptyObj(groupConfig?.ai) ? appConfig?.ai : groupConfig?.ai
  return JSON.parse(decodeURIComponent(typeof aiConfig === 'string' ? aiConfig : JSON.stringify(aiConfig)))
}
