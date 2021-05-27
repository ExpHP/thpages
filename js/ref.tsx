import * as React from 'react';

import {globalNames, globalLinks, PrefixResolver} from './resolver';
import {globalTips, Tip} from './tips';

export type Ref = string;
export const globalRefNames = new PrefixResolver<string>();
export const globalRefTips = new PrefixResolver<Tip>();
export const globalRefLinks = new PrefixResolver<string>();

globalLinks.registerPrefix('ref', globalRefLinks);
globalNames.registerPrefix('ref', globalRefNames);
globalTips.registerPrefix('ref', globalRefTips);

/** Get tooltip key of a reference. */
export function getRefTipKey(ref: Ref) {
  return 'ref:' + ref;
}

/** Get name key of a reference. */
export function getRefNameKey(ref: Ref) {
  return 'ref:' + ref;
}

/** Get link key of a reference. */
export function getRefLinkKey(ref: Ref) {
  return 'ref:' + ref;
}

/** Get HTML string to substitute in for a `[ref=...]` markdown tag. */
export function getRefJsx({ref, tip, url}: {ref: Ref, tip: boolean, url: boolean}) {
  let out = globalNames.getJsx(getRefNameKey(ref));
  out = <span className="isref">{out}</span>;
  if (url) {
    out = globalLinks.wrapJsx(getRefLinkKey(ref), out);
  }

  if (tip) {
    out = <code data-tip-id={getRefTipKey(ref)}>{out}</code>;
  } else {
    out = <code>{out}</code>;
  }
  return out;
}
