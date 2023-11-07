import React from "react";
import { createRoot } from "react-dom/client";
import DeleteApp from "./DeleteApp";

createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <DeleteApp />
  </React.StrictMode>
);