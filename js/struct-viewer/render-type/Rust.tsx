import React from 'react';

import {createRoundtripLexer, isKeyword, isPrimitiveType, isIgnorable, Token} from '../c-lexer';
import {TypeDatabase, Version, TypeName, TypeTree} from '../database';
import {useSearchParams, usePathname, SimpleLink, LinkDest} from '~/js/UrlTools';
import {unreachable} from '~/js/util';
import {NamedTypeLink, GetTypeUrl} from './Common';

export const RustType = React.memo(function RustType(props: {
    db: TypeDatabase,
    type: TypeTree,
    version: Version,
    getTypeUrl: GetTypeUrl,
}) {
  const {db, type, version, getTypeUrl} = props;
  return <TypeRenderContext.Provider value={{db, version, getTypeUrl}}>
    <RustAnyType {...{type}}/>
  </TypeRenderContext.Provider>;
});

// This is only null for a brief moment in RustType so we type it as non-null.
const TypeRenderContext = React.createContext<{
  db: TypeDatabase,
  version: Version,
  getTypeUrl: GetTypeUrl,
}>(null as any);

export const RustAnyType = React.memo(function RustType(props: {type: TypeTree}) {
  const {type} = props;

  switch (type.is) {
    case "int": return <RustInt type={type}/>;
    case "float": return <RustFloat type={type}/>;
    case "void": return <RustUnit type={type}/>;
    case "ptr": return <RustPointer type={type}/>;
    case "array": return <RustArray type={type}/>;
    case "fn-ptr": return <RustFnPointer type={type}/>;
    case "named": return <RustNamedType type={type}/>;
    case "struct": return <RustInlineStruct type={type}/>;
    case "union": return <RustInlineUnion type={type}/>;
    case "enum": return <RustInlineEnum type={type}/>;
    case "unsupported": return <RustUnsupportedType type={type}/>;
    default: unreachable(type)
  }
});

const TokenStruct = <span className="keyword">struct</span>;
const TokenUnion = <span className="keyword">union</span>;
const TokenEnum = <span className="keyword">enum</span>;
const TokenExtern = <span className="keyword">extern</span>;
const TokenMutPtr = <span className="keyword">*mut</span>;
const TokenFn = <span className="keyword">fn</span>;
const TokenNever = <span className="type primitive">!</span>;
const TokenVariadic = <>...</>;

function RustInt({type}: {type: TypeTree & {is: "int"}}) {
  const {size, signed, align} = type;
  if (size !== align) {
    console.warn("not yet handled: integer with size != align");
  }
  const prefix = signed ? 'i' : 'u';
  const suffix = 8 * size;
  return <PrimitiveType>{prefix}{suffix}</PrimitiveType>;
}

function RustFloat({type}: {type: TypeTree & {is: "float"}}) {
  const {size, precision, align} = type;

  if (precision === 80 && size === 12 && align === 4) {
    return <PrimitiveType>f80_x86</PrimitiveType>;
  }
  if (precision === 80 && size === 16 && align === 8) {
    return <PrimitiveType>f80_x64</PrimitiveType>;
  }

  if (size !== align) {
    console.warn("not yet handled: float with size != align");
  }
  if (precision !== 8 * size) {
    console.warn("not yet handled: float with precision != 8 * size");
  }
  return <PrimitiveType>f{precision}</PrimitiveType>;
}

function RustUnit({type}: {type: TypeTree & {is: "void"}}) {
  return <>()</>;
}

function RustPointer({type}: {type: TypeTree & {is: "ptr"}}) {
  const {inner} = type;
  return <>{TokenMutPtr} <RustAnyType type={inner}/></>;
}

function RustArray(props: {type: TypeTree & {is: "array"}}) {
  const {type: {len, inner: type}} = props;
  return <>[<RustAnyType type={type}/>; <IntLiteral value={len}/>]</>;
}

