import {loadAnmmap, getCurrentMap} from './eclmap.js';
import {GROUPS_V8, GROUPS_PRE_V8, ANM_INS_DATA, ANM_BY_OPCODE, ANM_OPCODE_REVERSE, DUMMY_DATA} from './ins-table.js';
import {ANM_VAR_DATA, ANM_VARS_BY_NUMBER, ANM_VAR_NUMBER_REVERSE} from './var-table.js';
import {globalRefNames, globalRefTips, globalRefLinks, getRefNameKey} from '../ref.js';
import {MD} from '../main.js';
import {globalNames, PrefixResolver} from '../resolver.ts';
import {parseQuery, buildQuery} from '../url-format.ts';

const INS_TABLE_PAGE = 'anm/ins';
const DEFAULT_GAME = '17';

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

/**
 * A game number as a string with no period, with a leading 0 for numbers below 10, e.g. "14", "125", "095".
 *
 * This representation is chosen to enable simple lexical comparisons using the built-in &lt; and &gt; operators.
 * @typedef {string} Game
 */
const GAME_VERSIONS = {
  // FIXME
  "07": 'v7', "08": 'v7', "09": 'v7', "095": 'v7',
  "10": 'v7', "11": 'v7',
  // END FIXME
  "12": 'v7', "125": 'v7', "128": 'v7',
  "13": 'v8', "14": 'v8', "143": 'v8', "15": 'v8',
  "16": 'v8', "165": 'v8', "17": 'v8',
};

const VERSIONS = ["v7", "v8"];

