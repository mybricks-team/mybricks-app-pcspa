import CodeFiles from "../codeFiles";
import { createRequestStream } from "../request";

const API_URL = "/biz/v2/ai/batchGenerateModuleStream";
const MYBRICKS_GROUP_ID = "816814702252101";

const FILE_WHITELIST = [
  "dataSource.js",
  "scheme.js",
  "setup.js",
  "requirement.md",
];

type FilesResult = {
  apiScheme: any[];
  requirement: string;
};

type SyncStageResult = {
  rawResponse: any;
  output: string;
};

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
    const result = new Function(`return (${match[1]})`)();
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}


/**
 *  根据接口文档生成简要总结，供用户查看
 * @param apiDocs 
 * @returns 
 */
function summarizeApiDocs(apiDocs: ApiDocItem[]) {
  if (!Array.isArray(apiDocs) || apiDocs.length === 0) {
    return "未获取到接口文档，dataSource.js 和 setup.js 无需更新，跳过接口同步。";
  }

  return [
    "已获取要接口信息，用于后续 dataSource.js 和 setup.js 的生成，此次作为服务端接口更新，之后不必再次调用\`operate-api\`（接口同步）工具：",
    ...apiDocs.map((item, index) => {
      const response = ` \`\`\`js 返回参数shceme定义
      ${item.response ? JSON.stringify(item.response, null, 2) : ""}
      \`\`\` `;
      const request = ` \`\`\`js 请求参数shceme定义
      ${item.request ? JSON.stringify(item.request, null, 2) : ""}
      \`\`\` `;

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
 *  格式化当前项目的接口相关文件内容，供接口变更记录整理使用
 * @returns 
 */
export function formatFiles(): FilesResult {
  const codeFiles = new CodeFiles(FILE_WHITELIST);
  const files = codeFiles.getFilesJson();
  const schemeFile = files.find((file: any) => file.fileName === "scheme.js");
  const scheme = formatShemeObj(schemeFile?.content || "");

  const requirement = files.find(
    (file: any) => file.fileName === "requirement.md",
  );

  if(!requirement) {
    console.warn("未找到 requirement.md 文件，接口变更记录整理可能缺乏必要的用户需求上下文信息");
    throw new Error("未生成requirement.md 文件");
  }
  
  return {
    apiScheme: scheme,
    requirement: requirement?.content || "",
  };
}

function parseResponse(raw: any) {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

export async function syncState(fileId: string, content: string, filesObj: FilesResult): Promise<SyncStageResult> {

  return new Promise<SyncStageResult>((resolve, reject) => {
    let accumulated = "";

    const requestStream = createRequestStream({
      url: API_URL,
      method: "POST",
      body: {
        summary: content,
        mybricksGroupId: MYBRICKS_GROUP_ID,
        sessionId: fileId,
        ...filesObj,
      },
    });

    requestStream({
      emits: {
        write: (chunk) => {
          accumulated += chunk;
        },
        complete: () => {
          const rawResponse = parseResponse(accumulated);
          resolve({
            rawResponse,
            output: summarizeApiDocs(rawResponse),
          });
        },
        error: reject,
        cancel: () => {},
      },
    });
  });
}
