// Polyfills
import "core-js/stable";
import "regenerator-runtime/runtime";

import {init} from "./main.js";

// Generally speaking, modules in this codebase try to avoid doing things on import
// that would require another module to have finished executing; this is so that we
// can freely use circular imports.
//
// Calling this function begins doing all of that stuff that requires everything to
// be fully imported.
init();
