
import globalNames from './names.js';

/** Maps tip ids to tip inner HTML. */
export const TIP_REGISTRY = {};
let $tip = null;
let $activeTipTarget = null;

export function initTips() {
  $tip = document.getElementById("tip");
  document.body.addEventListener("mouseover", tipIn);
  document.body.addEventListener("mouseout", tipOut);
}

function tipIn(e) {
  const [tip, $targ] = getTip(e.target);
  if (tip) {
    showTip(tip, $targ, e.target);
    e.stopImmediatePropagation();
  }
}

function showTip(tip, $targ, $realTarg) {
  $activeTipTarget = $realTarg;
  $tip.style.display = "block";
  $tip.innerHTML = tip;
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

function getTip($targ) {
  const embedded = getAncestorElementData($targ, "tip");
  const [refKey, refElem] = getAncestorElementData($targ, "tipId");
  const referenced = [TIP_REGISTRY[refKey], refElem];

  // prefer an embedded tip
  if (embedded[1]) return embedded;
  // else use a registered tip
  if (referenced[1]) return referenced;
  // no tip
  return ["", null];
}

function getAncestorElementData($elem, key) {
  do {
    if (typeof $elem.dataset[key] != "undefined") {
      return [$elem.dataset[key], $elem];
    }
  } while ($elem = $elem.parentElement);
  return ["", null];
}
