import dedent from '../lib/dedent';
import {globalRefNames, globalRefTips, globalRefLinks, getRefNameKey, Ref} from '../ref';
import {MD, postprocessConvertedMarkdown} from '../markdown';
import {globalNames, globalLinks, PrefixResolver, Context} from '../resolver';
import {parseQuery, queryUrl, queryGame, queryPageEquals, queryFilterCommonProps, Query, currentUrlWithProps} from '../url-format';
import {gameData, Game} from '../game-names';
import {globalConfigNames} from '../settings';
import {initStats, buildStatsTable} from './stats';
import {GAME_ANM_VERSIONS, GAME_STD_VERSIONS} from './versions';
import {StrMap, NumMap} from "../util";
import './layer-viewer';

import {ANM_INS_DATA, ANM_BY_OPCODE, ANM_GROUPS_V8} from './ins-table.js';
import {ANM_VAR_DATA, ANM_VARS_BY_NUMBER} from './var-table.js';
import {STD_INS_DATA, STD_BY_OPCODE} from './std-table.js';
import {MSG_INS_DATA, MSG_BY_OPCODE} from './msg-table.js';

export function initAnm() {
  (window as any).ANM_INS_HANDLERS = ANM_INS_HANDLERS;
  (window as any).ANM_VAR_HANDLERS = ANM_VAR_HANDLERS;
  (window as any).STD_HANDLERS = STD_HANDLERS;
  (window as any).MSG_HANDLERS = MSG_HANDLERS;
  (window as any).setupGameSelector = <D extends CommonData>(handlers: TableHandlers<D>, $e: HTMLElement) => setupGameSelector(handlers, $e);
  (window as any).buildInsTable = <D extends CommonData>(handlers: TableHandlers<D>) => generateTablePageHtml(handlers);
  (window as any).buildVarTable = <D extends CommonData>(handlers: TableHandlers<D>) => generateTablePageHtml(handlers);
  (window as any).buildStatsTable = <D extends CommonData>(dataKey: 'ins' | 'var', handlers: TableHandlers<D>, $elem: HTMLElement) => buildStatsTable(dataKey, handlers, $elem);

  initInsNames(ANM_INS_HANDLERS); // "anm:th06:25" names
  initInsNames(STD_HANDLERS);
  initInsNames(MSG_HANDLERS);
  initVarNames(ANM_VAR_HANDLERS);
  initStats();

  for (const handlers of [ANM_INS_HANDLERS, STD_HANDLERS, MSG_HANDLERS]) {
    const {mainPrefix} = handlers;
    registerRefTipsForTable(handlers); // "ref:anm:" tips
    registerRefNamesForTable(handlers); // "ref:anm:" names
    globalRefLinks.registerPrefix(mainPrefix, (id, ctx) => getUrlByRef(`${mainPrefix}:${id}`, ctx, handlers));
  }
  // (typescript complains if we put var handlers and ins handlers in the same loop...)
  for (const handlers of [ANM_VAR_HANDLERS]) {
    const {mainPrefix} = handlers;
    registerRefTipsForTable(handlers); // "ref:anm:" tips
    registerRefNamesForTable(handlers); // "ref:anm:" names
    globalRefLinks.registerPrefix(mainPrefix, (id, ctx) => getUrlByRef(`${mainPrefix}:${id}`, ctx, handlers));
  }
}

