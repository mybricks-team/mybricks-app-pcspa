
export class PreviewStorage {

  fileId = ''

  constructor({ fileId }) {
    this.fileId = fileId
  }

  getFileKeyTemplate = (fileId) => `--preview-${fileId}-`;

  savePreviewPageData = ({ dumpJson, comlibs, hasPermissionFn, executeEnv, appConfig, envList, MYBRICKS_HOST, directConnection, i18nLangContent }) => {
    sessionStorage.setItem(`--preview-${this.fileId}-`, JSON.stringify(dumpJson))
    sessionStorage.setItem(`--preview--comlibs--${this.fileId}-`, JSON.stringify(comlibs))
    sessionStorage.setItem(`--preview--hasPermissionFn--${this.fileId}-`, hasPermissionFn)
    sessionStorage.setItem(`--preview--executeEnv--${this.fileId}-`, executeEnv)
    sessionStorage.setItem(`--preview--directConnection--${this.fileId}-`, JSON.stringify(!!directConnection))
    sessionStorage.setItem(`--preview--appConfig--${this.fileId}-`, appConfig)
    sessionStorage.setItem(`--preview--envList--${this.fileId}-`, JSON.stringify(envList))
    sessionStorage.setItem(`--preview--MYBRICKS_HOST--${this.fileId}-`, JSON.stringify(MYBRICKS_HOST))
    sessionStorage.setItem(`--preview--i18nLangContent--${this.fileId}-`, JSON.stringify(i18nLangContent))
  }

  getPreviewPageData = () => {
    let dumpJson = sessionStorage.getItem(`--preview-${this.fileId}-`)
    let comlibs = sessionStorage.getItem(`--preview--comlibs--${this.fileId}-`)
    let hasPermissionFn = sessionStorage.getItem(`--preview--hasPermissionFn--${this.fileId}-`)
    let executeEnv = sessionStorage.getItem(`--preview--executeEnv--${this.fileId}-`)
    let directConnection = false;
    let MYBRICKS_HOST
    let appConfig
    let envList = []
    let i18nLangContent

    try {
      dumpJson = JSON.parse(dumpJson)
    } catch (ex) {
      throw ex
    }

    try {
      appConfig = JSON.parse(sessionStorage.getItem(`--preview--appConfig--${this.fileId}-`))
    } catch (ex) {
      throw ex
    }
    try {
      envList = JSON.parse(sessionStorage.getItem(`--preview--envList--${this.fileId}-`))
    } catch (ex) {
      throw ex
    }
    try {
      MYBRICKS_HOST = JSON.parse(sessionStorage.getItem(`--preview--MYBRICKS_HOST--${this.fileId}-`))
    } catch (ex) {
      throw ex
    }
    try {
      directConnection = JSON.parse(sessionStorage.getItem(`--preview--directConnection--${this.fileId}-`) || 'false')
    } catch (ex) {
      throw ex
    }

    try {
      i18nLangContent = JSON.parse(sessionStorage.getItem(`--preview--i18nLangContent--${this.fileId}-`))
    } catch (ex) {
      throw ex
    }

    try {
      comlibs = JSON.parse(comlibs)
    } catch (error) {

    }

    return {
      // TODO: 没找到 dumpJson 对应的类型，等这个类型补上了吧这里修改掉
      dumpJson: dumpJson as any,
      // TODO: 没找到 comlibs 对应的类型，等这个类型补上了吧这里修改掉
      comlibs: comlibs as any,
      hasPermissionFn,
      executeEnv,
      appConfig,
      MYBRICKS_HOST,
      envList,
      directConnection,
      i18nLangContent
    }
  }
}

