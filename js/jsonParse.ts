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
          fail(json, context, e.message);
        }
        throw e;
      }
    });
  }
}

/**
 * A Parser or a parser factory.
 *
 * Generic combinators primarily take these as their arguments.  Taking a factory aids in the
 * construction of recursive or mutually recursive parsers, allowing you to pass in `() => someParser`
 * where `someParser` may not yet be defined.  The factory will be called the very first time that the
 * parser is needed to actually parse something (i.e. in the `parse` method), after which it may be
 * cached. (thus, the factory should be pure!)
 **/
export type ChildParser<T> = Parser<T> | (() => Parser<T>);

/**
 * Given a parser that might be lazily constructed, produce a lazily constructed
 * parser that is only computed on the first call.
 */
 function memoizeChild<T>(input: ChildParser<T>): () => Parser<T> {
  if (typeof input !== "function") {
    return () => input;
  } else {
    const parserConstructor = input;
    const emptyCacheMarker = {};
    let cache: {} | Parser<T> = emptyCacheMarker;
    return () => {
      if (cache === emptyCacheMarker) {
        cache = parserConstructor();
      }
      return cache as Parser<T>;
    };
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

export function array<T>(itemParser: ChildParser<T>): Parser<T[]> {
  const itemParserMemo = memoizeChild(itemParser);

  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (!Array.isArray(json)) {
      fail(json, context, `expected an array`);
    }
    return json.map((x, index) => context.inPath(index, (context) => itemParserMemo().parse(x, context)));
  });
}

// I can't believe this signature actually *works* in practice.
// Sometimes, TS is amazing.
export function object<P>(parsers: {[key in keyof P]: ChildParser<P[key]>}): Parser<P> {
  // @ts-ignore  ...I said "sometimes".
  const parserMemos = Object.fromEntries(Object.entries(parsers).map(([key, parser]) => [key, memoizeChild(parser)]));

  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (!(json && typeof json === 'object')) {
      fail(json, context, `expected an object`);
    }
    const out = {} as any;
    for (const [key, valueParserMemo] of Object.entries(parserMemos)) {
      // @ts-ignore
      out[key] = context.inPath(key, (context) => valueParserMemo().parse(json[key], context));
    }
    return out;
  });
}

export function map<K, V>(keyFn: (k: string) => K, valueParser: ChildParser<V>): Parser<Map<K, V>> {
  const valueParserMemo = memoizeChild(valueParser);

  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (!(json && typeof json === 'object')) {
      fail(json, context, `expected an object`);
    }
    const out = new Map();
    for (const [key, value] of Object.entries(json)) {
      out.set(keyFn(key), context.inPath(key, (context) => valueParserMemo().parse(value, context)));
    }
    return out;
  });
}

/** Allows an object property to be omitted.  It returns `undefined` when the input is `undefined`. */
export function optional<T>(valueParser: ChildParser<T>): Parser<T | undefined> {
  return withDefault(undefined, valueParser);
}

/** Allows a member to be omitted, by returning a default value when the input is `undefined`. */
export function withDefault<T, D>(def: D, valueParser: ChildParser<T>): Parser<T | D> {
  const valueParserMemo = memoizeChild(valueParser);

  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (json === undefined) return def;
    return valueParserMemo().parse(json, context);
  });
}

// no variadics, Parcel 1 is still on Typescript 3...
export interface TupleCombinator {
  (tuple: readonly []): Parser<[]>;
  <A>(tuple: readonly [ChildParser<A>]): Parser<[A]>;
  <A, B>(tuple: readonly [ChildParser<A>, ChildParser<B>]): Parser<[A, B]>;
  <A, B, C>(tuple: readonly [ChildParser<A>, ChildParser<B>, ChildParser<C>]): Parser<[A, B, C]>;
  <A, B, C, D>(tuple: readonly [ChildParser<A>, ChildParser<B>, ChildParser<C>, ChildParser<D>]): Parser<[A, B, C, D]>;
  <A, B, C, D, E>(tuple: readonly [ChildParser<A>, ChildParser<B>, ChildParser<C>, ChildParser<D>, ChildParser<E>]): Parser<[A, B, C, D, E]>;
}

// @ts-ignore (variadics memes)
export const tuple: TupleCombinator = (parsers: ChildParser<any>[]) => {
  let parserMemos = parsers.map(memoizeChild);

  let warningShown = false;
  return new ParserImpl((json: unknown, context: ParsingContext) => {
    if (!Array.isArray(json)) {
      fail(json, context, `expected a tuple`);
    }

    // compute result so we can fail before checking for warnings
    const result = parserMemos.map((parserMemo, index) => (
      context.inPath(index, (context) => parserMemo().parse(json[index], context))
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
  (expected: string): Parser<never>;
  <A>(expected: string, a: ChildParser<A>): Parser<A>;
  <A, B>(expected: string, a: ChildParser<A>, b: ChildParser<B>): Parser<A | B>;
  <A, B, C>(expected: string, a: ChildParser<A>, b: ChildParser<B>, c: ChildParser<C>): Parser<A | B | C>;
  <A, B, C, D>(expected: string, a: ChildParser<A>, b: ChildParser<B>, c: ChildParser<C>, d: ChildParser<D>): Parser<A | B | C | D>;
  <A, B, C, D, E>(expected: string, a: ChildParser<A>, b: ChildParser<B>, c: ChildParser<C>, d: ChildParser<D>, e: ChildParser<E>): Parser<A | B | C | D | E>;
}

/** Construct a parser from an alternative of other parsers, returning the first result that doesn't throw `JsonError`. */
// @ts-ignore (variadics memes)
export const or: OrCombinator = (expected: string, ...parsers: ChildParser<any>[]) => {
  let parserMemos = parsers.map(memoizeChild);

  return new ParserImpl((json: unknown, context: ParsingContext) => {
    for (const parserMemo of parserMemos) {
      try {
        return parserMemo().parse(json, context);
      } catch (e) {
        if (e instanceof JsonError) {
          // ignore
        } else throw e;
      }
    }
    fail(json, context, `expected ${expected}`);
  });
};

/** Parse an object that is a tagged variant, where one of the properties acts as a discriminant. */
// @ts-ignore (variadics memes)
export function tagged<T>(tagAttr: string, parsers: Record<string, ChildParser<T>>): Parser<T> {
  const parserMemos = Object.fromEntries(Object.entries(parsers).map(([k, v]) => [k, memoizeChild(v)]));

  // construct a dedicated object parser to extract the tag with proper errors
  const tagParserAttrs: Record<string, Parser<string>> = {};
  tagParserAttrs[tagAttr] = string;
  const tagParser = object(tagParserAttrs);

  return new ParserImpl((json: unknown, context: ParsingContext) => {
    const objectWithTag = tagParser.parse(json, context);
    const tag = objectWithTag[tagAttr];

    const parser = parserMemos[tag]();
    if (!parser) {
      fail(json, context, `unrecognized variant '${tag}'`);
    }
    return parser.parse(json, context);
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
    return `at ${this.path.join('.')}: ${this.#message}`;
  }
}

/** This can be thrown inside the callback to `then` to be transformed into a more descriptive `JsonError`. */
export class UserJsonError extends Error {}

function fail(json: unknown, context: ParsingContext, message: string): never {
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
