import {loadEclmap} from "./ecl/eclmap.js";
import {MD, highlightCode, $scriptContent} from "./main.js";
import {getRefHtml} from "./ref.js";
import dedent from "./lib/dedent.js";

export const ext = function() {
  const yt = {
    type: "lang",
    regex: /\[yt\](.*?)\[\/yt\]/g,
    replace: '<div class="fit-wrapper" data-yt="$1"><div class="fit-wrapper2 yt"><div class="video-load"><div>Automatic video loading is <b>disabled</b>, in order to reduce network usage and loading times.<br>Click this to load the video.</div></div></div></div>',
  };
  const hr = {
    type: "lang",
    regex: /\[hr\]/g,
    replace: "<hr>",
  };
  const br = {
    type: "lang",
    regex: /\[br\]/g,
    replace: "<br>",
  };
  const ts = {
    type: "lang",
    regex: /\[timestamp=(.*?)\]/g,
    replace: "<div style='float: right'>$1</div>",
  };
  const img = {
    type: "lang",
    regex: /\[img=(.*?), hratio=(.*?)\]/g,
    replace: '<div class="fit-wrapper"><div class="fit-wrapper2" style="padding-top: $2%"><img title="$1" style="cursor:pointer;" onclick="window.open(\'$1\')" src="$1"></div></div>',
  };
  const imgSmall = {
    type: "lang",
    regex: /\[img=(.*?)]/g,
    replace: '<img title="$1" style="cursor:pointer; margin: 5px;" onclick="window.open(\'$1\')" src="$1">',
  };

  const jank = document.createElement("textarea");
  jank.classList.add("clipboard-jank");
  const code = {
    type: "lang",
    regex: /\[code\]([^]+?)\[\/code\]/g,
    replace: function(match, content) {
      let ret = "<hljs>"+dedent(highlightCode(content))+"</hljs>";
      // This is some quality jank right here, caused by the fact that I could not find a way to make hljs not escape this html
      ret = ret.replace(/&lt;instr data-tip=<span class="hljs-string">(.*?)<\/span>&gt;(.*?)&lt;\/instr&gt;/g, (match, tip, content) => {
        return `<span data-tip=${tip.replace(/&amp;/g, "&")}>${content}</span>`;
      });
      ret = ret.replace(/&lt;instr&gt;(.*?)&lt;\/instr&gt;/g, (match, content) => {
        return `<span>${content}</span>`;
      });
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

  const colors = {
    6: "#ff5959",
    7: "#62ffff",
    8: "#c0b6d6",
    9: "#ff82c0",
    95: "#ebc996",
    10: "#fafca2",
    11: "#adb0e6",
    12: "lightgreen",
    125: "orange",
    128: "#40ffeb",
    13: "lightblue",
    14: "#cf943a",
    143: "#ff9eb9",
    15: "#f6d7ff",
    16: "#63f863",
    165: "violet",
    17: "#ff6565",
  };

  const game = {
    type: "lang",
    regex: /\[game=([0-9]*?)\]([^]*?)\[\/game\]/g,
    replace: function(match, game, txt) {
      return "<span style='color: "+colors[game]+"'>"+txt+"</span>";
    },
  };

  const rawGame = {
    type: "lang",
    regex: /%GAMECOLOR-([0-9]*?)%/g,
    replace: function(match, game) {
      return colors[game];
    },
  };

  // disable markdown in region
  const html = {
    type: "lang",
    regex: /\[html\]([^]*?)\[\/html\]/g,
    replace: "$1",
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

  // const ins = {
  //   type: "lang",
  //   regex: /\[ins=(.*?),(.*?)\]/g,
  //   replace: function(match, num, game) {
  //     const ins = getOpcode(game, parseInt(num));
  //     if (ins == null) return "`opcode_error_"+num+"`";
  //     const tip = getOpcodeTip(ins);
  //     const name = getOpcodeName(ins.number, ins.documented);
  //     return `<instr data-tip="${tip}">${name}</instr>`;
  //   },
  // };
  // const insNotip = {
  //   type: "lang",
  //   regex: /\[ins_notip=(.*?),(.*?)\]/g,
  //   replace: function(match, num, game) {
  //     const ins = getOpcode(parseFloat(game), parseInt(num));
  //     if (ins == null) return "`opcode_error_"+num+"`";
  //     return `<instr>${getOpcodeName(ins.number, ins.documented)}</instr>`;
  //   },
  // };

  const ref = {
    type: "lang",
    regex: /\[ref=(.*?)\]/g,
    replace: function(match, id) {
      const ref = getRefHtml({id: id, tip: true, url: true});
      if (ref == null) return `\`${match}\``;

      return ref;
    },
  };

  const refNotip = {
    type: "lang",
    regex: /\[ref-notip=(.*?)\]/g,
    replace: function(match, id) {
      const ref = getRefHtml({id: id, tip: true, url: true});
      if (ref == null) return `\`${match}\``;

      return ref;
    },
  };

  // const variable = {
  //   type: "lang",
  //   regex: /\[var=(-?.*?),(.*?)\]/g,
  //   replace: function(match, num, game) {
  //     const variable = getVar(normalizeGameVersion(game), parseInt(num));
  //     if (variable == null) return "<instr>variable_error_"+num+"</instr>";
  //     const tip = getVarTip(variable);
  //     const name = getVarName(num, variable.documented);
  //     return `<instr data-tip="${tip}">${name}</instr>`;
  //   },
  // };

  // const variableNotip = {
  //   type: "lang",
  //   regex: /\[var_notip=(-?.*?),(.*?)\]/g,
  //   replace: function(match, num, game) {
  //     const variable = getVar(normalizeGameVersion(game), parseInt(num));
  //     if (variable == null) return `<instr>variable_error_${num}</instr>`;
  //     return `<instr>${getVarName(num, variable.documented)}</instr>`;
  //   },
  // };

  const tip = {
    type: "lang",
    regex: /\[tip=(.*?)\]([^]*?)\[\/tip\]/g,
    replace: `<span data-tip='$1'>$2</span>`,
  };

  async function requireEclmap(game, content, id) {
    // this must always wait at least some time, to make sure that the function this was called from finished running...
    await new Promise((resolve) => setTimeout(resolve, 1));
    game = parseFloat(game);
    await loadEclmap(null, "?"+game, game);
    const $replace = document.querySelector(`#require-eclmap-${id}`);
    if ($replace != null) {
      $replace.innerHTML = MD.makeHtml(content);
    }
  }

  let eclmapId = 0;
  const eclmap = {
    type: "lang",
    regex: /\[requireEclmap=([0-9]+?)\]([^]*?)\[\/requireEclmap\]/g,
    replace: function(match, num, content) {
      const id = eclmapId++;
      requireEclmap(num, content, id);
      return "<div id='require-eclmap-"+id+"'>Loading eclmap...</div>";
    },
  };

  // let eclTooltips = {
  //   type: "lang",
  //   filter: function(text) {
  //     return addTooltips(text);
  //   },
  // };

  const video = {
    type: "lang",
    regex: /\[video=(.*?), hratio=(.*?)\]/g,
    replace: '<div class="fit-wrapper" data-video="$1"><div class="fit-wrapper2" style="padding-top: $2%"><div class="video-load"><div>Automatic video loading is <b>disabled</b>, in order to reduce network usage and loading times.<br>Click this to load the video.</div></div></div></div>',
  };

  const flex = {
    type: "lang",
    regex: /\[flex\]([^]*?)\[\/flex\]/g,
    replace: '<div class="flexbox">$1</div>',
  };

  const flex2 = {
    type: "lang",
    regex: /\[flex=(.*?)\]([^]*?)\[\/flex\]/g,
    replace: '<div class="flexbox" style="align-items: $1">$2</div>',
  };

  const wip = {
    type: "lang",
    regex: /\[wip(?:=([012]))?\]([^]*?)\[\/wip\]/g,
    replace: function(match, severity, content) {
      if (severity == null) {
        severity = "1";
      }
      switch (parseInt(severity, 10)) {
        case 0: return content;
        case 1: return `<span class="wip">${content}</span>`;
        case 2: return `<span class="wip2">${content}</span>`;
      }
    },
  };

  return [
    eclmap, yt, hr, br, ts, img, imgSmall, ref, refNotip,
    code, title, c, game, rawGame, html, script, tip, video, flex, flex2, wip,
  ];
};
