import { message } from "antd";
import { openSetting, closeSetting } from "@mybricks/plugin-ai"
import { getAISetting, setAISetting } from "./storage";
import pkg from "../../../../../../package.json";

export default function useAISetting() {
  const handleOpenSetting = () => {
    // 从 localStorage 加载已保存的配置作为初始值
    const savedSettings = getAISetting();
    console.log("[SettingBtn] 读取配置", savedSettings);
    // 默认渠道为 infra
    if (!savedSettings.channel) {
      savedSettings.channel = "infra";
    }
    const { mybricks: { title }, version } = pkg.appConfig.react

    // “关于”页展示的依赖库信息
    // const { designer, aiComLib, pluginAI } = dependenceVersion;
    // const aboutItems = [
    //   { label: "版本", value: `v${version}`, type: "text" },
    //   { label: "设计器", value: designer ? `v${designer}` : "—", type: "text" },
    //   { label: "组件库", value: aiComLib ? `v${aiComLib}` : "—", type: "text" },
    //   { label: "AI 插件", value: pluginAI ? `v${pluginAI}` : "—", type: "text" },
    // ];

    openSetting({
      name: title,
      version,
      channels: ["infra", "custom"],
      // aboutItems,
      value: savedSettings,
      onSave: (value) => {
        try {
          // 持久化到 localStorage
          setAISetting(value);

          message.success("配置已保存，即将刷新页面以应用新配置");

          //点击保存 关闭弹窗
          closeSetting();

          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (err) {
          message.error("保存失败，请重试");
          console.error("[SettingBtn] 保存配置失败", err);
        }
      },
    });
  };

  return {
    openSetting: handleOpenSetting,
    closeSetting,
  };
}
