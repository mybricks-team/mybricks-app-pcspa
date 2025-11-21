import React, { useEffect, useState } from "react";
import get from "lodash/get";
import axios from "axios";

function parseTokenOrSession(data: string | null) {
  if (!data) return "";

  try {
    return atob(atob(data));
  } catch {
    return "";
  }
}

const getAuth = () => {
  const token = parseTokenOrSession(localStorage.getItem("token"));
  const session = parseTokenOrSession(localStorage.getItem("session"));
  return [token, session];
};
const request = async (url: string, data: any) => {
  const [token, session] = getAuth();
  try {
    await axios({
      method: "POST",
      url: url,
      withCredentials: true,
      data,
      headers: {
        "Content-Type": "application/json",
        token,
        session,
      },
    });
    return true;
  } catch (e) {
    console.log(e?.data?.msg);
    return false;
  }
};


function sendPageDeps(appData: any, content: string) {
  const config = get(appData, ["appConfig", "pageDepsApiConfig"]);
  if (!config?.pageDepsAPI) return false;
  try {
    const pageJSON = JSON.parse(content)
    const comlibs = pageJSON.comlibs
    const deps = []
    comlibs.forEach(item => {
      if (item.id === '_myself_') {
        deps.push(...item.comAray.map((item: any) => ({
          sourceId: item.materialId,
          sourceType: 2,
          namespace: item.namespace,
          sourceVersion: item.version
        })))
      } else {
        deps.push({
          sourceId: item.id,
          sourceType: 1,
          namespace: item.namespace,
          sourceVersion: item.version
        })
      }
    })
    request(config.pageDepsAPI, {
      targetId: appData.fileId,
      sourceList: deps,
      targetType: 3  // 1-物料，2-云组件，3-页面
    });
  } catch {
    console.log("页面依赖上报失败");
  }
}
export {
  sendPageDeps
};
