import React from "react";
import { createRoot } from "react-dom/client";
import EditApp from "./EditApp";

createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <EditApp />
  </React.StrictMode>
);