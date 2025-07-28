import renderToString from "preact-render-to-string";
import NavApp from "./client/pages/NavApp";
import AllPostsComponent from "./client/components/AllPosts";
import App from "./client/App";
import { Post } from "./types";
import { Base64 } from "js-base64";

function isSamePosts(a: Post[], b: Post[]) {
	return a.length == b.length && a.every((post, ii) => post.title == b[ii].title && post.url == b[ii].url);
}

let navBarCache = "", listCache = "", indexCache = "";
let cachedListPosts: Post[] = [];
let cachedLatest = "";
let cachedIndexPosts: Post[] = [];

function renderNavBarToString() {
	navBarCache = renderToString(<NavApp />);
}

export function renderListPage(html: string, posts: Post[]) {
	if (!navBarCache) renderNavBarToString();
	if (listCache && isSamePosts(cachedListPosts, posts)) return listCache;
	cachedListPosts = posts;
	html = html.replace("{server-data}", Base64.encode(JSON.stringify(posts)));
	html = html.replace("<!--app-nav-->", navBarCache);
	html = html.replace("<!--app-html-->", renderToString(<AllPostsComponent posts={posts} />));
	return listCache = html;
}

function validateIndexCache(latest: string, posts: Post[]) {
	return cachedLatest == latest && isSamePosts(cachedIndexPosts, posts);
}

export function renderIndexPage(html: string, latest: string, posts: Post[]) {
	if (!navBarCache) renderNavBarToString();
	if (indexCache && validateIndexCache(latest, posts)) return indexCache;
	cachedLatest = latest;
	cachedIndexPosts = posts;
	html = html.replace("{server-data}", Base64.encode(JSON.stringify({ latest, posts })));
	html = html.replace("<!--app-nav-->", navBarCache);
	html = html.replace("<!--app-html-->", renderToString(<App latest={latest} posts={posts} />));
	return indexCache = html;
}

export function invalidatePostCache() {
	indexCache = "";
	listCache = "";
}