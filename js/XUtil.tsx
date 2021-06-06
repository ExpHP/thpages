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

// export function Incremental({step, children}: {step?: number, children: React.ReactNode}) {
//   if (step === 0) {
//     throw new Error("zero step!");
//   }
//   const childArray = React.Children.toArray(children);
//   const step_ = step == null ? 10 : step;

//   const [numToShow, setNumToShow] = React.useState(step_);
//   console.log(numToShow, childArray.length);
//   React.useEffect(() => {
//     if (numToShow < childArray.length) {
//       setTimeout(() => setNumToShow(numToShow + step_), 10000);
//     }
//   }, [numToShow, step_, childArray.length]);

//   return <>{childArray.slice(0, numToShow)}</>;
// }
