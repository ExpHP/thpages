import type {ReactElement} from 'react';

import * as settings from '~/js/settings';
import dedent from '~/js/lib/dedent';
import {Game} from './game';
import * as stdTableModule from './std';
import {InsSiggy, VarHeader} from '../InsAndVar';
import {InsTableRow, VarTableRow} from '../ReferenceTable';
import {preprocessTrustedMarkdown} from '../Markdown';

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

export type PartialOpcodeRefData = Omit<OpcodeRefData, 'wip'> & {wip?: Wip};

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
  mdast: Promise<object>,
};

export type Wip = 0 | 1 | 2;
export type VarType = '%' | '$';

export type Group = {
  min: number,
  max: number,
  title: string | null,
};

// =============================================================================
// Types of tables that exist.

type DataHandlers<D extends CommonData> = {
  /** Throws an exception if data is bad.  Used to check for common mistakes in the table on load. */
  validateData(data: D, refId: string): void;

  // The rest are fields that we assign directly to TableDef.
  noun: TableDef<D>['noun'];
  formatAnchor: TableDef<D>['formatAnchor'];
  getDefaultName: TableDef<D>['getDefaultName'];
  addTypeSigilIfNeeded: TableDef<D>['addTypeSigilIfNeeded'];
  TipHeader: TableDef<D>['TipHeader'];
  TableRow: TableDef<D>['TableRow'];
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
  getDefaultName: (opcode: number) => `ins_${opcode}`,
  addTypeSigilIfNeeded: (name: string) => name,
  TipHeader: InsSiggy,
  TableRow: InsTableRow,
} as const;

const VAR_HANDLERS: DataHandlers<VarData> = {
  noun: 'variable',
  formatAnchor: (opcode: number) => `var-${opcode}`,
  validateData: (_data: VarData, _refId: string) => {},
  getDefaultName: (opcode: number, {type}: VarData) => `[${opcode}${type === '%' ? '.0f' : ''}]`,
  addTypeSigilIfNeeded: (name: string, {type}: VarData) => name[0] == '[' ? name : type + name,
  TipHeader: VarHeader,
  TableRow: VarTableRow,
} as const;

// =============================================================================

export type ReverseTable = Map<Game, Map<Ref, number>>;
export type RefByOpcode = Map<Game, Map<number, PartialOpcodeRefData>>;
export type LatestGameTable = Map<Ref, QualifiedOpcode>;
export type QualifiedOpcode = {game: Game, opcode: number};

/**
 * Wraps a table-defining module with useful methods.
 */
export class TableDef<Data extends CommonData> {
  /** Prefix (e.g. `"anm"`) of crossrefs (e.g. `"anm:pos"`). */
  readonly mainPrefix: string;

  /** Page where table is hosted. */
  readonly tablePage: string;

  /** Where to find user settings for naming the objects in this table. */
  readonly nameSettingsPath: {lang: settings.Lang, submap: settings.SubmapKey};

  /** E.g. 'instruction', 'variable'. For debug/error messages. */
  readonly noun: string;

  /** Table that maps an item id (portion of crossref after mainPrefix) to data about that item. */
  private readonly dataTable: Map<string, Data>;

  /** Table that maps a game and opcode to a reference. */
  private readonly byOpcode: RefByOpcode;

  /** Finds the opcode from a crossref. */
  readonly reverseTable: ReverseTable;

  /**
   * Gives the latest game containing each instruction, and its opcode in that game.
   *
   * Used as a fallback when referring to instructions that don't exist in the current page's game.
   */
  readonly latestGameTable: LatestGameTable;

  /** Generate a default name. (e.g. `ins_32`, `[10002]`...) */
  readonly getDefaultName: (opcode: number, data: Data) => string;

  /** Will turn `IO` into `$IO` for vars. (but is not applied to `[10002]`) */
  readonly addTypeSigilIfNeeded: (name: string, data: Data) => string;

  /** Turns opcode into the anchor (URL a= field) for that item on the table's page. */
  readonly formatAnchor: (num: number) => string;

  /**
   * Get groups to build a table of contents from on the table page.
   *
   * If there's only one group, no table of contents is generated.
   */
  readonly getGroups: (game: Game) => Group[];

  /** Markdown content to place after summary and before Toc or Table. */
  readonly textBeforeTable: (game: Game) => string | null;

  /** Generate HTML for a tooltip header. */
  readonly TipHeader: (props: {r: Ref, data: Data}) => ReactElement;

  /** Generate a row of the table. */
  readonly TableRow: (props: {table: TableDef<Data>, r: Ref, game: Game, data: Data, opcode: number}) => ReactElement;

