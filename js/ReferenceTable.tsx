import React from 'react';
import {Link, useHistory} from 'react-router-dom';
import history from 'history';

import {useCurrentPageGame} from './current-url';
import type {Wip, Group, Ref, InsData, VarData, TableDef, CommonData} from './tables';
import {CurrentReferenceTableRowContext} from './InlineRef';
import {TrustedMarkdown} from './Markdown';
import {gameData, Game} from './tables/game';
import {GameThLong} from './Game';
import {Wip as Wip1, Wip2} from './XUtil';
import {VarHeader, InsSiggy} from './InsAndVar';

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

  let total = 0;
  let documented = 0;
  const groups = getGroups(game);

  const shouldHaveToc = groups.length > 1;
  const tocData: {group: Group, to: history.To}[] = [];

  const contentSections = groups.map((group) => {
    let possibleHeader = null;
    if (shouldHaveToc) {
      const groupAnchor = `group-${group.min}`;
      const to = {hash: `#${groupAnchor}`};
      tocData.push({group, to});
      possibleHeader = <h2 id={groupAnchor}><Link className="self-link" to={to}>
        {group.min}-{group.max}: {group.title}
      </Link></h2>;
    }

    const rows = range(group.min, group.max + 1).map((opcode) => {
      const refObj = table.getRefByOpcode(game, opcode);
      if (refObj == null) return null; // instruction doesn't exist

      // instruction exists, but our docs may suck
      let {ref, wip} = refObj;
      const data = table.getDataByRef(ref);
      if (!data) {
        // instruction is assigned, but ref has no entry in table
        throw new Error(`ref ${ref} is assigned to ${mainPrefix} number ${game}:${opcode} but has no data`);
      }
      wip = Math.max(wip, data.wip) as Wip;

      if (wip === 0) {
        documented += 1;
      }
      total += 1;
      return <CurrentReferenceTableRowContext.Provider key={opcode} value={ref}>
        <TableRow {...{table, game, data, opcode, r: ref}} />
      </CurrentReferenceTableRowContext.Provider>;
    }).filter((x) => x);

    return <React.Fragment key={group.min}>
      {possibleHeader}
      <table className='ins-table'><tbody>{rows}</tbody></table>
    </React.Fragment>;
  });

  let toc = null;
  if (shouldHaveToc) {
    toc = <div className='toc'>
      <h3>Navigation</h3>
      <ul>{tocData.map(({group, to}) =>
        <li key={group.min}><Link to={to}>{group.title} ({group.min}..)</Link></li>,
      )}</ul>
    </div>;
  }

  const baseMd = textBeforeTable(game);
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
    {toc}
    {contentSections}
  </div>;
}

export function InsTableRow(props: {table: TableDef<InsData>, r: Ref, game: Game, data: InsData, opcode: number}) {
  const {table, r, data, opcode} = props;
  const desc = <TrustedMarkdown mdast={data.mdast} />;

  const anchor = table.formatAnchor(opcode);
  return <tr className="ins-table-entry" id={anchor}>
    <td className="col-id"><Link className="self-link" to={{hash: `#${anchor}`}}>{opcode}</Link></td>
    <td className="col-name"><InsSiggy data={data} r={r} /></td>
    <td className="col-desc">{desc}</td>
  </tr>;
}

export function VarTableRow(props: {table: TableDef<VarData>, r: Ref, game: Game, data: VarData, opcode: number}) {
  const {table, r, data, opcode} = props;
  const desc = <TrustedMarkdown mdast={data.mdast} />;

  const anchor = table.formatAnchor(opcode);
  // FIXME: add a mutability column.
  return <tr className="ins-table-entry" id={anchor}>
    <td className="col-id"><Link className="self-link" to={{hash: `#${anchor}`}}>{opcode}</Link></td>
    <td className="col-name"><VarHeader data={data} r={r} /></td>
    <td className="col-desc">{desc}</td>
  </tr>;
}
