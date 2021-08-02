import * as JP from '~/js/jsonParse';
import {CURRENT_FORMAT_VERSION, DEFAULT_VERSION_LEVELS, Version, VersionLevel, TypeName, FieldName} from './index';

// This file contains "source of truth" types for the type database.
//
// These types have the least amount of redundant information contained within them,
// compared to the display types or the actual JSON data; this is intended to make
// them more suitable to live editing.

export type DbHeadJson = {
  levels: VersionLevel[];
  commonModules: Map<string, {}>;
  versions: Map<Version, VersionData>;
};

export type VersionData = {
  level: VersionLevel;
};

type Integer = number;
const parseInteger = JP.or(
  JP.int,
  JP.string.then((s: string) => {
    if (s.match(/^-?(?:0|[1-9][0-9]*|0[xX][0-9a-fA-F]+|0[bB][01]+)$/)) {
      const x = Number(s);  // ok because regex didn't allow octal
      if (!Number.isNaN(x)) return x;
    }
    throw new JP.UserJsonError();
  }),
  JP.fail("expected a (possibly string) integer"),
);

export type VersionProps = {
  pointerSize: Integer,
};
export const parseVersionProps = JP.object({
  'pointer-size': parseInteger,
}).then((obj) => ({
  pointerSize: obj['pointer-size'],
}));

export function parseDbHeadJson(text: string): DbHeadJson {
  const json: unknown = JSON.parse(text);

  const {version: formatVersion} = JP.object({version: JP.number}).parse(json);
  if (formatVersion !== CURRENT_FORMAT_VERSION) {
    console.warn(`unexpected db-head version: ${formatVersion}`)
  }

  const levels = DEFAULT_VERSION_LEVELS;

  const {versions: versionsArray, 'common-modules': modulesArray} = JP.object({
    "versions": JP.array(JP.object({
      version: JP.string.then((s) => s as Version),
      level: JP.string.then((level) => {
        if (!levels.includes(level as VersionLevel)) {
          console.error(`unknown level '${level}', defaulting to 'secondary'`);
          level = 'secondary';
        }
        return level as VersionLevel;
      }),
    })),
    "common-modules": JP.array(JP.object({name: JP.string})),
  }).parse(json);

  const output: DbHeadJson = {versions: new Map(), commonModules: new Map(), levels};
  for (const {version, level} of versionsArray) {
    if (output.versions.has(version)) {
      throw new Error(`duplicate version '${version}'`);
    }
    output.versions.set(version as Version, {level});
  }
  for (const {name} of modulesArray) {
    if (output.commonModules.has(name)) {
      throw new Error(`duplicate common module '${name}'`);
    }
    output.commonModules.set(name, {});
  }
  return output;
}

export type TypesJson = Map<TypeName, TypeDefinition>;
export const parseTypesJson = JP.lazy(() => JP.map((k) => k as TypeName, parseTypeDefinition));

export type TypeDefinition =
  | {is: "struct"} & StructTypeDefinition
  | {is: "union"} & UnionTypeDefinition
  | {is: "enum"} & EnumTypeDefinition
  | {is: "typedef"} & TypedefTypeDefinition
  | {is: "bitfields"} & BitfieldsTypeDefinition
  ;
const parseTypeDefinition = JP.lazy(() => JP.tagged<TypeDefinition>("is", {
  "struct": parseStructTypeDefinition.then((props) => ({is: "struct", ...props})),
  "union": parseUnionTypeDefinition.then((props) => ({is: "union", ...props})),
  "enum": parseEnumTypeDefinition.then((props) => ({is: "enum", ...props})),
  "typedef": parseTypedefTypeDefinition.then((props) => ({is: "typedef", ...props})),
  "bitfields": parseBitfieldsTypeDefinition.then((props) => ({is: "bitfields", ...props})),
}));

export type StructTypeDefinition = {
  size: Integer;
  align: Integer;
  packed: boolean; // default: false
  members: StructTypeMember[];
};
export type StructTypeMember = {
  offset: Integer;
} & (
  | {classification: 'field', name: FieldName, type: TypeTree}
  | {classification: 'gap'}
  | {classification: 'end'}
  | {classification: 'padding'}
);

const parseStructTypeDefinition = JP.lazy(() => JP.object({
  size: parseInteger,
  align: parseInteger,
  packed: JP.withDefault(false, JP.boolean),
  members: JP.array(JP.object({
    offset: parseInteger,
    name: JP.string.then((x) => x as FieldName),
    type: JP.or(JP.null_, parseTypeTree),
  })),
})).then((defn) => {
  // classify the fields and validate redundant information
  const members = defn.members.map((row, i) => {
    let {offset, name, type} = row;

    const expectedEnd = i === defn.members.length - 1;
    const isEnd = type === null && name === '__end';
    if (expectedEnd !== isEnd) {
      throw Error('incorrectly placed or missing __end field');
    }

    if (type) {
      return {offset, classification: "field", name, type} as const;
    } else {
      if (name === "__end") {
        if (offset !== defn.size) {
          throw Error (`size mismatch in struct (size: ${defn.size}, end: ${offset})`);
        }
        return {offset, classification: "end"} as const;
      } else if (name === "__padding") {
        return {offset, classification: "padding"} as const;
      } else {
        return {offset, classification: "gap"} as const;
      }
    }
  });
  return {...defn, members};
});

