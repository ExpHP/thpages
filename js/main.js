import showdown from "showdown";
import {ext} from "./showdown-ext.js";
import {INDEX, ERROR} from "./index.js";
import {initAnm} from "./ecl/main.js";
import {initTips} from "./tips.js";
import {buildQuery, parseQuery} from "./url-format.js";

import hljs from "highlight.js/lib/core";
import hljsCLike from "highlight.js/lib/languages/c-like";
import hljsCpp from "highlight.js/lib/languages/cpp";
hljs.registerLanguage('c-like', hljsCLike);
hljs.registerLanguage('cpp', hljsCpp);

/**
 * Do early initialization before page-specific scripts run.
 */
export function init() {
  window.onContentLoad = function(clb) {
    contentLoadListeners.push(clb);
  };
  initAnm();
  initNavigation();
  initOrScrollToContent();
  initResize();
  initTips();
}

export const MD = new showdown.Converter({
  extensions: [ext],
  tables: true,
  strikethrough: true,
  literalMidWordUnderscores: true,
});
const $content = document.querySelector(".content-wrapper");
let lastQuery = null;
export const $scriptContent = document.querySelector(".script-wrapper");
const cache = {};
let active = "";
export const NAMES = {};

const contentLoadListeners = [];

function contentLoaded() {
  for (let i=0; i<contentLoadListeners.length; ++i) {
    contentLoadListeners[i]();
  }
  contentLoadListeners.length = 0;
}

function initNavigation() {
  const $nav = document.querySelector(".header-navigation");
  const html = getNavigation(INDEX);
  $nav.innerHTML = html;
  $nav.addEventListener("click", handleNavigation);
  window.addEventListener("hashchange", initOrScrollToContent, false);
}

function getNavigation(data) {
  let html = "";
  for (let i=0; i<data.length; i++) {
    if (!data[i].noItem) html += getNavigationEntry(data[i]);
  }
  return html;
}

function getNavigationEntry(data) {
  let html;
  html = "<div class='navigation-entry' data-path='"+data.path+"'>";
  if (!data.single) {
    html += "<div class='navigation-entry-name'>"+data.groupName+"</div>";
    html += "<div class='navigation-entry-list'>";
    html += getNavigationEntryList(data);
    html += "</div>";
  } else {
    html += "<a " + getNavEntryHref(data, data.path) + " ><div class='navigation-entry-name' "+getNavEntryDatasetString(data, data.path)+">"+data.groupName+"</div></a>";
  }
  html += "</div>";
  return html;
}

function getNavigationEntryList(data) {
  let html = "";
  for (let i=0; i<data.content.length; i++) {
    const item = data.content[i];
    if (item.type == "subgroup") {
      html += "<div class='navigation-entry-list-item subgroup-parent'><div>" + getNavigationEntryList({
        path: data.path,
        content: item.children,
      }) + "</div><span>" + item.name + "</span></div>";
    } else {
      html += "<a " + getNavEntryHref(item, data.path) + " ><div class='navigation-entry-list-item' "+getNavEntryDatasetString(item, data.path) + ">"+item.name+"</div></a>";
    }
  }
  return html;
}

function getNavEntryDatasetString(item, path) {
  return "data-type='"+item.type+"' data-url='"+item.url+"' data-path='"+path+"' data-newtab='"+item.newTab+"'";
}

function getNavEntryHref(item, path) {
  const url = (
    item.type == "href"
      ? item.url
      : item.type == "site"
        ? '#' + buildQuery({s: path + item.url})
        : "#e=" + item.type // error
  );
  return `href='${url}'`;
}

function handleNavigation(e) {
  if (typeof e.target.dataset.type != "undefined") {
    navigate(e.target.dataset);
    e.preventDefault();
  }
}

function navigate(data) {
  let {path, url} = data;
  if (url.charAt(0) == "/") {
    const li = url.lastIndexOf("/");
    path = url.substring(1, li);
    url = url.substring(li);
  }

  if (data.type == "href") {
    if (data.newtab == "true") {
      window.open(url);
    } else {
      window.location.replace(url);
    }
  } else if (data.type == "site") {
    loadContent(path, url);
  }
}

