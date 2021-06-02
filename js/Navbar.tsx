import React from 'react';
import type {ReactElement} from 'react';
import {useLocation} from 'react-router-dom';
import type {Location as RRLocation} from 'history';
import clsx from 'clsx';

export type EntryCommon = {
  url?: string,
  newTab?: true,
  children?: Entry[],
  cssClasses?: string[],
};
type StringLabeledEntry = EntryCommon & {label: string};
type FancyLabeledEntry = EntryCommon & {
  label: ReactElement;
  key: string;
};
export type Entry = StringLabeledEntry | FancyLabeledEntry;

// Definition of navbar items.
//
// We can't use <NavLink> because we want to style ancestors of the active link, so we have
// to store the list in a format that we can traverse on our own.
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
    label: <div className="gear"></div>,
    key: 'settings',
    url: "#/settings",
    cssClasses: ['settings'],
  },
];

function getEntryReactKey(entry: Entry): string {
  return (entry as any).key || entry.label;
}

export function Navbar() {
  const location = useLocation();
  const activeEntries = findActiveEntries(NAVBAR, location);
  return <div className="header-navigation">
    {NAVBAR.map((entry) => <NavbarEntry key={getEntryReactKey(entry)} entry={entry} inner={false} activeEntries={activeEntries} />)}
  </div>;
}

function NavbarEntry(props: {entry: Entry, inner: boolean, activeEntries: ActiveEntries | null}) {
  const {entry, inner, activeEntries} = props;

  return <MaybeLink href={entry.url} newTab={entry.newTab}>
    <div className={clsx(
        "navigation-entry",
        inner ? 'inner' : 'outermost',
        {'has-children': entry.children},
        {'active': activeEntries && activeEntries.active === entry},
        {'active-child': activeEntries && activeEntries.ancestors.includes(entry)},
    )}>
      <div className='navigation-entry-name'>{entry.label}</div>
      {entry.children
        ? <div className='navigation-entry-list'>
          {entry.children.map((child) => <NavbarEntry key={getEntryReactKey(child)} entry={child} inner={true} activeEntries={activeEntries}/>)}
        </div>
        : null
      }
    </div>
  </MaybeLink>;
}

/** Optionally wraps things in <a>. */
function MaybeLink({href, newTab, children, ...props}: {href?: string, newTab?: boolean, children: ReactElement}) {
  const target = newTab ? "_blank" : undefined;
  const rel = newTab ? "noopener noreferrer" : undefined; // for security
  return href
    ? <a href={href} target={target} rel={rel} {...props}>{children}</a>
    : children;
}

type ActiveEntries = {active: Entry, ancestors: Entry[]};
function findActiveEntries(entries: Entry[], currentLocation: RRLocation): ActiveEntries | null {
  for (const entry of entries) {
    // active child?
    const activeEntries = entry.children && findActiveEntries(entry.children, currentLocation);
    if (activeEntries) {
      activeEntries.ancestors.push(entry);
      return activeEntries;
    }

    const navurl = entry.url;
    if (!navurl) continue; // probably header of a group
    if (navurl[0] !== '#') continue; // external link
    if (navurl.substring(1) === currentLocation.pathname) {
      return {active: entry, ancestors: []}; // active page
    }
  }
  return null;
}