  constructor(props: {
    tablePage: TableDef<Data>['tablePage'],
    mainPrefix: TableDef<Data>['mainPrefix'],
    dataHandlers: DataHandlers<Data>,
    nameSettingsPath: TableDef<Data>['nameSettingsPath'],
    getGroups: TableDef<Data>['getGroups'],
    textBeforeTable: TableDef<Data>['textBeforeTable'],
    module: {
      byOpcode: RefByOpcode;
      byRefId: Map<string, PartialData<Data>>;
    },
  }) {
    const {reverseTable, latestGameTable} = computeReverseTable(props.module.byOpcode);
    this.mainPrefix = props.mainPrefix;
    this.tablePage = props.tablePage;
    this.dataTable = preprocessTable(props.module.byRefId);
    this.byOpcode = props.module.byOpcode;
    this.reverseTable = reverseTable;
    this.latestGameTable = latestGameTable;
    this.noun = props.dataHandlers.noun;
    this.nameSettingsPath = props.nameSettingsPath;
    this.getDefaultName = props.dataHandlers.getDefaultName;
    this.addTypeSigilIfNeeded = props.dataHandlers.addTypeSigilIfNeeded;
    this.formatAnchor = props.dataHandlers.formatAnchor;
    this.getGroups = props.getGroups;
    this.textBeforeTable = props.textBeforeTable;
    this.TipHeader = props.dataHandlers.TipHeader;
    this.TableRow = props.dataHandlers.TableRow;

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

  getRefByOpcode(game: Game, opcode: number): OpcodeRefData | null {
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
  makeRefGameIndependent(ref: Ref): Ref {
    for (let attempt=0; attempt < 100; attempt++) {
      const {succ} = this.getDataByRef(ref)!;
      if (!succ) return ref;

      ref = `${this.mainPrefix}:${succ}`;
    }
    throw new Error(`could not make ref ${ref} game-independent; may be a cycle in successors`);
  }

  supportedGames(): Game[] {
    return [...this.byOpcode.keys()];
  }
}

function computeReverseTable(tableByOpcode: RefByOpcode) {
  const latestGameTable: LatestGameTable = new Map();
  const reverseTable: ReverseTable = new Map();

  for (const [game, tableInner] of tableByOpcode.entries()) {
    const reverseInner = new Map<Ref, number>();

    for (const [opcode, {ref}] of tableInner.entries()) {
      if (ref === null) continue;

      latestGameTable.set(ref, {game, opcode});
      reverseInner.set(ref, opcode);
    }
    reverseTable.set(game, reverseInner);
  }
  return {latestGameTable, reverseTable};
}

// =============================================================================

// const ANM_INS_HANDLERS: TableHandlers<InsData> = makeTableHandlers({
//   ...COMMON_INS_HANDLERS,
//   tablePage: 'anm/ins',
//   dataTable: ANM_INS_DATA,
//   tableByOpcode: ANM_BY_OPCODE,
//   insNames: ANM_INS_NAMES,
//   mainPrefix: 'anm',
//   nameSettingsPath: {lang: 'anm', submap: 'ins'},
//   getGroups: (game) => '13' <= game ? ANM_GROUPS_V8 : [{min: 0, max: 1300, title: null}],
//   textBeforeTable: () => null,
// });

// const ANM_VAR_HANDLERS: TableHandlers<VarData> = makeTableHandlers({
//   ...COMMON_VAR_HANDLERS,
//   tablePage: 'anm/var',
//   dataTable: ANM_VAR_DATA,
//   tableByOpcode: ANM_VARS_BY_NUMBER,
//   insNames: ANM_VAR_NAMES,
//   mainPrefix: 'anmvar',
//   nameSettingsPath: {lang: 'anm', submap: 'vars'},
//   getGroups: () => [{min: 10000, max: 11000, title: null}],
//   textBeforeTable: (game: Game) => (game === '06') ? '**EoSD ANM has no variables, _nerrrrd._**' : null,
// });

export const STD_TABLE = new TableDef({
  module: stdTableModule,
  tablePage: '/std/ins',
  mainPrefix: 'std',
  nameSettingsPath: {lang: 'std', submap: 'ins'},
  dataHandlers: INS_HANDLERS,
  getGroups: () => [{min: 0, max: 100, title: null}],
  textBeforeTable: (game: Game) => (game > '09') ? null : dedent(`
    In games prior to :game[095], all STD instructions are the same size, with room for three arguments.
    An argument of \`__\` below indicates a padding argument whose value is unused. \`thstd\` requires
    you to always supply three arguments, while [\`trustd\`](https://github.com/ExpHP/truth#readme) allows
    these padding arguments to be omitted.
  `),
});

// const MSG_HANDLERS: TableHandlers<InsData> = makeTableHandlers({
//   ...COMMON_INS_HANDLERS,
//   tablePage: 'msg/ins',
//   dataTable: MSG_INS_DATA,
//   tableByOpcode: MSG_BY_OPCODE,
//   insNames: MSG_INS_NAMES,
//   mainPrefix: 'msg',
//   nameSettingsPath: {lang: 'msg', submap: 'ins'},
//   getGroups: () => [{min: 0, max: 1000, title: null}],
//   textBeforeTable: (game: Game) => getMsgTableText(game),
// });

export function getAllTables() {
  return [STD_TABLE];
}

export function getTableByPrefix(prefix: string): TableDef<InsData> | TableDef<VarData> | null {
  for (const table of getAllTables()) {
    if (table.mainPrefix === prefix) {
      return table;
    }
  }
  return null;
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
export type PartialData<D extends CommonData> = Omit<D, 'wip' | 'mdast'> & {
  wip?: Wip,
  md: string,
};

function preprocessTable<D extends CommonData>(rawTable: Map<string, PartialData<D>>): Map<string, D> {
  return new Map([...rawTable.entries()].map(([key, value]) => {
    return [key, {
      ...value,
      wip: value.wip || 0,
      mdast: preprocessTrustedMarkdown(dedent(value.md)),
    } as any];
  }));
}
