import React from 'react';
import type {ReactElement, ReactNode} from 'react';
import {useHistory} from 'react-router-dom';
import type {History} from 'history';
import {Async} from 'react-async';
import FlipMove from 'react-flip-move';
import clsx from 'clsx';
import nearley from 'nearley';
import grammar from './parse-ctype.ne';

import {unreachable} from '~/js/util';
import {Err} from '~/js/Error';
import {TrivialForwardRef} from '~/js/XUtil';
import {useSearchParams} from '~/js/UrlTools';

import {
  StructDatabase, Struct, StructRow, TypeName, FieldName, CTypeString,
  PathReader, Version, VersionLevel,
} from './database';
import {diffStructs} from './diff';
import {Selectors} from './Selectors';

// =============================================================================

export function StructViewerPageFromUrl() {
  const db = useDb(defaultPathReader);
  const searchParams = useSearchParams();
  // console.debug(searchParams);
  // const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  // console.debug(parser.feed("int [5][6]"));
  const struct = searchParams.get('t');
  const version = searchParams.get('v');

  const history = useHistory();
  const setStruct = React.useCallback((struct) => navigateToStruct(history, struct), [history]);
  const setVersion = React.useCallback((version) => navigateToVersion(history, version), [history]);

  return <StructViewerPage
    db={db} name={struct as TypeName} version={version}
    setName={setStruct} setVersion={setVersion}
  />;
}

function navigateToStruct(history: History, struct: TypeName) {
  const location = history.location;
  const search = new URLSearchParams(location.search.substring(1));
  search.set('t', struct);
  history.push({search: search.toString()});
}

function navigateToVersion(history: History, version: Version) {
  const location = history.location;
  const search = new URLSearchParams(location.search.substring(1));
  search.set('v', version);
  history.push({search: search.toString()});
}

export function StructViewerPage(props: {
  db: StructDatabase,
  name: TypeName,
  version: string,
  setName: React.Dispatch<TypeName>,
  setVersion: React.Dispatch<Version>,
}) {
  const {db, name, version, setName, setVersion} = props;
  const promiseFn = React.useCallback(async () => {
    // Show placeholder text until everything is selected
    if (!version) return null;
    if (!name) return null;

    const v1 = await db.parseVersion(version);
    if (!v1) throw new Error(`No such version: '${version}'`);

    console.log(db);
    const struct = await db.getStructIfExists(name, v1);
    if (!struct) throw new Error(`Struct '${name}' does not exist in version '${version}'`);

    return struct;
  }, [db, name, version]);

  return <>
    <Selectors
      // FIXME should use validated version
      setStruct={setName} setVersion={setVersion} struct={name} version={version as Version} db={db}
      minLevel='primary'
    />
    <Async promiseFn={promiseFn}>
      <Async.Initial persist><h1>Loading structs...</h1></Async.Initial>
      <Async.Fulfilled persist>{(value) => (
        value ? <StructViewerPageImpl struct={value}/>
          : <div>Please select a struct and version.</div>
      )}</Async.Fulfilled>
      <Async.Rejected>{(err) => <Err>{err.message}</Err>}</Async.Rejected>
    </Async>
  </>;
}

export function DiffViewerPage({db, name, version1, version2}: {db: StructDatabase, name: TypeName, version1: string, version2: string}) {
  const asyncFn = React.useCallback(async () => {
    const v1 = await db.parseVersion(version1);
    const v2 = await db.parseVersion(version2);
    if (!v1) throw new Error(`No such version: '${version1}'`);
    if (!v2) throw new Error(`No such version: '${version2}'`);

    const struct1 = await db.getStructIfExists(name, v1);
    const struct2 = await db.getStructIfExists(name, v2);
    if (!struct1) throw new Error(`Struct '${name}' does not exist in version '${version1}'`);
    if (!struct2) throw new Error(`Struct '${name}' does not exist in version '${version2}'`);

    return [struct1, struct2];
  }, [db, name, version1, version2]);

  return <Async asyncFn={asyncFn}>
    <Async.Pending><h1>Loading structs...</h1></Async.Pending>
    <Async.Fulfilled>{({value: [s1, s2]}) => <DiffViewerPageImpl struct1={s1} struct2={s2}/>}</Async.Fulfilled>
    <Async.Rejected>{(err) => <Err>{err.message}</Err>}</Async.Rejected>
  </Async>;
}

