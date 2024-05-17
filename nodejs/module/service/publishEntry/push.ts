import { Logger } from "@mybricks/rocker-commons";
import { getCustomPublishApi } from "../../tools/get-app-config";
import API from "@mybricks/sdk-for-app/api";
import axios from "axios";
import { compressObjectToGzip } from "../../tools/zip";
import { TContext, TProcessor } from "./type";


export const pushProcessor: TProcessor = async (ctx) => {
    const {
        envType,
        fileId,
        version,
        commitInfo,
        json,
        template,
        needCombo,
        comboScriptText,
        images,
        globalDeps,
        comlibRtName,
        userId,
    } = ctx;
    const { publisherEmail, publisherName, title, groupId, groupName, folderPath, projectId, fileName } = ctx.configuration
    const params = {
        envType,
        fileId,
        title,
        publisherEmail,
        publisherName,
        version,
        commitInfo,
        groupId,
        groupName,
        json,
        template,
        needCombo,
        comboScriptText,
        images,
        globalDeps,
        folderPath,
        projectId,
        comlibRtName,
        fileName,
        userId,
        origin: ctx.req.headers.origin
    };
    await publishPush(params, ctx.version, true)
}

/**
 * 推送发布内容到目标机器
 */
export async function publishPush(
    params,
    nowVersion?: string,
    needPublishFile?: boolean
) {
    const {
        envType,
        fileId,
        title,
        publisherEmail,
        publisherName,
        version,
        commitInfo,
        groupId,
        groupName,
        json,
        template,
        needCombo,
        comboScriptText,
        images,
        globalDeps,
        folderPath,
        projectId,
        comlibRtName,
        fileName,
        userId,
        origin
    } = params;

    let uploadfolderPath;
    if (projectId) {
        if (envType === 'staging') {
            uploadfolderPath = `/staging/project/${projectId}/${fileId}`;
        } else {
            uploadfolderPath = `/project/${projectId}/${fileId}`;
        }
    } else {
        uploadfolderPath = `${folderPath}/${envType || "prod"}`;
    }

    let publishMaterialInfo;

    const customPublishApi = await getCustomPublishApi();

    Logger.info(`[publish] getCustomPublishApi = ${customPublishApi}`);

    const startPublishTime = Date.now();
    Logger.info("[publish] 开始推送数据...");

    if (customPublishApi) {
        Logger.info("[publish] 有配置发布集成接口，尝试向发布集成接口推送数据...");

        try {
            publishMaterialInfo = await customPublish({
                envType,
                fileId,
                title,
                publisherEmail,
                publisherName,
                version,
                nowVersion,
                commitInfo,
                groupId,
                groupName,
                json,
                template,
                needCombo,
                comboScriptText,
                customPublishApi,
                images: images.map(({ content, name, path }) => ({
                    content,
                    path: `/${path}/${name}`,
                })),
                globalDeps: globalDeps?.map(({ content, name, path }) => ({
                    content,
                    path: `${path}/${name}`,
                })),
            });
        } catch (e) {
            Logger.error(`[publish] 推送数据失败: ${JSON.stringify(e, null, 2)}`);
            throw e;
        }

        Logger.info("[publish] 推送数据成功！");

        if (!publishMaterialInfo?.url) {
            const errStr = `[publish] 发布集成接口出错: 没有返回url`;
            Logger.error(errStr);
            throw new Error(errStr);
        } else if (
            typeof publishMaterialInfo?.url !== "string" ||
            !publishMaterialInfo?.url?.startsWith("http")
        ) {
            const errStr = `[publish] 发布集成返回的url格式不正确 url: ${publishMaterialInfo?.url}`;
            Logger.error(errStr);
            throw new Error(errStr);
        }
    } else {
        Logger.info("[publish] 未配置发布集成接口，尝试向静态服务推送数据...");

        try {
            if (globalDeps) {
                Logger.info("[publish] 正在尝试上传公共依赖...");
                // 将所有的公共依赖上传到对应位置
                await Promise.all(
                    globalDeps.map(({ content, path, name }) => {
                        return API.Upload.staticServer({
                            content,
                            folderPath: `${uploadfolderPath}/${path}`,
                            fileName: name,
                            noHash: true
                        });
                    })
                );
                Logger.info("[publish] 公共依赖上传成功！");
            }

            if (needCombo) {
                Logger.info("[publish] 正在尝试上传 needCombo...");
                Array.isArray(comboScriptText)
                    ? Promise.all(comboScriptText.map(async item => {
                        const { content, name } = item
                        const exist = await checkStaticFile(origin, folderPath, name)
                        if (!exist) {
                            return API.Upload.staticServer({
                                content,
                                folderPath: folderPath,
                                fileName: name,
                                noHash: true
                            })
                        }
                    }))
                    : await API.Upload.staticServer({
                        content: comboScriptText || '',
                        folderPath: uploadfolderPath,
                        fileName: comlibRtName,
                        noHash: true
                    });
                Logger.info("[publish] needCombo 上传成功！");
            }

            Logger.info("[publish] 正在尝试上传 template...");
            publishMaterialInfo = await API.Upload.staticServer({
                content: template,
                folderPath: uploadfolderPath,
                fileName,
                noHash: true
            });
            Logger.info(
                `[publish] template 上传成功！地址：${publishMaterialInfo.url}`
            );

            if (publishMaterialInfo?.url?.startsWith("https")) {
                publishMaterialInfo.url = publishMaterialInfo.url.replace(
                    "https",
                    "http"
                );
            }

            Logger.info(
                `[publish] 向静态服务推送数据成功！ ${JSON.stringify(
                    publishMaterialInfo,
                    null,
                    2
                )}`
            );
        } catch (e) {
            Logger.error(`[publish] 向静态服务推送数据失败！${JSON.stringify(e)}`);
            throw new Error("向静态服务推送数据失败！");
        }
    }

    Logger.info(
        `[publish] 推送数据完成，耗时：${(Date.now() - startPublishTime) / 1000}s`
    );

    if (needPublishFile) {
        Logger.info("[publish] API.File.publish: begin ");
        const result = await API.File.publish({
            userId,
            fileId,
            extName: "pc-page",
            commitInfo,
            content: JSON.stringify({ ...publishMaterialInfo, json }),
            type: envType,
        });

        Logger.info("[publish] API.File.publish: ok ");

        return result;
    }
}

