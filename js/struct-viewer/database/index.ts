import {
  DbHeadJson, VersionProps,
  parseDbHeadJson, parseVersionProps, parseTypesJson,
} from "./json-types";
import {deepInequalityWitness, unreachable} from '~/js/util';

import {
  TypeTree, TypeDefinition, TypedefTypeDefinition, StructTypeDefinition, UnionTypeDefinition, EnumTypeDefinition,
  FunctionTypeDefinition, StructTypeMember, UnionTypeMember, EnumTypeValue,
} from "./json-types";
export {
  TypeTree, TypeDefinition, TypedefTypeDefinition, StructTypeDefinition, UnionTypeDefinition, EnumTypeDefinition,
  FunctionTypeDefinition, StructTypeMember, UnionTypeMember, EnumTypeValue,
};

export const CURRENT_FORMAT_VERSION = 2;

export type TypeSource = 'user' | 'system';

export type VersionData = {
  level: VersionLevel,
}
export type VersionLevel = 'primary' | 'secondary'; // secondary versions can be hidden
export const DEFAULT_VERSION_LEVELS: VersionLevel[] = ['primary', 'secondary'];

/** Form of a VersionLevel that can be compared using `<`, `>`. */
export type VersionLevelInt = number &  { readonly __tag: unique symbol };
function versionLevelToInt(levels: VersionLevel[], level: VersionLevel): VersionLevelInt {
  const index = levels.indexOf(level);
  if (index === -1) {
    throw new Error(`bad level: '${level}'`);
  }
  return -index as VersionLevelInt;
}
function versionLevelFromInt(levels: VersionLevel[], level: VersionLevelInt): VersionLevel {
  return levels[-level];
}

export type Version = string & { readonly __tag: unique symbol };
export type TypeName = string & { readonly __tag: unique symbol };
export type FieldName = string & { readonly __tag: unique symbol };

// =============================================================================

export interface PathReader {
  (path: string): Promise<string>;
};

export function makeCachedReader(reader: PathReader) {
  const cache = new Map();
  return (path: string) => {
    if (!cache.has(path)) {
      cache.set(path, reader(path));
    }
    return cache.get(path);
  };
}

// =============================================================================

export class TypeDatabase {
  #reader: PathReader;
  #dbHead: Promise<DbHeadJson>;
  // NOTE: will always have an entry for each version as long as `dbHead` has resolved.
  #byVersion: Map<Version, Promise<TypeCollection>>;
  #versionProps: Map<Version, Promise<VersionProps>>;

  constructor(reader: PathReader) {
    this.#reader = reader;
    this.#byVersion = new Map();
    this.#versionProps = new Map();
    this.#dbHead = (async () => {
      const text = await reader('db-head.json');
      const dbHead = parseDbHeadJson(text);
      const commonTypes = await loadCommonTypes(reader, [...dbHead.commonModules.keys()]);
      this.doSideEffectsFromAwaitingDbHead(dbHead, commonTypes);
      return dbHead;
    })();
  }

  // NOTE: '#' doesn't work on methods in TypeScript 3
  private doSideEffectsFromAwaitingDbHead(dbHead: DbHeadJson, commonTypes: Map<TypeName, TypeDefinition>) {
    for (const version of dbHead.versions.keys()) {
      // begin reading version-props files and types files
      this.#versionProps.set(version, (
        this.#reader(`data/${version}/version-props.json`)
          .then((text) => parseVersionProps.parse(JSON.parse(text)))
      ));
      this.#byVersion.set(version, loadTypeCollection(this.#reader, version, commonTypes));
    }
  }

  async parseVersion(version: string): Promise<Version | null> {
    for (const v of (await this.#dbHead).versions.keys()) {
      if (v === version) return v;
    }
    return null;
  }

  async getTypeIfExists(name: TypeName, version: Version): Promise<TypeDefinition | undefined> {
    await this.#dbHead;  // guarantee inner maps
    const typeDb = await this.getTypeDbForVersion(version);
    return typeDb.getNamedType(name);
  }

  async getTypeDbForVersion(version: Version) {
    await this.#dbHead;  // guarantee inner maps
    return await this.#byVersion.get(version)!;
  }

  async getAllVersions(minLevel: VersionLevel): Promise<Version[]> {
    const dbHead = await this.#dbHead;
    const minLevelInt = versionLevelToInt(dbHead.levels, minLevel);
    const out = [];
    for (const [version, {level}] of dbHead.versions.entries()) {
      const levelInt = versionLevelToInt(dbHead.levels, level);
      if (levelInt >= minLevelInt) {
        out.push(version);
      }
    }
    return out;
  }

  async getVersionsForStruct(name: TypeName, minLevel: VersionLevel): Promise<Version[]> {
    const out = [];
    for (const version of await this.getAllVersions(minLevel)) {
      const typeDb = await this.getTypeDbForVersion(version);
      if (typeDb.getNamedType(name)) {
        out.push(version);
      }
    }
    return out;
  }

  async getTypeNamesForVersion(version: Version): Promise<TypeName[]> {
    const inner = await this.getTypeDbForVersion(version);
    return [...inner.typeNames()];
  }

  async getAllStructs(): Promise<TypeName[]> {
    const dbHead = await this.#dbHead;

    const set = new Set<TypeName>();
    for (const version of dbHead.versions.keys()) {
      for (const name of await this.getTypeNamesForVersion(version)) {
        set.add(name);
      }
    }

    const sorted = [...set];
    sorted.sort();
    return sorted;
  }
}

