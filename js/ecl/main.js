function generateVarTable(game) {
  const normalized = normalizeGameVersion(game);

  let head = `Current table: [game=${normalized}]version ${game}[/game][br]`;

  let table = "";
  table += "<table>";
  table += "<tr><th>ID</th><th>type</th><th>access</th><th>scoping</th><th>name</th><th>description</th></tr>";

  const limit = getVarLimits(normalized);

  let total = 0;
  let documented = 0;
  for (let i=limit[0]; i<=limit[1]; i++) {
    const v = getVarNoCheck(normalized, i);
    if (v) {
      ++total;
      if (v.documented) ++documented;
    }
    table += getVarTableRow(v);
  }
  table += "</table>";

  head += `Documented variables: ${documented}/${total} (${(documented/total*100).toFixed(2)}%)[br]`;
  head += `Variables marked in <span style='color:red'>red</span> either need further investigation or descriptions for them have not yet been written.`;

  return MD.makeHtml(head) + MD.makeHtml(table);
}

function getVarTableRow(v) {
  if (v == null) return "";
  const idString = v.number + (v.type == "$" ? "" : ".0f");
  const typeString = v.type == "$" ? "int" : "float";
  const accessString = v.access == "rw" ? "read/write" : "read-only";
  const scopeString = v.scope == "g" ? "global" : "local";
  return `<tr><td>${idString}</td><td>${typeString}</td><td>${accessString}</td><td>${scopeString}</td><td>${getVarName(v.number, v.documented)}</td><td>${v.desc}</td></tr>`;
}

function getVarLimits(game) {
  return VARLIMIT_17;
  // switch(game) {
  //   case 8: return VARLIMIT_8;
  //   case 10: return VARLIMIT_10;
  //   case 11: return VARLIMIT_11;
  //   case 12: return VARLIMIT_12;
  //   case 125: return VARLIMIT_125;
  //   case 128: return VARLIMIT_128;
  //   case 13: return VARLIMIT_13;
  //   case 14: return VARLIMIT_14;
  //   case 143: return VARLIMIT_143;
  //   case 15: return VARLIMIT_15;
  //   case 16: return VARLIMIT_16;
  //   case 165: return VARLIMIT_165;
  //   case 17: return VARLIMIT_17;
  // }
}

function getVar(game, id) {
  const lim = getVarLimits(game);
  if (lim[0] <= id && lim[1] >= id) return getVarNoCheck(game, id);
  return null;
  // const variable = VARS[id];
  // if (typeof variable == "undefined")
  // return null;
  // if (variable == null)
  // return [-1, "$", "ro", "g", "Unkown variable."];
  // return variable;
}

function getVarNoCheck(game, id) {
  return getVarFromList(VAR_17, id);
  // let ret = null;
  // switch(game) {
  //   case 17:
  //   ret = getVarFromList(VAR_17, id);
  //   case 165:
  //   if (!ret) ret = getVarFromList(VAR_165, id);
  //   case 16:
  //   if (!ret) ret = getVarFromList(VAR_16, id);
  //   case 15:
  //   if (!ret) ret = getVarFromList(VAR_15, id);
  //   case 143:
  //   if (!ret) ret = getVarFromList(VAR_143, id);
  //   case 14:
  //   if (!ret) ret = getVarFromList(VAR_14, id);
  //   case 13:
  //   if (!ret) ret = getVarFromList(VAR_13, id);
  //   case 128:
  //   if (!ret) ret = getVarFromList(VAR_128, id);
  //   case 125:
  //   if (!ret) ret = getVarFromList(VAR_125, id);
  //   case 12:
  //   if (!ret) ret = getVarFromList(VAR_12, id);
  //   case 11:
  //   if (!ret) ret = getVarFromList(VAR_11, id);
  //   case 10:
  //   if (!ret) ret = getVarFromList(VAR_10, id);
  //   break;
  //   case 8:
  //   if (!ret) ret = getVarFromList(VAR_8, id);
  // }
  // return ret;
}

function getVarFromList(list, id) {
  const ret = list[id];
  if (typeof ret == "undefined") return null;
  return ret;
}

function getVarName(id, documented) {
  if (documented) return currentMap.getGlobal(id);
  return `<span style='color:red'>${currentMap.getGlobal(id)}</span>`;
}

