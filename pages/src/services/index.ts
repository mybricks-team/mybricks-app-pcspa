import { fAxios } from "./http";
import { getRtComlibsFromEdit, isCloundModuleComboUrl } from "./../utils/comlib";
import axios from "axios";

export const ComlibService = {
  getRtSourceCode: async (editComlibs) => {
    if (!Array.isArray(editComlibs)) {
      return "";
    }
    const rtLibs = getRtComlibsFromEdit(editComlibs);

    rtLibs.sort((a, b) => {
      return isCloundModuleComboUrl(a) ? 1 : -1;
    });
    let scriptHtml = ``;
    for (let index = 0; index < rtLibs.length; index++) {
      const lib = rtLibs[index];
      if (isCloundModuleComboUrl(lib)) {
        const str = await fAxios.get(lib);
        scriptHtml = `
        ${scriptHtml}

        <script type="text/javascript">
        ${str}
        </script>
        `;
      } else {
        scriptHtml = `
        ${scriptHtml}

        <script src="${lib}"></script>
        `;
      }
    }
    return scriptHtml;
  },
};

export const MaterialService = {
  getMateralMaterialInfo: async ({ namespace }) => {
    const { data: comoponent, code } = await fAxios.get(`/api/material/namespace/content?namespace=${namespace}`);
    if (code === 1 && comoponent) {
      return comoponent;
    }
    throw new Error("invalid materialInfo");
  },
};

export const FileService = {
  getFiles: async ({ extName }) => {
    const { data: files, code } = await fAxios.get(`/api/file/get?extName=${extName}`);
    if (code === 1 && files) {
      return files;
    }
    throw new Error("invalid files");
  },
  getSysTemFiles: async ({ extName }) => {
    const { data: files, code } = await fAxios.get(`/api/file/getSysTemFiles?extName=${extName}`);
    if (code === 1 && files) {
      return files;
    }
    throw new Error("invalid files");
  },
};

export const VersionService = {
  getPublishVersions: async ({ fileId, pageSize = 10, pageIndex = 1 }) => {
    const { data: versions, code } = await fAxios.get(
      `/api/workspace/publish/versions?fileId=${fileId}&pageSize=${pageSize}&pageIndex=${pageIndex}`
    );
    if (code === 1 && versions) {
      return versions;
    }
    throw new Error("invalid versions");
  },
};

export const getMaterialMiddleOfficeMaterialSchema = async (materialVersionId: string) => {
  const response = await fAxios.get(`https://components-staging.staging.kuaishou.com/api/website/material/detail`, {
    params: {
      id: materialVersionId,
    },
  });
  if (response.data) {
    const scriptList = await fAxios.get(`https://components-staging.staging.kuaishou.com/api/manage/script/list`);
    const scriptLink = scriptList.data.dataSource.find((item) => item.business === "fangzhou").script;
    const scriptString = await (await fetch(scriptLink)).text();
    const func = eval(scriptString);
    try {
      return await func(
        {
          ...response.data,
          schema: JSON.parse(response.data.schema),
        },
        {
          business: "fangzhou",
          businessTitle: "方舟",
          creatorId: "creatorId",
          creatorName: "creatorName",
          axios: {
            get: async (url: string) => {
              const response = await fetch(url);
              const data = await response.text();
              return { data };
            },
          },
        }
      );
    } catch (error) {
      console.log(error);
    }
  }
  return null;
};
