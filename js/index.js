// Polyfills
import "core-js/stable";
import "regenerator-runtime/runtime";

import React from "react";
import ReactDOM from "react-dom";
import {App, redirectPreAppInit} from "./App.tsx";
import {settingsPreAppInit} from "./settings/index.ts";

settingsPreAppInit();
redirectPreAppInit();

ReactDOM.render(React.createElement(App), document.getElementById("root"));
