import {Game, allGames, gameData} from '../game-names';
import {GAME_ANM_VERSIONS} from './versions';
import {INS_HANDLERS, VAR_HANDLERS} from './main.js';
import {globalNames, globalLinks, PrefixResolver} from '../resolver';
import {GridViewScroll} from '../lib/gridviewscroll';
import {MD} from '../markdown';
import {parseQuery} from '../url-format';
import {globalTips, Tip} from '../tips';

type CellData = {
  total: number, // total uses of an instruction in a game, across all anm files
  breakdown: [string, number][], // maps filename to usage count, by descending usage count (no zeros)
};
type OpcodeStr = string;
type NameKey = string;
type StatsByOpcode = Record<Game, Record<OpcodeStr, CellData>>;
type Stats = {
  numFiles: Record<Game, number>,
  ins: StatsByOpcode,
  var: StatsByOpcode,
};
type StatsByNameKey = Map<NameKey, Map<Game, CellData>>;

const statsJson: Promise<Stats> = fetch('content/anm/anm-stats.json').then(async (text) => {
  const out: any = await text.json();
  out.numFiles = out['num-files'];
  delete out['num-files'];
  return out;
});

const STATS_TIPS = new PrefixResolver<Tip>();

export function initStats() {
  globalTips.registerPrefix('stats', STATS_TIPS);
}

export async function buildInsStatsTable($elem: HTMLElement) {
  const statsRaw = await statsJson;
  const stats = buildStatsTable($elem, statsRaw.ins, INS_HANDLERS);
  registerStatsTips(statsRaw, stats, INS_HANDLERS);
}

export async function buildVarStatsTable($elem: HTMLElement) {
  const statsRaw = await statsJson;
  const stats = buildStatsTable($elem, statsRaw.var, VAR_HANDLERS);
  registerStatsTips(statsRaw, stats, VAR_HANDLERS);
}

function buildStatsTable($elem: HTMLElement, statsByOpcode: StatsByOpcode, tableHandlers: any): StatsByNameKey {
  const dataByRow = getStatsRows(statsByOpcode, tableHandlers);

  let tableBody = '';

  tableBody += '<tr class="GridViewScrollHeader">';
  tableBody += `<th>ANM stats</th>`;
  for (const game of allGames()) {
    tableBody += `<th style="color: ${gameData(game).color};">${gameData(game).thname}</th>`;
    // headerRow += `<td style="color: ${gameData(game).color};">&mdash;</td>`;
  }
  tableBody += '</tr>';

  for (const [nameKey, rowData] of dataByRow) {
    if (nameKey.startsWith('ref:')) {
      tableBody += /* html */ `<tr class="GridViewScrollItem"><th>[ref=${nameKey.substring(4)}]</th>`;
    } else {
      tableBody += /* html */ `<tr class="GridViewScrollItem"><th><code>${globalNames.getHtml(nameKey)}</code></th>`;
    }
    for (const game of allGames()) {
      const tipId = `stats:${tableHandlers.mainPrefix}:${game}:${nameKey}`;
      const cellData = rowData.get(game);
      if (cellData && cellData.total === undefined) console.error(cellData);

      let cellText;
      if (!cellData) cellText = `<span class="na"></span>`;
      else if (cellData.total === 0) cellText = `<span class="zero">0</span>`;
      else cellText = `${cellData.total}`;

      tableBody += `<td data-tip-id="${tipId}">${cellText}</td>`;
    }
    tableBody += '</tr>';
  }

  if (!$elem.id) {
    console.error('stats table element needs an id');
  }
  $elem.classList.add("stats-table");
  $elem.innerHTML = MD.makeHtml(`<table><tbody>${tableBody}</tbody></table>`);

  const context = parseQuery(window.location.hash);
  globalNames.transformHtml($elem, context);
  globalLinks.transformHtml($elem, context);

  const grid = new GridViewScroll({
    table: $elem.querySelector<HTMLTableElement>(':scope > table')!,
    container: $elem,
    frozenHeaderCssClass: "frozen-header",
    frozenLeftCssClass: "frozen-col",
    freezeHeaderRows: 1,
    freezeLeftColumns: 1,
  });

  grid.enhance();

  const maxContainerSize = grid.maxContainerSize();
  $elem.style.maxWidth = `${maxContainerSize.width}px`;
  $elem.style.maxHeight = `${maxContainerSize.height}px`;

  const ResizeObserver = (window as any).ResizeObserver as any;
  if (ResizeObserver) {
    new ResizeObserver(() => grid.resize()).observe($elem);
  }

  return new Map(dataByRow);
}

function getStatsRows(statsByOpcode: StatsByOpcode, tableHandlers: any) {
  const {tableByOpcode, mainPrefix, itemKindString} = tableHandlers;

  // We use namekeys to identify things here so that we can also show stats for instructions
  // that have no crossref yet.
  const out: [NameKey, Map<Game, CellData>][] = [];

  // order:  - instructions from latest game, by opcode.
  //         - then instructions that are not in that game, ordered by previous game opcode. and etc.
  const keyIndices = new Map<NameKey, number>();
  for (const [gameStr, innerByOpcode] of reversed<[string, any]>(tableByOpcode.entries())) {
    const game = gameStr as Game;
    const srcInner = statsByOpcode[game];
    const version = GAME_ANM_VERSIONS[game];
    const opcodes = Array.from(Object.keys(innerByOpcode as object));
    opcodes.sort();
    opcodes.reverse();

    for (const [opcodeStr, {ref}] of Object.entries<{ref: string | null}>(innerByOpcode)) {
      const nameKey = (ref === null) ? `${mainPrefix}:${version}:${opcodeStr}` : `ref:${ref}`;
      if (!keyIndices.has(nameKey)) {
        keyIndices.set(nameKey, out.length);
        out.push([nameKey, new Map()]);
      }
      const [, destMap] = out[keyIndices.get(nameKey)!];

      const cellData: CellData = srcInner[opcodeStr] || {total: 0, breakdown: []};
      delete srcInner[opcodeStr];

      destMap.set(game, cellData);
    }

    for (const opcodeStr of Object.keys(srcInner)) {
      console.error(`game ${game} uses ${itemKindString} ${opcodeStr} but it's not in our table!`);
    }
  }
  return out;
}

function registerStatsTips(statsRaw: Stats, table: StatsByNameKey, tableHandlers: any) {
  const tipPrefix: string = tableHandlers.mainPrefix;
  if (!tipPrefix) throw new Error('bug!'); // since we're using 'any'...

  STATS_TIPS.registerPrefix(tipPrefix, (suffix) => {
    const [gameStr, nameKey] = suffix.split(/:(.+)/);
    const game = gameStr as Game;
    const cellData = table.get(nameKey)!.get(game);
    if (!cellData) return null;

    let tipMd = `Used in ${cellData.breakdown.length} of ${statsRaw.numFiles[game]} files.\n\n`;
    for (const [filename, uses] of cellData.breakdown.slice(0, 5)) {
      tipMd += `* ${uses} uses in <code>${filename}</code>\n`;
    }
    const html: string = MD.makeHtml(tipMd);
    return {
      contents: html,
      omittedInfo: false,
    };
  });
}

function reversed<T>(iter: Iterable<T>) {
  return Array.from(iter).reverse();
}
