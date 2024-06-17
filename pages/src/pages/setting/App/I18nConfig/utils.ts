export enum EnumLocale {
  DEFAULT = 'default',
  BROWER = 'browser',
  LOCALESTORAGE = 'localStorage'
}

type Tconfig = {
  localStorageKey: string,
  localeGetMethod: EnumLocale
}
export const getLocaleLang = (localeConfig: Tconfig = {} as any) => {
  const { localStorageKey = '', localeGetMethod = EnumLocale.DEFAULT } = localeConfig || {}

  if (localeGetMethod === EnumLocale.DEFAULT) {
    return `zh`
  } else if (localeGetMethod === EnumLocale.BROWER) {
    return window.navigator.language || `zh`
  } else if (localeGetMethod === EnumLocale.LOCALESTORAGE) {
    return localStorage.getItem(localStorageKey) || 'zh'
  }
  return `zh`
}