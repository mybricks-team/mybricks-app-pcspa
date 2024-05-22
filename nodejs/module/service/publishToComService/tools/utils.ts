import { Logger } from "@mybricks/rocker-commons";
import { Schema, ToJSON } from "../type";

export function transSchemaToTS(schema: Schema) {
  let typeStr = '';

  switch (schema?.type) {
    case 'string':
    case 'number':
    case 'any':
    case 'boolean':
      typeStr = schema.type
      break;

    case 'array':
      typeStr = `${transSchemaToTS(schema.items)}[]`
      break;

    case 'object':
    case 'indexObject':
      if (schema.properties) {
        typeStr = `{ ${Object.entries(schema.properties)
          .map(([key, val]) => `${key}: ${transSchemaToTS(val)}; `)
          .join('')} }`
      } else { typeStr = '{}'; }

      break;

    case 'enum':
      typeStr = schema.items.map(item => {
        return item.type === 'string' ? `"${item.value}"` : Number(item.value);
      }).join(' | ');
      break;

    case 'tuple':
      typeStr = `[ ${schema.items.map(item => transSchemaToTS(item)).join(', ')} ]`
      break;

    default:
      typeStr = 'any'
  }

  return typeStr;
}

export function transSchemaToVueProp(schema: Schema, defaultValue?: string) {
  let res = 'type:'
  const toVueObjectType = (str: string) => `Object as PropType<${str}>`

  switch (schema?.type) {
    case 'string':
      res += 'String'
      break;
    case 'number':
      res += 'Number'
      break;
    case 'any':
      res += 'null'
      break;
    case 'boolean':
      res += 'Boolean'
      break;

    case 'array':
      res += toVueObjectType(`${transSchemaToTS(schema.items)}[]`)
      break;

    case 'object':
    case 'indexObject':
      if (schema.properties) {
        res += toVueObjectType(`{ ${Object.entries(schema.properties)
          .map(([key, val]) => `${key}: ${transSchemaToTS(val)}; `)
          .join('')} }`)
      } else { res += toVueObjectType('{}'); }
      break;

    case 'enum':
      res += toVueObjectType(schema.items.map(item => {
        return item.type === 'string' ? `"${item.value}"` : Number(item.value);
      }).join(' | '));
      break;

    case 'tuple':
      res += toVueObjectType(`[ ${schema.items.map(item => transSchemaToTS(item)).join(', ')} ]`)
      break;

    default:
      res += 'null';
  }

  if (defaultValue) {
    res += `, default: () => (${defaultValue})`;
  }

  return `{${res}}`;
}

function analysisConfigInputsTS(json: ToJSON) {
  Logger.info(`[publishToCom] 开始解析 configInputs 的类型...`);
  const { inputs } = json.scenes?.[0] || json;

  const configInputs = inputs.filter(item => item?.type === 'config');

  const configInputsTS = configInputs.map(input => {
    const { id, schema } = input;
    return `${id}?: ${transSchemaToTS(schema)}; `;
  }).join('');

  Logger.info(`[publishToCom] 解析 configInputs 的类型完成`);
  return configInputsTS;
}

function analysisNormalInputsTS(json: ToJSON) {
  Logger.info(`[publishToCom] 开始解析 normalInputs 的类型...`);
  const { inputs, outputs, pinRels } = json.scenes?.[0] || json;

  const normalInputs = inputs.filter(item => item?.type === 'normal');

  const normalInputsTS = normalInputs.map(input => {
    const { id, schema } = input;
    let result = 'void';

    const rels = pinRels[`_rootFrame_-${id}`]
    // 有关联输出项时，input 的返回值是 Promise<关联输出项的类型>
    if (rels?.length) {
      const resultSchema = outputs.find(output => output.id === rels[0])!.schema;
      result = `Promise<${transSchemaToTS(resultSchema)}>`;
    }

    return `${id}: (value: ${transSchemaToTS(schema)}) => ${result}; `;
  }).join('');

  Logger.info(`[publishToCom] 解析 normalInputs 的类型完成`);
  return normalInputsTS;
}

function analysisOutputsTS(json: ToJSON) {
  Logger.info(`[publishToCom] 开始解析 outputs 的类型...`);
  const { outputs, pinRels } = json.scenes?.[0] || json;

  const pinRelsMap = Object.entries(pinRels).reduce((acc, [key, val]) => {
    val.forEach((cur) => acc.set(cur, key));
    return acc;
  }, new Map())
  // 如果是某个 input 的关联输出项，则忽略
  const withoutRefOutput = outputs.filter(item => !pinRelsMap.get(item.id));

  const outputsTs = withoutRefOutput.map((output) => {
    const { id, schema } = output;
    return `${id}?: (value: ${transSchemaToTS(schema)}) => void; `;
  }).join('');

  Logger.info(`[publishToCom] 解析 outputs 的类型完成`);
  return outputsTs;
}

function analysisReactDefaultProps(json: ToJSON) {
  const { inputs } = json.scenes?.[0] || json;
  let res = '';
  inputs.forEach(item => {
    if(item.type !== 'config') return;
    const key = item.id;
    const value = item.extValues?.config?.defaultValue;
    if (value) res += `${key}:${value},`;
  })
  return res;
}

export { analysisConfigInputsTS, analysisNormalInputsTS, analysisOutputsTS, analysisReactDefaultProps };