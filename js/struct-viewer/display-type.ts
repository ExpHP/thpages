import {unreachable, window2} from '~/js/util';

import {diffStructs} from './diff';
import {
  TypeCollection, TypeTree, TypeDefinition, TypeName, FieldName,
  StructTypeDefinition, StructTypeMember,
  UnionTypeDefinition, UnionTypeMember,
  EnumTypeDefinition, EnumTypeValue,
  BitfieldsTypeDefinition, BitfieldsTypeMember,
} from './database';

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
  offset: Offset | null;
  nestingLevel: number;  // indentation level
  expandableKey?: ExpandableKey;
  data: DisplayTypeRowData;
};

export type Offset = {
  byte: number;
  /** Semi-inclusive bit range occupied by a bitfield. */
  bits?: [number, number];
};

/** Uniquely (within a DisplayType) identifies a line that can be expanded by the user into multiple lines.
 */
export type ExpandableKey = string & { readonly __tag: unique symbol; };

export type DisplayTypeRowData =
  | {
    is: 'field'
    name: FieldName;
    type: TypeTree;
  } | {
    is: 'gap';
    size: number;
  } | {
    is: 'enum-value'
    name: FieldName;
    value: number;
  } | {
    is: 'bitfield'
    name: FieldName;
    length: number;
    signed: boolean;
  } | {
    is: 'bitfield-gap'
    unused: boolean;
    length: number;
  } | {
    /** Line with the opening brace for the outermost struct on the page. */
    is: 'begin-page-type';
    typeName: TypeName;
    type: TypeDefinition; // for grabbing things like '.packed'
  } | {
    /** Line with the opening brace for an inner struct/union that is either anonymous, or expanded by the user. */
    is: 'begin-inner-type';
    fieldName: FieldName;
    typeName?: TypeName;
    kind: 'struct' | 'union' | 'enum';
  } | {
    /** Unexpanded middle portion of an expanded array. */
    is: 'expanded-array-ellipsis';
  } | {
    is: 'end-type';
    /** The opening row that is closed by this.  Might be needed by a C declaration renderer to
     *  put a field name for an anonymous type. Who knows. */
    _beginning: DisplayTypeRow & {data: {is: 'begin-page-type' | 'begin-inner-type'}};
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

/** Bag of common arguments to functions in this module which never need to change. */
type Context = {
  expandedItems: Set<ExpandableKey>;
  typeCollection: TypeCollection;
};

export function toDisplayType(
  typeName: TypeName,
  defn: TypeDefinition,
  expandedItems: Set<ExpandableKey>,
  typeCollection: TypeCollection,
): DisplayTypeRow[] {
  const context = {expandedItems, typeCollection};
  const recurseProps = {
    startOffset: 0,
    nestingLevel: 1,
    keyPrefix: "",
  };

  const begin = {
    key: TYPE_BEGIN_KEY,
    offset: null,  // suppress the initial 0x0
    nestingLevel: 0,
    data: {is: 'begin-page-type', typeName, type: defn} as const,
  } as const;
  const end = {
    key: TYPE_END_KEY,
    offset: {byte: defn.size},
    nestingLevel: 0,
    data: {is: 'end-type', _beginning: begin} as const,
  } as const;

  if (defn.is === 'struct' || defn.is === 'union') {
    if (defn.is === 'struct') {
      return [begin, ...getDisplayRowsForStructMembers(defn.members, recurseProps, context), end];
    } else if (defn.is === 'union') {
      return [begin, ...getDisplayRowsForUnionMembers(defn.members, recurseProps, context), end];
    } else unreachable(defn);

  } else if (defn.is === 'enum') {
    return [begin, ...getDisplayRowsForEnumValues(defn.values, recurseProps), end];

  } else if (defn.is === 'bitfields') {
    return [begin, ...getDisplayRowsForBitfieldsMembers(defn, recurseProps), end];

  } else if (defn.is === 'typedef') {
    return [begin, end];

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

function getDisplayRowsForStructMembers(members: StructTypeMember[], recurseProps: RecurseProps, context: Context): DisplayTypeRow[] {
  const {startOffset, nestingLevel, keyPrefix} = recurseProps;

  const assignDiscriminator = makeDisambiguator();
  // @ts-ignore bug; TS ignores the ': DisplayStructRowData' annotations and assigns overly specific types...
  return [...window2(members)].flatMap(([row, nextRow]) => {
    const offset = row.offset + startOffset;
    if (row.classification === 'field') {
      return getDisplayRowsForTypedMember(row, assignDiscriminator, recurseProps, context);

    } else if (row.classification === 'gap') {
      const size = nextRow.offset - row.offset;
      const key = `${keyPrefix}gap-${row.offset}` as ReactKey;
      return [{key, nestingLevel, data: {
        is: 'gap', offset: {byte: offset}, size,
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

function getDisplayRowsForUnionMembers(members: UnionTypeMember[], recurseProps: RecurseProps, context: Context): DisplayTypeRow[] {
  const assignDiscriminator = makeDisambiguator();
  return members.flatMap((member) => {
    return getDisplayRowsForTypedMember({...member, offset: 0}, assignDiscriminator, recurseProps, context);
  })
}

/**
 * Shared logic between both structs and unions for displaying a single "true" member. (i.e. one that isn't a gap)
 *
 * (this field could itself be a struct/union/enum type that gets expanded into multiple rows...)
 */
function getDisplayRowsForTypedMember(
    member: {offset: number, name: FieldName, type: TypeTree},
    // the field disambiguator that is scoped to the immediate struct/union with this member
    assignDiscriminator: (x: string) => number,
    recurseProps: RecurseProps,
    context: Context,
): DisplayTypeRow[] {
  const {name, type} = member;
  const {startOffset, nestingLevel, keyPrefix} = recurseProps;
  const offset = member.offset + startOffset;

  // Check for a user-expandable "inner definition" (struct/union/enum).
  // (These lines are interesting because the first line needs to change from ';' to ' {' when they're expanded)
  const expandableDefn = getExpandableDefn(type, context);

  // Other reasons a line might be expandable.
  const asExpandableArray = (type.is === 'array' && type.len > 0) ? type : null;
  const asExpandablePointer = (type.is === 'ptr') ? type : null;

  // the field may be one or more lines, but these properties will always be true about the first line.
  const ownKey = `${keyPrefix}f-${name}-${assignDiscriminator(name)}` as ReactKey;
  const expandableKey = ownKey as string as ExpandableKey;
  const ownLineProps = {
    nestingLevel,
    expandableKey: (expandableDefn || asExpandableArray || asExpandablePointer) ? expandableKey : undefined,
    offset: {byte: offset},
    key: ownKey,
  };

  const innerKeyPrefix = `${ownKey}#`;
  const commonInnerRecurseProps = {
    nestingLevel: nestingLevel + 1,
    keyPrefix: innerKeyPrefix,
  };

  // Helper to generate rows for a "inner definition" (struct/union/enum) regardless of whether it is anonymous.
  function generateExpandedDefnRows(defn: ExpandedType) {
    const innerRecurseProps = {...commonInnerRecurseProps, startOffset: offset};  // inner type begins where this field begins...

    // The opening and closing rows for this type
    const begin = {
      ...ownLineProps,
      data: {is: "begin-inner-type", type, fieldName: name as FieldName, kind: defn.is, typeName: defn.typeName} as const,
    };
    const end = {
      nestingLevel,
      offset: {byte: offset + defn.size},
      key: `${innerKeyPrefix}${TYPE_END_KEY}` as ReactKey,
      data: {is: "end-type", _beginning: begin} as const,
    };

    if (defn.is === 'struct') {
      return [begin, ...getDisplayRowsForStructMembers(defn.members, innerRecurseProps, context), end];
    } else if (defn.is === 'union') {
      return [begin, ...getDisplayRowsForUnionMembers(defn.members, innerRecurseProps, context), end];
    } else if (defn.is === 'enum') {
      return [begin, ...getDisplayRowsForEnumValues(defn.values, innerRecurseProps), end];
    } else {
      unreachable(defn);
    }
  }

  // Now check if there's going to be an expanded inner definition
  if (expandableDefn && context.expandedItems.has(expandableKey)) {
    return generateExpandedDefnRows(expandableDefn);

  } else if (type.is === 'struct' || type.is === 'union' || type.is === 'enum') {
    return generateExpandedDefnRows(type);

  } else {
    // No expanded inner definition.  Produce a standard row for the field.
    const ownRow = {...ownLineProps, data: {
      is: 'field' as const, type, name: name as FieldName,
    }};

    // Now check for the other expandable things which don't influence the field's own row.
    let extraRows: DisplayTypeRow[] = [];
    if (context.expandedItems.has(expandableKey)) {
      if (asExpandableArray) {
        const innerRecurseProps = {...commonInnerRecurseProps, startOffset: offset};
        extraRows = getDisplayRowsForExpandedArray(asExpandableArray, innerRecurseProps, context);

      } else if (asExpandablePointer) {
        const innerRecurseProps = {...commonInnerRecurseProps, startOffset: 0};
        extraRows = getDisplayRowsForExpandedPointer(asExpandablePointer, innerRecurseProps, context);

      }
    }
    return [ownRow, ...extraRows];
  }
}

/** If this type is user-expandable, get the definition that should be used to generate the inner rows when expanded. */
type ExpandedType = TypeDefinition & {is: 'struct' | 'union' | 'enum', typeName?: TypeName};
function getExpandableDefn(type: TypeTree, context: Context): ExpandedType | null {
  if (type.is !== 'named') return null;

  const defn = context.typeCollection.getNamedType(type.name);
  if (!defn) return null;
  if (defn.is === 'typedef') return null;

  return {...defn, typeName: type.name};
}

/**
 * Shared logic between both structs and unions for displaying a single "true" member. (i.e. one that isn't a gap)
 *
 * (this field could itself be a struct/union/enum type that gets expanded into multiple rows...)
 */
function getDisplayRowsForEnumValues(
  values: EnumTypeValue[],
  recurseProps: RecurseProps,
): DisplayTypeRow[] {
  const assignDiscriminator = makeDisambiguator();
  const {nestingLevel, keyPrefix} = recurseProps;
  const offset = null;  // don't display offsets on enum values
  return values.map(({name, value}) => {
    const key = `${keyPrefix}v-${name}-${assignDiscriminator(name)}` as ReactKey;
    return {key, nestingLevel, offset, data: {
      is: 'enum-value', name, value,
    }};
  });
}

function getDisplayRowsForExpandedArray(
  type: TypeTree & {is: 'array'},
  recurseProps: RecurseProps,
  context: Context,
): DisplayTypeRow[] {
  const {startOffset, keyPrefix, nestingLevel} = recurseProps;
  const itemSize = context.typeCollection.getLayout(type.inner).size;

  const makeFieldForElement = (index: number) => {
    const member = {
      offset: startOffset + index * itemSize,
      name: `_${index}` as FieldName,
      type: type.inner,
    };
    const assignDiscriminator = () => 0; // these generated field names will already be unique...
    return getDisplayRowsForTypedMember(member, assignDiscriminator, recurseProps, context);
  };

  const defaultLeadingRows = 2;
  const defaultTrailingRows = 2;
  const maxRowsToShow = defaultLeadingRows + defaultTrailingRows + 1;
  const {numLeadingRows, numTrailingRows, hasEllipsis} = (
    type.len <= maxRowsToShow
      ? {numLeadingRows: type.len, numTrailingRows: 0, hasEllipsis: false}
      : {numLeadingRows: defaultLeadingRows, numTrailingRows: defaultTrailingRows, hasEllipsis: true}
  );

  let rows = [];
  for (let i = 0; i < numLeadingRows; i++) {
    rows.push(...makeFieldForElement(i));
  }
  if (hasEllipsis) {
    rows.push({
      key: `${keyPrefix}_${numLeadingRows}` as ReactKey,
      offset: {byte: startOffset + numLeadingRows * itemSize},
      nestingLevel,
      data: {is: 'expanded-array-ellipsis' as const},
    });
  }
  for (let i = type.len - numTrailingRows; i < type.len; i++) {
    rows.push(...makeFieldForElement(i));
  }

  return rows;
}

function getDisplayRowsForExpandedPointer(
  type: TypeTree & {is: 'ptr'},
  recurseProps: RecurseProps,
  context: Context,
): DisplayTypeRow[] {
  // just print as the body of a struct with one field
  const member = {offset: 0, name: `_` as FieldName, type: type.inner};
  const assignDiscriminator = () => 0;  // collisions are impossible with only one field...
  return getDisplayRowsForTypedMember(member, assignDiscriminator, recurseProps, context);
}

function getDisplayRowsForBitfieldsMembers(defn: BitfieldsTypeDefinition, recurseProps: RecurseProps): DisplayTypeRow[] {
  const {startOffset, nestingLevel, keyPrefix} = recurseProps;

  const assignDiscriminator = makeDisambiguator();
  return [...window2(defn.members)].flatMap(([row, nextRow]) => {
    // For the byte part of the offset, choose the closest multiple of alignment without going over.
    const singleByteOffset = startOffset + Math.floor(row.start / 8);
    const byteOffset = singleByteOffset - singleByteOffset % defn.align;
    // The bit index in row.start was relative to startOffset.
    // The offset increased, so the bit index decreases.
    const actualStart = row.start - 8 * (byteOffset - startOffset);
    const length = nextRow.start - row.start;
    const offset: Offset = {
      byte: byteOffset,
      bits: [actualStart, actualStart + length],
    };

    if (row.classification === 'field') {
      const {name, signed} = row;
      const key = `${keyPrefix}f-${name}-${assignDiscriminator(name)}` as ReactKey;

      const outRow: DisplayTypeRow = {key, nestingLevel, offset, data: {
        is: 'bitfield', name, signed, length,
      }};
      return [outRow];

    } else if (row.classification === 'gap') {
      // key uses row.start instead of actualStart because actualStart is not unique
      const key = `${keyPrefix}g-${row.start}` as ReactKey;
      const outRow: DisplayTypeRow = {key, nestingLevel, offset, data: {
        is: 'bitfield-gap', length, unused: row.unused,
      }};
      return [outRow];

    } else if (row.classification === 'end') {
      return [];  // the opening and closing rows are the caller's responsibility

    } else {
      unreachable(row);
    }
  })
}

/**
 * `===` but type-checked to forbid types that have reference equality. (for use in places
 * where you fear a refactoring may eventually change the types to objects) */
 function primitiveEqual<T extends number | string | null | undefined | boolean>(a: T, b: T) {
  return a === b;
}

export function diffToDisplayTypes(name: TypeName, structA: TypeDefinition, structB: TypeDefinition): [DisplayType, DisplayType] {
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
