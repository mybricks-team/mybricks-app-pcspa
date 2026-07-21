import * as Diff from 'diff'
import { MergeConflict } from './types'

/**
 * 三方合并算法
 * @param base 基准版本
 * @param current 当前版本 (本地)
 * @param incoming 传入版本 (远程/分支)
 * @returns 合并后的代码和冲突信息
 *
 * 思路：用 diffArrays 以「行」为单位分别计算 base->current、base->incoming 的改动，
 * 得到一组 hunk（每个 hunk 表示 base 的 [baseStart, baseEnd) 行被替换为 replacement）。
 * 再以 base 行号为基准顺序遍历，逐段决定输出：
 *   - 双方都未改：输出 base 原文
 *   - 只有一方改：输出该方的 replacement
 *   - 双方都改了同一区域：内容相同则自动合并，不同则标记冲突
 */
export function threeWayMerge(
  base: string,
  current: string,
  incoming: string
): {
  merged: string
  conflicts: MergeConflict[]
  hasConflict: boolean
} {
  // 完全相同直接返回
  if (current === incoming) {
    return { merged: current, conflicts: [], hasConflict: false }
  }

  const baseLines = base.split('\n')
  const currentHunks = getHunks(baseLines, current.split('\n'))
  const incomingHunks = getHunks(baseLines, incoming.split('\n'))

  const merged: string[] = []
  const conflicts: MergeConflict[] = []
  let baseLine = 0
  let ci = 0
  let ii = 0

  const copyBaseUntil = (target: number) => {
    while (baseLine < target) {
      merged.push(baseLines[baseLine])
      baseLine++
    }
  }

  while (ci < currentHunks.length || ii < incomingHunks.length) {
    const cHunk = currentHunks[ci]
    const iHunk = incomingHunks[ii]

    const cAt = cHunk ? cHunk.baseStart : Infinity
    const iAt = iHunk ? iHunk.baseStart : Infinity
    const nextStart = Math.min(cAt, iAt)

    // 先把到达下一个改动之前的 base 原文拷贝过去
    copyBaseUntil(nextStart)

    // 收集所有与「当前区域」重叠的 hunk，合并为一个区域
    const regionStart = nextStart
    let regionEnd = 0
    let curRepl: string[] = []
    let incRepl: string[] = []
    let hasCur = false
    let hasInc = false

    if (cAt === nextStart && cHunk) {
      curRepl.push(...cHunk.replacement)
      regionEnd = Math.max(regionEnd, cHunk.baseEnd)
      hasCur = true
      ci++
    }
    if (iAt === nextStart && iHunk) {
      incRepl.push(...iHunk.replacement)
      regionEnd = Math.max(regionEnd, iHunk.baseEnd)
      hasInc = true
      ii++
    }

    // 把后续仍落在该区域内的 hunk 继续折叠进来（处理双方改动相互交叠的情况）
    let extended = true
    while (extended) {
      extended = false
      if (currentHunks[ci] && currentHunks[ci].baseStart < regionEnd) {
        curRepl.push(...currentHunks[ci].replacement)
        regionEnd = Math.max(regionEnd, currentHunks[ci].baseEnd)
        hasCur = true
        ci++
        extended = true
      }
      if (incomingHunks[ii] && incomingHunks[ii].baseStart < regionEnd) {
        incRepl.push(...incomingHunks[ii].replacement)
        regionEnd = Math.max(regionEnd, incomingHunks[ii].baseEnd)
        hasInc = true
        ii++
        extended = true
      }
    }

    const startLine = merged.length
    if (hasCur && hasInc) {
      // 双方都改动了该区域
      if (arraysEqual(curRepl, incRepl)) {
        // 改动一致，自动合并
        merged.push(...curRepl)
      } else {
        // 改动不一致，标记冲突
        conflicts.push({
          startLine,
          endLine: startLine + curRepl.length + incRepl.length + 2,
          baseContent: baseLines.slice(regionStart, regionEnd).join('\n'),
          currentContent: curRepl.join('\n'),
          incomingContent: incRepl.join('\n')
        })
        merged.push('<<<<<<< 当前分支 (Current)')
        merged.push(...curRepl)
        merged.push('=======')
        merged.push(...incRepl)
        merged.push('>>>>>>> 传入分支 (Incoming)')
      }
    } else if (hasCur) {
      merged.push(...curRepl)
    } else if (hasInc) {
      merged.push(...incRepl)
    }

    baseLine = Math.max(baseLine, regionEnd)
  }

  // 拷贝末尾剩余的 base 原文
  copyBaseUntil(baseLines.length)

  return {
    merged: merged.join('\n'),
    conflicts,
    hasConflict: conflicts.length > 0
  }
}

interface Hunk {
  baseStart: number
  baseEnd: number
  replacement: string[]
}

/**
 * 计算 base -> other 的改动，返回一组 hunk。
 * 每个 hunk 表示 base 的 [baseStart, baseEnd) 行被替换为 replacement（other 中的行）。
 */
function getHunks(baseLines: string[], otherLines: string[]): Hunk[] {
  const diff = Diff.diffArrays(baseLines, otherLines)
  const hunks: Hunk[] = []
  let baseLine = 0
  let i = 0
  while (i < diff.length) {
    const part = diff[i]
    if (part.added || part.removed) {
      // 一个「修改」通常由连续的 removed / added 部分组成，合并为一个 hunk
      const baseStart = baseLine
      let baseEnd = baseLine
      const replacement: string[] = []
      while (i < diff.length && (diff[i].added || diff[i].removed)) {
        const p = diff[i]
        if (p.removed) baseEnd += p.value.length
        if (p.added) replacement.push(...p.value)
        i++
      }
      hunks.push({ baseStart, baseEnd, replacement })
      baseLine = baseEnd
    } else {
      baseLine += part.value.length
      i++
    }
  }
  return hunks
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}
