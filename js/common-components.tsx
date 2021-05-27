import * as React from 'react';
import type {ReactNode} from 'react';

export function Err({children}: {children: ReactNode}) {
  console.error(children);
  return <span className="error">{children}</span>;
}
