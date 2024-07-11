import * as fs from "fs";
import API from "@mybricks/sdk-for-app/api";
import { Logger } from "@mybricks/rocker-commons";
import {
  decompressGzipToObject,
  getCurrentTimeForFileName,
} from "../tools/zip";
import { Response } from "express";
import * as os from "os";
import * as mkdirp from "mkdirp";
import publiAssets from './local-public';
import { rimrafSync } from "../tools";

const path = require("path");
const archiver = require("archiver");

export async function downloadProduct(
  res: Response,
  {
    fileId,
    envType,
    version,
  }: { fileId: number; envType: string; version: string }
) {
  Logger.info("[downloadProduct] 开始获取下载资源地址...");
  try {
    Logger.info(
      `[downloadProduct] 调用 API.File.getPubAssetPath，参数 fileId: ${fileId} envType: ${envType} version: ${version}`
    );
    const { assetPath } = (await API.File.getPubAssetPath({
      fileId,
      envType,
      version,
    })) as { assetPath: string };
    Logger.info(`[downloadProduct] 下载资源地址为: ${assetPath}`);
    Logger.info("[downloadProduct] 开始读取资源...");

    // 本地测试下载时，读取保存到本地的资源
    const zipContent = fs.readFileSync(assetPath);
    // const zipContent = fs.readFileSync(path.resolve(__dirname, './rollback.zip'));
    Logger.info("[downloadProduct] 解压资源...");
    const params = (await decompressGzipToObject(zipContent)) as any;

    const fileName = `${fileId}_${envType}_${version}_${getCurrentTimeForFileName()}`;
    const zipName = `${fileName}.zip`;

    // 创建临时文件夹
    const tempDir = path.join(os.tmpdir(), fileName);
    rimrafSync(tempDir);
    mkdirp.sync(tempDir);
    Logger.info("[downloadProduct] 开始生成下载文件...");


    // 创建文件
    const createFile = (folderPath, name, content) => {
      const indexHtmlDir = path.join(tempDir, folderPath);
      mkdirp.sync(indexHtmlDir);
      fs.writeFileSync(path.join(indexHtmlDir, name), content);
    };

    const publicAssetsRegex = /<!--\s*public\s*assets\s*begin\s*-->[\s\S]*?<!--\s*public\s*assets\s*end\s*-->/
    params.template = params.template
      // 将组件库代码写入html中，不是使用单独的js文件
      .replace(`<script src="./${params.comlibRtName}"></script>`, () => {
        return `<script>${params.comboScriptText || ""}</script>`
      })
      // 将本地资源替换成cdn资源
      .replace(publicAssetsRegex, () => {
        return publiAssets.react.map(item => {
          const tagStr = item.tag.toLocaleLowerCase()
          return tagStr === 'link' ? `<link rel="stylesheet" href="http:${item.CDN}" />` : `<script src="http:${item.CDN}"></script>`
        }).join('\n')
        //         return `<script src="http://f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690443543399.2.29.4_moment.min.js"></script>
        //       <script src="http://f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690443577599.2.29.4_locale_zh-cn.min.js"></script>
        //       <link rel="stylesheet" href="http://f2.eckwai.com/udata/pkg/eshop/fangzhou/pub/pkg/antd-4.21.6/antd.variable.min.css" />
        //       <script src="http://f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690446345009.react.18.0.0.production.min.js"></script>
        //       <script
        //         src="http://f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690443341846.umd_react-dom.production.min.js"></script>
        //       <script src="http://f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690444184854.4.21.6_antd.min.js"></script>
        //       <script src="http://f2.eckwai.com/udata/pkg/eshop/fangzhou/pub/pkg/antd-4.21.6/locale/zh_CN.js"></script>
        //       <script src="http://f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690444248634.ant-design-icons_4.7.0_min.js"></script>
        //       <script src="http://f2.beckwai.com/udata/pkg/eshop/fangzhou/pub/pkg/ant-design/charts-1.3.5/charts.min.js"></script>
        //       <script src="http://f2.eckwai.com/kos/nlav12333/mybricks/plugin-http-connector/1.2.3/index.js"></script>
        //       <script
        //         src="http://f2.eckwai.com/kos/nlav11092/fangzhou/pub/temp/1690445635042.mybricks_plugin-connector-domain@0.0.44.js"></script>
        //       <script src="https://test.mybricks.world/mfs/app/pcpage/test/public/render-web/1.2.62/index.min.js"></script>
        // `
      })
    createFile("/", `${params.fileId}.html`, params.template);

    // params.globalDeps.forEach(({ content, path, name }) => {
    //   createFile(path, name, content);
    // });

    params.images.forEach(({ content, name, path }) => {
      createFile(path, name, Buffer.from(content));
    });


    // 从html中提取pageRuntime代码
    let pageRunime = ''
    const regex = /<script type="text\/javascript">([\s\S]*?)<\/script><\/body>/;
    const match = params.template.match(regex);
    // 检查是否有匹配项
    if (match && match[1]) {
      // 输出匹配到的脚本内容
      pageRunime = match[1]
    }

    const parseTempalte = (template: string) => {
      return template.replace("--pageName--", params.title)
        .replace(/\\n/g, '\\\\n')
        .replace("--html-style-links--", JSON.stringify(publiAssets.react.filter(item => item.tag.toLocaleLowerCase() === 'link').map(item => item.CDN)))
        .replace("--html-script-links--", JSON.stringify(publiAssets.react.filter(item => item.tag.toLocaleLowerCase() === 'script').map(item => 'http:' + item.CDN)))
        .replace("--mybricks_comlibsText--", JSON.stringify(params.comboScriptText))
        .replace("--mybricks_pageRuntime--", JSON.stringify(pageRunime))
    }

    const reactCanUseTemplate = parseTempalte(fs
      .readFileSync(`${__dirname}/download-react-can-use-template.txt`, "utf-8"))

    const vue3CanUseTemplate = parseTempalte(fs
      .readFileSync(`${__dirname}/download-vue3-can-use-template.txt`, "utf-8"))


    createFile("/", `${params.fileId}-app.js`, reactCanUseTemplate);
    createFile("/", `${params.fileId}-app-vue3.vue`, vue3CanUseTemplate);
    Logger.info("[downloadProduct] 开始压缩下载文件...");


    // 创建zip文件并写入文件
    const zipFilePath = path.join(os.tmpdir(), zipName);
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(tempDir, false);
    await archive.finalize();

    // 发送zip文件给客户端
    res.setHeader("Content-Disposition", `attachment; filename=${zipName}`);
    res.setHeader("Content-Type", "application/zip");
    fs.createReadStream(zipFilePath).pipe(res);
    Logger.info("[downloadProduct] 压缩下载文件完成");

  } catch (e) {
    Logger.error(
      `[downloadProduct] 下载发布产物执行报错: ${e?.message || JSON.stringify(e, null, 2)
      } `
    );
    throw e;
  }
}
