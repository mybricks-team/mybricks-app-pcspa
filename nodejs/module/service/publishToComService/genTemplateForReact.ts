import * as fs from "fs";
import * as path from "path";
import { analysisConfigInputsTS, analysisNormalInputsTS, analysisOutputsTS, analysisReactDefaultProps } from "./tools/utils";

interface IProps {
  comImportsStr: any;
  comDefs: any;
  toJSON: any;
  componentName: string;
  namespaceToComDefs: any;
}

function genTemplateForReact({ comDefs, comImportsStr, componentName, toJSON, namespaceToComDefs }: IProps) {
  const tplFilePath = path.resolve(__dirname, "./templates/com-tpl-for-react.txt");

  let template = fs.readFileSync(tplFilePath, "utf8");

  const { canvasCode, modulesCode } = genUiCode({ json: toJSON, namespaceToComDefs });

  template = template.replace(`--components-imports--`, comImportsStr)
    .replace(`--comDefs--`, `{${comDefs}}`)
    .replace(`--propsType--`, analysisConfigInputsTS(toJSON) + analysisOutputsTS(toJSON))
    .replace(`--defaultProps--`, analysisReactDefaultProps(toJSON))
    .replace(`--refType--`, analysisNormalInputsTS(toJSON))
    .replace(/--componentName--/g, componentName || 'Com')
    .replace(`--ui--`, canvasCode) + modulesCode

  return template
}

