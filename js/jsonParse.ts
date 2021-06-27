// JSON Type combinator mini-library.

export interface Parser<T> {
  parse(json: unknown, context?: ParsingContext): T;
  then<U>(func: (x: T) => U): Parser<U>;
}

// a class so we can provide methods like '.map()' on all parsers and take care of default
// context initialization in one place
class ParserImpl<T> {
  private func: (x: unknown, context: ParsingContext) => T;

  constructor(func: (x: unknown, context: ParsingContext) => T) {
    this.func = func;
    this.parse = this.parse.bind(this);
  }

  parse(json: unknown, context: ParsingContext = new ParsingContext(json)): T {
    return this.func(json, context);
  }

  then<U>(mapper: (x: T) => U): Parser<U> {
    return new ParserImpl((json, context) => {
      try {
        return mapper(this.func(json, context))
      } catch (e) {
        if (e instanceof UserJsonError) {
          fail(json, context, e.message);
        }
        throw e;
      }
    });
  }
}

// =============================================================================
// The basic combinators

export const any: Parser<unknown> = new ParserImpl((json: unknown) => json);

export const number: Parser<number> = new ParserImpl((json: unknown, context: ParsingContext) => {
  if (typeof json !== 'number') {
    fail(json, context, `expected a number`);
  }
  return json;
});

export const int: Parser<number> = new ParserImpl((json: unknown, context: ParsingContext) => {
  if (typeof json !== 'number' || !Number.isInteger(json)) {
    fail(json, context, `expected an integer`);
  }
  return json;
});

export const string: Parser<string> = new ParserImpl((json: unknown, context: ParsingContext) => {
  if (typeof json !== 'string') {
    fail(json, context, `expected a string`);
  }
  return json;
});

export const boolean: Parser<boolean> = new ParserImpl((json: unknown, context: ParsingContext) => {
  if (typeof json !== 'boolean') {
    fail(json, context, `expected a boolean`);
  }
  return json;
});

export const null_: Parser<null> = new ParserImpl((json: unknown, context: ParsingContext) => {
  if (json !== null) {
    fail(json, context, `expected null`);
  }
  return json;
});

export function array<T>(itemParser: Parser<T>): Parser<T[]> {
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (!Array.isArray(json)) {
      fail(json, context, `expected an array`);
    }
    return json.map((x, index) => context.inPath(index, (context) => itemParser.parse(x, context)));
  });
}

// I can't believe this signature actually *works* in practice.
// Sometimes, TS is amazing.
export function object<P>(parsers: {[key in keyof P]: Parser<P[key]>}): Parser<P> {
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (!(json && typeof json === 'object')) {
      fail(json, context, `expected an object`);
    }
    const out = {} as any;
    for (const [key, valueParser] of Object.entries(parsers)) {
      out[key] = context.inPath(key, (context) => valueParser.parse(json[key], context));
    }
    return out;
  });
}

export function map<K, V>(keyFn: (k: string) => K, valueParser: Parser<V>): Parser<Map<K, V>> {
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (!(json && typeof json === 'object')) {
      fail(json, context, `expected an object`);
    }
    const out = new Map();
    for (const [key, value] of Object.entries(json)) {
      out.set(keyFn(key), context.inPath(key, (context) => valueParser.parse(value, context)));
    }
    return out;
  });
}

export function optional<T>(valueParser: Parser<T>): Parser<T | undefined> {
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (json === undefined) return undefined;
    return valueParser.parse(json, context);
  });
}

// no variadics, Parcel 1 is still on Typescript 3...
export interface TupleCombinator {
  (tuple: []): Parser<[]>;
  <A>(tuple: [Parser<A>]): Parser<[A]>;
  <A, B>(tuple: [Parser<A>, Parser<B>]): Parser<[A, B]>;
  <A, B, C>(tuple: [Parser<A>, Parser<B>, Parser<C>]): Parser<[A, B, C]>;
  <A, B, C, D>(tuple: [Parser<A>, Parser<B>, Parser<C>, Parser<D>]): Parser<[A, B, C, D]>;
  <A, B, C, D, E>(tuple: [Parser<A>, Parser<B>, Parser<C>, Parser<D>, Parser<E>]): Parser<[A, B, C, D, E]>;
}

