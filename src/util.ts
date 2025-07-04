import { Feed } from "@numbered/feed";
import { compareSync } from "bcryptjs";
import { load } from "cheerio";
import { Request } from "express";
import * as fs from "fs";
import * as path from "path";

export function generateFeed(baseUrl: string, limit: number) {
	if (process.env.BASE_URL) baseUrl = process.env.BASE_URL;
	const year = Math.max(...fs.readdirSync("data").map(v => parseInt(v)));
	const month = Math.max(...fs.readdirSync(path.join("data", year.toString())).map(v => parseInt(v)));
	const day = Math.max(...fs.readdirSync(path.join("data", year.toString(), month.toString().padStart(2, "0"))).map(v => parseInt(v)));
	const feed = new Feed({
		title: "NorthWestBlog",
		description: "Home-made blogware of NorthWestWind.",
		id: baseUrl,
		link: baseUrl,
		image: `${baseUrl}/assets/icon.gif`,
		favicon: `${baseUrl}/favicon.ico`,
		copyright: "Use whatever you found here, but please credit me, especially images.",
		updated: new Date(year, month - 1, day),
		feedLinks: {
			json: `${baseUrl}/json`,
			atom: `${baseUrl}/atom`
		},
		author: {
			name: "NorthWestWind",
			link: "https://www.northwestw.in"
		}
	});
	for (const year of fs.readdirSync("data").map(v => parseInt(v)).sort((a, b) => b - a).map(v => v.toString())) {
		for (const month of fs.readdirSync(path.join("data", year)).map(v => parseInt(v)).sort((a, b) => b - a).map(v => v.toString().padStart(2, "0"))) {
			for (const day of fs.readdirSync(path.join("data", year, month)).map(v => parseInt(v)).sort((a, b) => b - a).map(v => v.toString().padStart(2, "0"))) {
				const dir = path.join("data", year, month, day);
				for (const post of fs.readdirSync(dir).map(v => ({ name:v, time:fs.statSync(path.join(dir, v)).mtime.getTime() })).sort((a, b) => b.time - a.time).map(v => v.name)) {
					if (fs.existsSync(path.join(dir, post, ".hidden"))) continue;
					if (fs.existsSync(path.join(dir, post, "index.html"))) {
						const html = fs.readFileSync(path.join(dir, post, "index.html"), { encoding: "utf8" });
						const $ = load(html);
						const img = $("img[featured]").attr("src");
						feed.addItem({
							title: $("title").text(),
							id: `${baseUrl}/p/${year}/${month}/${day}/${post}`,
							link: `${baseUrl}/p/${year}/${month}/${day}/${post}`,
							date: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)),
							image: img ? `${baseUrl}/p/${year}/${month}/${day}/${img}` : undefined,
							author: [{
								name: "NorthWestWind",
								link: "https://www.northwestw.in"
							}]
						});
						if (limit && feed.items.length >= limit) return feed;
					}
				}
			}
		}
	}
	return feed;
}

export function generatePostArray(limit = 0) {
	const feed = generateFeed("", limit);
	return feed.items.map(item => {
		const year = item.date.getFullYear();
		const month = (item.date.getMonth() + 1).toString().padStart(2, "0");
		const day = item.date.getDate().toString().padStart(2, "0");
		return { title: `${item.title}`, date: `${year}/${month}/${day}`, url: `/p/${year}/${month}/${day}/${item.id?.split("/").pop()}` };
	});
}

export function generateLatest() {
	const item = generateFeed("", 1).items[0];
	const year = item.date.getFullYear();
	const month = (item.date.getMonth() + 1).toString().padStart(2, "0");
	const day = item.date.getDate().toString().padStart(2, "0");
	return `/p/${year}/${month}/${day}/${item.id?.split("/").pop()}`;
}

export function checkAuth(req: Request, useBody = false) {
	let hashed: string;
	if (useBody) {
		if (!req.body?.password) return 400;
		hashed = req.body.password;
	} else {
		if (!req.headers.authorization) return 400;
		hashed = req.headers.authorization;
	}
	return compareSync(process.env.PASSWORD!, hashed) ? 200 : 403;
}