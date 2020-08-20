import {GROUPS_V8, ANM_INS_DATA, ANM_BY_OPCODE, ANM_OPCODE_REVERSE, DUMMY_DATA} from './ins-table.js';
import {ANM_VAR_DATA, ANM_VARS_BY_NUMBER, ANM_VAR_NUMBER_REVERSE} from './var-table.js';
import {globalRefNames, globalRefTips, globalRefLinks, getRefNameKey, getRefLinkKey} from '../ref.js';
import {MD} from '../main.js';
import {globalNames, globalLinks, PrefixResolver} from '../resolver.ts';
import {parseQuery, queryUrl, queryGame} from '../url-format.ts';
import {gameData} from '../game-names.ts';
import {getCurrentAnmmaps} from '../settings.ts';

/**
 * Resolves names from the suffix of 'anm:' namekeys,
 * which look like 'anm:v8:502'.
 */
const ANM_INS_NAMES = new PrefixResolver();
/**
 * Resolves names from the suffix of 'anmvar:' namekeys,
 * which look like 'anmvar:v8:10021'.
 */
const ANM_VAR_NAMES = new PrefixResolver();


const GAME_VERSIONS = {
  // FIXME
  "07": 'v7', "08": 'v7', "09": 'v7',
  // END FIXME
  "095": 'v7', "10": 'v7', "11": 'v7',
  "12": 'v7', "125": 'v7', "128": 'v7',
  "13": 'v8', "14": 'v8', "143": 'v8', "15": 'v8',
  "16": 'v8', "165": 'v8', "17": 'v8',
};

const VERSIONS = ["v7", "v8"];

// game to use when looking up a variable to get its type,
// or looking up a ref to get its opcode.
const VERSION_DEFAULT_GAMES_FOR_INTERNAL_LOOKUP = {
  'v7': '128',
  'v8': '17',
};

const ARGTYPES_HTML = {
  "S": /* html */`<span class="type int">int</span>`,
  "s": /* html */`<span class="type int">short</span>`,
  "b": /* html */`<span class="type int">byte</span>`,
  "$": /* html */`<span class="type int mut">int&</span>`,
  "f": /* html */`<span class="type float">float</span>`,
  "%": /* html */`<span class="type float mut">float&</span>`,
};

export function initAnm() {
  // FIXME HACK to make available to ins.md
  window.setupGameSelector = setupGameSelector;
  window.generateAnmInsTableHtml = () => generateTablePageHtml(INS_HANDLERS);
  window.generateAnmVarTableHtml = () => generateTablePageHtml(VAR_HANDLERS);

  initNames();

  registerRefTipsForTable(INS_HANDLERS); // "ref:anm:" tips
  registerRefTipsForTable(VAR_HANDLERS); // "ref:anmvar:" tips
  registerRefNamesForTable(INS_HANDLERS); // "ref:anm:" names
  registerRefNamesForTable(VAR_HANDLERS); // "ref:anmvar:" names
  globalRefLinks.registerPrefix('anm', (id, ctx) => getUrlByRef('anm:' + id, ctx, INS_HANDLERS));
  globalRefLinks.registerPrefix('anmvar', (id, ctx) => getUrlByRef('anmvar:' + id, ctx, VAR_HANDLERS));
}

function setupGameSelector($select) {
  const supportedGames = ANM_BY_OPCODE.keys();
  const currentQuery = parseQuery(window.location.hash);
  const currentGame = queryGame(currentQuery);
  for (const game of supportedGames) {
    const $option = document.createElement('option');
    $option.value = game;
    $option.text = `${gameData(game).thname} ~ ${gameData(game).long}`;
    if (game == currentGame) {
      $option.selected = true;
    }
    $select.appendChild($option);
  }

  $select.addEventListener('change', (ev) => {
    const query = Object.assign({}, currentQuery, {g: ev.target.value});
    window.location.href = queryUrl(query);
  });
}

function validateGameString(game) {
  if (typeof game !== 'string') {
    throw new TypeError(`bad game; expected string, got ${game}`);
  }
  if (!GAME_VERSIONS[game]) {
    throw new Error(`bad game: '${game}'`);
  }
}

function getOpcodeNameKey(game, opcode) {
  const version = GAME_VERSIONS[game];
  return `anm:${version}:${opcode}`;
}

function getVarNameKey(game, num) {
  const version = GAME_VERSIONS[game];
  return `anmvar:${version}:${num}`;
}

