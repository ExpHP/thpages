import {getCurrentMap, loadEclmap} from './eclmap.js';
import {GROUPS_V8, ANM_INS_DATA, ANM_BY_OPCODE, DUMMY_DATA} from './ins.js';
import {MD} from '../main.js';

function getGroups(game) {
  return GROUPS_V8;
}

export function initAnm() {
  // FIXME HACK to make available to ins.md
  window.generateOpcodeTable = generateOpcodeTable;
  window.loadEclmap = loadEclmap;
}

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
      let {id, wip, problems} = refObj;
      const ins = id === null ? DUMMY_DATA : anmInsDataByRef(id);
      wip = Math.max(wip, ins.wip || 0);
      problems = [...problems, ...(ins.problems || [])];

      if (wip === 0) {
        documented += 1;
      }
      total += 1;
      table += generateOpcodeTableEntry(ins, num);
    }

    table += "</table>";
  }
  navigation += "</div>";
  base += `Documented instructions: ${documented}/${total} (${(documented/total*100).toFixed(2)}%)[br]`;
  base += "Instructions marked [wip=1]like this[/wip] are not fully understood.  Items [wip=2]like this[/wip] are complete mysteries.";
  return MD.makeHtml(base) + navigation + table;
}

function getOpcodeName(opcode) {
  const map = getCurrentMap();
  if (map !== null) {
    return map.getMnemonic(opcode);
  } else {
    return `ins_${opcode}`;
  }
}

function generateOpcodeTableEntry(ins, opcode) {
  const lParen = /* html */`<span class="punct">${"("}</span>`;
  const rParen = /* html */`<span class="punct">${")"}</span>`;
  const name = /* html */`<span class="ins-name" data-wip="${ins.wip}">${getOpcodeName(opcode)}</span>`;
  const params = /* html */`<span class="ins-params">${generateAnmInsParameters(ins)}</span>`;
  return /* html */`
  <tr class="ins-table-entry">
    <td class="col-id">${opcode}</td>
    <td class="col-name"><div class="hanging-indent-wrapper">${name}${lParen}${params}${rParen}</div></td>
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
  if (ins == null) return "<span style='color:gray'>No description available.</span>";

  let ret = ins.desc;
  for (let i=0; i<ins.sig.length; i++) {
    ret = ret.replace(new RegExp("%"+(i+1)+"(?=[^0-9])", "g"), "[tip=Parameter "+(i+1)+", "+ARGTYPES_TEXT[ins.sig[i]]+"]`"+ins.args[i]+"`[/tip]");
  }
  if (notip) {
    ret = ret.replace(/\[ref=/g, "[ref-notip=");
  }
  return MD.makeHtml(ret);
}

// export function getOpcodeTip(ins) {
//   return escapeTip(`<br><b>${getOpcodeName(ins.number, ins.documented)}(${generateOpcodeParameters(ins)})</b><br><hr>${generateOpcodeDesc(ins, true)}`);
// }

// function escapeTip(tip) {
//   return tip.replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/_/g, "_").replace(/</g, "&lt;").replace(/>/g, "&gt;"); // .replace(/\[ins=/g, "[ins_notip=");
// }

function anmInsRefByOpcode(game, opcode) {
  let table = ANM_BY_OPCODE[game];
  while (table != null && table.ins[opcode] == null) {
    table = table.inherit;
  }
  if (table == null) return null;

  const out = table.ins[opcode];
  out.wip = out.wip || 0;
  out.problems = out.problems || [];
  if (out.wip) {
    out.problems = [...out.problems, 'match'];
  }
  return out;
}

// Get instruction data for an 'anm:' ref id.
function anmInsDataByRef(ref) {
  if (ref.startsWith("anm:")) {
    ref = ref.substring(4);
  }

  const out = ANM_INS_DATA[ref];
  if (out == null) {
    window.console.warn(`bad anm crossref: ${ref}`);
    return null;
  }
  return out;
}
