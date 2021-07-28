import React from 'react';

import {createRoundtripLexer, isKeyword, isPrimitiveType, isIgnorable, Token} from '../c-lexer';
import {TypeDatabase, Version, TypeName} from '../database';
import {NamedTypeLink, GetTypeUrl} from './Common';

export function CType(props: {db: TypeDatabase, ctype: string, version: Version, getTypeUrl: GetTypeUrl}) {
  const {db, ctype, version, getTypeUrl} = props;
  const children = React.useMemo(() => [...renderCType(db, ctype, version, getTypeUrl)], [ctype]);
  return <span className='type'>{children}</span>
}

/** Renders a C type string into components.
 *
 * (would like to replace this with a type-tree renderer that can produce
 * C declarations, C types or rust types at some point)
 */
function* renderCType(db: TypeDatabase, ctype: string, version: Version, getTypeUrl: GetTypeUrl) {
  const lexer = createRoundtripLexer();
  lexer.reset(ctype);
  const tokens = [...lexer];

  let prevToken: Token | undefined;

  const typeKeywords: (string | undefined)[] = ['kw-struct', 'kw-enum', 'kw-union'];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const expectingTypeName = typeKeywords.includes(prevToken && prevToken.type);
    if (token.type === 'IDENT' && expectingTypeName) {
      yield <NamedTypeLink key={i} db={db} name={token.text as TypeName} version={version} getTypeUrl={getTypeUrl}/>;
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
