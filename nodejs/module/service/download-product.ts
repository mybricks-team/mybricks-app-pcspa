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
import { rimrafSync } from "rimraf";

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
  try {
    Logger.info("[downloadProduct] 开始获取下载资源地址...");
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
    // const zipContent = fs.readFileSync(`${__dirname}/rollback.zip`);
    const zipContent = fs.readFileSync(assetPath);
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

    createFile("/", `${params.fileId}.html`, params.template);
    createFile("/", params.comlibRtName, params.comboScriptText || "");
    params.globalDeps.forEach(({ content, path, name }) => {
      createFile(path, name, content);
    });
    params.images.forEach(({ content, name, path }) => {
      createFile(path, name, Buffer.from(content));
    });

    const reactCanUseTemplate = fs
      .readFileSync(`${__dirname}/download-react-can-use-template.txt`, "utf-8")
      .replace("--pageName--", params.title)
      .replace("--pageId--", params.fileId);

    const vue3CanUseTemplate = fs
      .readFileSync(`${__dirname}/download-vue3-can-use-template.txt`, "utf-8")
      .replace("--pageName--", params.title)
      .replace("--pageId--", params.fileId);

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
      `[downloadProduct] 下载发布产物执行报错: ${
        e?.message || JSON.stringify(e, null, 2)
      }`
    );
    throw e;
  }
}