function getContent(path, file, clb, err, forceDelay) {
  const realPath = path+file;
  if (cache[realPath]) {
    if (!forceDelay) {
      return clb(cache[realPath]);
    } else {
      setTimeout(() => clb(cache[realPath]), 1);
    }
  }
  const xhr = new window.XMLHttpRequest();
  xhr.open("GET", "content/"+realPath+".md");
  xhr.onreadystatechange = function(...args) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        clb(this.responseText);
        cache[realPath] = this.responseText;
      } else {
        err.apply(this, args);
      }
    }
  };
  xhr.send();
}

function loadContent(path, file, writeQuery=true) {
  if (active && active == file) return;
  const group = getGroupByPath(path);
  if (group != null && group.type == "redirect") {
    return loadContent(group.url, file);
  }
  active = file;
  getContent(path, file, function(txt) {
    loadMd(txt, path, file);
  }, function() {
    loadMd(getErrorString(path, file), path, file);
    active = "";
  });
  if (writeQuery) {
    const query = buildQuery({
      "s": path+file,
    });
    window.location.hash = query;
  }
}

function getErrorString(path, file) {
  let str = ERROR;
  str += "  \n  \n  **Requested path**: `"+path+"`";
  str += "  \n  **Requested file**: `"+file+".md`";

  const group = getGroupByPath(path);
  if (group) {
    str += "  \n  \n  You might be looking for one of the following pages:  \n";
    const list = group.single ? [group] : group.content;
    str += getErrorStringFromList(group, list);
  }
  return str;
}

function getErrorStringFromList(group, list) {
  let str = "";
  for (let i=0; i<list.length; i++) {
    const entry = list[i];
    if (entry.type == "subgroup") {
      str += "#### " + entry.name + "\n";
      str += getErrorStringFromList(group, entry.children);
    } else if (entry.type == "site") {
      const path = (entry.url[0] != "/" ? group.path : "") + entry.url;
      const url = "#"+buildQuery({s: path});
      str += "- `" + path + ".md` - ["+entry.name+"]("+url+")  \n";
    } else {
      const url = entry.url;
      str += "- `"+entry.url+"` - ["+entry.name+"]("+url+")  \n";
    }
  }
  return str;
}

function getGroupByPath(path) {
  for (let i=0; i<INDEX.length; i++) {
    if (INDEX[i].path == path) return INDEX[i];
  }
  return null;
}

function loadMd(txt, path, file) {
  setWindowTitle(path, file);
  $scriptContent.innerHTML = "";
  const html = MD.makeHtml(txt);
  $content.innerHTML = "<div class='content'>"+ html + "</div>";
  setActiveNavigation(path, file);
  resetScroll();
  contentLoaded();
}

function resetScroll() {
  document.body.scrollTop = document.documentElement.scrollTop = 0;
}

function setWindowTitle(path, file) {
  let group;
  for (let i=0; i<INDEX.length; i++) {
    group = INDEX[i];
    if (group.path == path) break;
  }
  if (group.single) document.head.querySelector("title").innerText = group.name;
  else {
    setWindowTitleGroup(file, group.content);
  }
}

function setWindowTitleGroup(file, group) {
  for (let i=0; i<group.length; i++) {
    const item = group[i];
    if (item.type == "subgroup") setWindowTitleGroup(file, item.children);
    else if (item.url == file) document.head.querySelector("title").innerText = item.name;
  }
}

function setActiveNavigation(path, file) {
  let $active;

  $active = document.querySelector(".navigation-entry.active");
  if ($active != null) {
    $active.classList.remove("active");
    const $activeItem = $active.querySelector(".active");
    if ($activeItem != null) $activeItem.classList.remove("active");
  }

  $active = document.querySelector(".navigation-entry[data-path='"+path+"']");
  if ($active != null) {
    $active.classList.add("active");
    const $activeItem = $active.querySelector("[data-url='"+file+"']");
    if ($activeItem != null) $activeItem.classList.add("active");
  }
}

function initOrScrollToContent() {
  const query = parseQuery(window.location.hash);

  // don't reload same page (also works for index, where query.s === undefined)
  if (!(lastQuery && lastQuery.s === query.s)) {
    if (query.s) { // site
      const spl = query.s.split("/");
      const file = spl.pop();
      const path = spl.join("/") + "/";
      loadContent(path, file, false);
    } else loadContent("/", "index");
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
    document.querySelector("#viewport").setAttribute("content", "width="+w+", user-scalable=no");
  }
}

function initResize() {
  window.onresize = resize;
  resize();
}
