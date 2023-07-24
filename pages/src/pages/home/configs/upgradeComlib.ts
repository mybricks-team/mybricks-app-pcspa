import { myRequire } from '../../../utils/comlib'
const COMLIBS_EDIT = '__comlibs_edit_'
export const upgradeComlib = async (ctx: Record<string, any>, libId: string) => {
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