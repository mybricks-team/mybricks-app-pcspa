/**
 * 使用树形选择器完成字段映射
 */

import React, { useCallback, useRef, useState } from 'react';
import {AnyType} from '@/types';
import { uuid } from '../../../utils';
import { schema2params, params2schema } from './utils';

import styles from './index.less';

export default function ParamsEdit({ schema, onChange, setEditNowId }: any) {
  const valueRef = useRef<AnyType>({});
  const [params, setParams] = useState(() => {
    const curParams = schema ? schema2params(schema) : { id: uuid(), name: 'root', type: 'root', children: [] };
    valueRef.current = curParams;

    return curParams;
  });
  const updateValue = useCallback(() => {
    setParams({ ...valueRef.current });
    const schema = params2schema(valueRef.current);
    onChange(schema);
  }, []);

  const resetValue = useCallback((item) => {
    ['minLength', 'maxLength', 'minimum', 'maximum'].forEach((key) => {
      Reflect.deleteProperty(item, key);
    });
    item.children = [];
  }, []);

  const set = useCallback((item, key, val) => {
    if (item[key] === val) return;
    item[key] = val;
    if (key === 'type') {
      resetValue(item);
      item['defaultValue'] = '';
      if (val === 'array') {
        item.children = [{ name: 'items', type: 'string', id: uuid() }];
      }
    }
    formatValue(item, key, val);
    setEditNowId(item.id);
    updateValue();
  }, []);

  const removeItem = (item, parent) => {
    parent.children = parent.children.filter(({ name }) => name !== item.name);
    if (parent.type === 'array') {
      parent.children.forEach((child, index) => {
        child.name = `${index}`;
        child.defaultValue = parent.children[index].defaultValue;
      });
    }
    setEditNowId(void 0);
    updateValue();
  };

  const addItem = (item, parent) => {
    const id = uuid();
    if (item && (item.type === 'object' || item.type === 'array')) {
      item.children = item.children || [];
      let name = `name${item.children.length + 1}`;
      if (item.type === 'array') {
        name = `${item.children.length}`;
      }
      item.children.push({ id, name, type: 'string' });
    } else {
      parent.children = parent.children || [];
      const name = `name${parent.children.length + 1}`;
      parent.children.push({ id, type: 'string', name });
    }
    setEditNowId(void 0);
    updateValue();
  };

  const processAry = useCallback((item, depth) => {
    return item.children.map((child: any) => {
      return processItem(child, item, depth);
    });
  }, []);

  const processItem = useCallback((item, parent, depth = -1) => {
    if (!item) return null;
    const { type } = item;
    let jsx;
    if (type === 'root') {
      return <div className={styles.list}>{processAry(item, depth + 1)}</div>;
    }
    if (item.children) {
      jsx = processAry(item, depth + 1);
    }

    const isArray = parent.type === 'array';

    const addAble =
      (depth === 0 &&
        parent.children?.[
          Math.min(
            parent.children.findLastIndex(
              ({ type }: any) => type === 'string' || type === 'number'
            ),
            parent.children.length - 1
          )
        ]?.name === item.name) ||
      type === 'object' ||
      (isArray &&
        item.name === 'items' &&
        (type === 'object' || type === 'array'));

    const removeAble = !(isArray && item.name === 'items');
    return (
      <div key={item.id} className={styles.ct}>
        <div className={styles.item}>
          <input
            style={{ width: 331 - depth * 20 }}
            type='text'
            value={
              isArray && item.name !== 'items' ? `[${item.name}]` : item.name
            }
            disabled={isArray}
            onChange={(e) => set(item, 'name', e.target.value)}
          />
          <select
            className={styles.type}
            value={item.type}
            onChange={(e) => set(item, 'type', e.target.value)}
          >
            <option label={'字符'} value={'string'} />
            <option label={'数字'} value={'number'} />
            <option label={'对象'} value={'object'} />
            <option label={'列表'} value={'array'} />
          </select>
          <div className={`${styles.operate} ${styles.flex}`}>
            {removeAble ? (
              <span
                className={`${styles.iconRemove}`}
                onClick={(e) => removeItem(item, parent)}
              >
                <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                  <path d="M360 184h-8c4.4 0 8-3.6 8-8v8h304v-8c0 4.4 3.6 8 8 8h-8v72h72v-80c0-35.3-28.7-64-64-64H352c-35.3 0-64 28.7-64 64v80h72v-72zm504 72H160c-17.7 0-32 14.3-32 32v32c0 4.4 3.6 8 8 8h60.4l24.7 523c1.6 34.1 29.8 61 63.9 61h454c34.2 0 62.3-26.8 63.9-61l24.7-523H888c4.4 0 8-3.6 8-8v-32c0-17.7-14.3-32-32-32zM731.3 840H292.7l-24.2-512h487l-24.2 512z"/>
                </svg>
              </span>
            ) : null}
            {addAble ? (
              <span
                className={styles.iconAdder}
                onClick={() => addItem(item, parent)}
              >
                +
              </span>
            ) : null}
          </div>
        </div>
        {jsx}
      </div>
    );
  }, []);

  return (
    <div>
      {!schema || params?.children?.length === 0 ? (
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => addItem(valueRef.current, valueRef.current)}
        >
          +
        </span>
      ) : (
        <>
          <div className={styles.header}>
            <p className={styles.fieldName}>字段名</p>
            <p className={styles.type}>类型</p>
            <p className={styles.operate}>操作</p>
          </div>
          <div className={styles.content}>
            {processItem(valueRef.current, valueRef.current)}
          </div>
        </>
      )}
    </div>
  );
}

function getKey({ type }: any, max: boolean) {
  if (type === 'array') {
    return max ? 'maxItems' : 'minItems';
  }
  if (type === 'string') {
    return max ? 'maxLength' : 'minLength';
  }
  if (type === 'number') {
    return max ? 'maximum' : 'minimum';
  }
}

function formatValue(item, key, val) {
  Reflect.deleteProperty(item, 'minError');
  Reflect.deleteProperty(item, 'maxError');

  function validate(item, val, start, end, le: boolean) {
    if (
      key === start &&
      item[end] !== void 0 &&
      (le ? val < item[end] : val > item[end])
    ) {
      key.startsWith('min') ? (item.minError = true) : (item.maxError = true);
    }
  }

  [
    ['minLength', 'maxLength', false],
    ['maxLength', 'minLength', true],
    ['minItems', 'maxItems', false],
    ['maxItems', 'minItems', true],
    ['minimum', 'maximum', false],
    ['maximum', 'minimum', true],
  ].forEach(([start, end, le]) => {
    validate(item, val, start, end, le as boolean);
  });
}
