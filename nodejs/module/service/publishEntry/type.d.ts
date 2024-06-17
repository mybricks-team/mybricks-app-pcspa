import { ILocalizationInfo } from "nodejs/module/interface"

type TProcessor = (ctx: TContext) => Promise<void>

type TContext = {
    req: any,
    json: TJson,
    userId: string,
    fileId: number,
    envType: string,
    commitInfo: string,
    appConfig: any
    // 下面的字段，为处理过程中生成的数据
    template?: string,
    configuration?: TConfiguration,
    version?: string,
    needCombo?: boolean,
    hasOldComLib?: boolean,
    comlibRtName?: string,
    app_type?: string,
    comboScriptText?: string
    componentModules?: Array<{
        namespace: string,
        version: string,
        [key: string]: any
    }>,
    globalDeps?: ILocalizationInfo[]
    images?: ILocalizationInfo[]
    result?: any
}

type TJson = {
    configuration: TConfiguration,
    [key]: any
}

type TConfiguration = {
    title: string,
    appConfig: any,
    comlibs: any[],
    projectId: string,
    fileName: string,
    folderPath: string,
    publisherEmail: string,
    publisherName: string,
    groupId: number,
    groupName: string,
    envList: string[],
    i18nLangContent: any,
    runtimeUploadService: string,
    pageHeader: {
        meta?: Array<{ type: string, key: string, content: string }>,
        [key: string]: any
    },
}
enum APPType {
    React = 'react',
    Vue2 = 'vue2',
    Vue3 = 'vue3'
}