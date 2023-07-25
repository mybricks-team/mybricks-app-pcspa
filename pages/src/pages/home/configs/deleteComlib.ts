export const deleteComlib = (ctx: Record<string, any>, libId: string) => {
    console.log(ctx.comlibs, libId)
    const index = ctx.comlibs.findIndex((lib) => lib.id===libId);
    console.log(index)
    if (index !== -1) {
        ctx.comlibs.splice(index, 1)
        console.log(ctx.comlibs)
    }
    const winIndex = window['__comlibs_edit_'].findIndex((lib) => lib.id===libId);
    if(winIndex!==-1){
        window['__comlibs_edit_'].splice(winIndex, 1)
    }
}