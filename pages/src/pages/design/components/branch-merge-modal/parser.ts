import { parsePage } from '@mybricks/file-parser'

export interface ModuleInfo {
  id: string
  title: string
}

export interface ConnectorInfo {
  id: string
  title: string
  type: string
  connectorName: string
}

export interface Scene {
  id: string
  title: string
  originalId?: string
  ignore?: boolean
  sceneId: string
  sceneTitle: string
  type?: 'scope' | 'module' | 'popup'
  comDef?: {
    namespace: string
    version: string
  }
  data?: Record<string, any>
  children?: Scene[]
}

export interface DumpJSONInfo {
  scenes: Scene[]
  connectors: ConnectorInfo[]
  // 模块
  modules: ModuleInfo[]
  coms: Scene[]
}

// 递归获得组件树
function treverse(list: any[], level: number = 1, scene?: { id: string, title: string }, coms?: Scene[]) {
  if (!list || !list.length) return []
  const res: Scene[] = []
  list.forEach((item) => {
    const id = item.id || item.runtime?.id
    const title = item.title || item.runtime?.title
    const type = item.type || item.showType
    const comDef = item.runtime?.def
    // const comData = item.runtime?.model?.data
    if (level === 1) {
      scene = { id, title }
    }
    const comInfo: Scene = { id, title, type, comDef, sceneId: scene!.id, sceneTitle: scene!.title }
    if (level === 1) {
      comInfo.ignore = true
    }
    if (!type && !item.runtime && level > 1) {
      comInfo.type = 'scope'
    }
    if (comInfo.type === 'scope') {
      comInfo.ignore = true
    }
    coms?.push({
      ...comInfo,
      data: item.runtime?.model?.data || {},
    })
    if (item.comAry && item.comAry.length) {
      comInfo.children = treverse(item.comAry, level + 1, scene, coms)
    } else if (item.slots && item.slots.length) {
      comInfo.children = treverse(item.slots, level + 1, scene, coms)
    }
    res.push(comInfo)
  })
  return res
}

export function parseDumpJSON(json: Record<string, any>) {
  const res: DumpJSONInfo = {
    scenes: [],
    connectors: [],
    modules: [],
    coms: [],
  }

  if (!json?.content?.['xg.desn.stageview']) return res

  const resultContent = parsePage(json.content['xg.desn.stageview'])

  const { modules, mainModule, connectors = [] } = resultContent
  const coms: Scene[] = []

  res.connectors = [...connectors]
  res.coms = coms

  if (modules) {
    for (const key in modules) {
      if (Object.prototype.hasOwnProperty.call(modules, key)) {
        const module = modules[key]
        res.modules.push({
          id: module.id,
          title: module.title,
        })
      }
    }
  }

  const scenes = mainModule?.slot?.slots || []

  res.scenes = treverse(scenes, 1, undefined, coms)
  res.coms = coms
  return res
}
