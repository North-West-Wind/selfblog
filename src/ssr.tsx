import crypto from "crypto";
import fs from "fs";
import renderToString from "preact-render-to-string";
import remarkFediverseUser from "remark-fediverse-user";
import remarkGfm from "remark-gfm";
import remarkFlexibleMarkers from "remark-flexible-markers";
import remarkMath from "remark-math";
import remarkImgLinks from "@pondorasti/remark-img-links";
import rehypeKatex from "rehype-katex";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeWrapSibling from "rehype-wrap-sibling";
import rehypeStringify from "rehype-stringify";
import rehypeQuotedText from "./plugins/rehype-quoted-text";
import { Post } from "./util";
import HomePage from "./client/pages/home";
import PostPage from "./client/pages/post";
import NewPage from "./client/pages/new";
import DeletePage from "./client/pages/delete";
import NotFoundPage from "./client/pages/not-found";
import { baseUrl } from "./constants";

const cache = new Map<string, { hash: string, html: string }>();

const indexHtml = fs.readFileSync("public/index.html", "utf8");
export function renderIndexPage(latest: string, posts: Post[]) {
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
	const html = renderToString(<HomePage latest={latest} posts={posts} />);
	const replaced = indexHtml
		.replace("{scriptName}", "home")
		.replace("{serverData}", JSON.stringify({ latest, posts }))
		.replace("<!--app-html-->", html);
	cache.set("index", {
		hash,
		html: replaced
	});
	return replaced;
}

export function renderPostPage(path: string, insideFrame: boolean, markdown?: string) {
	if (!markdown) return renderNotFoundPage();
	const hash = crypto.hash("md5", markdown);
	const key = insideFrame ? path + "/iframe" : path;
	if (cache.has(key)) {
		const cached = cache.get(key)!;
		if (cached.hash == hash) return cached.html;
	}
	const [meta, content] = markdown.split(/^-{3,}$/m, 2);
	const title = meta.match(/^#\s+(.+)$/m)?.[1];
	const date = meta.match(/^Date: (\d{4}[/-]\d{2}[/-]\d{2})$/m)?.[1];
	const summary = meta.split(/^#+\s+Summary\s*$/m, 2)[1].replace(/  $/m, "\n");
	const rendered = unified()
		.use(remarkParse)
		.use(remarkFediverseUser)
		.use(remarkFlexibleMarkers, { markerTagName: "span", markerClassName: "highlight" })
		.use(remarkMath)
		.use(remarkGfm)
		.use(remarkImgLinks, { absolutePath: `${baseUrl}${path}` })
		.use(remarkRehype)
		.use(rehypeKatex)
		.use(rehypeWrapSibling, { wrapper: "div.flex.hcenter", selector: "img" })
		.use(rehypeQuotedText)
		.use(rehypeStringify)
		.processSync(content);
	const html = renderToString(<PostPage title={title} date={date} summary={summary} html={String(rendered)} insideFrame={insideFrame} />);
	const replaced = indexHtml
		.replace("{scriptName}", "post")
		.replace("{serverData}", JSON.stringify({ title, date, summary, html: String(rendered), insideFrame }))
		.replace("<!--app-html-->", html);
	cache.set(path, {
		hash,
		html: replaced
	});
	return replaced;
}

export function renderNewPage() {
	if (cache.has("new")) return cache.get("new")!.html;
	const html = renderToString(<NewPage />);
	const replaced = indexHtml
		.replace("{scriptName}", "new")
		.replace("{serverData}", "{}")
		.replace("<!--app-html-->", html);
	cache.set("new", {
		hash: "",
		html: replaced
	});
	return replaced;
}

export function renderDeletePage() {
	if (cache.has("delete")) return cache.get("delete")!.html;
	const html = renderToString(<DeletePage />);
	const replaced = indexHtml
		.replace("{scriptName}", "delete")
		.replace("{serverData}", "{}")
		.replace("<!--app-html-->", html);
	cache.set("delete", {
		hash: "",
		html: replaced
	});
	return replaced;
}

export function renderNotFoundPage() {
	if (cache.has("not-found")) return cache.get("not-found")!.html;
	const html = renderToString(<NotFoundPage />);
	const replaced = indexHtml
		.replace("{scriptName}", "not-found")
		.replace("{serverData}", "{}")
		.replace("<!--app-html-->", html);
	cache.set("not-found", {
		hash: "",
		html: replaced
	});
	return replaced;
}

export function renderEditPage() {
	if (cache.has("edit")) return cache.get("edit")!.html;
	const replaced = indexHtml
		.replace("{scriptName}", "edit")
		.replace("{serverData}", "{}");
	cache.set("edit", {
		hash: "",
		html: replaced
	});
	return replaced;
}