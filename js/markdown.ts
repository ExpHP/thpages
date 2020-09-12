import {Converter, ShowdownExtension} from 'showdown';
import {setWindowTitle, highlightCode, $scriptContent} from "./main";
import {getRefHtml} from "./ref";
import {gameData, validateGame, GameData} from './game-names';
import {parseQuery, queryUrl} from './url-format';
import dedent from "./lib/dedent";

export const MD: Converter = new Converter({
  extensions: [showdownExt],
  tables: true,
  strikethrough: true,
  literalMidWordUnderscores: true,
  noHeaderId: true,
});

type ReplaceFunc = (match: string, ...sf: (string | null)[]) => string;

// ShowdownExtension annotates `replace` as `any` for some reason.  Wrap replace funcs
// inside this to get their arguments automatically inferred as nullable strings.
function sf(f: ReplaceFunc) {
  return f;
}

function showdownExt() {
  const code: ShowdownExtension = {
    type: "lang",
    regex: /\[code(=.*?)?\]([^]+?)\[\/code\]/g,
    replace: sf((_match, lang, content) => {
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
    }),
  };

  const title = {
    type: "lang",
    regex: /\[title=(.*?)\]\n/,
    replace: sf((_match, content) => {
      setWindowTitle(content);
      return "";
    }),
  };

  const c = {
    type: "lang",
    regex: /\[c=(.*?)\]([^]*?)\[\/c\]/g,
    replace: "<span style='color: $1'>$2</span>",
  };

  const withGame = (gameStr: string, fallback: string, func: (g: GameData) => string) => {
    const game = validateGame(gameStr);
    if (game) {
      return func(gameData(game));
    } else {
      console.error(`bad game: '${gameStr}'`);
      return fallback;
    }
  };

  const gc = {
    type: "lang",
    regex: /\[gc=([01][0-9]*?)\]([^]*?)\[\/gc\]/g,
    replace: /* html */`<span class="gamecolor gamecolor-$1">$2</span>`,
  };

  const game = {
    type: "lang",
    regex: /\[game=([01][0-9]*?)\]/g,
    replace: sf((match, gameStr) => withGame(gameStr!, match, (data) => {
      return `[gc=${gameStr}]${data.short}[/gc]`;
    })),
  };
  const gameTh = {
    type: "lang",
    regex: /\[game-th=([01][0-9]*?)\]/g,
    replace: sf((match, gameStr) => withGame(gameStr!, match, (data) => {
      return `[gc=${gameStr}]${data.thname}[/gc]`;
    })),
  };
  const gameNum = {
    type: "lang",
    regex: /\[game-num=([01][0-9]*?)\]/g,
    replace: sf((match, gameStr) => withGame(gameStr!, match, (data) => {
      return `[gc=${gameStr}]${data.thname.substring(2)}[/gc]`;
    })),
  };
  const gameThLong = {
    type: "lang",
    regex: /\[game-thlong=([01][0-9]*?)\]/g,
    replace: sf((match, gameStr) => withGame(gameStr!, match, (data) => {
      return `[gc=${gameStr}]${data.thname} ~ ${data.long}[/gc]`;
    })),
  };
  const gameLong = {
    type: "lang",
    regex: /\[game-long=([01][0-9]*?)\]/g,
    replace: sf((match, gameStr) => withGame(gameStr!, match, (data) => {
      return `[gc=${gameStr}]${data.long}[/gc]`;
    })),
  };

  const script = {
    type: "lang",
    regex: /\[script\]([^]*?)\[\/script\]/g,
    replace: sf((_match, content) => {
      const $script = document.createElement("script");
      $script.innerHTML = content!;
      $scriptContent.appendChild($script);
      return "";
    }),
  };

  const ref = {
    type: "lang",
    regex: /\[ref=(.*?)\]/g,
    replace: sf((match, ref) => {
      const html = getRefHtml({ref: ref!, tip: true, url: true});
      if (html == null) return `\`${match}\``;

      return html;
    }),
  };

  const refNotip = {
    type: "lang",
    regex: /\[ref-notip=(.*?)\]/g,
    replace: sf((match, ref) => {
      const html = getRefHtml({ref: ref!, tip: false, url: true});
      if (html == null) return `\`${match}\``;

      return html;
    }),
  };

  const more = {
    type: "lang",
    regex: /\[more\]([^]*?)\[\/more\]/g,
    replace: sf((_match, content) => {
      // outer <div> is to prevent showdown from putting the anchor tag inside a <p>, where
      // it would no longer be an adjacent sibling to the inner div.
      return `<div><a class='show-more'></a><div>${MD.makeHtml(content!)}</div></div>`;
    }),
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
    replace: sf((_match, tableMd) => {
      // need to handle inner markdown early since MD is disabled in block elements
      const tableHtml = MD.makeHtml(tableMd!);
      return `<div class="headless-table">${tableHtml}</div>`;
    }),
  };

  const wip = {
    type: "lang",
    regex: /\[wip(?:=([012]))?\]([^]*?)\[\/wip\]/g,
    replace: sf((_match, severity, content) => {
      if (severity == null) {
        severity = "1";
      }
      return `<span data-wip="${severity}">${content}</span>`;
    }),
  };

  // used to de-emphasize so that I don't abuse [wip=2] for this
  const weak = {
    type: "lang",
    regex: /\[weak\]([^]*?)\[\/weak\]/g,
    replace: '<span class="weak">$1</span>',
  };

  const footRef = {
    type: "lang",
    regex: /\[foot-ref=([^\]]+)\]/g,
    replace: sf((_match, id) => {
      const query = parseQuery(window.location.hash);
      query.a = `footnote-${id}`;
      return `<sup class="footnote link"><a href="${queryUrl(query)}">${id}</a></sup>`;
    }),
  };

  const footDef = {
    type: "lang",
    regex: /\[foot-def=([^\]]+)\]/g,
    replace: '<sup class="footnote def" id="footnote-$1">$1</sup>',
  };

  const tableFootnotes = {
    type: "lang",
    regex: /\[table-footnotes, *ncols=([0-9]+)\]([^]*?)\[\/table-footnotes\]/g,
    replace: sf((_match, ncolsStr, content) => {
      // Ultimately we want to put the contents in a tfoot in the above table, but we have
      // to wait until the table has been parsed.  For now, we'll render the contents into a
      // div right below the table, and move it where it belongs as a post-processing step.
      return `<div class="tfoot" data-ncols="${ncolsStr}">${MD.makeHtml(content!)}</div>`;
    }),
  };

  // download link with icon
  const dl = {
    type: "lang",
    regex: /\[dl=([^\]]+)\]\(([^)]+)\)/g,
    replace: `<a download class='download' href='$2'>$1</a>`,
  };

  return [
    more, ref, refNotip, headlessTable, code, title, c, tableFootnotes,
    game, gameTh, gameThLong, gameNum, gameLong, script, tip, tipNodeco, wip, weak,
    footRef, footDef, dl,
    gc, // must be after things that use it (e.g. game)
  ];
}

