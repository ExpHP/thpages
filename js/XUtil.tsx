// XUtil.tsx: utils specifically for React code

import React from 'react';

import {MAIN_TITLE} from './App';

// React libraries do not all agree on how to supply a single child.
// (in particular, react-markdown supplies [T] while react normally uses T)
export type SingleChild<T> = T | [T];
export function getSingleChild<T>(s: SingleChild<T>): T {
  if (Array.isArray(s)) {
    return s[0];
  }
  return s;
}

export function Title({children}: {children: SingleChild<string> | null}) {
  const title = children ? getSingleChild(children) : null;
  const prefix = title ? `${title} &mdash; ` : '';
  React.useEffect(() => {
    const $title = document.head.querySelector("title");
    if ($title) $title.innerHTML = `${prefix}${MAIN_TITLE}`;
  }, [prefix]);
  return null;
}

export function Wip({children}: {children: React.ReactNode}) {
  return <span data-wip="1">{children}</span>;
}
export function Wip2({children}: {children: React.ReactNode}) {
  return <span data-wip="2">{children}</span>;
}
