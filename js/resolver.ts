import {Query} from './url-format';

/** Information describing what page we are currently on, which may impact resolution. */
export type Context = Query;

/**
 * A thing that lazily looks up information about game objects, with possibly different
 * results based on user settings or the current page URL.
 *
 * E.g. the site uses Resolvers to resolve names of instructions, links to various game entities,
 * and tooltips for crossrefs.  E.g. when the site wants to know what name to display for a crossref,
 * it asks the name resolver to resolve e.g. `ref:anm:posTime`.  First it will find that there is a
 * function associated with `ref:` for crossref names, and that function will find that a function
 * was registered for `anm:`.
 */
export interface Resolver<Out> {
  /**
   * Get the value for a key from the given context.
   */
  getNow(key: string, ctx: Context): Out | null;
}

/**
 * Resolver that decides what to do based on the part before the first colon.
 *
 * E.g. the resolver for names calls one function for 'anm:' keys and another for 'ref:' keys.
 */
export class PrefixResolver<Out> implements Resolver<Out> {
  private map: Record<string, (key: string, c: Context) => Out | null>;

  constructor() {
    this.map = {};
  }

  getNow(key: string, context: Context) {
    const [pre, suff] = key.split(/:(.*)/);
    if (suff === undefined) return null;

    const func = this.map[pre];
    if (func) return func(suff, context);
    return null;
  }

  /**
   * Assign a function to a handle keys with the given prefix followed by a colon.
   *
   * The function will be supplied the part of the key after the colon.
   * @param prefix Prefix, without colon.
   */
  registerPrefix(
      prefix: string,
      func: (suff: string, ctx: Context) => Out | null,
  ): void;

  /** Assign another resolver to a handle keys with the given prefix followed by a colon. */
  registerPrefix(prefix: string, resolver: Resolver<Out>): void;

  registerPrefix(prefix: string, arg: unknown) {
    if (prefix.includes(':')) {
      throw new Error(`invalid prefix '${prefix}'`);
    }

    if ((arg as any).getNow) {
      this.map[prefix] = (ref, c) => (arg as any).getNow(ref, c);
    } else {
      this.map[prefix] = arg as any;
    }
  }
}

/**
 * Type that handles updating of names of things like ANM instructions.
 *
 * This type exists to allow the names in any DOM subtree to be updated in
 * response to a changed anmmap, or in response to being viewed from a different
 * page (so that e.g. a disambiguating "v8:" prefix can be added).
 */
class NameResolver extends PrefixResolver<string> {
  /**
   * Creates an HTML placeholder span which can be updated to contain the
   * current name at any time using transformHtml.
   */
  getHtml(key: string): string {
    return /* html */`<span data-name="${key}">${key}</span>`;
  }

  /**
   * Finds every node in the DOM created by getHtml and replaces its textual
   * content with the name assigned to that key.  This is used to implement
   * display of names from eclmaps and etc.
   *
   * @return $root, modified in-place.
   */
  transformHtml($root: HTMLElement, context: Context): HTMLElement {
    for (const $elem of $root.querySelectorAll<HTMLElement>('[data-name]')) {
      $elem.textContent = this.getInnerText($elem.dataset.name!, context);
    }
    return $root;
  }

  private getInnerText(key: string, context: Context) {
    const name = this.getNow(key, context);
    if (name) {
      return name;
    } else {
      const errorName = `NAME_ERROR(${key})`;
      console.error(errorName);
      return errorName;
    }
  }
}

/**
 * Type that handles URL generation and updating.
 *
 * What do I mean by "updating URLs"?
 * For instance, copyParentVars on the ANM instruction table might want to
 * link to variable 10033. If you are currently on the table for game 15,
 * it should send you to the var table for game 15 and not 17. Similarly,
 * if you are on the table for game 13 (which does not have 10033), it should
 * send you to one of the games that do have it.
 */
class LinkResolver extends PrefixResolver<string> {
  /**
   * Wraps HTML text in an anchor element that transformHtml can later update
   * to potentially link somewhere.
   */
  wrapHtml(key: string, html: string): string {
    return /* html */`<a data-link="${key}" class="nolink">${html}</a>`;
  }
  /**
   * Recursively finds every node in the DOM that was created by wrapHtml
   * and updates (inserts, modifies, or deletes) the href attribute.
   *
   * @return $root, modified in-place.
   */
  transformHtml($root: HTMLElement, context: Context): HTMLElement {
    for (const $elem of $root.querySelectorAll<HTMLAnchorElement>('[data-link]')) {
      const url = this.getNow($elem.dataset.link!, context);
      if (url != null) {
        $elem.href = url;
        $elem.classList.remove('nolink');
      } else {
        $elem.removeAttribute('href');
        $elem.classList.add('nolink');
      }
    }
    return $root;
  }
}

export const globalNames = new NameResolver();
export const globalLinks = new LinkResolver();

// for console debugging
(<any>window).globalNames = globalNames;
(<any>window).globalLinks = globalLinks;
