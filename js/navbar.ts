import {parseQuery, queryPageEquals} from "./url-format";

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

export function buildNavbar($root: HTMLElement) {
  let html = '';
  for (const entry of NAVBAR) {
    html += generateNavbarEntryHtml(entry, {inner: false});
  }
  $root.innerHTML = html;
}

function generateNavbarEntryHtml(entry: Entry, {inner}: {inner: boolean}) {
  // two key pieces: a name and an inner list
  let html = `<div class='navigation-entry-name'>${entry.label}</div>`;
  if (entry.children) {
    html += `<div class='navigation-entry-list'>`;
    for (const child of entry.children) {
      html += generateNavbarEntryHtml(child, {inner: true});
    }
    html += `</div>`;
  }

  // outer div to hold them
  const otherClasses = [
    inner ? 'inner' : 'outermost',
    ...(entry.cssClasses || []),
  ];
  if (entry.children) otherClasses.push('has-children');

  // data-navurl is only for highlighting the entry for the current page
  const divUrl = entry.url ? `data-navurl="${entry.url}"` : '';
  html = `<div class='navigation-entry ${otherClasses.join(" ")}' ${divUrl}>${html}</div>`;

  // optionally wrap in link
  if (entry.url) {
    let attr = `href="${entry.url}"`;
    attr += (entry.newTab) ? ' target="_blank"' : '';
    html = `<a ${attr}>${html}</a>`;
  }
  return html;
}

export function highlightCurrentPageInNavbar() {
  for (const $old of document.querySelectorAll('.navigation-entry')) {
    $old.classList.remove('active');
    $old.classList.remove('active-child');
  }

  const currentQuery = parseQuery(window.location.hash);
  for (const $elem of document.querySelectorAll<HTMLElement>('.navigation-entry')) {
    let navurl;
    if (!(navurl = $elem.dataset.navurl)) continue;
    if (navurl[0] !== '#') continue; // external link
    if (queryPageEquals(parseQuery(navurl), currentQuery)) {
      $elem.classList.add('active');

      let $parent: HTMLElement | null = $elem;
      while ($parent = $parent.parentElement) {
        if ($parent.classList.contains('navigation-entry')) {
          $parent.classList.add('active-child');
        }
      }
      break;
    }
  }
}
