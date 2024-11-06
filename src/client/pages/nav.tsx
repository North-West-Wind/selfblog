import NavApp from "./NavApp";
import { hydrate } from "preact";

const observer = new MutationObserver((list) => {
  if (list.some(mutation => mutation.type === "attributes" && mutation.attributeName === "formatia")) {
    hydrate(<NavApp />, document.getElementById("nav")!);
    observer.disconnect();
  }
});

observer.observe(document.body, { attributes: true });

hydrate(<NavApp />, document.getElementById("nav")!);