import aiViewConfig from './aiview'
import { getAIResponse } from './utils/get-ai-response';
// import { mock1Prompts } from './mock';
import mock2Prompts from './mock/mock2Prompts';
// import mock1Res from './mock/mock1Res'
// import mock2Res from './mock/mock2Res'
// import { aiUtils } from "./utils/get-ai-encrypt-data"

const DEFAULT_MODEL = 'google/gemini-3-flash-preview';
// const DEFAULT_MODEL = 'google/gemini-2.5-flash'
// const DEFAULT_MODEL = 'openai/gpt-5.1-codex-max';
// const DEFAULT_MODEL = 'minimax/minimax-m2';
// const DEFAULT_MODEL = 'z-ai/glm-4.6'
// const DEFAULT_MODEL = 'openai/gpt-4.1-mini'
// const DEFAULT_MODEL = 'anthropic/claude-haiku-4.5'
// const DEFAULT_MODEL = 'openai/gpt-5-mini'
// const DEFAULT_MODEL = 'x-ai/grok-4.1-fast'
function getDesignerParams(args, { defaultModel }) {
  let context = args[0];
  let tools = undefined;
  let extraOption = {};

  if (args.length === 2) {
    tools = args[0];
    context = args[1];
  }

  if (args.length === 3) {
    tools = args[0];
    context = args[1];
    extraOption = args[2];
  }

  let model = defaultModel || DEFAULT_MODEL, role;

  switch (true) {
    case extraOption?.expert === 'image': {
      model = 'anthropic/claude-sonnet-4.5';
      role = 'image'
      break;
    }
    case ['image'].includes(extraOption?.aiRole): {
      model = 'anthropic/claude-sonnet-4.5';
      role = 'image'
      break
    }
    case ['architect'].includes(extraOption.aiRole): {
      model = 'google/gemini-3-pro-preview';
      // model = 'openai/gpt-4.1'
      // model = 'deepseek/deepseek-r1-0528'
      role = 'architect'
      break
    }
    case ['expert'].includes(extraOption.aiRole): {
      model = 'anthropic/claude-sonnet-4.5';
      role = 'expert'
      break
    }
    case ['imageCreator'].includes(extraOption.aiRole) || extraOption?.expert === 'imageCreator': {
      model = 'google/gemini-2.5-flash-image-preview';
      role = 'imageCreator'
      break
    }
    default: {
      role = 'default'
      break;
    }
  }

  return {
    context: context ?? {},
    tools,
    model,
    role,
  }
}

const getAiView = (enableAI, option) => {
  const { model: defaultModel, designerRef } = option ?? {};

  if (enableAI) {
    return {
      ...aiViewConfig,
      getSystemExamplePrompts: aiViewConfig.getSystemExamplePrompts({ designerRef }),
      getNewDSL: aiViewConfig.getNewDSL({ designerRef }),
      async requestAsStream(messages, ...args) {
        const { context, tools, model, role } = getDesignerParams(args, {
          defaultModel
        });
        const { write, complete, error, cancel } = context ?? {};
        // 用于debug用户当前使用的模型
        window._ai_use_model_ = model;

        // const cancelControl = !!AbortController ? new AbortController() : null;

        // cancel?.(() => {
        //   cancelControl?.abort?.();
        // });

        let _message = Array.from(messages)

        const isFirstOne = messages.length === 2
        if (isFirstOne) {
          // write(mock1Res);
          // complete();
          // return
          // _message[0].content = mock1Prompts
        }

        const isScenond = messages.length > 2
        if (isScenond) {
          // console.log(_message)
        }

        // console.log(2, _message)

        try {
          const { abort } = await getAIResponse({
            model,
            messages: _message,
            role,
            tools
          }, {
            onMessage: (chunk) => {
              write(chunk);
            },
            onComplete: (content) => {
              complete();
            },
            devMode: APP_ENV !== 'production',
          })

          cancel?.(abort)

          // const response = await fetch(
          //   APP_ENV === 'production' ? "//ai.mybricks.world/stream-with-tools" : "//ai.mybricks.world/stream-test",
          //   {
          //     method: "POST",
          //     headers: {
          //       "Content-Type": "application/json",
          //       ...(role ? {
          //         "M-Request-Role": role,
          //       } : {})
          //     },
          //     signal: cancelControl?.signal,
          //     credentials: 'include',
          //     body: JSON.stringify(
          //       APP_ENV === 'production' ? aiUtils.getAiEncryptData({
          //         model,
          //         role,
          //         messages,
          //         tools,
          //         tool_choice: 'auto',
          //         // tool_choice: {"type": "function", "function": {"name": "query_knowledges"}},
          //       }) : {
          //         model,
          //         messages,
          //         tools,
          //         tool_choice: 'auto',
          //       }
          //     ),
          //   }
          // );

          // const reader = response.body.getReader();
          // const decoder = new TextDecoder();

          // while (true) {
          //   const { done, value } = await reader.read();
          //   if (done) {
          //     break;
          //   }

          //   const chunk = decoder.decode(value, { stream: true });
          //   write(chunk);
          // }

          // complete();
        } catch (ex) {
          error(ex);
        }
      },
    };
  }

  return void 0;
};

export default getAiView
