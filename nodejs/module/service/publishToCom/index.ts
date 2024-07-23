import * as fs from "fs";
import * as path from "path";
import * as prettier from 'prettier';
import * as prettierPluginVue from 'prettier-plugin-vue'
import PublishToComSDK_API from '@mybricks/publish-to-com-sdk/api';
import API from "@mybricks/sdk-for-app/api";
import { ToJSON } from "./type";
import { getAppConfig } from "../../tools/get-app-config";
import { Logger } from "@mybricks/rocker-commons";

export default async function publishToCom(params: {
  json: ToJSON & { configuration: any };
  userId: string;
  fileId: number;
  componentName: string;
  envType: string;
  hostname: string;
  toLocalType: string;
  origin: string;
  staticResourceToCDN: boolean;
}) {
  const appConfig = await getAppConfig();

  if (params.toLocalType === 'react') {
    const { codes, staticResources } = await PublishToComSDK_API.replaceTemplate({
      ...params,
      getMaterialContent: API.Material.getMaterialContent,
      uploadCDNUrl: appConfig?.baseConfig?.uploadToCDN,
    }, [
      fs.readFileSync(path.resolve(__dirname, "./templates/com-tpl-for-react.txt"), "utf8"),
      fs.readFileSync(path.resolve(__dirname, "./templates/config-tpl-for-react.txt"), "utf8"),
      fs.readFileSync(path.resolve(__dirname, "./templates/readme-for-react.txt"), "utf8"),
    ], { Logger });

    return {
      index: await prettier.format(codes[0], {
        parser: 'babel-ts', // 使用babel-ts解析器，支持TSX格式
        semi: true,         // 在语句末尾添加分号
        singleQuote: true,  // 使用单引号
        tabWidth: 2         // 缩进宽度
      }),
      config: await prettier.format(codes[1], {
        parser: 'babel-ts', // 使用babel-ts解析器，支持TSX格式
        semi: true,         // 在语句末尾添加分号
        singleQuote: true,  // 使用单引号
        tabWidth: 2         // 缩进宽度
      }),
      readme: codes[2],
      staticResources: staticResources,
    }
  } else {
    const { codes, staticResources } = await PublishToComSDK_API.replaceTemplate({
      ...params,
      getMaterialContent: API.Material.getMaterialContent,
      uploadCDNUrl: appConfig?.baseConfig?.uploadToCDN,
    }, [
      fs.readFileSync(path.resolve(__dirname, "./templates/com-tpl-for-vue.txt"), "utf8"),
      fs.readFileSync(path.resolve(__dirname, "./templates/com-tpl-for-vue-index.txt"), "utf8"),
      fs.readFileSync(path.resolve(__dirname, "./templates/config-tpl-for-vue.txt"), "utf8"),
      fs.readFileSync(path.resolve(__dirname, "./templates/readme-for-vue.txt"), "utf8"),
    ]);

    return {
      index: await prettier.format(codes[0], {
        parser: 'vue',         // 使用vue解析器
        plugins: [prettierPluginVue],  // 加载prettier-plugin-vue插件
        semi: true,            // 在语句末尾添加分号
        singleQuote: true,     // 使用单引号
        tabWidth: 2            // 缩进宽度
      }),
      vueIndex: await prettier.format(codes[1], {
        parser: 'babel-ts', // 使用babel-ts解析器，支持TSX格式
        semi: true,         // 在语句末尾添加分号
        singleQuote: true,  // 使用单引号
        tabWidth: 2         // 缩进宽度
      }),
      config: await prettier.format(codes[2], {
        parser: 'babel-ts', // 使用babel-ts解析器，支持TSX格式
        semi: true,         // 在语句末尾添加分号
        singleQuote: true,  // 使用单引号
        tabWidth: 2         // 缩进宽度
      }),
      readme: codes[3],
      staticResources: staticResources,
    }
  }
}