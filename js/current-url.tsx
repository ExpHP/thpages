import React from 'react';
import {useLocation} from 'react-router-dom';
import {parseGame, Game, latestGame} from './tables/game';

/**
 * A context for only the game part of the URL.
 *
 * Using this lets us significantly reduce the number of consumers of useLocation, which results in faster response times
 * when following anchor links to another item on the same page.
 */
const CurrentPageGameContext = React.createContext<Game>(latestGame);

export function CurrentPageGameProvider({children}: {children: React.ReactNode}) {
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const gameStr = search.get('g') || '';
  const game = parseGame(gameStr) || latestGame;
  return <CurrentPageGameContext.Provider value={game}>
    {children}
  </CurrentPageGameContext.Provider>;
}

export function useCurrentPageGame(): Game {
  return React.useContext(CurrentPageGameContext);
}
