import {registerTip, getTip} from './tips.js';
import globalNames from './names.js';
import {getAnmInsUrlByRef} from './anm/main.js';

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
 * @param {string} ref Ref id.
 * @param {object} tip Tip object.
 */
export function registerRefTip(ref, tip) {
  registerTip(getRefTipKey(ref), tip);
}

/**
 * Get tooltip inner HTML for a reference, if it has any.
 *
 * @param {string} ref Ref id.
 * @return {?object}
 */
export function getRefTip(ref) {
  return getTip(getRefTipKey(ref));
}

/**
 * Get tooltip key of a reference.
 *
 * @param {string} ref Ref id.
 * @return {string} Tooltip id.
 */
export function getRefTipKey(ref) {
  return 'ref:' + ref;
}

/**
 * Get name key of a reference.
 *
 * @param {string} ref Ref id.
 * @return {string} Name id.
 */
export function getRefNameKey(ref) {
  return 'ref:' + ref;
}

/**
 * Get HTML string to substitute in for a <code>[ref=...]</code>.
 *
 * @param {object} args
 * @param {string} args.ref Reference id.
 * @param {boolean} args.tip Include a tooltip.
 * @param {boolean} args.url Include a hyperlink.
 * @return {string}
 */
export function getRefHtml({ref, tip, url}) {
  let out = globalNames.getHtml(getRefNameKey(ref));
  let urlStr = null;
  if (url) {
    // FIXME: it seems weird that urls are implemented this way (with ref.js depending on
    //        anm code) while everything else is implemented the other way (with ref.js and
    //        anm code sharing a common dependency), but anything else I could come up with
    //        for now felt too overengineered for the current use case.
    //
    //        This will probably need to change when we add support for other game versions...
    if (ref.startsWith('anm:')) {
      const url = getAnmInsUrlByRef(ref);
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
    out = `<instr data-tip-id="${getRefTipKey(ref)}">${out}</instr>`;
  } else {
    out = `<instr>${out}</instr>`;
  }
  return out;
}
