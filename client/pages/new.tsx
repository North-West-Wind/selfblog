import React from "react";
import { createRoot } from 'react-dom/client';
import NewApp from "./NewApp";

createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <NewApp />
  </React.StrictMode>
);