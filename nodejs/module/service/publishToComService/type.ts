export type Schema =
  | { type: "string" | "any" | "number" | "boolean" }
  | { type: "object"; properties?: Record<string, Schema>; }
  | { type: "array"; items: Schema }
  | {
    type: "indexObject"
    properties: { key: { type: "string" }, value: { type: "string" } }
  }
  | { type: "tuple"; items: Schema[]; }
  | { type: "enum"; items: { type: 'string' | 'number', value: string }[]; }

export interface Scene {
  id: string;
  inputs: Array<{
    id: string;
    type: "normal" | "config";
    extValues: {
      config: {
        type: string;
        description: string;
        defaultValue: string;
      };
    };
    editor: {
      type: string;
      schemaType: string;
    };
    title: string;
    schema: Schema;
  }>;
  outputs: Array<{
    id: string;
    title: string;
    schema: Schema;
  }>;
  pinRels: { [key: string]: string[] };
  deps: Array<{ namespace: string; version: string; rtType?: string }>;
}

export type ToJSON = Scene & {
  scenes?: Scene[];
  modules?: Record<
    string,
    {
      title: string;
      json: Scene;
    }
  >;
  plugins: {
    "@mybricks/plugins/service": unknown[];
  };
  definedComs?: any;
  global?: {
    fxFrames: { deps: Scene['deps'] }[]
  }
};

export interface ComJSON {
  author: string;
  author_name: string;
  title: string;
  namespace: string;
}
