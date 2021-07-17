@preprocessor esmodule

@{%
import moo from "moo";
import {createLexer} from "./c-lexer";

const lexer = createLexer();

function convertToken(tok) {
  const {line, col, value, text, type} = tok;
  const start = {
    line: line,
    col: col - 1,
  };

  if (text.lastIndexOf("\n") !== -1) {
    throw new Error("Unsupported case: token with line breaks");
  }
  const end = {
    line: line,
    col: col + text.length - 1,
  };
  return {type, value, start, end};
}

/// 'id' alternative that extracts at the given index instead of 0.
function at(i) {
  return (xs) => xs[i];
}

function convertTokenId(tok) {
  return convertToken(tok[0]);
}

function map(f) {
  return (xs) => ({...f(xs), start: xs[0]?.start, end: xs[xs.length - 1]?.end});
}

function map1(f) {
  return ([x]) => ({...f(x), start: x.start, end: x.end});
}

function label(label) {
  return ([x]) => ({...x, type: label});
}

// Prevents a rule from ever actually matching anything.
// Lets you stub out a nonterminal by writing
//
//     ruleName -> null  {% todo % }
//
function todo(_d, _l, reject) {
  return reject;
}

%}

@lexer lexer

main -> declaration {% id %}

Separated0[T, Sep]
  -> ($T $Sep {% at(0) %}):* T:?  {% map(([init, last]) => [...init, ...(last ? [last] : [])]) %}

Separated1[T, Sep]
  -> ($T $Sep {% at(0) %}):* T  {% map(([init, last]) => [...init, last]) %}

declaration
  -> declarationSpecifier:+ Separated0[initDeclarator, ","] ";"
  {% map(([specifiers, declarators]) => ({type: "declaration", specifiers, declarators})) %}

  -> staticAssertDeclaration
  {% map(([body]) => ({type: "static-assert", body})) %}

declarationSpecifiers -> declarationSpecifier:* {% id %}

declarationSpecifier
  -> storageClassSpecifier
  | typeSpecifier
  | typeQualifier
  | functionSpecifier
  | alignmentSpecifier

initDeclaratorList -> Separated1[initDeclarator, ","] {% id %}

initDeclarator
  -> declarator ("=" initializer {% at(1) %})
    {% map(([declarator, initializer]) => {declarator, initializer}) %}

storageClassSpecifier
  -> "typedef"      {% convertTokenId %}
  | "extern"        {% convertTokenId %}
  | "static"        {% convertTokenId %}
  | "_Thread_local" {% convertTokenId %}
  | "auto"          {% convertTokenId %}
  | "register"      {% convertTokenId %}

typeSpecifier
  -> keywordTypeSpecifier {% label("keyword") %}
  #| atomicTypeSpecifier
  #| structOrUnionSpecifier
  #| enumSpecifier
  #| typedefName

keywordTypeSpecifier
  -> "void" {% convertTokenId %}
  | "char"  {% convertTokenId %}
  | "short" {% convertTokenId %}
  | "int"   {% convertTokenId %}
  | "long"  {% convertTokenId %}
  | "float" {% convertTokenId %}
  | "double" {% convertTokenId %}
  | "signed" {% convertTokenId %}
  | "unsigned" {% convertTokenId %}
  | "_Bool"    {% convertTokenId %}
  | "_Complex" {% convertTokenId %}

structOrUnionSpecifier -> null  {% todo %}
structOrUnion
  -> "struct" {% convertTokenId %}
  | "union"   {% convertTokenId %}

structDeclarationList -> structDeclaration:* {% id %}
structDeclaration -> null  {% todo %}

specifierQualifierList -> specifierQualifier:+ {% id %}
specifierQualifier -> typeSpecifier {% id %} | typeQualifier {% label("qualifier") %}

structDeclaratorList -> null  {% todo %}
structDeclarator -> null      {% todo %}
enumSpecifier -> null         {% todo %}
enumeratorList -> null        {% todo %}
enumerator -> null            {% todo %}
atomicTypeSpecifier -> null   {% todo %}

typeQualifier
  -> "const" {% convertTokenId %}
  | "restrict" {% convertTokenId %}
  | "volatile" {% convertTokenId %}
  | "_Atomic" {% convertTokenId %}

functionSpecifier
  -> "inline" {% convertTokenId %}
  | "_Noreturn" {% convertTokenId %}

alignmentSpecifier
  -> "_Alignas" "(" typeName ")"          {% map(([,,t]) => ({type: "type", of: t})) %}
  |  "_Alignas" "(" constantExpression ")" {% map(([,,value]) => ({type: "expr", value})) %}

declarator
  -> pointer directDeclarator {% map(([pointer, target]) => ({type: "pointer", pointer, target})) %}
  | directDeclarator {% id %}

directDeclarator
  -> identifier {% label("ident") %}
  | "(" declarator ")" {% at(1) %}
  # FIXME: drastically simplified, the actual grammar inside the [ ] is an absolute hot mess
  | directDeclarator "[" constantExpression "]"
  {% map(([element,,length]) => ({type: "array", element, length})) %}

  | directDeclarator "(" parameterTypeList ")"
  {% map(([declarator,,params]) => ({type: "function", declarator, params})) %}

pointer -> "*" typeQualifier:* pointer:?
  {% map(([,qualifiers,pointer]) => ({qualifiers, pointer})) %}

parameterTypeList -> null {% todo %}
parameterList -> null {% todo %}
parameterDeclaration -> null {% todo %}
identifierList -> null {% todo %}

typeName -> specifierQualifier:+ abstractDeclarator:?
  {% map(([keywords, declarator]) => ({keywords, declarator})) %}



abstractDeclarator
  -> pointer
    {% map(([pointer]) => ({type: "pointer", pointer, target: null})) %}

  | pointer directAbstractDeclarator
    {% map(([pointer, target]) => ({type: "pointer", pointer, target})) %}

  | directAbstractDeclarator {% id %}


directAbstractDeclarator
  -> "(" abstractDeclarator ")"
    {% map(([,x,]) => x) %}

  # FIXME: contents of [] is drastically oversimplified
  | directAbstractDeclarator:? "[" constantExpression:? "]"
    {% map(([element,,length]) => ({type: "array", element, length})) %}

  | directAbstractDeclarator:? "(" parameterTypeList:? ")"
  {% map(([declarator,,params]) => ({type: "function", declarator, params})) %}



INTEGER -> %INTEGER {% convertTokenId %}

declarationSpecifier
  -> storageClassSpecifier {% label("keyword") %}
  | typeSpecifier {% id %}
  | typeQualifier {% id %}


constantExpression
  -> integer {% label("literal-int") %}
  # strings, floats

integer -> INTEGER {% map1((s) => {
  let x;
  if (s.startsWith("0x") || s.startsWith("0X")) {
    x = Number.parseInt(s.substr(2), 16);
  } else if (s.startsWith("0b") || s.startsWith("0B")) {
    x = Number.parseInt(s.substr(2), 2);
  } else if (s.startsWith("0")) {
    x = Number.parseInt(s, 8);
  } else {
    x = Number.parseInt(s, 10);
  }

  if (x !== x) {
    throw new Error("Bad integer literal");
  }
  return x;
}) %}

