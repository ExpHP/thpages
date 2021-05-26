import * as React from 'react';
import ReactDOMServer from 'react-dom/server';

import dedent from '../lib/dedent';
import {globalRefNames, globalRefTips, globalRefLinks, getRefNameKey, Ref} from '../ref';
import {MD, postprocessConvertedMarkdown} from '../markdown';
import {globalNames, globalLinks, PrefixResolver, Context} from '../resolver';
import {parseQuery, queryUrl, queryGame, queryPageEquals, queryFilterCommonProps, Query, currentUrlWithProps} from '../url-format';
import {gameData, Game} from '../game-names';
import {globalConfigNames, requireMaps} from '../settings';
import {initStats, buildStatsTable} from './stats';
import {StrMap, NumMap} from "../util";
import {Err} from "../common-components";
import './layer-viewer';

import {ANM_INS_DATA, ANM_BY_OPCODE, ANM_GROUPS_V8} from './ins-table.js';
import {ANM_VAR_DATA, ANM_VARS_BY_NUMBER} from './var-table.js';
import {STD_INS_DATA, STD_BY_OPCODE} from './std-table.js';
import {MSG_INS_DATA, MSG_BY_OPCODE, getMsgTableText} from './msg-table.js';

const {Fragment} = React;

export function initAnm() {
  (window as any).ANM_INS_HANDLERS = ANM_INS_HANDLERS;
  (window as any).ANM_VAR_HANDLERS = ANM_VAR_HANDLERS;
  (window as any).STD_HANDLERS = STD_HANDLERS;
  (window as any).MSG_HANDLERS = MSG_HANDLERS;
  (window as any).setupGameSelector = <D extends CommonData>(handlers: TableHandlers<D>, $e: HTMLElement) => setupGameSelector(handlers, $e);
  (window as any).buildInsTable = <D extends InsData>(handlers: TableHandlers<D>) => generateTablePageHtml(handlers);
  (window as any).buildVarTable = <D extends VarData>(handlers: TableHandlers<D>) => generateTablePageHtml(handlers);
  (window as any).buildStatsTable = <D extends CommonData>(dataKey: [string, 'ins' | 'var'], handlers: TableHandlers<D>, $elem: HTMLElement) => buildStatsTable(dataKey, handlers, $elem);

  initNames(ANM_INS_HANDLERS); // "anm:th06:25" names
  initNames(STD_HANDLERS);
  initNames(MSG_HANDLERS);
  initNames(ANM_VAR_HANDLERS);
  initStats();

  for (const handlers of [ANM_INS_HANDLERS, ANM_VAR_HANDLERS, STD_HANDLERS, MSG_HANDLERS]) {
    const gHandlers = handlers as TableHandlers<CommonData>; // because typescript memes
    const {mainPrefix} = gHandlers;
    registerRefTipsForTable(gHandlers); // "ref:anm:" tips
    registerRefNamesForTable(gHandlers); // "ref:anm:" names
    globalRefLinks.registerPrefix(mainPrefix, (id, ctx) => getUrlByRef(`${mainPrefix}:${id}`, ctx, gHandlers));
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

export type Group = {
  min: number,
  max: number,
  title: string | null,
};

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
  getGroups(game: Game): Group[],

  /** Generate HTML for a tooltip header. */
  TipHeader(props: {data: Data, nameKey: string}): JSX.Element,

  /** Generate a row of the table. */
  TableRowHtml(props: {handlers: TableHandlers<Data>, game: Game, data: Data, opcode: number}): JSX.Element,

  /** Markdown content to place after summary and before Toc or Table. */
  textBeforeTable(c: Context): string | null,

  /** Generate a default name. (e.g. `ins_32`, `[10002]`...) */
  getDefaultName(opcode: number, data: Data): string,

  /** Will turn `IO` into `$IO` for vars. (but is not applied to `[10002]`) */
  addTypeSigilIfNeeded(name: string, data: Data): string,
}
type GenerateTableRowHtml<Data> = (this: TableHandlers<Data>, game: Game, data: Data, opcode: number) => string;

/** Resolves names from the suffix of 'anm:' namekeys. */
const ANM_INS_NAMES = new PrefixResolver<string>();
/** Resolves names from the suffix of 'anmvar:' namekeys */
const ANM_VAR_NAMES = new PrefixResolver<string>();
/** Resolves names from the suffix of 'std:' namekeys */
const STD_INS_NAMES = new PrefixResolver<string>();
/** Resolves names from the suffix of 'msg:' namekeys */
const MSG_INS_NAMES = new PrefixResolver<string>();

export type QualifiedOpcode = {game: Game, opcode: number};
type AutoGeneratedFields = 'latestGameTable' | 'reverseTable';

const COMMON_INS_HANDLERS = {
  itemKindString: 'instruction',
  formatAnchor: (opcode: number) => `ins-${opcode}`,
  TipHeader: InsSiggy,
  TableRowHtml: InsTableRowHtml,
  getDefaultName: (opcode: number) => `ins_${opcode}`,
  addTypeSigilIfNeeded: (name: string) => name,
};

const COMMON_VAR_HANDLERS = {
  itemKindString: 'variable',
  formatAnchor: (opcode: number) => `var-${opcode}`,
  TipHeader: VarHeader,
  TableRowHtml: VarTableRowHtml,
  getDefaultName: (opcode: number, {type}: VarData) => `[${opcode}${type === '%' ? '.0f' : ''}]`,
  addTypeSigilIfNeeded: (name: string, {type}: VarData) => name[0] == '[' ? name : type + name,
};

const ANM_INS_HANDLERS: TableHandlers<InsData> = makeTableHandlers({
  ...COMMON_INS_HANDLERS,
  tablePage: 'anm/ins',
  dataTable: ANM_INS_DATA,
  tableByOpcode: ANM_BY_OPCODE,
  insNames: ANM_INS_NAMES,
  mainPrefix: 'anm',
  getGroups: (game) => '13' <= game ? ANM_GROUPS_V8 : [{min: 0, max: 1300, title: null}],
  textBeforeTable: () => null,
});

const ANM_VAR_HANDLERS: TableHandlers<VarData> = makeTableHandlers({
  ...COMMON_VAR_HANDLERS,
  tablePage: 'anm/var',
  dataTable: ANM_VAR_DATA,
  tableByOpcode: ANM_VARS_BY_NUMBER,
  insNames: ANM_VAR_NAMES,
  mainPrefix: 'anmvar',
  getGroups: () => [{min: 10000, max: 11000, title: null}],
  textBeforeTable: (c: Context) => (queryGame(c) === '06') ? '**EoSD ANM has no variables, _nerrrrd._**' : null,
});

const STD_HANDLERS: TableHandlers<InsData> = makeTableHandlers({
  ...COMMON_INS_HANDLERS,
  tablePage: 'std/ins',
  dataTable: STD_INS_DATA,
  tableByOpcode: STD_BY_OPCODE,
  insNames: STD_INS_NAMES,
  mainPrefix: 'std',
  getGroups: () => [{min: 0, max: 100, title: null}],
  textBeforeTable: (c: Context) => (queryGame(c) > '09') ? null : dedent(`
    In games prior to [game=095], all STD instructions are the same size, with room for three arguments.
    An argument of \`__\` below indicates a padding argument whose value is unused. \`thstd\` requires
    you to always supply three arguments, while [\`trustd\`](https://github.com/ExpHP/truth#readme) allows
    these padding arguments to be omitted.
  `),
});

const MSG_HANDLERS: TableHandlers<InsData> = makeTableHandlers({
  ...COMMON_INS_HANDLERS,
  tablePage: 'msg/ins',
  dataTable: MSG_INS_DATA,
  tableByOpcode: MSG_BY_OPCODE,
  insNames: MSG_INS_NAMES,
  mainPrefix: 'msg',
  getGroups: () => [{min: 0, max: 1000, title: null}],
  textBeforeTable: (c: Context) => getMsgTableText(queryGame(c)),
});

// These have to be 'function' due to cyclic imports.
export function getAnmInsHandlers() { return ANM_INS_HANDLERS; }
export function getAnmVarHandlers() { return ANM_VAR_HANDLERS; }
export function getStdHandlers() { return STD_HANDLERS; }
export function getMsgHandlers() { return MSG_HANDLERS; }

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

// init names for keys like `anm:th18:431` and `std:th13:23`
function initNames<D extends CommonData>(handlers: TableHandlers<D>) {
  const {tableByOpcode, mainPrefix, insNames} = handlers;

  for (const [game, tableForGame] of tableByOpcode) {
    insNames.registerPrefix(`th${game}`, (suffix, ctx) => {
      const opcode = parseInt(suffix, 10);
      if (Number.isNaN(opcode)) return null;

      const entry = tableForGame[opcode];
      if (entry == null) return null;

      return globalRefNames.getNow(entry.ref, ctx);
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

// make namekey `ref:anm:thing` map to `anm:th08:32`
function registerRefNamesForTable<D>(tableHandlers: TableHandlers<D>) {
  const {mainPrefix} = tableHandlers;
  globalRefNames.registerPrefix(mainPrefix, (id, ctx) => {
    requireMaps(); // make sure config names are loaded
    return globalConfigNames.getNow(`${mainPrefix}:${id}`, ctx);
  });
}

function range(start: number, end: number) {
  return [...new Array(end - start).keys()].map((x) => x + start);
}

function generateTablePageHtml<D extends CommonData>(tableHandlers: TableHandlers<D>) {
  const {getGroups, mainPrefix, textBeforeTable, TableRowHtml} = tableHandlers;

  const currentQuery = parseQuery(window.location.hash);
  const game = queryGame(currentQuery);

  let total = 0;
  let documented = 0;
  const groups = getGroups(game);

  const shouldHaveToc = groups.length > 1;
  const tocData: {group: Group, navDest: string}[] = [];

  const contentSections = groups.map((group) => {
    let possibleHeader = null;
    if (shouldHaveToc) {
      const groupAnchor = `group-${group.min}`;
      const navQuery = Object.assign({}, currentQuery, {a: groupAnchor});
      const navDest = queryUrl(navQuery);
      tocData.push({group, navDest});
      possibleHeader = <h2 id={groupAnchor}><a className="self-link" href={navDest}>{group.min}-{group.max}: {group.title}</a></h2>;
    }

    const rows = range(group.min, group.max + 1).map((opcode) => {
      const refObj = getRefByOpcode(game, opcode, tableHandlers);
      if (refObj == null) return null; // instruction doesn't exist

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
      return <TableRowHtml key={opcode} {...{handlers: tableHandlers, game, data, opcode}} />;
    }).filter((x) => x);

    return <Fragment key={group.min}>
      {possibleHeader}
      <table className='ins-table'>{rows}</table>
    </Fragment>;
  });
  const content = <Fragment>{contentSections}</Fragment>;

  let toc = null;
  if (shouldHaveToc) {
    toc = <div className='toc'>
      <h3>Navigation</h3>
      <ul>{tocData.map(({group, navDest}) =>
        <li key={group.min}><a href={navDest}>{group.title} ({group.min}..)</a></li>,
      )}</ul>
    </div>;
  }

  // Even though this is right next to the dropdown, the current game is displayed here for the sake of pages like the var-table
  // that can refresh so quickly that it can be hard to realize that the page did in fact respond to changing the dropdown selection.
  let baseMd = "";
  baseMd += `Now showing: [game-thlong=${game}]<br>`;

  if (total > 0) {
    baseMd += `Documented rate: ${documented}/${total} (${(documented/total*100).toFixed(2)}%)<br>`;
    baseMd += "[wip=1]Items marked like this are not fully understood.[/wip]<br>[wip=2]Items like this are complete mysteries.[/wip]";
  }

  let textAbove;
  if (textAbove = textBeforeTable(currentQuery)) {
    baseMd = `${baseMd}<br><br>${textAbove}`;
  }

  const out = <div>
    <div dangerouslySetInnerHTML={{__html: MD.makeHtml(baseMd)}} />  {/* FIXME BAD */}
    {toc}
    {content}
  </div>;

  // FIXME BAD BAD BAD this entirely defeats the purpose of React but we have to do it
  //                   until I exorcise showdown and all of our ugly hacks around it
  const $out = jsxToHtmlElement(out);

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

// FIXME: Every place that calls this function is BAD BAD BAD
//        and this is only a workaround until we fix other things
function jsxToHtmlElement(react: JSX.Element) {
  return parseHtmlElement(ReactDOMServer.renderToString(react));
}

/* eslint-disable react/display-name */
const INS_PARAMETER_TABLE: {[s: string]: (name: string) => JSX.Element} = {
  "S": (name: string) => <Fragment><span className="type int">int</span>&nbsp;{name}</Fragment>,
  "s": (name: string) => <Fragment><span className="type int">short</span>&nbsp;{name}</Fragment>,
  "b": (name: string) => <Fragment><span className="type int">byte</span>&nbsp;{name}</Fragment>,
  "$": (name: string) => <Fragment><span className="type int mut">{"int&"}</span>&nbsp;{name}</Fragment>,
  "f": (name: string) => <Fragment><span className="type float">float</span>&nbsp;{name}</Fragment>,
  "%": (name: string) => <Fragment><span className="type float mut">{"float&"}</span>&nbsp;{name}</Fragment>,
  "m": (name: string) => <Fragment><span className="type string">string</span>&nbsp;{name}</Fragment>,
  "_": () => <Fragment><span className="type unused">__</span></Fragment>,
  "?": () => <Fragment><span className="type unknown">???...</span></Fragment>,
};
/* eslint-enable */

function InsParameter({type, name}: {type: string, name: string}) {
  const err = () => <Err kind="BAD_TYPE" args={`'${type}', '${name}'`} />;
  const body = (INS_PARAMETER_TABLE[type] || err)(name);
  return <span className="ins-params">{body}</span>;
}

function InsParameters({ins}: {ins: InsData}) {
  const comma = <span className="punct">${", "}</span>;
  const ret = [];
  for (let i=0; i<ins.args.length; ++i) {
    switch (i) {
      // Allow breaking after the opening parenthesis
      case 0: ret.push(<wbr />); break;
      default: ret.push(comma); break;
    }
    ret.push(<InsParameter type={ins.sig[i]} name={ins.args[i]} />);
  }
  return <React.Fragment>{ret}</React.Fragment>;
}

function InsSiggy({data, nameKey}: {data: InsData, nameKey: string}) {
  const name = globalNames.getReact(nameKey);
  return <div className="ins-siggy-wrapper">
    <span className="ins-name" data-wip={data.wip}>{name}</span>
    <span className="punct">(</span>
    <InsParameters ins={data} />
    <span className="punct">)</span>
  </div>;
}

function VarHeader({data, nameKey}: {data: VarData, nameKey: string}) {
  const name = globalNames.getReact(nameKey);
  return <span className="var-header" data-wip={data.wip}>{name}</span>;
}

function InsTableRowHtml(props: {handlers: TableHandlers<InsData>, game: Game, data: InsData, opcode: number}) {
  const {handlers, game, data, opcode} = props;
  const nameKey = getOpcodeNameKey(handlers, game, opcode);
  let [desc] = handleTipHide(data.desc, false);
  desc = postprocessAnmDesc(desc, false);

  const anchor = handlers.formatAnchor(opcode);
  const selfLinkTarget = currentUrlWithProps({a: anchor});
  return <tr className="ins-table-entry" id={anchor}>
    <td className="col-id"><a className="self-link" href={selfLinkTarget}>{opcode}</a></td>
    <td className="col-name"><InsSiggy data={data} nameKey={nameKey} /></td>
    <td className="col-desc" dangerouslySetInnerHTML={{__html: desc}} />  {/* FIXME BAD */}
  </tr>;
}

function VarTableRowHtml(props: {handlers: TableHandlers<VarData>, game: Game, data: VarData, opcode: number}) {
  const {handlers, game, data, opcode} = props;
  const nameKey = getOpcodeNameKey(handlers, game, opcode);
  let [desc] = handleTipHide(data.desc, false);
  desc = postprocessAnmDesc(desc, false);

  const anchor = handlers.formatAnchor(opcode);
  const selfLinkTarget = currentUrlWithProps({a: anchor});
  // FIXME: add a mutability column.
  return <tr className="ins-table-entry" id={anchor}>
    <td className="col-id"><a className="self-link" href={selfLinkTarget}>{opcode}</a></td>
    <td className="col-name"><VarHeader data={data} nameKey={nameKey} /></td>
    <td className="col-desc" dangerouslySetInnerHTML={{__html: desc}} />  {/* FIXME BAD */}
  </tr>;
}

function getOpcodeNameKey<D>(handlers: TableHandlers<D>, game: Game, opcode: number) {
  return `${handlers.mainPrefix}:th${game}:${opcode}`;
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
export function getDataByRef<D>(ref: string, {mainPrefix, dataTable}: TableHandlers<D>): D | null {
  const id = stripRefPrefix(mainPrefix, ref);

  const out = dataTable[id];
  if (out == null) {
    window.console.warn(`bad ${mainPrefix} crossref: ${id}`);
    return null;
  }
  return out;
}

function generateTip<D extends CommonData>(data: D, ref: Ref, context: Context, tableHandlers: TableHandlers<D>) {
  const {TipHeader} = tableHandlers;
  const [desc, omittedInfo] = handleTipHide(data.desc, true);
  const contents = postprocessAnmDesc(desc, true);
  const heading = <TipHeader data={data} nameKey={getRefNameKey(ref)} />;
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
