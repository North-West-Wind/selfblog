import { hydrate } from "preact";
import NavBar from "../components/NavBar";

export default function NotFoundPage() {
  return <>
    <NavBar />
		<h1 style={{ textAlign: "center" }}>404</h1>
		<h2 style={{ textAlign: "center" }}>The post you're looking for is not here :(</h2>
  </>
}

if (globalThis.document) hydrate(<NotFoundPage />, document.getElementById("app")!);