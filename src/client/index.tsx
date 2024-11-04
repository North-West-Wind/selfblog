import App from "./App";
import { hydrate } from "preact";

hydrate(<App />, document.getElementById("app")!);