function initNames() {
  // Adds e.g. a 'v7:' prefix to a name if the version doesn't match the current page.
  function possiblyAddVersionPrefix(s, version, ctx) {
    if (version !== GAME_VERSIONS[queryGame(ctx)]) {
      return `${version}:${s}`;
    }
    return s;
  }

  // Instructions
  for (const version of VERSIONS) {
    const getDefaultName = (opcode) => `ins_${opcode}`;

    const getMappedName = (opcode, data) => {
      const name = getCurrentAnmmaps()[version].ins[opcode];
      if (name == null) return getDefaultName(opcode, data);
      return name;
    };

    // 'anm:' names
    ANM_INS_NAMES.registerPrefix(version, (suffix, ctx) => {
      const opcode = parseInt(suffix, 10);
      if (Number.isNaN(opcode)) return null;

      const name = getMappedName(opcode);
      return possiblyAddVersionPrefix(name, version, ctx);
    });
  }
  globalNames.registerPrefix('anm', (s, ctx) => ANM_INS_NAMES.getNow(s, ctx));

  // Variables
  // (this is sufficiently different from instructions that we'll just put up with the copypasta)
  for (const version of VERSIONS) {
    const getDefaultName = (opcode, type) => `[${opcode}${type === '%' ? '.0f' : ''}]`;

    const getMappedName = (opcode, type) => {
      const name = getCurrentAnmmaps()[version].vars[opcode];
      if (name == null) return getDefaultName(opcode, type);
      return type + name;
    };

    ANM_VAR_NAMES.registerPrefix(version, (suffix, ctx) => {
      const opcode = parseInt(suffix, 10);
      if (Number.isNaN(opcode)) return null;

      // Variables are always required to have crossrefs associated with them so that we can get the type
      const game = VERSION_DEFAULT_GAMES_FOR_INTERNAL_LOOKUP[version];
      const entry = ANM_VARS_BY_NUMBER.get(game)[opcode];
      if (entry == null) return null;
      const data = getDataByRef(entry.ref, VAR_HANDLERS);

      const name = getMappedName(opcode, data.type);
      return possiblyAddVersionPrefix(name, version, ctx);
    });
  }
  globalNames.registerPrefix('anmvar', (s, ctx) => ANM_VAR_NAMES.getNow(s, ctx));
}

// The implementation of instructions and variables share lots of commonalities,
// which are factored out using this very ad-hoc "table handlers" type.
const INS_HANDLERS = {
  tablePage: 'anm/ins',
  formatAnchor: (opcode) => `ins-${opcode}`,
  dataTable: ANM_INS_DATA,
  reverseTable: ANM_OPCODE_REVERSE,
  tableByOpcode: ANM_BY_OPCODE,
  dummyDataWhenNoRef: DUMMY_DATA,
  mainPrefix: 'anm', // prefix used in crossrefs ("anm:pos") and name keys ("anm:v8:pos")
  maxNumberRange: {min: 0, max: 1300}, // range that doesn't take long to iterate but is guaranteed to hold all opcodes
  descFromData: (data) => data.desc,
  generateTipHeader: generateAnmInsSiggy,
  getGroups: (game) => GAME_VERSIONS[game] == 'v8' ? GROUPS_V8 : [{min: 0, max: 1300, title: null}],
  generateTableRowHtml: generateInsTableRowHtml,
};
const VAR_HANDLERS = {
  tablePage: 'anm/var',
  formatAnchor: (num) => `var-${num}`,
  dataTable: ANM_VAR_DATA,
  reverseTable: ANM_VAR_NUMBER_REVERSE,
  tableByOpcode: ANM_VARS_BY_NUMBER,
  dummyDataWhenNoRef: null, // vars always have a ref
  mainPrefix: 'anmvar', // prefix used in crossrefs ("anmvar:pos") and name keys ("anmvar:v8:pos")
  descFromData: (data) => data.desc,
  generateTipHeader: generateAnmVarHeader,
  getGroups: (game) => [{min: 10000, max: 11000, title: null}],
  generateTableRowHtml: generateVarTableRowHtml,
};

function registerRefTipsForTable(tableHandlers) {
  const {mainPrefix, dataTable} = tableHandlers;
  globalRefTips.registerPrefix(mainPrefix, (id, ctx) => {
    const ins = dataTable[id];
    const ref = `${mainPrefix}:${id}`;
    return generateTip(ins, ref, ctx, tableHandlers);
  });
}