// game to use when looking up a variable to get its type,
// or looking up a ref to get its opcode.
const VERSION_DEFAULT_GAMES_FOR_INTERNAL_LOOKUP = {
  'v7': '125',
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
  window.generateOpcodeTable = generateOpcodeTable;
  window.loadAnmmap = loadAnmmap;

  initNames();

  globalRefTips.registerPrefix('anm', (id, ctx) => {
    const ins = ANM_INS_DATA[id];
    const ref = 'anm:' + id;
    return generateAnmInsTip(ins, ref);
  });

  globalRefTips.registerPrefix('anmvar', (id, ctx) => {
    const avar = ANM_VAR_DATA[id];
    const ref = 'anmvar:' + id;
    return generateAnmVarTip(avar, ref);
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

function getGroups(game) {
  validateGameString(game);
  return game >= '13' ? GROUPS_V8 : GROUPS_PRE_V8;
}

function getOpcodeNameKey(game, opcode) {
  return `anm:${game}-${opcode}`;
}

function getVarNameKey(game, num) {
  return `anmvar:${game}-${num}`;
}

function initNames() {
  // Adds e.g. a 'v7:' prefix to a name if the version doesn't match the current page.
  function possiblyAddVersionPrefix(s, version, ctx) {
    if (ctx.g && version !== GAME_VERSIONS[ctx.g]) {
      return `${version}:${s}`;
    }
    return s;
  }

  // Instructions
  for (const version of VERSIONS) {
    const getDefaultName = (opcode) => `ins_${opcode}`;

    const getMappedName = (opcode) => {
      const map = getCurrentMap(version);
      if (map === null) return getDefaultName(opcode);

      const name = map.getMnemonic(opcode);
      if (name === null) return getDefaultName(opcode);
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

  // 'ref:anm:' names
  globalRefNames.registerPrefix('anm', (id, ctx) => {
    const ref = 'anm:' + id;
    function preferredVersion() {
      // prefer anmmap for current game if it has this instruction
      const table = ANM_OPCODE_REVERSE[ctx.g];
      if (table && table[ref]) { // opcode in current game?
        return GAME_VERSIONS[ctx.g];
      }

      // else find the latest game that has it and use that anmmap
      const entry = anmInsDataByRef(ref);
      if (!entry) return null;
      return GAME_VERSIONS[entry.maxGame];
    }

    const version = preferredVersion();
    if (!version) return null;

    const versionGame = VERSION_DEFAULT_GAMES_FOR_INTERNAL_LOOKUP[version];
    const opcode = ANM_OPCODE_REVERSE[versionGame][ref];
    if (opcode == null) return null;
    return globalNames.getNow(`anm:${version}:${opcode}`);
  });

  // Variables
  for (const version of VERSIONS) {
    const getDefaultName = (opcode, type) => `[${opcode}${type === '%' ? '.0' : ''}]`;

    const getMappedName = (opcode, type) => {
      const map = getCurrentMap(version);
      if (map === null) return getDefaultName(opcode);

      const name = map.getGlobal(opcode);
      if (name === null) return getDefaultName(opcode);
      return type + name;
    };

    ANM_INS_NAMES.registerPrefix(version, (suffix, ctx) => {
      const opcode = parseInt(suffix, 10);
      if (Number.isNaN(opcode)) return null;

      // try to find the type, else assume integer
      let type = '$';
      const game = VERSION_DEFAULT_GAMES_FOR_INTERNAL_LOOKUP[version];
      if (game && ANM_VARS_BY_NUMBER[game]) {
        const {ref} = ANM_VARS_BY_NUMBER[game][opcode];
        const avar = anmVarDataByRef(ref);
        if (avar) {
          type = avar.type;
        }
      }

      const name = getMappedName(opcode, type);
      return possiblyAddVersionPrefix(name, version, ctx);
    });
  }
  globalNames.registerPrefix('anmvar', (s, ctx) => ANM_VAR_NAMES.getNow(s, ctx));

  // FIXME copypasta
  globalRefNames.registerPrefix('anmvar', (id, ctx) => {
    const ref = 'anmvar:' + id;
    function preferredVersion() {
      // prefer anmmap for current game if it has this instruction
      const table = ANM_VAR_NUMBER_REVERSE[ctx.g];
      if (table && table[ref]) { // opcode in current game?
        return GAME_VERSIONS[ctx.g];
      }

      // else find the latest game that has it and use that anmmap
      const entry = anmVarDataByRef(ref);
      if (!entry) return null;
      return GAME_VERSIONS[entry.maxGame];
    }

    const version = preferredVersion();
    if (!version) return null;

    const versionGame = VERSION_DEFAULT_GAMES_FOR_INTERNAL_LOOKUP[version];
    const opcode = ANM_VAR_NUMBER_REVERSE[versionGame][ref];
    if (opcode == null) return null;
    return globalNames.getNow(`anmvar:${version}:${opcode}`);
  });

  globalRefLinks.registerPrefix('anm', (id, ctx) => getAnmInsUrlByRef('ref:' + id, ctx));
}

/**
 * Load an anmmap and set things up to resolve names from it whenever possible.
 *
 * (does not fix names in existing HTML however.  Do that yourself by calling names.transformHtml...)
 * @param {?string} file
 * @param {string} cacheKey Key identifying the specific file for caching.
 * @param {Game} version Determines what version.
 */
export async function loadAnmmapAnd(file, cacheKey, version) {
  await loadAnmmap(file, cacheKey, version);
}

function generateOpcodeTable(game) {
  let base = `Current table: [gc=${game}] version ${game}[/gc]<br>`;

  let navigation = /* html */`<div class='toc'><h3>Navigation</h3><ul>`;
  let table = "";

  const currentQuery = parseQuery(window.location.hash);

  let total = 0;
  let documented = 0;
  const groups = getGroups(game);
  for (let i=0; i<groups.length; ++i) {
    const group = groups[i];

    const groupAnchor = `group-${group.min}`;
    const navQuery = Object.assign({}, currentQuery, {a: groupAnchor});
    const navDest = '#' + buildQuery(navQuery);
    navigation += /* html */`<li><a href="${navDest}">${group.title} (${group.min}..)</a></li>`;

    table += /* html */`\n<h2 id="${groupAnchor}">${group.min}-${group.max}: ${group.title}</h2>`;
    table += /* html */`<table class='ins-table'>`;

    for (let opcode=group.min; opcode<=group.max; ++opcode) {
      const refObj = anmInsRefByOpcode(game, opcode);
      if (refObj == null) continue; // instruction doesn't exist

      // instruction exists, but our docs may suck
      let {ref, wip} = refObj;
      let ins = ref === null ? DUMMY_DATA : anmInsDataByRef(ref); // ref null for UNASSIGNED
      if (!ins) {
        // instruction is assigned, but ref has no entry in table
        window.console.error(`ref ${ref} is assigned to anm opcode ${game}:${opcode} but has no data`);
        ins = DUMMY_DATA;
      }
      wip = Math.max(wip, ins.wip || 0);

      if (wip === 0) {
        documented += 1;
      }
      total += 1;
      table += generateOpcodeTableEntry(game, ins, opcode);
    }

    table += "</table>";
  }
  navigation += "</ul></div>";
  base += `Documented instructions: ${documented}/${total} (${(documented/total*100).toFixed(2)}%)<br>`;
  base += "[wip=1]Instructions marked like this are not fully understood.[/wip]<br>[wip=2]Items like this are complete mysteries.[/wip]";
  return MD.makeHtml(base) + MD.makeHtml(navigation) + table;
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
  return /* html */`<span class="var-name" data-wip="${avar.wip}">${name}</span>`;
}

function generateOpcodeTableEntry(game, ins, opcode) {
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

function anmInsRefByOpcode(game, opcode) {
  const entry = ANM_BY_OPCODE[game][opcode];
  if (entry === undefined) return null;

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

// Get instruction data for an 'anm:' ref id.
function anmInsDataByRef(ref) {
  const id = stripRefPrefix('anm', ref);

  const out = ANM_INS_DATA[id];
  if (out == null) {
    window.console.warn(`bad anm crossref: ${id}`);
    return null;
  }
  return out;
}

// Get data for an 'anmvar:' ref id.
function anmVarDataByRef(ref) {
  const id = stripRefPrefix('anmvar', ref);

  const out = ANM_VAR_DATA[id];
  if (out == null) {
    window.console.warn(`bad anmvar crossref: ${id}`);
    return null;
  }
  return out;
}

function generateAnmInsTip(ins, ref) {
  const [desc, omittedInfo] = handleTipHide(ins.desc, true);
  const contents = postprocessAnmDesc(desc, true);
  const heading = generateAnmInsSiggy(ins, getRefNameKey(ref));
  return {heading, contents, omittedInfo};
}

function generateAnmVarTip(avar, ref) {
  const [desc, omittedInfo] = handleTipHide(avar.desc, true);
  const contents = postprocessAnmDesc(desc, true);
  const heading = generateAnmVarHeader(avar, getRefNameKey(ref));
  return {heading, contents, omittedInfo};
}

function getAnmInsUrlByRef(ref, context) {
  const samePageUrl = getSamePageAnmInsUrlByRef(ref);
  if (samePageUrl != null) return samePageUrl;

  const ins = anmInsDataByRef(ref);
  if (!ins) return null;
  const game = ins.maxGame;
  const opcode = ANM_OPCODE_REVERSE[game][ref];
  return '#' + buildQuery({s: INS_TABLE_PAGE, g: game, a: `ins-${opcode}`});
}

// Try to identify links to things available on the current page,
// so that we can build a URL that avoids regenerating the table.
function getSamePageAnmInsUrlByRef(ref, context) {
  if (context.s !== INS_TABLE_PAGE) return null; // not on right page

  const curGame = context.g || DEFAULT_GAME;
  const opcode = ANM_OPCODE_REVERSE[curGame][ref];
  if (opcode == null) return null; // this instr is not in the current game

  // change the anchor on the existing query to guarantee no reload
  context.a = `ins-${opcode}`;
  return '#' + buildQuery(context);
}
