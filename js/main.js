const MD = new showdown.Converter({
  extensions: [ext],
  tables: true,
  strikethrough: true
});
const $content = document.querySelector(".content-wrapper");
const $scriptContent = document.querySelector(".script-wrapper");
const cache = {};
let active = "";
const activePage = "";
let $tip = null;
let $activeTipTarget = null;
const contentLoadListeners = [];

function contentLoaded() {
  for (let i=0; i<contentLoadListeners.length; ++i) {
    contentLoadListeners[i]();
  }
  contentLoadListeners.splice(0, contentLoadListeners.length);
}

function onContentLoad(clb) {
  contentLoadListeners.push(clb);
}

function initNavigation() {
  const $nav = document.querySelector(".header-navigation");
  const html = getNavigation(INDEX);
  $nav.innerHTML = html;
  $nav.addEventListener("click", handleNavigation);
  window.addEventListener("hashchange", initContent, false);
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
        ? "#s=" + path + item.url
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
      window.setTimeout(() => clb(cache[realPath]), 1);
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
      };
    }
  };
  xhr.send();
}

function getInclude(realPath, id) {
  // getIncludeTarget can't be here, because include target doesn't exist yet when this function is called
  getContent(realPath, "", function(txt) {
    const $target = getIncludeTarget(id);
    $target.innerHTML = MD.makeHtml(txt);
  }, function() {
    const $target = getIncludeTarget(id);
    $target.innerHTML = EMBED_LOAD_ERROR.replace("%code%", this.status);
  }, true);
}

function getIncludeTarget(id) {
  return document.querySelector("#included-content-"+id);
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
    str += "  \n  \n  You might be looking for one of the following pages:  \n"
    const list = group.single ? [group] : group.content;
    str += getErrorStringFromList(group, list);
  };
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
  };
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

function setWindowTitleDirect(str) {
  document.head.querySelector("title").innerText = str;
}

function setActiveNavigation(path, file) {
  let $active;

  $active = document.querySelector(".navigation-entry.active");
  if ($active != null) {
    $active.classList.remove("active");
    const $activeItem = $active.querySelector(".active");
    if ($activeItem != null) $activeItem.classList.remove("active");
  };

  $active = document.querySelector(".navigation-entry[data-path='"+path+"']");
  if ($active != null) {
    $active.classList.add("active");
    const $activeItem = $active.querySelector("[data-url='"+file+"']");
    if ($activeItem != null) $activeItem.classList.add("active");
  };
}

function initContent() {
  const query = parseQuery();
  if (query.s) { // site
    const spl = query.s.split("/");
    const file = spl.pop();
    const path = spl.join("/") + "/";
    loadContent(path, file, false);
  } else loadContent("/", "index");
}

function parseQuery() {
  const ret = {};
  let s = window.location.hash;
  s = s.substring(1);
  const spl = s.split("&");
  for (let i=0; i<spl.length; i++) {
    const [key, val] = spl[i].split("=");
    ret[key] = val;
  }
  return ret;
}

function buildQuery(query) {
  let str = "";
  let first = true;
  for (let key in query) {
    if (first) first = false;
    else str += "&";
    str += key + "=" + query[key];
  }
  return str;
}

function highlightCode(content) {
  return hljs.fixMarkup(hljs.highlight("cpp", content, true, false).value).replace(/_/g, "\\_").replace(/\*/g, "\\*");
}

function resize() {
  if (window.screen.width < 540) {
    document.querySelector("#viewport").setAttribute("content", "width=540px, user-scalable=no");
  } else {
    // make it actually usable with horizontal orientation
    let w = "device-width";
    if (window.screen.height < 450) w = "900px";
    document.querySelector("#viewport").setAttribute("content", "width="+w+", user-scalable=no");
  };
};

function initResize() {
  window.onresize = resize;
  resize();
};

function getElementData($elem, key) {
  do {
    if (typeof $elem.dataset[key] != "undefined") {
      return [$elem.dataset[key], $elem];
    }
  } while ($elem = $elem.parentElement);
  return ["", null];
}

function initTips() {
  $tip = document.querySelector(".tip");
  document.body.addEventListener("mouseover", tipIn);
  document.body.addEventListener("mouseout", tipOut);
}

function tipIn(e) {
  const [tip, $targ] = getTip(e.target);
  if (tip) showTip(tip, $targ, e.target);
}

function showTip(tip, $targ, $realTarg) {
  $activeTipTarget = $realTarg;
  $tip.style.display = "block";
  $tip.innerHTML = tip;
  const tipRect = $tip.getBoundingClientRect();
  const rect = $targ.getBoundingClientRect();
  const top = rect.top - /* rect.height/2 - */ tipRect.height + window.scrollY;
  let left = rect.left + rect.width/2 - tipRect.width/2;
  if (left < 0) left = 0;
  const max = document.body.offsetWidth - tipRect.width;
  if (left > max) left = max;
  $tip.style.top = top + "px";
  $tip.style.left = left + "px";
}

function tipOut(e) {
  if (e.target == $activeTipTarget) {
    $tip.style.display = "none";
    $activeTipTarget = null;
  }
}

function getTip($targ) {
  return getElementData($targ, "tip");
}

function initEmbeds() {
  document.addEventListener("click", e => {
    let [url, $elem] = getElementData(e.target, "video");
    if ($elem != null) {
      $elem = $elem.firstChild; // the wrapper consists of 2 elements
      $elem.removeChild($elem.firstChild);
      const $video = document.createElement("video");
      $video.setAttribute("controls", "");
      const $source = document.createElement("source");
      $source.setAttribute("src", url);
      $video.appendChild($source);
      $elem.appendChild($video);
    }
    [url, $elem] = getElementData(e.target, "yt");
    if ($elem != null) {
      $elem = $elem.firstChild;
      $elem.removeChild($elem.firstChild);
      const $iframe = document.createElement("iframe");
      $iframe.src = "https://www.youtube.com/embed/"+url;
      $elem.appendChild($iframe);
    }
  });
}

function init() {
  initNavigation();
  initContent();
  initResize();
  initTips();
  initEmbeds();
}

init();
