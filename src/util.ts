import { Feed } from "@numbered/feed";
import { compareSync } from "bcryptjs";
import { load } from "cheerio";
import { Request } from "express";
import * as fs from "fs";
import * as path from "path";
import { getVisits } from "./db";
import { baseUrl, dataDir, password } from "./constants";

export type Post = {
	title: string,
	summary?: string,
	date: string,
	url: string,
	visits: number,
}

export type DBPost = {
	id: string,
	hash: string,
	url: string,
}

export function* postIterator(options?: { includeHidden?: boolean, ascending?: boolean }) {
	for (const year of fs.readdirSync(dataDir).filter(dir => fs.statSync(path.join(dataDir, dir)).isDirectory()).map(v => parseInt(v)).sort((a, b) => options?.ascending ? a - b : b - a).map(v => v.toString())) {
		const yearPath = path.join(dataDir, year);
		for (const month of fs.readdirSync(yearPath).filter(dir => fs.statSync(path.join(yearPath, dir)).isDirectory()).map(v => parseInt(v)).sort((a, b) => options?.ascending ? a - b : b - a).map(v => v.toString().padStart(2, "0"))) {
			const monthPath = path.join(yearPath, month);
			for (const day of fs.readdirSync(monthPath).filter(dir => fs.statSync(path.join(monthPath, dir)).isDirectory()).map(v => parseInt(v)).sort((a, b) => options?.ascending ? a - b : b - a).map(v => v.toString().padStart(2, "0"))) {
				const dayPath = path.join(monthPath, day);
				for (const post of fs.readdirSync(dayPath).filter(dir => fs.statSync(path.join(dayPath, dir)).isDirectory()).map(v => ({ name:v, time:fs.statSync(path.join(dayPath, v)).mtime.getTime() })).sort((a, b) => options?.ascending ? a.time - b.time : b.time - a.time).map(v => v.name)) {
					const postPath = path.join(dayPath, post);
					if (fs.existsSync(path.join(postPath, ".hidden")) && !options?.includeHidden) continue;
					const date = new Date(`${year}/${month}/${day}`);
					yield { dir: postPath, date, post };
				}
			}
		}
	}
}

export function generateFeed(baseUrl: string, limit: number) {
	const feed = new Feed({
		title: "NorthWestBlog",
		description: "Home-made blogware of NorthWestWind.",
		id: baseUrl,
		link: baseUrl,
		image: `${baseUrl}/assets/icon.gif`,
		favicon: `${baseUrl}/favicon.ico`,
		copyright: "Use whatever you found here, but please credit me, especially images.",
		feedLinks: {
			json: `${baseUrl}/json`,
			atom: `${baseUrl}/atom`
		},
		author: {
			name: "NorthWestWind",
			link: "https://www.northwestw.in"
		}
	});
	for (const { dir, date, post } of postIterator()) {
		if (!feed.options.updated)
			feed.options.updated = date;
		const html = fs.readFileSync(path.join(dir, "index.html"), { encoding: "utf8" });
		const $ = load(html);
		const img = $("img[featured]").attr("src");
		const summary = $(".p-summary").text();
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		feed.addItem({
			title: $("title").text(),
			description: summary,
			id: `${baseUrl}/p/${year}/${month}/${day}/${post}`,
			link: `${baseUrl}/p/${year}/${month}/${day}/${post}`,
			date,
			image: img ? `${baseUrl}/p/${year}/${month}/${day}/${img}` : undefined,
			author: [{
				name: "NorthWestWind",
				link: "https://www.northwestw.in"
			}]
		});
		if (limit && feed.items.length >= limit) break;
	}
	return feed;
}

export async function generatePostArray(limit = 0) {
	const items: Post[] = [];
	for (const { dir, date, post } of postIterator()) {
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const day = date.getDate().toString().padStart(2, "0");

		const html = fs.readFileSync(path.join(dir, "index.html"), { encoding: "utf8" });
		const $ = load(html);

		items.push({
			title: $("title").text(),
			summary: $(".p-summary").text(),
			date: `${year}/${month}/${day}`,
			url: `/p/${year}/${month}/${day}/${post}`,
		} as Post);

		if (limit && items.length >= limit) break;
	}
	const visits = new Map((await getVisits(items.map(item => item.url.slice(3)))).map(result => [result.path, result.visits]));
	items.forEach(item => item.visits = visits.get(item.url.slice(3)) || 0);
	return items;
}

export function generateLatest() {
	const item = generateFeed(baseUrl, 1).items[0];
	const year = item.date.getFullYear();
	const month = (item.date.getMonth() + 1).toString().padStart(2, "0");
	const day = item.date.getDate().toString().padStart(2, "0");
	return `/p/${year}/${month}/${day}/${item.id?.split("/").pop()}`;
}

export function checkAuth(req: Request) {
	if (!req.headers.authorization) return 400;
	const hashed = req.headers.authorization;
	const now = Math.floor(Date.now() / 300000);
	return compareSync(password + now, hashed) ? 200 : 403;
}