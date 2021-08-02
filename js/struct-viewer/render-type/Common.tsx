import React from 'react';
import {TypeDefinition, TypeName} from '../database';
import {SimpleLink, LinkDest} from '~/js/UrlTools';
import {DisplayTypeRow} from '../display-type';

/**
 * Allows NamedTypeLink to be used.
 */
export function CommonLangToolsProvider(props: {children: React.ReactNode} & CommonLangToolsProps) {
  const {lookupType, getTypeUrl, children} = props;
  const context = React.useMemo(() => ({lookupType, getTypeUrl}), [lookupType, getTypeUrl]);

  return <CommonContext.Provider value={context}>
    {children}
  </CommonContext.Provider>;
}

/** Type of a function for looking up named types in a fixed version. */
export type TypeLookupFunction = (name: TypeName) => TypeDefinition | undefined;
export type GetTypeUrl = (name: TypeName) => LinkDest;

export type CommonLangToolsProps = {
  lookupType: TypeLookupFunction,
  getTypeUrl: GetTypeUrl,
};
const CommonContext = React.createContext<CommonLangToolsProps | null>(null);

// An object defining all of the class name strings/combinations we use for styling
// struct-viewer text, to ensure that consistent names are used.
export const classes = {
  /** used on comment syntax in the language */
  comment: 'comment',
  /** typically used in combination with the `comment` class for a comment representing a gap */
  gap: 'field-gap',
  /** used on the '...' in the middle of an expanded array */
  elided: 'elided',
  /** a type like 'int' */
  primitiveType: 'type primitive',
  /** name of a struct/enum/union/typedef.  Typically `<NamedTypeLink>` should be used instead. */
  userType: 'type user',
  /** used on the placeholder for an unsupported type */
  unsupported: 'type error',
  /** a grabbag for keywords that don't fall into any other category */
  keyword: 'keyword',
  /** string literal */
  string: 'string',
  /** integer literal */
  integer: 'number',
  /** used on the type ident in the opening brace line of the outermost type we're viewing */
  currentTypeName: 'struct-name',
  /** struct or union member */
  fieldName: 'field-name',
  /** enum constant */
  enumValueName: 'field-name',
};

/**
 * A crossref link to a named type in the current database and version. It is initially
 * disabled but will be given an href attribute once the existence of the type can be confirmed.
 *
 * Requires CommonLangToolsProvider in order to be used.
 **/
export function NamedTypeLink({name}: {name: TypeName}) {
  const context = React.useContext(CommonContext);
  if (!context) {
    throw new Error("NamedTypeLink requires CommonLangToolsProvider");
  }
  const {lookupType, getTypeUrl} = context;

  // NOTE: Now that this takes a synchronous lookup function there is no longer any need to be
  //       async.  However, I'm going to keep the async stuff here until the dust settles, because
  //       ripping out the async logic is easy, while putting it back would be annoying.
  const fakePromise = React.useMemo(() => Promise.resolve(lookupType(name)), [name]);

  const [linked, setLinked] = React.useState(false);

  React.useEffect(() => {
    const abortController = new AbortController();
    fakePromise
      .then((type) => {
        if (abortController.signal.aborted) return;
        if (type) setLinked(true);
      });

    return () => {
      abortController.abort();
      setLinked(false);
    };
  }, [fakePromise, name]);

  const to = React.useMemo(() => getTypeUrl(name), [getTypeUrl, name]);

  return <SimpleLink to={(linked && to) ? to : undefined} className={classes.userType}>
    {name}
  </SimpleLink>;
}

export function ElidedArray(row: DisplayTypeRow & {data: {is: 'expanded-array-ellipsis'}}) {
  return <span className={classes.elided}>...</span>;
}
