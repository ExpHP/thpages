import React from 'react';
import {TypeDatabase, TypeName, Version} from '../database';
import {SimpleLink, LinkDest} from '~/js/UrlTools';

export type GetTypeUrl = (name: TypeName) => LinkDest | null;

/**
 * Allows NamedTypeLink to be used.
 */
export function CommonLangToolsProvider(props: {children: React.ReactNode} & CommonLangToolsProps) {
  const {db, version, getTypeUrl, children} = props;
  const context = React.useMemo(() => ({db, version, getTypeUrl}), [db, version, getTypeUrl]);

  return <CommonContext.Provider value={context}>
    {children}
  </CommonContext.Provider>;
}

export type CommonLangToolsProps = {
  db: TypeDatabase,
  version: Version,
  getTypeUrl: GetTypeUrl,
};
const CommonContext = React.createContext<CommonLangToolsProps | null>(null);

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
  const {db, version, getTypeUrl} = context;

  const [linked, setLinked] = React.useState(false);

  React.useEffect(() => {
    const abortController = new AbortController();
    db.getTypeIfExists(name, version)
      .then((type) => {
        if (abortController.signal.aborted) return;
        if (type) setLinked(true);
      });

    return () => {
      abortController.abort();
      setLinked(false);
    };
  }, [db, name]);

  const to = React.useMemo(() => getTypeUrl(name), [getTypeUrl, name]);

  return <SimpleLink to={(linked && to) ? to : undefined} className={"type user"}>
    {name}
  </SimpleLink>;
}
