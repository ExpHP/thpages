import React from 'react';
import {useFetch} from 'react-async';
import clsx from 'clsx';
import {makeStyles} from '@material-ui/core/styles';

import {Game, allGames, gameData} from './tables/game';
import {GameTh} from './Game';
import {InlineRef} from './InlineRef';
import {Tip} from './Tip';
import {Ref, TableDef, CommonData, STD_TABLE} from './tables';
import {Title} from './XUtil';

type CellData = {
  opcode: number, // opcode in this game
  total: number, // total uses of an instruction in a game, across all anm files
  breakdown: [string, number][], // maps filename to usage count, by descending usage count (no zeros)
};
type StatsJson = Record<string, FmtStatsJson>;
type FmtStatsJson = {
  'num-files': NumFiles,
  ins: StatsByOpcodeJson,
  var: StatsByOpcodeJson,
};
type StatsByOpcodeJson = Record<Game, Record<OpcodeStr, Omit<CellData, 'opcode'>>>;
type OpcodeStr = string;
type NameKey = string;
type NumFiles = Record<Game, number>;
type StatsByRef = Map<Ref, Map<Game, CellData>>;

export function StatsPage() {
  const {data, error, isPending} = useFetch<StatsJson>('content/anm/anm-stats.json', {
    headers: {accept: "application/json"},
  });

  return <>
    <Title>ANM stats</Title>
    <h1>Usage statistics</h1>
    <p>
      This page counts the number of uses of each instruction across all games.
      It can track the same instruction across many games, even as its opcode or signature changes.
    </p>
    {(() => {
      if (isPending) return <strong>Loading stats tables...</strong>;
      if (error) return `Something went wrong: ${error.message}`;

      if (data) {
        return <>
          <h2>Std instructions</h2>
          <StatsTable statsRaw={data} dataSubkey={['std', 'ins']} table={STD_TABLE} />
        </>;
      }
      return null;
    })()}
  </>;
}

// styles to make sticky header and column work
const useStyles = makeStyles({
  container: {
    resize: 'vertical',
    overflow: 'scroll',
  },
  table: {
    padding: 0, // be flush with scrollbars
  },
  stickyHeader: {
    position: 'sticky',
    top: 0,
    left: 0, // but y tho
    zIndex: 1, // without this, transparent cells will move on top of the headers
    '&:first-child': {
      zIndex: 4,
    },
  },
  stickyStart: {
    position: 'sticky',
    left: 0,
    top: 0,
    zIndex: 2,
  },
});

function StatsTable<D extends CommonData>({dataSubkey: [lang, subkey], table, statsRaw}: {
  dataSubkey: [string, 'ins' | 'var'],
  table: TableDef<D>,
  statsRaw: StatsJson,
}) {
  const dataByRow = React.useMemo(() => getStatsRows(statsRaw[lang][subkey], table), [lang, subkey, table, statsRaw]);
  const numFiles = statsRaw[lang]['num-files'];

  return <StatsTable_ {...{table, numFiles, dataByRow}} />;
}

