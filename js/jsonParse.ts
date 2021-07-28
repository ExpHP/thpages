// JSON Type combinator mini-library.

export interface Parser<T> {
  parse(json: unknown, context?: ParsingContext): T;
  then<U>(func: (x: T) => U): Parser<U>;
}

// a class so we can provide methods like '.map()' on all parsers and take care of default
// context initialization in one place
class ParserImpl<T> {
  #func: (x: unknown, context: ParsingContext) => T;

  constructor(func: (x: unknown, context: ParsingContext) => T) {
    this.#func = func;
    this.parse = this.parse.bind(this);
  }

  parse(json: unknown, context: ParsingContext = new ParsingContext(json)): T {
    return this.#func(json, context);
  }

  then<U>(mapper: (x: T) => U): Parser<U> {
    return new ParserImpl((json, context) => {
      try {
        return mapper(this.#func(json, context))
      } catch (e) {
        if (e instanceof UserJsonError) {
          _fail(json, context, e.message);
        }
        throw e;
      }
    });
  }
}

/**
 * Create a parser that constructs itself from a factory function on the very first
 * call to `parse`.
 *
 * The purpose is to allow you to refer to parsers that may not yet be defined during
 * construction.  Reasons why you may want to do this:
 *
 * - Recursive parsers.
 * - *Mutually* recursive parsers.
 * - Writing definitions top-down. (a.k.a. The Right Way)
 */
 export function lazy<T>(factory: () => Parser<T>): Parser<T> {
  const emptyCacheMarker = {};
  let cache: {} | Parser<T> = emptyCacheMarker;
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (cache === emptyCacheMarker) {
      cache = factory();
    }
    return (cache as Parser<T>).parse(json, context);
  });
}

// =============================================================================
// The basic combinators

export const any: Parser<unknown> = new ParserImpl((json: unknown) => json);

export const number: Parser<number> = new ParserImpl((json: unknown, context: ParsingContext) => {
  if (typeof json !== 'number') {
    _fail(json, context, `expected a number`);
  }
  return json;
});

export const int: Parser<number> = new ParserImpl((json: unknown, context: ParsingContext) => {
  if (typeof json !== 'number' || !Number.isInteger(json)) {
    _fail(json, context, `expected an integer`);
  }
  return json;
});

export const string: Parser<string> = new ParserImpl((json: unknown, context: ParsingContext) => {
  if (typeof json !== 'string') {
    _fail(json, context, `expected a string`);
  }
  return json;
});

export const boolean: Parser<boolean> = new ParserImpl((json: unknown, context: ParsingContext) => {
  if (typeof json !== 'boolean') {
    _fail(json, context, `expected a boolean`);
  }
  return json;
});

export const null_: Parser<null> = new ParserImpl((json: unknown, context: ParsingContext) => {
  if (json !== null) {
    _fail(json, context, `expected null`);
  }
  return json;
});

export function array<T>(itemParser: Parser<T>): Parser<T[]> {
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (!Array.isArray(json)) {
      _fail(json, context, `expected an array`);
    }
    return json.map((x, index) => context.inPath(index, (context) => itemParser.parse(x, context)));
  });
}

// I can't believe this signature actually *works* in practice.
// Sometimes, TS is amazing.
export function object<P>(parsers: {[key in keyof P]: Parser<P[key]>}): Parser<P> {
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (!(json && typeof json === 'object')) {
      _fail(json, context, `expected an object`);
    }
    const out = {} as any;
    for (const [key, valueParser] of Object.entries(parsers)) {
      // @ts-ignore
      out[key] = context.inPath(key, (context) => valueParser.parse(json[key], context));
    }
    return out;
  });
}

export function map<K, V>(keyFn: (k: string) => K, valueParser: Parser<V>): Parser<Map<K, V>> {
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (!(json && typeof json === 'object')) {
      _fail(json, context, `expected an object`);
    }
    const out = new Map();
    for (const [key, value] of Object.entries(json)) {
      out.set(keyFn(key), context.inPath(key, (context) => valueParser.parse(value, context)));
    }
    return out;
  });
}

/** Allows an object property to be omitted.  It returns `undefined` when the input is `undefined`. */
export function optional<T>(valueParser: Parser<T>): Parser<T | undefined> {
  return withDefault(undefined, valueParser);
}

/** Allows a member to be omitted, by returning a default value when the input is `undefined`. */
export function withDefault<T, D>(def: D, valueParser: Parser<T>): Parser<T | D> {
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (json === undefined) return def;
    return valueParser.parse(json, context);
  });
}

