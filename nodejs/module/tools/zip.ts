import { Logger } from "@mybricks/rocker-commons";
const JSZip = require('jszip');

/**
 *  将 JavaScript 对象压缩成 ZIP 文件
 */
export async function compressJsonObjectToZip(jsonObject: Record<string, unknown>) {
  try {
    const zipContent = JSON.stringify(jsonObject);
    const zip = new JSZip();
    zip.file("data.json", zipContent);
    const content = await zip.generateAsync({ type: "nodebuffer" });
    return content;
  } catch (e) {
    Logger.error("文件压缩失败！");
    throw e;
  }
}

/**
 * 解压 ZIP 文件回 JavaScript 对象
 * ZIP 数据读取 demo: const zipContent = JSON.parse(fs.readFileSync(filePath));
 */
export async function decompressZipToJsonObject(zipContent) {
  try {
    const unzippedContent = await JSZip.loadAsync(zipContent);
    const unzippedJsonObject = JSON.parse(
      await unzippedContent.file("data.json").async("text")
    );
    return unzippedJsonObject;
  } catch (e) {
    Logger.error("文件解压失败！");
    throw e;
  }
}
