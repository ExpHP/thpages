import React from 'react';
import {Async} from 'react-async';
import FlipMove from 'react-flip-move';
import clsx from 'clsx';

import {useSearchParams} from '~/js/UrlTools';
import {Err} from '~/js/Error';
import {TrivialForwardRef} from '~/js/XUtil';
import groupBy from '~/js/util/group-by';

import {
  TypeDatabase, TypeName, TypeDefinition,
  PathReader, Version, TypeTree, TypeLookupFunction, TypeCollection,
} from './database';
import {Navigation, useNavigationPropsFromUrl} from './Navigation';
import * as Rust from './render-type/Rust';
import {DisplayTypeRow, DisplayTypeRowData, ExpandableKey, Offset, toDisplayType, diffToDisplayTypes} from './display-type';
import {CommonLangToolsProps} from './render-type/Common';

// =============================================================================

export function StructViewerPageFromUrl() {
  const db = useDb(defaultPathReader);
  const {typeName, version, setTypeName, setVersion} = useNavigationPropsFromUrl();

  return <StructViewerPage {...{db, version, setVersion}} name={typeName} setName={setTypeName} />;
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

    const typeCollection = await db.getTypeCollection(v1);

    // also return name so it can be persisted in the still-rendered struct when the version box is cleared
    return {defn, name, typeCollection};
  }, [db, name, version]);

  return <>
    <Navigation
      // FIXME should use validated version
      setTypeName={setName} setVersion={setVersion} typeName={name} version={version as Version} db={db}
      minLevel='primary'
    />
    <Async promiseFn={promiseFn}>
      <Async.Initial persist><h1>Loading structs...</h1></Async.Initial>
      <Async.Fulfilled persist>{({defn, typeCollection, name: persistedName}) => (
          defn ? <StructViewerPageImpl name={persistedName} defn={defn} typeCollection={typeCollection}/>
            : <div>Please select a struct and version.</div>
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

export function StructViewerPageImpl({name, defn, typeCollection}: {name: TypeName, defn: TypeDefinition, typeCollection: TypeCollection}) {
  const [expandedKeys, setExpandedKeys] = React.useState(new Set<ExpandableKey>());
  const displayType = React.useMemo(() => toDisplayType(name, defn, expandedKeys, typeCollection), [name, defn, expandedKeys, typeCollection]);
  const lookupType = React.useCallback(typeCollection.getNamedType.bind(typeCollection), [typeCollection]);

  const toggleExpansion = React.useCallback((key: ExpandableKey) => {
    setExpandedKeys((expandedKeys) => {
      const newKeys = new Set([...expandedKeys]);
      newKeys.delete(key) || newKeys.add(key);
      return newKeys;
    });
  }, [expandedKeys, setExpandedKeys]);
  const isExpanded = React.useCallback((key: ExpandableKey) => expandedKeys.has(key), [expandedKeys]);

  const table = getTypeCells(displayType, lookupType, isExpanded, toggleExpansion);
  return <FlipMove typeName='div' className={clsx('struct-view', 'use-table')} enterAnimation="fade" leaveAnimation="fade" duration={100} >
    {table.map((elems) => <div key={elems[1]!.key} className='row'>{elems}</div>)}
  </FlipMove>;
}

export function DiffViewerPageImpl({name, struct1, struct2}: {name: TypeName, struct1: TypeDefinition, struct2: TypeDefinition}) {
  const [display1, display2] = React.useMemo(() => diffToDisplayTypes(name, struct1, struct2), [struct1, struct2]);

  const table1 = applyGridStyles(getTypeCells(display1), {startColumn: 1});
  const table2 = applyGridStyles(getTypeCells(display2), {startColumn: 1 + COLUMN_CLASSES.length});

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

// =============================================================================
// Rendering pass

const CLASS_COL_OFFSET = 'col-offset';
const CLASS_COL_TEXT = 'col-text';
const COLUMN_CLASSES = [CLASS_COL_OFFSET, CLASS_COL_TEXT];

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
function getTypeCells(rows: DisplayTypeRow[], lookupType: TypeLookupFunction, isExpanded: (key: ExpandableKey) => boolean, toggleExpansion: React.Dispatch<ExpandableKey>): JSX.Element[][] {
  const gutterRows = [...getGutterTextLines(rows)];
  return rows.map((row, rowIndex) => {
    const {key, nestingLevel, expandableKey, data} = row;
    const offsetCell = <div key={`o-${key}`} className={CLASS_COL_OFFSET}>
      {gutterRows[rowIndex]}
    </div>;
    const onClick = expandableKey ? (() => toggleExpansion(expandableKey)) : undefined;
    const textCell = <div key={`t-${key}`} className={clsx(CLASS_COL_TEXT, expandableKey && {'expandable': expandableKey, 'expanded': isExpanded(expandableKey)})} onClick={onClick}>
      <div className='col-text-wrapper'>{
        <LangRenderRow row={data} Lang={Rust} lookupType={lookupType}/>
      }</div>
    </div>;
    return [offsetCell, textCell];
  });
}

// Util for adding HTML attributes to existing JSX.  Used mostly to help decouple
// the code that renders structs from the gritty details of how it will ultimately be laid out.
// (e.g. display="table", display="grid", are there multiple structs side-by-side, etc.)
type MergeableHtmlProps = {
  style?: React.CSSProperties;
  className?: string;
  [key: string]: any;
}
function mergeHtmlProps(elem: JSX.Element, props: MergeableHtmlProps) {
  if (props.style) props.style = {...elem.props.style, ...props.style};
  if (props.className) props.className = clsx(elem.props.className, props.className);
  return React.cloneElement(elem, props);
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

export interface LangRenderer {
  TypeRow: React.ComponentType<{row: DisplayTypeRowData} & CommonLangToolsProps>;
  InlineType: React.ComponentType<{type: TypeTree} & CommonLangToolsProps>;
}

function LangRenderRow({row, Lang, lookupType}: {row: DisplayTypeRowData, Lang: LangRenderer, lookupType: TypeLookupFunction}) {
  // FIXME: There's some duplicated logic between here and setTypeName.
  //        But we don't just want to use setTypeName in a callback because
  //        we want to be able to generate bona-fide <a> element hyperlinks.
  const searchParams = useSearchParams();
  const getTypeUrl = React.useCallback((name: TypeName) => {
    const searchParamsCopy = new URLSearchParams(searchParams);
    searchParamsCopy.set('t', name);
    return {pathname: '/struct', search: '?' + searchParamsCopy.toString()};
  }, [searchParams])

  return <Lang.TypeRow {...{lookupType, getTypeUrl}} row={row}/>;
}

function* getGutterTextLines(rows: DisplayTypeRow[]): Generator<JSX.Element> {
  // Byte offsets are padded to the max length across the entire type.
  const maxOffset = rows.reduce(((acc, {offset}) => Math.max(acc, offset ? offset.byte : 0)), 0);
  const bytePadLen = maxOffset.toString(16).length;

  // As for bit offsets, we will pad these on the right so that the minimum separation
  // between the offset and field within a given bitfields struct is always 2ch.
  //
  // e.g.
  //
  //  |            struct Thing {
  //  |0x76543210    struct Whatever {
  //  |  0x76543210    x : int;
  //  |  0x76543214    flags : struct {
  //  |    0x76543214[1:6]    y: i5;
  //  |    0x76543214[21:26]  z: i5;
  //  |  0x76543218    }
  //  |0x76543218    }
  //  |0x76543218  }
  //
  //  |            struct Thing {
  //  |0x76543210    struct Whatever {
  //  |  0x76543210    x : int;
  //  |  0x76543214    flags : struct {
  //  |    0x76543214[1:6]  y: i5;
  //  |    0x76543214[6:8]  z: i5;
  //  |  0x76543218    }
  //  |0x76543218    }
  //  |0x76543218  }

  // Identify groups of consecutive offsets with bits; these will all belong to the same bitfields struct.
  //
  // There may be some lines in-between which don't have an offset (e.g. comments); these will use
  // groupBy.any so that they don't impact the grouping.
  const groups = groupBy(rows, ({offset}) => (offset ? 'bits' in offset : groupBy.any));

  for (const group of groups) {
    if (group.key === groupBy.any) {
      // there is always at least one offset (the type's size) so this shouldn't happen
      throw Error('no offsets at all!?');
    }

    if (group.key === false) {
      // only a byte offset
      // the first nesting level pads the right; the rest pad the left.
      for (const {nestingLevel, offset} of group.values) {
        const padAfter = '  ' + ('  '.repeat(nestingLevel ? 1 : 0));
        const padBefore = '  '.repeat(nestingLevel ? nestingLevel - 1 : 0);
        if (offset) {
          yield (<>{padBefore}<FieldOffset byte={offset.byte} bytePadLen={bytePadLen}/>{padAfter}</>);
        } else {
          yield (<>{padBefore}{' '.repeat(bytePadLen + '0x'.length)}{padAfter}</>);
        }
      }

    } else {
      // offset has bits
      // determine the max length of the bits part
      const bitsPadLen = (
        group.values.filter(({offset}) => offset)
          .map(({offset}) => formatBits(offset!.bits!).length)
          .reduce((acc, b) => Math.max(acc, b), 0)
      );
      for (const {nestingLevel, offset} of group.values) {
        const padAfter = '  '.repeat(nestingLevel ? 1 : 0);
        const padBefore = '  '.repeat(nestingLevel ? nestingLevel - 1 : 0);
        if (offset) {
          const [byte, bits] = [offset.byte, offset.bits!];
          yield (<>{padBefore}<FieldOffsetWithBits {...{byte, bits, bytePadLen, bitsPadLen}}/>{padAfter}</>);
        } else {
          yield (<>{padBefore}{' '.repeat('0x'.length + bytePadLen + bitsPadLen)}{padAfter}</>);
        }
      }
    }
  }
}


function FieldOffset({byte, bytePadLen}: {byte: number, bytePadLen: number}) {
  const byteStr = formatOffsetByte({byte, bytePadLen});
  return <span className='field-offset-text'>{byteStr}</span>;
}

function FieldOffsetWithBits({byte, bits, bytePadLen, bitsPadLen}: {byte: number, bits: [number, number], bytePadLen: number, bitsPadLen: number}) {
  const byteStr = formatOffsetByte({byte, bytePadLen});
  const bitsStr = formatBits(bits);
  const padding = ' '.repeat(bitsPadLen - bitsStr.length);
  return <span className='field-offset-text'>{byteStr}{bitsStr}{padding}</span>;
}

function formatOffsetByte({byte, bytePadLen}: {byte: number, bytePadLen: number}) {
  const bytesHex = byte.toString(16);
  const leftPadding = ' '.repeat(bytePadLen - bytesHex.length);
  return `${leftPadding}0x${bytesHex}`;
}
function formatBits([start, end]: [number, number]) {
  return `[${start}:${end}]`;
}
