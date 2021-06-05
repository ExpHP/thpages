import React from 'react';
import {useLocation} from 'react-router-dom';
import {parseGame, Game, latestGame} from './tables/game';

export function useCurrentPageGame(): Game {
  const location = useLocation();
  // return React.useMemo(() => {
  const search = new URLSearchParams(location.search);
  const gameStr = search.get('g') || '';
  const game = parseGame(gameStr);
  return game || latestGame;
  // }, [location]);
}
