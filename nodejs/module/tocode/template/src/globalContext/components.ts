/** TODO: 组件库来源 现在是临时的 */
import type { ReactNode } from "react";

// @ts-ignore
import comlibCore from "@mybricks/comlib-core";

export type ComponentDefinitionMap = {
  [key: string]: {
    namespace: string;
    version: string;
    runtime: (props: any) => ReactNode;
  };
};

export function getComponentDefinition() {
  const componentDefinitionMap: ComponentDefinitionMap = {};

  // TODO: 收集组件信息
  const regAry = (comAray: any) => {
    comAray.forEach((comDef: any) => {
      if (comDef.comAray) {
        regAry(comDef.comAray);
      } else {
        const { namespace, version, runtime } = comDef;
        componentDefinitionMap[namespace] = {
          namespace,
          version,
          runtime,
        };
      }
    });
  };

  (window as any)["__comlibs_rt_"].forEach((lib: any) => {
    const comAray = lib.comAray;
    if (comAray && Array.isArray(comAray)) {
      regAry(comAray);
    }
  });

  comlibCore.comAray.forEach(({ namespace, version, runtime }: any) => {
    componentDefinitionMap[namespace] = {
      namespace,
      version,
      runtime,
    };
  });

  return componentDefinitionMap;
}
