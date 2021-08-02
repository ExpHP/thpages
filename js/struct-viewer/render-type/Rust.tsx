import React from 'react';
import clsx from 'clsx';

import {TypeTree} from '../database';
import {unreachable} from '~/js/util';
import {DisplayTypeRowData} from '../display-type';
import {CommonLangToolsProvider, NamedTypeLink, CommonLangToolsProps, classes, ElidedArray} from './Common';

export const TypeRow = React.memo(function TypeRow({row, ...props}: {row: DisplayTypeRowData} & CommonLangToolsProps) {
  return <CommonLangToolsProvider {...props}>
    <RustTypeRow row={row}/>
  </CommonLangToolsProvider>;
});
export const InlineType = React.memo(function InlineType({type, ...props}: {type: TypeTree} & CommonLangToolsProps) {
  return <CommonLangToolsProvider {...props}>
    <RustInlineType type={type}/>
  </CommonLangToolsProvider>;
});

// =============================================================================

function RustTypeRow({row}: {row: DisplayTypeRowData}) {
  switch (row.is) {
    case "field": return <RustField row={row}/>;
    case "gap": return <RustRowGap row={row}/>;
    case "enum-value": return <RustEnumValue row={row}/>;
    case "begin-page-type": return <RustPageTypeHeader row={row}/>;
    case "begin-inner-type": return <RustInnerTypeHeader row={row}/>;
    case "end-type": return <RustRowTypeEnd row={row}/>;
    case "expanded-array-ellipsis": return <ElidedArray row={row}/>;
  }
}

const TYPE_KIND_DATA = {
  struct: {keyword: "struct"},
  enum: {keyword: "enum"},
  union: {keyword: "union"},
  typedef: {keyword: "type"},
  bitfields: {keyword: "struct"},
};

function RustPageTypeHeader({row}: {row: DisplayTypeRowData & {is: 'begin-page-type'}}) {
  if (row.type.is === 'typedef') {
    // @ts-ignore  it's not applying the intersection to row.type...
    return <RustPageTypeAlias row={row}/>;
  // } else if (row.type.is === 'bitfields') {
  //   return <RustPageBitfieldsHeader row={row}/>;
  }
  const {typeName, type} = row;
  const {keyword} = TYPE_KIND_DATA[type.is];

  const packed = type.is === 'struct' && type.packed;
  return <>
    <p>#[repr(C{packed ? ", packed" : ""})]</p>
    <p>
      <span className={classes.keyword}>{keyword}</span>
      {' '}
      <span className={classes.currentTypeName}>{typeName}</span>
      {' {'}
    </p>
  </>;
}

// function RustPageBitfieldsHeader({row}: {row: DisplayTypeRowData & {is: 'begin-page-type'}}) {
//   return <>
//     <p>#[repr(align = "{row.type.align}")]</p>
//     <p>#[bitfields]</p>
//     <p>
//       <span className={classes.keyword}>struct</span>
//       {' '}
//       <span className={classes.currentTypeName}>{row.typeName}</span>
//       {' {'}
//     </p>
//   </>;
// }

function RustPageTypeAlias({row: {typeName, type}}: {row: DisplayTypeRowData & {is: 'begin-page-type', type: {is: 'typedef'}}}) {
  return <>
    <span className={classes.keyword}>type</span>
    {' '}
    <span className={classes.currentTypeName}>{typeName}</span>
    {' = '}
    <RustInlineType type={type.type}/>
    {';'}
  </>;
}

function RustInnerTypeHeader({row: {fieldName, typeName, kind}}: {row: DisplayTypeRowData & {is: 'begin-inner-type'}}) {
  const {keyword} = TYPE_KIND_DATA[kind];
  return <>
    <span className={classes.fieldName}>{fieldName}</span>
    {' : '}
    <span className={classes.keyword}>{keyword}</span>
    {typeName && <>{' '}<NamedTypeLink name={typeName}/></>}
    {' {'}
  </>;
}

function RustField({row: {name, type}}: {row: DisplayTypeRowData & {is: 'field'}}) {
  return <>
    <span className={classes.fieldName}>{name}</span>
    {' : '}
    {<RustInlineType type={type}/>}
    {';'}
  </>;
}

