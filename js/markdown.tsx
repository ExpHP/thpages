
import * as React from 'react';
import type {ReactNode} from 'react';
import ReactMarkdown from 'react-markdown';
import type {ReactMarkdownOptions} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkHeadingId from 'remark-heading-id';
import remarkDirective from 'remark-directive';
import type {Directive, TextDirective, LeafDirective, ContainerDirective} from 'remark-directive';
import rehypeRaw from "rehype-raw";
import {visit as unistVisit} from "unist-util-visit";
import {filter as unistFilter} from "unist-util-filter";
import {select as hastSelect} from "hast-util-select";
import {map as unistMap} from "unist-util-map";
import type {Node, Parent} from "unist-util-visit";
import {h} from "hastscript";

import {Err} from './common-components';
import {Converter, ShowdownExtension} from 'showdown';
import {setWindowTitle, highlightCode} from "./main";
import {getRefJsx} from "./ref";
import {WithTip} from "./tips";
import {gameData, validateGame, GameData, Game} from './game-names';
import {Query, urlWithProps} from './url-format';
import {GameSelector, TablePage, getHandlers} from './anm/tables';
import dedent from "./lib/dedent";
import { exitCode } from 'process';

// React libraries do not all agree on how to supply a single child.
type OneChild<T> = T | [T];
function getSingleChild<T>(s: OneChild<T>): T {
  if (Array.isArray(s)) {
    return s[0];
  }
  return s;
}

type MarkdownContextAttrs = {
  currentQuery: Query,
};
const MarkdownContext = React.createContext<MarkdownContextAttrs>({currentQuery: {s: '/index'}});

function Title({children}: {children: OneChild<string>}) {
  const title = getSingleChild(children);
  React.useEffect(() => {
    setWindowTitle(title);
  });
  return null;
}

function C({children, color}: {children: ReactNode, color: string}) {
  return <span style={{color}}>{children}</span>;
}

const makeGc = (children: OneChild<string>, func: (g: GameData) => string) => {
  const gameStr = getSingleChild(children);
  const game = validateGame(gameStr);
  if (game) {
    return <Gc game={game}>{func(gameData(game))}</Gc>;
  } else {
    return <Err>GAME_ERROR({gameStr})</Err>;
  }
};

function Gc({game, children}: {game: Game, children: ReactNode}) {
  return <span className={`gamecolor gamecolor-${game}`}>{children}</span>;
}
function GameShort({children}: {children: OneChild<string>}) { return makeGc(children, (g) => g.short); }
function GameTh({children}: {children: OneChild<string>}) { return makeGc(children, (g) => g.thname); }
function GameNum({children}: {children: OneChild<string>}) { return makeGc(children, (g) => g.thname.substring(2)); }
function GameThLong({children}: {children: OneChild<string>}) { return makeGc(children, (g) => g.long); }

type RefProps = {tip?: string, url?: string};
function Ref({r, ...props}: {r: string} & RefProps) {
  const {currentQuery} = React.useContext(MarkdownContext);
  const allProps = {tip: "1", url: "1", ...props};
  const tip = allProps.tip === "1";
  const url = allProps.url === "1";
  return getRefJsx({ref: r, tip, url, currentQuery});
}

function More({children}: {children: ReactNode}) {
  const [visible, setVisible] = React.useState(false);
  const display = visible ? 'initial' : 'none';
  const text = visible ? 'Show less' : 'Show more';
  return <div>
    <a className='show-more' onClick={() => setVisible(!visible)}>{text}</a>
    <div style={{display: display}}>{children}</div>
  </div>;
}

function Tip({tip, children, deco}: {children: ReactNode, tip: string, deco?: string}) {
  const className = deco === "0" ? "tip-nodeco" : "tip-deco";
  return <WithTip tip={<>{tip}</>}>
    {<span className={className}>{children}</span>}
  </WithTip>;
}

function HeadlessTable({children}: {children: ReactNode}) {
  return <Err>FIXME_HEADLESS_TABLE</Err>;
  // return <div className="headless-table"><Markdown>{children}</Markdown></div>;
}

function Wip({children}: {children: ReactNode}) {
  return <span data-wip="1">{children}</span>;
}
function Wip2({children}: {children: ReactNode}) {
  return <span data-wip="2">{children}</span>;
}

// used to de-emphasize so that I don't abuse :wip2[] for this
function Weak({children}: {children: ReactNode}) {
  return <span className="weak">{children}</span>;
}

function FootRef({children}: {children: string | [string]}) {
  const {currentQuery} = React.useContext(MarkdownContext);
  const id = getSingleChild(children);
  const target = urlWithProps(currentQuery, {a: `footnote-${id}`});
  return <sup className="footnote link"><a href={target}>{id}</a></sup>;
}

function FootDef({children}: {children: string | [string]}) {
  const id = getSingleChild(children);
  return <sup className="footnote def" id={`footnote-${id}`}>{id}</sup>;
}

// download link with icon
function Dl({href, children}: {href: string, children: string | [string]}) {
  return <a download className='download' href={href}>{children}</a>;
}

function ReferenceTable({children}: {children: OneChild<string>}) {
  const {currentQuery} = React.useContext(MarkdownContext);
  const id = getSingleChild(children);
  const handlers = getHandlers(id);
  return <React.Fragment>
    <p>
      {"Select game version: "}
      <GameSelector handlers={handlers} currentQuery={currentQuery}></GameSelector>
    </p>

    <TablePage handlers={handlers} currentQuery={currentQuery}></TablePage>
  </React.Fragment>;
}

