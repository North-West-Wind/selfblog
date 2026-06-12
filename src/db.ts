import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import * as crypto from "crypto";
import * as fs from "fs";
import { invalidatePostCache } from "./ssr";
import { postIterator } from "./util";
import { DatabaseComment, commentsTable, DatabaseFollower, followersTable, postsTable, profileTable } from "./db/schema";
import path from "path";
import { and, asc, eq, inArray, isNotNull, notInArray } from "drizzle-orm";
import { dataDir } from "./constants";

const db = drizzle(path.join(dataDir, "blog.db"));

export async function syncDatabase() {
	type OldPost = {	hashId: string; visits: number; }
	const oldPosts = new Map<string, number>();
	if (fs.existsSync("data/visits.db")) {
		const oldDb = new DatabaseSync("data/visits.db");
		(oldDb.prepare(`SELECT * FROM posts`).all() as OldPost[]).forEach(oldPost => oldPosts.set(oldPost.hashId, oldPost.visits));
		oldDb.close();
		fs.renameSync("data/visits.db", "data/visits.db.old");
	}

	let inserted = 0;
	const currentPosts: string[] = [];
	Array.from(postIterator()).map(async ({ dir, date, post: name }) => {
		const mtime = new Date(fs.readdirSync(dir).map(entry => fs.statSync(path.join(dir, entry)).mtimeMs).reduce((a, b) => Math.max(a, b)));
		dir = path.relative(dataDir, dir);
		const hashId = crypto.createHash("SHA1")
			.update(`${date.getFullYear()}`)
			.update(`${date.getMonth() + 1}`.padStart(2, "0"))
			.update(`${date.getDate()}`.padStart(2, "0"))
			.update(name).digest("hex");
		currentPosts.push(dir);
		const visits = oldPosts.get(hashId);
		if (fs.existsSync(path.join(dir, ".federation"))) {
			let id = fs.readFileSync(path.join(dir, ".federation"), "utf8");
			const result = await db.update(postsTable).set({ path: dir, visits, lastModifiedAt: mtime }).where(eq(postsTable.id, id));
			if (result.changes == 0) {
				await db.insert(postsTable).values({ id, path: dir, visits: visits || 0, lastModifiedAt: mtime });
				inserted++;
			}
			fs.rmSync(path.join(dir, ".federation"));
		} else {
			const result = await db.update(postsTable).set({ visits, lastModifiedAt: mtime }).where(eq(postsTable.path, dir));
			if (result.changes == 0) {
				await db.insert(postsTable).values({ id: crypto.randomUUID(), path: dir, visits: visits || 0, lastModifiedAt: mtime });
				inserted++;
			}
		}
	});
	console.log(`Inserted ${inserted} rows to posts`);

	const posts = await db.select({ id: postsTable.id }).from(postsTable).where(notInArray(postsTable.path, currentPosts));
	const result = await db.update(postsTable).set({ deletedAt: new Date() }).where(and(isNotNull(postsTable.deletedAt), notInArray(postsTable.id, posts.map(post => post.id))));
	console.log(`Marked ${result.changes} rows in posts for deletion`);
}

export async function getProfile() {
	return (await db.select().from(profileTable))[0];
}

export async function setProfile(username: string, hash: string) {
	await db.delete(profileTable);
	await db.insert(profileTable).values({ username, hash });
}

export async function getPosts() {
	return await db.select().from(postsTable).orderBy(asc(postsTable.path));
}

export async function getPostById(id: string) {
	const rows = await db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1);
	if (!rows.length) return undefined;
	return rows[0];
}

export async function updatePostLastSyncByIds(ids: string[]) {
	await db.update(postsTable).set({ lastSyncedAt: new Date() }).where(inArray(postsTable.id, ids));
}

export async function incrementVisit(relDir: string) {
	const rows = await db.select({ visits: postsTable.visits }).from(postsTable).where(eq(postsTable.path, relDir)).limit(1);
	if (!rows.length) return;
	await db.update(postsTable).set({ visits: rows[0].visits + 1 });
	invalidatePostCache();
}

export async function getVisits(relDirs: string[]) {
	return await db.select({ path: postsTable.path, visits: postsTable.visits }).from(postsTable).where(inArray(postsTable.path, relDirs));
}

export async function hostHasFollower(host: string) {
	const count = await db.$count(followersTable, eq(followersTable.host, host));
	return count > 0;
}

export async function addFollower(follower: DatabaseFollower) {
	await db.insert(followersTable).values(follower);
}

export async function deleteFollower(id: string) {
	await db.delete(followersTable).where(eq(followersTable.id, id));
}

export async function addComment(comment: DatabaseComment) {
	await db.insert(commentsTable).values(comment);
}

export async function updateComment(id: string, authorName: string, content: string) {
	await db.update(commentsTable).set({ authorName, content }).where(eq(commentsTable.id, id));
}

export async function getCommentWithPostById(id: string) {
	return (await db.select().from(commentsTable).leftJoin(postsTable, eq(commentsTable.postId, postsTable.id)).where(eq(commentsTable.id, id)).limit(1))[0];
}

export async function getCommentAuthorUrl(commentId: string) {
	const rows = await db.select({ authorUrl: commentsTable.authorUrl }).from(commentsTable).where(eq(commentsTable.id, commentId));
	if (!rows.length) return undefined;
	return rows[0].authorUrl;
}

export async function deleteComment(commentId: string) {
	await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
}

export async function getCommentsByPostPath(relDir: string) {
	return await db.select().from(commentsTable).leftJoin(postsTable, eq(commentsTable.postId, postsTable.id)).where(eq(postsTable.path, relDir)).orderBy(asc(commentsTable.publishedAt));
}

export async function isPostOrComment(id: string) {
	const [rowA, rowB] = await Promise.all([
	  db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1),
	  db.select().from(commentsTable).where(eq(commentsTable.id, id)).limit(1),
	]);
	return rowA.length > 0 || rowB.length > 0;
}