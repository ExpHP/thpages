// Polyfills
import "core-js/stable";
import "regenerator-runtime/runtime";

import React from "react";
import ReactDOM from "react-dom";
import {App} from "./App.tsx";

ReactDOM.render(React.createElement(App), document.getElementById("root"));
