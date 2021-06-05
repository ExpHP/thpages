import React from 'react';

import {useCurrentPageGame} from './current-url';
import {NameSettingsContext, NameSettings} from './settings';
import {Ref, getTableByPrefix, TableDef, CommonData, QualifiedOpcode} from './tables';
import {Err} from './Error';

export function InlineRef({r}: {r: string}) {
  const nameSettings = React.useContext(NameSettingsContext);
  const refData = useRefData(r);
  if (!refData) {
    return <Err>{`REF_ERROR(${r})`}</Err>;
  }

  const name = getRefName(r, refData, nameSettings);
  return <code className="isref">{name}</code>;
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
