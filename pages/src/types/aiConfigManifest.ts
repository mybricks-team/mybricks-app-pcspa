export interface AIConfigManifest {
  schemaVersion: string;
  meta: AIConfigManifestMeta;
  dependencies?: AIConfigManifestDependency[];
  rules?: AIConfigManifestRules;
  skills?: AIConfigManifestSkill[];
}

export interface AIConfigManifestMeta {
  title: string;
  description?: string;
  version: string;
  author?: string;
}

export interface AIConfigManifestDependency {
  // 依赖库名称
  name: string;
  version: string;
  // umd 挂载window 上的变量名
  libraryName: string;
  umd: string[];
  css?: string[];
  readme?: string;
  // 依赖库模块
  modules?: AIConfigManifestModule[];
}

export interface AIConfigManifestModule {
  // 依赖库模块路径
  modulePath: string;
  // 依赖库模块 umd 挂载window 上的变量名
  umdPath: string;
  readme?: string;
}

export interface AIConfigManifestRules {
  codeRules?: string;
  designRules?: string;
}

export interface AIConfigManifestSkill {
  name: string;
  files: AIConfigManifestSkillFile[];
}

export interface AIConfigManifestSkillFile {
  path: string;
  content: string;
}

