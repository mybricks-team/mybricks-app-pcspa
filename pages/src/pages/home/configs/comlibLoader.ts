import { isNumber, isObject, cloneDeep } from 'lodash'
import { Modal, message } from 'antd'
import { MaterialService } from './../../../services'
import { MaterialComlib } from './../../../types'
import { ComboComlibURL, getMySelfLibComsFromUrl, getComlibsByNamespaceAndVersion } from './../../../utils/comlib'

const init = () => {
  if (!window['__comlibs_edit_']) {
    window['__comlibs_edit_'] = []
  }

  if (!window['__comlibs_rt_']) {
    window['__comlibs_rt_'] = window['__comlibs_edit_']
  }

  if (!window['CloudComponentDependentComponents']) {
    window['CloudComponentDependentComponents'] = {}
  }
}

const MySelfId = '_myself_';


export default (ctx) => (libDesc) => {
  init();

  const mySelfLib = ctx?.comlibs.find(t => t?.id === MySelfId)

  const addSelfLibComponents = (components => {
    components.forEach(component => {
      const mySelfLib = ctx?.comlibs.find(t => t?.id === MySelfId)
      const index = mySelfLib.comAray.findIndex((item) => item.namespace === component.namespace);

      /** 当前组件已经存在 */
      if (index !== -1) {
        mySelfLib.comAray[index] = {
          materialId: component.materialId,
          namespace: component.namespace,
          version: component.version,
        };
      } else {
        mySelfLib.comAray.push({
          materialId: component.materialId,
          namespace: component.namespace,
          version: component.version,
        });
      }
    })

    return mySelfLib.comAray
  })

  const removeSelfLibComponents = (comNamespaces) => {
    const mySelfLib = ctx?.comlibs.find(t => t?.id === MySelfId)
    comNamespaces.forEach(comNamespace => {
      const removeIdx = mySelfLib?.comAray?.findIndex?.((item) => {
        return item.namespace === comNamespace;
      });
      mySelfLib.comAray.splice(removeIdx, 1);
    })
  }

  const updateSelfLibComponent = (component) => {
    const mySelfLib = ctx?.comlibs.find(t => t?.id === MySelfId)
    if (!component?.namespace || !component?.version) {
      return mySelfLib.comAray
    }

    mySelfLib.comAray.forEach(com => {
      if (com.namespace === component?.namespace) {
        com.version = component.version
      }
    })

    return mySelfLib.comAray
  }

  const getSelfComponents = () => {
    return mySelfLib?.comAray.filter(com => isObject(com))
  }
  
  // const LATEST_COMLIBS = cloneDeep(ctx.latestComlibs || []);

  return new Promise((resolve, reject) => {
    ;(async () => {
      /** 带加载命令，如：新增组件、更新组件、更新组件库 */
      if (libDesc?.cmd) {
        const { cmd, libId, comNamespace } = libDesc
        const comlib = window['__comlibs_edit_'].find((lib) => lib.id === libId)

        let index = -1
        let com
        switch (cmd) {
          case 'upgradeCom':
            index = comlib.comAray.findIndex((com) => com.namespace === comNamespace);

            if (index !== -1) {
              com = comlib.comAray[index];

              const component = await MaterialService.getMateralMaterialInfo({ namespace: comNamespace })
              if (component.version === com.version) {
                message.warn('当前组件已经是最新版本了～')
                return
              }

              // message.info('更新功能正在内测，马上就来')
              // return

              Modal.confirm({
                className: 'fangzhou-theme',
                okText: '确定',
                cancelText: '取消',
                centered: true,
                title: `请确认是否升级组件“${com.title}”到最新版本`,
                getContainer: () => document.body,
                onOk() {
                  const newComponents = updateSelfLibComponent(component)
                  getComlibsByNamespaceAndVersion(newComponents).then((newComlib) => {
                    resolve({
                      id: '_myself_',
                      title: '我的组件',
                      defined: true,
                      comAray: newComlib?.comAray || []
                    })
                  })
                  // resolve(ctx?.comlibs.find(t => t?.id === MySelfId));
                },
              });
            }
            // resolve([])
            break;
          case 'deleteCom': /** 需要resolve一个comlib对象 */
            index = comlib.comAray.findIndex((com) => com.namespace === comNamespace);

            if (index !== -1) {
              com = comlib.comAray[index];
              Modal.confirm({
                className: 'fangzhou-theme',
                okText: '确定',
                cancelText: '取消',
                centered: true,
                title: `请确认是否删除组件“${com.title}”，当前操作不可逆！`,
                getContainer: () => document.body,
                onOk() {
                  removeSelfLibComponents([comNamespace])
                  resolve(ctx?.comlibs.find(t => t?.id === MySelfId));
                },
              });
            }
            break;
          case 'addCom':
            ctx.sdk.openUrl({
	            url: 'MYBRICKS://mybricks-material/materialSelectorPage',
	            params: {
		            defaultSelected: getSelfComponents(),
		            userId: ctx.user?.email,
		            combo: true
	            },
	            onSuccess: ({ materials, updatedMaterials }) => {
                const newComponents = addSelfLibComponents(materials)
                getComlibsByNamespaceAndVersion(newComponents).then((newComlib) => {
                  resolve({
                    id: '_myself_',
                    title: '我的组件',
                    defined: true,
                    comAray: newComlib?.comAray || []
                  })
                })
	            }
            })            
            
            break
          case 'deleteComLib':
            const libs = ctx.comlibs
            index = libs.findIndex((lib) => lib?.id ? Number(lib.id) === Number(libId) : lib.indexOf(`/${libId}_`) !== -1);
            if (index !== -1) {
              libs.splice(index, 1)
              ctx.comlibs = libs
            }
            resolve(true);
            break
          default:
            break
        }
        return
      }

      /** 不带命令，且描述为空，即页面初始化，加载组件及组件库 */
      if (!libDesc) {

        /** 没有物料中心的情况 */
        if (!ctx?.hasMaterialApp) {
          resolve(ctx.comlibs.filter(lib => lib?.id !== MySelfId).map(t => t?.editJs ? t.editJs : t))
          return
        }

        /** 没有comlibs的情况，理论上没有这种情况 */
        if (!ctx?.comlibs) {
          resolve([])
          return
        }

        /** 没有我的组件 */
        if (!mySelfLib && Array.isArray(ctx.comlibs)) {
          const selfLib = {
            comAray: [],
            id: '_myself_',
            title: '我的组件',
            defined: true,
          };
          ctx.comlibs.unshift(selfLib);
          resolve(JSON.parse(JSON.stringify(ctx.comlibs.map(t => t?.editJs ? t.editJs : t))))
          return
        }

        const newMySelfLib = ctx?.comlibs.find(t => t?.id === MySelfId)

        getComlibsByNamespaceAndVersion(newMySelfLib?.comAray).then((newComlib) => {
          resolve([{
            id: '_myself_',
            title: '我的组件',
            defined: true,
            comAray: newComlib?.comAray || []
          }, ...ctx.comlibs.filter(lib => lib?.id !== MySelfId).map(t => t?.editJs ? t.editJs : t)])
        })
        return
      }

      /** 不带命令，增加、更新组件库，新增时comLibAdder resolve的组件库会带到libDesc来 */
      if (libDesc?.editJs) {
        const curLib: MaterialComlib = libDesc
        let libs = ctx.comlibs
        const targetIndex = libs.findIndex((lib) => Number(lib?.id) === Number(curLib.id));
        if (targetIndex === -1) {
          /** 新增组件库 */
          libs.push(curLib)
          ctx.comlibs = libs
          resolve(curLib.editJs)
          return
        } else {
          /** 更新组件库 */
          libs[targetIndex] = curLib
          ctx.comlibs = libs
          resolve(curLib.editJs)
          return
        }
      }

    })().catch(() => {})
  })
}
