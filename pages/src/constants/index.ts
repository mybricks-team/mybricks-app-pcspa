export const COOKIE_LOGIN_USER = "mybricks-login-user";

export const RENDER_WEB = "https://f2.beckwai.com/udata/pkg/eshop/fangzhou-asset/index.min.82439acd4d7430e8.js";


/** 所有版本的组件库组件，兼容已有页面 */
// const ComlibEdit1049Url = `https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5665_1.0.49/2022-11-23_16-54-39/edit.js`
// const ComlibRt1049Url = `https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5665_1.0.49/2022-11-23_16-54-39/rt.js`

// const ComlibEdit1078Url = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5665_1.0.78/2022-12-30_15-27-16/edit.js'
// const ComlibRt1078Url = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5665_1.0.78/2022-12-30_15-27-16/rt.js'

// const ComlibEdit1080Url = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5665_1.0.80/2023-01-12_11-28-05/edit.js'
// const ComlibRt1080Url = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5665_1.0.80/2023-01-12_11-28-05/rt.js'

/** 默认组件库，新页面创建时会使用 */
export const ComlibEditUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5665_1.1.54/2023-05-19_11-27-32/edit.js'
export const ComlibRtUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5665_1.1.54/2023-05-19_11-27-32/rt.js'

export const ChartsEditUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5952_1.0.0-main.0/2022-12-06_16-24-51/edit.js'
export const ChartsRtUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/5952_1.0.0-main.0/2022-12-06_16-24-51/rt.js'

export const BasicEditUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7182_1.0.17-main.2/2023-05-16_11-03-17/edit.js'
export const BasicRtUrl = 'https://f2.eckwai.com/kos/nlav12333/fangzhou/pub/comlibs/7182_1.0.17-main.2/2023-05-16_11-03-17/rt.js'



/** 发布时使用，根据 edit 获取 rt 资源 */
export const PC_COMMON_MAP = {
    [ComlibEditUrl]: ComlibRtUrl,
    [ChartsEditUrl]: ChartsRtUrl,
    [BasicEditUrl]: BasicRtUrl
    // [ComlibEdit1049Url]: ComlibRt1049Url,
    // [ComlibEdit1078Url]: ComlibRt1078Url,
    // [ComlibEdit1080Url]: ComlibRt1080Url,
}
