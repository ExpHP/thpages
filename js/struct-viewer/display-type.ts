import {unreachable, window2} from '~/js/util';

import {diffStructs} from './diff';
import {
  TypeTree, TypeDefinition, TypeName, FieldName,
  StructTypeDefinition, StructTypeMember,
  UnionTypeDefinition, UnionTypeMember,
  EnumTypeDefinition, EnumTypeValue,
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
    is: 'enum-value'
    name: FieldName;
    value: number;
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

export function toDisplayType(
  typeName: TypeName,
  defn: TypeDefinition,
): DisplayTypeRow[] {
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
    offset: defn.size,
    nestingLevel: 0,
    data: {is: 'end-type', _beginning: begin} as const,
  } as const;

  if (defn.is === 'struct' || defn.is === 'union') {
    if (defn.is === 'struct') {
      return [begin, ...getDisplayRowsForStructMembers(defn.members, recurseProps), end];
    } else if (defn.is === 'union') {
      return [begin, ...getDisplayRowsForUnionMembers(defn.members, recurseProps), end];
    } else unreachable(defn);

  } else if (defn.is === 'enum') {
    return [begin, ...getDisplayRowsForEnumValues(defn.values, recurseProps), end];

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
      return [begin, ...getDisplayRowsForEnumValues(type.values, innerRecurseProps), end];
    } else {
      unreachable(type);
    }

  } else {
    const key = `${keyPrefix}f-${name}-${assignDiscriminator(name)}` as ReactKey;
    const data: DisplayTypeRowData = {
      is: 'field', type, name: name as FieldName,
    };
    return [{key, nestingLevel, offset, data}];
  }
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
      is: 'enum-value', name: name as FieldName, value,
    }};
  });
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
