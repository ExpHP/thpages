import {getCurrentMap, loadEclmap} from './eclmap.js';
import {GROUPS_V8, ANM_INS_DATA, ANM_BY_OPCODE, DUMMY_DATA} from './ins.js';
import {registerRefTip, getRefNameKey} from '../ref.js';
import {MD} from '../main.js';
import globalNames from '../names.js';

/**
 * A game number as a string with no period, e.g. "14" or "125".
 * @typedef {string} Game
 */

const ARGTYPES_TEXT = {
  "S": "int",
  "s": "short",
  "b": "byte",
  "$": "int&",
  "f": "float",
  "%": "float&",
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
  window.loadEclmapAndSetGame = loadEclmapAndSetGame;

  initDefaultOpcodeNames(globalNames);

  for (const [id, ins] of Object.entries(ANM_INS_DATA)) {
    const ref = 'anm:' + id;
    registerRefTip(ref, generateAnmTip(ins, ref));
  }
}

function getGroups(game) {
  return GROUPS_V8;
}

function getOpcodeNameKey(game, opcode) {
  return `anm:${game}-${opcode}`;
}

// Sets `ins_n` names for everything.
function initDefaultOpcodeNames(names) {
  for (const game of Object.keys(ANM_BY_OPCODE)) {
    for (const opcodeStr of Object.keys(ANM_BY_OPCODE[game])) {
      const opcode = parseInt(opcodeStr, 10);
      const key = getOpcodeNameKey(game, opcode);
      names.set(key, `ins_${opcode}`);
    }
  }
}

/**
 * Loads names from an anmmap.
 * @param {module} names Object to be updated.
 * @param {Game} game
 * @param {Eclmap} map
 */
function setOpcodeNamesFromAnmmap(names, game, map) {
  for (const opcodeStr of Object.keys(ANM_BY_OPCODE[game])) {
    const opcode = parseInt(opcodeStr, 10);
    const key = getOpcodeNameKey(game, opcode);
    const name = map.getMnemonic(opcode);
    if (name) {
      names.set(key, name);
    }
  }
}

/**
 * Make <code>anm:</code> refs derive their names from a given game's opcodes where available.
 * @param {module} names Object to be updated.
 * @param {Game} game
 */
function linkRefNamesToGameOpcodes(names, game) {
  for (const [opcodeStr, entry] of Object.entries(ANM_BY_OPCODE[game])) {
    if (entry.id == null) continue;
    const opcode = parseInt(opcodeStr, 10);
    const opcodeKey = getOpcodeNameKey(game, opcode);
    const refKey = getRefNameKey(entry.id);
    names.setAlias(refKey, opcodeKey);
  }
}

/**
 * Load an anmmap and set things up to resolve names from it whenever possible.
 *
 * (does not fix names in existing HTML however.  Do that yourself by calling names.transformHtml...)
 * @param {?string} file
 * @param {string} name Used for cacheing I think?
 * @param {Game} game Selects default file when file arg is null.
 */
export async function loadEclmapAndSetGame(file, name, game) {
  await loadEclmap(file, name, game);
  const map = getCurrentMap();
  if (map !== null) {
    setOpcodeNamesFromAnmmap(globalNames, game, map);
    linkRefNamesToGameOpcodes(globalNames, game);
  }
}

