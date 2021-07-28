
/** Append key-value pairs from an object to a map in-place. */
export function mapAssign<T>(map: Map<string, T>, object: Record<string, T>) {
  for (const [k, v] of Object.entries(object)) {
    map.set(k, v);
  }
  return map;
}

export async function readUploadedFile(file: File, mode: 'binary'): Promise<ArrayBuffer>;
export async function readUploadedFile(file: File, mode?: 'text'): Promise<string>;
export async function readUploadedFile(file: File, mode?: 'binary' | 'text'): Promise<ArrayBuffer | string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as any);
    reader.onerror = reject;
    if (mode === 'binary') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
}

/** Memoizing wrapper around a zero-argument function. */
export interface Cached<T> {
  /** Obtain the value.  This invokes the function only on the first call. */
  get(): T;
  /** Clear the cache, so that the next call to `get` calls the function again. */
  reset(): void;
}

export function cached<T>(func: () => T): Cached<T> {
  /** Type of a guaranteed out-of-band value. */
  class EmptyCache {}
  let cache: T | EmptyCache = new EmptyCache();

  return {
    get() {
      if (cache instanceof EmptyCache) {
        cache = func();
      }
      return cache as T;
    },
    reset() {
      cache = new EmptyCache();
    },
  };
}

/**
 * When you have a code path with a value of type `never`, call `return unreachable(neverValue)` to accomplish several things:
 *
 * 1. Typescript doesn't recognize such code paths as dead code and generates spurious warnings about their return type.
 *    This eliminates the warning.
 * 2. This adds a type check that the code remains unreachable, so that you can't e.g. forget to add a branch to an if-chain
 *    after adding a variant to a union type.
 * 3. It performs logging in case the types are actually invalid at runtime.
 */
export function unreachable(x: never): never {
  console.error(x); // log the value since it clearly defies our type annotations
  throw new Error('the unpossible happened!');
}

/**
 * Return a unique identifier for each object passed in, to help differentiate object identity while debugging.
 *
 * Usage: `console.log(debugId(obj));`
 */
export const debugId = (() => {
  // it's tempting to try and set a Symbol on the object to store an ID on it, but
  // that could fail due to Object.freeze.  We have to store the IDs externally.
  const map = new WeakMap();
  let id = 0;
  return (x: any) => {
    if (x && (typeof x === 'object' || typeof x === 'function')) {
      if (!map.has(x)) {
        map.set(x, ++id);
      }
    }
    return map.get(x);
  };
})();

/**
 * Return a unique identifier for each object passed in, to help differentiate object identity while debugging.
 *
 * Usage: `console.log(debugId(obj));`
 */
export const debugTimesSeen = (() => {
  const map = new WeakMap();
  return (x: any) => {
    if (x && (typeof x === 'object' || typeof x === 'function')) {
      const old = map.get(x) || 0;
      map.set(x, old + 1);
      return old + 1;
    }
    return map.get(x);
  };
})();


/** Deep equality test. */
export function deepEqual(val1: unknown, val2: unknown) {
  return deepInequalityWitness(val1, val2) == null;
}

export type InequalityWitness = {
  /** Sequence of attributes to follow in order to reach the mismatch. */
  path: string[];
  /** The mismatched values at this path. */
  values: [unknown, unknown];
};

/**
 * Deep equality test that produces a witness of inequality.
 *
 * Note: The current implementation allows a missing attribute to match with `undefined`.
 **/
export function deepInequalityWitness(val1: unknown, val2: unknown, path: string[] = []): InequalityWitness | null {
  return (val1 && val2 && typeof val1 === 'object' && typeof val2 === 'object')
    ? objectDeepInequalityWitness(val1, val2, path)
    : Object.is(val1, val2)
      ? null
      : {path, values: [val1, val2]}
  ;
}

function objectDeepInequalityWitness(object1: object, object2: object, path: string[]): InequalityWitness | null {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object1);
  const union = new Set([...keys1, ...keys2]);
  for (const key of union) {
    path.push(key);
    const witness = deepInequalityWitness((object1 as any)[key], (object2 as any)[key], path);
    if (witness) return witness;
    --path.length;
  }

  return null;
}

/** Generates an array of the integers from start (inclusive) to end (exclusive). */
export function range(start: number, end: number) {
  return [...new Array(end - start).keys()].map((x) => x + start);
}


/** Create an array by calling a function on each index. */
export function arrayFromFunc<T>(length: number, func: (index: number) => T): T[] {
  return range(0, length).map(func);
}


/**
 * Async-ifies an HTML DOM event.
 *
 * E.g. `await domOnce(elem, 'click')` will wait for a single `'click'` event to occur.
 * During this time, an `error` event will be mapped to `Promise.reject`; this is used by some
 * HTML elements like `<img>`.
 **/
export async function domOnce($elem: HTMLElement, type: string) {
  return new Promise((resolve, reject) => {
    const onerror = (ev: ErrorEvent) => {
      $elem.removeEventListener('error', onerror);
      reject(new Error(ev.message));
    };
    const onevent = () => {
      $elem.removeEventListener('error', onerror);
      resolve(undefined);
    };
    $elem.addEventListener(type, onevent);
    $elem.addEventListener('error', onerror);
  });
}

export interface Comparator<T> {
  (a: T, b: T): number
}

export function defaultCmp<T>(a: T, b: T) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** In-place stable sort. */
export function stableSort<T>(array: T[], funcs: {cmp?: Comparator<T>}): T[];
export function stableSort<T, U>(array: T[], funcs: {cmp?: Comparator<U>, key?: (a: T) => U}): T[];
export function stableSort<T, U>(array: T[], {cmp = defaultCmp, key = (x: any) => x}: {cmp: any, key: any}): T[] {
  const stabilized = array.map((el, index) => [key(el), index] as const);
  const stableCmp: Comparator<readonly [U, number]> = (a, b) => {
    const order = cmp(a[0], b[0]);
    if (order != 0) return order;
    return a[1] - b[1];
  };

  stabilized.sort(stableCmp);
  const originals = array.splice(0, array.length);
  for (const [, index] of stabilized) {
    array.push(originals[index]);
  }

  return array;
}

/** Iterate over overlapping windows of 2 items from an iterator.
 *
 * E.g. turns `[a, b, c, d]` into `[[a, b], [b, c], [c, d]`.
 */
export function* window2<T>(iter: Iterable<T>): Generator<[T, T]> {
  let first = true;
  let prev: T | undefined;
  for (const item of iter) {
    if (!first) {
      yield [prev!, item]
    }
    first = false;
    prev = item;
  }
}
