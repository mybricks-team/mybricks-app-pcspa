import React from 'react';
import css from './index.less';

export default function RadioButton({ options, value, onChange }) {
  return (
    <div className={css.edt}>
      {options.map((opt) => {
        return (
          <div
            key={opt.value}
            className={`${css.opt} ${opt.value === value ? css.selected : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.title}
          </div>
        );
      })}
    </div>
  );
}
