const isPercentage = value => String(value).endsWith('%');

/** 判断是否是数字和字符串形式的数字 */
const isNumber = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num) && /^-?\d*\.?\d*$/.test(value);
}

export function checkValueType(value) {
  if (isPercentage(value)) {
    return 'percentage';
  } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
    return 'number';
  }
  return 'invalid';
}

/** 获取tptJson中合法的slot中的style */
export function getValidSlotStyle(style = undefined) {
  return {
    display: 'flex',
    position: 'inherit',
    flexDirection: style?.flexDirection ?? 'column',
    alignItems: style?.alignItems ?? 'flex-start',
    justifyContent: style?.justifyContent ?? 'flex-start',
    flexWrap: style?.flexWrap ?? 'no-wrap',
    columnGap: style?.columnGap ?? 0,
    rowGap: style?.rowGap ?? 0,
  }
}

/** 获取合法的宽高，返回值仅能为数字、百分比、auto、fit-content，否则为defaultValue */
export function getValidSizeValue(value, defaultValue: string | number = 0) {
  // 处理 null、undefined 或空字符串
  if (value === null || value === undefined || String(value).trim() === '') {
    return defaultValue;
  }

  // 将输入转换为字符串并去除空格
  const strValue = String(value).trim();

  // 处理特殊关键字
  if (['auto', 'fit-content'].includes(strValue)) {
    return strValue;
  }

  // 处理百分比
  if (isPercentage(strValue)) {
    return strValue
  }

  // 处理纯数字和带px的值
  const numStr = strValue.endsWith('px') ? strValue.slice(0, -2) : strValue;
  return isNumber(numStr) ? parseFloat(numStr) : defaultValue;
}

/** 
 * 将background转换为有效的backgroundColor和backgroundImage
 * @param styles 需要转换的样式对象
 */
export function transformToValidBackground(styles: any): void {
  // 兼容下把渐变色配置到backgroundColor的情况
  if (styles?.backgroundColor && styles?.backgroundColor?.indexOf('gradient') > -1) {
    const imageRegex = /(url\([^)]+\)|linear-gradient\([^)]+\)|radial-gradient\([^)]+\)|conic-gradient\([^)]+\))/;
    const imageMatch = styles.backgroundColor.match(imageRegex);

    if (imageMatch && !styles.backgroundImage) {
      styles.backgroundImage = imageMatch[0];
    }

    delete styles.backgroundColor
  }

  // 如果没有background属性,直接返回
  if (!styles.background) {
    return;
  }

  const background = styles.background.toString();

  // 提取颜色值
  // 匹配颜色格式: #XXX, #XXXXXX, rgb(), rgba(), hsl(), hsla(), 颜色关键字
  const colorRegex = /(#[0-9A-Fa-f]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|[a-zA-Z]+)/;
  const colorMatch = background.match(colorRegex);

  // 提取图片url或渐变
  // 匹配url()或各种渐变函数
  const imageRegex = /(url\([^)]+\)|linear-gradient\([^)]+\)|radial-gradient\([^)]+\)|conic-gradient\([^)]+\))/;
  const imageMatch = background.match(imageRegex);

  // 删除原有的background属性
  delete styles.background;

  // 如果找到颜色值,设置backgroundColor
  if (colorMatch && !styles.backgroundColor) {
    styles.backgroundColor = colorMatch[0];
  }

  // 如果找到图片或渐变,设置backgroundImage
  if (imageMatch && !styles.backgroundImage) {
    styles.backgroundImage = imageMatch[0];
  }
}

/**
 * 将margin简写转换为marginTop/Right/Bottom/Left
 * @param styles 需要转换的样式对象
 */
