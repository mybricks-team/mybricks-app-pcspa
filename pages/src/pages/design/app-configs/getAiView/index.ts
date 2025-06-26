import aiViewConfig from './aiview'
import { getAiEncryptData } from "./utils/get-ai-encrypt-data"

const DEFAULT_MODEL = 'deepseek-chat';
function getDesignerParams(args) {
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

  let model = DEFAULT_MODEL, role;

  switch (true) {
    case extraOption?.expert === 'image': {
      model = 'anthropic/claude-sonnet-4';
      role = 'image'
      break;
    }
    case ['image'].includes(extraOption?.aiRole): {
      model = 'anthropic/claude-sonnet-4';
      role = 'image'
      break
    }
    case ['architect'].includes(extraOption.aiRole): {
      model = 'google/gemini-2.5-pro-preview';
      // model = 'openai/gpt-4.1'
      // model = 'deepseek/deepseek-r1-0528'
      role = 'architect'
      break
    }
    case ['expert'].includes(extraOption.aiRole): {
      model = 'anthropic/claude-sonnet-4';
      role = 'expert'
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
  const { model, designerRef } = option ?? {};

  if (enableAI) {
    return {
      ...aiViewConfig,
      getNewDSL: aiViewConfig.getNewDSL({ designerRef }),
      async requestAsStream(messages, ...args) {
        const { context, tools, model, role } = getDesignerParams(args);
        const { write, complete, error, cancel } = context ?? {};
        // 用于debug用户当前使用的模型
        window._ai_use_model_ = model;

        const cancelControl = !!AbortController ? new AbortController() : null;

        cancel?.(() => {
          cancelControl?.abort?.();
        });

        try {
          const response = await fetch(
            APP_ENV === 'production' ? "//ai.mybricks.world/stream-with-tools" : "//ai.mybricks.world/stream-test",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(role ? {
                  "M-Request-Role": role,
                } : {})
              },
              signal: cancelControl?.signal,
              body: JSON.stringify(
                APP_ENV === 'production' ? getAiEncryptData({
                  model,
                  role,
                  messages,
                  tools,
                  tool_choice: 'auto',
                  // tool_choice: {"type": "function", "function": {"name": "query_knowledges"}},
                }) : {
                  model,
                  messages,
                  tools,
                  tool_choice: 'auto',
                }
              ),
            }
          );

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            write(chunk);
          }

          complete();
        } catch (ex) {
          error(ex);
        }
      },
    };
  }

  return void 0;
};

export default getAiView
