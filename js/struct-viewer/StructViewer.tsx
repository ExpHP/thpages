import React from 'react';
import type {ReactElement, ReactNode} from 'react';
import {Async} from 'react-async';
import FlipMove from 'react-flip-move';
import clsx from 'clsx';
import nearley from 'nearley';
import grammar from './parse-ctype.ne';

import {unreachable, deepEqual, window2} from '~/js/util';
import {useSearchParams} from '~/js/UrlTools';
import {Err} from '~/js/Error';
import {TrivialForwardRef} from '~/js/XUtil';

import {
  TypeDatabase, StructTypeDefinition, StructTypeMember, TypeName, FieldName,
  PathReader, Version, VersionLevel, TypeTree,
} from './database';
import {diffStructs} from './diff';
import {Navigation, useNavigationPropsFromUrl} from './Navigation';
import {RustType as FieldTypeImpl} from './render-type/Rust';

// =============================================================================

export function StructViewerPageFromUrl() {
  const db = useDb(defaultPathReader);
  const {typeName, version, setTypeName, setVersion} = useNavigationPropsFromUrl();

  return <DbContext.Provider value={db}>
    <StructViewerPage {...{db, version, setVersion}} name={typeName} setName={setTypeName} />
  </DbContext.Provider>
}

function StructViewerPage(props: {
  db: TypeDatabase,
  name: TypeName | null,
  version: string | null,
  setName: React.Dispatch<TypeName | null>,
  setVersion: React.Dispatch<Version | null>,
}) {
  const {db, name, version, setName, setVersion} = props;
  const promiseFn = React.useCallback(async () => {
    // Show placeholder text until everything is selected
    //
    // FIXME: Thanks to this early return, we're not actually persisting the struct as intended
    //        when a nav box is cleared...
    if (!version) return {defn: null, version: null};
    if (!name) return {defn: null, version: null};

    const v1 = await db.parseVersion(version);
    if (!v1) throw new Error(`No such version: '${version}'`);

    console.log(db);
    const defn = await db.getTypeIfExists(name, v1);
    if (!defn) throw new Error(`Struct '${name}' does not exist in version '${version}'`);

    // FIXME
    if (defn.is !== 'struct') throw new Error(`non-structs not yet supported in viewer`);

    // also return version so it can be persisted in the still-rendered struct when the version box is cleared
    return {defn, name, version};
  }, [db, name, version]);

  return <>
    <Navigation
      // FIXME should use validated version
      setTypeName={setName} setVersion={setVersion} typeName={name} version={version as Version} db={db}
      minLevel='primary'
    />
    <Async promiseFn={promiseFn}>
      <Async.Initial persist><h1>Loading structs...</h1></Async.Initial>
      <Async.Fulfilled persist>{({defn, version: persistedVersion, name: persistedName}) => (
        <VersionContext.Provider value={persistedVersion}>
          {defn ? <StructViewerPageImpl name={persistedName} struct={defn}/>
            : <div>Please select a struct and version.</div>}
        </VersionContext.Provider>
      )}</Async.Fulfilled>
      <Async.Rejected>{(err) => <Err>{err.message}</Err>}</Async.Rejected>
    </Async>
  </>;
}

export function DiffViewerPage({db, name, version1, version2}: {db: TypeDatabase, name: TypeName, version1: string, version2: string}) {
  const asyncFn = React.useCallback(async () => {
    const v1 = await db.parseVersion(version1);
    const v2 = await db.parseVersion(version2);
    if (!v1) throw new Error(`No such version: '${version1}'`);
    if (!v2) throw new Error(`No such version: '${version2}'`);

    const struct1 = await db.getTypeIfExists(name, v1);
    const struct2 = await db.getTypeIfExists(name, v2);
    if (!struct1) throw new Error(`Struct '${name}' does not exist in version '${version1}'`);
    if (!struct2) throw new Error(`Struct '${name}' does not exist in version '${version2}'`);
    // FIXME: support non-structs
    if (struct1.is !== 'struct') throw new Error(`'${name}' is not a struct in version '${version1}'`);
    if (struct2.is !== 'struct') throw new Error(`'${name}' is not a struct in version '${version2}'`);

    return [struct1, struct2];
  }, [db, name, version1, version2]);

  return <Async asyncFn={asyncFn}>
    <Async.Pending><h1>Loading structs...</h1></Async.Pending>
    <Async.Fulfilled>{({value: [s1, s2]}) => <DiffViewerPageImpl name={name} struct1={s1} struct2={s2}/>}</Async.Fulfilled>
    <Async.Rejected>{(err) => <Err>{err.message}</Err>}</Async.Rejected>
  </Async>;
}