/** Data for a specific numbered entity (e.g. a specific ANM opcode number) in a specific game. */
export type OpcodeRefData = {
  /**
   * Game independent crossref for this opcode.
   */
  ref: string,
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

/** Data for a specific numbered entity (e.g. a specific ANM opcode number) in a specific game. */
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

export type InsData = {
  sig: string,
  args: string[],
} & CommonData;

export type VarData = {
  type: VarType,
  mut: boolean,
} & CommonData;

/**
 * Ad-hoc interface used to factor out the differences between the tables so that we can write
 * code that works equally well on all of them.
 */
export type TableHandlers<Data> = {
  /** Page (URL s= field) where table is hosted. */
  tablePage: string,
  /** Turns opcode into the anchor (URL a= field) for that item on the table's page. */
  formatAnchor(num: number): string,

  /** E.g. 'instruction', 'variable'. For debug/error messages. */
  itemKindString: string,
  /** Prefix (e.g. `"anm"`) of crossrefs (e.g. `"anm:pos"`) and name keys (e.g. `"anm:v8:pos"`). */
  mainPrefix: string,
  /** Get table that maps an item id (portion of crossref after mainPrefix) to data about that item. */
  dataTable: StrMap<string, Data>,
  /**
   * Gives the crossref for a numbered entity (e.g. an opcode or variable number).
   *
   * Iterating the first table should produce games in ascending order.
   * Some games may be missing. There are NO GUARANTEES about iteration order of opcodes within a game.
   */
  tableByOpcode: Map<Game, NumMap<OpcodeRefData>>,
  /** Finds the opcode from a crossref. */
  reverseTable: StrMap<Game, StrMap<Ref, number>>,

  /** Resolver responsible for dispatching based on e.g. the 'v2' part of the namekey `anm:v2:pos`. */
  insNames: PrefixResolver<string>,

  /**
   * Gives the latest game containing each instruction, and its opcode in that game.
   *
   * Used when generating links to instructions that aren't on this page.
   */
  latestGameTable: StrMap<Ref, QualifiedOpcode>,

  /**
   * Get groups to build a table of contents from on the table page.
   *
   * If there's only one group, no table of contents is generated.
   */
  getGroups(game: Game): {min: number, max: number, title: string | null}[],

  /** Generate HTML for a tooltip header. */
  generateTipHeader(data: Data, _: {nameKey: string}): string,

  /** Generate a row of the table. */
  generateTableRowHtml(this: TableHandlers<Data>, game: Game, data: Data, opcode: number): string,

  /** Markdown content to place after summary and before Toc or Table. */
  textBeforeTable(c: Context): string | null,
}

/** Resolves names from the suffix of 'anm:' namekeys. */
const ANM_INS_NAMES = new PrefixResolver<string>();
/** Resolves names from the suffix of 'anmvar:' namekeys */
const ANM_VAR_NAMES = new PrefixResolver<string>();
/** Resolves names from the suffix of 'std:' namekeys */
const STD_INS_NAMES = new PrefixResolver<string>();
/** Resolves names from the suffix of 'msg:' namekeys */
const MSG_INS_NAMES = new PrefixResolver<string>();

type QualifiedOpcode = {game: Game, opcode: number};
type AutoGeneratedFields = 'latestGameTable' | 'reverseTable';

export const ANM_INS_HANDLERS: TableHandlers<InsData> = makeTableHandlers({
  tablePage: 'anm/ins',
  itemKindString: 'instruction',
  formatAnchor: (opcode: number) => `ins-${opcode}`,
  dataTable: ANM_INS_DATA,
  tableByOpcode: ANM_BY_OPCODE,
  insNames: ANM_INS_NAMES,
  mainPrefix: 'anm',
  generateTipHeader: generateInsSiggy,
  getGroups: (game) => GAME_ANM_VERSIONS[game] == 'v8' ? ANM_GROUPS_V8 : [{min: 0, max: 1300, title: null}],
  generateTableRowHtml: generateInsTableRowHtml,
  textBeforeTable: () => null,
});

export const ANM_VAR_HANDLERS: TableHandlers<VarData> = makeTableHandlers({
  tablePage: 'anm/var',
  itemKindString: 'variable',
  formatAnchor: (num: number) => `var-${num}`,
  dataTable: ANM_VAR_DATA,
  tableByOpcode: ANM_VARS_BY_NUMBER,
  insNames: ANM_VAR_NAMES,
  mainPrefix: 'anmvar',
  generateTipHeader: generateVarHeader,
  getGroups: () => [{min: 10000, max: 11000, title: null}],
  generateTableRowHtml: generateVarTableRowHtml,
  textBeforeTable: (c: Context) => (queryGame(c) === '06') ? '**EoSD ANM has no variables, _nerrrrd._**' : null,
});

export const STD_HANDLERS: TableHandlers<InsData> = makeTableHandlers({
  tablePage: 'std/ins',
  itemKindString: 'instruction',
  formatAnchor: (num: number) => `ins-${num}`,
  dataTable: STD_INS_DATA,
  tableByOpcode: STD_BY_OPCODE,
  insNames: STD_INS_NAMES,
  mainPrefix: 'std',
  generateTipHeader: generateInsSiggy,
  getGroups: () => [{min: 0, max: 100, title: null}],
  generateTableRowHtml: generateInsTableRowHtml,
  textBeforeTable: (c: Context) => (queryGame(c) > '09') ? null : dedent(`
    In games prior to [game=095], all STD instructions are the same size, with room for three arguments.
    Your version of \`thstd\` may or may not require you to always supply three arguments.  Thus, an
    argument of \`__\` below indicates a padding argument whose value is unused.
  `),
});

export const MSG_HANDLERS: TableHandlers<InsData> = makeTableHandlers({
  tablePage: 'msg/ins',
  itemKindString: 'instruction',
  formatAnchor: (num: number) => `ins-${num}`,
  dataTable: MSG_INS_DATA,
  tableByOpcode: MSG_BY_OPCODE,
  insNames: MSG_INS_NAMES,
  mainPrefix: 'msg',
  generateTipHeader: generateInsSiggy,
  getGroups: () => [{min: 0, max: 1000, title: null}],
  generateTableRowHtml: generateInsTableRowHtml,
  textBeforeTable: () => null,
});

//  FIXME:  MSG is TODO.  Versions don't make sense for MSG and I'm not sure how to handle this.
//          Versions probably conflate too many different ideas and we need to decouple them.
//
// const MSG_VERSION_INFO: VersionInfo<StdVersion> = {
//   getCurrentMaps: getCurrentMsgmaps,
//   supportedVersions: SUPPORTED_MSG_VERSIONS,
//   gameVersions: GAME_MSG_VERSIONS,
//   versionData: MSG_VERSION_DATA,
// };

function makeTableHandlers<T extends CommonData>(handlers: Without<TableHandlers<T>, AutoGeneratedFields>): TableHandlers<T> {
  const {tableByOpcode} = handlers;

  const latestGameTable: Record<Ref, QualifiedOpcode> = {};
  const reverseTable: StrMap<Game, StrMap<Ref, number>> = {};

  for (const [game, table] of tableByOpcode.entries()) {
    const reverseInner = reverseTable[game] = {} as StrMap<Ref, number>;

    for (const [opcode, {ref}] of NumMap.entries(table)) {
      if (ref === null) continue;

      latestGameTable[ref] = {game, opcode};
      reverseInner[ref] = opcode;
    }
  }
  return {...handlers, latestGameTable, reverseTable};
}

type Without<T, K> = {
  [L in Exclude<keyof T, K>]: T[L]
};

const ARGTYPES_HTML: StrMap<string, (name: string) => string> = {
  "S": (name: string) => /* html */`<span class="type int">int</span>&nbsp;${name}`,
  "s": (name: string) => /* html */`<span class="type int">short</span>&nbsp;${name}`,
  "b": (name: string) => /* html */`<span class="type int">byte</span>&nbsp;${name}`,
  "$": (name: string) => /* html */`<span class="type int mut">int&</span>&nbsp;${name}`,
  "f": (name: string) => /* html */`<span class="type float">float</span>&nbsp;${name}`,
  "%": (name: string) => /* html */`<span class="type float mut">float&</span>&nbsp;${name}`,
  "m": (name: string) => /* html */`<span class="type string">string</span>&nbsp;${name}`,
  "_": () => /* html */`<span class="type unused">__</span>`,
  "?": () => /* html */`<span class="type unknown">???...</span>`,
};

function setupGameSelector<D>({tableByOpcode}: TableHandlers<D>, $select: HTMLElement) {
  const supportedGames = tableByOpcode.keys();
  const currentQuery = parseQuery(window.location.hash);
  const currentGame = queryGame(currentQuery);
  for (const game of supportedGames) {
    const $option = document.createElement('option');
    $option.value = game;
    $option.text = `${gameData(game).thname} ~ ${gameData(game).long}`;
    if (game == currentGame) {
      $option.selected = true;
    }
    $select.appendChild($option);
  }

  $select.addEventListener('change', (ev: any) => {
    // to switch games, just set g= in the url
    const query = Object.assign({}, currentQuery, {g: ev.target.value});
    // clear the anchor; if the user is changing the dropbox, they're at the top of the page,
    // and we don't need it suddenly scrolling back to the last clicked opcode.
    delete query.a;
    window.location.href = queryUrl(query);
  });
}

// Adds e.g. a 'th095:' prefix to a name that isn't available on the current page.
function possiblyAddGamePrefix<D>(handlers: TableHandlers<D>, ref: Ref, s: string, ctx: Context) {
  const {reverseTable, latestGameTable} = handlers;
  if (ref == null) return s;

  if (reverseTable[queryGame(ctx)]?.[ref] == null) {
    const qualOpcode = latestGameTable[ref];
    if (qualOpcode) {
      return `th${qualOpcode.game}:${s}`;
    }
  }
  return s;
}

// init names for keys like `anm:th06:pos` and `std:th13:pos`
function initInsNames<D>(handlers: TableHandlers<D>) {
  const {tableByOpcode, mainPrefix, insNames} = handlers;

  for (const [game, tableForGame] of tableByOpcode) {
    const getDefaultName = (opcode: number) => `ins_${opcode}`;

    insNames.registerPrefix(`th${game}`, (suffix, ctx) => {
      const opcode = parseInt(suffix, 10);
      if (Number.isNaN(opcode)) return null;

      const entry = tableForGame[opcode];
      if (entry == null) return null;

      const name = globalRefNames.getNow(entry.ref, ctx) || getDefaultName(opcode);
      return possiblyAddGamePrefix(handlers, entry.ref, name, ctx);
    });
  }
  globalNames.registerPrefix(mainPrefix, insNames);
}

function initVarNames(handlers: TableHandlers<VarData>) {
  // (this is sufficiently different from instructions that we'll just put up with the copypasta)
  const {tableByOpcode, mainPrefix, insNames} = handlers;

  for (const [game, tableForGame] of tableByOpcode) {
    const getDefaultName = (opcode: number, type: VarType) => `[${opcode}${type === '%' ? '.0f' : ''}]`;

    const getMappedName = (opcode: number, ref: Ref, type: VarType, ctx: Context) => {
      const name = ref ? globalRefNames.getNow(ref, ctx): null;

      if (name == null) return getDefaultName(opcode, type);
      return type + name;
    };

    insNames.registerPrefix(`th${game}`, (suffix, ctx) => {
      const opcode = parseInt(suffix, 10);
      if (Number.isNaN(opcode)) return null;

      const entry = tableForGame[opcode];
      if (entry == null) return null;

      // Variables are always required to have crossrefs associated with them so that we can get the type
      const {type} = getDataByRef(entry.ref, handlers)!;
      const name = getMappedName(opcode, entry.ref, type, ctx) || getDefaultName(opcode, type);
      return possiblyAddGamePrefix(handlers, entry.ref, name, ctx);
    });
  }
  globalNames.registerPrefix(mainPrefix, insNames);
}

function registerRefTipsForTable<D extends CommonData>(tableHandlers: TableHandlers<D>) {
  const {mainPrefix, dataTable} = tableHandlers;
  globalRefTips.registerPrefix(mainPrefix, (id, ctx) => {
    const ins = dataTable[id];
    if (!ins) return null;

    const ref = `${mainPrefix}:${id}`;
    return generateTip(ins, ref, ctx, tableHandlers);
  });
}

// make namekey `ref:anm:thing` map to `cfg:anm:thing`
function registerRefNamesForTable<D>(tableHandlers: TableHandlers<D>) {
  const {mainPrefix} = tableHandlers;
  globalRefNames.registerPrefix(mainPrefix, (id, ctx) => {
    return globalConfigNames.getNow(`${mainPrefix}:${id}`, ctx);
  });
}

function generateTablePageHtml<D extends CommonData>(tableHandlers: TableHandlers<D>) {
  const {getGroups, mainPrefix, textBeforeTable} = tableHandlers;

  const currentQuery = parseQuery(window.location.hash);
  const game = queryGame(currentQuery);

  let total = 0;
  let documented = 0;
  const groups = getGroups(game);

  const shouldHaveToc = groups.length > 1;
  let base = "";
  let toc = "";
  let table = "";
  if (shouldHaveToc) {
    toc += /* html */`<div class='toc'><h3>Navigation</h3><ul>`;
  }

  for (const group of groups) {
    if (shouldHaveToc) {
      const groupAnchor = `group-${group.min}`;
      const navQuery = Object.assign({}, currentQuery, {a: groupAnchor});
      const navDest = queryUrl(navQuery);
      toc += /* html */`<li><a href="${navDest}">${group.title} (${group.min}..)</a></li>`;
      table += /* html */`\n<h2 id="${groupAnchor}"><a class="self-link" href="${navDest}">${group.min}-${group.max}: ${group.title}</a></h2>`;
    }

    table += /* html */`<table class='ins-table'>`;
    for (let opcode=group.min; opcode<=group.max; ++opcode) {
      const refObj = getRefByOpcode(game, opcode, tableHandlers);
      if (refObj == null) continue; // instruction doesn't exist

      // instruction exists, but our docs may suck
      let {ref, wip} = refObj;
      const data = getDataByRef(ref, tableHandlers);
      if (!data) {
        // instruction is assigned, but ref has no entry in table
        throw new Error(`ref ${ref} is assigned to ${mainPrefix} number ${game}:${opcode} but has no data`);
      }
      wip = Math.max(wip, data.wip) as Wip;

      if (wip === 0) {
        documented += 1;
      }
      total += 1;
      table += tableHandlers.generateTableRowHtml(game, data, opcode);
    }

    table += "</table>";
  }
  if (shouldHaveToc) toc += "</ul></div>";

  // Even though this is right next to the dropdown, the current game is displayed here for the sake of pages like the var-table
  // that can refresh so quickly that it can be hard to realize that the page did in fact respond to changing the dropdown selection.
  base += `Now showing: [game-thlong=${game}]<br>`;

  if (total > 0) {
    base += `Documented rate: ${documented}/${total} (${(documented/total*100).toFixed(2)}%)<br>`;
    base += "[wip=1]Items marked like this are not fully understood.[/wip]<br>[wip=2]Items like this are complete mysteries.[/wip]";
  }

  let textAbove;
  if (textAbove = textBeforeTable(currentQuery)) {
    base = `${base}<br><br>${textAbove}`;
  }

  const $out = parseHtmlElement('<div>' + MD.makeHtml(base) + MD.makeHtml(toc) + table + '</div>');
  postprocessConvertedMarkdown($out);
  globalNames.transformHtml($out, currentQuery);
  globalLinks.transformHtml($out, currentQuery);
  return $out;
}

function parseHtmlElement(html: string) {
  const $tmp = document.createElement('div');
  $tmp.innerHTML = html;
  return $tmp.firstElementChild! as HTMLElement;
}

function generateInsSiggy(ins: InsData, {nameKey}: {nameKey: string}) {
  const lParen = /* html */`<span class="punct">${"("}</span>`;
  const rParen = /* html */`<span class="punct">${")"}</span>`;
  const params = /* html */`<span class="ins-params">${generateInsParameters(ins)}</span>`;
  let name = globalNames.getHtml(nameKey);
  name = /* html */`<span class="ins-name" data-wip="${ins.wip}">${name}</span>`;
  return /* html */`<div class="ins-siggy-wrapper">${name}${lParen}${params}${rParen}</div>`;
}

function generateVarHeader(avar: VarData, {nameKey}: {nameKey: string}) {
  const name = globalNames.getHtml(nameKey);
  return /* html */`<span class="var-header" data-wip="${avar.wip}">${name}</span>`;
}

/** @this */ // appease eslint
function generateInsTableRowHtml<D>(this: TableHandlers<D>, game: Game, ins: InsData, opcode: number) {
  const nameKey = getOpcodeNameKey(this, game, opcode);
  let [desc] = handleTipHide(ins.desc, false);
  desc = postprocessAnmDesc(desc, false);

  const selfLinkTarget = currentUrlWithProps({a: `ins-${opcode}`});
  return /* html */`
  <tr class="ins-table-entry" id="ins-${opcode}">
    <td class="col-id"><a class="self-link" href="${selfLinkTarget}">${opcode}</a></td>
    <td class="col-name">${generateInsSiggy(ins, {nameKey})}</td>
    <td class="col-desc">${desc}</td>
  </tr>
  `;
}

/** @this */ // appease eslint
function generateVarTableRowHtml<D>(this: TableHandlers<D>, game: Game, ins: VarData, opcode: number) {
  const nameKey = getOpcodeNameKey(this, game, opcode);
  let [desc] = handleTipHide(ins.desc, false);
  desc = postprocessAnmDesc(desc, false);

  const selfLinkTarget = currentUrlWithProps({a: `var-${opcode}`});
  // FIXME: add a mutability column.
  return /* html */`
  <tr class="ins-table-entry" id="var-${opcode}">
    <td class="col-id"><a class="self-link" href="${selfLinkTarget}">${opcode}</a></td>
    <td class="col-name">${generateVarHeader(ins, {nameKey})}</td>
    <td class="col-desc">${desc}</td>
  </tr>
  `;
}

function getOpcodeNameKey<D>(handlers: TableHandlers<D>, game: Game, opcode: number) {
  return `${handlers.mainPrefix}:th${game}:${opcode}`;
}

function generateInsParameters(ins: InsData) {
  const comma = /* html */`<span class="punct">${","}</span>`;
  let ret = "";
  for (let i=0; i<ins.args.length; ++i) {
    switch (i) {
      // Allow breaking after the opening parenthesis
      case 0: ret += `<wbr>`; break;
      default: ret += `${comma} `; break;
    }
    ret += ARGTYPES_HTML[ins.sig[i]]!(ins.args[i]);
  }
  return ret;
}

function handleTipHide(desc: string, isTip: boolean): [string, boolean] {
  const hasHidden = !!desc.match(/\[tiphide\]/g);
  // note: we also strip space with *at most* one newline so that [tiphide] or [/tiphide]
  // sitting on its own line doesn't become a paragraph break in markdown when stripped.
  if (isTip) {
    desc = desc.replace(/ *\n? *\[tiphide\][^]*?\[\/tiphide\]/g, '');
  } else {
    desc = desc.replace(/ *\n? *\[(\/)?tiphide\]/g, '');
  }
  return [desc, hasHidden];
}

function postprocessAnmDesc(desc: string, isTip: boolean) {
  let ret = desc;
  if (isTip) {
    ret = disableTooltips(ret);
  }
  return MD.makeHtml(ret);
}

function disableTooltips(desc: string) {
  return desc.replace(/\[ref=/g, "[ref-notip=");
}

function getRefByOpcode<D>(game: Game, opcode: number, tableHandlers: TableHandlers<D>) {
  const {tableByOpcode} = tableHandlers;

  const entry = tableByOpcode.get(game)?.[opcode];
  if (entry === undefined) return null; // opcode doesn't exist in game

  const out = Object.assign({}, entry);
  out.wip = out.wip || 0;
  return out;
}

function stripRefPrefix(prefix: string, ref: Ref) {
  if (!ref.startsWith(`${prefix}:`)) {
    throw new Error(`expected ${prefix} ref, got "${ref}"`);
  }
  return ref.substring(prefix.length + 1);
}

// Get instruction data for an 'anm:' or 'anmvar:' ref id.
function getDataByRef<D>(ref: string, {mainPrefix, dataTable}: TableHandlers<D>) {
  const id = stripRefPrefix(mainPrefix, ref);

  const out = dataTable[id];
  if (out == null) {
    window.console.warn(`bad ${mainPrefix} crossref: ${id}`);
    return null;
  }
  return out;
}

function generateTip<D extends CommonData>(data: D, ref: Ref, context: Context, tableHandlers: TableHandlers<D>) {
  const {generateTipHeader} = tableHandlers;
  const [desc, omittedInfo] = handleTipHide(data.desc, true);
  const contents = postprocessAnmDesc(desc, true);
  const heading = generateTipHeader(data, {nameKey: getRefNameKey(ref)});
  return {heading, contents, omittedInfo};
}

function getUrlByRef<D>(ref: string, context: Context, tableHandlers: TableHandlers<D>) {
  const {reverseTable, tablePage, formatAnchor, latestGameTable} = tableHandlers;

  // On the same page: try to preserve full URL except anchor.
  // On different page: Just preserve things that share meaning across pages.
  //   (E.g. we want UFO var table to link to UFO ins table rather than WBaWC when possible.)
  let query: Query;
  if (queryPageEquals(context, {s: tablePage})) {
    query = {...context};
  } else {
    query = {...queryFilterCommonProps(context), s: tablePage} as any;
  }

  const game = queryGame(query);
  let table, opcode;
  if ((table = reverseTable[game]) && (opcode = table[ref]) != null && opcode != null) {
    // available in same game, keep context.g exactly as it is
  } else {
    // not available in same game, use latest game that has it
    const qualOpcode = latestGameTable[ref];
    if (!qualOpcode) return null; // ref does not exist

    // get opcode from latest game
    opcode = reverseTable[qualOpcode.game]![ref]!;
    query.g = qualOpcode.game;
  }
  query.a = formatAnchor(opcode);

  return queryUrl(query);
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
export function makeRefGameIndependent<D extends CommonData>(ref: string, tableHandlers: TableHandlers<D>) {
  for (let attempt=0; attempt < 100; attempt++) {
    const {succ} = getDataByRef(ref, tableHandlers)!;
    if (!succ) return ref;

    ref = `${tableHandlers.mainPrefix}:${succ}`;
  }
  throw new Error(`could not make ref ${ref} game-independent; may be a cycle in successors`);
}
