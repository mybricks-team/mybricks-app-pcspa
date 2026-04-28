import { createRequestStream } from "./request-stream";

export const OPERATE_API_TOOL_NAME = "operate-api";
const API_DOC_URL = "/v2/ai/batchGenerateModuleStream";
const FILE_WHITELIST = [
  "dataSource.js",
  "scheme.js",
  "setup.js",
  "requirement.md",
  "README.md",
];
const DEFAULT_BASE_URL = "http://dev.manateeai.com/biz";
import CodeFiles from "./codeFiles";

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

function formatShemeObj(content: string) {
  const match = content.match(
    /const\s+\w+\s*=\s*(\[[\s\S]*?\])\s*export\s+default\s+\w+/,
  );
  if (!match?.[1]) return [];

  try {
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
}

function formatFiles() {
  const codeFiles = new CodeFiles(FILE_WHITELIST);
  const files = codeFiles.getFilesJson();
  const schemeFile = files.find((file: any) => file.fileName === "scheme.js");
  const scheme = formatShemeObj(schemeFile?.content || "");
  const requirement = files.find(
    (file: any) => file.fileName === "requirement.md",
  );
  return {
    scheme,
    requirement: requirement?.content || "",
  };
}

/**
 *  根据接口文档生成简要总结，供用户查看
 * @param apiDocs
 * @returns
 */
function summarizeApi(apiDocs: ApiDocItem[]) {
  if (!Array.isArray(apiDocs) || apiDocs.length === 0) {
    return "未获取到接口文档。";
  }

  return [
    "已获取后端返回的真实接口信息，做一次写入scheme.js、dataSource.js、setup.js的变更，完成后流程结束：",
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
export function createOperateApiTool(fileId: string) {
  return {
    name: OPERATE_API_TOOL_NAME,
    title: "操作接口",
    description: "根据当前用户需求请求后端服务，操作接口，保持前后端的一致性。",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute(_params: any, toolContext: any) {
      toolContext.emitProgress?.({
        stage: "pending",
        message: "正在收集接口操作所需的上下文信息",
      });

      const filesObj = formatFiles();

      toolContext.emitProgress?.({
        stage: "pending",
        message: "正在请求接口操作服务",
      });

      try {
        const rawResponse = await new Promise<any>((resolve, reject) => {
          let accumulated = "";

          const requestStream = createRequestStream({
            baseUrl: DEFAULT_BASE_URL,
            url: API_DOC_URL,
            method: "POST",
            body: {
              mybricksGroupId: "816814702252101", // 先写死，后续可以根据业务需要调整
              sessionId: fileId,
              apiSchemes: filesObj.scheme || [],
              requirement: filesObj.requirement,
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
          message: "接口操作成功",
        });

        console.log("接口操作服务原始返回=======", summarizeApi(rawResponse));

        return {
          output: summarizeApi(rawResponse),
          metadata: {
            rawResponse,
          },
        };
      } catch (error) {
        toolContext.emitProgress?.({
          stage: "error",
          message: `操作接口失败：${error instanceof Error ? error.message : String(error)}`,
        });

        return {
          output: `操作接口失败：${error instanceof Error ? error.message : String(error)}`,
          metadata: {
            apiDocs: [],
          },
        };
      }
    },
  };
}
