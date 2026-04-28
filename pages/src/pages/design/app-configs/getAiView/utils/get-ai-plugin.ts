import AIPlugin from "@mybricks/plugin-ai";
import componentRuntime from "./componentRuntime";
import promptSections from "./promptSections";
import { createOperateApiTool } from "./tools/operate-api";

export default ({ user, key }: any) => {
  const operateApiTool = createOperateApiTool(key);

  return AIPlugin({
    user,
    key,
    llm: {
      providers: [

      ],
    },
    tools: [operateApiTool],
    // ------ taro ------
    componentRuntime,
    promptSections,
  });
};
