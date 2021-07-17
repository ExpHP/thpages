import React from 'react';

import {createRoundtripLexer, isKeyword, isPrimitiveType, isIgnorable, Token} from './c-lexer';
import {StructDatabase, Version, TypeName} from './database';
import {useSearchParams, usePathname, SimpleLink} from '~/js/UrlTools';

export function CType({db, ctype, version}: {db: StructDatabase, ctype: string, version: Version}) {
  const children = React.useMemo(() => [...renderCType(db, ctype, version)], [ctype]);
  return <span className='type'>{children}</span>
}

/** Renders a C type string into components.
 *
 * (would like to replace this with a type-tree renderer that can produce
 * C declarations, C types or rust types at some point)
 */
function* renderCType(db: StructDatabase, ctype: string, version: Version) {
  const lexer = createRoundtripLexer();
  lexer.reset(ctype);
  const tokens = [...lexer];

  let prevToken: Token | undefined;

  const typeKeywords: (string | undefined)[] = ['kw-struct', 'kw-enum', 'kw-union'];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const expectingTypeName = typeKeywords.includes(prevToken && prevToken.type);
    if (token.type === 'IDENT' && expectingTypeName) {
      yield <TypeLinkToken key={i} db={db} ident={token.text} version={version}/>;
    } else {
      yield <BasicToken key={i} type={token.type || ''} text={token.text}/>;
    }

    if (!isIgnorable(token)) {
      prevToken = token;
    }
  }
}

function BasicToken({type, text}: {type: string, text: string}) {
  if (type === 'INTEGER') {
    return <span className='number'>{text}</span>;
  } else if (isPrimitiveType(type)) {
    return <span className='type primitive'>{text}</span>;
  } else if (isKeyword(type)) {
    return <span className='keyword'>{text}</span>;
  } else {
    return <span>{text}</span>;
  }
}

function TypeLinkToken({db, ident, version}: {db: StructDatabase, ident: string, version: Version}) {
  const [linked, setLinked] = React.useState(false);

  React.useEffect(() => {
    const abortController = new AbortController();
    db.getStructIfExists(ident as TypeName, version)
      .then((struct) => {
        if (abortController.signal.aborted) return;
        if (struct) setLinked(true);
      });

    return () => {
      abortController.abort();
      setLinked(false);
    };
  }, [db, ident]);

  // FIXME: There's some duplicated logic between here and setTypeName.
  //        But we don't just want to take setTypeName as a prop because an onClick
  //        is only a sorry substitute for a bona-fide <a> element hyperlink.
  const searchParams = useSearchParams();
  const to = React.useMemo(() => {
    const searchParamsCopy = new URLSearchParams(searchParams);
    searchParamsCopy.set('t', ident);
    return {pathname: '/struct', search: '?' + searchParamsCopy.toString()};
  }, [searchParams])

  return <SimpleLink to={linked ? to : undefined} className={"type user"}>
    {ident}
  </SimpleLink>;
}
