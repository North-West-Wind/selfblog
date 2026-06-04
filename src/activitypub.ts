import { app } from ".";
import { integrateFederation } from "@fedify/express";
import { createFederation, exportJwk, generateCryptoKeyPair, importJwk } from "@fedify/fedify";
import { SqliteKvStore } from "@fedify/sqlite";
import { Accept, Follow, Person, Undo } from "@fedify/vocab";
import { json } from "express";
import { DatabaseSync } from "node:sqlite";

const USERNAME = process.env.AP_USERNAME;
const DISPLAYNAME = process.env.AP_DISPLAYNAME;
const SUMMARY = process.env.AP_SUMMARY;

const db = new DatabaseSync("data/fedify.db");
const kv = new SqliteKvStore(db);
const federation = createFederation<void>({ kv });

federation.setActorDispatcher("/users/{identifier}", async (ctx, id) => {
	if (id !== USERNAME) return null;
	return new Person({
		id: ctx.getActorUri(id),
		name: DISPLAYNAME,
		summary: SUMMARY,
		preferredUsername: id,
		url: new URL("/", ctx.url),
		inbox: ctx.getInboxUri(id),
		publicKeys: (await ctx.getActorKeyPairs(id)).map(pair => pair.cryptographicKey)
	});
}).setKeyPairsDispatcher(async (_ctx, id) => {
	if (id != USERNAME) return [];
	const entry = await kv.get<{ privateKey: JsonWebKey, publicKey: JsonWebKey }>(["key"]);
	if (!entry?.privateKey || !entry.publicKey) {
		const { privateKey, publicKey } = await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");
		await kv.set(["key"], { privateKey: await exportJwk(privateKey), publicKey: await exportJwk(publicKey) });
		return [{ privateKey, publicKey }];
	}
	const privateKey = await importJwk(entry.privateKey, "private");
	const publicKey = await importJwk(entry.publicKey, "public");
	return [{ privateKey, publicKey }];
});

federation
	.setInboxListeners("/users/{identifier}/inbox")
	.on(Follow, async (ctx, follow) => {
		console.log(follow);
		if (follow.id == null || follow.actorId == null || follow.objectId == null) return;
		const parsed = ctx.parseUri(follow.objectId);
		if (parsed?.type !== "actor" || parsed.identifier !== USERNAME) return;
		const follower = await follow.getActor(ctx);
		console.debug(follower);
		if (follower == null) return;
		await ctx.sendActivity({ identifier: parsed.identifier }, follower, new Accept({ actor: follow.objectId, object: follow }));
		console.log(follow.actorId.href);
		await kv.set(["followers", follow.id.href], follow.actorId.href);
	})
	.on(Undo, async (ctx, undo) => {
		const object = await undo.getObject();
		if (!(object instanceof Follow) || undo.actorId == null || object.objectId == null) return;
		const parsed = ctx.parseUri(object.objectId);
		if (parsed?.type !== "actor" || parsed.identifier !== USERNAME) return;
		const undoer = await undo.getActor(ctx);
		if (undoer == null) return;
		await ctx.sendActivity({ identifier: parsed.identifier }, undoer, new Accept({ actor: undo.objectId, object: undo }));
		console.log(undo.actorId.href);
		await kv.delete(["followers", undo.actorId.href]);
	}).onError((_ctx, err) => {
		console.error("Error in inbox listener:", err);
	});

app.set("trust proxy", true);
app.use(integrateFederation(federation, () => void 0));

app.get("/api/followers", async (_req, res) => {
	const list: string[] = [];
	for await (const { key, value } of kv.list(["followers"]))
		list.push(value as string);
	res.json(list);
});