import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as mkdirp from "mkdirp";
import { rimrafSync } from "rimraf";
import { Logger } from "@mybricks/rocker-commons";

import { transform } from '../../transform'

const archiver = require("archiver");

function convertToUnderscore(input) {
  return input.replace(/[^a-zA-Z0-9]/g, "_");
}

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getComponentName({ namespace, rtType }) {
  const lastIndex = namespace.lastIndexOf('.');
  return convertToUnderscore((lastIndex !== -1 ? namespace.substring(lastIndex + 1) : namespace)).split('_').filter((str) => str).reduce((p, c, index) => {
    return p + (rtType?.match(/^js/gi) ? (index ? capitalizeFirstLetter(c) : c) : capitalizeFirstLetter(c));
  }, "");
}

function getComDeps(json) {
  const ignoreNamespaces = [
    "mybricks.core-comlib.fn",
    "mybricks.core-comlib.var",
    "mybricks.core-comlib.type-change",
    "mybricks.core-comlib.connector",
    "mybricks.core-comlib.frame-input",
    "mybricks.core-comlib.frame-output",
    "mybricks.core-comlib.scenes",
    "mybricks.core-comlib.defined-com",
    "mybricks.core-comlib.module",
    'mybricks.core-comlib.group',
    'mybricks.core-comlib.selection'
  ];
  let definedComsDeps = [];
  let modulesDeps = [];

  if (json.definedComs) {
    Object.keys(json.definedComs).forEach((key) => {
      definedComsDeps = [
        ...definedComsDeps,
        ...json.definedComs[key].json.deps,
      ];
    });
  }

  if (json.modules) {
    Object.keys(json.modules).forEach((key) => {
      modulesDeps = [...modulesDeps, ...json.modules[key].json.deps];
    });
  }

  let deps: { namespace: string, version: string, rtType?: string }[] = [
    ...(json.scenes || [])
      .reduce((pre, scene) => [...pre, ...scene.deps], [])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...(json.global?.fxFrames || [])
      .reduce((pre, fx) => [...pre, ...fx.deps], [])
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...definedComsDeps
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
    ...modulesDeps
      .filter((item) => !ignoreNamespaces.includes(item.namespace)),
  ];

  return deps
}

export default async function publishToCom(res, params) {
  const { json, userId, fileId, envType, commitInfo, appConfig } = params

  const tplFilePath = path.resolve(__dirname, "./com-tpl.txt");

  let template = fs.readFileSync(tplFilePath, "utf8");

  const {
    title,
    envList = [],
    i18nLangContent,
  } = json.configuration;

  Reflect.deleteProperty(json, "configuration");

  try {
    const comDeps = getComDeps(json)
    let coms = ''
    let comDefs = ''

    comDeps.forEach((item, index) => {
      const comName = getComponentName({ namespace: item.namespace, rtType: item.rtType })
      if (index === (comDeps.length - 1)) {
        coms += ` ${comName} `
        comDefs += `'${item.namespace}': { runtime: ${comName} }`
      } else {
        coms += ` ${comName},`
        comDefs += `'${item.namespace}': { runtime: ${comName} },` + '\n'
      }
    })

    template = template.replace(`'--json--'`, JSON.stringify(transform(json)))
      .replace(`'--executeEnv--'`, JSON.stringify(envType))
      .replace(`'--envList--'`, JSON.stringify(envList))
      .replace(`'--i18nLangContent--'`, JSON.stringify(i18nLangContent))
      .replace(`--coms--`, coms)
      .replace(`--comDefs--`, `{${comDefs}}`)

    console.log(template)

    const fileName = `${fileId}_${envType}_${title}`;
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

    createFile("/", `${params.fileId}-app.tsx`, template);

    Logger.info("[downloadProduct] 开始压缩下载文件...");

    const zipFilePath = path.join(os.tmpdir(), zipName);
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(tempDir, false);
    await archive.finalize();

    // 发送zip文件给客户端
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(zipName)}`);
    res.setHeader("Content-Type", "application/zip");
    fs.createReadStream(zipFilePath).pipe(res);
    Logger.info("[downloadProduct] 压缩下载文件完成");

    return {
      zipFilePath
    }
  } catch (error) {
    Logger.error(error);
  }
}