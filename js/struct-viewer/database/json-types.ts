import * as JP from '~/js/jsonParse';
import {CURRENT_FORMAT_VERSION, DEFAULT_VERSION_LEVELS, Version, VersionLevel, TypeName} from './index';

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
  "a (possibly string) integer",
  JP.int,
  JP.string.then((s: string) => {
    if (s.match(/^-?(?:0|[1-9][0-9]*|0[xX][0-9a-fA-F]+|0[bB][01]+)$/)) {
      const x = Number(s);  // ok because regex didn't allow octal
      if (!Number.isNaN(x)) return x;
    }
    throw new JP.UserJsonError();
  }),
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
  ;
const parseTypeDefinition = JP.lazy(() => JP.tagged<TypeDefinition>("is", {
  "struct": parseStructTypeDefinition.then((props) => ({is: "struct", ...props})),
  "union": parseUnionTypeDefinition.then((props) => ({is: "union", ...props})),
  "enum": parseEnumTypeDefinition.then((props) => ({is: "enum", ...props})),
  "typedef": parseTypedefTypeDefinition.then((props) => ({is: "typedef", ...props})),
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
  | {classification: 'field', name: string, type: TypeTree}
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
    name: JP.string,
    type: JP.or("type tree or null", JP.null_, parseTypeTree),
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

export type EnumTypeDefinition = {
  size: Integer;
  align: Integer;
  values: {name: string, value: Integer}[];
};
const parseEnumTypeDefinition = JP.object({
  size: parseInteger,
  align: parseInteger,
  values: JP.array(JP.object({
    name: JP.string,
    value: parseInteger,
  })),
});

export type UnionTypeDefinition = {
  size: Integer;
  align: Integer;
  members: {name: string, type: TypeTree}[];
};
const parseUnionTypeDefinition = JP.lazy(() => JP.object({
  size: parseInteger,
  align: parseInteger,
  members: JP.array(JP.object({
    name: JP.string,
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
  | {is: "struct"} & StructTypeDefinition
  | {is: "union"} & UnionTypeDefinition
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