function StatsTable_<D extends CommonData>(props: {
    numFiles: NumFiles,
    dataByRow: StatsByRef,
    table: TableDef<D>,
}) {
  const {numFiles, dataByRow, table} = props;

  type Size = {width: number, height: number};
  const [tableSize, setTableSize] = React.useState<Size | null>(null);

  const classes = useStyles();

  const scrollbarWidth = useScrollbarWidth(document);
  const tableRef = React.useRef<HTMLTableElement>(null);
  React.useLayoutEffect(() => {
    if (tableRef.current) {
      setTableSize({
        width: tableRef.current.offsetWidth + scrollbarWidth,
        height: tableRef.current.offsetHeight,
      });
    }
  }, [scrollbarWidth]);

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const games = [...allGames()].filter((game) => numFiles[game] > 0);

  return <div className={clsx('stats-table', classes.container)} style={tableSize ? {maxWidth: tableSize.width, maxHeight: tableSize.height} : undefined}>
    <table ref={tableRef} className={classes.table} >
      <thead>
        <tr>
          <th className={classes.stickyHeader}>{capitalize(table.noun)}</th>
          {games.map((game) => (
            <th className={classes.stickyHeader} key={game}><GameTh game={game} /></th>
          ))}
        </tr>
      </thead>

      <tbody>
        {[...dataByRow.entries()].map(([ref, rowData]) => (
          <tr key={ref}>
            <th className={classes.stickyStart}><InlineRef r={ref} /></th>

            {games.map((game) => {
              const cellData = rowData.get(game);
              return <Tip key={game} disable={!(cellData)} tip={<TipBody {...{game, cellData: cellData!, numFiles}} />} >
                <td className={clsx({
                  na: cellData == null,
                  zero: cellData?.total === 0,
                })}>
                  <span>{cellData ? `${cellData.total}` : ''}</span>  {/* FIXME is the span really necessary?? */}
                </td>
              </Tip>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>;
}

function getStatsRows<D extends CommonData>(statsByOpcode: StatsByOpcodeJson, tableHandlers: TableDef<D>): StatsByRef {
  const {refByOpcode, mainPrefix, noun} = tableHandlers;

  // Deep-copy.  We're about to tear it down...
  statsByOpcode = JSON.parse(JSON.stringify(statsByOpcode));

  // We use namekeys to identify things here so that we can also show stats for instructions
  // that have no crossref yet.
  const out: [NameKey, Map<Game, CellData>][] = [];

  // order:  - instructions from latest game, by opcode.
  //         - then instructions that are not in that game, ordered by previous game opcode. and etc.
  const keyIndices = new Map<NameKey, number>();
  for (const [game, innerRefByOpcode] of [...refByOpcode.entries()].reverse()) {
    const srcInner = statsByOpcode[game];
    const opcodes = [...innerRefByOpcode.keys()];
    opcodes.sort((a, b) => a - b);

    for (const opcode of opcodes) {
      const refData = innerRefByOpcode.get(opcode);
      if (!refData) {
        console.warn(`Stats table '${mainPrefix}' cannot generate a row for Game ${game} opcode ${opcode} because it has no ref`);
        continue;
      }
      const ref = tableHandlers.makeRefGameIndependent(refData.ref);

      if (!keyIndices.has(ref)) {
        keyIndices.set(ref, out.length);
        out.push([ref, new Map()]);
      }
      const [, destMap] = out[keyIndices.get(ref)!];

      const cellData: CellData = srcInner[opcode] ? {...srcInner[opcode], opcode} : {total: 0, breakdown: [], opcode};
      delete srcInner[opcode];

      destMap.set(game, cellData);
    }

    for (const opcodeStr of Object.keys(srcInner)) {
      console.error(`game ${game} uses ${noun} ${opcodeStr} but it's not in our table!`);
    }
  }
  return new Map(out);
}

function TipBody({cellData, numFiles, game}: {cellData: CellData, numFiles: NumFiles, game: Game}) {
  return <>
    <p>{`Used in ${cellData.breakdown.length} of ${numFiles[game]} files. (as id ${cellData.opcode})`}</p>
    <ul>
      {cellData.breakdown.slice(0, 5).map(([filename, uses]) => (
        <li key={filename}>{`${uses} uses in `}<code>{filename}</code></li>
      ))}
    </ul>
  </>;
}

function useScrollbarWidth(document: HTMLDocument): number {
  return React.useMemo(() => {
    const innerElement = document.createElement('p');
    innerElement.style.width = "100%";
    innerElement.style.height = "200px";

    const outerElement = document.createElement('div');
    outerElement.style.position = "absolute";
    outerElement.style.top = "0px";
    outerElement.style.left = "0px";
    outerElement.style.visibility = "hidden";
    outerElement.style.width = "200px";
    outerElement.style.height = "150px";
    outerElement.style.overflow = "hidden";

    outerElement.appendChild(innerElement);

    document.body.appendChild(outerElement);

    const innerElementWidth = innerElement.offsetWidth;

    outerElement.style.overflow = 'scroll';

    let outerElementWidth = innerElement.offsetWidth;
    if (innerElementWidth === outerElementWidth) outerElementWidth = outerElement.clientWidth;

    document.body.removeChild(outerElement);

    return innerElementWidth - outerElementWidth;
  }, [document]);
}
