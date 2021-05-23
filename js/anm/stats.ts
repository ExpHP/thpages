import {Game, allGames, gameData} from '../game-names';
import {GAME_ANM_VERSIONS} from './versions';
import {TableHandlers, makeRefGameIndependent, CommonData} from './tables';
import {globalNames, globalLinks, PrefixResolver} from '../resolver';
import {GridViewScroll} from '../lib/gridviewscroll';
import {MD} from '../markdown';
import {getConfig} from '../settings';
import {parseQuery} from '../url-format';
import {globalTips, Tip} from '../tips';

type CellData = {
  opcode: number, // opcode in this game
  total: number, // total uses of an instruction in a game, across all anm files
  breakdown: [string, number][], // maps filename to usage count, by descending usage count (no zeros)
};
type OpcodeStr = string;
type NameKey = string;
type StatsByOpcode = Record<Game, Record<OpcodeStr, Omit<CellData, 'opcode'>>>;
type NumFiles = Record<Game, number>;
type Stats = Record<string, FmtStats>;
type FmtStats = {
  'num-files': NumFiles,
  ins: StatsByOpcode,
  var: StatsByOpcode,
};
type StatsByNameKey = Map<NameKey, Map<Game, CellData>>;

const statsJson: Promise<Stats> = fetch('content/anm/anm-stats.json').then(async (text) => {
  const out: Stats = await text.json();
  return out;
});

const STATS_TIPS = new PrefixResolver<Tip>();

export function initStats() {
  globalTips.registerPrefix('stats', STATS_TIPS);
}

export async function buildStatsTable<D extends CommonData>(dataSubkey: [string, 'ins' | 'var'], handlers: TableHandlers<D>, $elem: HTMLElement) {
  const statsRaw = await statsJson;
  const stats = getStatsRows(statsRaw[dataSubkey[0]][dataSubkey[1]], handlers);
  const numFiles = statsRaw[dataSubkey[0]]['num-files'];
  buildStatsTable_($elem, numFiles, stats, handlers);
  registerStatsTips(numFiles, stats, handlers);
}

function buildStatsTable_<D>($elem: HTMLElement, numFiles: NumFiles, dataByRow: StatsByNameKey, tableHandlers: TableHandlers<D>) {
  const freezeHeaders = getConfig()['freeze-stats-headers'];

  let tableBody = '';

  const games = [...allGames()].filter((game) => numFiles[game] > 0);

  tableBody += '<tr class="GridViewScrollHeader">';
  tableBody += `<th>ANM stats</th>`;
  for (const game of games) {
    tableBody += `<th class="gamecolor gamecolor-${game}">${gameData(game).thname}</th>`;
  }
  tableBody += '</tr>';

  for (const [nameKey, rowData] of dataByRow.entries()) {
    if (nameKey.startsWith('ref:')) {
      tableBody += /* html */ `<tr class="GridViewScrollItem"><th>[ref=${nameKey.substring(4)}]</th>`;
    } else {
      tableBody += /* html */ `<tr class="GridViewScrollItem"><th><code>${globalNames.getHtml(nameKey)}</code></th>`;
    }
    for (const game of games) {
      const tipId = `stats:${tableHandlers.mainPrefix}:${game}:${nameKey}`;
      const cellData = rowData.get(game);
      if (cellData && cellData.total === undefined) console.error(cellData);

      let cellClass = '';
      let cellText = '';
      if (!cellData) cellClass = 'class="na"';
      else if (cellData.total === 0) [cellClass, cellText] = ['class="zero"', '0'];
      else cellText = `${cellData.total}`;

      tableBody += `<td ${cellClass} data-tip-id="${tipId}"><span>${cellText}</span></td>`;
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

  if (freezeHeaders) {
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

    // GridViewScroll uses some precomputed widths in its layout, so make sure it updates so the element can resize.
    const ResizeObserver = (window as any).ResizeObserver as any;
    if (ResizeObserver) {
      new ResizeObserver(() => grid.resize()).observe($elem);
    }
  } else {
    $elem.style.overflow = 'auto'; // scrollbars only if needed
    // For blocks, 'width: auto' is basically 'width: 100%', allowing the resize handle to move away from the table.
    // Therefore, use an inline block, so that width is computed from the content.
    $elem.style.display = 'inline-block';
    $elem.style.maxWidth = '100%'; // ensure that it shrinks with window
  }
}

function getStatsRows<D extends CommonData>(statsByOpcode: StatsByOpcode, tableHandlers: TableHandlers<D>): StatsByNameKey {
  const {tableByOpcode, mainPrefix, itemKindString} = tableHandlers;

  // Deep-copy.  We're about to tear it down...
  statsByOpcode = JSON.parse(JSON.stringify(statsByOpcode));

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
    const opcodes = Array.from(Object.keys(innerByOpcode as object)).map((opcodeStr) => parseInt(opcodeStr));
    opcodes.sort();

    for (const opcode of opcodes) {
      let {ref} = innerByOpcode[opcode];
      if (ref) ref = makeRefGameIndependent(ref, tableHandlers);

      const nameKey = (ref === null) ? `${mainPrefix}:${version}:${opcode}` : `ref:${ref}`;
      if (!keyIndices.has(nameKey)) {
        keyIndices.set(nameKey, out.length);
        out.push([nameKey, new Map()]);
      }
      const [, destMap] = out[keyIndices.get(nameKey)!];

      const cellData: CellData = srcInner[opcode] ? {...srcInner[opcode], opcode} : {total: 0, breakdown: [], opcode};
      delete srcInner[opcode];

      destMap.set(game, cellData);
    }

    for (const opcodeStr of Object.keys(srcInner)) {
      console.error(`game ${game} uses ${itemKindString} ${opcodeStr} but it's not in our table!`);
    }
  }
  return new Map(out);
}

function registerStatsTips<D>(numFiles: NumFiles, table: StatsByNameKey, tableHandlers: TableHandlers<D>) {
  const tipPrefix: string = tableHandlers.mainPrefix;

  STATS_TIPS.registerPrefix(tipPrefix, (suffix) => {
    const [gameStr, nameKey] = suffix.split(/:(.+)/);
    const game = gameStr as Game;
    const cellData = table.get(nameKey)!.get(game);
    if (!cellData) return null;

    let tipMd = `Used in ${cellData.breakdown.length} of ${numFiles[game]} files. (as id ${cellData.opcode})\n\n`;
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
