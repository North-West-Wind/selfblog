import { app } from ".";
import { integrateFederation } from "@fedify/express";
import { createFederation } from "@fedify/fedify";
import Database from "better-sqlite3";
import { SqliteKvStore } from "@fedify/sqlite";
import { Person } from "@fedify/vocab";

const USERNAME = process.env.AP_USERNAME;
const DISPLAYNAME = process.env.AP_DISPLAYNAME;
const SUMMARY = process.env.AP_SUMMARY;

const db = new Database("data/fedify.db");
const federation = createFederation<void>({
	kv: new SqliteKvStore(db)
});

federation.setActorDispatcher("/users/{identifier}", async (ctx, id) => {
	if (id !== USERNAME) return null;
	return new Person({
		id: ctx.getActorUri(id),
		name: DISPLAYNAME,
		summary: SUMMARY,
		preferredUsername: id,
		url: new URL("/", ctx.url)
	});
});

app.set("trust proxy", true);
app.use(integrateFederation(federation, () => undefined));