function registerRefNamesForTable(tableHandlers) {
  const {mainPrefix, reverseTable} = tableHandlers;
  globalRefNames.registerPrefix(mainPrefix, (id, ctx) => {
    const ref = `${mainPrefix}:${id}`;

    function preferredVersion() {
      // prefer anmmap for current game if it has this instruction
      const currentGame = queryGame(ctx);
      const table = reverseTable[currentGame];
      if (table && table[ref]) { // opcode in current game?
        return GAME_VERSIONS[currentGame];
      }

      // else find the latest game that has it and use that anmmap
      const data = getDataByRef(ref, tableHandlers);
      if (!data) return null;
      return GAME_VERSIONS[data.maxGame];
    }

    const version = preferredVersion();
    if (!version) return null;

    const versionGame = VERSION_DEFAULT_GAMES_FOR_INTERNAL_LOOKUP[version];
    const opcode = reverseTable[versionGame][ref];
    if (opcode == null) return null;
    return globalNames.getNow(`${mainPrefix}:${version}:${opcode}`, ctx);
  });
}

function generateTablePageHtml(tableHandlers) {
  const {getGroups, dummyDataWhenNoRef, mainPrefix, generateTableRowHtml} = tableHandlers;

  const currentQuery = parseQuery(window.location.hash);
  const game = queryGame(currentQuery);

  let total = 0;
  let documented = 0;
  const groups = getGroups(game);

  const shouldHaveNav = groups.length > 1;
  let base = "";
  let navigation = "";
  let table = "";
  if (shouldHaveNav) {
    navigation += /* html */`<div class='toc'><h3>Navigation</h3><ul>`;
  }

  for (const group of groups) {
    if (shouldHaveNav) {
      const groupAnchor = `group-${group.min}`;
      const navQuery = Object.assign({}, currentQuery, {a: groupAnchor});
      const navDest = queryUrl(navQuery);
      navigation += /* html */`<li><a href="${navDest}">${group.title} (${group.min}..)</a></li>`;
      table += /* html */`\n<h2 id="${groupAnchor}">${group.min}-${group.max}: ${group.title}</h2>`;
    }

    table += /* html */`<table class='ins-table'>`;
    for (let opcode=group.min; opcode<=group.max; ++opcode) {
      const refObj = getRefByOpcode(game, opcode, tableHandlers);
      if (refObj == null) continue; // instruction doesn't exist

      // instruction exists, but our docs may suck
      let {ref, wip} = refObj;
      let data = ref === null ? dummyDataWhenNoRef : getDataByRef(ref, tableHandlers); // ref null for UNASSIGNED
      if (!data) {
        // instruction is assigned, but ref has no entry in table
        window.console.error(`ref ${ref} is assigned to ${mainPrefix} number ${game}:${opcode} but has no data`);
        data = dummyDataWhenNoRef;
      }
      wip = Math.max(wip, data.wip || 0);

      if (wip === 0) {
        documented += 1;
      }
      total += 1;
      table += generateTableRowHtml(game, data, opcode, currentQuery);
    }

    table += "</table>";
  }
  if (shouldHaveNav) navigation += "</ul></div>";
  base += `Documented rate: ${documented}/${total} (${(documented/total*100).toFixed(2)}%)<br>`;
  base += "[wip=1]Items marked like this are not fully understood.[/wip]<br>[wip=2]Items like this are complete mysteries.[/wip]";

  const $out = parseHtml('<div>' + MD.makeHtml(base) + MD.makeHtml(navigation) + table + '</div>');
  globalNames.transformHtml($out, currentQuery);
  globalLinks.transformHtml($out, currentQuery);
  return $out;
}

function parseHtml(html) {
  const $tmp = document.createElement('div');
  $tmp.innerHTML = html;
  return $tmp.firstChild;
}

function generateAnmInsSiggy(ins, nameKey) {
  const lParen = /* html */`<span class="punct">${"("}</span>`;
  const rParen = /* html */`<span class="punct">${")"}</span>`;
  const params = /* html */`<span class="ins-params">${generateAnmInsParameters(ins)}</span>`;
  let name = globalNames.getHtml(nameKey);
  name = /* html */`<span class="ins-name" data-wip="${ins.wip}">${name}</span>`;
  return /* html */`<div class="anm-ins-siggy-wrapper">${name}${lParen}${params}${rParen}</div>`;
}

function generateAnmVarHeader(avar, nameKey) {
  const name = globalNames.getHtml(nameKey);
  return /* html */`<span class="var-header" data-wip="${avar.wip}">${name}</span>`;
}

