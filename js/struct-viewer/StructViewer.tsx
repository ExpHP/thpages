import React from 'react';
import type {ReactElement, ReactNode} from 'react';
import clsx from 'clsx';

import {unreachable} from '~/js/util';
import {TrivialForwardRef} from '~/js/XUtil';

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

const COLUMN_CLASSES = ['col-offset', 'col-text'];

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
  const [display1, display2] = diffToDisplayStructs(testStruct1, testStruct2);

  const table1 = applyGridStyles(structCells(display1), {startColumn: 1});
  const table2 = applyGridStyles(structCells(display2), {startColumn: 1 + COLUMN_CLASSES.length});
  return <div className='struct-view'>
    {[
      ...table1.flat().map((elem) => mergeHtmlProps(elem, {'data-side': 'left'})).map((elem) => wrapWithPrefixedKey(elem, 'left-')),
      ...table2.flat().map((elem) => mergeHtmlProps(elem, {'data-side': 'right'})).map((elem) => wrapWithPrefixedKey(elem, 'right-')),
    ]}
  </div>;
}

function applyGridStyles(elements: (JSX.Element | null)[][], options: {startRow?: number, startColumn?: number}): (JSX.Element | null)[][] {
  const {startRow = 1, startColumn = 1} = options;

  const getGridStyle =(rowI: number, colI: number) => ({
    gridRow: startRow + rowI,
    gridColumn: startColumn + colI,
  });

  return elements.map((row, rowI) => (
    row.map((element, colI) => element && (
      React.cloneElement(element, {style: {...element.props.style, ...getGridStyle(rowI, colI)}})
    )
  )));
}

// "Render" a single struct.
//
// * We need some kind of tabular layout in order to correctly align rows in diff output.
// * It has to be a grid instead of a table because we want to animate vertical motion of items
//   within a struct using FlipMove.
// * We can't just produce a grid in this function because this might only be one side of a diff.
// * We can't even return a Fragment because FlipMove needs to be able to get refs to all child elements.
//
// So it's a function that returns a list of lists of JSX elements, indicating rows and columns.
//
// The elements will come with react keys, but will lack grid styles (which should be added as post-processing).
function structCells(struct: DisplayStruct): (JSX.Element | null)[][] {
  return [
    structCellsForHeaderRow(struct),
    ...struct.rows.map((row) => structCellsForRowDispatch(row)),
    structCellsForEndRow(struct),
  ].map((row) => {
    console.assert(row.length === COLUMN_CLASSES.length, row);
    return zip(row, COLUMN_CLASSES).map(([elem, cls]) => withClassName(elem, cls));
  });
}

function withClassName(elem: JSX.Element | null, newClass: string) {
  return elem && mergeHtmlProps(elem, {className: clsx(elem.props.className, newClass)})
}

type MergeableHtmlProps = {
  style?: React.CSSProperties;
  className?: string;
  [key: string]: any;
}
function mergeHtmlProps(elem: JSX.Element | null, props: MergeableHtmlProps) {
  if (!elem) return null;
  if (props.style) props.style = {...elem.props.style, ...props.style};
  if (props.className) props.className = clsx(elem.props.className, props.className);
  return elem && React.cloneElement(elem, props);
}

/** Apply a prefix to an element's existing key. */
function wrapWithPrefixedKey(elem: JSX.Element | null, prefix: string) {
  if (!elem) return null;
  if (!elem.key) {
    console.error(elem);
    throw new Error(`missing key`);
  }
  // React.cloneElement doesn't change keys for some reason so instead we'll wrap it.
  return elem && <TrivialForwardRef key={`${prefix}${elem.key}`}>{elem}</TrivialForwardRef>;
}

const STRUCT_INNER_INDENT = '  ';
const StructKeyword = <span className='keyword'>{'struct'}</span>;
const PackedKeyword = <span className='keyword'>{'__packed'}</span>;
const OpenBrace = <span className='brace'>{'{'}</span>;
const CloseBrace = <span className='brace'>{'}'}</span>;

function structCellsForRowDispatch({key, data}: DisplayStructRow): (JSX.Element | null)[] {
  switch (data.type) {
    case 'spacer-for-diff': return [null, null];
    case 'field': return structCellsForRow({text: <FieldDef data={data}/>, key, data, indent: true});
    case 'gap': return structCellsForRow({text: <FieldGap data={data}/>, key, data, indent: true});
  }
}

function structCellsForHeaderRow(struct: DisplayStruct) {
  return [
    null, // offset
    <div key={`name`} className='col-text'>
      {StructKeyword} <span className='struct-name'>{struct.name}</span> {PackedKeyword} {OpenBrace}<br/>
    </div>,
  ];
}

function structCellsForRow(args: {text: ReactNode, key: ReactKey, data: {isChange: boolean, offset: number}, indent?: boolean}) {
  const {text, key, data, indent = false} = args;
  return [
    <div key={`o-${key}`}>
      <FieldOffset offset={data.offset}/>
    </div>,
    <div key={`t-${key}`} className={clsx({'indent': indent}, diffClass(data.isChange))}>
      {text}
    </div>,
  ];
}

function structCellsForEndRow(struct: DisplayStruct) {
  const data = {isChange: false, offset: struct.size};
  return structCellsForRow({text: CloseBrace, key: '#clbrace' as ReactKey, data});
}

function FieldDef({data}: {data: DisplayRowFieldData}) {
  return <>
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

function FieldGap({data: {size, sizeIsChange}}: {data: DisplayRowGapData}) {
  return <span className='field-gap'>
    {'// '}
    <span className={diffClass(sizeIsChange)}>0x{size.toString(16)}</span>
    {' bytes...'}
  </span>;
}

function FieldOffset({offset}: {offset: number}) {
  const hex = offset.toString(16);
  return <span className='field-offset-text'>0x{hex}</span>;
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