function generateOpcodeTable(game) {
  let base = `Current table: [game=${game}] version ${game}[/game][br]`;

  let navigation = /* html */`<div class='ins-navigation'><h3>Navigation</h3>`;
  let table = "";

  let total = 0;
  let documented = 0;
  const groups = getGroups(game);
  for (let i=0; i<groups.length; ++i) {
    const group = groups[i];

    navigation += /* html */`- <span class='ins-navigation-entry' data-target='${group.title}'>${group.title} (${group.min}-${group.max})</span><br>`;

    table += /* html */`<br><h2 data-insnavigation="${group.title}">${group.min}-${group.max}: ${group.title}</h2>`;
    table += /* html */`<table class='ins-table'>`;
    // table += /* html */`<div class='ins-table-header'><th class="col-id"></th><th class='col-name'></th><th class='col-desc'></th></th>`;

    for (let num=group.min; num<=group.max; ++num) {
      const refObj = anmInsRefByOpcode(game, num);
      if (refObj == null) continue; // instruction doesn't exist

      // instruction exists, but our docs may suck
      window.console.log(refObj);
      let {id, wip, problems} = refObj;
      const ins = id === null ? DUMMY_DATA : anmInsDataByRef(id);
      wip = Math.max(wip, ins.wip || 0);
      problems = [...problems, ...(ins.problems || [])];

      if (wip === 0) {
        documented += 1;
      }
      total += 1;
      table += generateOpcodeTableEntry(game, ins, num);
    }

    table += "</table>";
  }
  navigation += "</div>";
  base += `Documented instructions: ${documented}/${total} (${(documented/total*100).toFixed(2)}%)[br]`;
  base += "Instructions marked [wip=1]like this[/wip] are not fully understood.  Items [wip=2]like this[/wip] are complete mysteries.";
  return MD.makeHtml(base) + navigation + table;
}

function generateAnmInsSiggy(ins, nameKey) {
  const lParen = /* html */`<span class="punct">${"("}</span>`;
  const rParen = /* html */`<span class="punct">${")"}</span>`;
  const params = /* html */`<span class="ins-params">${generateAnmInsParameters(ins)}</span>`;
  let name = globalNames.getHtml(nameKey);
  name = /* html */`<span class="ins-name" data-wip="${ins.wip}">${name}</span>`;
  return /* html */`<div class="anm-ins-siggy-wrapper">${name}${lParen}${params}${rParen}</div>`;
}

function generateOpcodeTableEntry(game, ins, opcode) {
  const nameKey = getOpcodeNameKey(game, opcode);
  return /* html */`
  <tr class="ins-table-entry">
    <td class="col-id">${opcode}</td>
    <td class="col-name">${generateAnmInsSiggy(ins, nameKey)}</td>
    <td class="col-desc">${generateAnmInsDesc(ins)}</td>
  </tr>
  `;
}

function generateAnmInsParameters(ins) {
  const comma = /* html */`<span class="punct">${","}</span>`;
  let ret = "";
  for (let i=0; i<ins.args.length; ++i) {
    switch (i) {
      // Avoid situations like:
      //
      //    reallyLongInstructionName(int a,
      //          int b)
      //
      // by making it prefer to break after the '(' rather than after the first comma.
      case 0: ret += `<wbr>`; break;
      case 1: ret += `${comma}&nbsp;`; break;
      default: ret += `${comma} `; break;
    }
    ret += ARGTYPES_HTML[ins.sig[i]] + "&nbsp;" + ins.args[i];
  }
  return ret;
}

function generateAnmInsDesc(ins, notip=false) {
  let ret = ins.desc;
  for (let i=0; i<ins.sig.length; i++) {
    ret = ret.replace(new RegExp("%"+(i+1)+"(?=[^0-9])", "g"), "[tip=Parameter "+(i+1)+", "+ARGTYPES_TEXT[ins.sig[i]]+"]`"+ins.args[i]+"`[/tip]");
  }
  if (notip) {
    ret = ret.replace(/\[ref=/g, "[ref-notip=");
  }
  return MD.makeHtml(ret);
}

function anmInsRefByOpcode(game, opcode) {
  const entry = ANM_BY_OPCODE[game][opcode];
  if (entry === undefined) return null;

  const out = Object.assign({}, entry);
  out.wip = out.wip || 0;
  out.problems = out.problems || [];
  if (out.wip) {
    out.problems = [...out.problems, 'match'];
  }
  return out;
}

function stripRefPrefix(ref) {
  if (ref.startsWith("anm:")) {
    ref = ref.substring(4);
  }
  return ref;
}

// Get instruction data for an 'anm:' ref id.
function anmInsDataByRef(ref) {
  const out = ANM_INS_DATA[stripRefPrefix(ref)];
  if (out == null) {
    window.console.warn(`bad anm crossref: ${ref}`);
    return null;
  }
  return out;
}

function generateAnmTip(ins, ref) {
  const desc = generateAnmInsDesc(ins, true);
  const siggy = generateAnmInsSiggy(ins, getRefNameKey(ref));
  return `<br>${siggy}<br><hr>${desc}`;
}
