import crypto from "crypto";
import fs from "fs";
import App from "./client";
import { Post } from "./util";
import { prerender } from "preact-iso";
import { locationStub } from "preact-iso/prerender";
import type { ServerData } from "./client/data";

const cache = new Map<string, { hash: string, html: string }>();

const indexHtml = fs.readFileSync("public/index.html", "utf8");
export async function renderIndexPage(latest: string, posts: Post[]) {
	const hasher = crypto.createHash("md5");
	hasher.update(latest);
	posts.forEach(post => {
		hasher.update(post.title);
		hasher.update(post.url);
	});
	const hash = hasher.digest("hex");
	if (cache.has("index")) {
		const cached = cache.get("index")!;
		if (cached.hash == hash) return cached.html;
	}
	locationStub("/");
	const data: ServerData = { latest, posts };
	const { html } = await prerender(<App data={data} />);
	const replaced = indexHtml.replace("{serverData}", JSON.stringify(data)).replace("<!--app-html-->", html);
	cache.set("index", {
		hash,
		html: replaced
	});
	return replaced;
}

export async function renderPostPage(path: string, markdown?: string) {
	const hash = crypto.hash("md5", markdown || "");
	if (cache.has(path)) {
		const cached = cache.get(path)!;
		if (cached.hash == hash) return cached.html;
	}
	locationStub(path);
	const data: ServerData = { markdown };
	const { html } = await prerender(<App data={data} />);
	const replaced = indexHtml.replace("{serverData}", JSON.stringify(data)).replace("<!--app-html-->", html);
	cache.set(path, {
		hash,
		html: replaced
	});
	return replaced;
}

export async function renderNewPage() {
	if (cache.has("new")) return cache.get("new")!.html;
	locationStub("/new");
	const { html } = await prerender(<App data={{}} />);
	const replaced = indexHtml.replace("{serverData}", "{}").replace("<!--app-html-->", html);
	cache.set("new", {
		hash: "",
		html: replaced
	});
	return replaced;
}

export async function renderDeletePage() {
	if (cache.has("delete")) return cache.get("delete")!.html;
	locationStub("/delete/y/m/d/p");
	const { html } = await prerender(<App data={{}} />);
	const replaced = indexHtml.replace("{serverData}", "{}").replace("<!--app-html-->", html);
	cache.set("delete", {
		hash: "",
		html: replaced
	});
	return replaced;
}