// no variadics, Parcel 1 is still on Typescript 3...
export interface TupleCombinator {
  (tuple: readonly []): Parser<[]>;
  <A>(tuple: readonly [Parser<A>]): Parser<[A]>;
  <A, B>(tuple: readonly [Parser<A>, Parser<B>]): Parser<[A, B]>;
  <A, B, C>(tuple: readonly [Parser<A>, Parser<B>, Parser<C>]): Parser<[A, B, C]>;
  <A, B, C, D>(tuple: readonly [Parser<A>, Parser<B>, Parser<C>, Parser<D>]): Parser<[A, B, C, D]>;
  <A, B, C, D, E>(tuple: readonly [Parser<A>, Parser<B>, Parser<C>, Parser<D>, Parser<E>]): Parser<[A, B, C, D, E]>;
}

// @ts-ignore (variadics memes)
export const tuple: TupleCombinator = (parsers: Parser<any>[]) => {
  let warningShown = false;
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (!Array.isArray(json)) {
      _fail(json, context, `expected a tuple`);
    }

    // compute result so we can fail before checking for warnings
    const result = parsers.map((parser, index) => (
      context.inPath(index, (context) => parser.parse(json[index], context))
    ));

    if (json.length > parsers.length && !warningShown) {
      console.warn(`ignoring extra elements in tuple (expected ${parsers.length}, got ${json.length})`, json);
      warningShown = true;
    }
    return result;
  });
};

// no variadics, Parcel 1 is still on Typescript 3...
export interface OrCombinator {
  (): Parser<never>;
  <A>(a: Parser<A>): Parser<A>;
  <A, B>(a: Parser<A>, b: Parser<B>): Parser<A | B>;
  <A, B, C>(a: Parser<A>, b: Parser<B>, c: Parser<C>): Parser<A | B | C>;
  <A, B, C, D>(a: Parser<A>, b: Parser<B>, c: Parser<C>, d: Parser<D>): Parser<A | B | C | D>;
  <A, B, C, D, E>(a: Parser<A>, b: Parser<B>, c: Parser<C>, d: Parser<D>, e: Parser<E>): Parser<A | B | C | D | E>;
}

/**
 * Construct a parser from an alternative of other parsers, returning the first result that doesn't throw `JsonError`.
 *
 * If all of them fail, the error message will be from the final parser.  If none of the parsers seem that they
 * would produce a suitable message, simply use `JP.fail` as the final parser to supply a custom message.
 **/
// @ts-ignore (variadics memes)
export const or: OrCombinator = (...parsers: Parser<any>[]) => {
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    for (let i=0; i < parsers.length; i++) {
      try {
        return parsers[i].parse(json, context);
      } catch (e) {
        if (e instanceof JsonError && i !== parsers.length - 1) {
          // ignore
        } else throw e;
      }
    }
  });
};

/** Parse an object that is a tagged variant, where one of the properties acts as a discriminant. */
// @ts-ignore (variadics memes)
export function tagged<T>(tagAttr: string, parsers: Record<string, Parser<T>>): Parser<T> {
  // construct a dedicated object parser to extract the tag with proper errors
  const tagParserAttrs: Record<string, Parser<string>> = {};
  tagParserAttrs[tagAttr] = string;
  const tagParser = object(tagParserAttrs);

  return new ParserImpl((json: unknown, context: ParsingContext) => {
    const objectWithTag = tagParser.parse(json, context);
    const tag = objectWithTag[tagAttr];

    const parser = parsers[tag];
    if (!parser) {
      _fail(json, context, `unrecognized variant '${tag}'`);
    }
    return parser.parse(json, context);
  });
}

/** A parser that always fails. */
export function fail(message: string): Parser<never> {
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    _fail(json, context, message);
  });
}

// =============================================================================
// Error handling

export class JsonError extends Error {
  #message: string;
  fullJson: unknown;
  badPart: unknown;
  path: (string | number)[];
  constructor(json: unknown, context: ParsingContext, message: string) {
    super();
    this.fullJson = context.fullJson;
    this.path = [...context.path];
    this.badPart = json;
    this.#message = message;
  }

  get message() {
    return `at ${this.path.join('.')}: ${this.#message} (got ${JSON.stringify(this.badPart)})`;
  }
}

/** This can be thrown inside the callback to `then` to be transformed into a more descriptive `JsonError`. */
export class UserJsonError extends Error {}

function _fail(json: unknown, context: ParsingContext, message: string): never {
  throw new JsonError(json, context, message);
}

class ParsingContext {
  fullJson: unknown;
  #path: (string | number)[];

  /** Obtain a copy of the full path. */
  get path() { return [...this.#path]; }

  constructor(json: unknown) {
    this.#path = [];
    this.fullJson = json;
  }

  inPath<T>(segment: number | string, cont: (ctx: ParsingContext) => T): T {
    this.#path.push(segment);
    const out = cont(this);
    this.#path.pop();
    return out;
  }
}