function genUiCode({ json, namespaceToComDefs }: any) {
  /** 场景代码 */
  let canvasCode = "";
  /** 模块代码 */
  let modulesCode = "";
  const { modules, scenes } = json;
  const moduleIdToIndex: any = {};

  if (modules) {
    Object.entries(modules).forEach(
      ([moduleId, { title, json }]: any, index: number) => {
        moduleIdToIndex[moduleId] = index;
        // 生成模块代码
        modulesCode =
          modulesCode +
          `/** ${title} */
        function Module${index}({ id }: ModuleProps) {
          return (
            <Module id="${moduleId}" comId={id}>
              ${getBaeJsonCode(json, false)}
            </Module>
          );
        }
      `;
      },
    );
  }

  scenes.forEach((scene: any, index: number) => {
    canvasCode =
      canvasCode +
      `<Canvas id="${scene.id}">${getBaeJsonCode(scene, !index)}</Canvas>`;
  });

  function getBaeJsonCode(json: any, root: boolean) {
    let runtimeCode = "--next--";
    const { slot, coms } = json;
    let classNameCode = "";
    let styleCode = JSON.stringify(getSlotStyle(slot, true));

    if (json.type !== "popup") {
      // 不是弹窗场景，有外层样式
      if (root) {
        // 根场景，默认接收className和style
        classNameCode = "className={props.className}";
        styleCode = styleCode.replace("}", ",...props.style}");
      }

      runtimeCode = `<div ${classNameCode} style={${styleCode}}>--next--</div>`;
    }

    return runtimeCode.replace("--next--", deepSlot(slot, coms));
  }

  function deepSlot(slot: any, coms: any) {
    let slotCode = "";
    const { style, comAry, layoutTemplate } = slot;

    if (style.layout === "smart") {
      layoutTemplate.forEach((com: any) => {
        if (com.def) {
          // UI组件
          slotCode = slotCode + getUIComonentCode(com, coms);
        } else {
          // DOM节点
          slotCode =
            slotCode +
            `<div style={${JSON.stringify(com.style)}}>${deepSlot({ layoutTemplate: com.elements, style: { layout: "smart" } }, coms)}</div>`;
        }
      });
    } else {
      comAry.forEach((com: any) => {
        slotCode = slotCode + getUIComonentCode(com, coms);
      });
    }

    return slotCode;
  }

  function getUIComonentCode(com: any, coms: any) {
    const { id, def, slots } = com;
    const isModule = def.namespace === "mybricks.core-comlib.module";
    let componentName;

    if (isModule) {
      const comInfo = coms[id];
      const { definedId } = comInfo.model.data;
      componentName = `Module${moduleIdToIndex[definedId]}`;
    } else {
      componentName = namespaceToComDefs[def.namespace].runtimeName;
    }
    if (slots) {
      return `<${componentName} id="${id}">${Object.entries(slots)
        .map(([key, slot]: any) => {
          const isScope = slot.type === "scope";
          const useFragment =
            slot.style.layout === "smart"
              ? slot.layoutTemplate.length > 1
              : slot.comAry.length > 1;
          const nextCode = deepSlot(slot, coms);
          return `<Slot id="${key}" ${isScope ? 'type="scope"' : ""} style={${JSON.stringify(getSlotStyle(slot))}}>{() => {
            return (
              ${useFragment ? `<>${nextCode}</>` : (nextCode || "<></>")}
            )
          }}</Slot>`;
        })
        .join("")}</${componentName}>`;
    } else {
      return `<${componentName} id="${id}"/>`;
    }
  }

  // TODO:之后没有这一步了
  function getSlotStyle(slot: any, root?: boolean) {
    const {
      style: { layout, ...otherStyle },
      type,
      showType,
    } = slot;
    const slotStyle = {
      position: "relative",
      ...otherStyle,
    };
    // 判断布局方式
    if (layout === "flex-column") {
      slotStyle.display = "flex";
      slotStyle.flexDirection = "column";
    } else if (layout === "flex-row") {
      slotStyle.display = "flex";
      slotStyle.flexDirection = "row";
    } else {
      // 不是flex布局，删除引擎带来的运行时无用的样式
      Reflect.deleteProperty(slotStyle, "rowGap");
      Reflect.deleteProperty(slotStyle, "columnGap");
      Reflect.deleteProperty(slotStyle, "flexWrap");
      Reflect.deleteProperty(slotStyle, "alignItems");
      Reflect.deleteProperty(slotStyle, "justifyContent");
    }

    if (showType === "module" || type === "module") {
      if (slotStyle.heightAuto) {
        slotStyle.height = "fit-content";
      } else if (slotStyle.heightFull) {
        slotStyle.height = "100%";
      }
      if (slotStyle.widthAuto) {
        slotStyle.width = "fit-content";
      } else if (slotStyle.widthFull) {
        slotStyle.width = "100%";
      }
    } else if (root) {
      // 画布根节点，宽高默认100%即可
      slotStyle.width = "100%";
      slotStyle.height = "100%";
    }

    // 删除引擎带来的运行时无用的样式
    Reflect.deleteProperty(slotStyle, "widthFact");
    Reflect.deleteProperty(slotStyle, "heightFact");
    Reflect.deleteProperty(slotStyle, "widthAuto");
    Reflect.deleteProperty(slotStyle, "heightAuto");
    Reflect.deleteProperty(slotStyle, "widthFull");
    Reflect.deleteProperty(slotStyle, "heightFull");
    // 模块脏数据
    Reflect.deleteProperty(slotStyle, "top");
    Reflect.deleteProperty(slotStyle, "left");
    // 引擎返回的，干嘛用的这是
    Reflect.deleteProperty(slotStyle, "zoom");

    // 解决子元素marginTop导致的外边距塌陷
    slotStyle.overflow = "hidden";

    return slotStyle;
  }

  return {
    canvasCode,
    modulesCode: modulesCode ? `interface ModuleProps {
      /** 模块组件ID */
      id: string;
    }
    ${modulesCode}
    ` : "",
  };
}

function genTemplateForReactReadme({ componentName, sourceLink }: { componentName: string, sourceLink: string }) {
  const tplFilePath = path.resolve(__dirname, "./templates/readme-for-react.txt");

  let template = fs.readFileSync(tplFilePath, "utf8");

  template = template.replace(/--url--/g, sourceLink)
    .replace(/--componentName--/g, componentName)

  return template;
}

export { genTemplateForReact, genTemplateForReactReadme }