import React, { useMemo, useState } from 'react'
import { Button, Input, message } from 'antd'
import {
  OTHER_OPTION_TEXT,
  type AskUserQuestionAIPlugin,
} from '../../ask-user-question'
import style from './index.module.less'

const { TextArea } = Input

type QuestionType = 'choice' | 'text'

type AskUserQuestionOptionMeta = {
  label: string
  text: string
}

type AskUserQuestionMeta = {
  question: string
  type: QuestionType
  options?: AskUserQuestionOptionMeta[]
}

type ToolRecordLike = {
  status?: 'pending' | 'success' | 'error'
  result?: {
    metadata?: {
      questions?: AskUserQuestionMeta[]
    }
  }
  error?: string
}

type AnswerState = {
  /** 多选：已选中的选项文案列表 */
  selected?: string[]
  otherText?: string
  text?: string
}

function isAnswered(question: AskUserQuestionMeta, answer?: AnswerState) {
  if (question.type === 'text') {
    return !!answer?.text?.trim()
  }
  const selected = answer?.selected ?? []
  if (!selected.length) return false
  if (selected.includes(OTHER_OPTION_TEXT) && !answer?.otherText?.trim()) {
    return false
  }
  return true
}

function formatAnswer(question: AskUserQuestionMeta, answer?: AnswerState) {
  if (question.type === 'text') {
    return answer?.text?.trim() ?? ''
  }
  const selected = answer?.selected ?? []
  if (!selected.length) return ''
  return selected
    .map(text => {
      const label = question.options?.find(o => o.text === text)?.label
      if (text === OTHER_OPTION_TEXT) {
        return `${label ? `${label}. ` : ''}其他：${answer?.otherText?.trim() ?? ''}`
      }
      return `${label ? `${label}. ` : ''}${text}`
    })
    .join('；')
}

export function AskUserQuestionRenderer({
  tool,
  requestAI,
}: {
  tool: ToolRecordLike
  requestAI: (params: any) => void
}) {
  const questions = useMemo(() => {
    const raw = tool.result?.metadata?.questions ?? []
    // 兼容历史存量数据：旧版本 execute() 可能重复写入了"其他"等选项，渲染时按文案去重
    return raw.map(q => {
      if (!q.options) return q
      const seen = new Set<string>()
      const options = q.options.filter(option => {
        if (seen.has(option.text)) return false
        seen.add(option.text)
        return true
      })
      return { ...q, options }
    })
  }, [tool.result?.metadata?.questions])

  const [answers, setAnswers] = useState<AnswerState[]>(() =>
    questions.map(() => ({})),
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  if (tool.status === 'pending') {
    return <div className={style.empty}>问题生成中...</div>
  }

  if (tool.status === 'error') {
    return <div className={style.fail}>问题生成失败</div>
  }

  if (!questions.length) {
    return <div className={style.empty}>未生成有效问题</div>
  }

  if (submitted) {
    return (
      <div className={style.root}>
        <div className={style.title}>已提交作答</div>
        <div className={style.summary}>
          {questions.map((q, index) => (
            <div key={index} className={style.summaryItem}>
              <div className={style.summaryQuestion}>
                {index + 1}. {q.question}
              </div>
              <div className={style.summaryAnswer}>
                {formatAnswer(q, answers[index]) || '（未作答）'}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const question = questions[currentIndex]
  const answer = answers[currentIndex]
  const answered = isAnswered(question, answer)
  const isLast = currentIndex === questions.length - 1

  const updateAnswer = (next: AnswerState) => {
    setAnswers(prev => {
      const copy = [...prev]
      copy[currentIndex] = next
      return copy
    })
  }

  const handleSelectOption = (optionText: string) => {
    const selected = answer?.selected ?? []
    const next = selected.includes(optionText)
      ? selected.filter(text => text !== optionText)
      : [...selected, optionText]
    updateAnswer({ ...answer, selected: next })
  }

  const handlePrev = () => {
    setCurrentIndex(index => Math.max(0, index - 1))
  }

  const handleSubmit = () => {
    const summary = questions
      .map(
        (q, index) =>
          `${index + 1}. ${q.question}\n回答：${formatAnswer(q, answers[index])}`,
      )
      .join('\n\n')

    requestAI({
      message: `用户已回答问题：\n\n${summary}`,
      mentionFocus: true,
      attachments: [],
    })
    setSubmitted(true)
  }

  const handleNext = () => {
    if (!answered) return
    if (isLast) {
      handleSubmit()
      return
    }
    setCurrentIndex(index => index + 1)
  }

  return (
    <div className={style.root}>
      <div className={style.header}>
        <div className={style.title}>{question.question}</div>
        <div className={style.badge}>
          {currentIndex + 1}/{questions.length}
        </div>
      </div>

      {question.type === 'text' ? (
        <TextArea
          className={style.textarea}
          value={answer?.text ?? ''}
          placeholder="请输入你的回答"
          autoSize={{ minRows: 2, maxRows: 4 }}
          onChange={event =>
            updateAnswer({ ...answer, text: event.target.value })
          }
        />
      ) : (
        <div className={style.options}>
          {(question.options ?? []).map(option => (
            <button
              key={option.label}
              type="button"
              className={`${style.optionRow} ${
                answer?.selected?.includes(option.text)
                  ? style.optionRowActive
                  : ''
              }`}
              onClick={() => handleSelectOption(option.text)}
            >
              <span className={style.optionLetter}>{option.label}</span>
              <span className={style.optionText}>{option.text}</span>
            </button>
          ))}
          {answer?.selected?.includes(OTHER_OPTION_TEXT) ? (
            <TextArea
              className={style.textarea}
              value={answer?.otherText ?? ''}
              placeholder="请输入具体说明"
              autoSize={{ minRows: 2, maxRows: 4 }}
              onChange={event =>
                updateAnswer({ ...answer, otherText: event.target.value })
              }
            />
          ) : null}
        </div>
      )}

      <div className={style.footer}>
        {currentIndex > 0 ? (
          <Button size="small" onClick={handlePrev}>
            上一题
          </Button>
        ) : null}
        <Button
          type="primary"
          size="small"
          disabled={!answered}
          onClick={handleNext}
        >
          {isLast ? '提交' : '下一题'}
        </Button>
      </div>
    </div>
  )
}
