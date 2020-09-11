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
