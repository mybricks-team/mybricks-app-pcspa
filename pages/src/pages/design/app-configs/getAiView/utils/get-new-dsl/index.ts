
import { checkValueType, getValidSlotStyle, getValidSizeValue, transformToValidBackground, transformToValidStyleAry, fixCompileErrorStyle, uuid } from './helper'
export { getDSLPrompts, getSystemPrompts } from './prompt'

/**
 * @description Json遍历器，支持对不同类型的节点注册修改函数
 */
class DslJsonTraversal {
  /** 不同节点的修改器函数 */
  modifiers = new Map()

  // 注册修改器函数
  registerModifier(namespace, modifier) {
    this.modifiers.set(namespace, modifier);
  }

  // 遍历处理函数
  traverse(node) {
    if (!node) return;

    const modifier = this.modifiers.get('root');
    modifier?.(node);

    // 处理根节点的comAry
    if (node.comAry) {
      node.comAry.forEach(component => this.traverseComponent(component));
    }
  }

  // 遍历组件节点
  private traverseComponent(component) {
    if (!component) return;

    const modifierBefore = this.modifiers.get('component:before');
    modifierBefore?.(component);

    // 检查是否有对应的修改器
    if (component.namespace && this.modifiers.has(component.namespace)) {
      const modifier = this.modifiers.get(component.namespace);
      // 执行修改
      modifier?.(component);
    }

    const modifierAfter = this.modifiers.get('component:after');
    modifierAfter?.(component);

    // 继续遍历slots
    if (component.slots) {
      Object.values(component.slots).forEach(slot => this.traverseSlot(slot));
    }

    if (component.comAry) {
      component.comAry.forEach(com => this.traverseComponent(com));
    }
  }

  // 遍历slot节点
  private traverseSlot(slot) {
    if (!slot) return;

    // 处理slot中的comAry
    if (slot.comAry) {
      slot.comAry.forEach(component => this.traverseComponent(component));
    }

    const modifier = this.modifiers.get('slot');
    modifier?.(slot);
  }
}

/** 处理所有组件的通用CSS样式 */
function polyfillComponentStyAry(styleAry) {
  if (!Array.isArray(styleAry)) {
    return
  }
  styleAry.forEach(item => {
    const css = item.css
    Object.keys(css).forEach(key => {
      if (['borderRadius', 'fontSize', 'padding', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'border-width'].includes(key) && checkValueType(css[key]) === 'number') {
        css[key] = css[key] + 'px'
      }
    })

  })
}

/** 处理所有组件的搭建样式 */
function polyfillComponentStyle(style) {
  if (!style) {
    return
  }

  if (style?.width === '100%') {
    style.widthFull = true
    style.widthAuto = false
  }
  if (checkValueType(style.width) === 'number') {
    style.widthFull = false
    style.widthAuto = false
    style.widthFact = style.width
  }
  if (style.width === 'fit-content') {
    style.widthFull = false
    style.widthAuto = true
  }


  if (!style.height) {
    style.height = 'fit-content'
  }
  if (style?.height === '100%') {
    style.heightFull = true;
    style.heightAuto = false
  }
  if (checkValueType(style.height) === 'number') {
    style.heightFull = false
    style.heightAuto = false
    style.heightFact = style.height
  }
  if (style.height === 'fit-content') {
    style.heightFull = false
    style.heightAuto = true
  }


  delete style.layout;
  delete style.justifyContent;
  delete style.flexDirection;
  delete style.alignItems;
  return style
}

/** 当组件出现幻觉使用了flex1时 */
function polyfillWhenComponentUseFlex(component) {
  if (Array.isArray(component?.comAry)) {
    const findIndex = component?.comAry.findIndex(com => com.namespace !== 'flex' && com?.style?.flex !== undefined);
    if (findIndex > -1) {
      const targerComp = component.comAry[findIndex];

      component.comAry = component.comAry.map(com => {
        if (com === targerComp) {
          return {
            id: uuid(),
            title: '占满剩余宽度',
            namespace: 'flex',
            style: {
              flex: 1,
              flexDirection: 'row',
              height: targerComp.style?.height
            },
            comAry: [targerComp]
          }
        }
        return com
      })
      delete targerComp.style.flex
      targerComp.style.width = '100%'
    }
  }
}

const traversal = new DslJsonTraversal();

// 添加对根结点的处理
traversal.registerModifier('root', (root) => {
  console.log("[registerModifier - root]", root)
  if (!root.style) {
    root.style = {}
  }
  root.style = {
    ...root.style,
    layout: root.style?.flexDirection === 'row' ? 'flex-row' : 'flex-column',
    flexDirection: root.style?.flexDirection === 'row' ? 'row' : 'column'
  }
})

