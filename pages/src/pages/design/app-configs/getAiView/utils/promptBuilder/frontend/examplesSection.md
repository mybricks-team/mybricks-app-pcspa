``` tsx index.tsx
import { appRef } from 'mybricks'

/**
 * @mybricks
 * name: default
 * title: 入口文件
 * summary: 入口文件
 * type: app
 */
export default appRef(() => {
  return
})
```

```md skills/score-summary/SKILL.md
---
name: score-summary
title: 成绩摘要
description: 成绩摘要卡片。当需要在页面中展示某个学生的总分、平均分、最高分、最低分等聚合信息时使用。
---

# score-summary

## 功能说明
提供一个成绩摘要卡片，用于展示某个学生已计算好的成绩统计结果。卡片只负责呈现摘要信息，并通过只读 API 向 Agent 暴露当前摘要状态。

## 何时使用
当用户需要：
1. 展示某个学生的成绩汇总概览时
2. 在页面中呈现总分、平均分、最高分、最低分等统计指标时
3. 让 Agent 读取当前卡片展示的成绩摘要信息时
```

```less skills/score-summary/cards/ScoreSummaryCard/index.module.less
.scoreSummaryCard {
  width: 100%;
}
```

```tsx skills/score-summary/cards/ScoreSummaryCard/index.tsx
import { comRef, useCardApis } from 'mybricks'
import styles from './index.module.less'

interface ScoreSummary {
  totalScore: number
  averageScore: number
  highestScore: number
  lowestScore: number
}

/**
 * @mybricks
 * name: ScoreSummaryCard
 * title: 成绩摘要卡片
 * summary: 展示成绩统计摘要，包含总分、平均分、最高分、最低分等信息。
 * type: com
 */
export default comRef(({ studentId, title }) => {
  const summary: ScoreSummary | null = null

  useCardApis({
    /** 获取当前展示的成绩摘要数据，数据未加载时返回 null */
    getScoreSummary: () => summary,
  })

  return <div className={styles.scoreSummaryCard}>成绩摘要卡片</div>
})
```

```ts skills/score-summary/cards/ScoreSummaryCard/index.config.ts
import { defineConfig } from 'mybricks'

export default defineConfig({
  name: 'score-summary-card',
  title: '成绩摘要卡片',
  description: '展示成绩统计摘要，包含总分、平均分、最高分、最低分等信息。',
  props: {
    type: 'object',
    properties: {
      studentId: {
        type: 'string',
        title: '学生 ID',
        description: '需要展示成绩摘要的学生唯一标识',
      },
      title: {
        type: 'string',
        title: '卡片标题',
        description: '成绩摘要卡片顶部展示的标题',
        default: '成绩摘要',
      },
    },
    required: ['studentId'],
  },
  apis: [
    {
      name: 'getScoreSummary',
      description: '获取当前展示的成绩摘要数据，包括总分、平均分、最高分、最低分等，数据未加载时返回 null',
    },
  ],
})
```

```ts skills/score-summary/dataSource.ts
import { DataSource } from 'mybricks'

interface ScoreSummaryParams {
  studentId: string
}

interface ScoreSummaryResult {
  totalScore: number
  averageScore: number
  highestScore: number
  lowestScore: number
}

class MyDatasource extends DataSource {
  async fetchScoreSummary(params: ScoreSummaryParams): Promise<ScoreSummaryResult> {
    return this.axios.get('/score-summary', { params })
  }
}

export default new MyDatasource()
```

```ts skills/score-summary/server/index.ts
import { Hono } from 'hono'

const server = new Hono()

server.get('/score-summary', async (c) => {
  const serverLogger = c.get('logger').child({ route: 'score-summary', action: 'fetch-score-summary' })
  const studentId = c.req.query('studentId')

  serverLogger.info({ studentId }, '查询成绩摘要')

  try {
    if (!studentId) {
      return c.json({ result: -1, error_msg: 'studentId 不能为空' }, 400)
    }

    return c.json({
      result: 1,
      error_msg: 'success',
      data: {
        totalScore: 520,
        averageScore: 86.7,
        highestScore: 98,
        lowestScore: 76,
      },
    })
  } catch (error) {
    serverLogger.error({ error }, '查询成绩摘要失败')
    return c.json({ result: -1, error_msg: '查询成绩摘要失败' }, 500)
  }
})

export default server
```

```ts skills/calculate/tools/square/index.ts
import { defineTool } from 'mybricks'

interface SquareParams {
  value: number;
}

export default defineTool(function () {
  return {
    name: "calculate_square",
    title: "计算数字的平方",
    description: `计算一个数字的平方（即该数字乘以自身）。

用法：
- 传入一个数字 value
- 返回该数字的平方结果`,
    parameters: {
      type: "object",
      properties: {
        value: {
          type: "number",
          description: "需要计算平方的数字",
        },
      },
      required: ["value"],
    },
    validate(params: SquareParams): void {
      if (params.value === undefined || params.value === null) {
        throw new Error("value is required");
      }
      if (typeof params.value !== "number") {
        throw new Error(`value must be a number, got: ${typeof params.value}`);
      }
      if (!isFinite(params.value)) {
        throw new Error(`value must be a finite number, got: ${params.value}`);
      }
    },
    async execute(params: SquareParams) {
      const result = params.value * params.value;
      return {
        output: `${params.value} 的平方为 ${result}`,
        metadata: {
          input: params.value,
          result,
        },
      };
    },
  };
})
```
