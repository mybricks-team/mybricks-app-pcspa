import * as fs from "fs";
import API from "@mybricks/sdk-for-app/api";
import { Logger } from "@mybricks/rocker-commons";
import { decompressGzipToObject } from "../tools/zip";
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
    Logger.info('[downloadProduct] 开始获取下载资源地址...');
    const { assetPath } = (await API.File.getPubAssetPath({
      fileId,
      envType,
      version,
    })) as { assetPath: string };
    Logger.info(`[downloadProduct] 下载资源地址为: ${assetPath}`);
    Logger.info('[downloadProduct] 开始读取资源...');
    const zipContent = fs.readFileSync(assetPath);
    Logger.info('[downloadProduct] 解压资源...');
    const params = (await decompressGzipToObject(zipContent)) as any;

    // 创建临时文件夹
    const tempDir = path.join(os.tmpdir(), "product-content");
    rimrafSync(tempDir);
    mkdirp.sync(tempDir);

    Logger.info('[downloadProduct] 开始生成下载文件...');

    // 创建文件
    const createFile = (folderPath, name, content) => {
      const indexHtmlDir = path.join(tempDir, folderPath);
      mkdirp.sync(indexHtmlDir);
      fs.writeFileSync(path.join(indexHtmlDir, name), content);
    };

    createFile("/", "index.html", params.template);
    createFile("/", params.comlibRtName, params.comboScriptText);
    params.globalDeps.forEach(({ content, path, name }) => {
      createFile(path, name, content);
    });
    params.images.forEach(({ content, name, path }) => {
      createFile(path, name, Buffer.from(content));
    });

    Logger.info('[downloadProduct] 开始压缩下载文件...');

    // 创建zip文件并写入文件
    const zipFilePath = path.join(os.tmpdir(), "product-content.zip");
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(tempDir, false);
    await archive.finalize();

    // 发送zip文件给客户端
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=product-content.zip"
    );
    res.setHeader("Content-Type", "application/zip");
    fs.createReadStream(zipFilePath).pipe(res);

    Logger.info('[downloadProduct] 压缩下载文件完成');
  } catch (e) {
    Logger.error(
      `[downloadProduct] 下载发布产物执行报错: ${
        e?.message || JSON.stringify(e, null, 2)
      }`
    );
    throw e;
  }
}