function generateInsTableRowHtml(game, ins, opcode) {
  const nameKey = getOpcodeNameKey(game, opcode);
  let [desc] = handleTipHide(ins.desc, false);
  desc = postprocessAnmDesc(desc, false);

  return /* html */`
  <tr class="ins-table-entry" id="ins-${opcode}">
    <td class="col-id">${opcode}</td>
    <td class="col-name">${generateAnmInsSiggy(ins, nameKey)}</td>
    <td class="col-desc">${desc}</td>
  </tr>
  `;
}

function generateVarTableRowHtml(game, ins, opcode) {
  const nameKey = getVarNameKey(game, opcode);
  let [desc] = handleTipHide(ins.desc, false);
  desc = postprocessAnmDesc(desc, false);

  // FIXME: add a mutability column.
  return /* html */`
  <tr class="ins-table-entry" id="var-${opcode}">
    <td class="col-id">${opcode}</td>
    <td class="col-name">${generateAnmVarHeader(ins, nameKey)}</td>
    <td class="col-desc">${desc}</td>
  </tr>
  `;
}

function generateAnmInsParameters(ins) {
  const comma = /* html */`<span class="punct">${","}</span>`;
  let ret = "";
  for (let i=0; i<ins.args.length; ++i) {
    switch (i) {
      // Allow breaking after the opening parenthesis
      case 0: ret += `<wbr>`; break;
      default: ret += `${comma} `; break;
    }
    ret += ARGTYPES_HTML[ins.sig[i]] + "&nbsp;" + ins.args[i];
  }
  return ret;
}

function handleTipHide(desc, isTip) {
  const hasHidden = !!desc.match(/\[tiphide\]/g);
  // note: we also strip space with *at most* one newline so that [tiphide] or [/tiphide]
  // sitting on its own line doesn't become a paragraph break in markdown when stripped.
  if (isTip) {
    desc = desc.replace(/ *\n? *\[tiphide\][^]*?\[\/tiphide\]/g, '');
  } else {
    desc = desc.replace(/ *\n? *\[(\/)?tiphide\]/g, '');
  }
  return [desc, hasHidden];
}

function postprocessAnmDesc(desc, isTip) {
  let ret = desc;
  if (isTip) {
    ret = disableTooltips(ret);
  }
  return MD.makeHtml(ret);
}

function disableTooltips(desc) {
  return desc.replace(/\[ref=/g, "[ref-notip=");
}

function getRefByOpcode(game, opcode, tableHandlers) {
  const {tableByOpcode} = tableHandlers;

  const entry = tableByOpcode.get(game)[opcode];
  if (entry === undefined) return null; // opcode doesn't exist in game

  const out = Object.assign({}, entry);
  out.wip = out.wip || 0;
  return out;
}

function stripRefPrefix(prefix, ref) {
  if (!ref.startsWith(`${prefix}:`)) {
    throw new Error(`expected ${prefix} ref, got "${ref}"`);
  }
  return ref.substring(prefix.length + 1);
}

// Get instruction data for an 'anm:' or 'anmvar:' ref id.
function getDataByRef(ref, {mainPrefix, dataTable}) {
  const id = stripRefPrefix(mainPrefix, ref);

  const out = dataTable[id];
  if (out == null) {
    window.console.warn(`bad ${mainPrefix} crossref: ${id}`);
    return null;
  }
  return out;
}

function generateTip(ins, ref, context, tableHandlers) {
  const {descFromData, generateTipHeader} = tableHandlers;
  const [desc, omittedInfo] = handleTipHide(descFromData(ins), true);
  const contents = postprocessAnmDesc(desc, true);
  const heading = generateTipHeader(ins, getRefNameKey(ref));
  return {heading, contents, omittedInfo};
}

function getUrlByRef(ref, context, tableHandlers) {
  const samePageUrl = getSamePageUrlByRef(ref, context, tableHandlers);
  if (samePageUrl != null) return samePageUrl;

  const {reverseTable, tablePage, formatAnchor} = tableHandlers;

  const data = getDataByRef(ref, tableHandlers);
  if (!data) return null;
  const game = data.maxGame;
  const opcode = reverseTable[game][ref];
  return queryUrl({s: tablePage, g: game, a: formatAnchor(opcode)});
}

// Try to identify links to things available on the current page,
// so that we can build a URL that avoids regenerating the table.
function getSamePageUrlByRef(ref, context, tableHandlers) {
  const {reverseTable, tablePage, formatAnchor} = tableHandlers;

  if (context.s !== tablePage) return null; // not on right page

  const curGame = queryGame(context);
  const opcode = reverseTable[curGame][ref];
  if (opcode == null) return null; // this instr is not in the current game

  // change the anchor on the existing query to guarantee no reload
  context.a = formatAnchor(opcode);
  return queryUrl(context);
}
