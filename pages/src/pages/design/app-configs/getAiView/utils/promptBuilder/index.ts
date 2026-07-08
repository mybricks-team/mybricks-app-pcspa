import type { PluginAIPreset } from '@mybricks/plugin-ai'
import frontend from './frontend'

const appPrompt = {
  frontend,
  backend: {
    codeRulesSection: `1. 后端接口使用合理、语义化的路径，如果是根路径，直接使用 “/” 即可。
2. 路由处理函数中必须做好参数校验和异常捕获，避免未处理异常直接暴露给用户。
3. 涉及数据库时，数据库表结构由工具调用进行准备；业务代码只负责查询和写入，不要在接口处理函数中执行建表逻辑。
4. 路由拆分参考 Express Router 的思路：每个业务路由文件导出一个独立 router，入口文件只负责统一挂载，不要把所有接口都写进 \`index.ts\`，合理拆分即可，不强制要求。

### 日志规范
1. 请求参数、返回数据以及各种异常信息都必须打印对应的日志，方便排查问题

### 路由返回规范
1. 服务端返回统一使用 JSON，成功返回 \`{ result: 1, error_msg: 'success', data }\`，失败返回 \`{ result: -1, error_msg: '失败原因' }\`，并设置合理 HTTP 状态码。

###
`,
    // builtInCapabilitiesSection: `使用skill: common-service`,
    examplesSection: `1. 入口文件
\`\`\`ts index.ts
import { Hono } from "hono";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const server = new Hono();

server.get("/", async (c) => {
  const serverLogger = c.get("logger").child({ route: "todos", action: "list" });

  try {
    const items: Todo[] = [];
    return c.json({ result: 1, error_msg: "success", data: { items } });
  } catch (error) {
    serverLogger.error({ error }, "查询任务列表失败");
    return c.json({ result: -1, error_msg: "查询任务列表失败" }, 500);
  }
});

export default server;
\`\`\`
`,
    honoUsageSection: `### Hono
当前项目支持使用 Hono 进行服务端开发。入口文件创建并导出 Hono app`,
  },
}

export function fullStackAppPromptBuilder(
  agentAppPromptSection: any,
): PluginAIPreset {
  return {
    promptSections: {
      agent: agentAppPromptSection.agent,
      developeGuide: agentAppPromptSection.developeGuide,
      designGuide: agentAppPromptSection.designGuide,
      documentGuide: agentAppPromptSection.documentGuide,
    } satisfies any,
    virtualFiles: async (context: any) => {
      const libraryDocsSection = await context.getEffectiveLibrariesSection()

      return [
        {
          path: '.agent/agent.md',
          content: [
            agentAppPromptSection.root.metaSection,
            '## 开发宪章',
            agentAppPromptSection.root.guideSection,
            '## 工程架构',
            agentAppPromptSection.root.architectureSection,
            '## 可用的三方库',
            libraryDocsSection,
          ]
            .filter(Boolean)
            .join('\n\n'),
          permissions: { read: true, write: false, delete: false },
          visible: false,
        },
        {
          path: 'frontend/.agent/agent.md',
          content: [
            // fullStackAppPromptSection.frontend.metaSection,
            appPrompt.frontend.metaSection,
            '# 前端规范',
            // fullStackAppPromptSection.frontend.guideSection,
            appPrompt.frontend.guideSection,
            // '## 设计规范加载',
            // '当任务涉及卡片初始化、卡片搭建、卡片生成、改稿或样式调整时，先加载 design-spec skill 并读取相关规则文件，再进入具体代码开发。',
            '## 资源使用规范',
            agentAppPromptSection.frontend.assetsUsageSection,
            '## 环境变量',
            agentAppPromptSection.frontend.environmentVariablesSection,
            '## JsDoc声明规范',
            // fullStackAppPromptSection.frontend.jsDocUsageSection,
            appPrompt.frontend.jsDocUsageSection,
            '## 前端示例',
            // fullStackAppPromptSection.frontend.examplesSection,
            appPrompt.frontend.examplesSection,
          ]
            .filter(Boolean)
            .join('\n\n'),
          permissions: { read: true, write: false, delete: false },
          visible: false,
        },
        {
          path: 'backend/.agent/agent.md',
          content: [
            agentAppPromptSection.backend.metaSection,
            '# 服务端规范',
            agentAppPromptSection.backend.guideSection,
            '## 代码规范',
            appPrompt.backend.codeRulesSection,
            '## 环境变量',
            agentAppPromptSection.backend.environmentVariablesSection,
            '## 框架和数据库',
            appPrompt.backend.honoUsageSection,
            // fullStackAppPromptSection.backend.honoUsageSection,
            // fullStackAppPromptSection.backend.pgUsageSection,
            // '## 服务端内置能力',
            // fullStackAppPromptSection.backend.builtInCapabilitiesSection,
            '## 服务端示例',
            appPrompt.backend.examplesSection,
          ]
            .filter(Boolean)
            .join('\n\n'),
          permissions: { read: true, write: false, delete: false },
          visible: false,
        },
      ]
    },
  }
}
