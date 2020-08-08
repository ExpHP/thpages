
import globalNames from './names.js';

/** Maps tip ids to tip inner HTML. */
const TIP_REGISTRY = {};
let $tip = null;
let $activeTipTarget = null;

export function initTips() {
  $tip = document.getElementById("tip");
  document.body.addEventListener("mouseover", tipIn);
  document.body.addEventListener("mouseout", tipOut);
}

/**
 * @param {string} key
 * @param {object} tip
 * @param {string} tip.contents
 * @param {boolean} tip.omittedInfo
 */
export function registerTip(key, {contents, omittedInfo}) {
  if (typeof key !== 'string') throw new TypeError('expected string key');
  if (contents === undefined) throw new TypeError('missing contents');
  if (omittedInfo === undefined) throw new TypeError('missing omittedInfo');
  TIP_REGISTRY[key] = {contents, omittedInfo};
}

export function getTip(key) {
  const entry = TIP_REGISTRY[key];
  return entry === undefined ? null : entry;
}

function tipIn(e) {
  const [tip, $targ] = getAncestorTip(e.target);
  if ($targ) {
    showTip(tip, $targ, e.target);
    e.stopImmediatePropagation();
  }
}

function showTip(tip, $targ, $realTarg) {
  $activeTipTarget = $realTarg;
  $tip.style.display = "block";

  let tipHtml = `<div class="contents">${tip.contents}</div>`;
  if (tip.omittedInfo) {
    tipHtml += `<div class="omitted-info"></div>`;
  }
  $tip.innerHTML = tipHtml;

  globalNames.transformHtml($tip);

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

function tipOut(e) {
  if (e.target == $activeTipTarget) {
    $tip.style.display = "none";
    $activeTipTarget = null;
  }
}

function getAncestorTip($targ) {
  const [embedText, $embedElem] = getAncestorElementData($targ, "tip");
  const [refKey, refElem] = getAncestorElementData($targ, "tipId");
  const referenced = [TIP_REGISTRY[refKey], refElem];

  // prefer an embedded tip
  if ($embedElem) {
    const tip = {contents: embedText, omittedInfo: false};
    return [tip, $embedElem];
  }
  // else use a registered tip
  if (referenced[1]) return referenced;
  // no tip
  const tip = {contents: "", omittedInfo: false};
  return [tip, null];
}

function getAncestorElementData($elem, key) {
  do {
    if (typeof $elem.dataset[key] != "undefined") {
      return [$elem.dataset[key], $elem];
    }
  } while ($elem = $elem.parentElement);
  return ["", null];
}
