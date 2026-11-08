import { Feed } from "@numbered/feed";
import { load } from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { getVisits } from "./db";
import { baseUrl, dataDir, feedAuthor, feedAuthorLink, feedCopyright, feedFavicon, feedImage, siteDescription, siteName } from "./constants";
import moment from "moment";
import { marked } from "marked";

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
	const sortedNumberDirectories = (parent: string) => {
		const entries = fs.readdirSync(parent);
		return entries
			.filter(dir => fs.statSync(path.join(parent, dir)).isDirectory())
			.sort((a, b) => {
				const aInt = parseInt(a);
				const bInt = parseInt(b);
				return options?.ascending ? aInt - bInt : bInt - aInt;
			});
	};
	for (const year of sortedNumberDirectories(dataDir)) {
		const yearPath = path.join(dataDir, year);
		for (const month of sortedNumberDirectories(yearPath)) {
			const monthPath = path.join(yearPath, month);
			for (const day of sortedNumberDirectories(monthPath)) {
				const dayPath = path.join(monthPath, day);
				const posts = fs.readdirSync(dayPath)
					.filter(dir => fs.statSync(path.join(dayPath, dir)).isDirectory())
					.map(v => ({ name: v, time: fs.statSync(path.join(dayPath, v)).mtime.getTime() }))
					.sort((a, b) => options?.ascending ? a.time - b.time : b.time - a.time)
					.map(v => v.name);
				for (const post of posts) {
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
		title: siteName,
		description: siteDescription,
		id: baseUrl,
		link: baseUrl,
		image: feedImage ? `${baseUrl}${feedImage}` : undefined,
		favicon: feedFavicon ? `${baseUrl}${feedFavicon}` : undefined,
		copyright: feedCopyright,
		feedLinks: {
			json: `${baseUrl}/json`,
			atom: `${baseUrl}/atom`
		},
		author: {
			name: feedAuthor,
			link: feedAuthorLink
		}
	});
	for (const { dir, date, post } of postIterator()) {
		const mdFile = path.join(dir, "index.md");
		if (!fs.existsSync(mdFile)) continue;
		if (!feed.options.updated)
			feed.options.updated = date;
		const markdown = fs.readFileSync(mdFile, "utf8");
		const [meta, content] = markdown.split(/^-{3,}$/m, 2);
		const title = meta.match(/^#\s+(.+)$/m)?.[1];
		if (!title) continue;
		const summary = meta.split(/^#+\s+Summary\s*$/m, 2)[1].replace(/  $/m, "\n");
		const img = content.match(/!\[.*\]\((.*)\)/)?.[1];
		const datePath = moment(date).format("YYYY/MM/DD");
		feed.addItem({
			title,
			description: summary,
			id: `${baseUrl}/p/${datePath}/${post}`,
			link: `${baseUrl}/p/${datePath}/${post}`,
			date,
			image: img ? `${baseUrl}/p/${datePath}/${img}` : undefined,
			author: [{
				name: feedAuthor,
				link: feedAuthorLink
			}]
		});
		if (limit && feed.items.length >= limit) break;
	}
	return feed;
}

export async function generatePostArray(limit = 0) {
	const items: Post[] = [];
	for (const { dir, date, post } of postIterator()) {
		const mdFile = path.join(dir, "index.md");
		if (!fs.existsSync(mdFile)) continue;
		const markdown = fs.readFileSync(mdFile, "utf8");
		const [meta] = markdown.split(/^-{3,}$/m, 2);
		const title = meta.match(/^#\s+(.+)$/m)?.[1];
		if (!title) continue;
		const summary = meta.split(/^#+\s+Summary\s*$/m, 2)[1]?.replace(/  $/m, "\n");
		const datePath = moment(date).format("YYYY/MM/DD");

		items.push({
			title,
			summary,
			date: datePath,
			url: `/p/${datePath}/${post}`,
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