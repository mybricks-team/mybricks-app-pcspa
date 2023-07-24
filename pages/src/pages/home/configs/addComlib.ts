import { myRequire } from '../../../utils/comlib'
const ComLib_Edit = '__comlibs_edit_'
export const addComlib = async (ctx: Record<string, any>, newComlib: Record<string, any>) => {
    ctx.comlibs.push(newComlib)
    const { styles } =  await myRequire([newComlib.editJs], (error) => {
        Promise.reject(error)
    })
    const newWinComlib = window[ComLib_Edit][window[ComLib_Edit].length-1]
    newComlib._styleAry = styles;
    return newWinComlib
}