export function StructViewerPageImpl({name, struct}: {name: TypeName, struct: StructTypeDefinition}) {
  const displayStruct = React.useMemo(() => toDisplayStruct(name, struct), [struct]);

  const table = structCells(displayStruct);
  return <FlipMove typeName='div' className={clsx('struct-view', 'use-table')} enterAnimation="fade" leaveAnimation="fade" duration={100} >
    {table.map((elems) => <div key={elems[1]!.key} className='row'>{elems}</div>)}
  </FlipMove>;
}

export function DiffViewerPageImpl({name, struct1, struct2}: {name: TypeName, struct1: StructTypeDefinition, struct2: StructTypeDefinition}) {
  const [display1, display2] = React.useMemo(() => diffToDisplayStructs(name, struct1, struct2), [struct1, struct2]);

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

const VersionContext = React.createContext<Version | null>(null);
const DbContext = React.createContext<TypeDatabase>(null as any as TypeDatabase);

// =============================================================================

function defaultPathReader() {
  return (path: string) => fetch(`./re-data/${path}`).then((x) => x.text());
}

function useDb(getReader: () => PathReader) {
  const db = React.useRef<TypeDatabase | null>(null);
  if (!db.current) {
    db.current = new TypeDatabase(getReader());
  }
  return db.current;
}

// =============================================================================

/** Format of a struct to be displayed. */
type DisplayStruct = {
  name: TypeName;
  rows: DisplayStructRow[];
  size: number;
};

type DisplayStructRow = {
  key: ReactKey;
  data: DisplayStructRowData,
};

type DisplayStructRowData =
  | {is: 'gap'} & DisplayRowGapData
  | {is: 'field'} & DisplayRowFieldData
  | {is: 'spacer-for-diff'}
  ;

type DisplayRowFieldData = {
  offset: number;
  isChange: boolean;
  name: FieldName;
  type: DisplayFieldType;
  _originatingObject: StructTypeMember;
};

type DisplayRowGapData = {
  offset: number;
  isChange: boolean;
  size: number;
  sizeIsChange: boolean;
  _originatingObject: StructTypeMember;
};

type DisplayFieldType = {
  type: TypeTree;
  isChange: boolean;
};

type DiffClass = string | undefined;
function diffClass(isChanged: boolean): DiffClass {
  return isChanged ? 'diff-oneside' : undefined;
}

type ReactKey = string & { readonly __tag: unique symbol };

function toDisplayStruct(typeName: TypeName, struct: StructTypeDefinition): DisplayStruct {
  const assignDiscriminator = makeDisambiguator();
  return {
    name: typeName,
    size: struct.size,
    // @ts-ignore bug; TS ignores the ': DisplayStructRowData' annotations and assigns overly specific types...
    rows: [...window2(struct.members)].flatMap(([row, nextRow]) => {

      if (row.classification === 'field') {
        const name = row.name;
        const discriminator = assignDiscriminator(name);

        const key = `f-${name}-${discriminator}` as ReactKey;
        let type = {type: row.type, isChange: false};
        const data: DisplayStructRowData = {
          is: 'field', offset: row.offset, isChange: false, type, name: name as FieldName,
          _originatingObject: row,
        };
        return [{key, data}];

      } else if (row.classification === 'gap') {
        const size = nextRow.offset - row.offset;
        const key = `gap-${row.offset}` as ReactKey;
        const data: DisplayStructRowData = {
          is: 'gap', offset: row.offset, isChange: false, size, sizeIsChange: false,
          _originatingObject: row,
        };
        return [{key, data}];

      } else if (row.classification === 'padding' || row.classification === 'end') {
        return [];
      } else {
        unreachable(row);
      }
    }),
  };
}

const COLUMN_CLASSES = ['col-offset', 'col-text'];

function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  return as.map((a, index) => [a, bs[index]]);
}

