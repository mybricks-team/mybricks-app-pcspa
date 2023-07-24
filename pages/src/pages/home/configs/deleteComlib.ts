export const deleteComlib = (ctx: Record<string, any>, libId: string) => {
    const libs = ctx.comlibs
    const index = libs.findIndex((lib) => lib.id===libId);
    if (index !== -1) {
      libs.splice(index, 1)
      ctx.comlibs = libs
    }
    const winIndex = window['__comlibs_edit_'].findIndex((lib) => lib.id===libId);
    if(winIndex!==-1){
        window['__comlibs_edit_'].splice(winIndex, 1)
    }
}