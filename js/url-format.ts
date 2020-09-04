// handles format of URLs on the site

import {Game, parseGame} from "./game-names";

// This is effectively an SPA so we put basically everything in the hash.
// After the hash is a &-separated list of key=value pairs, much like the normal '?' querystring.
//
// The first pair is allowed to have no '=', in which case it is interpreted as the page path
// (this can be manually specified with 's=' for backcompat).
//
// 'a=' is an anchor, which is meant to behave like '#' normally does.
// Encoding will always prefer to place this at the end of the URL.
//
// Each key and value is %-encoded like a URI component except that ',' and '/' are not escaped.
//
// The leading number of slashes in the 's=' is irrelevant for the purposes of equality testing.
//
// Any other keys else are page-specific.

export type Query = {
  s: string, //  page
  g?: string, //  game number
  a?: string, //  anchor
} & Record<string, string>;

/** Default value of 'g' on pages that require one where it might not be set. */
export const DEFAULT_GAME = '17';

function encodeComponent(s: string): string {
  return encodeURIComponent(s).replace(/%2C/g, ',').replace(/%2F/g, '/');
}
function decodeComponent(s: string): string {
  return decodeURIComponent(s);
}

/** Get the game most strongly associated with a query. */
export function queryGame(q: Query): Game {
  return parseGame(q.g || '') || DEFAULT_GAME;
}

export function parseQuery(s: string): Query {
  const ret: Record<string, string | null> = {s: null};

  // window.location.hash can be '' so allow hash to be optional
  if (s.startsWith('#')) {
    s = s.substring(1);
  }

  const spl = s.split("&");
  for (let i = 0; i < spl.length; i++) {
    if (i === 0 && !spl[i].includes("=")) {
      // implicit s=
      ret.s = decodeComponent(spl[i]);
    } else if (spl[i].includes("=")) {
      // explicit key=value
      const [key, val] = spl[i].split("=");
      if (typeof ret[key] === 'string') {
        window.console.error('duplicate key in URL', spl[i]);
      }

      ret[decodeComponent(key)] = decodeComponent(val);
    } else {
      window.console.error('ignoring invalid URL component', spl[i]);
    }
  }

  // don't distinguish between an empty page versus none being provided
  if (ret.s === null) ret.s = '';
  return ret as Query;
}

export function queryUrl(query: Query) {
  let str = encodeComponent(query.s || '');
  for (const [key, value] of Object.entries(query)) {
    if (key !== 's' && key !== 'a') {
      str += `&${encodeComponent(key)}=${encodeComponent(value)}`;
    }
  }
  if (query.a !== undefined) {
    str += `&a=${encodeComponent(query.a)}`;
  }
  return '#' + str;
}

export function queryEquals(a: Query, b: Query) {
  a = Object.assign({}, a, {s: normalizePage(a.s || '')});
  b = Object.assign({}, b, {s: normalizePage(b.s || '')});
  return dumbObjectEquals(a, b);
}

/** Test that two queries have equal `s` fields, upto path normalization. */
export function queryPageEquals(a: Query, b: Query) {
  return normalizePage(a.s || '') === normalizePage(b.s || '');
}

// Equality check between two objects where all values can be tested using '==='.
function dumbObjectEquals(a: Query, b: Query) {
  const aProps = Object.getOwnPropertyNames(a);
  const bProps = Object.getOwnPropertyNames(b);

  if (aProps.length != bProps.length) return false;
  return aProps.every((propName) => a[propName] === b[propName]);
}

