import { myRequire } from '../../../utils/comlib'
const ComLib_Edit = '__comlibs_edit_'
export const addComlib = async (ctx: Record<string, any>, newComlib: Record<string, any>) => {
    try {
        const { styles } =  await myRequire([newComlib.editJs], (error) => {
            Promise.reject(error)
        })
        ctx.comlibs.push(newComlib);
        const loadedComlib = window[ComLib_Edit][window[ComLib_Edit].length-1];
        loadedComlib.id = newComlib.id;
        loadedComlib._styleAry = styles;
        loadedComlib.namespace = newComlib.namespace;
        return loadedComlib
    } catch (error) {
        throw error
    }
   
}