const {off} = require("process");

module.exports = {
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:react-hooks/recommended",
    "google",
  ],
  "env": {
    "es6": true,
  },
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": 2018,
  },
  "plugins": ["import"],
  "globals": {
    // do NOT do env: browser: true, we do not want trash like "name"
    "document": true,
    "window": true,
    "setTimeout": true,
  },
  "rules": {
    "require-jsdoc": "off",
    "max-len": "off",
    "padded-blocks": "off",
    "no-unused-vars": "warn",
    "quotes": "off", // bit harsh for an inherited codebase
    "quote-props": "off", // harmful to JSS
    "operator-linebreak": ["error", "before"],
    // allow `let a, b;` but not `let a = 2, b = 3;`
    "one-var": ["error", {"initialized": "never"}],
    "no-constant-condition": ["error", {'checkLoops': false}],
    "brace-style": ["error", "1tbs", {"allowSingleLine": true}],
    "block-spacing": ["error", "always"],
  },
  "ignorePatterns": ["js/lib/*"],

  "overrides": [
    {
      "files": ["**/*.ts", "**/*.tsx"],
      "parser": "@typescript-eslint/parser",
      "extends": [
        "plugin:@typescript-eslint/recommended",
      ],
      "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module",
      },
      "rules": {
        // google typescript
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-warning-comments": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/camelcase": "off",
        "node/no-missing-import": "off",
        "node/no-empty-function": "off",
        "node/no-unsupported-features/es-syntax": "off",
        "node/no-missing-require": "off",
        "node/shebang": "off",
        "no-dupe-class-members": "off",
        "require-atomic-updates": "off",

        // prefer 'unknown', but sometimes even that escape hatch isn't enough
        "@typescript-eslint/no-explicit-any": "off",

        // TS requires us to not put '.ts' when a ts file imports another ts file
        // (even though parcel can probably handle it just fine...), which confuses this lint
        "import/no-unresolved": "off",

        // since TS is already checking for types, no param/return docs should be required unless they are non-obvious.
        // Unfortunately, there's no option to allow omitting @params (you can only omit types and descriptions), so...
        "valid-jsdoc": "off",

        // https://github.com/microsoft/TypeScript/issues/14306#issuecomment-552890299
        //
        // Unfortunately libs: ["dom"] in tsconfig provides all of the window globals.
        // I believe the following rule summarizes my feelings on the matter.
        "no-restricted-globals": [
          "error", "postMessage", "blur", "focus", "close", "frames", "self", "parent", "opener", "top", "length",
          "closed", "location", "origin", "name", "locationbar", "menubar", "personalbar", "scrollbars", "statusbar",
          "toolbar", "status", "frameElement", "navigator", "customElements", "external", "screen", "innerWidth",
          "innerHeight", "scrollX", "pageXOffset", "scrollY", "pageYOffset", "screenX", "screenY", "outerWidth",
          "outerHeight", "devicePixelRatio", "clientInformation", "screenLeft", "screenTop", "defaultStatus",
          "defaultstatus", "styleMedia", "onanimationend", "onanimationiteration", "onanimationstart", "onsearch",
          "ontransitionend", "onwebkitanimationend", "onwebkitanimationiteration", "onwebkitanimationstart",
          "onwebkittransitionend", "isSecureContext", "onabort", "onblur", "oncancel", "oncanplay", "oncanplaythrough",
          "onchange", "onclick", "onclose", "oncontextmenu", "oncuechange", "ondblclick", "ondrag", "ondragend",
          "ondragenter", "ondragleave", "ondragover", "ondragstart", "ondrop", "ondurationchange", "onemptied",
          "onended", "onerror", "onfocus", "oninput", "oninvalid", "onkeydown", "onkeypress", "onkeyup", "onload",
          "onloadeddata", "onloadedmetadata", "onloadstart", "onmousedown", "onmouseenter", "onmouseleave",
          "onmousemove", "onmouseout", "onmouseover", "onmouseup", "onmousewheel", "onpause", "onplay", "onplaying",
          "onprogress", "onratechange", "onreset", "onresize", "onscroll", "onseeked", "onseeking", "onselect",
          "onstalled", "onsubmit", "onsuspend", "ontimeupdate", "ontoggle", "onvolumechange", "onwaiting", "onwheel",
          "onauxclick", "ongotpointercapture", "onlostpointercapture", "onpointerdown", "onpointermove", "onpointerup",
          "onpointercancel", "onpointerover", "onpointerout", "onpointerenter", "onpointerleave", "onafterprint",
          "onbeforeprint", "onbeforeunload", "onhashchange", "onlanguagechange", "onmessage", "onmessageerror",
          "onoffline", "ononline", "onpagehide", "onpageshow", "onpopstate", "onrejectionhandled", "onstorage",
          "onunhandledrejection", "onunload", "performance", "stop", "open", "print", "captureEvents", "releaseEvents",
          "getComputedStyle", "matchMedia", "moveTo", "moveBy", "resizeTo", "resizeBy", "getSelection", "find",
          "createImageBitmap", "scroll", "scrollTo", "scrollBy", "onappinstalled", "onbeforeinstallprompt", "crypto",
          "ondevicemotion", "ondeviceorientation", "ondeviceorientationabsolute", "indexedDB", "webkitStorageInfo",
          "chrome", "visualViewport", "speechSynthesis", "webkitRequestFileSystem", "webkitResolveLocalFileSystemURL",
          "openDatabase",
        ],
      },
    },
  ],
};
