import axios from "axios"
import { useRef, useState } from "react"

export interface BranchInfo {
  id: number
  mainFileId: number
  branchFileId: number
  branchName: string
  description: string
  content?: string
  creatorId: number
  creatorName: string
  createTime: number
  updateTime: number
  status: number
}

export const useBranch = () => {
  const [branchInfo, setBranchInfo] = useState<BranchInfo[]>()
  const [fileContent, setFileContent] = useState<any>()
  const [mainFileId, setMainFileId] = useState<number>()
  const [branchName, setBranchName] = useState('')
  const [loadingBranchInfo, setLoadingBranchInfo] = useState(false)
  const [loadingFileContent, setLoadingFileContent] = useState(false)
  const originalFileContent = useRef('')

  const getBranchInfoByMainFileId = async (mainFileId: string | number) => {
    setLoadingBranchInfo(true)
    try {
      const res = await axios.get('/paas/api/file/getBranchInfo?id=' + mainFileId)
      console.log('getBranchInfoByMainFileId', res)
      setBranchInfo(res.data?.data)
    }catch(e) {
      console.error('getBranchInfoByMainFileId Error', e)
    }

    setLoadingBranchInfo(false)
  }

  const getFileContent = async (fileId: number) => {
    setLoadingFileContent(true)
    try {
      const res = await axios.get('/paas/api/workspace/getFullFile?fileId=' + fileId)
      originalFileContent.current = res.data?.data?.content
      setFileContent(JSON.parse(res.data?.data?.content || '{}'))
    }catch(e) {
      console.error('getBranchInfoByMainFileId Error', e)
    }

    setLoadingFileContent(false)
  }

  const getMainFileId = async (fileId: number) => {
    try {
      const res = await axios.get('/paas/api/file/getMainFileId?id=' + fileId)
      setMainFileId(res.data?.data?.id)
      setBranchName(res.data?.data?.branchName)
      return res.data?.data
    }catch(e) {
      console.error('getMainFileId Error', e)
    }
  }

  return {
    branchInfo,
    loadingBranchInfo,
    loadingFileContent,
    fileContent,
    branchName,
    mainFileId,
    originalFileContent,

    getBranchInfoByMainFileId,
    getFileContent,
    getMainFileId,
  }
}