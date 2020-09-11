import {MD, postprocessConvertedMarkdown} from "./markdown.ts";
import {initAnm} from "./anm/tables.ts";
import {initTips} from "./tips.ts";
import {initSettings, clearSettingsCache} from "./settings.ts";
import {globalNames, globalLinks} from "./resolver.ts";
import {parseQuery, queryEqualsUptoAnchor, queryPageEquals} from "./url-format.ts";
import {buildNavbar, highlightCurrentPageInNavbar} from "./navbar.ts";

import hljs from "highlight.js/lib/core";
import hljsCLike from "highlight.js/lib/languages/c-like";
import hljsCpp from "highlight.js/lib/languages/cpp";
import hljsJs from "highlight.js/lib/languages/javascript";

hljs.registerLanguage('c-like', hljsCLike);
hljs.registerLanguage('cpp', hljsCpp);
hljs.registerLanguage('js', hljsJs);

/**
 * Do early initialization before page-specific scripts run.
 */
export function init() {
  window.onContentLoad = function(clb) {
    contentLoadListeners.push(clb);
  };
  initSettings();
  initAnm();
  initTips();
  buildNavbar(document.querySelector(".header-navigation"));

  window.addEventListener("hashchange", buildOrScrollToContent, false);
  buildOrScrollToContent();

  initResize();
}

const MAIN_TITLE = `ExpHP's Touhou Pages`;
const $content = document.querySelector(".content-wrapper");
export const $scriptContent = document.querySelector(".script-wrapper");
let lastQuery = null;
const pageMarkdownCache = {};

const contentLoadListeners = [];

function contentLoaded() {
  for (const func of contentLoadListeners) {
    func();
  }
  contentLoadListeners.length = 0;
}

// Get the text content of an `.md` file in `content/`.
function getPossiblyCachedContentMd(page, clb, err) {
  if (pageMarkdownCache[page]) {
    return clb(pageMarkdownCache[page]);
  }
  const xhr = new window.XMLHttpRequest();
  xhr.open("GET", `content/${page}.md`);
  xhr.onreadystatechange = function(...args) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        clb(this.responseText);
        pageMarkdownCache[page] = this.responseText;
      } else {
        err.apply(this, args);
      }
    }
  };
  xhr.send();
}

// Load an `.md` file from `content/` and use it to generate the current page's HTML content.
function loadContent(page) {
  clearSettingsCache();

  getPossiblyCachedContentMd(page, function(md) {
    loadMd(md);
  }, function() {
    loadMd(getErrorString());
  });
}

function getErrorString() {
  return `
# An error has occured while loading the page.
Try reloading using **CTRL+F5**, or **clearing browser cache** of this site.
If the problem persists, contact me on Discord: **ExpHP#4754**.
`;
}

// Generate the current page's content from a markdown string.
function loadMd(txt) {
  resetScroll();
  setWindowTitle(null);

  $scriptContent.innerHTML = "";
  const html = MD.makeHtml(txt);
  $content.innerHTML = "<div class='content'>" + html + "</div>";
  postprocessConvertedMarkdown($content);

  highlightCurrentPageInNavbar();

  const context = parseQuery(window.location.hash);
  globalNames.transformHtml($content, context);
  globalLinks.transformHtml($content, context);
  contentLoaded();
}

function resetScroll() {
  document.body.scrollTop = document.documentElement.scrollTop = 0;
}

export function setWindowTitle(text) {
  const sep = text ? " &mdash; " : '';
  text = text || '';
  document.head.querySelector("title").innerHTML = `${text}${sep}${MAIN_TITLE}`;
}

function buildOrScrollToContent() {
  const query = parseQuery(window.location.hash);

  // don't reload same page (also works for index, where query.s === '')
  if (!(lastQuery && queryEqualsUptoAnchor(lastQuery, query))) {
    if (queryPageEquals(query, {s: ''})) query.s = '/index';
    loadContent(query.s);
  }

  lastQuery = query;

  // FIXME this is absolute jank, all I want is for &a= to work like # normally does...
  if (query.a) {
    // Don't want to wait forever because the user technically never leaves this page,
    // and so we don't want to potentially leave behind an "anchor time-bomb" that could
    // suddenly activate at an unexpected time...
    const trySeveralTimes = (times) => {
      if (times <= 0) {
        window.console.error(`Invalid anchor: ${query.a}`);
        return;
      }

      const $elem = document.getElementById(query.a);
      if ($elem) {
        $elem.scrollIntoView();
        window.scrollBy(0, -60);
      } else {
        setTimeout(() => trySeveralTimes(times - 1), 100);
      }
    };
    trySeveralTimes(50);
  }
}

export function highlightCode(content, lang) {
  lang = lang || "cpp";
  return hljs.fixMarkup(hljs.highlight(lang, content, true, false).value);
}

function resize() {
  if (window.screen.width < 540) {
    document.querySelector("#viewport").setAttribute("content", "width=540px, user-scalable=no");
  } else {
    // make it actually usable with horizontal orientation
    let w = "device-width";
    if (window.screen.height < 450) w = "900px";
    document.querySelector("#viewport").setAttribute("content", `width=${w}, user-scalable=no`);
  }
}

function initResize() {
  window.onresize = resize;
  resize();
}
