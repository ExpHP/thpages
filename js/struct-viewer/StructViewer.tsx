import React from 'react';
import clsx from 'clsx';

import {unreachable} from '~/js/util';

import {Struct, StructRow, testStruct1, testStruct2, TypeName, FieldName, CTypeString} from './database';
import {diffStructs} from './diff';

/** Format of a struct to be displayed. */
export type DisplayStruct = {
  name: TypeName,
  rows: DisplayStructRow[],
  size: number,
};

export type DisplayStructRow = {
  key: ReactKey;
  data:
    | {type: 'gap'} & DisplayRowGapData
    | {type: 'field'} & DisplayRowFieldData
    | {type: 'spacer-for-diff'}
    ;
};

type DisplayRowFieldData = {
  offset: number;
  isChange: boolean;
  name: FieldName;
  ctype: DisplayCType;
};

type DisplayRowGapData = {
  offset: number;
  isChange: boolean;
  size: number;
  sizeIsChange: boolean;
};

type DisplayCType = {
  type: CTypeString;
  isChange: boolean;
}

type DiffClass = string | undefined;
function diffClass(isChanged: boolean): DiffClass {
  return isChanged ? 'diff-oneside' : undefined;
}

type ReactKey = string & { readonly __tag: unique symbol };

function toDisplayStruct(struct: Struct): DisplayStruct {
  const assignDiscriminator = makeDisambiguator();
  return {
    ...struct,
    rows: struct.rows.map((row) => {
      if (row.data.type === 'field') {
        const name = row.data.name;
        const discriminator = assignDiscriminator(name);

        const key = `f-${name}-${discriminator}` as ReactKey;
        let ctype = {type: row.data.ctype, isChange: false};
        const data = {type: 'field', offset: row.offset, isChange: false, ctype, name} as const;
        return {key, data};
      } else if (row.data.type === 'gap') {
        const key = `gap-${row.offset}` as ReactKey;
        const data = {type: 'gap', offset: row.offset, isChange: false, size: row.size, sizeIsChange: false} as const;
        return {key, data};
      } else {
        unreachable(row.data);
      }
    }),
  };
}

type Side = 'left' | 'right';

// function displayStructFromStruct(struct: Struct): DisplayStruct {
//   function makeDisplayRow(row: StructField) {
//     return {...row, field: row.field && {...row.field, diffKind: null}}
//   }
//   return {...struct, fields: struct.fields.map(makeDisplayRow)};
// }

function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  return as.map((a, index) => [a, bs[index]]);
}

function diffToDisplayStructs(structA: Struct, structB: Struct): [DisplayStruct, DisplayStruct] {
  const structs = [structA, structB];
  const displayStructs = [toDisplayStruct(structA), toDisplayStruct(structB)];
  const gapCounters = [0, 0];

  // we need to build new lists of rows so we can insert spacers along the way
  const results: DisplayStruct[] = displayStructs.map((displayStruct) => ({...displayStruct, rows: []}));

  type RowMap = Map<StructRow, DisplayStructRow>;
  const rowMaps: RowMap[] = zip(structs, displayStructs).map(([struct, displayStruct]) => {
    return new Map([...zip(struct.rows, displayStruct.rows)]);
  });

  // we currently have two DisplayStructs with empty diff information.  Update them in-place.
  for (const diff of diffStructs(structA, structB)) {
    const displayRowA = rowMaps[0].get((diff as any).left);
    const displayRowB = rowMaps[1].get((diff as any).right);

    if (diff.side === 'both') {
      const {left: rowA, right: rowB} = diff;

      // depending on row type, add more diff spans inside the content
      if (rowA.data.type === 'field' && rowB.data.type === 'field') {
        if (!primitiveEqual(rowA.data.ctype, rowB.data.ctype)) {
          (displayRowA!.data as DisplayRowFieldData).ctype.isChange = true;
          (displayRowB!.data as DisplayRowFieldData).ctype.isChange = true;
        }

      } else if (rowA.data.type === 'gap' && rowB.data.type === 'gap') {
        if (!primitiveEqual(rowA.size, rowB.size)) {
          (displayRowA!.data as DisplayRowGapData).sizeIsChange = true;
          (displayRowB!.data as DisplayRowGapData).sizeIsChange = true;
        }

      } else {
        throw new Error(`impossible match between ${rowA.data.type} and ${rowB.data.type}`)
      }
      results[0].rows.push(displayRowA!);
      results[1].rows.push(displayRowB!);

    } else {
      let indexWith;
      if (diff.side === 'left') indexWith = 0;
      else if (diff.side === 'right') indexWith = 1;
      else unreachable(diff);

      // Side with the line
      const displayRow: DisplayStructRow = [displayRowA, displayRowB][indexWith]!;
      if (displayRow.data.type === 'spacer-for-diff') {
        throw new Error('impossible: a spacer already exists!');
      }
      displayRow.data.isChange = true;
      results[indexWith].rows.push(displayRow);

      // Gap on the other side
      results[1 - indexWith].rows.push({
        key: `xx-${gapCounters[1 - indexWith]++}` as ReactKey,
        data: {type: 'spacer-for-diff'},
      })
    }
  }
  return [results[0], results[1]];
}

