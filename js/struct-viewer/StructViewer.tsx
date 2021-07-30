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
  TypeDatabase, StructTypeDefinition, StructTypeMember, UnionTypeDefinition, UnionTypeMember, TypeName, FieldName,
  PathReader, Version, VersionLevel, TypeTree, TypeDefinition,
} from './database';
import {diffStructs} from './diff';
import {Navigation, useNavigationPropsFromUrl} from './Navigation';
import * as Rust from './render-type/Rust';
import {CommonLangToolsProps} from './render-type/Common';

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
          {defn ? <StructViewerPageImpl name={persistedName} defn={defn}/>
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

export function StructViewerPageImpl({name, defn}: {name: TypeName, defn: TypeDefinition}) {
  const displayStruct = React.useMemo(() => toDisplayType(name, defn), [defn]);

  const table = getTypeCells(displayStruct);
  return <FlipMove typeName='div' className={clsx('struct-view', 'use-table')} enterAnimation="fade" leaveAnimation="fade" duration={100} >
    {table.map((elems) => <div key={elems[1]!.key} className='row'>{elems}</div>)}
  </FlipMove>;
}

export function DiffViewerPageImpl({name, struct1, struct2}: {name: TypeName, struct1: StructTypeDefinition, struct2: StructTypeDefinition}) {
  const [display1, display2] = React.useMemo(() => diffToDisplayStructs(name, struct1, struct2), [struct1, struct2]);

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
// Row-generation pass
//
// This pass implements a lot of language-independent rendering logic, like collecting
// lines for all of the fields that will be displayed, identifying which lines are
// interactive/expandable, and computing their associated struct offsets.

/** Format of the main struct/union/enum to be displayed in the type viewer. */
export type DisplayType = DisplayTypeRow[];

/**
 * Represents a single line of text (if shown) inside a single struct in the struct viewer.
 * E.g. a struct member, a closing brace, etc.
 *
 * Different kinds of lines contain different kinds of information.  The data is in a
 * language-independent format that can be rendered into various syntaxes.
*/
export type DisplayTypeRow = {
  key: ReactKey;
  /**
   * Value to display in the offset column. (left gutter)
   * Null means to not display any offset. (e.g. enums)
   */
  offset: number | null;
  nestingLevel: number;  // indentation level
  data: DisplayTypeRowData;
};

export type DisplayTypeRowData =
  | {
    is: 'field'
    name: FieldName;
    type: TypeTree;
  } | {
    is: 'gap';
    size: number;
  } | {
    /** Line with the opening brace for the outermost struct on the page. */
    is: 'begin-page-type';
    typeName: TypeName;
    type: TypeDefinition; // for grabbing things like '.packed'
  } | {
    /** Line with the opening brace for an inner anonymous struct/union. */
    is: 'begin-anon-type';
    fieldName: FieldName;
    kind: 'struct' | 'union' | 'enum';
  } | {
    is: 'end-type';
    /** The opening row that is closed by this.  Might be needed by a C declaration renderer to
     *  put a field name for an anonymous type, or may be used to write ending array dimensions for
     *  an array of structs.  Who knows. */
    _beginning: DisplayTypeRow & {data: {is: 'begin-page-type' | 'begin-anon-type'}};
  }
  ;

type DiffClass = string | undefined;
function diffClass(isChanged: boolean): DiffClass {
  return isChanged ? 'diff-oneside' : undefined;
}

type ReactKey = string & { readonly __tag: unique symbol };

// React keys used for the beginning and end lines of a struct.
const TYPE_BEGIN_KEY = "@{" as ReactKey;
const TYPE_END_KEY = "@}" as ReactKey;

function toDisplayType(
  typeName: TypeName,
  defn: TypeDefinition,
): DisplayTypeRow[] {
  const recurseProps = {
    startOffset: 0,
    nestingLevel: 1,
    keyPrefix: "",
  };

  if (defn.is === 'struct' || defn.is === 'union') {
    const begin = {
      key: TYPE_BEGIN_KEY,
      offset: null,  // suppress the initial 0x0
      nestingLevel: 0,
      data: {is: 'begin-page-type', typeName, type: defn} as const,
    } as const;
    const end = {
      key: TYPE_END_KEY,
      offset: defn.size,
      nestingLevel: 0,
      data: {is: 'end-type', _beginning: begin} as const,
    } as const;

    if (defn.is === 'struct') {
      return [begin, ...getDisplayRowsForStructMembers(defn.members, recurseProps), end];
    } else if (defn.is === 'union') {
      return [begin, ...getDisplayRowsForUnionMembers(defn.members, recurseProps), end];
    } else unreachable(defn);

  } else if (defn.is === 'enum') {
    TODO();
    throw new Error("TODO");

  } else if (defn.is === 'typedef') {
    TODO();
    throw new Error("TODO");

  } else unreachable(defn);
}

/** Additional context during row generation pass that is mainly used
 *  to implement recursive calls for inner types. */
type RecurseProps = {
  // a number to be added to all member offsets (essentially, the offset of the containing struct)
  startOffset: number;
  // how many structs deep we are. (mainly used to determine indentation)
  nestingLevel: number;
  // because we ultimately may generate a flat table or grid, members of inner structs need to have their keys prefixed
  keyPrefix: string;
};

function getDisplayRowsForStructMembers(members: StructTypeMember[], recurseProps: RecurseProps): DisplayTypeRow[] {
  const {startOffset, nestingLevel, keyPrefix} = recurseProps;

  const assignDiscriminator = makeDisambiguator();
  // @ts-ignore bug; TS ignores the ': DisplayStructRowData' annotations and assigns overly specific types...
  return [...window2(members)].flatMap(([row, nextRow]) => {
    const offset = row.offset + startOffset;
    if (row.classification === 'field') {
      return getDisplayRowsForTypedMember(row, assignDiscriminator, recurseProps);

    } else if (row.classification === 'gap') {
      const size = nextRow.offset - row.offset;
      const key = `${keyPrefix}gap-${row.offset}` as ReactKey;
      return [{key, nestingLevel, data: {
        is: 'gap', offset, size,
      }}];

    } else if (row.classification === 'padding') {
      return [];

    } else if (row.classification === 'end') {
      return [];  // the opening and closing rows are the caller's responsibility

    } else {
      unreachable(row);
    }
  })
}

function getDisplayRowsForUnionMembers(members: UnionTypeMember[], recurseProps: RecurseProps): DisplayTypeRow[] {
  const assignDiscriminator = makeDisambiguator();
  return members.flatMap((member) => {
    return getDisplayRowsForTypedMember({...member, offset: 0}, assignDiscriminator, recurseProps);
  })
}


/**
 * Shared logic between both structs and unions for displaying a single "true" member. (i.e. one that isn't a gap)
 *
 * (this field could itself be a struct/union/enum type that gets expanded into multiple rows...)
 */
function getDisplayRowsForTypedMember(
    member: {offset: number, name: string, type: TypeTree},
    // the field disambiguator that is scoped to the immediate struct/union with this member
    assignDiscriminator: (x: unknown) => number,
    recurseProps: RecurseProps,
): DisplayTypeRow[] {
  const {name, type} = member;
  const {startOffset, nestingLevel, keyPrefix} = recurseProps;
  const offset = member.offset + startOffset;

  if (type.is === 'struct' || type.is === 'union' || type.is === 'enum') {
    const innerKeyPrefix = `${keyPrefix}f-${member.name}-${assignDiscriminator(member.name)}#`;
    const innerRecurseProps = {
      startOffset: offset,  // inner type begins where this field begins...
      nestingLevel: nestingLevel + 1,
      keyPrefix: innerKeyPrefix,
    };
    // The opening and closing rows for this type
    const begin = {
      nestingLevel,
      offset,  // do show offset for opening line since the type is also a field itself
      key: `${innerKeyPrefix}${TYPE_BEGIN_KEY}` as ReactKey,
      data: {is: "begin-anon-type", type, fieldName: name as FieldName, kind: type.is} as const,
    };
    const end = {
      nestingLevel,
      offset: offset + type.size,
      key: `${innerKeyPrefix}${TYPE_END_KEY}` as ReactKey,
      data: {is: "end-type", _beginning: begin} as const,
    };

    if (type.is === 'struct') {
      return [begin, ...getDisplayRowsForStructMembers(type.members, innerRecurseProps), end];
    } else if (type.is === 'union') {
      return [begin, ...getDisplayRowsForUnionMembers(type.members, innerRecurseProps), end];
    } else if (type.is === 'enum') {
      // FIXME
      throw new Error('anonymous enum not yet supported');
    } else {
      unreachable(type);
    }

  } else {
    const key = `f-${name}-${assignDiscriminator(name)}` as ReactKey;
    const data: DisplayTypeRowData = {
      is: 'field', type, name: name as FieldName,
    };
    return [{key, nestingLevel, offset, data}];
  }
}

function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  return as.map((a, index) => [a, bs[index]]);
}

function diffToDisplayStructs(name: TypeName, structA: StructTypeDefinition, structB: StructTypeDefinition): [DisplayType, DisplayType] {
  // The addition of embedded types did not play well with the _originalObject fields that the original
  // implementation relied on.  It will be necessary to revisit the question of how a diff could be
  // performed in a way that can be converted into meaningful styling in the diff display.
  throw new Error('diffToDisplayStructs is pending re-implementation');

  // const structs = [structA, structB];
  // const displayStructs = [toDisplayStruct(name, structA), toDisplayStruct(name, structB)];
  // const gapCounters = [0, 0];

  // // we need to build new lists of rows so we can insert spacers for things only on one side
  // const results: DisplayStruct[] = displayStructs.map((displayStruct) => ({...displayStruct, rows: []}));

  // // The diffing is defined on the "source of truth" types rather than our display types,
  // // so we need some mapping between them.
  // type RowMap = Map<StructTypeMember, DisplayStructRow>;
  // const rowMaps: RowMap[] = displayStructs.map((displayStruct) => {
  //   return new Map(displayStruct.rows.map((row) => {
  //     if (!('_originatingObject' in row.data)) {
  //       throw Error("unexpected 'extra' row in initial DisplayStruct during diff render");
  //     }
  //     return [row.data._originatingObject, row];
  //   }));
  // });

  // // we currently have two DisplayStructs with empty diff information.  Update them in-place.
  // for (const diff of diffStructs(structA, structB)) {
  //   const displayRowA = rowMaps[0].get((diff as any).left);
  //   const displayRowB = rowMaps[1].get((diff as any).right);

  //   if (diff.side === 'both') {
  //     const {left: rowA, right: rowB} = diff;

  //     // depending on row type, add more diff spans inside the content
  //     if (rowA.data.is === 'field' && rowB.data.is === 'field') {
  //       if (!deepEqual(rowA.data.type, rowB.data.type)) {
  //         (displayRowA!.data as DisplayRowFieldData).type.isChange = true;
  //         (displayRowB!.data as DisplayRowFieldData).type.isChange = true;
  //       }

  //     } else if (rowA.data.is === 'gap' && rowB.data.is === 'gap') {
  //       if (!primitiveEqual(rowA.size, rowB.size)) {
  //         (displayRowA!.data as DisplayRowGapData).sizeIsChange = true;
  //         (displayRowB!.data as DisplayRowGapData).sizeIsChange = true;
  //       }

  //     } else {
  //       throw new Error(`impossible diff couple between ${rowA.data.is} and ${rowB.data.is}`)
  //     }
  //     results[0].rows.push(displayRowA!);
  //     results[1].rows.push(displayRowB!);

  //   } else {
  //     let indexWith;
  //     if (diff.side === 'left') indexWith = 0;
  //     else if (diff.side === 'right') indexWith = 1;
  //     else unreachable(diff);

  //     // Side with the line
  //     const displayRow: DisplayStructRow = [displayRowA, displayRowB][indexWith]!;
  //     if (displayRow.data.is === 'spacer-for-diff') {
  //       throw new Error('impossible: a spacer already exists!');
  //     }
  //     displayRow.data.isChange = true;
  //     results[indexWith].rows.push(displayRow);

  //     // Gap on the other side
  //     results[1 - indexWith].rows.push({
  //       key: `xx-${gapCounters[1 - indexWith]++}` as ReactKey,
  //       data: {is: 'spacer-for-diff'},
  //     })
  //   }
  // }
  // return [results[0], results[1]];
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
function getTypeCells(rows: DisplayTypeRow[]): JSX.Element[][] {
  const maxOffset = rows.reduce((acc, {offset}) => Math.max(acc, offset || 0), 0);

  return rows.map((row) => {
    const {key, offset, nestingLevel, data} = row;
    const offsetCell = <div key={`o-${key}`} className={CLASS_COL_OFFSET}>
      {offset != null ? <FieldOffset offset={offset} size={maxOffset}/> : null}
    </div>;
    const textCell = <div key={`t-${key}`} className={CLASS_COL_TEXT}>
      {/* this flex wrapper helps ensure that the hanging indent increases with inner structs */}
      <div className='col-text-flex'>
        <div className='indent'>{'\u00a0\u00a0'.repeat(nestingLevel)}</div>
        <div className='col-text-wrapper'>{
          <LangRenderRow row={data} Lang={Rust}/>
        }</div>
      </div>
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

function LangRenderRow({row, Lang}: {row: DisplayTypeRowData, Lang: LangRenderer}) {
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

  return <Lang.TypeRow {...{db, version, getTypeUrl}} row={row}/>;
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