/**
 * Perform postprocessing on markdown that is only feasible after conversion to HTML and
 * being parsed into a DOM tree.
 *
 * Because showdown primarily operates on strings, code that uses the markdown converter
 * will need to find a place to call this after all markdown conversion is finished and
 * the HTML has been parsed into elements.
 * */
export function postprocessConvertedMarkdown($root: HTMLElement) {
  // Add callbacks for things like [more] in showdown generated output.
  for (const $elem of $root.querySelectorAll<HTMLElement>('.show-more')) {
    $elem.addEventListener('click', () => $elem.classList.toggle('expanded'));
  }

  // This is a bit fragile and depends on how the markdown engine handles a div on the next line
  // after a GHFM table.  Currently, showdown leaves it undisturbed after the table.
  for (const $div of $root.querySelectorAll<HTMLElement>('div.tfoot')) {
    const $table = $div.previousElementSibling;
    if ($table?.tagName !== 'TABLE') {
      console.error("can't find table for table footer, did markdown output change?");
      continue;
    }

    // Because Showdown didn't know this was table cell text when it converted it, it will have wrapped
    // any non-block content in a <p> tag.  Eliminate that so we don't have to fix its spacing.
    if ($div!.children.length === 1) {
      let $p;
      if ($p = $div.querySelector(':scope > p')) {
        $div.removeChild($p);
        $div.append(...$p.childNodes);
      }
    }

    $div.parentElement!.removeChild($div);
    const $tfoot = document.createElement('tfoot');
    $tfoot.innerHTML = `<tr><td colspan='${$div.dataset.ncols}'></td></tr>`;
    $tfoot.querySelector('td')!.append(...$div.childNodes);

    // Thankfully, in HTML 5, tfoot goes at the end, unlike in HTML 4 where this would be much more complicated...
    $table.appendChild($tfoot);
  }
}
