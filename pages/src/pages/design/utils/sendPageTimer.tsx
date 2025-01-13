// 海牛侧-上报用户的页面开发时间
import get from "lodash/get";
import axios from "axios";

function sendPageTimer(appData: any, currentRef: any) {
  const makeSendParam = (target) => {
    const projectId = get(target, ["sdk", "projectId"]);
    const pageId = get(target, ["fileId"]);
    const mybricksUserId = get(target, ["user", "id"]);
    return { projectId, pageId, mybricksUserId };
  };

  const request = async (data: any) => {
    try {
      await axios({
        method: "POST",
        url: "/biz/modularity/project0/saveMybricksPageDevTime",
        withCredentials: false,
        data,
        headers: {
          "Content-Type": "application/json",
        },
      });
      return true;
    } catch (e) {
      console.log(e?.data?.msg);
      return false;
    }
  };

  const sendRequest = () => {
    const pageRepoterConfig = get(appData, ["appConfig", "pageRepoterConfig"]);
    if (!pageRepoterConfig?.reporterStatus) return false;
    const baseData = makeSendParam(appData);
    const { costTimestamp: devTotalTime, level: pageLevel } =
      currentRef.current?.getSummary() || {};
    // 接口上报时间
    try {
      request({
        ...baseData,
        devTotalTime,
        pageLevel,
      });
    } catch {
      console.log("页面数据上报失败");
    }
  };
  return sendRequest();
}

export default sendPageTimer;
