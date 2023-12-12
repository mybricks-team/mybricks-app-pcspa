import React from 'react';
import css from './index.less';

export default function Button({ children, ...props }: any) {
  return (
    <button {...props} className={`${css.btn} ${props.className ?? ''}`}>
      <span>{children}</span>
    </button>
  );
}
