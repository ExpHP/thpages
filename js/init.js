import React from "react";
import ReactDOM from "react-dom";
import {App, init} from "./main.tsx";

init();
ReactDOM.render(React.createElement(App), document.getElementById("root"));
