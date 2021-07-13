import * as JP from '~/js/jsonParse';

/** Format of a struct that has just been read from the database. */
export type Struct = {
  name: TypeName,
  source: StructSource;
  rows: StructRow[],
  size: number,
};

type StructSource = 'user' | 'system';

export type StructRow = {
  offset: number,
  size: number,
  data: StructRowData,
};

export type StructRowData =
  | {type: 'gap'}
  | {type: 'field'} & StructField
  ;

export type StructField = {
  name: FieldName;
  ctype: CTypeString;
};

type DbHead = {
  levels: VersionLevel[],
  versions: Map<Version, VersionData>,
};

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
export type CTypeString = string & { readonly __tag: unique symbol };

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

export class StructDatabase {
  private reader: PathReader;
  private dbHead: Promise<DbHead>;
  // NOTE: will always have an entry for each version as long as `dbHead` has resolved.
  private structs: Map<Version, Map<TypeName, Struct>>;

  private alreadyLoaded: Set<string>;

  constructor(reader: PathReader) {
    this.reader = reader;
    this.structs = new Map();
    this.dbHead = (async () => {
      const text = await reader('db-head.json');
      const dbHead = parseDbHeadFile(text);
      this.doSideEffectsFromAwaitingDbHead(dbHead);
      return dbHead;
    })();
    this.alreadyLoaded = new Set();
  }

  private doSideEffectsFromAwaitingDbHead(dbHead: DbHead) {
    for (const version of dbHead.versions.keys()) {
      this.structs.set(version, new Map());
    }
  }

  async parseVersion(version: string): Promise<Version | null> {
    for (const v of (await this.dbHead).versions.keys()) {
      if (v === version) return v;
    }
    return null;
  }

  async getStructIfExists(name: TypeName, version: Version): Promise<Struct | undefined> {
    await this.dbHead;  // guarantee inner maps
    await this.ensureVersionStructsAreLoaded(version);
    return this.structs.get(version)!.get(name);
  }

  async ensureVersionStructsAreLoaded(version: Version) {
    await this.dbHead;  // guarantee inner maps
    const path = `data/${version}/type-structs-own.json`;
    console.debug(path);
    console.debug(this.alreadyLoaded);

    if (!this.alreadyLoaded.has(path)) {
      console.debug('does not have');
      const text = await this.reader(path);
      // another call could have beaten us
      if (this.alreadyLoaded.has(path)) return;

      const structsFromFile = parseStructsFile(text, 'user');
      console.debug(structsFromFile);

      const structsForVersion = this.structs.get(version)!;
      console.debug(structsForVersion);
      for (const [name, struct] of structsFromFile.entries()) {
        structsForVersion.set(name, struct);
      }
      this.alreadyLoaded.add(path);
    }
  }

  async getAllVersions(minLevel: VersionLevel): Promise<Version[]> {
    const dbHead = await this.dbHead;
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
      if (await this.getStructIfExists(name, version)) {
        out.push(version);
      }
    }
    return out;
  }

  async getStructsForVersion(version: Version): Promise<TypeName[]> {
    await this.ensureVersionStructsAreLoaded(version);
    return [...this.structs.get(version)!.keys()];
  }

  async getAllStructs(): Promise<TypeName[]> {
    const dbHead = await this.dbHead;

    const set = new Set<TypeName>();
    for (const version of dbHead.versions.keys()) {
      for (const name of await this.getStructsForVersion(version)) {
        set.add(name);
      }
    }

    const sorted = [...set];
    sorted.sort();
    return sorted;
  }
}

// =============================================================================

function parseDbHeadFile(text: string): DbHead {
  const json: unknown = JSON.parse(text);

  const {version: formatVersion} = JP.object({version: JP.number}).parse(json);
  if (formatVersion !== 1) {
    console.warn(`unexpected db-head version: ${formatVersion}`)
  }

  const levels = DEFAULT_VERSION_LEVELS;

  const {versions: versionsArray} = JP.object({
    versions: JP.array(JP.object({
      version: JP.string.then((s) => s as Version),
      level: JP.string.then((level) => {
        if (!levels.includes(level as VersionLevel)) {
          console.error(`unknown level '${level}', defaulting to 'secondary'`);
          level = 'secondary';
        }
        return level as VersionLevel;
      }),
    })),
  }).parse(json);

  const output: DbHead = {versions: new Map(), levels};
  for (const {version, level} of versionsArray) {
    if (output.versions.has(version)) {
      throw new Error(`duplicate version '${version}'`);
    }
    output.versions.set(version as Version, {level});
  }
  return output;
}

function parseStructsFile(text: string, source: StructSource): Map<TypeName, Struct> {
  const json = JSON.parse(text);
  return JP.map((s) => s as TypeName, JP.array(JP.tuple([hexParser, JP.string, JP.or('a string or null', JP.string, JP.null_)])))
    .then((map) => new Map([...map.entries()].map(([name, data]) => [name, structFromData(name, source, data)])))
    .parse(json);
}

const hexParser: JP.Parser<number> = JP.or('a number or string', JP.number, JP.string.then((x) => {
  const num = parseInt(x, 16);
  if (num !== num) {
    throw new Error(`invalid hex string: ${x}`)
  }
  return num;
}));

function structFromData(structName: string, source: StructSource, data: [number, string, string | null][]): Struct {
  const rows = [];
  for (let i = 0; i < data.length - 1; i++) {
    const [offset, name, type] = data[i];
    const [nextOffset] = data[i + 1];
    const size = nextOffset - offset;

    if (type) {
      console.debug(`typedef ${type} A;`);
      // console.debug(cparse(`typedef ${type} A;`));
      rows.push({offset, size, data: {type: 'field', name: name as FieldName, ctype: type as CTypeString} as const});
    } else {
      rows.push({offset, size, data: {type: 'gap'} as const});
    }
  }
  const [size] = data[data.length - 1];
  return {rows, source, name: structName as TypeName, size};
}
