import { renderOperateApiTool } from "./render";
import { checkState } from "./check-stage";
import { summaryState } from "./summary-state";
import { syncState, formatFiles } from "./sync-stage";

export const OPERATE_API_TOOL_NAME = "operate-api";

export function createOperateApiTool(fileId: string) {
  return {
    name: OPERATE_API_TOOL_NAME,
    title: "操作接口",
    description:
      "根据当前用户需求先整理接口变更记录，根据当前用户需求请求后端服务，操作接口，保持前后端的一致性。",
    render: renderOperateApiTool,
    parameters: {
      type: "object",
      properties: {},
    },
    async execute(_params: any, toolContext: any) {
      try {
        const filesObj = formatFiles();

        //检测接口是否需要变更
        toolContext.emitProgress?.({
          stage: "pending",
          message: "正在检查接口",
        });

        const check = await checkState(filesObj.apiScheme, fileId);

        //接口无需变更
        if(check){
          toolContext.emitProgress?.({
            stage: "success",
            message: "接口无需变更",
          });
          return {
            output: "前后端接口一致，无需操作接口。直接进行下一步操作。",
            metadata: {
              summary: "",
              rawResponse: [],
            },
          };
        }

        //整理接口变更记录
        toolContext.emitProgress?.({
          stage: "pending",
          message: "正在收集接口所需的上下文信息",
        });

        let summary = "";
        summary = await summaryState(toolContext);
        if (!summary) {
          return {
            output: "未生成接口变更记录，请重试。",
            metadata: {
              summary: "",
              rawResponse: [],
            },
          };
        }

        //接口请求
        toolContext.emitProgress?.({
          stage: "pending",
          message: "正在同步接口",
        });

        const result = await syncState(fileId, summary, filesObj);

        toolContext.emitProgress?.({
          stage: "success",
          message: "接口同步成功",
        });

        return {
          output: result.output,
          metadata: {
            summary,
            rawResponse: result.rawResponse,
          },
        };
      } catch (error) {
        toolContext.emitProgress?.({
          stage: "error",
          message: `接口同步失败：${error instanceof Error ? error.message : String(error)}`,
        });

        return {
          output: `接口同步失败：${error instanceof Error ? error.message : String(error)}`,
          metadata: {
            summary: "",
            rawResponse: [],
          },
        };
      }
    },
  };
}