function getVarTip(v) {
  if (v == null) return "";
  const idString = v.number + (v.type == "$" ? "" : ".0f");
  const typeString = v.type == "$" ? "int" : "float";
  const accessString = v.access == "rw" ? "read/write" : "read-only";
  const scopeString = v.scope == "g" ? "global" : "local";
  const tip = `**${idString} - ${getVarName(v.number, v.documented)}** - ${scopeString}, ${accessString}, ${typeString} variable[br][hr]${v.desc}`;
  return MD.makeHtml(tip.replace(/\[var=/g, "[var_notip="));
}

function normalizeGameVersion(num) {
  // FIXME: looks suspicious, I doubt this works for all numbers due to rounding
  if (typeof num == "string") num = parseFloat(num);
  while (Math.floor(num) != num) num *= 10;
  return num;
}

function getGroups(game) {
  return GROUPS_V8;
}

function getOpcodeFromList(list, num) {
  const ret = list[num];
  if (typeof ret == "undefined") return null;
  if (ret == null) {
    return {
      number: -1,
      game: -1,
      args: "",
      argnames: [],
      desc: "",
      documented: false,
    };
  }
  return ret;
}

function getOpcodeNoCheck(game, num, timeline) {
  return getOpcodeFromList(INS_17, num);
  // let ret = null;
  // if (!timeline) {
  //     if (!ret) ret = getOpcodeFromList(INS_17, num);
  //     case 165:
  //     // if (!ret) ret = getOpcodeFromList(INS_165, num);
  //     case 16:
  //     // if (!ret) ret = getOpcodeFromList(INS_16, num);
  //     case 15:
  //     // if (!ret) ret = getOpcodeFromList(INS_15, num);
  //     case 143:
  //     // if (!ret) ret = getOpcodeFromList(INS_143, num);
  //     case 14:
  //     // if (!ret) ret = getOpcodeFromList(INS_14, num);
  //     case 13:
  //     // if (!ret) ret = getOpcodeFromList(INS_13, num);
  //     break;
  //     case 8:
  //     // if (!ret) ret = getOpcodeFromList(INS_8, num);
  //   }
  // } else {
  //   switch(game) {
  //     case 8:
  //     if (!ret) ret = getOpcodeFromList(TIMELINE_INS_8, num)
  //   }
  // }
  // return ret;
}

function getOpcode(game, num, timeline) {
  game = normalizeGameVersion(game);
  const groups = getGroups(game);
  // check if the given opcode number exists in the given version.
  let exists = false;
  for (let i=0; i<groups.length; ++i) {
    const group = groups[i];
    if (!!timeline != !!group.timeline) {
      continue;
    }

    if (group.min <= num && group.max >= num) {
      exists = true;
      break;
    }
  }

  if (exists) return getOpcodeNoCheck(game, num, timeline);

  return null;
}

function generateOpcodeTable(game) {
  const normalized = normalizeGameVersion(game);
  let base = `Current table: [game=${normalized}] version ${game}[/game][br]`;

  let navigation = "<div class='ins-navigation'><h3>Navigation</h3>";
  let table = "";

  let total = 0;
  let documented = 0;
  const groups = getGroups(normalized);
  for (let i=0; i<groups.length; ++i) {
    const group = groups[i];

    navigation += `- <span class='ins-navigation-entry' data-target='${group.title}'>${group.title} (${group.min}-${group.max})</span><br>`

    table += `<br><h2 data-insnavigation="${group.title}">${group.min}-${group.max}: ${group.title}</h2>`;
    table += "<table class='ins-table'>";
    table += "<tr><th class='ins-id'>ID</th><th class='ins-name'>name</th><th class='ins-args'>parameters</th><th class='ins-desc'>description</th></tr>";

    for (let num=group.min; num<=group.max; ++num) {
      const ins = getOpcodeNoCheck(normalized, num, group.timeline);
      const instrDocumented = ins != null && ins.documented;
      const instrNoDesc = ins != null && ins.number != -1;
      const instrExists = instrDocumented || instrNoDesc || ins == null;
      if (instrDocumented) documented += 1;
      if (instrExists) {
        total += 1;
        table += generateOpcodeTableEntry(ins, num, group.timeline);
      }
    }

    table += "</table>";
  }
  navigation += "</div>";
  base += `Documented instructions: ${documented}/${total} (${(documented/total*100).toFixed(2)}%)[br]`;
  base += "Instructions marked in [c=red]red[/c] either need further investigation or descriptions for them have not yet been written.";
  return MD.makeHtml(base) + navigation + table;
}

function generateOpcodeTableEntry(ins, num, timeline) {
  return `
  <tr>
  <td>${num}</td>
  <td>${getOpcodeName(num, ins ? ins.documented : false, timeline)}
  <td>${generateOpcodeParameters(ins)}
  <td>${generateOpcodeDesc(ins)}</td>
  </tr>
  `;
}

function getOpcodeName(num, documented, timeline) {
  let name;
  if (currentMap != null) {
    name = timeline ? currentMap.getTimelineMnemonic(num) : currentMap.getMnemonic(num);
  } else {
    name = `ins_${num}`;
  }

  if (documented) {
    return name;
  } else {
    return `<span style='color:red'>${name}</span>`
  }
}

function generateOpcodeParameters(ins) {
  if (ins == null) return "<span style='color:gray'>No data available.</span>";;

  let ret = "";
  for (let i=0; i<ins.args.length; ++i) {
    if (i != 0) ret += ", ";
    ret += '<span style="white-space: nowrap;">' + ARGTYPES[ins.args[i]] + " " + ins.argnames[i] + '</span>';
  }
  return ret;
}

function generateOpcodeDesc(ins, notip=false) {
  if (ins == null) return "<span style='color:gray'>No description available.</span>";

  let ret = ins.description;
  for (let i=0; i<ins.args.length; i++) {
    ret = ret.replace(new RegExp("%"+(i+1)+"(?=[^0-9])", "g"), "[tip=Parameter "+(i+1)+", "+ARGTYPES[ins.args[i]]+"]`"+ins.argnames[i]+"`[/tip]");
  }
  if (notip) {
    ret = ret.replace(/\[ins=/g, "[ins_notip=");
  }
  return MD.makeHtml(ret);
}

function getOpcodeTip(ins, timeline) {
  return escapeTip(`<br><b>${timeline ? "timeline ": ""}${ins.number} - ${getOpcodeName(ins.number, ins.documented, timeline)}(${generateOpcodeParameters(ins)})</b><br><hr>${generateOpcodeDesc(ins, true)}`);
}

function escapeTip(tip) {
  return tip.replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/_/g, "_").replace(/</g, "&lt;").replace(/>/g, "&gt;"); // .replace(/\[ins=/g, "[ins_notip=");
}
