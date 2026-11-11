import { hydrate } from "preact";
import { ErrorBoundary, lazy, LocationProvider, Route, Router } from "preact-iso";
import HomePage from "./pages/home";
import NavBar from "./pages/nav";
import { DataContext, ServerData } from "./data";

const PostPage = lazy(() => import("./pages/post"));
const NewPage = lazy(() => import("./pages/new"));
const DeletePage = lazy(() => import("./pages/delete"));
const NotFoundPage = lazy(() => import("./pages/not-found"));

const App = (props: { data?: ServerData }) => {
	
	return <>
		<NavBar />
		<DataContext value={props.data}>
			<LocationProvider>
				<ErrorBoundary>
					<Router>
						<Route path="/" component={HomePage} />
						<Route path="/p/:year/:month/:day/:post" component={PostPage} />
						<Route path="/new" component={NewPage} />
						<Route path="/delete/:year/:month/:day/:post" component={DeletePage} />
						<Route default component={NotFoundPage} />
					</Router>
				</ErrorBoundary>
			</LocationProvider>
		</DataContext>
	</>;
};

if (globalThis.document) {
	hydrate(<App data={window.pageData} />, document.getElementById("app")!);
}

export default App;