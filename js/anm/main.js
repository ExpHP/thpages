import {getCurrentMap, loadAnmmap} from './eclmap.js';
import {GROUPS_V8, GROUPS_PRE_V8, ANM_INS_DATA, ANM_BY_OPCODE, ANM_OPCODE_REVERSE, DUMMY_DATA} from './ins-table.js';
import {ANM_VAR_DATA, ANM_VARS_BY_NUMBER} from './var-table.js';
import {registerRefTip, getRefNameKey} from '../ref.js';
import {MD} from '../main.js';
import globalNames from '../names.js';
import {parseQuery, buildQuery} from '../url-format.js';

const INS_TABLE_PAGE = 'anm/ins';
const DEFAULT_GAME = '17';

/**
 * A game number as a string with no period, with a leading 0 for numbers below 10, e.g. "14", "125", "095".
 *
 * This representation is chosen to enable simple lexical comparisons using the built-in &lt; and &gt; operators.
 * @typedef {string} Game
 */
const VALID_GAMES = {
  "07": true, "08": true, "09": true, "095": true,
  "10": true, "11": true, "12": true, "125": true, "128": true,
  "13": true, "14": true, "143": true, "15": true,
  "16": true, "165": true, "17": true,
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
  window.loadAnmmapAndSetGame = loadAnmmapAndSetGame;

  // Call everything `ins_11` etc.
  initDefaultNames(globalNames);

  // Make crossrefs default to using  everything `ins_11` etc.
  for (const game of Object.keys(ANM_BY_OPCODE)) {
    linkRefNamesToGameOpcodes(globalNames, game);
  }

  for (const [id, ins] of Object.entries(ANM_INS_DATA)) {
    const ref = 'anm:' + id;
    registerRefTip(ref, generateAnmInsTip(ins, ref));
  }

  for (const [id, avar] of Object.entries(ANM_VAR_DATA)) {
    const ref = 'anmvar:' + id;
    registerRefTip(ref, generateAnmVarTip(avar, ref));
  }
}

function validateGameString(game) {
  if (typeof game !== 'string') {
    throw new TypeError(`bad game; expected string, got ${game}`);
  }
  if (!VALID_GAMES[game]) {
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

// Names everything like `ins_301` and `[10034.0]`.
function initDefaultNames(names) {
  for (const game of Object.keys(ANM_BY_OPCODE)) {
    for (const opcodeStr of Object.keys(ANM_BY_OPCODE[game])) {
      const opcode = parseInt(opcodeStr, 10);
      const key = getOpcodeNameKey(game, opcode);
      names.set(key, `ins_${opcode}`);
    }
  }

  for (const game of Object.keys(ANM_VARS_BY_NUMBER)) {
    for (const [numStr, {ref}] of Object.entries(ANM_VARS_BY_NUMBER[game])) {
      const num = parseInt(numStr, 10);
      const key = getVarNameKey(game, num);
      const avar = anmVarDataByRef(ref);
      const numSuffix = avar.type === '%' ? '.0' : '';
      const name = `[${num}${numSuffix}]`;
      names.set(key, name);
    }
  }
}

/**
 * Loads names from an anmmap.
 * @param {module} names Object to be updated.
 * @param {Game} game
 * @param {Eclmap} map
 */
function setNamesFromAnmmap(names, game, map) {
  // assign names to anm: keys
  for (const opcodeStr of Object.keys(ANM_BY_OPCODE[game])) {
    const opcode = parseInt(opcodeStr, 10);
    const key = getOpcodeNameKey(game, opcode);
    const name = map.getMnemonic(opcode);
    if (name) {
      names.set(key, name);
    }
  }

  // assign names to anmvar: keys
  for (const [numStr, {ref}] of Object.entries(ANM_VARS_BY_NUMBER[game])) {
    const num = parseInt(numStr, 10);
    const key = getVarNameKey(game, num);
    const {type} = anmVarDataByRef(ref);
    const name = map.getGlobal(num);
    if (name) {
      names.set(key, type + name);
    }
  }
}

/**
 * Make <code>anm:</code> refs derive their names from a given game's opcodes where available.
 * @param {module} names Object to be updated.
 * @param {Game} game
 */
function linkRefNamesToGameOpcodes(names, game) {
  for (const [opcodeStr, {ref}] of Object.entries(ANM_BY_OPCODE[game])) {
    if (ref == null) continue;
    const opcode = parseInt(opcodeStr, 10);
    const opcodeKey = getOpcodeNameKey(game, opcode);
    const refKey = getRefNameKey(ref);
    names.setAlias(refKey, opcodeKey);
  }

  for (const [numStr, entry] of Object.entries(ANM_VARS_BY_NUMBER[game])) {
    const num = parseInt(numStr, 10);
    const numKey = getVarNameKey(game, num);
    const refKey = getRefNameKey(entry.ref);
    names.setAlias(refKey, numKey);
  }
}

/**
 * Load an anmmap and set things up to resolve names from it whenever possible.
 *
 * (does not fix names in existing HTML however.  Do that yourself by calling names.transformHtml...)
 * @param {?string} file
 * @param {string} cacheKey Used for cacheing I think?
 * @param {Game} game Selects default file when file arg is null.
 */
export async function loadAnmmapAndSetGame(file, cacheKey, game) {
  await loadAnmmap(file, cacheKey, game);
  const map = getCurrentMap();
  if (map !== null) {
    setNamesFromAnmmap(globalNames, game, map);
    linkRefNamesToGameOpcodes(globalNames, game);
  }
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

export function getAnmInsUrlByRef(ref) {
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
function getSamePageAnmInsUrlByRef(ref) {
  const query = parseQuery(window.location.hash);
  if (query.s !== INS_TABLE_PAGE) return null; // not on right page

  const curGame = query.g || DEFAULT_GAME;
  const opcode = ANM_OPCODE_REVERSE[curGame][ref];
  if (opcode == null) return null; // this instr is not in the current game

  // change the anchor on the existing query to guarantee no reload
  query.a = `ins-${opcode}`;
  return '#' + buildQuery(query);
}
