import { createAskUserQuestionTool } from './ask-user-question'

const getTools = (params) => {
  return [
    createAskUserQuestionTool(params)
  ]
}

export default getTools
