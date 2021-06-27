import React from 'react';
import {useLocation} from 'react-router-dom';
import {parseGame, Game, latestGame} from './tables/game';
import history, {createMemoryHistory} from 'history';

// URL tools - Wrappers and replacements for React Router things to significantly reduce the number of
//             subscribers to changes in the location, so that clicking an intra-page anchor link
//             can be instant instead of 800ms.

const dummyHistory = createMemoryHistory();

// Contexts that contain projections of the location.
const CurrentPageGameContext = React.createContext<Game>(latestGame);
const CurrentPageNameContext = React.createContext<string>('');
const CurrentPageSearchContext = React.createContext<URLSearchParams>(new URLSearchParams(''));
const CurrentPageHashContext = React.createContext<string>('');

/**
 * Enables the use of hooks and components exported by this module, like `useCurrentPageGame`.
 */
export function CurrentPageProvider({children}: {children: React.ReactNode}) {
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const gameStr = search.get('g') || '';
  const game = parseGame(gameStr) || latestGame;
  return (
    <CurrentPageGameContext.Provider value={game}>
      <CurrentPageSearchContext.Provider value={search}>
        <CurrentPageHashContext.Provider value={location.hash}>
          <CurrentPageNameContext.Provider value={location.pathname}>
            {children}
          </CurrentPageNameContext.Provider>
        </CurrentPageHashContext.Provider>
      </CurrentPageSearchContext.Provider>
    </CurrentPageGameContext.Provider>
  );
}

export function useCurrentPageGame(): Game {
  return React.useContext(CurrentPageGameContext);
}

export function useSearchParams(): URLSearchParams {
  return React.useContext(CurrentPageSearchContext);
}

/** A link to an ID on the current page.  It only subscribes to changes in the pathname and search part of the URL; not the hash.  */
export const HashLink = React.forwardRef(function HashLink(
    {hash, children, ...props}: {hash: string, children: React.ReactNode} & React.HTMLAttributes<HTMLAnchorElement>,
    ref?: React.Ref<HTMLAnchorElement>,
) {
  // Generate a full url with pathname and searchParams.
  const pathname = React.useContext(CurrentPageNameContext);
  const searchParams = React.useContext(CurrentPageSearchContext).toString();
  const search = searchParams.length ? '?' + searchParams : '';

  return <SimpleLink ref={ref} to={{pathname, search, hash}} {...props}>{children}</SimpleLink>;
});

/**
 * Replacement for React Router's `<Link>` in cases where `to` is not a function.
 *
 * In contrast to `<Link>`, this does not need to subscribe to any changes in the location.
 */
export const SimpleLink = React.forwardRef(function SimpleLink(
    {to, children, ...props}: {to: history.To, children: React.ReactNode} & React.HTMLAttributes<HTMLAnchorElement>,
    ref?: React.Ref<HTMLAnchorElement>,
) {
  return <a ref={ref} href={generateHrefForHashRouter(to)} {...props}>{children}</a>;
});

function generateHrefForHashRouter(to: history.To) {
  return '#' + dummyHistory.createHref(to);
}
