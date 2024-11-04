import React from "react";
import { createRoot } from "react-dom/client";
import EditorComponent from "../components/Editor";

createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <EditorComponent />
  </React.StrictMode>
);