// @ts-ignore (variadics memes)
export const tuple: TupleCombinator = (tuple: Parser<any>[]) => {
  let warningShown = false;
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (!Array.isArray(json)) {
      fail(json, context, `expected a tuple`);
    }
    if (json.length > tuple.length && !warningShown) {
      console.warn(`ignoring extra elements in tuple (expected ${tuple.length}, got ${json.length})`, tuple);
      warningShown = true;
    }

    return tuple.map((parser, index) => context.inPath(index, (context) => parser.parse(json[index], context)));
  });
};

// no variadics, Parcel 1 is still on Typescript 3...
export interface OrCombinator {
  (expected: string): Parser<never>;
  <A>(expected: string, a: Parser<A>): Parser<A>;
  <A, B>(expected: string, a: Parser<A>, b: Parser<B>): Parser<A | B>;
  <A, B, C>(expected: string, a: Parser<A>, b: Parser<B>, c: Parser<C>): Parser<A | B | C>;
  <A, B, C, D>(expected: string, a: Parser<A>, b: Parser<B>, c: Parser<C>, d: Parser<D>): Parser<A | B | C | D>;
  <A, B, C, D, E>(expected: string, a: Parser<A>, b: Parser<B>, c: Parser<C>, d: Parser<D>, e: Parser<E>): Parser<A | B | C | D | E>;
}

/** Construct a parser from an alternative of other parsers, returning the first result that doesn't throw `JsonError`. */
// @ts-ignore (variadics memes)
export const or: OrCombinator = (expected: string, ...parsers: Parser<any>[]) => {
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    for (const parser of parsers) {
      try {
        return parser.parse(json, context);
      } catch (e) {
        if (e instanceof JsonError) {
          // ignore
        } else throw e;
      }
    }
    fail(json, context, `expected ${expected}`);
  });
};


// =============================================================================
// Error handling

class JsonError extends Error {
  message_: string;
  fullJson: unknown;
  badPart: unknown;
  path: (string | number)[];
  constructor(json: unknown, context: ParsingContext, message: string) {
    super();
    this.fullJson = context.fullJson;
    this.path = [...context.path];
    this.badPart = json;
    this.message_ = message;
  }

  get message() {
    return `at ${this.path.join('.')}: ${this.message_}`;
  }
}

/** This can be thrown inside the callback to `then` to be transformed into a more descriptive `JsonError`. */
export class UserJsonError extends Error {}

function fail(json: unknown, context: ParsingContext, message: string): never {
  throw new JsonError(json, context, message);
}

class ParsingContext {
  fullJson: unknown;
  private path_: (string | number)[];

  /** Obtain a copy of the full path. */
  get path() { return [...this.path_]; }

  constructor(json: unknown) {
    this.path_ = [];
    this.fullJson = json;
  }

  inPath<T>(segment: number | string, cont: (ctx: ParsingContext) => T): T {
    this.path_.push(segment);
    const out = cont(this);
    this.path_.pop();
    return out;
  }
}

// =============================================================================

function _typeCheckTest() {
  const parser = object({
    version: number,
    sillyFeature: optional(string),
    things: array(object({
      mapped: number.then((x) => [x, 2 * x]),
      triple: tuple([number, number, array(number)]),
    })),
  });

  type Output = {
    version: number,
    sillyFeature?: string,
    things: {
      mapped: [number, number];
      triple: [number, number, number[]];
    }[];
  }
  const value: Object = parser.parse(JSON.parse(JSON.stringify({
    version: 1,
    things: [{mapped: 3, triple: [1, 2, [3]]}]
  })));
  return value;
}