/**
 * `===` but type-checked to forbid types that have reference equality. (for use in places
 * where you fear a refactoring may eventually change the types to objects) */
function primitiveEqual<T extends number | string | null | undefined | boolean>(a: T, b: T) {
  return a === b;
}

export function StructViewerPage() {
  const [diff1, diff2] = diffToDisplayStructs(testStruct1, testStruct2);
  return <div className='struct-view'>
    {[
      ...structCells({struct: diff1, side: 'left'}),
      ...structCells({struct: diff2, side: 'right'}),
    ]}
  </div>;
}

const StructKeyword = <span className='keyword'>{'struct'}</span>;
const PackedKeyword = <span className='keyword'>{'__packed'}</span>;
const OpenBrace = <span className='brace'>{'{'}</span>;
const CloseBrace = <span className='brace'>{'}'}</span>;

// export function ShowStruct({struct, side}: {struct: DisplayStruct, side?: Side}) {
//   const offsetPadding = struct.size.toString(16).length;

//   return <div className='struct-view'>
//     <div className='struct-row'>
//       <div className='col-offset'></div>
//       <div className='col-text'>
//         {StructKeyword} <span className='struct-name'>{struct.name}</span> {PackedKeyword} {OpenBrace}<br/>
//       </div>
//     </div>

//     {struct.rows.map(({key, data}) => (
//       <div key={key} className='struct-row'>
//         <div className='col-offset'><FieldOffset offset={offset} padding={offsetPadding} data-side={side}/></div>
//         <div className={clsx('col-text', {'diff-oneside': field?.diffKind === 'one-side'})} data-side={side}>
//           {'  '}
//           {field
//             ? <FieldDef field={field}/>
//             : <FieldGap size={size}/>}
//         </div>
//       </div>
//     ))}

//     <div className='struct-row'>
//       <div className='col-offset'><FieldOffset offset={struct.size} padding={offsetPadding}/></div>
//       <div className='col-text'>{CloseBrace}</div>
//     </div>
//   </div>;
// }

