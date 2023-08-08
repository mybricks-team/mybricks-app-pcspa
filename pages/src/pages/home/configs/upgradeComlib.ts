import { myRequire } from '../../../utils/comlib'
const COMLIBS_EDIT = '__comlibs_edit_';

export const upgradeLatestComlib = async (ctx: Record<string, any>, comlib: Record<string, any>) => {
    const { namespace, libId } = comlib;
    const index = ctx.comlibs.findIndex((lib) => namespace===lib.namespace)
    const winIndex = window[COMLIBS_EDIT].findIndex(lib => lib.namespace===namespace)
    if(index===-1 || winIndex===-1) return;
    const { latestComlib } = window[COMLIBS_EDIT][winIndex] ?? {}
    const { editJs, rtJs } = latestComlib;
    try {
        window[COMLIBS_EDIT].splice(winIndex, 1)
        const { styles } =  await myRequire([editJs], (error) => {
            Promise.reject(error)
        })
        ctx.comlibs[index] = {...ctx.comlibs[index], version: latestComlib.version, editJs, rtJs, id: libId}
        const loadedComlib = window[COMLIBS_EDIT][window[COMLIBS_EDIT].length-1];
        loadedComlib.id = libId;
        loadedComlib.namespace = namespace;
        loadedComlib._styleAry = styles;
        return loadedComlib
    } catch (error) {
        throw error
    }
   
}

export const upgradeComlibByVersion = async (ctx: Record<string, any>, comlib: Record<string, any>) => {
    const { id, namespace } = comlib;
    const index = ctx.comlibs.findIndex((lib) => namespace===lib.namespace)
    const winIndex = window[COMLIBS_EDIT].findIndex(lib => lib.namespace===namespace)
    if(index===-1 || winIndex===-1) return;
    try {
        window[COMLIBS_EDIT].splice(winIndex, 1)
        const { styles } =  await myRequire([comlib.editJs], (error) => {
            Promise.reject(error)
        })
        ctx.comlibs.splice(index, 1, comlib);
        const loadedComlib = window[COMLIBS_EDIT][window[COMLIBS_EDIT].length-1];
        loadedComlib.id = id;
        loadedComlib.namespace = namespace;
        loadedComlib._styleAry = styles;
        return loadedComlib
    } catch (error) {
        throw error
    }
}