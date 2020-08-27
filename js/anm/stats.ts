import {Game, allGames, gameData} from '../game-names';
import {GAME_ANM_VERSIONS} from './versions';
import {INS_HANDLERS, VAR_HANDLERS} from './main.js';
import {globalNames} from '../resolver';
import {GridViewScroll} from '../lib/gridviewscroll';
import {MD} from '../main.js';
import {parseQuery} from '../url-format';
import {globalTips} from '../tips';

type CellData = {total: number, breakdown: [string, number][]};
type OpcodeStr = string;
type NameKey = string;
type StatsByOpcode = Record<Game, Record<OpcodeStr, CellData>>;

const statsJson: Promise<{ins: StatsByOpcode, var: StatsByOpcode}> = fetch('content/anm/anm-stats.json').then((text) => text.json());

export async function buildInsStatsTable($elem: HTMLElement) {
  buildStatsTable($elem, (await statsJson).ins, INS_HANDLERS);
}

export async function buildVarStatsTable($elem: HTMLElement) {
  buildStatsTable($elem, (await statsJson).var, VAR_HANDLERS);
}

async function buildStatsTable($elem: HTMLElement, statsByOpcode: StatsByOpcode, tableHandlers: any) {
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
      const cellData = rowData.get(game);
      if (cellData && cellData.total === undefined) console.error(cellData);
      tableBody += `<td>${cellData ? cellData.total : "&mdash;"}</td>`;
      // tableBody += `<td>&mdash;</td>`;
    }
    tableBody += '</tr>';
  }

  if (!$elem.id) {
    console.error('stats table element needs an id');
  }
  $elem.classList.add("stats-table");
  $elem.innerHTML = MD.makeHtml(`<table><tbody>${tableBody}</tbody></table>`);
  globalNames.transformHtml($elem, parseQuery(window.location.hash));

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

function reversed<T>(iter: Iterable<T>) {
  return Array.from(iter).reverse();
}
