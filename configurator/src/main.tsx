import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowRotateLeft,
  faCircleMinus,
  faCirclePlus,
  faClock,
  faDharmachakra,
  faDownload,
  faMinus,
  faPause,
  faPlay,
  faPlus,
  faScissors,
  faStop,
  faTape,
} from "@fortawesome/free-solid-svg-icons";

library.add(
  faArrowRotateLeft,
  faCircleMinus,
  faCirclePlus,
  faClock,
  faDharmachakra,
  faDownload,
  faMinus,
  faPause,
  faPlay,
  faPlus,
  faScissors,
  faStop,
  faTape,
);

import { NextUIProvider } from "@nextui-org/react";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NextUIProvider>
      <App />
    </NextUIProvider>
  </React.StrictMode>,
);
