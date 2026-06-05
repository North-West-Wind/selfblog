import { app } from ".";
import { integrateFederation } from "@fedify/express";
import { Context, createFederation, exportJwk, generateCryptoKeyPair, importJwk, InboxContext, InProcessMessageQueue, RequestContext } from "@fedify/fedify";
import { SqliteKvStore } from "@fedify/sqlite";
import { Accept, Article, Create, Delete, Follow, Image, Person, PUBLIC_COLLECTION, Recipient, Undo, Update } from "@fedify/vocab";
import { DatabaseSync } from "node:sqlite";
import { DBPost, postIterator } from "./util";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { load } from "cheerio";
import { Temporal } from "@js-temporal/polyfill";
import { configure, getConsoleSink } from "@logtape/logtape";

const USERNAME = process.env.AP_USERNAME!;
const DISPLAYNAME = process.env.AP_DISPLAYNAME;
const SUMMARY = process.env.AP_SUMMARY;

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
	if (id !== USERNAME) return null;
	const keyPairs = await ctx.getActorKeyPairs(id);
	return new Person({
		id: ctx.getActorUri(id),
		name: DISPLAYNAME,
		icon: new Image({
			url: new URL("/assets/icon.gif", ctx.url),
			mediaType: "image/gif"
		}),
		summary: SUMMARY,
		preferredUsername: id,
		url: new URL("/", ctx.url),
		inbox: ctx.getInboxUri(id),
		outbox: ctx.getOutboxUri(id),
		followers: ctx.getFollowersUri(id),
		publicKey: keyPairs[0].cryptographicKey,
		assertionMethods: keyPairs.map(key => key.multikey)
	});
}).setKeyPairsDispatcher(async (_ctx, id) => {
	if (id != USERNAME) return [];
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
		if (parsed?.type !== "actor" || parsed.identifier !== USERNAME) return;
		const follower = await follow.getActor(ctx);
		if (follower == null || follower.id == null || follower.inboxId == null) return;
		await ctx.sendActivity({ identifier: parsed.identifier }, follower, new Accept({ actor: follow.objectId, object: follow }));
		console.log(`${follower.name} followed`);

		// Backfill if necessary
		if (!(await kv.get(["followers", follower.id.host])))
			await backfill(ctx, [follower]);

		// Store follower
		await kv.set(["followers", follower.id.host, follower.id.href], follower.inboxId.href);
	})
	.on(Undo, async (ctx, undo) => {
		const object = await undo.getObject();
		if (!(object instanceof Follow) || undo.actorId == null || object.objectId == null) return;
		const parsed = ctx.parseUri(object.objectId);
		if (parsed?.type !== "actor" || parsed.identifier !== USERNAME) return;
		const undoer = await undo.getActor(ctx);
		if (undoer == null) return;
		await ctx.sendActivity({ identifier: parsed.identifier }, undoer, new Accept({ actor: undo.objectId, object: undo }));
		console.log(`${undoer.name} unfollowed`);
		await kv.delete(["followers", undo.actorId.host, undo.actorId.href]);
	}).onError((_ctx, err) => {
		console.error("Error in inbox listener:", err);
	});

federation.setFollowersDispatcher("/users/{identifier}/followers", async (_ctx, id) => {
	if (id !== USERNAME) return null;
	const items: { id: URL, inboxId: URL }[] = [];
	for await (const { key, value } of kv.list(["followers"]))
		items.push({ id: new URL(key[2]!), inboxId: new URL(value as string) });
	return { items };
});

federation.setOutboxDispatcher("/users/{identifier}/outbox", async (ctx, id) => {
	const actorUri = ctx.getActorUri(USERNAME);
	const items = Array.from(postIterator({ ascending: true })).map(post => {
		const article = postToArticle(ctx, post);
		return new Create({
			id: new URL("#activity", article.id!),
			actor: actorUri,
			object: article
		});
	});
	return { items };
});

federation.setObjectDispatcher(Article, "/posts/{slug}", async (ctx, { slug }) => {
	for (const { dir, date, post } of postIterator()) {
		const idFile = path.join(dir, ".federation");
		if (!fs.existsSync(idFile) || fs.readFileSync(idFile, "utf8") != slug) continue;
		return postToArticle(ctx, { dir, date, post });
	}
	return null;
});

