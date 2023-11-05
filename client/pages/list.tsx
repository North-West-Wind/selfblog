import React from "react";
import { createRoot } from "react-dom/client";
import ListApp from "./ListApp";

createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <ListApp />
  </React.StrictMode>
);