/**
 * 通过发布集成推送数据
 */
async function customPublish(params) {
    const {
        envType,
        fileId,
        title,
        publisherEmail,
        publisherName,
        version,
        nowVersion,
        commitInfo,
        groupId,
        groupName,
        json,
        template,
        needCombo,
        comboScriptText,
        customPublishApi,
        images,
        globalDeps,
    } = params;

    let permissions = [];

    if (json?.permissions) {
        json?.permissions.forEach((item) => {
            permissions.push({
                code: item.register.code,
                title: item.register.title,
                remark: item.register.remark,
            });
        });
    }

    const dataForCustom = await compressObjectToGzip({
        env: envType,
        productId: fileId,
        productName: title,
        publisherEmail,
        publisherName: publisherName || "",
        version: !!nowVersion ? nowVersion : version,
        commitInfo,
        type: "pc-page",
        groupId,
        groupName,
        content: {
            json: JSON.stringify(json),
            html: template,
            js: needCombo
                ? Array.isArray(comboScriptText)
                    ? comboScriptText
                    : [
                        {
                            name: `${fileId}-${envType}-${version}.js`,
                            content: comboScriptText,
                        },
                    ]
                : [],
            permissions,
            images,
            globalDeps,
        },
    });

    // 计算发布集成推送数据的 MB 大小 (四舍五入)
    const megabytes =
        Math.round((Buffer.byteLength(dataForCustom) / (1024 * 1024)) * 100) / 100;

    Logger.info(`[publish] 发布集成推送数据大小(压缩后)为: ${megabytes} MB`);
    Logger.info(`[publish] nowVersion = ${nowVersion} dataVersion = ${version}`);

    const { code, message, data } = await axios
        .post(customPublishApi, dataForCustom, {
            headers: {
                "Content-Encoding": "gzip", // 指定数据编码为gzip
                "Content-Type": "application/json", // 指定数据类型为JSON
            },
        })
        .then((res) => res.data)
        .catch((e) => {
            Logger.error(`[publish] 发布集成接口出错: ${e.message}`, e);
            throw new Error(`发布集成接口出错: ${e.message}`);
        });
    if (code !== 1) {
        Logger.error(`[publish] 发布集成接口出错: ${message}`);
        throw new Error(`发布集成接口出错: ${message}`);
    }

    return data;
}


async function checkStaticFile(origin, forlder, fileName) {
    const url = `${origin}/mfs${forlder}/${fileName}`
    const res = await axios
        .get(url)
        .then((res) => true)
        .catch((e) => {
            return false
        });
    return res;
}