export function normalizePage(s: string) {
  return s.replace(/^\/*/, '/');
}

/**
 * Filters a query to just contain things that typically share meaning across
 * different pages.
 */
export function queryFilterCommonProps(q: Query) {
  const {s, g, ...rest} = q;
  rest; // pretend to use

  const out = {s} as Query;
  if (g) out.g = g;
  return out;
}

export function queryEqualsUptoAnchor(q1: Query, q2: Query) {
  const {a: a1, ...rest1} = q1;
  const {a: a2, ...rest2} = q2;
  a1; a2; // pretend to use

  return queryEquals(rest1, rest2);
}

// =============================================================

// Testing framework?  What's that?

// test types
const TWO_WAY = '2way';
const ENCODE = 'encode';
const DECODE = 'decode';
const TESTS: ['2way' | 'encode' | 'decode', Query, string][] = [
  // order of non-special props is preserved
  [TWO_WAY, {s: 'a/b', x: 'lol', b: 'true', a: 'dummy'}, '#a/b&x=lol&b=true&a=dummy'],
  [TWO_WAY, {s: 'a/b', b: 'true', x: 'lol', a: 'dummy'}, '#a/b&b=true&x=lol&a=dummy'],
  // s is always first, a is always last
  [TWO_WAY, {x: 'lol', a: 'dummy', s: 'a/b', b: 'true'}, '#a/b&x=lol&b=true&a=dummy'],
  [TWO_WAY, {a: 'dummy', s: 'a/b'}, '#a/b&a=dummy'],
  // missing a
  [TWO_WAY, {x: 'lol', s: 'a/b', b: 'true'}, '#a/b&x=lol&b=true'],
  [TWO_WAY, {s: 'a/b'}, '#a/b'],
  // missing s (could happen in non-typescript code, and we want to still be robust to it)
  [ENCODE, {x: 'lol', a: 'dummy', b: 'true'} as unknown as Query, '#&x=lol&b=true&a=dummy'],
  [ENCODE, {a: 'dummy'} as Query, '#&a=dummy'],
  [DECODE, {s: '', x: 'lol', a: 'dummy', b: 'true'}, '#&x=lol&b=true&a=dummy'],
  [DECODE, {s: '', a: 'dummy'}, '#&a=dummy'],
  [DECODE, {s: '', x: 'lol', a: 'dummy', b: 'true'}, '#x=lol&b=true&a=dummy'],
  [DECODE, {s: '', a: 'dummy'}, '#a=dummy'],
  // optional s=
  [DECODE, {s: 'anm/ins', a: 'dummy'}, '#a=dummy&s=anm/ins'],
  [DECODE, {s: 'anm/ins'}, '#s=anm/ins'],
  // comma legal
  [TWO_WAY, {s: ',,', b: ',,', a: ',,'}, '#,,&b=,,&a=,,'],
];
// percent encoding
const METACHARS = '&=%#';
const METACHARS_ENCODED = '%26%3D%25%23';
TESTS.push([TWO_WAY, {s: METACHARS, b: METACHARS, a: METACHARS}, `#${METACHARS_ENCODED}&b=${METACHARS_ENCODED}&a=${METACHARS_ENCODED}`]);

// percent-encoded key. Though I certainly hope we'll never need this...
const testObj: Query = {s: 'a'};
testObj[METACHARS] = 'b';
TESTS.push([TWO_WAY, testObj, `#a&${METACHARS_ENCODED}=b`]);

let fail = false;
for (const [testKind, query, str] of TESTS) {
  if (testKind === TWO_WAY || testKind === ENCODE) {
    if (queryUrl(query) !== str) {
      fail = true;
      window.console.error("Encoding test failed", query, queryUrl(query), str);
    }
  }
  if (testKind === TWO_WAY || testKind === DECODE) {
    if (!queryEquals(parseQuery(str), query)) {
      fail = true;
      window.console.error("Decoding test failed", str, parseQuery(str), query);
    }
  }
}

const EQUALITY_TESTS: [Query, Query, (a: Query, b: Query) => boolean, boolean][] = [
  // simple cases
  [{s: 'a/b'}, {s: 'a/b'}, queryEquals, true],
  [{s: 'a/b', a: 'dummy'}, {s: 'a/b', a: 'dummy'}, queryEquals, true],
  [{s: 'a/b', x: 'lol', b: 'true', a: 'dummy'}, {s: 'a/b', b: 'true', x: 'lol', a: 'dummy'}, queryEquals, true],
  // leading slashes in s doesn't matter
  [{s: '//a/b', a: 'dummy'}, {s: 'a/b', a: 'dummy'}, queryEquals, true],
  [{s: 'a/b', a: '/dummy'}, {s: 'a/b', a: 'dummy'}, queryEquals, false],
  // anchor
  [{s: 'a/b', a: 'dummy'}, {s: 'a/b', a: 'other'}, queryEquals, false],
  [{s: 'a/b', a: 'dummy'}, {s: 'a/b', a: 'other'}, queryEqualsUptoAnchor, true],
  [{s: 'a/b', a: 'dummy'}, {s: 'b/b', a: 'other'}, queryEqualsUptoAnchor, false],
  [{s: 'a/b', b: 'x', a: 'dummy'}, {s: 'a/b', b: 'x', a: 'dummy'}, queryEqualsUptoAnchor, true],
  [{s: 'a/b', b: 'x', a: 'dummy'}, {s: 'a/b', b: 'y', a: 'dummy'}, queryEqualsUptoAnchor, false],
];

for (const [a, b, func, expected] of EQUALITY_TESTS) {
  if (func(a, b) !== expected) {
    fail = true;
    window.console.error('equality test failed', a, b, func);
  } else if (func(b, a) !== expected) {
    fail = true;
    window.console.error('equality test failed', b, a, func);
  }
}

if (fail) {
  throw new Error('url-format tests failed!');
}
