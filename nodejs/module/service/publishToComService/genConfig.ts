import * as fs from "fs";
import * as path from "path";

interface IProps {
  sourceLink: any;
  toJSON: any;
  envType: any;
  envList: any;
  i18nLangContent: any;
  extractFns: string;
  staticResources: {
    url: string;
    filename: string;
    cdnUrl: string;
  }[] | {
    url: string;
    filename: string;
    content: string;
  }[];
  importStr: string;
  exportStr: string;
  styleStr: string;
}

function genImage(staticResources: IProps['staticResources']) {
  let imageImportStr = "";
  let imageUrlMap = "";

  staticResources.forEach((item, index) => {
    const { filename } = item;
    // 有 cdnUrl 字段，说明资源已经上传到 CDN 上了，无需本地化
    if ('cdnUrl' in item) {
      imageUrlMap += `"${filename}": "${item.cdnUrl}",`;
    } else {
      imageImportStr += `import image${index} from './assets/${filename}';`
      imageUrlMap += `"${filename}": image${index},`;
    }
  })

  return { imageImportStr, imageUrlMap: `{${imageUrlMap}}` };
}

function genConfig({ sourceLink, toJSON, envList, envType, i18nLangContent, extractFns, staticResources, importStr, exportStr, styleStr }: IProps) {
  const tplFilePath = path.resolve(__dirname, "./templates/config-tpl.txt");
  const tplFileExtendsPath = path.resolve(__dirname, "./templates/config-extends-image-tpl.txt");
  let template = fs.readFileSync(tplFilePath, "utf8");
  const templateExtends = fs.readFileSync(tplFileExtendsPath, "utf8");
  const toJSONPretreatment = `replaceDynamicImportImg(toJSON)`;
  const { imageImportStr, imageUrlMap } = genImage(staticResources);

  const haveImage = staticResources.length > 0;

  template = template.replace(`--import--`, importStr || '')
    .replace(`--tplExtends--`, haveImage ? templateExtends : '')
    .replace(`--toJSONPretreatment--`, haveImage ? toJSONPretreatment : '')
    .replace(`--url--`, JSON.stringify(sourceLink))
    .replace(`--imageImportStr--`, imageImportStr)
    .replace(`--imageUrlMap--`, imageUrlMap)
    .replace(`--extractFns--`, extractFns)
    .replace(`--json--`, JSON.stringify(toJSON))
    .replace(`'--executeEnv--'`, JSON.stringify(envType))
    .replace(`'--envList--'`, JSON.stringify(envList))
    .replace(`'--i18nLangContent--'`, JSON.stringify(i18nLangContent))
    .replace(`--style--`, styleStr || '')
    .replace(`--export--`, exportStr || '')

  return template
}

export { genConfig }