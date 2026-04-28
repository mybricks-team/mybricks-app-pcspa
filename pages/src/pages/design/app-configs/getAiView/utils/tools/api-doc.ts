import { createRequestStream } from "./request-stream";

export const API_DOC_TOOL_NAME = "get-api-doc";
const API_DOC_URL = "/v2/ai/batchGenerateModuleStream";
const FILE_WHITELIST = [
  "dataSource.js",
  "scheme.js",
  "setup.js",
  "requirement.md",
  "README.md",
];
const DEFAULT_BASE_URL = "http://dev.manateeai.com/biz";

type ApiDocItem = {
  id: string;
  cnName: string;
  name: string;
  baseUrl: string;
  method: string;
  path: string;
  response?: any;
  request?: any;
};

/**
 * 获取白名单内文件的内容，供接口文档生成使用
 * @param toolContext
 * @returns
 */
async function getWhitelistedFileContent(_toolContext: any) {
  const content = window?.designerRef?.current?.toJSON?.();
  console.log("接口操作 - 获取到的设计器内容33333===", content);

  return FILE_WHITELIST.map((path) => ({
    path,
    content:
      path === "requirement.md" ? JSON.stringify(content ?? {}, null, 2) : "",
  }));
}

/**
 *  根据接口文档生成简要总结，供用户查看
 * @param apiDocs
 * @returns
 */
function summarizeApiDocs(apiDocs: ApiDocItem[]) {
  if (!Array.isArray(apiDocs) || apiDocs.length === 0) {
    return "未获取到接口文档。";
  }

  return [
    "已获取要接口信息，可用于后续 dataSource.js 和 setup.js 的生成：",
    ...apiDocs.map((item, index) => {
      const response = ` \`\`\`js 返回参数shceme定义
      ${item.response ? JSON.stringify(item.response, null, 2) : ""}
      \`\`\ `;
      const request = ` \`\`\`js 请求参数shceme定义
      ${item.request ? JSON.stringify(item.request, null, 2) : ""}
      \`\`\ `;
      return [
        `${index + 1}. ${item.cnName || item.name}`,
        `- id: ${item.id}`,
        `- baseUrl: ${item.baseUrl}`,
        `- name: ${item.name}`,
        `- method: ${item.method}`,
        `- path: ${item.path}`,
        `- request: ${request}`,
        `- response: ${response}`,
      ].join("\n");
    }),
  ].join("\n\n");
}

/**
 *
 * @param projectId 项目页面的唯一ID 取自上下文的fileId
 * @returns
 */
export function createApiDocTool(projectId: string) {
  return {
    name: API_DOC_TOOL_NAME,
    title: "获取接口文档",
    description:
      "根据当前用户需求请求后端服务，获取接口文档和接口 schema，供后续开发 dataSource.js 与 setup.js 使用。",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute(_params: any, toolContext: any) {
      toolContext.emitProgress?.({
        stage: "pending",
        message: "正在收集接口文档所需的上下文信息",
      });

      const turns = toolContext.getAgent().getTurns();
      const summary =
        turns[turns.length - 1]?.summary ?? turns[turns.length - 1]?.coontent;
      const files = await getWhitelistedFileContent(toolContext);
      const fileContent = JSON.stringify(files, null, 2);

      toolContext.emitProgress?.({
        stage: "pending",
        message: "正在请求接口文档服务",
      });

      try {
        const rawResponse = await new Promise<any>((resolve, reject) => {
          let accumulated = "";

          const requestStream = createRequestStream({
            baseUrl: DEFAULT_BASE_URL,
            url: API_DOC_URL,
            method: "POST",
            body: {
              message: "订单管理系统相关接口",
              fileContent,
              mybricksGroupId: "816814702252101",
              // sessionId: "1772787521002498-1774233373150724",
              sessionId: "123456-123456-123456-123456-123456",
              apiSchemes: [],
            },
            headers: {
              session: "b25ab8ae308db8aab977a90c63893abc",
              token: "ea153b4ff6a5422a938b21d835b53250",
            },
          });

          requestStream({
            emits: {
              write: (chunk) => {
                accumulated += chunk;
              },
              complete: () => {
                try {
                  resolve(JSON.parse(accumulated));
                } catch {
                  resolve(accumulated);
                }
              },
              error: reject,
              cancel: () => {},
            },
          });
        });

        toolContext.emitProgress?.({
          stage: "success",
          message: "接口文档获取成功",
        });

        console.log(
          "接口文档服务原始返回=======2",
          summarizeApiDocs(rawResponse),
        );

        return {
          output: summarizeApiDocs(rawResponse),
          metadata: {
            rawResponse,
          },
        };
      } catch (error) {
        toolContext.emitProgress?.({
          stage: "error",
          message: `接口文档获取失败：${error instanceof Error ? error.message : String(error)}`,
        });

        return {
          output: `获取接口文档失败：${error instanceof Error ? error.message : String(error)}`,
          metadata: {
            apiDocs: [],
          },
        };
      }
    },
  };
}
