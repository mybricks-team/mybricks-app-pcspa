import axios from "axios"
import { useState } from "react"
import { DumpJSONInfo } from "../components/branch-merge-modal/parser"

export interface BranchInfo {
  id: number
  main_file_id: number
  branch_file_id: number
  branch_name: string
  description: string
  content: string
  creator_id: number
  creator_name: string
  create_time: number
  update_time: number
  status: number
}

export const useBranch = () => {
  const [branchInfo, setBranchInfo] = useState<BranchInfo[]>()
  const [fileContent, setFileContent] = useState<DumpJSONInfo>()
  const [loadingBranchInfo, setLoadingBranchInfo] = useState(false)
  const [loadingFileContent, setLoadingFileContent] = useState(false)

  const getBranchInfoByMainFileId = async (mainFileId: string | number) => {
    setLoadingBranchInfo(true)
    try {
      const res = await axios.get('/paas/api/file/getBranchInfo?id=' + mainFileId)
      console.log('getBranchInfoByMainFileId', res)
      setBranchInfo(res.data?.data)
      return res.data?.data
    }catch(e) {
      console.error('getBranchInfoByMainFileId Error', e)
    }

    setLoadingBranchInfo(false)
  }

  const getFileContent = async (fileId: number) => {
    setLoadingFileContent(true)
    try {
      const res = await axios.get('/paas/api/workspace/getFullFile?fileId=' + fileId)
      setFileContent(JSON.parse(res.data?.data?.content || '{}'))
    }catch(e) {
      console.error('getBranchInfoByMainFileId Error', e)
    }

    setLoadingFileContent(false)
  }

  return {
    branchInfo,
    loadingBranchInfo,
    loadingFileContent,
    fileContent,

    getBranchInfoByMainFileId,
    getFileContent,
  }
}