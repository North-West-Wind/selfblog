PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_followers` (
	`id` text PRIMARY KEY,
	`host` text NOT NULL,
	`inbox` text,
	`outbox` text,
	`followedAt` integer
);
--> statement-breakpoint
INSERT INTO `__new_followers`(`id`, `host`, `inbox`, `outbox`, `followedAt`) SELECT `id`, `host`, `inbox`, `outbox`, `followedAt` FROM `followers`;--> statement-breakpoint
DROP TABLE `followers`;--> statement-breakpoint
ALTER TABLE `__new_followers` RENAME TO `followers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;