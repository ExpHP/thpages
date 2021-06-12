
import * as React from 'react';
import type {ReactNode, ReactElement} from 'react';
import unified from 'unified';
import remarkParse from 'remark-parse';
import remarkToRehype from 'remark-rehype';
import remarkGfm from 'remark-gfm';
import rehypeReact from 'rehype-react';
import remarkHeadingId from 'remark-heading-id';
import remarkDirective from 'remark-directive';
import rehypeRaw from "rehype-raw";
import {visit as unistVisit} from "unist-util-visit";
import {select as hastSelect} from "hast-util-select";
import {h} from "hastscript";

import {InlineRef} from "./InlineRef";
import {Tip} from "./Tip";
import {validateGame, Game} from './tables/game';
import {GameShort, GameNum, GameTh, GameThLong} from './Game';
import {rehypeHighlight} from "./highlight";
import {SingleChild, getSingleChild, Title, Wip, Wip2} from "./XUtil";
import {HashLink} from "./UrlTools";
import {Err} from './Error';

function C({children, color}: {children: ReactNode, color: string}) {
  return <span style={{color}}>{children}</span>;
}

const makeGc = (Component: ((p: {game: Game}) => ReactElement)) => {
  return ({children}: {children: SingleChild<string>}) => {
    const gameStr = getSingleChild(children);
    const game = validateGame(gameStr);
    if (game) {
      return <Component game={game}/>;
    } else {
      return <Err>GAME_ERROR({gameStr})</Err>;
    }
  };
};

type RefProps = {tip?: string, url?: string};
function Ref({r, ...props}: {r: string} & RefProps) {
  const allProps = {tip: "1", url: "1", ...props};
  const tip = allProps.tip === "1";
  const url = allProps.url === "1";
  return <InlineRef {...{r, tip, url}}/>;
}

function More({children}: {children: ReactNode}) {
  const [visible, setVisible] = React.useState(false);
  const display = visible ? 'initial' : 'none';
  const text = visible ? 'Show less' : 'Show more';
  return <div>
    <a className='show-more clickable' onClick={() => setVisible(!visible)}>{text}</a>
    <div style={{display: display}}>{children}</div>
  </div>;
}

function MdTip({tip, children, deco}: {children: ReactNode, tip: string, deco?: string}) {
  const className = deco === "0" ? "tip-nodeco" : "tip-deco";
  return <Tip tip={<>{tip}</>}>
    {<span className={className}>{children}</span>}
  </Tip>;
}

function HeadlessTable({children}: {children: ReactNode}) {
  return <div className="headless-table">{children}</div>;
}

// used to de-emphasize so that I don't abuse :wip2[] for this
function Weak({children}: {children: ReactNode}) {
  return <span className="weak">{children}</span>;
}

function FootRef({children}: {children: string | [string]}) {
  const id = getSingleChild(children);
  return <sup className="footnote link"><HashLink hash={`#footnote-${id}`}>{id}</HashLink></sup>;
}

function FootDef({children}: {children: string | [string]}) {
  const id = getSingleChild(children);
  return <sup className="footnote def" id={`footnote-${id}`}>{id}</sup>;
}

// download link with icon
function Dl({href, children}: {href: string, children: string | [string]}) {
  return <a download className='download' href={href}>{children}</a>;
}

