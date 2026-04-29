import CodeFiles from "../codeFiles";
import { createRequestStream } from "../request";
import { renderOperateApiTool } from "./render";

export const OPERATE_API_TOOL_NAME = "operate-api";

const OPERATE_API_URL = "/biz/v2/ai/batchGenerateModuleStream";
const MYBRICKS_GROUP_ID = "816814702252101";
// const SESSION_ID = "123456-123456-123456-123456-123456";  // 测试用固定 sessionId，实际使用时可改为动态获取

const FILE_WHITELIST = [
  "dataSource.js",
  "scheme.js",
  "setup.js",
  "requirement.md",
];

const OPERATE_API_SUBAGENT_SYSTEM = `你是一个专业的后端开发助手，能根据前端需求进行接口分析和变更。
你的任务是基于用户需求、当前项目上下文以及现有接口相关文件，整理一份可直接提供给后端接口服务使用的接口变更记录。

输出要求：
1. 只输出接口变更记录，不要输出额外解释；
2. 结合 \`scheme.js\`、\`dataSource.js\`、\`setup.js\`、\`requirement.md\`，按以下结构输出：

- 背景与动机
- 目标与范围
- 当前实现分析
- 业务规则
- 变更设计
  - 新增接口
  - 编辑接口
  - 删除接口
- 影响分析
- 实施步骤

3. “业务规则”中需要明确关键约束，例如重复提交限制、调用顺序、状态限制、前置条件等；
4. “变更设计”中必须明确区分新增、编辑、删除；
5. 如果项目只是初始化完成，且此前从未进行过\`operate-api\`（接口同步）或者接口同步失败，则本次接口优先视为新增；
6. 如果变更会影响 \`scheme.js\`、\`dataSource.js\`、\`setup.js\` 三者一致性，必须明确说明；
7. 输出保持简洁、准确、可执行；
8. 不要调用任何工具。

<example>
背景与动机
- 新增订单创建能力，支持前端提交订单信息。

目标与范围
- 新增订单创建接口；
- 同步更新 \`scheme.js\`、\`dataSource.js\`、\`setup.js\`。

当前实现分析
- 当前仅有订单列表查询接口；
- 尚未提供订单创建能力。

业务规则
- 同一订单号不可重复创建；
- 创建成功后需要刷新订单列表；
- 未完成必填校验时禁止提交。

变更设计
新增接口：
- \`POST /api/order/create\`
- \`GET /api/order/detail\`

编辑接口：
- \`POST /api/order/list\` 增加筛选参数。

删除接口：
- 无。

影响分析
- \`scheme.js\`、\`dataSource.js\`、\`setup.js\` 需要同步调整。

实施步骤
1. 更新 \`scheme.js\`；
2. 更新 \`dataSource.js\`；
3. 更新 \`setup.js\`；
4. 校验三者一致性。
</example>

`;

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

type FilesResult = {
  apiScheme: any[];
  requirement: string;
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

/**
 *  格式化当前项目的接口相关文件内容，供接口变更记录整理使用
 * @returns 
 */
function formatFiles(): FilesResult {
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

function buildSubAgentPrompt(userMessage: string) {
  return `<用户原始需求>
${userMessage}
</用户原始需求>

请输出一份接口变更记录，用于后续接口文档生成。`;
}

function parseStreamResponse(accumulated: string) {
  try {
    return JSON.parse(accumulated);
  } catch {
    return accumulated;
  }
}

function createEmptyResult() {
  return {
    output: "未生成接口变更记录，请重试。",
    metadata: {
      rawResponse: [],
      subAgentContent: "",
    },
  };
}

async function requestApiDocs(fileId: string, content: string, filesObj: FilesResult) {
  return new Promise<any>((resolve, reject) => {
    let accumulated = "";

    const requestStream = createRequestStream({
      url: OPERATE_API_URL,
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
          resolve(parseStreamResponse(accumulated));
        },
        error: reject,
        cancel: () => {},
      },
    });
  });
}

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
      toolContext.emitProgress?.({
        stage: "pending",
        message: "正在收集接口所需的上下文信息",
      });

      const parentUserMessage = toolContext.getUserMessage?.()?.message ?? "";
      console.log("=======parentUserMessage", parentUserMessage);

      toolContext.emitProgress?.({
        stage: "pending",
        message: "正在整理接口变更记录",
      });

      const parentAgent = toolContext.getAgent();
      const subAgent = parentAgent.createSubAgent({
        type: "operate-api-summary",
        description: "整理接口变更记录",
        system: OPERATE_API_SUBAGENT_SYSTEM,
      });

      const prompt = buildSubAgentPrompt(parentUserMessage);
      await subAgent.requestAI({
        message: prompt,
        attachments: toolContext.getUserMessage?.()?.attachments,
      });

      const turns = subAgent.getTurns();
      const content = turns[turns.length - 1]?.content ?? "";
      console.log("turn返回的结构：====", content);

      if (!content) {
        return createEmptyResult();
      }
      console.log("turn开始接口请求：====");
      //接口请求
      toolContext.emitProgress?.({
        stage: "pending",
        message: "正在同步接口服务",
      });

      try {
        const rawResponse = await requestApiDocs(fileId,content, formatFiles());
        console.log("rawResponse：====", rawResponse);
        toolContext.emitProgress?.({
          stage: "success",
          message: "接口同步成功",
        });

        return {
          output: summarizeApiDocs(rawResponse),
          metadata: {
            rawResponse,
            subAgentContent: content,
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
            rawResponse: [],
            subAgentContent: content,
          },
        };
      }
    },
  };
}
