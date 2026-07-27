import { uniqBy } from 'lodash'
import React from 'react'
import { AskUserQuestionRenderer } from './AskUserQuestionRenderer'

type Tool = any
type ToolResult = any

export type AskUserQuestionAIPlugin = {
  controller?: {
    requestAI?: (
      sceneId: string,
      params: {
        message: string
        mentionFocus?: boolean
        attachments: unknown[]
      },
    ) => void
  }
}

export type AskUserQuestionType = 'choice' | 'text'

export interface AskUserQuestionItem {
  question: string
  type: AskUserQuestionType
  /** type 为 choice 时必填，候选项列表，无需包含“其他” */
  options?: string[]
}

export interface AskUserQuestionToolParams {
  questions: AskUserQuestionItem[]
}

export interface AskUserQuestionOption {
  /** 序号，如 A、B、C，由工具在 execute 时按顺序生成，包含自动追加的"其他"选项 */
  label: string
  text: string
}

export const OTHER_OPTION_TEXT = '其他'

function letterFor(index: number) {
  return String.fromCharCode('A'.charCodeAt(0) + index)
}

export interface CreateAskUserQuestionToolOptions {
  requestAI: (params: any) => void
}

/** 工厂函数：把 aiPlugin getter 与场景 ID getter 传入，供 render 内提交时继续对话 */
export function createAskUserQuestionTool({
  requestAI,
}: CreateAskUserQuestionToolOptions): Tool {
  return {
    title: '向用户提问',
    name: 'ask_user_question',
    render: (tool: Tool) =>
      React.createElement(AskUserQuestionRenderer, {
        tool,
        requestAI,
      }),
    description: `项目初始化时需要补充项目配置时调用本工具主动向用户提问澄清。目前本工具仅用于确认“目标开发端 / 是否需要多端适配”，用于生成 app.config.ts 中必填的 viewports 和 breakpoints；不要询问页面风格、布局偏好、功能范围、技术选型、内容素材等与目标端和多端适配无关的问题。命中这些条件时，本轮只调用本工具并等待用户回答，不要先读取文件、加载设计规范或修改代码。现有代码只能用于理解当前状态，不能代替用户对目标端和是否多端适配的选择。

## 调用时机
- 必须调用：当 <app-config> 提示当前项目没有 app.config.ts 文件，且用户需求中未明确目标开发端或是否需要多端适配时，需通过问询确认
- 不要调用：当用户需求中已经明确只做单端、只做 PC、只做移动端，或明确需要多端 / 响应式 / 适配不同屏幕时，可直接按用户需求处理，不要重复提问

## 题目类型
- choice：选项题，支持多选，提供若干候选项，界面会自动追加"其他"选项，用户选择"其他"时需要额外输入一段文字说明
- text：纯文本题，用户直接输入文字作答

## 示例
<examples>
<example>
<user>开发一个个人介绍页</user>
<assistant>用户只说“开发一个页面”，由于当前项目没有 app.config.ts 文件，且需求中无法判断目标开发端和是否需要多端适配，调用 ask_user_question 仅确认目标端 / 是否需要多端适配。</assistant>
</example>
<example>
<user>开发一个适配 PC 和移动端的个人介绍页</user>
<assistant>用户已明确需要多端适配，不调用 ask_user_question，直接继续处理需求；app.config.ts 中生成 PC 和移动端 viewports，并生成移动端 breakpoint。</assistant>
</example>
<example>
<user>开发一个移动端活动页</user>
<assistant>用户已明确只做移动端单端，不调用 ask_user_question，直接继续处理需求；app.config.ts 中生成移动端 viewport，并将 breakpoints 设置为空数组。</assistant>
</example>
</examples>

## 返回值
返回等待用户作答的提示文本；用户在界面上完成题目并提交后，会以新的一轮用户消息把作答内容发送回来，请据此继续处理用户需求，不要重复提问。
`,
    parameters: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          description: '需要向用户提出的问题列表，支持一个或多个问题',
          items: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: '问题内容',
              },
              type: {
                type: 'string',
                enum: ['choice', 'text'],
                description:
                  '题目类型：choice 选项题（自动追加"其他"选项）、text 纯文本题',
              },
              options: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'type 为 choice 时必填，候选项文案列表，无需包含"其他"，也无需自行编号；界面会自动为每一项（含自动追加的"其他"）按 A、B、C...顺序生成序号',
              },
            },
            required: ['question', 'type'],
          },
        },
      },
      required: ['questions'],
    },
    validate(params: AskUserQuestionToolParams) {
      if (!Array.isArray(params?.questions) || params.questions.length === 0) {
        throw new Error('questions 不能为空')
      }
      params.questions.forEach((q, index) => {
        if (!q?.question?.trim()) {
          throw new Error(`第 ${index + 1} 题缺少 question`)
        }
        if (q.type !== 'choice' && q.type !== 'text') {
          throw new Error(`第 ${index + 1} 题 type 不合法，仅支持 choice、text`)
        }
        if (
          q.type === 'choice' &&
          (!Array.isArray(q.options) || q.options.length === 0)
        ) {
          throw new Error(`第 ${index + 1} 题为 choice 类型时 options 不能为空`)
        }
      })
    },
    async execute(params: AskUserQuestionToolParams): Promise<ToolResult> {
      const dedupedQuestions = uniqBy(params.questions, q => q.question.trim())
      const questions = dedupedQuestions.map(q => {
        if (q.type !== 'choice') {
          return {
            question: q.question.trim(),
            type: q.type,
            options: undefined,
          }
        }

        const texts = [
          ...(q.options ?? [])
            .map(o => o.trim())
            .filter(o => o && o !== OTHER_OPTION_TEXT),
          OTHER_OPTION_TEXT,
        ]
        const options: AskUserQuestionOption[] = texts.map((text, index) => ({
          label: letterFor(index),
          text,
        }))

        return { question: q.question.trim(), type: q.type, options }
      })

      return {
        title: '向用户提问',
        output: `已向用户提出 ${questions.length} 个问题，等待用户在界面上作答。请立即结束当前轮回复并暂停任务流程；在用户提交答案形成新的用户消息之前，不要继续执行、不要调用其他工具、不要基于假设推进任务，也不要重复提问。收到用户提交的回答后，再根据回答内容继续处理。`,
        metadata: { questions },
      }
    },
  }
}
