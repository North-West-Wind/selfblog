import { app } from ".";
import { integrateFederation } from "@fedify/express";
import { Context, createFederation, exportJwk, generateCryptoKeyPair, importJwk, InProcessMessageQueue, RequestContext } from "@fedify/fedify";
import { SqliteKvStore } from "@fedify/sqlite";
import { Accept, Article, Create, Delete, Follow, Image, Note, Person, PUBLIC_COLLECTION, Recipient, Undo, Update } from "@fedify/vocab";
import { DatabaseSync } from "node:sqlite";
import { DBPost } from "./util";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { load } from "cheerio";
import { Temporal } from "@js-temporal/polyfill";
import { configure, getConsoleSink } from "@logtape/logtape";
import { apDisplayName, apSummary, apUsername, dataDir } from "./constants";
import { addFollower, getPostById, getPosts, getProfile, hostHasFollower, setProfile, deleteFollower, updatePostLastSyncByIds, addComment, getCommentAuthorUrl, updateComment, deleteComment, syncDatabase, getCommentWithPostById } from "./db";
import { DatabasePost, postsTable } from "./db/schema";

configure({
  sinks: { console: getConsoleSink() },
  filters: {},
  loggers: [
    { category: "fedify",  sinks: ["console"], lowestLevel: "info" },
    { category: ["logtape", "meta"],  sinks: ["console"], lowestLevel: "error" },
  ],
});

const db = new DatabaseSync("data/fedify.db");
const kv = new SqliteKvStore(db);
const federation = createFederation<void>({ kv, queue: new InProcessMessageQueue() });

federation.setActorDispatcher("/users/{identifier}", async (ctx, id) => {
	if (id !== apUsername) return null;
	const keyPairs = await ctx.getActorKeyPairs(id);
	return new Person({
		id: ctx.getActorUri(id),
		name: apDisplayName,
		icon: new Image({
			url: new URL("/assets/icon.gif", ctx.url),
			mediaType: "image/gif"
		}),
		summary: apSummary,
		preferredUsername: id,
		url: new URL("/", ctx.url),
		inbox: ctx.getInboxUri(id),
		outbox: ctx.getOutboxUri(id),
		followers: ctx.getFollowersUri(id),
		publicKey: keyPairs[0].cryptographicKey,
		assertionMethods: keyPairs.map(key => key.multikey)
	});
}).setKeyPairsDispatcher(async (_ctx, id) => {
	if (id != apUsername) return [];
	const entry = await kv.get<{ [key in "rsa" | "ed25519"]: { privateKey: JsonWebKey, publicKey: JsonWebKey }}>(["key"]);
	if (entry) return [{
		privateKey: await importJwk(entry.rsa.privateKey, "private"),
		publicKey: await importJwk(entry.rsa.publicKey, "public")
	}, {
		privateKey: await importJwk(entry.ed25519.privateKey, "private"),
		publicKey: await importJwk(entry.ed25519.publicKey, "public")
	}];
	const [rsa, ed25519] = await Promise.all([generateCryptoKeyPair("RSASSA-PKCS1-v1_5"), generateCryptoKeyPair("Ed25519")]);
	kv.set(["key"], { rsa: {
		privateKey: await exportJwk(rsa.privateKey),
		publicKey: await exportJwk(rsa.publicKey)
	}, ed25519: {
		privateKey: await exportJwk(ed25519.privateKey),
		publicKey: await exportJwk(ed25519.publicKey)
	}});
	return [rsa, ed25519];
});