// 添加对插槽的处理
traversal.registerModifier('slot', (slot) => {
  console.log("[registerModifier - slot]", slot)
  if (!slot.style) {
    slot.style = {}
  }
  slot.style = {
    ...slot.style,
    layout: slot.style?.flexDirection === 'row' ? 'flex-row' : 'flex-column',
    flexDirection: slot.style?.flexDirection === 'row' ? 'row' : 'column',
    width: slot.style?.width ?? '100%',
    height: slot.style?.height ?? 'fit-content'
  }
})

// 添加对所有组件的样式兼容
traversal.registerModifier('component:before', (component) => {
  fixCompileErrorStyle(component.style ?? {})
  polyfillWhenComponentUseFlex(component)
  transformToValidStyleAry(component?.style?.styleAry)
})

// 添加对所有组件的通用处理
traversal.registerModifier('component:after', (component) => {
  polyfillComponentStyle(component.style)
  polyfillComponentStyAry(component.style?.styleAry)
})

// 添加对flex节点的处理
traversal.registerModifier('flex', (component) => {
  console.log('[registerModifier - flex]', component)
  if (component?.style?.styleAry) {
    component?.style?.styleAry?.forEach?.(item => {
      if (!item.css) {
        item.css = {}
      }
      // [TODO] 幻觉处理
      if (item.css.margin) {
        delete item.css.margin
      }
    })
  }

  // 处理幻觉
  if (component.style?.paddingLeft) {
    component.style.marginLeft = component.style?.paddingLeft
    delete component.style?.paddingLeft
  }
  if (component.style?.paddingRight) {
    component.style.marginRight = component.style?.paddingRight
    delete component.style?.paddingRight
  }

  // 处理绝对定位兼容
  const rootStyle = component?.style?.styleAry?.find?.(s => s.selector === ':root')?.css
  if (rootStyle?.position === 'absolute') {
    component.style.position = rootStyle.position;

    if (rootStyle.left) {
      component.style.left = rootStyle.left
      delete rootStyle.left
    }
    if (rootStyle.right) {
      component.style.right = rootStyle.right
      delete rootStyle.right
    }
    if (rootStyle.top) {
      component.style.top = rootStyle.top
      delete rootStyle.top
    }
    if (rootStyle.bottom) {
      component.style.bottom = rootStyle.bottom
      delete rootStyle.bottom
    }

    delete rootStyle.position
  }

  const shouldTransformToGrid = component.style?.flexDirection === 'row' && component?.comAry?.some(com => {
    return !!com.style.flex || (checkValueType(com.style?.width) === 'percentage' && com.style?.width !== '100%')
  })

  if (shouldTransformToGrid) {
    const { justifyContent = 'flex-start', alignItems = 'flex-start', columnGap = 0 } = component.style ?? {};
    component.namespace = 'mybricks.basic-comlib.antd5.grid'

    const heightProps = {
      height: '100%',
      mode: 'auto'
    }
    switch (true) {
      case component.style?.height === 'fit-content': {
        delete heightProps.height;
        heightProps.mode = 'auto';
        break
      }
    }

    component.data = {
      rows: [
        {
          cols: component?.comAry?.map((com, index) => {
            const comStyle = com.layout ?? com.style

            const base: any = {
              key: `col${index}`,
              isDragging: false,
              isHover: false,
              slotStyle: getValidSlotStyle(),
              style: {
                height: comStyle?.height || 'auto'
              }
            }

            const widthType = checkValueType(getValidSizeValue(comStyle?.width))

            switch (true) {
              case comStyle?.flex === 1: {
                base.width = 50
                base.widthMode = 'auto'
                break
              }
              case comStyle?.width === undefined || comStyle.width === null: {
                base.width = 50
                base.widthMode = 'fit-content'
                break
              }
              case comStyle?.width === 'fit-content': {
                base.width = 50
                base.widthMode = 'fit-content'
                break
              }
              case widthType === 'percentage': {
                base.width = parseFloat(getValidSizeValue(comStyle?.width) as any)
                base.widthMode = '%'
                break
              }
              case widthType === 'number': {
                base.width = getValidSizeValue(comStyle?.width)
                base.widthMode = 'px'
                break
              }
            }

            delete comStyle?.flex;

            return base
          }),
          key: 'row0',
          ...heightProps,
          style: {
            justifyContent,
            alignItems,
            columnGap
          }
        }
      ]
    }
    component?.comAry?.forEach((com, index) => {
      if (!component.slots) {
        component.slots = {}
      }
      component.slots[`col${index}`] = {
        id: `col${index}`,
        title: `列${index}`,
        comAry: [com],
        style: {
          width: '100%',
          height: com.style?.height
        }
      }
      com.style.width = '100%'
    })
    component.comAry = undefined
    delete component.comAry

    return
  }

  // 处理textAlign幻觉
  if (rootStyle?.textAlign) {
    if (component.style?.flexDirection === 'column') {
      component.style.alignItems = 'center'
    }
    if (component.style?.flexDirection === 'row') {
      component.style.justifyContent = 'center'
    }
  }

  if (component.style?.flexDirection === 'column' || component.style?.flexDirection === 'row') {
    component.namespace = 'mybricks.normal-pc.antd5.custom-container'
    if (!component.data) {
      component.data = {}
    }

    let slotWidth = getValidSizeValue(component.style?.width, '100%')
    if (checkValueType(slotWidth) === 'number') {
      slotWidth = '100%'
    }

    let slotHeight = getValidSizeValue(component.style?.height, 'auto')
    if (checkValueType(slotHeight) === 'number') {
      slotHeight = '100%'
    }

    component.data.slotStyle = getValidSlotStyle(component.style)
    component.slots = {
      content: {
        id: 'content',
        title: component.title ? `${component.title}插槽` : '内容',
        style: {
          width: slotWidth,
          height: slotHeight,
          flexDirection: component.style.flexDirection,
          layout: `flex-${component.style.flexDirection}`,
          justifyContent: component.data.slotStyle.justifyContent,
          alignItems: component.data.slotStyle.alignItems,
        },
        comAry: component?.comAry
      }
    }
    component.comAry = undefined
    component.style = {
      ...(component.style ?? {}),
      width: getValidSizeValue(component.style?.width, 'fit-content'),
      height: getValidSizeValue(component.style?.height, 'auto'),
    }
    delete component.comAry

    return
  }
})

