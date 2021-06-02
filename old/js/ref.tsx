import * as React from 'react';

import type {Query} from './url-format';
import {globalNames, globalLinks, PrefixResolver} from './resolver';
import {WithKeyedTip} from './tips';
import {NameSettingsContext} from './settings';

export type Ref = string;
export const globalRefNames = new PrefixResolver<string>();
export const globalRefLinks = new PrefixResolver<string>();

globalLinks.registerPrefix('ref', globalRefLinks);
globalNames.registerPrefix('ref', globalRefNames);

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
export function InlineRef({ref, tip, url, currentQuery}: {ref: Ref, tip: boolean, url: boolean, currentQuery: Query}) {
  const nameSettings = React.useContext(NameSettingsContext);

  let out = <span className="isref">{globalNames.getNow(getRefNameKey(ref), currentQuery) || ref}</span>;
  if (url) {
    const href = globalLinks.getNow(getRefLinkKey(ref), currentQuery);
    out = <a href={href || undefined}>{out}</a>;
  }
  out = <code>{out}</code>;

  if (tip) {
    out = <WithKeyedTip tipKey={getRefTipKey(ref)} currentQuery={currentQuery}>{out}</WithKeyedTip>;
  }
  return out;
}