export function StructViewerPageImpl({struct}: {struct: Struct}) {
  const displayStruct = React.useMemo(() => toDisplayStruct(struct), [struct]);

  const table = structCells(displayStruct);
  return <FlipMove typeName='div' className={clsx('struct-view', 'use-table')} enterAnimation="fade" leaveAnimation="fade" duration={100} >
    {table.map((elems) => <div key={elems[1]!.key} className='row'>{elems}</div>)}
  </FlipMove>;
}

export function DiffViewerPageImpl({struct1, struct2}: {struct1: Struct, struct2: Struct}) {
  const [display1, display2] = React.useMemo(() => diffToDisplayStructs(struct1, struct2), [struct1, struct2]);

  const table1 = applyGridStyles(structCells(display1), {startColumn: 1});
  const table2 = applyGridStyles(structCells(display2), {startColumn: 1 + COLUMN_CLASSES.length});

  return <div className={clsx('struct-view', 'use-grid')}>
    {[
      ...table1.flat().map((elem) => mergeHtmlProps(elem, {'data-side': 'left'})).map((elem) => wrapWithPrefixedKey(elem, 'left-')),
      ...table2.flat().map((elem) => mergeHtmlProps(elem, {'data-side': 'right'})).map((elem) => wrapWithPrefixedKey(elem, 'right-')),
    ]}
  </div>;
}

// =============================================================================

function defaultPathReader() {
  return (path: string) => fetch(`./re-data/${path}`).then((x) => x.text());
}

function useDb(getReader: () => PathReader) {
  const db = React.useRef<StructDatabase | null>(null);
  if (!db.current) {
    db.current = new StructDatabase(getReader());
  }
  return db.current;
}

// =============================================================================

/** Format of a struct to be displayed. */
type DisplayStruct = {
  name: TypeName,
  rows: DisplayStructRow[],
  size: number,
};

type DisplayStructRow = {
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
    ...struct.rows.map((row) => structCellsForRowDispatch(struct, row)),
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

function structCellsForRowDispatch(struct: DisplayStruct, {key, data}: DisplayStructRow): (JSX.Element | null)[] {
  switch (data.type) {
    case 'spacer-for-diff': return [null, null];
    case 'field': return structCellsForRow({text: <FieldDef data={data}/>, key, struct, data, indent: true});
    case 'gap': return structCellsForRow({text: <FieldGap data={data}/>, key, struct, data, indent: true});
  }
}

function structCellsForHeaderRow(struct: DisplayStruct) {
  return [
    <div key={`o-#name`}></div>, // offset
    <div key={`t-#name`} className='col-text'>
      <div className='col-text-wrapper'>
        {StructKeyword} <span className='struct-name'>{struct.name}</span> {PackedKeyword} {OpenBrace}<br/>
      </div>
    </div>,
  ];
}

function structCellsForRow(args: {text: ReactNode, key: ReactKey, struct: DisplayStruct, data: {isChange: boolean, offset: number}, indent?: boolean}) {
  const {text, key, data, struct, indent = false} = args;
  return [
    <div key={`o-${key}`}>
      <FieldOffset offset={data.offset} size={struct.size}/>
    </div>,
    <div key={`t-${key}`} className={clsx({'indent': indent}, diffClass(data.isChange))}>
      <div className='col-text-wrapper'>
        {text}
      </div>
    </div>,
  ];
}

function structCellsForEndRow(struct: DisplayStruct) {
  const data = {isChange: false, offset: struct.size};
  return structCellsForRow({text: CloseBrace, struct, key: '#clbrace' as ReactKey, data});
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

function FieldOffset({offset, size}: {offset: number, size: number}) {
  // NOTE: Padding produces significantly better animations than e.g. 'text-align: right', because table rows
  //       disappearing from FlipMove lose their auto-computed column widths.
  const hex = offset.toString(16);
  const padding = ' '.repeat(size.toString(16).length - hex.length);
  return <span className='field-offset-text'>{padding}0x{hex}</span>;
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
