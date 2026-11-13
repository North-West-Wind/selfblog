import Comments from "../components/Comments";
import { hydrate } from "preact";
import NavBar from "../components/NavBar";

export default function PostPage(props: { title?: string, date?: string, summary?: string, html?: string }) {
	return <>
		<NavBar />
		<h2><time class="dt-publish" datetime={props.date}>{props.date}</time></h2>
		<h1 class="p-name">{props.title}</h1>
		{props.summary && <p class="p-summary">{props.summary}</p>}
		<article class="e-content" dangerouslySetInnerHTML={{ __html: props.html || "" }}></article>
		<Comments />
	</>;
}

if (globalThis.document) hydrate(<PostPage title={window.pageData?.title} date={window.pageData?.date} summary={window.pageData?.summary} html={decodeURIComponent(window.pageData?.html || "")} />, document.getElementById("app")!);