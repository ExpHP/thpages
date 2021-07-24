import * as JP from '../jsonParse';

type TypesJson = Record<string, TypeDefinition>;
type TypeDefinition =
  | StructTypeDefinition
  | UnionTypeDefinition
  | EnumTypeDefinition
  | TypedefTypeDefinition
  ;

type Integer = number;
const parseInteger = JP.or(
  "a (possibly string) integer",
  JP.int,
  JP.string.then((s: string) => {
    if (s.match(/^-?(?:0|[1-9][0-9]*|0[xX][0-9a-fA-F]+|0[bB][01]+)$/)) {
      const x = Number.parseInt(s);
      if (Number.isNaN(x)) return x;
    }
    throw new JP.UserJsonError();
  }),
);

type StructTypeDefinition = {
  size: Integer;
  align: Integer;
  packed?: boolean; // default: false
  members: {offset: Integer, name: string, type: TypeTree}[];
};
const parseStructTypeDefinition = JP.object({
  size: parseInteger,
  align: parseInteger,
  packed: JP.withDefault(false, JP.boolean),
  members: JP.array(JP.object({
    offset: parseInteger,
    name: JP.string,
    type: () => parseTypeTree,
  })),
});

type EnumTypeDefinition = {
  size: Integer;
  align: Integer;
  members: {name: string, value: Integer}[];
};
const parseEnumTypeDefinition = JP.object({
  size: parseInteger,
  align: parseInteger,
  members: JP.array(JP.object({
    name: JP.string,
    value: parseInteger,
  })),
});

type UnionTypeDefinition = {
  size: Integer;
  align: Integer;
  members: {name: string, type: TypeTree}[];
};
const parseUnionTypeDefinition = JP.object({
  size: parseInteger,
  align: parseInteger,
  members: JP.array(JP.object({
    name: JP.string,
    type: () => parseTypeTree,
  })),
});

type TypedefTypeDefinition = {
  size: Integer;
  align: Integer;
  type: TypeTree;
};
const parseTypedefTypeDefinition = JP.object({
  size: parseInteger,
  align: parseInteger,
  type: () => parseTypeTree,
});

type FunctionTypeDefinition = {
  ret: TypeTree,
  abi?: string,
  params?: {name?: string, type: TypeTree}[],
  variadic?: boolean,
  diverges?: boolean,
};
const parseFunctionTypeDefinition = JP.object({
  ret: () => parseTypeTree,
  abi: JP.optional(JP.string),
  params: JP.optional(JP.array(JP.object({
    name: JP.optional(JP.string),
    type: () => parseTypeTree,
  }))),
  variadic: JP.optional(JP.boolean),
  diverges: JP.optional(JP.boolean),
});

type TypeTree =
  | {is: "int", signed: boolean, size: Integer, alignment?: Integer}
  | {is: "float", size: Integer, precision?: Integer, alignment?: Integer}
  | {is: "array", len: Integer, inner: TypeTree}
  | {is: "ptr", inner: TypeTree}
  | {is: "named", name: string}
  | {is: "void"}
  | {is: "fn-ptr"} & FunctionTypeDefinition
  | {is: "unsupported", size: Integer, alignment: Integer, comment?: string}
  | {is: "struct"} & StructTypeDefinition
  | {is: "union"} & UnionTypeDefinition
  | {is: "enum"} & EnumTypeDefinition
  ;

const parseTypeTree: JP.Parser<TypeTree> = (
  JP.tagged<TypeTree>("is", {
    "int": (
      JP.object({signed: JP.boolean, size: parseInteger, alignment: JP.optional(parseInteger)})
        .then(({signed, size, alignment=size}) => ({is: "int", signed, size, alignment}))
    ),
    "float": (
      JP.object({size: parseInteger, precision: JP.optional(parseInteger), alignment: JP.optional(parseInteger)})
        .then(({size, precision=8 * size, alignment=size}) => ({is: "float", size, precision, alignment}))
    ),
    "array": (
      JP.object({len: parseInteger, inner: () => parseTypeTree})
        .then(({len, inner}) => ({is: "array", len, inner}))
    ),
    "ptr": (
      JP.object({inner: () => parseTypeTree})
        .then(({inner}) => ({is: "ptr", inner}))
    ),
    "named": (
      JP.object({name: JP.string})
        .then(({name}) => ({is: "named", name}))
    ),
    "void": JP.object({}).then(() => ({is: "void"})),
    "fn-ptr": parseFunctionTypeDefinition.then((props) => ({is: "fn-ptr", ...props})),
    "struct": parseStructTypeDefinition.then((props) => ({is: "struct", ...props})),
    "union": parseUnionTypeDefinition.then((props) => ({is: "union", ...props})),
    "enum": parseEnumTypeDefinition.then((props) => ({is: "enum", ...props})),
  })
);


