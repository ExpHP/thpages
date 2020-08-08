const NAMES = {};
const RECURSION_LIMIT = 16;

/**
 * Finds every node in the DOM that has a data-name attribute and replaces its
 * textual content with the name assigned to that id.
 *
 * @param {Element} $root
 * @return {Element} $root, modified in-place.
 */
function transformHtml($root) {
  for (const $elem of $root.querySelectorAll('[data-name]')) {
    $elem.textContent = _nameGetInnerText($elem.dataset.name);
  }
  return $root;
}

/**
 * Designates one key as an alias of another in the global name lookup.
 *
 * @param {string} aliasId Name key to set as an alias.
 * @param {string} targetId Name key from which aliasId shall pull data.
 */
function nameSetAlias(aliasId, targetId) {
  if (typeof aliasId !== 'string') {
    throw new TypeError(`expected string for aliasId, got ${typeof aliasId}`);
  }
  if (typeof targetId !== 'string') {
    throw new TypeError(`expected string for targetId, got ${typeof targetId}`);
  }
  NAMES[aliasId] = (i) => _nameGet(targetId, i+1);
}

/**
 * Assign a name in the global name lookup.
 *
 * @param {string} id Name key, as it shall appear in a data-name attribute.
 * @param {string} name
 */
function nameSet(id, name) {
  if (typeof id !== 'string') {
    throw new TypeError(`expected string for id, got ${typeof id}`);
  }
  NAMES[id] = (depth) => name;
}

/**
 * Get the currently set name from the global name lookup.  When generating HTML,
 * you should prefer getHtml instead...
 *
 * @param {string} id Name key, as it would appear in a data-name attribute.
 * @return {?string}
 */
function nameGetNow(id) {
  return _nameGet(id, 0);
}

function _nameGet(id, depth) {
  if (depth >= RECURSION_LIMIT) {
    window.console.error(`Recursion limit exceeded while looking up name ${id}`);
    return null;
  }
  const f = NAMES[id];
  return f === undefined ? null : f(depth);
}

/**
 * Get an HTML string for the name.  It is wrapped in a simple span that allows it to be
 * updated at any time using the transformHtml method.
 *
 * @param {string} id Name key, as it would appear in a data-name attribute.
 * @return {string}
 */
function nameGetHtml(id) {
  const initialText = _nameGetInnerText(id);
  return /* html */`<span data-name="${id}">${initialText}</span>`;
}

function _nameGetInnerText(id) {
  const name = nameGetNow(id);
  return name ? `NAME_ERROR(${id})` : name;
}

// FIXME blech, this is basically a singleton in a trenchcoat
export default {
  getNow: nameGetNow,
  getHtml: nameGetHtml,
  set: nameSet,
  setAlias: nameSetAlias,
  transformHtml: transformHtml,
};