function RustFnPointer({type}: {type: TypeTree & {is: "fn-ptr"}}) {
  const {ret, abi, params, variadic, diverges} = type;

  const parts = (params || []).map((x, i) => <RustFnParam key={`param-${i}`} {...x}/>);
  if (variadic) {
    parts.push(<React.Fragment key="ellipsis">{TokenVariadic}</React.Fragment>);
  }
  const paramsChildren = [];

  // intersperse commas
  let first = true;
  for (let i=0; i < parts.length; i++) {
    if (!first) paramsChildren.push(<React.Fragment key={`comma-${i}`}>{", "}</React.Fragment>)
    first = false;
    paramsChildren.push(parts[i]);
  }

  return <>
    {abi ? <>{TokenExtern}{" "}<span className='string'>{abi}</span>{" "}</> : null}
    {TokenFn}{"("}<RustFnParams type={type}/>{")"}
    <RustFnReturn type={type}/>
  </>;
}

function RustFnReturn({type}: {type: TypeTree & {is: "fn-ptr"}}) {
  const {ret, diverges} = type;

  const arrow = <>{"->"}</>;
  if (diverges) {
    if (ret.is === 'void') {
      return <>{arrow} {TokenNever}</>;
    } else {
      console.warn("TODO: tooltip to tell true type and mention that it may affect ABI");
      return <>{arrow} {TokenNever}</>;
    }
  } else {
    if (ret.is === 'void') {
      return null;  // implicit unit return
    } else {
      return <>{arrow} <RustAnyType type={ret}/></>;
    }
  }
}

function RustFnParams({type}: {type: TypeTree & {is: "fn-ptr"}}) {
  const {params, variadic} = type;

  const parts = (params || []).map((x, i) => <RustFnParam key={`param-${i}`} {...x}/>);
  if (variadic) {
    parts.push(<React.Fragment key="ellipsis">{TokenVariadic}</React.Fragment>);
  }


  const out = intersperse(parts, (i) => <React.Fragment key={`comma-${i}`}>{", "}</React.Fragment>);
  return <>{out}</>
}

function RustFnParam({name, type}: {name?: string, type: TypeTree}) {
  return <>
    {name ? <>{name}: </> : null}
    <RustAnyType type={type}/>
  </>;
}

function RustNamedType({type}: {type: TypeTree & {is: "named"}}) {
  const {db, version, getTypeUrl} = React.useContext(TypeRenderContext);
  const {name} = type;
  return <NamedTypeLink {...{name, db, version, getTypeUrl}}/>;
}

function RustInlineStruct({type}: {type: TypeTree & {is: "struct"}}) {
  // we generally shouldn't be asked to render these directly because there's no textual
  // representation for the gaps
  return <>{TokenStruct}{" { ... }"}</>;
}

function RustInlineUnion({type}: {type: TypeTree & {is: "union"}}) {
  // we generally shouldn't be asked to render these directly, though I guess we could
  return <>{TokenUnion}{" { ... }"}</>;
}

function RustInlineEnum({type}: {type: TypeTree & {is: "enum"}}) {
  // we generally shouldn't be asked to render these directly, though I guess we could
  return <>{TokenEnum}{" { ... }"}</>;
}

function RustUnsupportedType({type}: {type: TypeTree & {is: "unsupported"}}) {
  const {size, align} = type;
  return <>
    <span className='type error'>UNKNOWN</span>
    {"<"}{"size"}{"="}<HexLiteral value={size}/>
    {", "}{"align"}{"="}<IntLiteral value={align}/>
    {">"}
  </>;
}

function PrimitiveType({children}: {children: React.ReactNode}) {
  return <span className="type primitive">{children}</span>;
}

function IntLiteral({value}: {value: number}) {
  return <span className='number'>{value}</span>;
}

function HexLiteral({value}: {value: number}) {
  return <span className='number'>0x{value.toString(16)}</span>;
}

function* intersperse<T>(iter: Iterable<T>, sep: (index: number) => T) {
  let i = 0;
  for (const item in iter) {
    if (i !== 0) yield sep(i);
    yield item;
    i++;
  }
}
