export const COOKIE_LOGIN_USER = "mybricks-login-user";

/** 默认组件库，新页面创建时会使用 */
export const ComlibEditUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7632_1.2.11/2023-07-12_15-05-08/edit.js'
export const ComlibRtUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7632_1.2.11/2023-07-12_15-05-08/rt.js'

export const ChartsEditUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5952_1.0.0-main.0/2022-12-06_16-24-51/edit.js'
export const ChartsRtUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5952_1.0.0-main.0/2022-12-06_16-24-51/rt.js'

export const BasicEditUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7182_1.0.22/2023-07-10_21-31-39/edit.js'
export const BasicRtUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7182_1.0.22/2023-07-10_21-31-39/rt.js'


/** 发布时使用，根据 edit 获取 rt 资源 */
export const PC_COMMON_MAP = {
  [ComlibEditUrl]: ComlibRtUrl,
  [ChartsEditUrl]: ChartsRtUrl,
  [BasicEditUrl]: BasicRtUrl
}
