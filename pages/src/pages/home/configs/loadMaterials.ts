import { compareVersions } from 'compare-versions';
import { myRequire, getComlibsByNamespaceAndVersion } from '../../../utils/comlib'

const MySelfId = '_myself_';
const ComLib_Edit = '__comlibs_edit_'

export const loadMaterials = async (ctx: Record<string, any>, update: boolean = false) => {
    const { comlibs: libs,latestComlibs, hasMaterialApp } = ctx
    const mySelfComlib = libs.find(lib => lib?.id === MySelfId)
    const comlibs = libs.filter(lib => lib?.id !== MySelfId)
    if(update){
        window[ComLib_Edit] = []
    }
    await Promise.all([
        hasMaterialApp? getComlibsByNamespaceAndVersion(mySelfComlib?.comAray): Promise.resolve(),
        comlibs.length? myRequire(comlibs.map(lib => lib?.editJs??lib), (error) => {
            Promise.reject(error)
        }):Promise.resolve({ styles: [] })
    ]).then(([_, {styles}]) => {
        comlibs.forEach(lib => {
            const {namespace, version} = lib;
            const latestComlib = latestComlibs.find(lastLib => lastLib.namespace===namespace && !!compareVersions(lastLib.version, version));
            const loadedComlib = window[ComLib_Edit].find(({id}) => lib.id===id)
            if(latestComlib && loadedComlib){
                loadedComlib.latestComlib = latestComlib;
            }
        });
        const comlibIndex = window[ComLib_Edit].findIndex((comlib) => comlib.id !== MySelfId);
        if (comlibIndex !== -1) {
          window[ComLib_Edit][comlibIndex]._styleAry = styles;
        }
    })
    return window[ComLib_Edit]
}