import { ConnectorInfo, DumpJSONInfo, Scene, ModuleInfo } from "./parser";

export interface DiffItem<T> {
  id: string;
  type: 'added' | 'removed' | 'modified';
  data: T; // 变更后的数据（如果是删除，则是原数据）
  diffDetails?: { key: string; oldValue: any; newValue: any }[]; // 可选：记录具体改了哪些字段
}

// 最终返回的 Diff 报告结构
export interface DiffResult {
  scenes: DiffItem<Scene>[];
  connectors: DiffItem<ConnectorInfo>[];
  modules: DiffItem<ModuleInfo>[];
  coms: DiffItem<Scene>[];
  hasChanges: boolean;
}

/**
 * 简易深度比较 (如果没有 lodash 可以使用这个)
 * 针对 data 字段这种 Record<string, any>
 */
function isDeepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key) || !isDeepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  return true;
}

/**
 * 将树形结构扁平化为 Map，方便通过 ID 查找
 */
function flattenScenesToMap(scenes: Scene[]): Map<string, Scene> {
  const map = new Map<string, Scene>();
  
  const traverse = (nodes: Scene[]) => {
    if (!nodes || nodes.length === 0) return
    nodes.forEach(node => {
      // 浅拷贝对象，移除 children 以避免比对时递归死循环或误判
      // 我们只关心当前节点自身的属性变化，子节点的变化由子节点自己的 ID 判定
      const { children, ...nodeData } = node; 
      map.set(node.id, nodeData as Scene);
      
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  };

  traverse(scenes);
  return map;
}

/**
 * 将普通数组转为 Map
 */
function arrayToMap<T extends { id: string }>(list: T[]): Map<string, T> {
  return new Map(list?.map(item => [item.id, item]));
}

// --- 3. 核心 Diff 逻辑 ---

/**
 * 通用数组/Map Diff 函数
 * @param sourceMap 旧数据 Map
 * @param targetMap 新数据 Map
 * @param compareFields 除了 id 之外需要比对的字段。如果为空，则比对所有字段。
 */
function calculateDiff<T extends { id: string; data?: any }>(
  sourceMap: Map<string, T>,
  targetMap: Map<string, T>,
  checkDataDeeply: boolean = false
): DiffItem<T>[] {
  const diffs: DiffItem<T>[] = [];

  // 1. 检查 新增 (Added) 和 修改 (Modified)
  targetMap?.forEach((targetItem, id) => {
    const sourceItem = sourceMap.get(id);

    if (!sourceItem) {
      // Source 中没有，说明是新增
      diffs.push({ id, type: 'added', data: targetItem });
    } else {
      // 两边都有，检查是否修改
      let isModified = false;

      if (checkDataDeeply) {
        // 针对 Scene/Coms，重点比对 data 字段
        // 注意：这里我们已经剔除了 children，所以可以直接比对剩余属性
        // 如果你需要非常精确地只比对 data，可以修改这里的逻辑
        
        // 1. 比对 data (深度)
        const dataChanged = !isDeepEqual(sourceItem.data, targetItem.data);
        
        // 2. 比对其他基础属性 (如 title, ignore 等)
        // 简单起见，这里假设只要除 children 外的属性变了都算 modified
        // 如果只关心 data，可以用: if (dataChanged)
        
        // 我们可以先比对 data，如果 data 没变，再看其他浅层属性
        if (dataChanged) {
          isModified = true;
        } else {
            // data 一样，检查其他非对象属性 (title, type 等)
            // 这里做一个简单的浅层比较排除 data
            const keys = Array.from(new Set([...Object.keys(sourceItem), ...Object.keys(targetItem)]));
            for (const key of keys) {
                if (key === 'data') continue;
                if (!isDeepEqual(sourceItem[key as keyof T], targetItem[key as keyof T])) {
                    isModified = true;
                    break;
                }
            }
        }
      } else {
        // 针对 Modules/Connectors，做简单的浅层比对或全量深度比对
        if (!isDeepEqual(sourceItem, targetItem)) {
          isModified = true;
        }
      }

      if (isModified) {
        diffs.push({ id, type: 'modified', data: targetItem });
      }
    }
  });

  // 2. 检查 删除 (Removed)
  sourceMap?.forEach((sourceItem, id) => {
    if (!targetMap.has(id)) {
      diffs.push({ id, type: 'removed', data: sourceItem });
    }
  });

  return diffs;
}

// --- 4. 主入口函数 ---

export const diff = (source: DumpJSONInfo, target: DumpJSONInfo): DiffResult => {
  // 1. 准备数据：将数组/树转为 Map
  const sourceScenes = flattenScenesToMap(source.scenes);
  const targetScenes = flattenScenesToMap(target.scenes);

  const sourceComs = flattenScenesToMap(source.coms);
  const targetComs = flattenScenesToMap(target.coms);

  const sourceModules = arrayToMap(source.modules);
  const targetModules = arrayToMap(target.modules);

  const sourceConnectors = arrayToMap(source.connectors);
  const targetConnectors = arrayToMap(target.connectors);

  // 2. 计算差异
  const sceneDiffs = calculateDiff(sourceScenes, targetScenes, true); // True: 重点比对 data
  const comDiffs = calculateDiff(sourceComs, targetComs, true);
  const moduleDiffs = calculateDiff(sourceModules, targetModules, false);
  const connectorDiffs = calculateDiff(sourceConnectors, targetConnectors, false);

  const hasChanges =
    sceneDiffs.length > 0 ||
    comDiffs.length > 0 ||
    moduleDiffs.length > 0 ||
    connectorDiffs.length > 0;

  return {
    scenes: sceneDiffs,
    coms: comDiffs,
    modules: moduleDiffs,
    connectors: connectorDiffs,
    hasChanges,
  };
};