import * as settings from '~/js/settings';
import {Game} from './game';
import stdTableModule from './std';

export type Ref = string;

/** Data for a specific numbered entity (e.g. a specific ANM opcode number) in a specific game. */
export type OpcodeRefData = {
  /**
   * Game independent crossref for this opcode.
   */
  ref: Ref,
  /**
   * How confident are we in matching this opcode to that crossref?
   *
   * Used in cases where research of an instruction was primarily conducted in one game,
   * then matching instructions were identified in other games due to code similarities.
   * Generally reserved for things like bitflags where there are many opportunities to make
   * an error in relating code between games.
   */
  wip: Wip,
};

/** Data associated with a crossref. */
export type CommonData = {
  /**
   * Crossref id that is a successor to this crossref in later games.
   *
   * The crossref for an instruction is changed when the signature changes,
   * when the description needs to change, or when we want to be able to have
   * the description in one version link to the description in another.
   * For instance, the "jump" instructions in v0 and v2 ANM have different crossrefs
   * because a time argument was added.
   *
   * `succ` helps provide an even greater level of game-independence to help things
   * like the stats table track an instruction across an even wider range of games.
   */
  succ?: string,
  /** How complete is our understanding of this thing? */
  wip: Wip,
  /** Markdown description. */
  desc: string,
};

type Wip = 0 | 1 | 2;
type VarType = '%' | '$';

export type Group = {
  min: number,
  max: number,
  title: string | null,
};

// =============================================================================
// Types of tables that exist.

type DataHandlers<D extends CommonData> = {
  /** Turns opcode into the anchor (URL a= field) for that item on the table's page. */
  formatAnchor(num: number): string;

  noun: string; // documented on TableDef

  /** Throws an exception if data is bad.  Used to check for common mistakes in the table on load. */
  validateData(data: D, refId: string): void;
};

export type InsData = {
  sig: string,
  args: string[],
} & CommonData;

export type VarData = {
  type: VarType,
  mut: boolean,
} & CommonData;

const INS_HANDLERS: DataHandlers<InsData> = {
  noun: 'instruction',
  formatAnchor: (opcode: number) => `ins-${opcode}`,
  validateData: ({args, sig}: InsData, refId: string) => {
    if (sig && sig.length !== args.length) {
      window.console.error(`TABLE CORRUPT: std ref ${refId} has arg count mismatch`);
    }
  },
} as const;

const VAR_HANDLERS: DataHandlers<VarData> = {
  noun: 'variable',
  formatAnchor: (opcode: number) => `var-${opcode}`,
  validateData: (_data: VarData, _refId: string) => {},
} as const;

// =============================================================================

/**
 * Wraps a table-defining module with useful methods.
 */
export class TableDef<Data extends CommonData> {
  /** Prefix (e.g. `"anm"`) of crossrefs (e.g. `"anm:pos"`). */
  readonly mainPrefix: string;

  /** Page (URL s= field) where table is hosted. */
  readonly tablePage: string;

  /** Where to find user settings for naming the objects in this table. */
  readonly nameSettingsPath: {lang: settings.Lang, submap: settings.SubmapKey};

  /** E.g. 'instruction', 'variable'. For debug/error messages. */
  readonly noun: string;

  /** Table that maps an item id (portion of crossref after mainPrefix) to data about that item. */
  readonly dataTable: Map<string, Data>;

  /** Table that maps a game and opcode to a reference. */
  readonly byOpcode: Map<Game, Map<number, OpcodeRefData>>;

  constructor(props: {
    tablePage: string,
    mainPrefix: string,
    dataHandlers: DataHandlers<Data>,
    nameSettingsPath: {lang: settings.Lang, submap: settings.SubmapKey},
    module: {
      byOpcode: Map<Game, Map<number, OpcodeRefData>>;
      byRefId: Map<string, PartialData<Data>>;
    },
  }) {
    this.mainPrefix = props.mainPrefix;
    this.tablePage = props.tablePage;
    this.dataTable = preprocessTable(this.mainPrefix, props.module.byRefId);
    this.byOpcode = props.module.byOpcode;
    this.noun = props.dataHandlers.noun;
    this.nameSettingsPath = props.nameSettingsPath;
    this.dataTable.forEach(props.dataHandlers.validateData);
  }

  // Get instruction data for an 'anm:' or 'anmvar:' ref id.
  getDataByRef(ref: Ref): Data | null {
    const {mainPrefix, dataTable} = this;
    const id = stripRefPrefix(mainPrefix, ref);

    const out = dataTable.get(id);
    if (out == null) {
      window.console.warn(`bad ${mainPrefix} crossref: ${id}`);
      return null;
    }
    return out;
  }

  getRefByOpcode(game: Game, opcode: number) {
    const entry = this.byOpcode.get(game)?.get(opcode);
    if (entry === undefined) return null; // opcode doesn't exist in game

    return {...entry, wip: entry.wip || 0};
  }

  /**
   * Given a ref that may be for an outdated instruction, get the ref in the latest games.
   *
   * Sometimes instructions are given different refs in different games because they have
   * different signatures, or they work very differently and it is desirable to be able to
   * link to them separately.  This can hinder code that wants to track an instruction across
   * all games, however, so this function can be used to normalize instructions to their
   * latest ref.
   */
  makeRefGameIndependent(ref: string) {
    for (let attempt=0; attempt < 100; attempt++) {
      const {succ} = this.getDataByRef(ref)!;
      if (!succ) return ref;

      ref = `${this.mainPrefix}:${succ}`;
    }
    throw new Error(`could not make ref ${ref} game-independent; may be a cycle in successors`);
  }
}

// =============================================================================

export const STD_TABLE = new TableDef({
  module: stdTableModule,
  tablePage: 'std/ins',
  mainPrefix: 'std',
  nameSettingsPath: {lang: 'std', submap: 'ins'},
  dataHandlers: INS_HANDLERS,
  // getGroups: () => [{min: 0, max: 100, title: null}],
  // textBeforeTable: (c: Context) => (queryGame(c) > '09') ? null : dedent(`
  //   In games prior to :game[095], all STD instructions are the same size, with room for three arguments.
  //   An argument of \`__\` below indicates a padding argument whose value is unused. \`thstd\` requires
  //   you to always supply three arguments, while [\`trustd\`](https://github.com/ExpHP/truth#readme) allows
  //   these padding arguments to be omitted.
  // `),
});

export function getAllTables() {
  return [STD_TABLE];
}

// =============================================================================

function stripRefPrefix(prefix: string, ref: Ref) {
  if (!ref.startsWith(`${prefix}:`)) {
    throw new Error(`expected ${prefix} ref, got "${ref}"`);
  }
  return ref.substring(prefix.length + 1);
}

export type PartialInsData = PartialData<InsData>;
export type PartialVarData = PartialData<VarData>;
export type PartialData<D extends CommonData> = Omit<D, 'wip' | 'desc'> & {
  wip?: Wip,
  desc: string,
};

function preprocessTable<D extends CommonData>(mainPrefix: string, rawTable: Map<string, PartialData<D>>): Map<string, D> {
  return new Map([...rawTable.entries()].map(([key, value]) => {
    const ref = `${mainPrefix}:${key}`;
    const re = new RegExp(`:ref\\{r=${ref}\\}`, 'g');
    return [key, {
      ...value,
      wip: value.wip || 0,
      desc: value.desc.replace(re, `:tip[:ref{r=${ref}}]{tip="YOU ARE HERE" deco="0"}`),
    } as any];
  }));
}
