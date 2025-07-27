import { Feed } from "@numbered/feed";
import { compareSync } from "bcryptjs";
import { load } from "cheerio";
import { Request } from "express";
import * as fs from "fs";
import * as path from "path";
import { getVisit } from "./db";

export function generateFeed(baseUrl: string, limit: number) {
	if (process.env.BASE_URL) baseUrl = process.env.BASE_URL;
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
	for (const year of fs.readdirSync("data").filter(dir => fs.statSync(path.join("data", dir)).isDirectory()).map(v => parseInt(v)).sort((a, b) => b - a).map(v => v.toString())) {
		const yearPath = path.join("data", year);
		for (const month of fs.readdirSync(yearPath).filter(dir => fs.statSync(path.join(yearPath, dir)).isDirectory()).map(v => parseInt(v)).sort((a, b) => b - a).map(v => v.toString().padStart(2, "0"))) {
			const monthPath = path.join(yearPath, month);
			for (const day of fs.readdirSync(monthPath).filter(dir => fs.statSync(path.join(monthPath, dir)).isDirectory()).map(v => parseInt(v)).sort((a, b) => b - a).map(v => v.toString().padStart(2, "0"))) {
				const dayPath = path.join(monthPath, day);
				for (const post of fs.readdirSync(dayPath).filter(dir => fs.statSync(path.join(dayPath, dir)).isDirectory()).map(v => ({ name:v, time:fs.statSync(path.join(dayPath, v)).mtime.getTime() })).sort((a, b) => b.time - a.time).map(v => v.name)) {
					const postPath = path.join(dayPath, post);
					if (fs.existsSync(path.join(postPath, ".hidden"))) continue;
					if (fs.existsSync(path.join(postPath, "index.html"))) {
						const date = new Date(`${year}/${month}/${day}`);
						if (!feed.options.updated)
							feed.options.updated = date;
						const html = fs.readFileSync(path.join(postPath, "index.html"), { encoding: "utf8" });
						const $ = load(html);
						const img = $("img[featured]").attr("src");
						feed.addItem({
							title: $("title").text(),
							id: `${baseUrl}/p/${year}/${month}/${day}/${post}`,
							link: `${baseUrl}/p/${year}/${month}/${day}/${post}`,
							date,
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
		const post = item.id?.split("/").pop();
		return { title: `${item.title}`, date: `${year}/${month}/${day}`, url: `/p/${year}/${month}/${day}/${post}`, visits: post ? getVisit(year, month, day, post) : 0 };
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