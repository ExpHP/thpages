import {registerTip, getTip} from './tips.js';
import globalNames from './names.js';
import {getAnmInsUrlByRef} from './ecl/main.js';

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
 * @param {string} args.id Reference id.  FIXME should be named ref
 * @param {boolean} args.tip Include a tooltip.
 * @param {boolean} args.url Include a hyperlink.
 * @return {string}
 */
export function getRefHtml({id, tip, url}) {
  let out = globalNames.getHtml(getRefNameKey(id));
  let urlStr = null;
  if (url) {
    // FIXME: it seems weird that urls are implemented this way (with ref.js depending on
    //        anm code) while everything else is implemented the other way (with ref.js and
    //        anm code sharing a common dependency), but anything else I could come up with
    //        for now felt too overengineered for the current use case.
    //
    //        This will probably need to change when we add support for other game versions...
    if (id.startsWith('anm:')) {
      const url = getAnmInsUrlByRef(id);
      if (url !== null) {
        urlStr = url;
      }
    }
  }

  if (urlStr) {
    out = `<a href="${urlStr}" class="isref">${out}</a>`;
  } else {
    out = `<a class="isref">${out}</a>`;
  }

  if (tip) {
    out = `<instr data-tip-id="${getRefTipKey(id)}">${out}</instr>`;
  } else {
    out = `<instr>${out}</instr>`;
  }
  return out;
}
