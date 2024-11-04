import renderToString from "preact-render-to-string";
import NavApp from "./client/pages/NavApp";
import React from "preact/compat";
import AllPostsComponent from "./client/components/AllPosts";
import App from "./client/App";

type Post = {
	title: string,
	url: string
}

function isSamePosts(a: Post[], b: Post[]) {
	return a.length == b.length && a.every((post, ii) => post.title == b[ii].title && post.url == b[ii].url);
}

let navBarCache = "", listCache = "", indexCache = "";
let cachedPosts: Post[] = [];

function renderNavBarToString() {
	navBarCache = renderToString(<NavApp />);
}

export function renderListPage(html: string, posts: Post[]) {
	console.log("ssr for /list");
	if (!navBarCache) renderNavBarToString();
	if (listCache && isSamePosts(cachedPosts, posts)) return listCache;
	console.log("cache is invalid. re-rendering");
	cachedPosts = posts;
	html = html.replace("{server-data}", JSON.stringify(posts));
	html = html.replace("<!--app-nav-->", navBarCache);
	html = html.replace("<!--app-html-->", renderToString(<AllPostsComponent posts={posts} />));
	return listCache = html;
}

export function renderIndexPage(html: string) {
	if (!navBarCache) renderNavBarToString();
	html = html.replace("<!--app-nav-->", navBarCache);
	html = html.replace("<!--app-html-->", renderToString(<App />));
	return html;
}