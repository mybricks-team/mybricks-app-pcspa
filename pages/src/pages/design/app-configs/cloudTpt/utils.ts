import API from "@mybricks/sdk-for-app/api";

const getMaterialContent = async (params) => {
  try {
    return await API.Material.getMaterialContent(params)
  } catch (error) {
    console.error("[getMaterialContent - error]", error)
    return null
  }
}

const getPublishContent = async (params) => {
  try {
    return await API.File.getPublishContent(params)
  } catch (error) {
    console.error("[getPublishContent - error]", error)
    return null
  }
}

export const getPcPageTemplateList = async (params) => {
  try {
    const response = await API.Material.getMaterialList(params)
    return response.list.map(({ title, preview_img, namespace, version }) => {
      return {
        title,
        previewImg: preview_img,
        async load() {
          const materialContent = await getMaterialContent({ namespace, version })
          if (!materialContent) {
            return null
          }

          const publishContent = await getPublishContent({ pubId: materialContent.publishId })
          if (!publishContent) {
            return null
          }

          return JSON.stringify(publishContent.content)
        },
      }
    })
  } catch (error) {
    console.error("[getPcPageTemplateList - error]", error)
    return []
  }
}