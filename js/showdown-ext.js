import {loadAnmmap} from "./anm/main.js";
import {MD, highlightCode, $scriptContent} from "./main.js";
import {getRefHtml} from "./ref.js";
import {globalNames, globalLinks} from './resolver.ts';
import {parseQuery} from "./url-format.ts";
import dedent from "./lib/dedent.js";

export const ext = function() {
  const code = {
    type: "lang",
    regex: /\[code(=.*?)?\]([^]+?)\[\/code\]/g,
    replace: function(match, lang, content) {
      if (lang) {
        lang = lang.substring(1); // skip '='
      } else {
        lang = 'anm';
      }

      const hljsLang = lang === 'anm' ? 'cpp' : lang;

      let ret = `<div class="hljs">${dedent(highlightCode(content, hljsLang))}</div>`;

      // // This is some quality jank right here, caused by the fact that I could not find a way to make hljs not escape this html
      // // <span data-name="ref:anm:set">
      //
      // ret = ret.replace(/&lt;span data-name=<span class="hljs-string">(.*?)<\/span>&gt;(.*?)&lt;\/span&gt;/g, (match, name, content) => {
      //   return `<span data-name=${name.replace(/&quot;/g, '"')}>${content}</span>`;
      // });
      // ret = ret.replace(/&lt;instr data-tip-id=<span class="hljs-string">(.*?)<\/span>&gt;(.*?)&lt;\/instr&gt;/g, (match, tip, content) => {
      //   return `<span data-tip-id=${tip.replace(/&quot;/g, '"')}>${content}</span>`;
      // });
      // ret = ret.replace(/&lt;instr data-tip=<span class="hljs-string">(.*?)<\/span>&gt;(.*?)&lt;\/instr&gt;/g, (match, tip, content) => {
      //   return `<span data-tip=${tip.replace(/&quot;/g, '"').replace(/&amp;/g, "&")}>${content}</span>`;
      // });
      // ret = ret.replace(/&lt;instr&gt;(.*?)&lt;\/instr&gt;/g, (match, content) => {
      //   return `<span>${content}</span>`;
      // });
      // // this is getting seriously out of hand
      // ret = ret.replace(/&lt;a (data-link=<span class="hjls-string">(.*?)<\/span> )?(href=<span class="hljs-string">(.*?)<\/span> )?class=<span class="hljs-string">(.*?)<\/span>&gt;(.*?)&lt;\/a&gt;/g, (match, _1, link, _2, url, classes, content) => {
      //   let attrs = '';
      //   if (link) attrs += `data-link=${link.replace(/&quot;/g, '"')} `;
      //   if (url) attrs += `href=${url.replace(/&quot;/g, '"').replace(/&amp;/g, "&")} `;
      //   attrs += `class=${classes.replace(/&quot;/g, '"')}`;
      //   return `<a ${attrs}>${content}</a>`;
      // });

      if (lang === 'anm') {
        // anm has no <, >, &, and *almost* no strings, so let's go to town
        ret = ret.replace(/<span class="hljs-string">(.*?)<\/span>/g, (match, content) => content);
        ret = ret.replace(/&quot;/g, '"');
        ret = ret.replace(/&lt;/g, '<');
        ret = ret.replace(/&gt;/g, '>');
        // avoid formatting inline-code inside block-code
        ret = ret.replace(/<(\/)?instr\b/g, '<$1span');
      }

      ret = ret.replace(/\\\\/g, "\\");
      return ret;
    },
  };

  const title = {
    type: "lang",
    regex: /\[title=(.*?)\]\n/,
    replace: function(match, content) {
      document.head.querySelector("title").innerText = content;
      return "";
    },
  };

  const c = {
    type: "lang",
    regex: /\[c=(.*?)\]([^]*?)\[\/c\]/g,
    replace: "<span style='color: $1'>$2</span>",
  };

  const GAMES = {
    '06': {color: "#ff5959", thname: "TH06", long: "Embodiment of Scarlet Devil", short: "EoSD"},
    '07': {color: "#62ffff", thname: "TH07", long: "Perfect Cherry Blossom", short: "PCB"},
    '08': {color: "#c0b6d6", thname: "TH08", long: "Imperishable Night", short: "IN"},
    '09': {color: "#ff82c0", thname: "TH09", long: "Phantasmagoria of Flower View", short: "PoFV"},
    '095': {color: "#ebc996", thname: "TH09.5", long: "Shoot the Bullet", short: "StB"},
    '10': {color: "#fafca2", thname: "TH10", long: "Mountain of Faith", short: "MoF"},
    '11': {color: "#adb0e6", thname: "TH11", long: "Subterranean Animism", short: "SA"},
    '12': {color: "lightgreen", thname: "TH12", long: "Undefined Fantastic Object", short: "UFO"},
    '125': {color: "orange", thname: "TH12.5", long: "Double Spoiler", short: "DS"},
    '128': {color: "#40ffeb", thname: "TH12.8", long: "Great Fairy Wars", short: "GFW"},
    '13': {color: "lightblue", thname: "TH13", long: "Ten Desires", short: "TD"},
    '14': {color: "#cf943a", thname: "TH14", long: "Double Dealing Character", short: "DDC"},
    '143': {color: "#ff9eb9", thname: "TH14.3", long: "Impossible Spell Card", short: "ISC"},
    '15': {color: "#f6d7ff", thname: "TH15", long: "Legacy of Lunatic Kingdom", short: "LoLK"},
    '16': {color: "#63f863", thname: "TH16", long: "Hidden Star in Four Seasons", short: "HSiFS"},
    '165': {color: "violet", thname: "TH16.5", long: "Violet Detector", short: "VD"},
    '17': {color: "#ff6565", thname: "TH17", long: "Wily Beast and Weakest Creature", short: "WBaWC"},
  };

  const gc = {
    type: "lang",
    regex: /\[gc=([01][0-9]*?)\]([^]*?)\[\/gc\]/g,
    replace: function(match, game, txt) {
      return /* html */`<span style="color: ${GAMES[game].color}">${txt}</span>`;
    },
  };

  const game = {
    type: "lang",
    regex: /\[game=([01][0-9]*?)\]/g,
    replace: function(match, game) {
      return `[gc=${game}]${GAMES[game].short}[/gc]`;
    },
  };
  const gameThLong = {
    type: "lang",
    regex: /\[game-thlong=([01][0-9]*?)\]/g,
    replace: function(match, game) {
      return `[gc=${game}]${GAMES[game].thname} ~ ${GAMES[game].long}[/gc]`;
    },
  };
  const gameLong = {
    type: "lang",
    regex: /\[game-long=([01][0-9]*?)\]/g,
    replace: function(match, game) {
      return `[gc=${game}]${GAMES[game].long}[/gc]`;
    },
  };

  const script = {
    type: "lang",
    regex: /\[script\]([^]*?)\[\/script\]/g,
    replace: function(match, content) {
      const $script = document.createElement("script");
      $script.innerHTML = content;
      $scriptContent.appendChild($script);
      return "";
    },
  };

  const ref = {
    type: "lang",
    regex: /\[ref=(.*?)\]/g,
    replace: function(match, ref) {
      const html = getRefHtml({ref, tip: true, url: true});
      if (html == null) return `\`${match}\``;

      return html;
    },
  };

  const refNotip = {
    type: "lang",
    regex: /\[ref-notip=(.*?)\]/g,
    replace: function(match, ref) {
      const html = getRefHtml({ref, tip: false, url: true});
      if (html == null) return `\`${match}\``;

      return html;
    },
  };

  const tip = {
    type: "lang",
    regex: /\[tip=(.*?)\]([^]*?)\[\/tip\]/g,
    replace: `<span data-tip='$1' class='tip-deco'>$2</span>`,
  };

  const tipNodeco = {
    type: "lang",
    regex: /\[tip-nodeco=(.*?)\]([^]*?)\[\/tip-nodeco\]/g,
    replace: `<span data-tip='$1'>$2</span>`,
  };

  async function requireAnmmap(version, content, id) {
    // this must always wait at least some time, to make sure that the function this was called from finished running...
    await new Promise((resolve) => setTimeout(resolve, 1));
    await loadAnmmap(null, "?"+version, version);
    const $replace = document.querySelector(`#require-anmmap-${id}`);
    if ($replace != null) {
      const context = parseQuery(window.location.hash);
      $replace.innerHTML = MD.makeHtml(content);
      globalNames.transformHtml($replace, context);
      globalLinks.transformHtml($replace, context);
    }
  }

  let eclmapId = 0;
  const anmmap = {
    type: "lang",
    regex: /\[require-anmmap=(v[0-9]+)\]([^]*?)\[\/require-anmmap\]/g,
    replace: function(match, num, content) {
      const id = eclmapId++;
      requireAnmmap(num, content, id);
      return "<div id='require-anmmap-"+id+"'>Loading eclmap...</div>";
    },
  };

  const headlessTable = {
    type: "lang",
    regex: /\[headless-table\]([^]*?)\[\/headless-table\]/g,
    replace: function(match, tableMd) {
      // need to handle inner markdown early since MD is disabled in block elements
      const tableHtml = MD.makeHtml(`${tableMd}`);
      return `<div class="headless-table">${tableHtml}</div>`;
    },
  };

  const wip = {
    type: "lang",
    regex: /\[wip(?:=([012]))?\]([^]*?)\[\/wip\]/g,
    replace: function(match, severity, content) {
      if (severity == null) {
        severity = "1";
      }
      return `<span data-wip="${severity}">${content}</span>`;
    },
  };

  return [
    anmmap, ref, refNotip, headlessTable,
    code, title, c, game, gameThLong, gameLong, script, tip, tipNodeco, wip,
    gc, // must be after things that use it (e.g. game)
  ];
};
