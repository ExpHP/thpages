import React from 'react';
import clsx from 'clsx';
import {Struct, StructField, testStruct1, testStruct2, TypeName, FieldName, CTypeString} from './database';

/** Format of a struct to be displayed. */
export type DisplayStruct = {
  name: TypeName,
  rows: DisplayStructRow[],
  size: number,
};

export type DisplayStructRow = {
  offset: number,
  key: ReactKey,
  field: DisplayField | null,
  size: number,
};

export type DisplayField = {
  diffKind: DiffKind;
  name: FieldName;
  type: CTypeString;
};

type ReactKey = string & { readonly __tag: unique symbol };

type DiffKind = null | 'type-changed' | 'one-side';

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
        const field = {...row.field, diffKind: null};
        return {...row, key, field};
      } else {
        const key = `gap-${row.offset}` as ReactKey;
        return {...row, key, field: null};
      }
    }),
  };
}


// function displayStructFromStruct(struct: Struct): DisplayStruct {
//   function makeDisplayRow(row: StructField) {
//     return {...row, field: row.field && {...row.field, diffKind: null}}
//   }
//   return {...struct, fields: struct.fields.map(makeDisplayRow)};
// }

function diffDisplayStructs(structA: DisplayStruct, structB: DisplayStruct): [DisplayStruct, DisplayStruct] {
  const getFieldTypes = (x: DisplayStruct) => new Map([...x.rows.filter((row) => row.field).map((row) => [row.key, row.field!.type] as const)]);

  function makeDiff(cur: DisplayStruct, otherTypes: Map<ReactKey, CTypeString>) {
    return {
      ...cur,
      rows: cur.rows.map((row) => {
        if (row.field) {
          const otherType = otherTypes.get(row.key);
          const diffKind = (
            (!otherType) ? 'one-side' :
            (otherType !== row.field.type) ? 'type-changed' : null
          );

          return {...row, field: {...row.field, diffKind} as const};
        } else {
          return row;
        }
      }),
    };
  }
  return [makeDiff(structA, getFieldTypes(structB)), makeDiff(structB, getFieldTypes(structA))];
}


export function StructViewerPage() {
  const struct1 = displayStructFromStruct(testStruct1);
  const struct2 = displayStructFromStruct(testStruct2);
  const [diff1, diff2] = diffDisplayStructs(struct1, struct2);
  return <>
    <div style={{display:'inline-block'}} className='diff-left'><ShowStruct struct={diff1}/></div>
    <div style={{display:'inline-block'}} className='diff-right'><ShowStruct struct={diff2}/></div>
  </>;
}

const StructKeyword = <span className='keyword'>{'struct'}</span>;
const PackedKeyword = <span className='keyword'>{'__packed'}</span>;
const OpenBrace = <span className='brace'>{'{'}</span>;
const CloseBrace = <span className='brace'>{'}'}</span>;

export function ShowStruct({struct}: {struct: DisplayStruct}) {
  const offsetPadding = struct.size.toString(16).length;

  return <pre className='struct-view' style={{display: 'inline-block'}}><code>
    {StructKeyword} <span className='struct-name'>{struct.name}</span> {PackedKeyword} {OpenBrace}<br/>

    {struct.rows.map(({offset, key, field, size}) => (
      <React.Fragment key={key}>
        <FieldOffset offset={offset} padding={offsetPadding}/>
        {' '}
        {field
          ? <FieldDef field={field}/>
          : <FieldGap size={size}/>}
        <br/>
      </React.Fragment>
    ))}

    <FieldOffset offset={struct.size} padding={offsetPadding}/> {CloseBrace}
  </code></pre>;
}

export function FieldDef({field}: {field: DisplayField}) {
  console.log(field);
  return <span className={clsx('struct-field', {'diff-oneside': field.diffKind === 'one-side'})}>
    <span className='field-name'>{field.name}</span>
    {' : '}
    <span className={clsx('field-type', {'diff-changed': field.diffKind === 'type-changed'})}>{field.type}</span>
    {';'}
  </span>;
}

export function FieldGap({size}: {size: number}) {
  return <span className='field-gap'>// 0x{size.toString(16)} bytes...</span>;
}

export function FieldOffset({offset, padding}: {offset: number, padding: number}) {
  const hex = offset.toString(16);
  const paddingStr = ' '.repeat(padding - hex.length);
  return <span className='field-offset'>/* {paddingStr}0x{hex} */</span>;
}
