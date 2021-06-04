// Polyfills
import "core-js/stable";
import "regenerator-runtime/runtime";

import React from "react";
import ReactDOM from "react-dom";
import {App} from "./App.tsx";
import {settingsPreAppInit} from "./settings/index.ts";

settingsPreAppInit();

ReactDOM.render(React.createElement(App), document.getElementById("root"));
