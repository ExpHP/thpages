import {MD, highlightCode, $scriptContent} from "./main.js";
import {getRefHtml} from "./ref.js";
import {gameData} from './game-names.ts';
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

  const gc = {
    type: "lang",
    regex: /\[gc=([01][0-9]*?)\]([^]*?)\[\/gc\]/g,
    replace: function(match, game, txt) {
      return /* html */`<span style="color: ${gameData(game).color}">${txt}</span>`;
    },
  };

  const game = {
    type: "lang",
    regex: /\[game=([01][0-9]*?)\]/g,
    replace: function(match, game) {
      return `[gc=${game}]${gameData(game).short}[/gc]`;
    },
  };
  const gameThLong = {
    type: "lang",
    regex: /\[game-thlong=([01][0-9]*?)\]/g,
    replace: function(match, game) {
      return `[gc=${game}]${gameData(game).thname} ~ ${gameData(game).long}[/gc]`;
    },
  };
  const gameLong = {
    type: "lang",
    regex: /\[game-long=([01][0-9]*?)\]/g,
    replace: function(match, game) {
      return `[gc=${game}]${gameData(game).long}[/gc]`;
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
    regex: /\[tip=([^]*?)\]([^]*?)\[\/tip\]/g,
    replace: `<span data-tip='$1' class='tip-deco'>$2</span>`,
  };

  const tipNodeco = {
    type: "lang",
    regex: /\[tip-nodeco=(.*?)\]([^]*?)\[\/tip-nodeco\]/g,
    replace: `<span data-tip='$1'>$2</span>`,
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

  // used to de-emphasize so that I don't abuse [wip=2] for this
  const weak = {
    type: "lang",
    regex: /\[weak\]([^]*?)\[\/weak\]/g,
    replace: '<span class="weak">$1</span>',
  };

  return [
    ref, refNotip, headlessTable, code, title, c,
    game, gameThLong, gameLong, script, tip, tipNodeco, wip, weak,
    gc, // must be after things that use it (e.g. game)
  ];
};