export type BitfieldsTypeDefinition = {
  size: Integer;
  /**
   * In bitfields, the viewer will also use this to control the display of when the offset changes.
   * E.g. for `align: 1` you can have a bitfield at `0x36[3:5]`, but for `align: 4` this would
   * instead display as `0x34[19:21]`.
   */
  align: Integer;
  members: BitfieldsTypeMember[];
};
export type BitfieldsTypeMember =  {
  start: Integer;
} & (
  | {classification: 'field', name: FieldName, signed: boolean}
  | {classification: 'gap', unused: boolean}
  | {classification: 'end'}
);

const parseBitfieldsTypeDefinition = JP.lazy(() => JP.object({
  size: parseInteger,
  align: parseInteger,
  members: JP.array(JP.object({
    start: parseInteger,
    signed: JP.boolean,
    name: JP.optional(JP.string.then((x) => x as FieldName)),
    length: parseInteger,
  })),
})).then((defn) => {
  // add dummy end member
  const effectiveMembers = [...defn.members, {start: defn.size * 8}];

  let prevEnd = 0;
  let outMembers: BitfieldsTypeMember[] = [];
  for (const row of effectiveMembers) {
    if (prevEnd < row.start) {
      throw Error('bitfields are overlapping or otherwise not sorted');
    }
    if (row.start > prevEnd) {
      outMembers.push({classification: 'gap', start: prevEnd, unused: false});
    }

    if (!("signed" in row)) {
      outMembers.push({classification: 'end', start: row.start});
    } else if (!row.name) {
      outMembers.push({classification: 'gap', start: row.start, unused: true});
    } else {
      const {signed, name, length} = row;
      outMembers.push({classification: 'field', start: row.start, name, signed});
      prevEnd = row.start + length;
    }
  }
  return {...defn, members: outMembers};
});

export type EnumTypeDefinition = {
  size: Integer;
  align: Integer;
  values: EnumTypeValue[];
};
export type EnumTypeValue = {name: FieldName, value: Integer};
const parseEnumTypeDefinition = JP.object({
  size: parseInteger,
  align: parseInteger,
  values: JP.array(JP.object({
    name: JP.string.then((x) => x as FieldName),
    value: parseInteger,
  })),
});

export type UnionTypeDefinition = {
  size: Integer;
  align: Integer;
  members: UnionTypeMember[];
};
export type UnionTypeMember = {name: FieldName, type: TypeTree};
const parseUnionTypeDefinition = JP.lazy(() => JP.object({
  size: parseInteger,
  align: parseInteger,
  members: JP.array(JP.object({
    name: JP.string.then((x) => x as FieldName),
    type: parseTypeTree,
  })),
}));

export type TypedefTypeDefinition = {
  size: Integer;
  align: Integer;
  type: TypeTree;
};
const parseTypedefTypeDefinition = JP.lazy(() => JP.object({
  size: parseInteger,
  align: parseInteger,
  type: parseTypeTree,
}));

export type FunctionTypeDefinition = {
  ret: TypeTree,
  abi?: string,
  params?: {name?: string, type: TypeTree}[],
  variadic: boolean,
  diverges: boolean,
};
const parseFunctionTypeDefinition = JP.lazy(() => JP.object({
  ret: parseTypeTree,
  abi: JP.optional(JP.string),
  params: JP.optional(JP.array(JP.object({
    name: JP.optional(JP.string),
    type: parseTypeTree,
  }))),
  variadic: JP.withDefault(false, JP.boolean),
  diverges: JP.withDefault(false, JP.boolean),
}));

export type TypeTree =
  | {is: "int", signed: boolean, size: Integer, align: Integer}
  | {is: "float", size: Integer, precision: Integer, align: Integer}
  | {is: "array", len: Integer, inner: TypeTree}
  | {is: "ptr", inner: TypeTree}
  | {is: "named", name: TypeName}
  | {is: "void"}
  | {is: "fn-ptr"} & FunctionTypeDefinition
  /** Anonymous inline struct.  (a proper, named struct will use "named") */
  | {is: "struct"} & StructTypeDefinition
  /** Anonymous inline union.  (a proper, named union will use "named") */
  | {is: "union"} & UnionTypeDefinition
  /** Anonymous inline enum.  (a proper, named enum will use "named") */
  | {is: "enum"} & EnumTypeDefinition
  | {is: "unsupported", size: Integer, align: Integer, comment?: string}
  ;

export const parseTypeTree: JP.Parser<TypeTree> = JP.lazy(() => (
  JP.tagged<TypeTree>("is", {
    "int": (
      JP.object({signed: JP.boolean, size: parseInteger, align: JP.optional(parseInteger)})
        .then(({signed, size, align=size}) => ({is: "int", signed, size, align}))
    ),
    "float": (
      JP.object({size: parseInteger, precision: JP.optional(parseInteger), align: JP.optional(parseInteger)})
        .then(({size, precision=8 * size, align=size}) => ({is: "float", size, precision, align}))
    ),
    "array": (
      JP.object({len: parseInteger, inner: parseTypeTree})
        .then(({len, inner}) => ({is: "array", len, inner}))
    ),
    "ptr": (
      JP.object({inner: parseTypeTree})
        .then(({inner}) => ({is: "ptr", inner}))
    ),
    "named": (
      JP.object({name: JP.string.then((x) => x as TypeName)})
        .then(({name}) => ({is: "named", name}))
    ),
    "void": JP.object({}).then(() => ({is: "void"})),
    "fn-ptr": parseFunctionTypeDefinition.then((props) => ({is: "fn-ptr", ...props})),
    "struct": parseStructTypeDefinition.then((props) => ({is: "struct", ...props})),
    "union": parseUnionTypeDefinition.then((props) => ({is: "union", ...props})),
    "enum": parseEnumTypeDefinition.then((props) => ({is: "enum", ...props})),
  })
));
