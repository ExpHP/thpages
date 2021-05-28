import * as React from 'react';
import {parseQuery, queryPageEquals, Query} from "./url-format";

export type Entry = {
  label: string,
  url?: string,
  newTab?: true,
  children?: Entry[],
  cssClasses?: string[],
};

export const NAVBAR: Entry[] = [
  {
    label: "Home",
    url: "#/",
  },

  {
    label: "Reference",
    children: [
      {
        label: "General documentation",
        children: [
          {url: "#/anm/concepts", label: "Concepts"},
          {url: "#/anm/interpolation", label: "Interpolation modes (easing)"},
          {url: "#/anm/stages-of-rendering", label: "Stages of rendering"},
          {url: "#/anm/ontick-ondraw", label: "on_tick and on_draw"},
        ],
      },
      {url: "#/anm/ins", label: "ANM instructions"},
      {url: "#/anm/var", label: "ANM variables"},
      {url: "#/std/ins", label: "STD instructions"},
      {url: "#/msg/ins", label: "MSG instructions"},
      {
        label: "Tools",
        children: [
          {url: "#/anm/stats", label: "Stats!"},
          {url: "#/anm/layer-viewer", label: "Layer viewer"},
        ],
      },
    ],
  },

  {
    label: "My mods",
    children: [
      {url: "#/mods/bullet-cap", label: "Bullet (un-)cap"},
      {url: "#/mods/debug-counters", label: "Debug counters"},
      {url: "#/mods/seasonize", label: "seasonize (17)"},
      {url: "#/mods/za-warudo", label: "za warudo (11-17)"},
    ],
  },

  {
    label: "Links",
    children: [
      {
        label: "My dumb blog",
        url: "https://exphp.github.io/",
        newTab: true,
      },
      {
        label: "My Github",
        url: "https://github.com/ExpHP",
        newTab: true,
      },
      {
        label: "Priw8's site",
        url: "https://priw8.github.io/",
        newTab: true,
      },
      {
        label: "Maribel's site",
        url: "https://maribelhearn.com/",
        newTab: true,
      },
      {
        label: "Field offsets and function names",
        url: "https://github.com/exphp-share/th-re-data",
        newTab: true,
      },
      {
        label: "Website source",
        url: "https://github.com/ExpHP/thpages",
        newTab: true,
      },
    ],
  },

  {
    label: `<div class="gear"></div>`,
    url: "#/settings",
    cssClasses: ['settings'],
  },
];

export function Navbar({currentQuery}: {currentQuery: Query}) {
  const activeEntries = findActiveEntries(NAVBAR, currentQuery);
  return <div className="header-navigation">
    {NAVBAR.map((entry) => <NavbarEntry key={entry.label} entry={entry} inner={false} activeEntries={activeEntries} />)}
  </div>;
}

function NavbarEntry(props: {entry: Entry, inner: boolean, activeEntries: ActiveEntries | null}) {
  const {entry, inner, activeEntries} = props;

  const otherClasses = [
    inner ? 'inner' : 'outermost',
    ...(entry.cssClasses || []),
  ];
  if (entry.children) otherClasses.push('has-children');
  if (activeEntries) {
    if (activeEntries.active === entry) otherClasses.push('active');
    if (activeEntries.ancestors.includes(entry)) otherClasses.push('active-child');
  }

  let innerList = null;
  if (entry.children) {
    innerList = <div className='navigation-entry-list'>
      {entry.children.map((child) => <NavbarEntry key={child.label} entry={child} inner={true} activeEntries={activeEntries}/>)}
    </div>;
  }

  let jsx = <div className={`navigation-entry ${otherClasses.join(" ")}`}>
    <div className='navigation-entry-name'>{entry.label}</div>
    {innerList}
  </div>;

  // optionally wrap in link
  if (entry.url) {
    const target = entry.newTab ? "_blank" : undefined;
    const rel = entry.newTab ? "noopener noreferrer" : undefined;
    jsx = <a href={entry.url} target={target} rel={rel}>{jsx}</a>;
  }
  return jsx;
}

type ActiveEntries = {active: Entry, ancestors: Entry[]};
function findActiveEntries(entries: Entry[], currentQuery: Query): ActiveEntries | null {
  for (const entry of entries) {
    const navurl = entry.url;
    if (!navurl) continue; // probably header of a group
    if (navurl[0] !== '#') continue; // external link
    if (queryPageEquals(parseQuery(navurl), currentQuery)) {
      return {active: entry, ancestors: []}; // active page
    }
    const activeEntries = entry.children && findActiveEntries(entry.children, currentQuery);
    if (activeEntries) {
      activeEntries.ancestors.push(entry);
      return activeEntries;
    }
  }
  return null;
}
