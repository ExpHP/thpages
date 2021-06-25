import * as Diff from 'diff';

import {Struct, StructRow} from './database';

/** A string that represents a row of a struct for diff purposes. */
type DiffKey = string & { readonly __tag: unique symbol };
export type DiffRow = LeftRight<StructRow>;

export type LeftRight<T> =
  | {side: 'left', left: T}
  | {side: 'right', right: T}
  | {side: 'both', left: T, right: T}
  ;

export type DiffSide = 'left' | 'right' | 'both';

function makeLeftRight<T>({left, right}: {left?: T, right?: T}): LeftRight<T> {
  if (right === undefined && left !== undefined) return {side: 'left', left};
  if (left === undefined && right !== undefined) return {side: 'right', right};
  if (left !== undefined && right !== undefined) return {side: 'both', left, right};
  throw new Error('makeLeftRight: both are missing!');
}

function doDiff<T>(
    keysA: T[],
    keysB: T[],
    {comparator}: {comparator?: (a: T, b: T) => boolean},
): LeftRight<T>[] {
  const changes = Diff.diffArrays(keysA, keysB, {comparator})
    .flatMap((change) => change.value.map((_item) => ({ // a single change may have multiple lines
      // we'll ignore `item` because it only preserves the identity for one of the sides
      hasLeft: !change.added,
      hasRight: !change.removed,
    })));

  // now get values with the correct identities by reading them from the original lists in order
  const remainingA = [...keysA].reverse();
  const remainingB = [...keysB].reverse();
  const out = changes.map(({hasLeft, hasRight}) => makeLeftRight({
    left: hasLeft ? remainingA.pop() : undefined,
    right: hasRight ? remainingB.pop() : undefined,
  }));

  if (remainingA.length || remainingB.length) {
    throw new Error('bug in doDiff');
  }
  return out;
}

function attachDiffKeys(struct: Struct): {key: DiffKey, row: StructRow}[] {
  return struct.rows.map((row) => {
    let key;
    switch (row.data.type) {
      case 'field':
        key = `f-${row.data.name}` as DiffKey;
        break;
      case 'gap':
        // allow any gap to match with any gap
        key = `gap` as DiffKey;
        break;
    };
    return {key, row};
  });
}

export function diffStructs(structA: Struct, structB: Struct): DiffRow[] {
  const rowsAndKeysA = attachDiffKeys(structA);
  const rowsAndKeysB = attachDiffKeys(structB);
  return doDiff(rowsAndKeysA, rowsAndKeysB, {comparator: (a, b) => a.key === b.key})
    // @ts-ignore
    .map(({side, left, right}) => ({side, left: left?.row, right: right?.row}));
}
