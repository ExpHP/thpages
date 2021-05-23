
import {PrefixResolver, globalNames, globalLinks, Context} from './resolver';
import {parseQuery} from './url-format';

/** Metadata necessary to generate a fancy tooltip about a crossref. */
export type Tip = {
  heading?: string, // tip header inner HTML
  contents: string, // tip body inner HTML
  omittedInfo: boolean,
};

export const globalTips = new PrefixResolver<Tip>();

let $activeTipTarget: HTMLElement | null = null;

export function initTips() {
  document.body.addEventListener("mouseover", tipIn);
  document.body.addEventListener("mouseout", tipOut);
  window.addEventListener("hashchange", tipOut);
}

function tipIn(e: MouseEvent) {
  const context = parseQuery(window.location.hash);
  const tuple = getAncestorTip(e.target as HTMLElement, context);
  if (tuple) {
    const [tip, $targ] = tuple;
    showTip(tip, $targ, e.target as HTMLElement, context);
    e.stopImmediatePropagation();
  }
}

function showTip(tip: Tip, $targ: HTMLElement, $realTarg: HTMLElement, context: Context) {
  const $tip = document.getElementById('tip');
  if (!$tip) throw new Error('could not find tip element');

  $activeTipTarget = $realTarg;
  $tip.style.display = "block";

  let tipHtml = `<div class="contents">${tip.contents}</div>`;
  if (tip.heading) {
    tipHtml = `<div class="heading">${tip.heading}</div>` + tipHtml;
  }
  if (tip.omittedInfo) {
    tipHtml += `<div class="omitted-info"></div>`;
  }
  $tip.innerHTML = tipHtml;

  // Adjust names in the tip to be appropriate for the current page.
  globalNames.transformHtml($tip, context);
  globalLinks.transformHtml($tip, context);

  const tipRect = $tip.getBoundingClientRect();
  const rect = $targ.getBoundingClientRect();
  const top = rect.top - /* rect.height/2 - */ tipRect.height + window.scrollY;
  let left = rect.left + rect.width/2 - tipRect.width/2;
  if (left < 0) left = 0;
  const max = document.body.offsetWidth - tipRect.width;
  if (left > max) left = max;
  $tip.style.top = top + "px";
  $tip.style.left = left + "px";
}

function tipOut(e: Event) {
  if (e.target === $activeTipTarget || e.type === 'hashchange') {
    const $tip = document.getElementById('tip');
    if (!$tip) throw new Error('could not find tip element');

    $tip.style.display = "none";
    $activeTipTarget = null;
  }
}

function getAncestorTip($targ: HTMLElement, context: Context): [Tip, HTMLElement] | null {
  // Embedded tips are used for short strings with no formatting. ([tip] tags)
  const [embedText, $embedElem] = getAncestorElementData($targ, "tip");
  // Registered tips are more elaborate and can have headings and etc.
  const [tipKey, $refElem] = getAncestorElementData($targ, "tipId");
  const referencedTip = globalTips.getNow(tipKey, context);

  // prefer an embedded tip
  if ($embedElem) {
    const tip = {contents: embedText, omittedInfo: false};
    return [tip, $embedElem];
  }
  // else use a registered tip
  if ($refElem && referencedTip) return [referencedTip, $refElem];
  // no tip
  return null;
}

function getAncestorElementData($elem: HTMLElement, key: string): [string, HTMLElement | null] {
  let $cur: HTMLElement | null = $elem;
  for (let depth=0; depth<1000; depth++) {
    if (!$cur) return ["", null];
    const value = $cur.dataset[key];
    if (value !== undefined) {
      return [value, $cur];
    }
    $cur = $cur.parentElement;
  }
  throw new Error('getAncestorElementData: Iteration limit exceeded!');
}