function remarkExtractTipContents() {
  return transform;

  function transform(tree: any) {
    unistVisit(tree, (n: any) => n.type === 'containerDirective' && n.name === 'is-tip', ondirective);
  }

  function ondirective(node: any) {
    const filteredChildren = node.children.flatMap(filterFunc);
    if (filteredChildren.length > 0) {
      // there was at least one :tipshow[]; use the filtered content
      node.children = filteredChildren;
    } else {
      // there was no :tipshow[]; keep the full content
    }
  }

  // Keep anything that is inside a :tipshow[], and any ancestor of such an element.
  function filterFunc(node: any) {
    if (node.children) {
      if (node.name === 'tipshow') {
        return node.children;
      } else {
        const filtered = {...node};
        filtered.children = filtered.children.flatMap(filterFunc);
        return filtered.children.length === 0 ? [] : [filtered];
      }
    } else {
      return [];
    }
  }
}

// We will convert directives into hast nodes so that react-markdown can convert them with its `components`.
//
// To guarantee that there are no collisions with standard HTML element names, we'll conform
// to the CustomElementRegistry's requirement of using at least one hyphen in our element name.
const DIRECTIVE_ELEMENT_PREFIX = 'exp-';
function directivesToHtml() {
  return transform;

  function transform(tree: any) {
    unistVisit(tree, ['textDirective', 'leafDirective', 'containerDirective'], ondirective);
  }

  function ondirective(node: any) {
    const data = node.data || (node.data = {});
    const hast = h(node.name, node.attributes);

    data.hName = `${DIRECTIVE_ELEMENT_PREFIX}${hast.tagName}`;
    data.hProperties = hast.properties;
  }
}

// Ugly HACK to make :ref{} work inside inline-code and code fences.
//
// Currently this is implemented as a component that does substring searches on <code>.
function Code({children}: {children: OneChild<string>}) {
  const {currentQuery} = React.useContext(MarkdownContext);
  const s = getSingleChild(children);
  if (typeof s !== 'string') {
    console.error(s);
    return <Err>CODE_ERR</Err>;
  }

  const regexp = /:ref\{[^}]+\}/g;
  const pieces = []; // we will generate an array of alternating strings and <Ref>s
  let match;
  let textBegin = 0;
  while ((match = regexp.exec(s)) !== null) {
    pieces.push(s.substring(textBegin, match.index));
    // Parse the text for a single :ref{} directive into a <Ref>
    pieces.push(<TrustedMarkdown
      key={textBegin} currentQuery={currentQuery}
      // there's no way to tell the markdown parser to assume it's parsing PhrasingContent, so it will wrap
      // the output <Ref> in a <p>, which we can destroy by setting these options.
      disallowedElements={['p']} unwrapDisallowed={true}
    >
      {match[0]}
    </TrustedMarkdown>);

    textBegin = match.index + match[0].length;
  }
  pieces.push(s.substring(textBegin, s.length));
  return <code>{pieces}</code>;
}

function rehypeTableFootnotes() {
  return (tree: any) => unistMap(tree, (node: any) => {
    return (node.tagName === 'exp-table-footnotes') ? modify(node) : node;
  });

  function modify(node: any) {
    if (node.children.length !== 2 || node.children[0].tagName !== 'table' || node.children[1].tagName !== 'p') {
      console.error(`bad table-footnotes children`, node.children);
      return node;
    }
    // Take the content from the <p> and put it in a <tfoot><td> with a colspan equal to the number of table columns.
    const [table, footP] = node.children;
    const firstRow = hastSelect('tr', table)!;
    const ncols = (firstRow.children as any).map((node: any) => node.properties?.colspan != null ? node.properties.colspan : 1).reduce((a: number, b: number) => a + b, 0);

    table.children.push(h('tfoot', {}, h('td', {colspan: ncols}, ...footP.children)));
    return table;
  }
}

const MARKDOWN_PROPS = {
  remarkPlugins: [remarkDirective, remarkExtractTipContents, directivesToHtml, remarkHeadingId, remarkGfm],
  rehypePlugins: [rehypeTableFootnotes, rehypeRaw],
  skipHtml: false,
  components: {
    // custom components
    'exp-c': C, 'exp-gc': Gc, 'exp-wip': Wip, 'exp-wip2': Wip2, 'exp-weak': Weak, 'exp-dl': Dl,
    'exp-game': GameShort, 'exp-game-th': GameTh, 'exp-game-num': GameNum, 'exp-game-thlong': GameThLong,
    'exp-more': More, 'exp-title': Title,
    'exp-headless-table': HeadlessTable,
    'exp-ref': Ref, 'exp-tip': Tip,
    'exp-foot-ref': FootRef, 'exp-foot-def': FootDef,
    'exp-reference-table': ReferenceTable,
    // standard HTML elements with modified behavior
    'code': Code,
  },
};

export function TrustedMarkdown({children, currentQuery, ...props}: {children: string, currentQuery: Query} & ReactMarkdownOptions) {
  return <MarkdownContext.Provider value={{currentQuery}}>
    <ReactMarkdown {...Object.assign({}, MARKDOWN_PROPS, props)}>{children}</ReactMarkdown>
  </MarkdownContext.Provider>;
}
