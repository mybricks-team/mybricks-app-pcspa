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

```md skills/student-score-manage/SKILL.md
---
name: student-score-manage
title: 学生成绩管理
description: 学生成绩管理功能域。当需要展示学生学籍信息、历次考试各科成绩，或在页面中呈现成绩汇总摘要（总分 / 平均分）时使用。
---

# student-score-manage

## 功能说明
提供学生基本信息查看与各科目成绩统计展示能力，支持按 studentId 动态加载数据。

## 何时使用
当用户需要：
1. 展示某位学生的学籍信息（姓名、班级）时
2. 呈现历次考试各科目成绩列表时
3. 在页面中展示成绩汇总摘要（总分 / 平均分）时
```

```less skills/student-score-manage/cards/GradeCard/index.module.less
.gradeCard {
  width: 100%;
}
```

```tsx skills/student-score-manage/cards/GradeCard/index.tsx
import { comRef, useCardApis } from 'mybricks'
import { useState } from 'react'
import styles from './index.module.less'

interface GradeItem {
  subject: string
  score: number
}

interface StudentInfo {
  name: string
  className: string
}

/**
 * @mybricks
 * name: GradeCard
 * title: 学生成绩查看卡片
 * summary: 卡片主体，展示学生基本信息、各科目成绩列表与总分/平均分统计，支持刷新加载。
 * type: com
 */
export default comRef(({ studentId, showAverage }) => {
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [gradeList, setGradeList] = useState<GradeItem[]>([])
  const [loaded, setLoaded] = useState(false)

  const total = gradeList.reduce((sum, item) => sum + item.score, 0)
  const average = gradeList.length > 0 ? (total / gradeList.length).toFixed(1) : null

  useCardApis({
    /** 获取当前展示的学生基本信息，数据未加载完成时返回 null */
    getStudentInfo: () => (loaded ? studentInfo : null),
    /** 获取学生各科目成绩列表，数据未加载完成时返回空数组 */
    getGradeList: () => (loaded ? gradeList : []),
    /** 获取成绩统计摘要，包含总分和平均分，数据未加载完成时返回 null */
    getSummary: () =>
      loaded && studentInfo
        ? `${studentInfo.name}：总分 ${total} 分，平均分 ${average} 分`
        : null,
  })

  return <div className={styles.gradeCard}>学生成绩卡片</div>
})
```

```ts skills/student-score-manage/cards/GradeCard/index.config.ts
import { defineConfig } from 'mybricks'

export default defineConfig({
  name: 'student-grade-card',
  title: '学生成绩查看卡片',
  description: '展示学生基本信息、各科目成绩列表与总分/平均分统计，支持刷新加载。',
  props: {
    type: 'object',
    properties: {
      studentId: {
        type: 'string',
        title: '学生 ID',
        description: '需要展示成绩的学生唯一标识',
      },
      showAverage: {
        type: 'boolean',
        title: '显示平均分',
        description: '是否在成绩列表底部展示平均分统计行',
        default: true,
      },
    },
    required: ['studentId'],
  },
  apis: [
    {
      name: 'getStudentInfo',
      description: '获取当前展示的学生基本信息，包括姓名、班级等，数据未加载完成时返回 null',
    },
    {
      name: 'getGradeList',
      description: '获取学生各科目成绩列表，数据未加载完成时返回空数组',
    },
    {
      name: 'getSummary',
      description: '获取成绩统计摘要，包含总分和平均分，数据未加载完成时返回 null',
    },
  ],
})
```

```ts skills/student-score-manage/dataSource.ts
import { DataSource } from 'mybricks'

interface GradeItem {
  subject: string
  score: number
}

interface StudentInfo {
  name: string
  className: string
}

interface StudentGradesResult {
  studentInfo: StudentInfo
  gradeList: GradeItem[]
}

class MyDatasource extends DataSource {
  async fetchStudentGrades(studentId: string): Promise<StudentGradesResult> {
    return this.axios.get('/student-grades', { params: { studentId } })
  }
}

export default new MyDatasource()
```

```ts skills/student-score-manage/server/index.ts
import { Hono } from 'hono'

interface GradeItem {
  subject: string
  score: number
}

interface StudentInfo {
  name: string
  className: string
}

const server = new Hono()

server.get('/student-grades', async (c) => {
  const serverLogger = c.get('logger').child({ route: 'student-score-manage', action: 'student-grades' })
  const studentId = c.req.query('studentId')

  serverLogger.info({ studentId }, '查询学生成绩')

  try {
    if (!studentId) {
      return c.json({ result: -1, error_msg: 'studentId 不能为空' }, 400)
    }

    const studentInfo: StudentInfo = { name: '张三', className: '三年一班' }
    const gradeList: GradeItem[] = [
      { subject: '语文', score: 90 },
      { subject: '数学', score: 95 },
    ]

    return c.json({ result: 1, error_msg: 'success', data: { studentInfo, gradeList } })
  } catch (error) {
    serverLogger.error({ error }, '查询学生成绩失败')
    return c.json({ result: -1, error_msg: '查询学生成绩失败' }, 500)
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
