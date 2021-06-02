/* This file has parts based off of:
 *  - rehype-prism  (Copyright (c) 2017 Mapbox - MIT License)
 *  - refractor  (Copyright (c) 2017 Titus Wormer <tituswormer@gmail.com> - MIT License)
 */

import refractor from 'refractor/core.js';
import clike from 'refractor/lang/javascript.js';
import js from 'refractor/lang/javascript.js';
import json from 'refractor/lang/json.js';
import {visit as unistVisit} from 'unist-util-visit';

// Define a custom language for ANM that is similar to clike.
anm.displayName = 'anm';
anm.aliases = [] as string[];
function anm(Prism: any) {
  Prism.languages.anm = {
    'comment': [
      {
        pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
        lookbehind: true,
        greedy: true,
      },
      {
        pattern: /(^|[^\\:])\/\/.*/,
        lookbehind: true,
        greedy: true,
      },
    ],
    'string': {
      pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
      greedy: true,
    },
    'keyword': /\b(?:if|else|while|do|for|return|null|break|continue|script|meta|entry)\b/,
    'boolean': /\b(?:true|false)\b/,
    'function': /\w+(?=\()/,
    'label': /[a-zA-Z][a-zA-Z_]*(?=:)/,
    'number': /(?:\b0x(?:[\da-f]+(?:\.[\da-f]*)?|\.[\da-f]+)(?:p[+-]?\d+)?|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?)[ful]{0,4}/i,
    'operator': /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
    'punctuation': /[{}[\];(),.:]/,
  };
}

// achieve a slim bundle by limiting the number of languages
refractor.register(clike);
refractor.register(js);
refractor.register(json);
refractor.register(anm);

// modified form of rehype-prism that:
//  - uses our customized copy of refractor
//  - preserves non-text-node content inside the <code> (only text nodes are highlighted)
export function rehypeHighlight() {
  return (tree: any) => {
    unistVisit(tree, 'element', visitor);
  };

  function visitor(node: any) {
    if (node.tagName !== 'code') {
      return;
    }

    const lang = getLanguage(node);
    if (lang === null) {
      return;
    }

    node.children = (node.children || []).flatMap((child: any) => {
      return child.type === 'text'
        ? refractor.highlight(child.value, lang)
        : [child] // keep any html already existing inside the code
      ;
    });
  }
}

function getLanguage(node: any) {
  for (const classListItem of node.properties.className || []) {
    const prefix = 'language-';
    if (classListItem.slice(0, prefix.length) === prefix) {
      return classListItem.slice(prefix.length).toLowerCase();
    }
  }

  return null;
}
