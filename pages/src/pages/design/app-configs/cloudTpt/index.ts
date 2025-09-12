import { getPcPageTemplateList } from "./utils"

export default function (params) {
  const { ctx } = params;

  return {
    type: 'cloudTpt',
    title: '更多模版...',
    async load() {
      const materialIds = ctx.appConfig.publishLocalizeConfig?.pcPageTemplateList?.join() || "";

      if (!materialIds) {
        return []
      }

      return await getPcPageTemplateList({ materialIds });
    }
  }
}