function diffToDisplayStructs(name: TypeName, structA: StructTypeDefinition, structB: StructTypeDefinition): [DisplayStruct, DisplayStruct] {
  const structs = [structA, structB];
  const displayStructs = [toDisplayStruct(name, structA), toDisplayStruct(name, structB)];
  const gapCounters = [0, 0];

  // we need to build new lists of rows so we can insert spacers for things only on one side
  const results: DisplayStruct[] = displayStructs.map((displayStruct) => ({...displayStruct, rows: []}));

  // The diffing is defined on the "source of truth" types rather than our display types,
  // so we need some mapping between them.
  type RowMap = Map<StructTypeMember, DisplayStructRow>;
  const rowMaps: RowMap[] = displayStructs.map((displayStruct) => {
    return new Map(displayStruct.rows.map((row) => {
      if (!('_originatingObject' in row.data)) {
        throw Error("unexpected 'extra' row in initial DisplayStruct during diff render");
      }
      return [row.data._originatingObject, row];
    }));
  });

  // we currently have two DisplayStructs with empty diff information.  Update them in-place.
  for (const diff of diffStructs(structA, structB)) {
    const displayRowA = rowMaps[0].get((diff as any).left);
    const displayRowB = rowMaps[1].get((diff as any).right);

    if (diff.side === 'both') {
      const {left: rowA, right: rowB} = diff;

      // depending on row type, add more diff spans inside the content
      if (rowA.data.is === 'field' && rowB.data.is === 'field') {
        if (!deepEqual(rowA.data.type, rowB.data.type)) {
          (displayRowA!.data as DisplayRowFieldData).type.isChange = true;
          (displayRowB!.data as DisplayRowFieldData).type.isChange = true;
        }

      } else if (rowA.data.is === 'gap' && rowB.data.is === 'gap') {
        if (!primitiveEqual(rowA.size, rowB.size)) {
          (displayRowA!.data as DisplayRowGapData).sizeIsChange = true;
          (displayRowB!.data as DisplayRowGapData).sizeIsChange = true;
        }

      } else {
        throw new Error(`impossible diff couple between ${rowA.data.is} and ${rowB.data.is}`)
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
      if (displayRow.data.is === 'spacer-for-diff') {
        throw new Error('impossible: a spacer already exists!');
      }
      displayRow.data.isChange = true;
      results[indexWith].rows.push(displayRow);

      // Gap on the other side
      results[1 - indexWith].rows.push({
        key: `xx-${gapCounters[1 - indexWith]++}` as ReactKey,
        data: {is: 'spacer-for-diff'},
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
  switch (data.is) {
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
    <FieldType type={data.type}/>
    {';'}
  </>;
}

function FieldType({type}: {type: DisplayFieldType}) {
  const db = React.useContext(DbContext);
  if (!db) throw new Error("FieldDef without db");

  const version = React.useContext(VersionContext);
  if (!version) throw new Error("FieldDef without version");

  // FIXME: There's some duplicated logic between here and setTypeName.
  //        But we don't just want to use setTypeName in a callback because
  //        we want to be able to generate bona-fide <a> element hyperlinks.
  const searchParams = useSearchParams();
  const getTypeUrl = React.useCallback((name: TypeName) => {
    const searchParamsCopy = new URLSearchParams(searchParams);
    searchParamsCopy.set('t', name);
    return {pathname: '/struct', search: '?' + searchParamsCopy.toString()};
  }, [searchParams])

  return <span className={clsx('field-type', diffClass(type.isChange))}>
    <FieldTypeImpl {...{db, version, getTypeUrl}} type={type.type}/>
  </span>;
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
