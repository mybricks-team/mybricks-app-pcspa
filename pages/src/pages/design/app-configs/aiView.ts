import { Utils } from '@mybricks/sdk-for-ai'
import axios from "axios";
import { getAxiosInstance, getMessageFromAxiosErrorException } from "@mybricks/sdk-for-app/api/util";

export const getAiEncryptData = Utils.getAiEncryptData

// const DEFAULT_MODEL = 'openai/gpt-4o-mini';

const DEFAULT_MODEL = 'deepseek-chat';

let isChecked: 'idle' | boolean = 'idle';

function shouldRouteToCustomService(): Promise<boolean> {
  if (isChecked !== 'idle') {
    return Promise.resolve(isChecked)
  }
  return new Promise((resolve, reject) => {
    getAxiosInstance()
      .get('/api/ai-service/check-config')
      .then(({ data }: any) => {
        if (data?.code === 1) {
          resolve(true)
          isChecked = true
        } else {
          isChecked = false
          resolve(false)
        }
      })
      .catch((e: any) => {
        resolve(false)
        isChecked = false
      })
  });
}

function getDesignerParams (args) {
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
      model = 'anthropic/claude-3.7-sonnet';
      role = 'image'
      break;
    }
    case ['image'].includes(extraOption?.aiRole): {
      model = 'anthropic/claude-3.7-sonnet';
      role = 'image'
      break
    }
    case ['architect'].includes(extraOption.aiRole): {
      model = 'openai/gpt-4o-2024-11-20';
      role = 'architect'
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


export const getAiView = (enableAI, isEncrypt = true) => {
  shouldRouteToCustomService();

  if (enableAI) {
    return {
      async request(messages) {
        // console.log(messages[messages.length - 1].content)

        let content = '处理失败'
        try {
          let res = await axios({
            method: 'POST',
            url: '//ai.mybricks.world/code',
            withCredentials: false,
            data: getAiEncryptData({
              model: DEFAULT_MODEL,
              messages
            }),
            headers: {
              "Content-Type": "application/json",
            },
          }).then((res) => res.data);

          content = res.choices[0].message.content;
          return content;
        } catch (e) {
          console.error(e);
        } finally {
          //     console.log(`prompts: ${prompts},
          // question: ${question},
          // 返回结果: ${content}`)
        }
      },
      async requestAsStream(messages, ...args) {
        const { context, tools, model, role } = getDesignerParams(args);
        const { write, complete, error, cancel } = context ?? {};
        // 用于debug用户当前使用的模型
        window._ai_use_model_ = model;

        try {
          // messages = [
          //   {
          //     "role": "system",
          //     "content": require('./promte_bug.md').default,
          //   },
          //   {
          //     "role": "user",
          //     "content": "（当前选区: 组件整体(selector=:root) ）"
          //   },
          //   {
          //     "role": "user",
          //     "content": [
          //       {
          //         "type": "text",
          //         "text": "开发"
          //       },
                // {
                //   "type": "image_url",
                //   "image_url": messages[2]?.content?.[1].image_url
                // }
          //     ]
          //   },
          //   // {"role":"assistant", "content": "现在进行组件开发，首先请求下知识片段", "tool_calls":[{"id":"call_huIgHHpG17dIJ2jd7O5f0SwA","type":"function","function":{"name":"query_knowledges","arguments":"{\"names\": \"Text,Button\"}"}}]},
          //   // {
          //   //   role: 'tool',
          //   //   name: 'query_knowledges',
          //   //   content: `
          //   //   ## 知识片段-按钮组件
          //   //   按钮的基本使用
          //   //   \`\`\`jsx
          //   //   export default () => <Button style={{ color: 'red' }} onClick={() => {}}>我是按钮</Button>
          //   //   \`\`\`
          //   //   ## 知识片段-文本组件
          //   //   Text的基本使用
          //   //   \`\`\`jsx
          //   //   export default () => <Text style={{ color: 'red' }}>我是文本</Text>
          //   //   \`\`\`
          //   //   `,
          //   //   tool_call_id: 'call_huIgHHpG17dIJ2jd7O5f0SwA'
          //   // },
          //   // {
          //   //   "role": "user",
          //   //   "content": "在页面下方再添加一个输入框，点击按钮清空输入框内容"
          //   // }
          // ]

//           messages = [
//             {
//               "role": "system",
//               "content": "你是一名antd开发者，先解释一下什么是Button，然后通过 function call 的 get_com_docs 获取一下 Button 的组件文档"
//             },
//             {
//               "role": "assistant",
//               "content": `In the Ant Design (antd) library, a Button is a UI component that represents a clickable button element. It is an essential part of interactive forms and controls, enabling users to trigger actions, submit data, or navigate through different parts of an application. The Button component in antd comes with various properties to customize its appearance, behavior, and event-handling functions, such as size, type, shape, and onClick.

// Now, I will get the detailed documentation for the Button component using the function provided.`,
//               "tool_calls": [
//                 {
//                   type: 'function',
//                   id: 'call_JzlpCIpCz86sKeayIrwfkVaA',
//                   function: {
//                     name: 'get_com_docs',
//                     arguments: JSON.stringify({ package: 'antd', coms: 'Button' }),
//                   }
//                 }
//               ]
//             },
//             {
//               role: 'tool',
//               name: 'get_com_docs',
//               content: `
//               按钮的基本使用
//               \`\`\`jsx
//               export default () => <Button style={{ color: 'red' }} onClick={() => {}}>我是按钮</Button>
//               \`\`\`
//               `,
//               tool_call_id: 'call_JzlpCIpCz86sKeayIrwfkVaA'
//             }
//         ]


          // messages = [
          //   {role: "user",      content: "天气预报今天下雨，要不要带伞"},
          //   // {role: "assistant", tool_calls: [{type: "function", function: {name: "getCurrentLocation", arguments: "{}"}, id: "123"}]},
          //   // {role: "tool",      name: "getCurrentLocation", content: "北京", tool_call_id: "123"},
          //   // {role: "assistant", tool_calls: [{type: "function", function: {name: "getWeather", arguments: '{"location": "北京"}'}, id: "1234"}]},
          //   // {role: "tool",      name: "getWeather", content: '{"temperature": "28摄氏度", "preciptation": "high"}', tool_call_id: "1234"},
          //   // {role: "assistant", content: '北京今天是28摄氏度',}
          // ];

          // tools = [
          //   {
          //     "type": "function",
          //     "function": {
          //       "name": "query_weather",
          //       "description": "根据城市名称查询当前天气",
          //       "parameters": {
          //         "type": "object",
          //         "properties": {
          //           "city": {
          //             "type": "string",
          //             "description": "城市名称"
          //           }
          //         },
          //         "required": [
          //           "city"
          //         ]
          //       }
          //     }
          //   },
          //   {
          //     "type": "function",
          //     "function": {
          //       "name": "query_wet",
          //       "description": "根据城市名称查询降雨概率",
          //       "parameters": {
          //         "type": "object",
          //         "properties": {
          //           "city": {
          //             "type": "string",
          //             "description": "城市名称"
          //           }
          //         },
          //         "required": [
          //           "city"
          //         ]
          //       }
          //     }
          //   }
          // ]

          const cancelControl = !!AbortController ? new AbortController() : null;

          cancel?.(() => {
            cancelControl?.abort?.();
          })

          const streamUrl = (await shouldRouteToCustomService()) ? '/api/ai-service/stream' : '//ai.mybricks.world/stream-with-tools'
          
          // //localhost:8002/api/ai-service/stream
          // //localhost:4000/stream-with-tools
          const response = await fetch(streamUrl, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              ...(role ? {
                "M-Request-Role": role,
              }: {})
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
          });

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
