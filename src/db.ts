import Database from "better-sqlite3";
import * as crypto from "crypto";
import { invalidatePostCache } from "./ssr";

type Post = {
	hashId: string;
	visits: number;
}

let ready = false;
let data = new Map<string, { visits: number, changed: boolean }>();
const queue: string[] = [];

(async () => {
	const db = new Database("data/visits.db");
	db.pragma('journal_mode = WAL');
	db.exec(`CREATE TABLE IF NOT EXISTS posts (hashId CHARACTER(40) NOT NULL PRIMARY KEY, visits UNSIGNED BIG INT NOT NULL);`);

	const posts = db.prepare(`SELECT * FROM posts`).all() as Post[];
	posts.forEach(post => data.set(post.hashId, { visits: post.visits, changed: false }));
	ready = true;

	// Timer for writing to disk
	setInterval(async () => {
		while (queue.length) {
			const hashId = queue.shift()!;
			if (data.has(hashId)) data.set(hashId, { visits: data.get(hashId)!.visits + 1, changed: true });
			else data.set(hashId, { visits: 1, changed: true });
		}
		data.forEach(async ({ visits, changed }, hashId) => {
			if (!changed) return;
			const post = db.prepare(`SELECT * FROM posts WHERE hashId = ?`).get(hashId) as Post | null;
			if (post) db.prepare("UPDATE posts SET visits = ? WHERE hashId = ?").run(visits, hashId);
			else db.prepare("INSERT INTO posts VALUES (?, ?)").run(hashId, visits);
		});
	}, 60000);
	
	process.on("exit", () => db.close());
})();

function hashPost(year: string | number, month: string | number, day: string | number, name: string) {
	return crypto.createHash("SHA1")
		.update(`${year}`)
		.update(`${month}`)
		.update(`${day}`)
		.update(name)
		.digest("hex");
}

export function incrementVisit(year: string, month: string, day: string, name: string) {
	const hashId = hashPost(year, month, day, name);
	if (!ready) {
		queue.push(hashId);
		return;
	}
	const existing = data.get(hashId);
	if (existing) data.set(hashId, { visits: existing.visits + 1, changed: true });
	else data.set(hashId, { visits: 1, changed: true });
	invalidatePostCache();
}

export function getVisit(year: string | number, month: string | number, day: string | number, name: string) {
	if (!ready) return 0;
	const hashId = hashPost(year, month, day, name);
	return data.get(hashId)?.visits || 0;
}