// 添加对根结点的处理
traversal.registerModifier('system.page', (component) => {
  component.namespace = 'mybricks.harmony.systemPage'
  component.data = {
    layout: getValidSlotStyle(component.style)
  }

  component.data.navigationBarTitleText = component.title
  component.data.useTabBar = false

  if (component?.style?.styleAry?.[0]) {
    transformToValidBackground(component?.style?.styleAry?.[0]?.css ?? {})
    const cssProperties = component?.style?.styleAry?.[0]?.css
    if (cssProperties?.backgroundColor) {
      component.data.backgroundColor = cssProperties?.backgroundColor
    }
    if (cssProperties?.backgroundImage) {
      component.data.backgroundImage = cssProperties?.backgroundImage
    }
    delete component?.style?.styleAry
  }
  component.asRoot = true
})

/** 是否注册组件的modifiers */
let isComlibsModifiersRegisted = false
/** 第一次的时候，注册下所有组件的modifiers */
const registerComliibsModifiers = () => {
  if (!window.__comlibs_edit_) {
    return
  }

  const forEachComponent = (com, callback) => {
    if (com?.namespace) {
      callback?.(com)
    }
    if (Array.isArray(com?.comAray)) {
      com?.comAray.forEach(child => {
        forEachComponent(child, callback)
      })
    }
  }

  window.__comlibs_edit_.forEach(comlib => {
    forEachComponent(comlib, (com) => {
      if (com?.ai?.modifyTptJson) {
        traversal.registerModifier(com.namespace, com?.ai?.modifyTptJson)
      }
    })
  })

}

export const getNewDSL = (type, dslJson) => {
  if (!isComlibsModifiersRegisted) {
    registerComliibsModifiers();
    isComlibsModifiersRegisted = true
  }

  console.log('[getNewDSL - type]', type)
  console.log('[getNewDSL - dslJson]', dslJson)

  if (type === 'geo' && dslJson?.ui) {
    try {
      const copyDslJson = JSON.parse(JSON.stringify(dslJson));

      console.log(JSON.parse(JSON.stringify(copyDslJson)))

      traversal.traverse(copyDslJson?.ui)

      console.log(JSON.parse(JSON.stringify(copyDslJson)))

      return copyDslJson
    } catch (error) {
      console.warn('解析失败')
      console.error(error)
    }
  }
  
  return dslJson
}

export const getExamplePrompts = () => {
  return `
  <example>
    <user_query>搭建两个竖排的按钮，按钮宽度固定 + 铺满</user_query>
    <assistant_response>
    \`\`\`dsl file="page.dsl"
      <page title="测试页面">
        <buttonComponentNamespace
          title="按钮1" 
          layout={{width: 50, height: 36}}
          data={{}}/>
        <buttonComponentNamespace
          title="按钮2" 
          layout={{width: '100%', height: 36}}
          data={{}}/>
      </page>
    \`\`\`
    </assistant_response>
  </example>
  `
}