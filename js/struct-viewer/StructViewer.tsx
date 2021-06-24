import React from 'react';
import clsx from 'clsx';
import * as Diff from 'diff';
import {Struct, StructField, testStruct1, testStruct2, TypeName, FieldName, CTypeString} from './database';
import {unreachable} from '~/js/util';

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
};

type DisplayCType = {
  type: string;
  isChange: boolean;
}

type ReactKey = string & { readonly __tag: unique symbol };

function displayStructFromStruct(struct: Struct): DisplayStruct {
  const discriminators = new Map();
  return {
    ...struct,
    rows: struct.rows.map((row) => {
      if (row.field) {
        const name = row.field.name;
        if (!discriminators.has(name)) {
          discriminators.set(name, 0);
        }
        const discriminator = discriminators.get(name);
        discriminators.set(name, discriminator + 1);

        const key = `f-${name}-${discriminator}` as ReactKey;
        let ctype = {type: row.field.type, isChange: false};
        const data = {type: 'field', offset: row.offset, isChange: false, ctype, name} as const;
        return {key, data};
      } else {
        const key = `gap-${row.offset}` as ReactKey;
        const data = {type: 'gap', offset: row.offset, isChange: false, size: row.size} as const;
        return {key, data};
      }
    }),
  };
}

type Side = 'left' | 'right';

type StructDiff = {
  key: ReactKey,
  side: 'left' | 'right' | 'both',
};

function doStructDiff(keysA: ReactKey[], keysB: ReactKey[]): StructDiff[] {
  return Diff.diffArrays(keysA, keysB).flatMap((change) => change.value.map((key) => ({
    key,
    side: change.added ? 'right' : change.removed ? 'left' : 'both',
  })));
}

// function displayStructFromStruct(struct: Struct): DisplayStruct {
//   function makeDisplayRow(row: StructField) {
//     return {...row, field: row.field && {...row.field, diffKind: null}}
//   }
//   return {...struct, fields: struct.fields.map(makeDisplayRow)};
// }

function diffDisplayStructs(structA: DisplayStruct, structB: DisplayStruct): [DisplayStruct, DisplayStruct] {
  const structs = [structA, structB];
  const rowMaps = structs.map((x) => new Map([...x.rows.map((row) => [row.key, row] as const)]));

  const results: DisplayStruct[] = structs.map((struct) => ({...struct, rows: []}));
  const gapCounters = [0, 0];

  const keysA = structA.rows.map((row) => row.key);
  const keysB = structB.rows.map((row) => row.key);
  console.log(structs);
  for (const {key, side} of doStructDiff(keysA, keysB)) {
    console.log(key);
    if (side === 'both') {
      const rows = rowMaps.map((map) => map.get(key)!);

      const [rowA, rowB] = rows; // help typescript out
      if (rowA.data.type === 'field' && rowB.data.type === 'field') {
        const typeIsChange = rowA.data.ctype.type !== rowB.data.ctype.type;
        const updatedRow = (row: any) => ({...row, data: {...row.data, ctype: {...row.data.ctype, isChange: typeIsChange}}});
        results[0].rows.push(updatedRow(rowA));
        results[1].rows.push(updatedRow(rowB));
      } else if (rowA.data.type === 'gap' && rowB.data.type === 'gap') {
        results[0].rows.push(rowA);
        results[1].rows.push(rowB);
      } else {
        throw new Error(`impossible match between ${rowA.data.type} and ${rowB.data.type}`)
      }
    } else {
      let indexWith;
      if (side === 'left') indexWith = 0;
      else if (side === 'right') indexWith = 1;
      else unreachable(side);

      // Side with the line
      const row = {...rowMaps[indexWith].get(key)!};
      console.log(row, side);
      if (row.data.type !== 'spacer-for-diff') {
        row.data.isChange = true;
      }
      results[indexWith].rows.push(row);

      // Gap on the other side
      results[1 - indexWith].rows.push({
        key: `xx-${gapCounters[1 - indexWith]++}` as ReactKey,
        data: {type: 'spacer-for-diff'},
      })
    }
  }
  return [results[0], results[1]];
}


export function StructViewerPage() {
  const struct1 = displayStructFromStruct(testStruct1);
  const struct2 = displayStructFromStruct(testStruct2);
  const [diff1, diff2] = diffDisplayStructs(struct1, struct2);
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
    case 'gap': return structCellsForRow(<FieldGap size={data.size}/>, key, data, forwarded);
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
      className={clsx('col-text', {'diff-oneside': data.isChange})}
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
  return <span className={clsx('field-type', {'diff-changed': isChange})}>{type}</span>;
}

function FieldGap({size}: {size: number}) {
  return <span className='field-gap'>{STRUCT_INNER_INDENT}// 0x{size.toString(16)} bytes...</span>;
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
