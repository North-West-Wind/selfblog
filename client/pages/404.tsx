import React from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
		<h1 style={{ textAlign: "center" }}>404</h1>
		<h2 style={{ textAlign: "center" }}>The post you're looking for is not here :(</h2>
  </React.StrictMode>
);