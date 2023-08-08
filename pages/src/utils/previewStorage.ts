
export class PreviewStorage {

  fileId = ''

  constructor({ fileId }) {
    this.fileId = fileId
  }

  getFileKeyTemplate = (fileId) => `--preview-${fileId}-`;

  savePreviewPageData = ({ dumpJson, comlibs, hasPermissionFn, executeEnv }) => {
    sessionStorage.setItem(`--preview-${this.fileId}-`, JSON.stringify(dumpJson))
    sessionStorage.setItem(`--preview--comlibs--${this.fileId}-`, JSON.stringify(comlibs))
    sessionStorage.setItem(`--preview--hasPermissionFn--${this.fileId}-`, hasPermissionFn)
    sessionStorage.setItem(`--preview--executeEnv--${this.fileId}-`, executeEnv)
  }

  getPreviewPageData = () => {
    let dumpJson = sessionStorage.getItem(`--preview-${this.fileId}-`)
    let comlibs = sessionStorage.getItem(`--preview--comlibs--${this.fileId}-`)
    let hasPermissionFn = sessionStorage.getItem(`--preview--hasPermissionFn--${this.fileId}-`)
    let executeEnv = sessionStorage.getItem(`--preview--executeEnv--${this.fileId}-`)

    try {
      dumpJson = JSON.parse(dumpJson)
    } catch (ex) {
      throw ex
    }

    try {
      comlibs = JSON.parse(comlibs)
    } catch (error) {

    }

    return { dumpJson, comlibs, hasPermissionFn, executeEnv }
  }
}