function rehypeExtractTipContents() {
  return transform;

  function transform(tree: any) {
    unistVisit(tree, (n: any) => n.tagName === 'exp-is-tip', ondirective);
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
      if (node.tagName === 'exp-tipshow') {
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

function remarkDirectivesToHtml() {
  return transform;

  function transform(tree: any) {
    unistVisit(tree, ['textDirective', 'leafDirective', 'containerDirective'], ondirective);
  }

  function ondirective(node: any) {
    const data = node.data || (node.data = {});
    const hast = h(node.name, node.attributes);

    // We will convert directives into hast nodes so that react-markdown can convert them with its `components`.
    //
    // To guarantee that there are no collisions with standard HTML element names, we'll conform
    // to the CustomElementRegistry's requirement of using at least one hyphen in our element name.
    data.hName = `exp-${hast.tagName}`;
    data.hProperties = hast.properties;
  }
}

function rehypeCodeRef() {
  return (tree: any) => {
    unistVisit(tree, (node: any) => node.tagName === 'code', modify);
  };

  function modify(node: any) {
    if (node.children.length > 1 || node.children[0].type !== 'text') {
      console.error(node);
      return <Err>CODE_ERR</Err>;
    }
    const originalText = node.children[0].value;

    const regexpBroad = /:ref\{[^}]+\}/g;
    const regexpGetRef = /:ref\{r=([^}\s]+)\}/;

    const pieces = []; // we will generate an array of alternating strings and <Ref>s
    let match;
    let textBegin = 0;
    while ((match = regexpBroad.exec(originalText)) !== null) {
      const detailedMatch = match[0].match(regexpGetRef);
      if (detailedMatch == null) {
        console.error("couldn't parse ref", match[0]);
        return node;
      }
      pieces.push({type: 'text', value: originalText.substring(textBegin, match.index)});
      pieces.push(h('exp-ref', {r: detailedMatch[1]}));
      textBegin = match.index + match[0].length;
    }
    pieces.push({type: 'text', value: originalText.substring(textBegin, originalText.length)});
    node.children = pieces;
  }
}

function rehypeTableFootnotes() {
  return (tree: any) => {
    unistVisit(tree, (node: any) => node.tagName === 'exp-table-footnotes', modify);
  };

  function modify(node: any) {
    // don't get tripped up by inter-element whitespace
    node.children = node.children.filter((n: any) => !(n.type === 'text' && n.value.replace(/\s/g, '').length === 0));

    if (node.children.length !== 2 || node.children[0].tagName !== 'table' || node.children[1].tagName !== 'p') {
      console.error(`bad table-footnotes children`, node.children);
      return node;
    }
    // Take the content from the <p> and put it in a <tfoot><td> with a colspan equal to the number of table columns.
    const table = node.children[0];
    const [footP] = node.children.splice(1);
    const firstRow = hastSelect('tr', table)!;
    function getColspan(object: any) {
      if (object.type === 'element' && ['th', 'td'].includes(object.tagName)) {
        return object.properties?.colspan != null ? object.properties.colspan : 1;
      }
      return 0;
    }
    const ncols = (firstRow.children as any).map(getColspan).reduce((a: number, b: number) => a + b, 0);

    table.children.push(h('tfoot', {}, h('tr', h('td', {colspan: ncols}, ...footP.children))));
  }
}

export function preprocessTrustedMarkdown(source: string): object {
  const processor = unified()
      .use(remarkParse)
      .use([remarkDirective, remarkHeadingId, remarkGfm]);

  const tree = processor().parse(source);
  return processor.runSync(tree);
}

export function TrustedMarkdown({mdast}: {mdast: object}): ReactElement;
export function TrustedMarkdown({children}: {children: string}): ReactElement;
export const TrustedMarkdown = React.memo(function TrustedMarkdown({mdast, children}: {mdast?: object, children?: string}) {
  if (children && mdast) throw new Error("cannot supply both mdast and children");
  if (!children && !mdast) throw new Error("must supply either mdast or children");
  if (children) {
    mdast = preprocessTrustedMarkdown(children);
  }

  const processor = unified()
      .use([remarkDirectivesToHtml])
      .use(remarkToRehype, {allowDangerousHtml: true})
      .use([rehypeRaw])
      .use([rehypeExtractTipContents, rehypeTableFootnotes, rehypeCodeRef, rehypeHighlight])
      .use(rehypeReact, {
        createElement: React.createElement,
        Fragment: React.Fragment,
        components: {
          'exp-c': C, 'exp-wip': Wip, 'exp-wip2': Wip2, 'exp-weak': Weak, 'exp-dl': Dl,
          'exp-game': makeGc(GameShort),
          'exp-game-th': makeGc(GameTh),
          'exp-game-num': makeGc(GameNum),
          'exp-game-thlong': makeGc(GameThLong),
          'exp-more': More, 'exp-title': Title,
          'exp-headless-table': HeadlessTable,
          'exp-ref': Ref, 'exp-tip': MdTip,
          'exp-foot-ref': FootRef, 'exp-foot-def': FootDef,
        },
      });

  const hast = processor.runSync(mdast as any);
  const reactContent = processor.stringify(hast); // compiles to React elements, despite the method name.
  return <>{reactContent}</>;
});
