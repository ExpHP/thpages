import React from 'react';
import type {ReactNode} from 'react';
import {gameData, Game} from './tables/game';

export function GameColor({game, children}: {game: Game, children: ReactNode}) {
  return <span className={`gamecolor gamecolor-${game}`}>{children}</span>;
}
export function GameShort({game}: {game: Game}) { return <GameColor game={game} >{gameData(game).short}</GameColor>; }
export function GameTh({game}: {game: Game}) { return <GameColor game={game} >{gameData(game).thname}</GameColor>; }
export function GameNum({game}: {game: Game}) { return <GameColor game={game} >{gameData(game).thname.substring(2)}</GameColor>; }
export function GameThLong({game}: {game: Game}) { return <GameColor game={game} >{gameData(game).long}</GameColor>; }
