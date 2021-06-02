import * as React from "react";
import {TrustedMarkdown} from "./markdown";
import {initAnm} from "./anm/tables";
import {useSettings, SettingsPage, initSettings, NameSettingsContext, computeNameSettingsFromSettings} from "./settings";
import {ErrorBoundary} from "./common-components";
import {parseQuery, queryEqualsUptoAnchor, Query} from "./url-format";
import {Navbar} from "./navbar";
import {StylesProvider, ThemeProvider, createMuiTheme} from '@material-ui/core/styles';
import pink from '@material-ui/core/colors/pink';
import yellow from '@material-ui/core/colors/yellow';

const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: pink[500],
    },
    secondary: {
      main: yellow[500],
    },
  },
});

export function App() {
  React.useEffect(() => {
    const eventListener = () => {
      setCurrentHash(window.location.hash);
    };

    window.addEventListener("hashchange", eventListener, false);
    return () => window.removeEventListener("hashchange", eventListener, false);
  }, []);

  const [savedSettings, setSavedSettings] = useSettings();
  const [currentHash, setCurrentHash] = React.useState(window.location.hash);
  const nameSettings = React.useMemo(() => computeNameSettingsFromSettings(savedSettings), [savedSettings]);

  const currentQuery = parseQuery(currentHash);
  try {
    return <div>
      <ThemeProvider theme={theme}><StylesProvider injectFirst>
        <NameSettingsContext.Provider value={nameSettings}>
          <div className="body-container">
            <div className="header-wrapper">
              <div className="header-text">{"ExpHP's Touhou pages"}</div>
            </div>
            <ErrorBoundary><Navbar currentQuery={currentQuery} /></ErrorBoundary>
            {/* <ErrorBoundary><div className="content-wrapper"><div className="content"><SettingsPage settings={savedSettings} onSave={setSavedSettings}/></div></div></ErrorBoundary> */}
            <ErrorBoundary><Content currentQuery={currentQuery} /></ErrorBoundary>
          </div>
        </NameSettingsContext.Provider>
      </StylesProvider></ThemeProvider>
    </div>;
  } catch (e) {
    return `${e}`;
  }
}


/**
 * Do early initialization before page-specific scripts run.
 */
export function init() {
  initAnm();
  initSettings();
}

const MAIN_TITLE = `ExpHP's Touhou Pages`;
const pageMarkdownCache: {[s: string]: string | undefined} = {};

function Content({currentQuery}: {currentQuery: Query}) {
  const [prevQuery, setPrevQuery] = React.useState<Query | null>(null);
  const [pageMarkdown, setPageMarkdown] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (prevQuery && !queryEqualsUptoAnchor(prevQuery, currentQuery)) {
      resetScroll();
    }
    setPrevQuery(currentQuery);
  }, [prevQuery, currentQuery]);

  let displayedMarkdown = pageMarkdown;
  if (prevQuery?.s !== currentQuery.s) {
    // This is to prevent an accidental, brief display of the current table for a different game
    // when navigating from e.g. "#/anm/ins&g=12" to "#/anm/var".
    //
    // (in this case, pageMarkdown will be stale because any calls to setPageMarkdown(null)
    //  have not yet taken effect)
    displayedMarkdown = null;
  }

  React.useEffect(() => {
    const abortController = new AbortController();
    getPossiblyCachedContentMd(currentQuery.s, abortController)
        .then((md) => setPageMarkdown(md))
        .catch((e) => console.error(e));

    return () => {
      abortController.abort();
      setPageMarkdown(null);
    };
  }, [currentQuery]);

  if (displayedMarkdown === null) return null;
  return <div className="content-wrapper"><div className="content">
    <TrustedMarkdown {...{currentQuery}}>{displayedMarkdown}</TrustedMarkdown>
  </div></div>;
}

// Get the text content of an `.md` file in `content/`.
async function getPossiblyCachedContentMd(page: string, abort: AbortController) {
  if (pageMarkdownCache[page]) {
    return pageMarkdownCache[page]!;
  }
  const result = await fetch(`content/${page}.md`, abort);
  const md = await result.text();
  pageMarkdownCache[page] = md;
  return md;
}

function getErrorString() {
  return `
# An error has occured while loading the page.
Try reloading using **CTRL+F5**, or **clearing browser cache** of this site.
If the problem persists, contact me on Discord: **ExpHP#4754**.
`;
}

function resetScroll() {
  document.body.scrollTop = document.documentElement.scrollTop = 0;
}

export function setWindowTitle(text: string | null) {
  const prefix = text ? `${text} &mdash; ` : '';
  const $title = document.head.querySelector("title");
  if ($title) $title.innerHTML = `${prefix}${MAIN_TITLE}`;
}

// function buildOrScrollToContent() {
//   const query = parseQuery(window.location.hash);

//   // don't reload same page (also works for index, where query.s === '')
//   if (!(lastQuery && queryEqualsUptoAnchor(lastQuery, query))) {
//     if (queryPageEquals(query, {s: ''})) query.s = '/index';
//     loadContent(query.s);
//   }

//   lastQuery = query;

//   // FIXME this is absolute jank, all I want is for &a= to work like # normally does...
//   if (query.a) {
//     // Don't want to wait forever because the user technically never leaves this page,
//     // and so we don't want to potentially leave behind an "anchor time-bomb" that could
//     // suddenly activate at an unexpected time...
//     const trySeveralTimes = (times) => {
//       if (times <= 0) {
//         window.console.error(`Invalid anchor: ${query.a}`);
//         return;
//       }
//       if (!scrollToAnchor(query.a)) {
//         setTimeout(() => trySeveralTimes(times - 1), 100);
//       }
//     };
//     trySeveralTimes(50);
//   }
// }

function scrollToAnchor(id: string) {
  const $elem = document.getElementById(id);
  if ($elem) {
    $elem.scrollIntoView();
    window.scrollBy(0, -60);
    return true;
  }
  return false;
}
