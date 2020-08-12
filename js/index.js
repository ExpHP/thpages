export const INDEX = [
  {
    "groupName": "Home",
    "name": "ExpHP's Touhou pages",
    "single": true,
    "path": "/",
    "type": "site",
    "url": "index",
  },

  // // soon
  // {
  //   "noItem": true,
  //   "path": "ecl/",
  //   "type": "redirect",
  //   "url": "modding/",
  // },
  {
    "groupName": "ANM",
    "path": "anm/",
    "content": [
      {
        "name": "Instruction reference",
        "type": "site",
        "url": "ins",
      },
      {
        "name": "Concepts",
        "type": "site",
        "url": "concepts",
      },
      {
        "name": "Stages of rendering",
        "type": "site",
        "url": "stages-of-rendering",
      },
      {
        "name": "on_tick and on_draw",
        "type": "site",
        "url": "ontick-ondraw",
      },
    ],

    // // subgroup example
    // "content": [
    //   {
    //     "name": "ANM",
    //     "type": "subgroup",
    //     "children": [
    //       {
    //         "name": "Concepts",
    //         "type": "site",
    //         "url": "anm-concepts",
    //       },
    //     ],
    //   },
    // ],
  },
  {
    "groupName": "Links",
    "path": null,
    "content": [
      {
        "name": "My dumb blog",
        "type": "href",
        "newTab": true,
        "url": "https://exphp.github.io/",
      },
      {
        "name": "My Github",
        "type": "href",
        "newTab": true,
        "url": "https://github.com/ExpHP",
      },
      {
        "name": "Priw8's site",
        "type": "href",
        "newTab": true,
        "url": "https://priw8.github.io/",
      },
      {
        "name": "Maribel's site",
        "type": "href",
        "newTab": true,
        "url": "https://maribelhearn.com/",
      },
    ],
  },
];

export const DEFAULT = "default";

export const ERROR = `
# An error has occured when loading the page.
Try reloading using **CTRL+F5**, or **clearing browser cache** of this site.
If the problem persists, contact me on Discord: **ExpHP#4754**.
`;

export const EMBED_LOAD_ERROR = `
Failed to load embedded content.
HTTP status code: %code%
`;
