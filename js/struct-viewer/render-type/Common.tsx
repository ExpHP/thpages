import React from 'react';
import {TypeDatabase, TypeName, Version} from '../database';
import {SimpleLink, LinkDest} from '~/js/UrlTools';

export type GetTypeUrl = (name: TypeName) => LinkDest | null;

/**
 * A crossref link to a named type, which is initially disabled but will be given an href attribute
 * once the existence of the type can be confirmed.
 **/
export function NamedTypeLink({db, name, version, getTypeUrl}: {db: TypeDatabase, name: TypeName, version: Version, getTypeUrl: GetTypeUrl}) {
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