federation
	.setInboxListeners("/users/{identifier}/inbox")
	.on(Follow, async (ctx, follow) => {
		if (follow.id == null || follow.actorId == null || follow.objectId == null) return;
		const parsed = ctx.parseUri(follow.objectId);
		if (parsed?.type !== "actor" || parsed.identifier !== apUsername) return;
		const follower = await follow.getActor(ctx);
		if (follower == null || follower.id == null || follower.inboxId == null) return;
		await ctx.sendActivity({ identifier: parsed.identifier }, follower, new Accept({ actor: follow.objectId, object: follow }));
		console.log(`${follower.name} followed`);

		// Backfill if necessary
		if (!(await hostHasFollower(follower.id.host)))
			await backfill(ctx, [follower]);

		// Store follower
		await addFollower({
			id: follower.id.href,
			host: follower.id.host,
			followedAt: new Date(),
			inbox: follower.inboxId?.href,
			outbox: follower.outboxId?.href ?? null
		});
	})
	.on(Undo, async (ctx, undo) => {
		const object = await undo.getObject();
		if (!(object instanceof Follow) || undo.actorId == null || object.objectId == null) return;
		const parsed = ctx.parseUri(object.objectId);
		if (parsed?.type !== "actor" || parsed.identifier !== apUsername) return;
		const undoer = await undo.getActor(ctx);
		if (undoer == null) return;
		await ctx.sendActivity({ identifier: parsed.identifier }, undoer, new Accept({ actor: undo.objectId, object: undo }));
		console.log(`${undoer.name} unfollowed`);
		await deleteFollower(undo.actorId.href);
	})
	.on(Create, async (ctx, create) => {
		const object = await create.getObject(ctx);
		if (!(object instanceof Note) || object.id == null || create.actorId == null) return;
		const replyTargetId = object.replyTargetId;
		if (replyTargetId == null) return;
		console.log(replyTargetId);
		let post: DatabasePost | undefined;
		const parsed = ctx.parseUri(replyTargetId);
		if (parsed) {
			if (parsed?.type !== "object" || parsed.class !== Article) return;
			const { slug } = parsed.values;
			post = await getPostById(slug);
		}
		if (!post) {
			const commentWithPost = await getCommentWithPostById(replyTargetId.href);
			if (!commentWithPost.posts) return;
			post = commentWithPost.posts;
		}
		const author = await create.getActor(ctx);
		if (!author?.id) return;
		const authorName = author.name?.toString() ?? author.preferredUsername?.toString() ?? author.id.host;
		await addComment({
			id: object.id.href,
			postId: post.id,
			replyTargetId: replyTargetId.href,
			authorUrl: author.id.href,
			authorName,
			content: object.content?.toString() ?? "",
			publishedAt: new Date((object.published as Temporal.Instant || Temporal.Now.instant()).epochMilliseconds)
		});
		console.log(`New comment on ${post.path} by ${author.id.href}`);
	})
	.on(Update, async (ctx, update) => {
		const object = await update.getObject(ctx);
		if (!(object instanceof Note) || object.id == null || update.actorId == null) return;
		const existing = await getCommentAuthorUrl(object.id.href);
		if (existing == null || existing !== update.actorId.href) return;
		const author = await update.getActor(ctx);
		if (!author?.id) return;
		const authorName = author.name?.toString() ?? author.preferredUsername?.toString() ?? author.id.host;
		await updateComment(object.id.href, authorName, object.content?.toString() ?? "");
	})
	.on(Delete, async (_ctx, deletion) => {
		if (!deletion.actorId) return;
		const objectId = deletion.objectId;
		if (!objectId) return;
		const existing = await getCommentAuthorUrl(objectId.href);
		if (existing == null || existing !== deletion.actorId.href) return;
		await deleteComment(objectId.href);
	});

federation.setOutboxDispatcher("/users/{identifier}/outbox", async (ctx, id) => {
	const actorUri = ctx.getActorUri(apUsername);
	const items = Array.from(await getPosts()).map(post => {
		const article = postToArticle(ctx, post);
		if (post.deletedAt) return new Delete({
			id: new URL("#activity", article.id!),
			actor: actorUri,
			object: article.id
		});
		return new Create({
			id: new URL("#activity", article.id!),
			actor: actorUri,
			object: article
		});
	});
	return { items };
});

federation.setFollowersDispatcher("/users/{identifier}/followers", async (_ctx, id) => {
	if (id !== apUsername) return null;
	const items: { id: URL, inboxId: URL }[] = [];
	for await (const { key, value } of kv.list(["followers"]))
		items.push({ id: new URL(key[2]!), inboxId: new URL(value as string) });
	return { items };
});

federation.setObjectDispatcher(Article, "/posts/{slug}", async (ctx, { slug }) => {
	const post = await getPostById(slug);
	if (!post) return null;
	return postToArticle(ctx, post);
});

function postToArticle(ctx: Context<unknown>, post: Omit<DatabasePost, "visits">) {
	const html = fs.readFileSync(path.join(dataDir, post.path, "index.html"), { encoding: "utf8" });
	const $ = load(html);

	let summary = ($(".p-summary").text() || $("p:first").text()).replace(/\s+/g, " ").replace(/\n/g, " ").trim();
	if (!summary.endsWith(".")) summary += "...";
	else if (summary.endsWith(".") && !summary.endsWith("...")) summary += "..";
	const actorUri = ctx.getActorUri(apUsername);
	return new Article({
		id: ctx.getObjectUri(Article, { slug: post.id }),
		attribution: ctx.getActorUri(apUsername!),
		name: $("title").text(),
		summary,
		content: $(".e-content").html() || $("body").remove("div#nav").html(),
		mediaType: "text/html",
		url: new URL(`/p/${post.path}`, actorUri.protocol + "//" + actorUri.host),
		published: Temporal.Instant.from(new Date(post.path.split("/").slice(0, 3).join("/")).toISOString())
	});
}

