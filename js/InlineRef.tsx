import React from 'react';
import {Link} from 'react-router-dom';

import {useCurrentPageGame} from './current-url';
import {NameSettingsContext, NameSettings} from './settings';
import {TrustedMarkdown} from './Markdown';
import {Tip} from './Tip';
import {Ref, getTableByPrefix, TableDef, CommonData, QualifiedOpcode} from './tables';
import {Err} from './Error';

/**
 * Indicates that we are currently in the body of the paragraph of text that describes a specific cross-ref.
 *
 * Sometimes crossrefs are used in their own definition in order to take advantage of the name config machinery
 * (and to look like other instructions).  However, if it were to show the normal tooltip when you mouse over it,
 * it can easily take a while before the reader realizes "oh wait, that's the instruction I'm already looking at!"
 *
 * So this is used to detect self-references and have them behave a bit differently.
 */
export const CurrentReferenceTableRowContext = React.createContext<Ref | null>(null);

export function InlineRef({r}: {r: string}) {
  const nameSettings = React.useContext(NameSettingsContext);
  const refData = useRefData(r);
  if (!refData) {
    return <Err>{`REF_ERROR(${r})`}</Err>;
  }

  const {game, opcode} = refData.qualifiedOpcode;
  const name = getRefName(r, refData, nameSettings);
  return <Tip tip={<TipBody {...{r, refData}}/>}><Link to={{
    pathname: refData.table.tablePage,
    search: `?g=${game}`,
    hash: '#' + refData.table.formatAnchor(opcode),
  }}><code className="isref">{name}</code></Link></Tip>;
}

export type RefData<D extends CommonData> = {
  table: TableDef<D>;
  data: D;
  /** A game with the instruction, and its opcode in that game. (Will be the current page's game if possible) */
  qualifiedOpcode: QualifiedOpcode;
  /** Does the ref exist in the current game? (equivalently: is qualifiedOpcode.game equal to the current page's game?) */
  isCurrentGame: boolean;
};

export function useRefData(r: Ref): RefData<CommonData> | null {
  const currentGame = useCurrentPageGame();

  const [tablePrefix] = r.split(':', 1);
  const table = getTableByPrefix(tablePrefix) as TableDef<CommonData> | null;
  if (!table) return null;
  const data = table.getDataByRef(r);
  if (!data) return null;

  const opcode = table.reverseTable.get(currentGame)?.get(r);
  let qualifiedOpcode;
  if (opcode == null) {
    // not available in current game
    qualifiedOpcode = table.latestGameTable.get(r)!;
  } else {
    qualifiedOpcode = {game: currentGame, opcode};
  }
  const isCurrentGame = qualifiedOpcode.game === currentGame;
  return {data, qualifiedOpcode, table, isCurrentGame};
}

export function getRefName<D extends CommonData>(ref: Ref, {table, data, qualifiedOpcode, isCurrentGame}: RefData<D>, nameSettings: NameSettings) {
  const {game, opcode} = qualifiedOpcode;

  const prefix = isCurrentGame ? '' : `th${game}:`;
  const nameData = nameSettings.dataByRef.get(ref);
  const name = nameData ? nameData.name : table.getDefaultName(opcode, data);
  return `${prefix}${table.addTypeSigilIfNeeded(name, data)}`;
}

function TipBody<D extends CommonData>({r, refData: {data, table}}: {r: Ref, refData: RefData<D>}) {
  const currentReferenceTableRow = React.useContext(CurrentReferenceTableRowContext);
  if (currentReferenceTableRow === r) {
    return <>{"YOU ARE HERE"}</>;
  }

  const {TipHeader} = table;
  const omittedInfo = false; // FIXME
  const mdast = {
    type: 'containerDirective',
    name: 'is-tip',
    children: [data.mdast],
  };
  const contents = <TrustedMarkdown mdast={mdast}/>;
  return <>
    <div className="heading"><TipHeader data={data} r={r} /></div>
    <div className="contents">{contents}</div>
    {omittedInfo ? <div className="omitted-info"></div> : null}
  </>;
}