function postToArticle(ctx: Context<unknown>, post: { dir: string, date: Date, post: string }) {
	const year = post.date.getFullYear();
	const month = (post.date.getMonth() + 1).toString().padStart(2, "0");
	const day = post.date.getDate().toString().padStart(2, "0");
	const html = fs.readFileSync(path.join(post.dir, "index.html"), { encoding: "utf8" });
	const $ = load(html);

	const idFile = path.join(post.dir, ".federation");
	let id = "";
	if (fs.existsSync(idFile))
		id = fs.readFileSync(idFile, "utf8");
	if (!id) {
		id = crypto.randomUUID();
		fs.writeFileSync(idFile, id);
	}
	let summary = ($(".p-summary").text() || $("p:first").text()).replace(/\s+/g, " ").replace(/\n/g, " ").trim();
	if (!summary.endsWith(".")) summary += "...";
	else if (summary.endsWith(".") && !summary.endsWith("...")) summary += "..";
	const actorUri = ctx.getActorUri(USERNAME);
	return new Article({
		id: ctx.getObjectUri(Article, { slug: id }),
		attribution: ctx.getActorUri(USERNAME!),
		name: $("title").text(),
		summary,
		content: $(".e-content").html() || $("body").remove("div#nav").html(),
		mediaType: "text/html",
		url: new URL(`/p/${year}/${month}/${day}/${post.post}`, actorUri.protocol + "//" + actorUri.host),
		published: Temporal.Instant.from(post.date.toISOString())
	});
}

export async function sync(ctx: Request | RequestContext<unknown>) {
	if (ctx instanceof Request) ctx = federation.createContext(ctx);
	console.log("Federating posts...");
  const actorUri = ctx.getActorUri(USERNAME);
	const stored = new Map<string, DBPost>();
	for await (const { value } of kv.list(["posts"])) {
		const post = value as DBPost;
		stored.set(post.id, post);
	}
	console.log("Collected %d posts from database", stored.size);

	console.log("Processing current posts...");
	const currentPosts = new Set<string>();
	for (const { dir, date, post } of postIterator({ ascending: true })) {
		const article = postToArticle(ctx, { dir, date, post });
		const id = article.id!.href;
		currentPosts.add(id);
		const hash = crypto.hash("sha256", `${article.summary || ""}\n${article.content}`);
		if (!stored.has(id)) {
			console.log(`Creating post ${id}...`);
			await ctx.sendActivity({ identifier: USERNAME }, "followers", new Create({
				id: new URL(`#create-${Date.now()}`, article.id!),
				actor: actorUri,
				to: PUBLIC_COLLECTION,
				object: article,
				published: article.published
			}));
			kv.set(["posts", id], { id, hash, url: article.id!.href! } as DBPost);
		} else if (stored.get(id)?.hash !== hash) {
			console.log(`Updating post ${id}...`);
			const patched = new Article({ ...article, updated: Temporal.Now.instant() });
			await ctx.sendActivity({ identifier: USERNAME }, "followers", new Update({
				id: new URL(`#update-${Date.now()}`, article.id!),
				actor: actorUri,
				to: PUBLIC_COLLECTION,
				object: patched,
				published: Temporal.Now.instant()
			}));
			kv.set(["posts", id], { id, hash, url: article.id!.href } as DBPost);
		}
	}

	for (const [id, post] of stored) {
		if (!currentPosts.has(id)) {
			console.log(`Deleting post ${id}...`);
			await ctx.sendActivity({ identifier: USERNAME }, "followers", new Delete({
				id: new URL(`#delete-${Date.now()}`, actorUri),
				actor: actorUri,
				to: PUBLIC_COLLECTION,
				object: new URL(post.url)
			}));
			kv.delete(["posts", id]);
		}
	}

	console.log("Post federation finished!");

	console.log("Federating profile...");
	const storedProfile = await kv.get<{ username: string, hash: string }>(["profile"]);
	const profileHash = crypto.hash("sha256", JSON.stringify(await (await ctx.getActor(USERNAME))?.toJsonLd({ format: "compact", context: {} })));
	if (!storedProfile) {
		console.log("Profile not found in database. Performing local update without sync...");
		kv.set(["profile"], { username: USERNAME, hash: profileHash });
	} else if (storedProfile.hash !== profileHash) {
		console.log("Profile hash mismatch! Re-syncing...");
		await ctx.sendActivity({ identifier: USERNAME }, "followers", new Update({
			id: new URL(`#update-actor-${Date.now()}`, ctx.getActorUri(storedProfile.username)), // in case I ever change the username
			actor: ctx.getActorUri(USERNAME),
			object: await ctx.getActor(USERNAME)
		}));
		kv.set(["profile"], { username: USERNAME, hash: profileHash });
	} else console.log("Profile not updated");

	console.log("Federation finished!");
}

async function backfill(ctx: Context<unknown>, recipients: Recipient[]) {
  const actorUri = ctx.getActorUri(USERNAME);
	for (const { dir, date, post } of postIterator({ ascending: true })) {
		const article = postToArticle(ctx, { dir, date, post });
		console.log(`Creating post ${article.id!.href}...`);
		await ctx.sendActivity({ identifier: USERNAME }, recipients, new Create({
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
	const proto = req.header("x-forwarded-proto");
	const host = req.header("x-forwarded-host");
	if (!host || !proto) return;
	const url = new URL(req.url, `${proto}://${host}`);
	req = new Request(url.toString(), req as unknown as Request) as unknown as typeof req;
	if (!synced) {
		synced = true;
		sync(req as unknown as Request).catch(err => {
			console.error("Failed to sync posts:", err);
			synced = false;
		});
	}
}));