export async function sync(ctx: Request | RequestContext<unknown>) {
	if (ctx instanceof Request) ctx = federation.createContext(ctx);
	console.log("Federating posts...");
  const actorUri = ctx.getActorUri(apUsername);
	const syncedPosts = new Set<string>();
	const currentPosts = new Set<string>();
	for (const post of await getPosts()) {
		const article = postToArticle(ctx, post);
		const id = article.id!.href;
		currentPosts.add(id);
		if (!post.lastSyncedAt && !post.deletedAt) {
			console.log(`Creating post ${id}...`);
			await ctx.sendActivity({ identifier: apUsername }, "followers", new Create({
				id: new URL(`#create-${Date.now()}`, article.id!),
				actor: actorUri,
				to: PUBLIC_COLLECTION,
				object: article,
				published: article.published
			}));
			syncedPosts.add(post.id);
		} else if (post.lastSyncedAt && post.lastModifiedAt.getTime() > post.lastSyncedAt.getTime()) {
			console.log(`Updating post ${id}...`);
			const patched = new Article({ ...article, updated: Temporal.Now.instant() });
			await ctx.sendActivity({ identifier: apUsername }, "followers", new Update({
				id: new URL(`#update-${Date.now()}`, article.id!),
				actor: actorUri,
				to: PUBLIC_COLLECTION,
				object: patched,
				published: Temporal.Now.instant()
			}));
			syncedPosts.add(post.id);
		} else if (post.lastSyncedAt && post.deletedAt && post.deletedAt.getTime() > post.lastSyncedAt.getTime()) {
			console.log(`Deleting post ${id}...`);
			await ctx.sendActivity({ identifier: apUsername }, "followers", new Delete({
				id: new URL(`#delete-${Date.now()}`, actorUri),
				actor: actorUri,
				to: PUBLIC_COLLECTION,
				object: article.id
			}));
			syncedPosts.add(post.id);
		}
	}
	
	await updatePostLastSyncByIds(Array.from(syncedPosts));

	console.log("Post federation finished!");

	console.log("Federating profile...");
	const profile = await getProfile();
	const profileHash = crypto.hash("sha256", JSON.stringify(await (await ctx.getActor(apUsername))?.toJsonLd({ format: "compact", context: {} })));
	if (!profile) {
		console.log("Profile not found in database. Adding...");
		setProfile(apUsername, profileHash);
	} else if (profile.hash !== profileHash) {
		console.log("Profile hash mismatch! Re-syncing...");
		await ctx.sendActivity({ identifier: apUsername }, "followers", new Update({
			id: new URL(`#update-actor-${Date.now()}`, ctx.getActorUri(profile.username)), // in case I ever change the username
			actor: ctx.getActorUri(apUsername),
			object: await ctx.getActor(apUsername)
		}));
		setProfile(apUsername, profileHash);
	} else console.log("Profile not updated");

	console.log("Federation finished!");
}

async function backfill(ctx: Context<unknown>, recipients: Recipient[]) {
  const actorUri = ctx.getActorUri(apUsername);
	for (const post of await getPosts()) {
		const article = postToArticle(ctx, post);
		console.log(`Creating post ${article.id!.href}...`);
		await ctx.sendActivity({ identifier: apUsername }, recipients, new Create({
			id: new URL(`#create-${Date.now()}`, article.id!),
			actor: actorUri,
			to: PUBLIC_COLLECTION,
			object: article,
			published: article.published
		}));	
	}
}

let synced = false;
app.set("trust proxy", true);
app.use(integrateFederation(federation, (req) => {
	// Sync on first request
	const proto = req.header("x-forwarded-proto");
	const host = req.header("x-forwarded-host");
	if (!host || !proto) return;
	const url = new URL(req.url, `${proto}://${host}`);
	req = new Request(url.toString(), req as unknown as Request) as unknown as typeof req;
	if (!synced) {
		synced = true;
		// Sync database, then sync posts
		syncDatabase().then(() => sync(req as unknown as Request)).catch(err => {
			console.error("Failed to sync posts:", err);
			synced = false;
		});
	}
}));