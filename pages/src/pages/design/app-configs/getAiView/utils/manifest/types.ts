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
  name: string;
  version: string;
  libraryName: string;
  globalVar?: string;
  umd: string[];
  css?: string[];
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

