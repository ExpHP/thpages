import {globalNames, globalLinks, PrefixResolver} from './resolver';
import {globalTips, Tip} from './tips';

export const globalRefNames = new PrefixResolver<string>();
export const globalRefTips = new PrefixResolver<Tip>();
export const globalRefLinks = new PrefixResolver<string>();

globalLinks.registerPrefix('ref', globalRefLinks);
globalNames.registerPrefix('ref', globalRefNames);
globalTips.registerPrefix('ref', globalRefTips);

/** Get tooltip key of a reference. */
export function getRefTipKey(ref: string) {
  return 'ref:' + ref;
}

/** Get name key of a reference. */
export function getRefNameKey(ref: string) {
  return 'ref:' + ref;
}

/** Get link key of a reference. */
export function getRefLinkKey(ref: string) {
  return 'ref:' + ref;
}

/** Get HTML string to substitute in for a `[ref=...]` markdown tag. */
export function getRefHtml({ref, tip, url}: {ref: string, tip: boolean, url: boolean}) {
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
