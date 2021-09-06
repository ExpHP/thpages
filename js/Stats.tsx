import React from 'react';
import {useFetch} from 'react-async';
import clsx from 'clsx';
import {makeStyles} from '@material-ui/core/styles';

import {Game, allGames, gameData} from './tables/game';
import {GameTh} from './Game';
import {InlineRef} from './InlineRef';
import {Tip} from './Tip';
import {Ref, TableDef, CommonData, ANM_INS_TABLE, ANM_VAR_TABLE, STD_TABLE, MSG_TABLE} from './tables';
import {Title, useIncremental} from './XUtil';
import {unreachable, deepEqual} from '~/js/util';

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
      if (data) return <StatsPageMainContent data={data} />;
      return null;
    })()}
  </>;
}

type StatsTableListEntry = {
  heading: string,
  dataSubkey: [string, 'ins' | 'var'],
  table: TableDef<any>,
};

const STATS_TABLES_LIST: StatsTableListEntry[] = [{
  heading: "Anm instructions",
  dataSubkey: ['anm', 'ins'],
  table: ANM_INS_TABLE,
}, {
  heading: "Anm variables",
  dataSubkey: ['anm', 'var'],
  table: ANM_VAR_TABLE,
}, {
  heading: "Std instructions",
  dataSubkey: ['std', 'ins'],
  table: STD_TABLE,
}, {
  heading: "Msg (stage) instructions",
  dataSubkey: ['msg', 'ins'],
  table: MSG_TABLE,
}];

export function StatsPageMainContent({data}: {data: StatsJson}) {
  // need to gather info on all rows upfront so that we can properly incrementalize their rendering
  const allRowsOfAllTables = React.useMemo(() => (
    STATS_TABLES_LIST.map(({dataSubkey: [lang, subkey], table}) => (
      getStatsRows(data[lang][subkey], table)
    ))
  ), [STATS_TABLES_LIST, data]);

  // get a possibly shorter list of tables, with rows possibly missing
  const tablesToDisplay = useStatsTableIncrementalization(allRowsOfAllTables);

  return <>
    {tablesToDisplay.map((dataByRow, tableIndex) => {
      const {heading, dataSubkey, table} = STATS_TABLES_LIST[tableIndex];
      const [lang] = dataSubkey;
      const numFiles = data[lang]['num-files'];
      return <React.Fragment key={tableIndex}>
        <h2>{heading}</h2>
        <StatsTable {...{dataByRow, numFiles, table}} />
      </React.Fragment>;
    })}
  </>;
}

// =============================================================================
// Incrementalization

/**
 * Produces a truncated form of stats tables that grows incrementally on each render.
 */
function useStatsTableIncrementalization(allRowsOfAllTables: StatsByRef[]): StatsByRef[] {
  const totalNumTables = allRowsOfAllTables.length;
  const maxTableSizes = React.useMemo(() => allRowsOfAllTables.map((x) => x.size), [allRowsOfAllTables]);

  const initialGoal = 10;

  type State = {
    displayCounts: number[],  // note: can exceed map length
    lastIncrementedIndex: number,
    earlyPhase: boolean,
  };

  const init = React.useMemo<State>(() => ({
    displayCounts: [1],
    lastIncrementedIndex: 0,
    earlyPhase: true,
  }), []);

  const stopWhen = React.useCallback(({displayCounts}: State) => (
    displayCounts.every((count, index) => count >= maxTableSizes[index])
  ), [maxTableSizes]);

  const step = React.useCallback((state: State) => {
    const {earlyPhase, displayCounts, lastIncrementedIndex} = state;

    if (earlyPhase) {
      // Early on: Make each table long enough to require a scrollbar before adding the next.
      const index = displayCounts.length - 1;
      if (displayCounts[index] < Math.min(maxTableSizes[index], initialGoal)) {
        const modifiedCounts = [...displayCounts];
        modifiedCounts[index] += 1;
        return {...state, displayCounts: modifiedCounts};
      }

      // Make a new table appear if possible.
      if (displayCounts.length < totalNumTables) {
        return {...state, displayCounts: [...displayCounts, 1]};
      }

      // All tables are long enough to have scrollbars.  Move to the next phase.
      return {...state, earlyPhase: false};
    }

    // All tables exist. Add rows in round robin order.
    // Some tables may be done; find the next that isn't.
    let incrementIndex = (lastIncrementedIndex + 1) % totalNumTables;
    while (state.displayCounts[incrementIndex] >= allRowsOfAllTables[incrementIndex].size) {
      if (incrementIndex == lastIncrementedIndex) {
        // We are back where we started and have not found an incomplete table.
        // The stopWhen callback should've prevented this function from being called...
        throw new Error("all tables full?");
      }
      incrementIndex = (incrementIndex + 1) % totalNumTables;
    }

    const modifiedCounts = [...displayCounts];
    modifiedCounts[incrementIndex] += 1;
    return {...state, lastIncrementedIndex: incrementIndex, displayCounts: modifiedCounts};
  }, [allRowsOfAllTables, totalNumTables]);

  const state = useIncremental({init, step, stopWhen}, []);

  // Truncate the tables to the given lengths.
  // state.displayCounts.map is used instead of allRowsOfAllTables.map to allow
  // the list to become shorter (i.e. don't show all tables)
  const output = React.useMemo(() => (
    state.displayCounts.map((count, index) => truncateMap(allRowsOfAllTables[index], count))
  ), [state.displayCounts, allRowsOfAllTables])
  return output;
}

/**
 * If a map is longer than `size`, produce a new Map of length `size`.
 * Otherwise, the original object is returned.
 **/
function truncateMap<K, V>(map: Map<K, V>, size: number): Map<K, V> {
  if (map.size <= size) {
    return map;
  }
  const entries = [...map];
  entries.length = size;
  return new Map(entries);
}

// =============================================================================
// Sticky styling

// styles to make sticky header and column work
const useStyles = makeStyles({
  container: {
    resize: 'vertical',
    overflowY: 'scroll',
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

function StatsTable<D extends CommonData>(props: {
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
      const newSize = {
        width: tableRef.current.offsetWidth + scrollbarWidth,
        height: tableRef.current.offsetHeight,
      };
      if (!deepEqual(newSize, tableSize)) {
        setTableSize(newSize);
      }
    }
  });

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const games = React.useMemo(() => [...allGames()].filter((game) => numFiles[game] > 0), [numFiles]);

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
        {[...dataByRow.entries()].map(([xref, rowData]) => (
          <StatsTableRow key={xref} {...{xref, rowData, games, numFiles}} />
        ))}
      </tbody>
    </table>
  </div>;
}

const StatsTableRow = React.memo(function StatsTableRow({xref, rowData, games, numFiles}: {xref: string, rowData: Map<Game, CellData>, games: Game[], numFiles: NumFiles}) {
  const classes = useStyles();

  return <tr>
    <th className={classes.stickyStart}><InlineRef r={xref} /></th>

    {games.map((game) => {
      const cellData = rowData.get(game);
      return <Tip
        key={game}
        disable={!(cellData)}
        tip={<TipBody {...{game, cellData: cellData!, numFiles}} />}
        element='td' elementProps={{
          className: clsx({
            na: cellData == null,
            zero: cellData?.total === 0,
          }),
        }}
      >
        {/* Note: the <span> is used to apply opacity styling to the text */}
        <span>{cellData ? `${cellData.total}` : ''}</span>
      </Tip>;
    })}
  </tr>;
});

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
