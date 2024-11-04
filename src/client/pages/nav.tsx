import React from "react";
import { createRoot } from "react-dom/client";
import NavApp from "./NavApp";

createRoot(document.getElementById("nav")!).render(
  <React.StrictMode>
    <NavApp />
  </React.StrictMode>
);