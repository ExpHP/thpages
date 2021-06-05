
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
