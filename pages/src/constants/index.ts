export const COOKIE_LOGIN_USER = "mybricks-login-user";

/** 默认组件库，新页面创建时会使用 */
export const ComlibEditUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7632_1.2.15/2023-07-20_11-14-04/edit.js'
export const ComlibRtUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7632_1.2.15/2023-07-20_11-14-04/rt.js'

export const ChartsEditUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5952_1.0.0-main.0/2022-12-06_16-24-51/edit.js'
export const ChartsRtUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5952_1.0.0-main.0/2022-12-06_16-24-51/rt.js'

export const BasicEditUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7182_1.0.28/2023-07-19_16-26-08/edit.js'
export const BasicRtUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7182_1.0.28/2023-07-19_16-26-08/rt.js'


/** 发布时使用，根据 edit 获取 rt 资源 */
export const PC_COMMON_MAP = {
  [ComlibEditUrl]: ComlibRtUrl,
  [ChartsEditUrl]: ChartsRtUrl,
  [BasicEditUrl]: BasicRtUrl
}

export const PC_NORMAL_COM_LIB = {
  id: "7632",
  namespace: 'mybricks.normal-pc',
  editJs: 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7632_1.2.15/2023-07-20_11-14-04/edit.js',
  rtJs: 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7632_1.2.15/2023-07-20_11-14-04/rt.js',
  version: '1.2.15'
}

export const CHARS_COM_LIB = {
  id: "5952",
  namespace: 'mybricks.normal-pc-chart',
  editJs: 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5952_1.0.0-main.0/2022-12-06_16-24-51/edit.js',
  rtJs: 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5952_1.0.0-main.0/2022-12-06_16-24-51/rt.js',
  version: '1.0.0-main.0'
}

export const BASIC_COM_LIB = {
  id: "7182",
  namespace: 'mybricks.basic-comlib',
  editJs: 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7182_1.0.28/2023-07-19_16-26-08/edit.js',
  rtJs: 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7182_1.0.28/2023-07-19_16-26-08/rt.js',
  version: '1.0.28'
}

export const MySelf_COM_LIB = {
  comAray: [],
  id: '_myself_',
  title: '我的组件',
  defined: true,
};
