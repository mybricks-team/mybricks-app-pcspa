import { compareVersions } from 'compare-versions';
import { getComlibsByNamespaceAndVersion } from '../../../utils/comlib'
import { requireScript } from '../../../utils/requireScript'

const MySelfId = '_myself_';
const ComLib_Edit = '__comlibs_edit_'

export const initMaterials = async (ctx: Record<string, any>) => {
    const { comlibs, hasMaterialApp, latestComlibs } = ctx;
    const myselfLib = comlibs.find(lib => lib?.id === MySelfId);
    const libs = comlibs.filter(lib => lib?.id !== MySelfId);
    if(myselfLib && hasMaterialApp) {
        await getComlibsByNamespaceAndVersion(myselfLib?.comAray)
    }
    const styleArr = [];
    await Promise.all(
        libs.map(lib => requireScript(lib?.editJs??lib))
    ).then((res) => {
        //insert namespace, replace id
        res.forEach(({styles}, index) => {
            window[ComLib_Edit][index+1] = {
                ...window[ComLib_Edit][index+1],
                id: libs[index].id,
                namespace: libs[index].namespace,
            }
            styleArr.push(...styles)
        })
    })
    latestComlibs.forEach(latestLib => {
        const shouldUpdateLib = window[ComLib_Edit].find(lib => lib.namespace===latestLib.namespace && compareVersions(latestLib.version, lib.version)>0);
        if(shouldUpdateLib){
            shouldUpdateLib.latestComlib = latestLib;
        }
    })
    const comlibIndex = window[ComLib_Edit].findIndex((comlib) => comlib.id !== '_myself_');
    if (comlibIndex !== -1) {
        window[ComLib_Edit][comlibIndex]._styleAry = styleArr;
    }
    return window[ComLib_Edit];
}