async function loadCommonTypes(reader: PathReader, commonModuleNames: string[]) {
  let out = new Map();
  for (const module of commonModuleNames) {
    const text = await reader(`data/_common/${module}/types-ext.json`);
    const json = JSON.parse(text);
    const newTypes = parseTypesJson.parse(json);
    out = mergeTypes(out, newTypes, 'expect-identical');
  }
  return out;
}

async function loadTypeCollection(reader: PathReader, version: Version, commonTypes: Map<TypeName, TypeDefinition>) {
  const [versionPropsText, extText, ownText] = await Promise.all([
    reader(`data/${version}/version-props.json`),
    reader(`data/${version}/types-ext.json`),
    reader(`data/${version}/types-own.json`),
  ]);
  const versionProps = parseVersionProps.parse(JSON.parse(versionPropsText));
  const extTypes = parseTypesJson.parse(JSON.parse(extText));
  const ownTypes = parseTypesJson.parse(JSON.parse(ownText));
  const versionTypes = mergeTypes(extTypes, ownTypes, 'expect-disjoint');
  const allTypes = mergeTypes(commonTypes, versionTypes, 'expect-matching-layout');
  return new TypeCollection(allTypes, versionProps);
}

/**
 * A collection of type definitions for a single version, providing synchronous operations.
 **/
class TypeCollection {
  #versionProps: VersionProps;
  #types: Map<TypeName, TypeDefinition>;

  constructor(types: Map<TypeName, TypeDefinition>, versionProps: VersionProps) {
    this.#versionProps = versionProps;
    this.#types = types;
  }

  private getTypeLayout(ttree: TypeTree): Layout {
    switch (ttree.is) {
      case "int":
      case "float":
      case "unsupported":
      case "struct":
      case "enum":
      case "union":
        return {size: ttree.size, align: ttree.align};
      case "ptr":
      case "fn-ptr":
        return {size: this.#versionProps.pointerSize, align: this.#versionProps.pointerSize};
      case "void":
        return {size: 0, align: 1};
      case "array":
        const {size, align} = this.getTypeLayout(ttree.inner);
        return {size: size * ttree.len, align};
      case "named":
        return this.getNamedTypeLayout(ttree.name);
    }
  }

  private getNamedTypeLayout(name: TypeName): Layout {
    const {size, align} = this.#types.get(name)!;
    return {size, align};
  }

  structHasNaturalOffsets(struct: StructTypeDefinition) {
    return struct.members.every(({classification}) => classification !== 'gap');
  }

  getNamedType(name: TypeName): TypeDefinition | undefined {
    return this.#types.get(name);
  }

  typeNames(): TypeName[] {
    return [...this.#types.keys()];
  }
}


export type Layout = {size: number, align: number};


type ValidationMode = 'expect-identical' | 'expect-matching-layout' | 'expect-disjoint';
/** Consolidates contents from multiple types.json files. */
function mergeTypes(
    set1: Map<TypeName, TypeDefinition>,
    set2: Map<TypeName, TypeDefinition>,
    validationMode: ValidationMode,
) {
  const out = new Map(set1);
  for (const [name, def] of set2.entries()) {
    const original = out.get(name);
    // no matter what, we always use the new type and forget the old one
    out.set(name, def);

    if (original) {
      // ...but we do want to check some properties for integrity:
      if (validationMode === 'expect-identical') {
        // Common types must match identically between all common modules.
        const inequalityWitness = deepInequalityWitness(original, def);
        if (inequalityWitness) {
          logDbError(`${name} is mismatched between common modules at path ${inequalityWitness.path.join('.')}`)
        }
      } else if (validationMode === 'expect-matching-layout') {
        // Version types may override common types, but it is a problem if they have mismatched layout.
        const {size: size1, align: align1} = original;
        const {size: size2, align: align2} = def;
        if (size1 !== size2 || align1 !== align2) {
          logDbError(`${name} was overridden from (size, align) = (${size1}, ${align1}) to (${size2}, ${align2})`)
        }
      } else if (validationMode === 'expect-disjoint') {
        logDbError(`${name} is in both types-ext and types-own`);
      } else {
        unreachable(validationMode);
      }
    }
  }
  return out;
}

function logDbError(text: string) {
  // TODO: We may want to provide a visual indication of database errors.
  console.error(text);
}
