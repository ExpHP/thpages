// handles format of URLs on the site

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
// Any other keys else are page-specific.

function encodeComponent(s) {
  return encodeURIComponent(s).replace('%2C', ',').replace('%2F', '/');
}
function decodeComponent(s) {
  return decodeURIComponent(s);
}

export function parseQuery(s) {
  const ret = {s: null};
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
  return ret;
}

export function buildQuery(query) {
  let str = encodeComponent(query.s || '');
  for (const key in query) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      if (key !== 's' && key !== 'a') {
        str += `&${encodeComponent(key)}=${encodeComponent(query[key])}`;
      }
    }
  }
  if (query.a !== undefined) {
    str += `&a=${encodeComponent(query.a)}`;
  }
  return str;
}

// Query values are all strings so this simple test is fine.
export function queryEquals(a, b) {
  const aProps = Object.getOwnPropertyNames(a);
  const bProps = Object.getOwnPropertyNames(b);

  if (aProps.length != bProps.length) return false;
  return aProps.every((propName) => a[propName] === b[propName]);
}

// =============================================================

// Testing framework?  What's that?

// test types
const TWO_WAY = {};
const ENCODE = {};
const DECODE = {};
const TESTS = [
  // order of non-special props is preserved
  [TWO_WAY, {s: 'a/b', x: 'lol', b: 'true', a: 'dummy'}, 'a/b&x=lol&b=true&a=dummy'],
  [TWO_WAY, {s: 'a/b', b: 'true', x: 'lol', a: 'dummy'}, 'a/b&b=true&x=lol&a=dummy'],
  // s is always first, a is always last
  [TWO_WAY, {x: 'lol', a: 'dummy', s: 'a/b', b: 'true'}, 'a/b&x=lol&b=true&a=dummy'],
  [TWO_WAY, {a: 'dummy', s: 'a/b'}, 'a/b&a=dummy'],
  // missing a
  [TWO_WAY, {x: 'lol', s: 'a/b', b: 'true'}, 'a/b&x=lol&b=true'],
  [TWO_WAY, {s: 'a/b'}, 'a/b'],
  // missing s
  [ENCODE, {x: 'lol', a: 'dummy', b: 'true'}, '&x=lol&b=true&a=dummy'],
  [ENCODE, {a: 'dummy'}, '&a=dummy'],
  [DECODE, {s: '', x: 'lol', a: 'dummy', b: 'true'}, '&x=lol&b=true&a=dummy'],
  [DECODE, {s: '', a: 'dummy'}, '&a=dummy'],
  [DECODE, {s: '', x: 'lol', a: 'dummy', b: 'true'}, 'x=lol&b=true&a=dummy'],
  [DECODE, {s: '', a: 'dummy'}, 'a=dummy'],
  // optional s=
  [DECODE, {s: 'anm/ins', a: 'dummy'}, 'a=dummy&s=anm/ins'],
  [DECODE, {s: 'anm/ins'}, 's=anm/ins'],
  // comma legal
  [TWO_WAY, {s: ',', b: ',', a: ','}, ',&b=,&a=,'],
];
// percent encoding
const METACHARS = '&=%#';
const METACHARS_ENCODED = '%26%3D%25%23';
TESTS.push([TWO_WAY, {s: METACHARS, b: METACHARS, a: METACHARS}, `${METACHARS_ENCODED}&b=${METACHARS_ENCODED}&a=${METACHARS_ENCODED}`]);

// percent-encoded key. Though I certainly hope we'll never need this...
const testObj = {s: 'a'};
testObj[METACHARS] = 'b';
TESTS.push([TWO_WAY, testObj, `a&${METACHARS_ENCODED}=b`]);

let fail = false;
for (const [testKind, query, str] of TESTS) {
  if (testKind === TWO_WAY || testKind === ENCODE) {
    if (buildQuery(query) !== str) {
      fail = true;
      window.console.error("Encoding test failed", query, buildQuery(query), str);
    }
  }
  if (testKind === TWO_WAY || testKind === DECODE) {
    if (!queryEquals(parseQuery(str), query)) {
      fail = true;
      window.console.error("Decoding test failed", str, parseQuery(str), query);
    }
  }
}

if (fail) {
  throw new Error('url-format tests failed!');
}
