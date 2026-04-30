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

function buildSubAgentPrompt(userMessage: string) {
  return `<用户原始需求>
${userMessage}
</用户原始需求>

请输出一份接口变更记录，用于后续接口文档生成。`;
}

export async function summaryState(toolContext: any) {
  const parentUserMessage = toolContext.getUserMessage?.()?.message ?? "";

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
  return turns[turns.length - 1]?.content ?? "";
}