function RustRowGap({row: {size}}: {row: DisplayTypeRowData & {is: 'gap'}}) {
  return <span className={clsx([classes.comment, classes.gap])}>
    {'// '}
    0x{size.toString(16)}
    {' bytes...'}
  </span>;
}

function RustEnumValue({row: {name, value}}: {row: DisplayTypeRowData & {is: 'enum-value'}}) {
  return <>
    <span className={classes.enumValueName}>{name}</span>
    {' = '}
    {<IntLiteral value={value}/>}
    {',  '}
    <span className={classes.comment}>// 0x{value.toString(16)}</span>
  </>;
}

function RustRowTypeEnd({row}: {row: DisplayTypeRowData & {is: 'end-type'}}) {
  if (row._beginning.data.is === 'begin-page-type' && row._beginning.data.type.is === 'typedef') {
    return null;
  }
  const semi = row._beginning.data.is !== 'begin-page-type';
  return <>{"}"}{semi ? ';' : null}</>;
}

// =============================================================================

function RustInlineType({type}: {type: TypeTree}) {
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
}

const TokenStruct = <span className={classes.keyword}>struct</span>;
const TokenUnion = <span className={classes.keyword}>union</span>;
const TokenEnum = <span className={classes.keyword}>enum</span>;
const TokenExtern = <span className={classes.keyword}>extern</span>;
const TokenMutPtr = <span className={classes.keyword}>*mut</span>;
const TokenFn = <span className={classes.keyword}>fn</span>;
const TokenNever = <span className={classes.primitiveType}>!</span>;
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
  return <>{TokenMutPtr} <RustInlineType type={inner}/></>;
}

function RustArray(props: {type: TypeTree & {is: "array"}}) {
  const {type: {len, inner: type}} = props;
  return <>[<RustInlineType type={type}/>; <IntLiteral value={len}/>]</>;
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
    {abi ? <>{TokenExtern}{" "}<span className={classes.string}>{abi}</span>{" "}</> : null}
    {TokenFn}{"("}<RustFnParams type={type}/>{")"}
    <RustFnReturn type={type}/>
  </>;
}

function RustFnReturn({type}: {type: TypeTree & {is: "fn-ptr"}}) {
  const {ret, diverges} = type;

  const arrow = <>{"->"}</>;
  if (diverges) {
    if (ret.is === 'void') {
      return <> {arrow} {TokenNever}</>;
    } else {
      console.warn("TODO: tooltip to tell true type and mention that it may affect ABI");
      return <> {arrow} {TokenNever}</>;
    }
  } else {
    if (ret.is === 'void') {
      return null;  // implicit unit return
    } else {
      return <> {arrow} <RustInlineType type={ret}/></>;
    }
  }
}

function RustFnParams({type}: {type: TypeTree & {is: "fn-ptr"}}) {
  const {params, variadic} = type;

  const parts = (params || []).map((x, i) => <RustFnParam key={`param-${i}`} {...x}/>);
  if (variadic) {
    parts.push(<React.Fragment key="ellipsis">{TokenVariadic}</React.Fragment>);
  }


  const out = [...intersperse(parts, (i) => <React.Fragment key={`comma-${i}`}>{", "}</React.Fragment>)];
  return <>{out}</>
}

function RustFnParam({name, type}: {name?: string, type: TypeTree}) {
  console.log(name, type);
  return <>
    {name ? <>{name}: </> : null}
    <RustInlineType type={type}/>
  </>;
}

function RustNamedType({type}: {type: TypeTree & {is: "named"}}) {
  const {name} = type;
  return <NamedTypeLink {...{name}}/>;
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
    <span className={classes.unsupported}>UNKNOWN</span>
    {"<"}{"size"}{"="}<HexLiteral value={size}/>
    {", "}{"align"}{"="}<IntLiteral value={align}/>
    {">"}
  </>;
}

function PrimitiveType({children}: {children: React.ReactNode}) {
  return <span className={classes.primitiveType}>{children}</span>;
}

function IntLiteral({value}: {value: number}) {
  return <span className={classes.integer}>{value}</span>;
}

function HexLiteral({value}: {value: number}) {
  return <span className={classes.integer}>0x{value.toString(16)}</span>;
}

function* intersperse<T>(iter: Iterable<T>, sep: (index: number) => T) {
  let i = 0;
  for (const item of iter) {
    if (i !== 0) yield sep(i);
    yield item;
    i++;
  }
}
