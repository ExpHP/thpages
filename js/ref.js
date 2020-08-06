import {ANM_INS_DATA} from "./ecl/ins.js";

function splitNamespace(id) {
  let [namespace, rest] = id.split(':', 2);
  if (rest === undefined) {
    rest = namespace;
    return [null, rest];
  } else {
    return [namespace, rest];
  }
}

// function getRefTip(id) {
//   const [ns, rest] = splitNamespace(id);
//   switch (ns) {
//     case "anm": return ANM_INS_DATA[rest];
//     // TODO: anmvars
//   }
//   return null;
// }

export function getRefHtml({id, tip, url}) {
  if (id.startsWith('anm:')) {

  }

  const urlStr = "a";
  const tipStr = "b";
  const name = "c";

  let out = name;
  if (urlStr !== null) {
    out = `<a href="${urlStr}">${out}</a>`;
  }
  if (tipStr) {
    out = `<instr data-tip="${tipStr}">${out}</instr>`;
  } else {
    out = `<instr>${out}</instr>`;
  }
  return out;
}
