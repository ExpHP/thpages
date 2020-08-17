import {globalNames, globalLinks, PrefixResolver} from './resolver.ts';
import {globalTips} from './tips.ts';

export const globalRefNames = new PrefixResolver();
export const globalRefTips = new PrefixResolver();
export const globalRefLinks = new PrefixResolver();

globalLinks.registerPrefix('ref', (ref, c) => globalRefLinks.getNow(ref, c));
globalNames.registerPrefix('ref', (ref, c) => globalRefNames.getNow(ref, c));
globalTips.registerPrefix('ref', (ref, c) => globalRefTips.getNow(ref, c));

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
 * Get link key of a reference.
 *
 * @param {string} ref Ref id.
 * @return {string} Link id.
 */
export function getRefLinkKey(ref) {
  return 'ref:' + ref;
}

/**
 * Get HTML string to substitute in for a <code>[ref=...]</code>.
 *
 * @param {object} args
 * @param {string} args.ref Reference id.
 * @param {boolean} args.tip Include a tooltip.
 * @param {boolean} args.url Include a hyperlink.
 * @param {Context} context Information about current page.
 * @return {string}
 */
export function getRefHtml({ref, tip, url}) {
  let out = globalNames.getHtml(getRefNameKey(ref));
  out = `<span class="isref">${out}</span>`;
  if (url) {
    out = globalLinks.wrapHtml(getRefLinkKey(ref), out);
  }

  if (tip) {
    out = `<instr data-tip-id="${getRefTipKey(ref)}">${out}</instr>`;
  } else {
    out = `<instr>${out}</instr>`;
  }
  return out;
}
