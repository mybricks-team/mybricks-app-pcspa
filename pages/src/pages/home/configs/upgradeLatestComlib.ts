import { myRequire } from '../../../utils/comlib'
const COMLIBS_EDIT = '__comlibs_edit_'
export const upgradeLatestComlib = async (ctx: Record<string, any>, libId: string) => {
    const index = ctx.comlibs.findIndex(({id}) => id===libId)
    const lastVersionIndex = window[COMLIBS_EDIT].findIndex(lib => lib.id===libId)
    const { latestComlib } = window[COMLIBS_EDIT][lastVersionIndex] ?? {}
    const { editJs, rtJs } = JSON.parse(latestComlib.content)
    window[COMLIBS_EDIT].splice(lastVersionIndex, 1)
    ctx.comlibs[index] = {...ctx.comlibs[index], version: latestComlib.version, editJs, rtJs}
    const { styles } =  await myRequire([editJs], (error) => {
        Promise.reject(error)
    })
    const loadedComlib = window[COMLIBS_EDIT].find(lib => lib.id===libId)
    loadedComlib._styleAry = styles;
    return loadedComlib
}

export const upgradeComlibByVersion = async (ctx: Record<string, any>, comlib: Record<string, any>) => {
    const index = ctx.comlibs.findIndex(({id}) => id===comlib.id)
    ctx.comlibs.splice(index, 1, comlib);
    const winIndex = window[COMLIBS_EDIT].findIndex(lib => lib.id===comlib.id)
    window[COMLIBS_EDIT].splice(winIndex, 1)
    const { styles } =  await myRequire([comlib.editJs], (error) => {
        Promise.reject(error)
    })
    const loadedComlib = window[COMLIBS_EDIT].find(lib => lib.id===comlib.id)
    loadedComlib._styleAry = styles;
    return loadedComlib
}