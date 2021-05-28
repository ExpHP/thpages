import * as React from 'react';

import type {Query} from './url-format';
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

/** Get JSX for a `[ref=...]` markdown tag. */
export function getRefJsx({ref, tip, url, currentQuery}: {ref: Ref, tip: boolean, url: boolean, currentQuery: Query}) {
  let out = <span className="isref">{globalNames.getNow(getRefNameKey(ref), currentQuery) || ref}</span>;
  if (url) {
    const href = globalLinks.getNow(getRefLinkKey(ref), currentQuery);
    out = <a href={href || undefined}>{out}</a>;
  }

  if (tip) {
    out = <code data-tip-id={getRefTipKey(ref)}>{out}</code>;
  } else {
    out = <code>{out}</code>;
  }
  return out;
}
