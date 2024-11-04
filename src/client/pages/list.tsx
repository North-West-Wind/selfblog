import React from "react";
import { createRoot } from "react-dom/client";
import AllPostsComponent from "../components/AllPosts";

createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <AllPostsComponent />
  </React.StrictMode>
);