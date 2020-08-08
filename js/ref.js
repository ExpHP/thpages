import {registerTip, getTip} from './tips.js';
import globalNames from './names.js';

// function getRefTip(id) {
//   const [ns, rest] = splitNamespace(id);
//   switch (ns) {
//     case "anm": return ANM_INS_DATA[rest];
//     // TODO: anmvars
//   }
//   return null;
// }

// FIXME tips should be stored as Elements or maybe NodeLists, i dunno what's idiomatic, just not strings
/**
 * Set tooltip inner HTML for a reference.
 *
 * @param {string} id Ref id.
 * @param {object} tip Tip object.
 */
export function registerRefTip(id, tip) {
  registerTip(getRefTipKey(id), tip);
}

/**
 * Get tooltip inner HTML for a reference, if it has any.
 *
 * @param {string} id Ref id.
 * @return {?object}
 */
export function getRefTip(id) {
  return getTip(getRefTipKey(id));
}

/**
 * Get tooltip key of a reference.
 *
 * @param {string} id Ref id.
 * @return {string} Tooltip id.
 */
export function getRefTipKey(id) {
  return 'ref:' + id;
}

/**
 * Get name key of a reference.
 *
 * @param {string} id Ref id.
 * @return {string} Name id.
 */
export function getRefNameKey(id) {
  return 'ref:' + id;
}

/**
 * Get HTML string to substitute in for a <code>[ref=...]</code>.
 *
 * @param {object} args
 * @param {string} args.id Reference id.
 * @param {boolean} args.tip Include a tooltip.
 * @param {boolean} args.url Include a hyperlink.
 * @return {string}
 */
export function getRefHtml({id, tip, url}) {
  let out = globalNames.getHtml(getRefNameKey(id));
  if (tip) {
    out = `<instr data-tip-id="${getRefTipKey(id)}">${out}</instr>`;
  } else {
    out = `<instr>${out}</instr>`;
  }
  if (url) {
    // TODO
    // out = `<a href="${parts.url}">${out}</a>`;
  }
  return out;
}
