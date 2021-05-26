import * as React from 'react';

export function Err({kind, args}: {kind: string, args: string}) {
  const err = `${kind}(${args}})`;
  console.error(err);
  return <span className="error">err</span>;
}
