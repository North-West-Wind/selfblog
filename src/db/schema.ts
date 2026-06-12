import * as crypto from "crypto";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const profileTable = sqliteTable("profile", {
	username: text().primaryKey(),
	hash: text().notNull()
});

export const postsTable = sqliteTable("posts", {
  id: text({ length: crypto.randomUUID().length }).primaryKey(),
	path: text().notNull().unique(),
	visits: int().notNull(),
	lastModifiedAt: int({ mode: "timestamp" }).notNull(),
	lastSyncedAt: int({ mode: "timestamp" }),
	deletedAt: int({ mode: "timestamp" })
});

export const followersTable = sqliteTable("followers", {
	id: text().primaryKey(),
	host: text().notNull(),
	inbox: text(),
	outbox: text(),
	followedAt: int({ mode: "timestamp" }).notNull()
});

export const commentsTable = sqliteTable("comments", {
	id: text().primaryKey(),
	postId: text().notNull(),
	replyTargetId: text().notNull(),
	authorUrl: text().notNull(),
	authorName: text().notNull(),
	content: text().notNull(),
	publishedAt: int({ mode: "timestamp" }).notNull()
});

export type DatabaseProfile = typeof profileTable.$inferSelect;
export type DatabasePost = typeof postsTable.$inferSelect;
export type DatabaseFollower = typeof followersTable.$inferSelect;
export type DatabaseComment = typeof commentsTable.$inferSelect;