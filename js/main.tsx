import * as React from "react";
import ReactDOM from "react-dom";
import ReactDOMServer from "react-dom/server";
import {TrustedMarkdown, postprocessConvertedMarkdown} from "./markdown";
import {initAnm} from "./anm/tables";
import {initTips} from "./tips";
import {initSettings, clearSettingsCache} from "./settings";
import {globalNames, globalLinks} from "./resolver";
import {ErrorBoundary} from "./common-components";
import {parseQuery, queryEqualsUptoAnchor, queryPageEquals, Query} from "./url-format";
import {Navbar} from "./navbar";

import hljs from "highlight.js/lib/core";
import hljsCLike from "highlight.js/lib/languages/c-like";
import hljsCpp from "highlight.js/lib/languages/cpp";
import hljsJs from "highlight.js/lib/languages/javascript";
import hljsJson from "highlight.js/lib/languages/json";

hljs.registerLanguage('c-like', hljsCLike);
hljs.registerLanguage('cpp', hljsCpp);
hljs.registerLanguage('js', hljsJs);
hljs.registerLanguage('json', hljsJson);


export function App() {
  const [currentHash, setCurrentHash] = React.useState(window.location.hash);

  React.useEffect(() => {
    const eventListener = () => {
      setCurrentHash(window.location.hash);
    };

    window.addEventListener("hashchange", eventListener, false);
    return () => window.removeEventListener("hashchange", eventListener, false);
  }, []);

  const currentQuery = parseQuery(currentHash);
  try {
    return <div>
      <div id="tip"></div>
      <div className="body-container">
        <div className="header-wrapper">
          <div className="header-text">{"ExpHP's Touhou pages"}</div>
        </div>
        <ErrorBoundary><Navbar currentQuery={currentQuery} /></ErrorBoundary>
        <ErrorBoundary><Content currentQuery={currentQuery} /></ErrorBoundary>
      </div>
    </div>;
  } catch (e) {
    return `${e}`;
  }
}


/**
 * Do early initialization before page-specific scripts run.
 */
export function init() {
  initSettings();
  initAnm();
  initTips();
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
  return <div className="content-wrapper">
    <TrustedMarkdown className="content" {...{currentQuery}}>{displayedMarkdown}</TrustedMarkdown>
  </div>;
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

export function highlightCode(content, lang) {
  lang = lang || "cpp";
  return hljs.fixMarkup(hljs.highlight(lang, content, true, false).value);
}