// "Render" a single struct.
//
// * We need some kind of tabular layout in order to correctly align rows in diff output.
// * It has to be a grid instead of a table because we want to animate vertical motion of items
//   within a struct using FlipMove.
// * We can't just produce a grid in this function because this might only be one side of a diff.
// * We can't even return a Fragment because FlipMove needs to be able to get refs to all child elements.
//
// So it's a function that returns a list of JSX elements that come with keys and grid positions.
function structCells({struct, side}: {struct: DisplayStruct, side?: Side}): React.ReactElement[] {
  const offsetPadding = struct.size.toString(16).length;

  const {colText, colOffset} = columnIndices(side);

  return [
    <div key={`${side}-name`} className='col-text' style={{gridRow: 1, gridColumn: colText}}>
      {StructKeyword} <span className='struct-name'>{struct.name}</span> {PackedKeyword} {OpenBrace}<br/>
    </div>,

    ...struct.rows.flatMap((row, rowIndex) => (
      structCellsForRowDispatch(row, {gridRow: rowIndex + 2, side, offsetPadding}))
    ),

    ...structCellsForRow(
      CloseBrace, '-clbrace' as ReactKey,
      {isChange: false, offset: struct.size},
      {gridRow: 2 + struct.rows.length, side, offsetPadding},
    ),
  ];
}

function structCellsForRowDispatch({key, data}: DisplayStructRow, forwarded: {gridRow: number, offsetPadding: number, side?: Side}) {
  switch (data.type) {
    case 'spacer-for-diff': return [];
    case 'field': return structCellsForRow(<FieldDef data={data}/>, key, data, forwarded);
    case 'gap': return structCellsForRow(<FieldGap {...data}/>, key, data, forwarded);
  }
}

function structCellsForRow(text: React.ReactElement, key: ReactKey, data: {isChange: boolean, offset: number}, forwarded: {gridRow: number, side?: Side, offsetPadding: number}) {
  const {gridRow, side, offsetPadding} = forwarded;
  const {colText, colOffset} = columnIndices(side);
  return [
    <div
      key={`${side}-o-${key}`}
      style={{gridRow, gridColumn: colOffset}}
      className='col-offset'
    >
      <FieldOffset offset={data.offset} padding={offsetPadding}/>
    </div>,
    <div
      key={`${side}-t-${key}`}
      style={{gridRow, gridColumn: colText}}
      className={clsx('col-text', diffClass(data.isChange))}
      data-side={side}
    >
      {text}
    </div>,
  ];
}

const STRUCT_INNER_INDENT = '  ';

function FieldDef({data}: {data: {isChange: boolean, name: FieldName, ctype: DisplayCType}}) {
  return <>
    {STRUCT_INNER_INDENT}
    <span className='field-name'>{data.name}</span>
    {' : '}
    <CType ctype={data.ctype}/>
    {';'}
  </>;
}

function CType({ctype}: {ctype: DisplayCType}) {
  const {isChange, type} = ctype;
  return <span className={clsx('field-type', diffClass(isChange))}>{type}</span>;
}

function FieldGap({size, sizeIsChange}: DisplayRowGapData) {
  return <span className='field-gap'>{STRUCT_INNER_INDENT}
    {'// '}
    <span className={diffClass(sizeIsChange)}>0x{size.toString(16)}</span>
    {' bytes...'}
  </span>;
}

function FieldOffset({offset, padding}: {offset: number, padding: number}) {
  const hex = offset.toString(16);
  const paddingStr = ' '.repeat(padding - hex.length);
  return <span className='field-offset-text'>{paddingStr}0x{hex}</span>;
}

function columnIndices(side?: Side): {colOffset: number, colText: number} {
  const colOffset = side === 'right' ? 3 : 1; // note: undefined also maps to 1
  const colText = colOffset + 1;
  return {colOffset, colText};
}

/**
 * Get a function that returns an index to distinguish between identical inputs,
 * in a deterministic manner:
 *
 * The first time it sees any given value, it returns 0.
 * The second time it sees a value, it will return 1.  Etc.
 *
 * Useful for generating react keys from things that may contain duplicates,
 * as this will provide at least a decent heuristic for which duplicate in one set
 * should be animated into which duplicate in another.
 **/
function makeDisambiguator<T>(): (x: T) => number {
  const discriminators = new Map();
  return (value: T) => {
    if (!discriminators.has(value)) {
      discriminators.set(value, 0);
    }
    const discriminator = discriminators.get(value);
    discriminators.set(value, discriminator + 1);

    return discriminator;
  };
}
