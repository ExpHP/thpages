/**
 * An object with safer typing of `obj[key]`.
 *
 * Be careful not to do `obj[key] = undefined`, which will typecheck
 * even if `undefined` is not contained in `V`...
 * */
export type StrMap<K extends (string | symbol), V> = { [P in K]?: V };
export type NumMap<V> = { [n in number]?: V; };

type SafeRecord<K extends (string | number | symbol), V> = { [P in K]?: V };

export const StrMap = {
  entries: function* <K extends string | symbol, V>(obj: StrMap<K, V>): IterableIterator<[K, V]> {
    for (const [k, v] of Object.entries(obj)) {
      yield [k as K, v as V];
    }
  },
  fromEntries: function<K extends string | symbol, V>(entries: [K, V][]): StrMap<K, V> {
    return fromEntries(entries);
  },
  mapValues: function<K extends string | symbol, V, V2>(obj: StrMap<K, V>, func: (v:V, k:K) => V2): StrMap<K, V2> {
    return StrMap.fromEntries([...StrMap.entries(obj)].map(([k, v]) => [k, func(v, k)]));
  },
  // it is actually surprisingly hard to write this in a way that typechecks
  getOrDefault: function<K extends string | symbol, V>(obj: StrMap<K, V>, key: K, def: V): V {
    // mut annotate as `V | undefined` because otherwise it will be `StrMap<K, V>[K]` and do dumb things.
    const value: V | undefined = obj[key];
    return value || def;
  },
};

export const NumMap = {
  entries: function* <V>(obj: NumMap<V>): IterableIterator<[number, V]> {
    for (const [k, v] of Object.entries(obj)) {
      const num = Number.parseInt(k, 10);
      if (num !== num) throw new Error(`unexpected non-integer key '${k}'`);
      yield [num, v as V];
    }
  },
  fromEntries: function<V>(entries: [number, V][]): NumMap<V> {
    return fromEntries(entries);
  },
  mapValues: function<V, V2>(obj: NumMap<V>, func: (v:V, k:number) => V2): NumMap<V2> {
    return NumMap.fromEntries([...NumMap.entries(obj)].map(([k, v]) => [k, func(v, k)]));
  },
  keys: function<V>(obj: NumMap<V>): IterableIterator<number> {
    return [...NumMap.entries(obj)].map(([k, v]) => k)[Symbol.iterator]();
  },
};

function fromEntries<K extends string | number | symbol, V>(entries: [K, V][]): SafeRecord<K, V> {
  return entries.reduce(
      (acc, [key, value]) => ({...acc, [key]: value}),
      {} as SafeRecord<K, V>,
  );
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

export type Without<T, K> = {
  [L in Exclude<keyof T, K>]: T[L]
};

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
 * Lets you annotate the type of something in a way that does type checking instead of simply casting.
 *
 * Useful when you need to define a literal value for a string enum in a location where TypeScript would
 * normally have its type decay to plain old `string`.
 */
export function typed<T>(x: T): T {
  return x;
}
