import renderToString from "preact-render-to-string";
import NavApp from "./client/pages/NavApp";
import App from "./client/App";
import { Post } from "./util";
import { Base64 } from "js-base64";

function isSamePosts(a: Post[], b: Post[]) {
	return a.length == b.length && a.every((post, ii) => post.title == b[ii].title && post.url == b[ii].url);
}

const navBar = renderToString(<NavApp />);
let listCache = "", indexCache = "";
let cachedLatest = "";
let cachedIndexPosts: Post[] = [];

function validateIndexCache(latest: string, posts: Post[]) {
	return cachedLatest == latest && isSamePosts(cachedIndexPosts, posts);
}

export function renderIndexPage(html: string, latest: string, posts: Post[]) {
	if (indexCache && validateIndexCache(latest, posts)) return indexCache;
	cachedLatest = latest;
	cachedIndexPosts = posts;
	html = html.replace("{server-data}", Base64.encode(JSON.stringify({ latest, posts })));
	html = html.replace("<!--app-nav-->", navBar);
	html = html.replace("<!--app-html-->", renderToString(<App latest={latest} posts={posts} />));
	return indexCache = html;
}

export function invalidatePostCache() {
	indexCache = "";
	listCache = "";
}