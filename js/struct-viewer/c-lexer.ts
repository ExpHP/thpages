import moo, {Token as OriginalToken} from "moo";

export {Lexer} from "moo";

export type Token = Omit<OriginalToken, 'value'> & {value: unknown};

export function isPunct(tokenOrType: Token | string) {
  const type = (typeof tokenOrType === 'string' ? tokenOrType : tokenOrType.type);
  return type && type.startsWith('punct-');
}

export function isIgnorable(tokenOrType: Token | string) {
  const type = (typeof tokenOrType === 'string' ? tokenOrType : tokenOrType.type);
  return type === 'WS';
}

export function isKeyword(tokenOrType: Token | string) {
  const type = (typeof tokenOrType === 'string' ? tokenOrType : tokenOrType.type);
  return type && type.startsWith('kw-');
}

export function isPrimitiveType(tokenOrType: Token | string) {
  const type = (typeof tokenOrType === 'string' ? tokenOrType : tokenOrType.type);
  if (!(type?.startsWith('kw-'))) return false;

  const keyword = type.substring('kw-'.length);
  return PRIMITIVE_TYPE_KEYWORDS.includes(keyword);
}

const PUNCT = [
  // (FIXME: not even close to complete)
  '(', ')', ',', '[', ']', '{', '}', '*',
];
const FIXED_SIZE_INT_TYPES = [
  "int8_t", "int16_t", "int32_t", "int64_t",
  "uint8_t", "uint16_t", "uint32_t", "uint64_t",
];
const KEYWORDS = [
  // A.1.2 in http://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf
  "auto", "break", "case", "char", "const", "continue", "default", "do", "double",
  "else", "enum", "extern", "float", "for", "goto", "if", "inline", "int", "long",
  "register", "restrict", "return", "short", "signed", "sizeof", "static", "struct",
  "switch", "typedef", "union", "unsigned", "void", "volatile", "while",
  "_Alignas", "_Alignof", "_Atomic", "_Bool", "_Complex", "_Generic", "_Imaginary",
  "_Noreturn", "_Static_assert", "_Thread_local",
  // HACK: include a few extremely useful typedefs
  ...FIXED_SIZE_INT_TYPES,
];
const PRIMITIVE_TYPE_KEYWORDS = [
  'void', 'char', 'short', 'int', 'long', 'signed', 'unsigned',
  'float', 'double', '_Bool', '_Complex', '_Imaginary',
  ...FIXED_SIZE_INT_TYPES,
];


/** Create lexer that emits all tokens (including whitespace/comments). */
export const createRoundtripLexer = () => moo.compile({
  WS: { match: /[ \t\n\r]+/, lineBreaks: true },
  ...PUNCT.map(k => ['punct-' + k, k]),
  INTEGER: {
    // @ts-ignore  @types/moo doesn't account for changing type of value
    match: /[0-9][0-9a-zA-Z]*(?:\.[0-9a-zA-Z]*)?/,
    value: s => Number(s),
  },
  IDENT: {
    match: /[a-zA-Z_][a-zA-Z0-9_]*/,
    type: moo.keywords(Object.fromEntries(KEYWORDS.map(k => ['kw-' + k, k]))),
  },
});

/** Create lexer that doesn't emit whitespace or comments. */
export const createLexer = () => {
  const lexer = createRoundtripLexer();
  const oldLexerNext = lexer.next.bind(lexer);
  lexer.next = () => {
    let tok;
    while (tok = oldLexerNext()) {
      if (isIgnorable(tok)) continue;
      break;
    }
    return tok;
  };
  return lexer;
};
