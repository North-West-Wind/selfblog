CREATE TABLE `comments` (
	`id` text PRIMARY KEY,
	`postId` text NOT NULL,
	`replyTargetId` text NOT NULL,
	`authorUrl` text NOT NULL,
	`authorName` text NOT NULL,
	`content` text NOT NULL,
	`publishedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `followers` (
	`id` text PRIMARY KEY,
	`host` text NOT NULL,
	`inbox` text,
	`outbox` text,
	`followedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text(36) PRIMARY KEY,
	`path` text NOT NULL UNIQUE,
	`visits` integer NOT NULL,
	`lastModifiedAt` integer NOT NULL,
	`lastSyncedAt` integer,
	`deletedAt` integer
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`username` text PRIMARY KEY,
	`hash` text NOT NULL
);
