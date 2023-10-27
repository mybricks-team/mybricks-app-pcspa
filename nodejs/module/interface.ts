/** 本地化信息 */
export interface ILocalizationInfo {
  path: string;
  name: string;
  content: string;
  from: {
    type: "byLocal" | "byNetwork";
    url: string;
  };
}
