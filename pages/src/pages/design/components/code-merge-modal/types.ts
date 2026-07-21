export interface FileVersion {
  fileName: string
  source: string
  branch: string
  timestamp?: number
}

export interface MergeConflict {
  startLine: number
  endLine: number
  baseContent: string
  currentContent: string
  incomingContent: string
}

export interface FileMergeState {
  fileName: string
  hasConflict: boolean
  mergedSource: string
  conflicts: MergeConflict[]
}