export function transformToValidMargins(styles: any): void {
  // 如果没有margin属性,直接返回
  if (!styles.margin) {
    return;
  }

  const margin = styles.margin.toString().trim();
  const values = margin.split(/\s+/); // 按空格分割

  // 根据值的数量设置不同方向的margin
  switch (values.length) {
    case 1: // margin: 10px;
      styles.marginTop = values[0];
      styles.marginRight = values[0];
      styles.marginBottom = values[0];
      styles.marginLeft = values[0];
      break;
    case 2: // margin: 10px 20px;
      styles.marginTop = values[0];
      styles.marginRight = values[1];
      styles.marginBottom = values[0];
      styles.marginLeft = values[1];
      break;
    case 3: // margin: 10px 20px 30px;
      styles.marginTop = values[0];
      styles.marginRight = values[1];
      styles.marginBottom = values[2];
      styles.marginLeft = values[1];
      break;
    case 4: // margin: 10px 20px 30px 40px;
      styles.marginTop = values[0];
      styles.marginRight = values[1];
      styles.marginBottom = values[2];
      styles.marginLeft = values[3];
      break;
  }

  // 删除原有的margin属性
  delete styles.margin;
}

/**
 * 将padding简写转换为paddingTop/Right/Bottom/Left
 * @param styles 需要转换的样式对象
 */
export function transformToValidPaddings(styles: any): void {
  // 如果没有padding属性,直接返回
  if (!styles.padding) {
    return;
  }

  const padding = styles.padding.toString().trim();
  const values = padding.split(/\s+/); // 按空格分割

  // 根据值的数量设置不同方向的padding
  switch (values.length) {
    case 1: // padding: 10px;
      styles.paddingTop = values[0];
      styles.paddingRight = values[0];
      styles.paddingBottom = values[0];
      styles.paddingLeft = values[0];
      break;
    case 2: // padding: 10px 20px;
      styles.paddingTop = values[0];
      styles.paddingRight = values[1];
      styles.paddingBottom = values[0];
      styles.paddingLeft = values[1];
      break;
    case 3: // padding: 10px 20px 30px;
      styles.paddingTop = values[0];
      styles.paddingRight = values[1];
      styles.paddingBottom = values[2];
      styles.paddingLeft = values[1];
      break;
    case 4: // padding: 10px 20px 30px 40px;
      styles.paddingTop = values[0];
      styles.paddingRight = values[1];
      styles.paddingBottom = values[2];
      styles.paddingLeft = values[3];
      break;
  }

  // 删除原有的padding属性
  delete styles.padding;
}

/** 如果maring直接配置-20这种情况，为不合理的语法，babel会转换成特定对象 */
export function fixCompileErrorStyle(cssProps = {}) {
  // 遍历所有属性
  for (const key in cssProps) {
    const value = cssProps[key];

    // 检查是否是UnaryExpression对象
    if (typeof value === 'object' && value !== null && value.type === 'UnaryExpression') {
      // 检查是否是负数表达式
      if (value.operator === '-' &&
        value.prefix &&
        value.argument.type === 'NumericLiteral') {

        // 直接修改原对象的值为负数
        cssProps[key] = -value.argument.value;
      }
    }
  }
}



/** 转换成合法的 mybricks css 样式 */
export function transformToValidCssStyle(cssProperties) {
  if (!cssProperties) {
    return {}
  }
  transformToValidBackground(cssProperties)
  transformToValidMargins(cssProperties)
  transformToValidPaddings(cssProperties)
}

/** 转换成合法的 mybricks styleAry 样式 */
export function transformToValidStyleAry(styleAry) {
  if (!Array.isArray(styleAry)) {
    return styleAry
  }
  styleAry.forEach(config => {
    transformToValidCssStyle(config?.css)
  })
}

export function uuid() {
  // 定义字符集，包含大小写字母和数字
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  // 初始化结果字符串，以 'u_' 开头
  let result = 'u_';
  // 循环 5 次，随机选择字符集中的字符拼接到结果字符串中
  for (let i = 0; i < 5; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  // 返回生成的 ID
  return result;
}