import React from 'react';
import {Link, useHistory} from 'react-router-dom';
import history from 'history';

import {useCurrentPageGame, HashLink} from './UrlTools';
import type {Wip, Group, Ref, InsData, VarData, TableDef, CommonData} from './tables';
import {CurrentReferenceTableRowContext} from './InlineRef';
import {TrustedMarkdown} from './Markdown';
import {gameData, Game} from './tables/game';
import {GameThLong} from './Game';
import {Wip as Wip1, Wip2} from './XUtil';
import {VarHeader, InsSiggy} from './InsAndVar';
import {debugId} from './util';

export function ReferenceTablePage<D extends CommonData>({table, setContentLoaded}: {table: TableDef<D>, setContentLoaded: (x: boolean) => void}) {
  const currentGame = useCurrentPageGame();
  return <>
    <p>
      {"Select game version: "}
      <GameSelector table={table} currentGame={currentGame}></GameSelector>
    </p>

    <ReferenceTable table={table} currentGame={currentGame} setContentLoaded={setContentLoaded}></ReferenceTable>
  </>;
}


export function GameSelector<D extends CommonData>({table, currentGame}: {table: TableDef<D>, currentGame: Game}) {
  const history = useHistory();
  const [currentChoice, setCurrentChoice] = React.useState(currentGame);

  // This makes sure the dropdown is always correct, even if we navigate Back.
  React.useEffect(() => setCurrentChoice(currentGame), [currentGame]);

  function onChange(ev: any) {
    history.push({search: `?g=${ev.target.value}`});
  }

  return <select value={currentChoice} onChange={onChange}>
    {table.supportedGames().map((game) => {
      const text = `${gameData(game).thname} ~ ${gameData(game).long}`;
      return <option key={game} value={game}>{text}</option>;
    })}
  </select>;
}

function range(start: number, end: number) {
  return [...new Array(end - start).keys()].map((x) => x + start);
}

function ReferenceTable<D extends CommonData>({table, currentGame: game, setContentLoaded}: {table: TableDef<D>, currentGame: Game, setContentLoaded: (x: boolean) => void}}) {
  const {getGroups, mainPrefix, textBeforeTable, TableRow} = table;

  // Implement hash scrolling by signaling when content has been generated.
  // (TODO: make tables display incrementally and do this when done)
  React.useEffect(() => {
    setContentLoaded(true);
    return () => setContentLoaded(false);
  }, [table, game, setContentLoaded]);

  const groups = getGroups(game);
  const shouldHaveToc = groups.length > 1;
  const instrCounts = getInstrCounts(table, game);

  const contentSections = groups.map((group) => {
    let possibleHeader = null;
    if (shouldHaveToc) {
      const anchor = groupAnchor(group)
      possibleHeader = <h2 id={anchor}><HashLink className="self-link" hash={'#' + anchor}>
        {group.min}-{group.max}: {group.title}
      </HashLink></h2>;
    }
  
    const rows = range(group.min, group.max + 1).map((opcode) => {
      const refObj = table.getRefByOpcode(game, opcode);
      if (refObj == null) return null; // instruction doesn't exist
      const data = table.getDataByRef(refObj.ref)!; // getInstrCounts will have thrown if this is missing

      return <CurrentReferenceTableRowContext.Provider key={opcode} value={refObj.ref}>
        <TableRow {...{table, game, data, opcode, r: refObj.ref}} />
      </CurrentReferenceTableRowContext.Provider>;
    }).filter((x) => x);
  
    return <React.Fragment key={group.min}>
      {possibleHeader}
      <table className='ins-table'><tbody>{rows}</tbody></table>
    </React.Fragment>;
  });

  const baseMd = textBeforeTable(game);
  const {total, documented} = instrCounts;
  return <div>
    <p>
      {/* Even though this is right next to the dropdown, the current game is displayed here for the sake of pages like the var-table
      that can refresh so quickly that it can be hard to realize that the page did in fact respond to changing the dropdown selection. */}
      Now showing: <GameThLong game={game}/>
      {(total > 0) ? <>
        <br/> Documented rate: {documented}/{total} ({(documented/total*100).toFixed(2)}%)
        <br/> <Wip1>Items marked like this are not fully understood.</Wip1>
        <br/> <Wip2>Items like this are complete mysteries.</Wip2>
      </> : null}
    </p>
    {baseMd ? <TrustedMarkdown>{baseMd}</TrustedMarkdown> : null}
    {shouldHaveToc ? <Toc groups={groups} /> : null}
    {contentSections}
  </div>;
}

function getInstrCounts<D extends CommonData>(table: TableDef<D>, game: Game) {
  const map = table.refByOpcode.get(game)!;
  
  let documented = 0;
  for (const opcode of table.refByOpcode.get(game)!.keys()) {
    const refObj = table.getRefByOpcode(game, opcode)!;
    const data = table.getDataByRef(refObj.ref);
    if (!data) {
      // instruction is assigned, but ref has no entry in table
      throw new Error(`ref ${refObj.ref} is assigned to ${table.mainPrefix} number ${game}:${opcode} but has no data`);
    }

    if (Math.max(refObj.wip, data.wip) === 0) {
      documented += 1;
    }
  }
  return {total: map.size, documented}
}

function groupAnchor(group: Group): string {
  return `group-${group.min}`;
}

export function Toc({groups}: {groups: Group[]}) {
  return <div className='toc'>
    <h3>Navigation</h3>
    <ul>{groups.map((group) => (
      <li key={group.min}><HashLink hash={'#' + groupAnchor(group)}>{group.title} ({group.min}..)</HashLink></li>
    ))}</ul>
  </div>;
}

export const InsTableRow = React.memo(function InsTableRow(props: {table: TableDef<InsData>, r: Ref, game: Game, data: InsData, opcode: number}) {
  const {table, r, data, opcode} = props;
  const desc = <TrustedMarkdown mdast={data.mdast} />;

  const anchor = table.formatAnchor(opcode);
  return <tr className="ins-table-entry" id={anchor}>
    <td className="col-id"><HashLink className="self-link" hash={'#' + anchor}>{opcode}</HashLink></td>
    <td className="col-name"><InsSiggy data={data} r={r} /></td>
    <td className="col-desc">{desc}</td>
  </tr>;
});

export const VarTableRow = React.memo(function VarTableRow(props: {table: TableDef<VarData>, r: Ref, game: Game, data: VarData, opcode: number}) {
  const {table, r, data, opcode} = props;
  const desc = <TrustedMarkdown mdast={data.mdast} />;

  const anchor = table.formatAnchor(opcode);
  // FIXME: add a mutability column.
  return <tr className="ins-table-entry" id={anchor}>
    <td className="col-id"><HashLink className="self-link" hash={'#' + anchor}>{opcode}</HashLink></td>
    <td className="col-name"><VarHeader data={data} r={r} /></td>
    <td className="col-desc">{desc}</td>
  </tr>;
});
