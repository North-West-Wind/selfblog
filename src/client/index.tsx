import { hydrate } from "preact";
import { Post } from "../util";
import { Base64 } from "js-base64";
import { ErrorBoundary, lazy, LocationProvider, Route, Router } from "preact-iso";
import Home from "./pages/home";

const PostPage = lazy(() => import("./pages/post"));
const New = lazy(() => import("./pages/new"));
const Delete = lazy(() => import("./pages/delete"));

const App = (props: { latest?: string, posts?: Post[] }) => {
	
	return <LocationProvider>
		<ErrorBoundary>
			<Router>
				<Route path="/" component={Home} latest={props.latest} posts={props.posts} />
				<Route path="/p/:year/:month/:day/:post" component={PostPage} />
				<Route path="/new" component={New} />
				<Route path="/delete/:year/:month/:day/:post" component={Delete} />
			</Router>
		</ErrorBoundary>
	</LocationProvider>
};

if (globalThis.document) {
	// read from body data
	const data = document.body.getAttribute("data");
	let json: { latest: string, posts: Post[] } | undefined;
	if (data)
		try {
			json = JSON.parse(Base64.decode(data));
		} catch (err) {
			console.error("Failed to parse body data");
			console.error(err);
		}
	hydrate(<App latest={json?.latest} posts={json?.posts} />, document.getElementById("app")!);
}

export default App;