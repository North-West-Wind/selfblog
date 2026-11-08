import express from "express";
import { app } from ".";
import { genSaltSync, hashSync } from "bcryptjs";
import fs from "fs";
import path from "path";
import { generatePostArray } from "./util";
import { dataDir, password } from "./constants";
import isTextPath from "is-text-path";
import { getCommentsByPostPath, syncDatabase } from "./db";

const ap = import("./activitypub");

const saltHolder = {
	salt: genSaltSync(),
	bestBefore: Date.now() + 60000
};

function saltJson() {
	if (Date.now() > saltHolder.bestBefore) {
		saltHolder.salt = genSaltSync();
		saltHolder.bestBefore = Date.now() + 60000;
	}
	return saltHolder;
}

app.use("/api", express.json());

app.use("/api", (req, res, next) => {
	if (req.method != "GET") {
		if (!req.headers.authorization) return res.sendStatus(400);
		const clientHash = req.headers.authorization;
		const serverHash = hashSync(password, saltJson().salt);
		if (clientHash != serverHash) return res.sendStatus(403);
	}
	next();
});

app.get("/api/salt", (_req, res) => {
	res.json(saltJson());
});

app.get("/api/list", async (req, res) => {
	const limit = parseInt(<string> req.query.limit) || 0;
	res.json(await generatePostArray(limit));
});

app.post("/api/new", (req, res) => {
	if (!req.body?.title || !req.body.date) {
		res.sendStatus(400);
		return;
	}
	const date = new Date(req.body.date);
	const title = (req.body.title as string).split(" ").slice(0, 5).join("-").replace(/[^a-z0-9-]/gi, "").toLowerCase();
	const dir = path.join(dataDir, date.getFullYear().toString(), (date.getMonth() + 1).toString().padStart(2, "0"), date.getDate().toString().padStart(2, "0"), title);
	fs.mkdirSync(dir, { recursive: true });
	if (!fs.existsSync(path.join(dir, "index.html"))) {
		fs.cpSync(path.join("public", "template.html"), path.join(dir, "index.html"));
		const content = fs.readFileSync(path.join(dir, "index.html"), { encoding: "utf8" });
		fs.writeFileSync(path.join(dir, "index.html"), content
			.replace(/{date}/g, `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`)
			.replace(/{title}/g, req.body.title)
		);
		// hidden by default
		fs.writeFileSync(path.join(dir, ".hidden"), "");
	}
	res.json({ url: `/edit/${[date.getFullYear().toString(), (date.getMonth() + 1).toString().padStart(2, "0"), date.getDate().toString().padStart(2, "0"), title].join("/")}` });
});

app.get("/api/edit/:year/:month/:day/:post/files", (req, res) => {
	const dir = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post);
	if (!fs.existsSync(dir)) {
		res.sendStatus(404);
		return;
	}
	const files: { name: string, type: "txt" | "bin" }[] = [];
	for (const file of fs.readdirSync(dir)) {
		if (isTextPath(path.join(dir, file))) files.push({ name: file, type: "txt" });
		else files.push({ name: file, type: "bin" });
	}
	res.json(files);
});

app.post("/api/edit/:year/:month/:day/:post/new", (req, res) => {
	if (!req.body?.name) {
		res.sendStatus(400);
		return;
	}
	const file = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post, req.body.name);
	if (!fs.existsSync(file)) fs.createWriteStream(file).end();
	res.sendStatus(200);
});

app.post("/api/edit/:year/:month/:day/:post/rename", (req, res) => {
	if (!req.body?.name) {
		res.sendStatus(400);
		return;
	}
	const dir = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post);
	if (!fs.existsSync(dir)) {
		res.sendStatus(404);
		return;
	}
	const title = (req.body.name as string).split(" ").slice(0, 5).join("-").replace(/[^a-z0-9-]/gi, "").toLowerCase();
	fs.renameSync(dir, path.join(dataDir, req.params.year, req.params.month, req.params.day, title));
	res.send(title);
});

app.post("/api/edit/:year/:month/:day/:post/upload", (req, res) => {
	const files = req.body as { name: string, data: string }[];
	if (!files.length) {
		res.sendStatus(400);
		return;
	}
	const dir = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post);
	// Check if overwrite
	for (const file of files) {
		if (fs.existsSync(path.join(dir, file.name))) {
			res.sendStatus(400);
			return;
		}
	}
	// Write files
	for (const file of files)
		fs.writeFileSync(path.join(dir, file.name), file.data, "base64");
	res.sendStatus(200);
});

app.post("/api/edit/:year/:month/:day/:post/publish", (req, res) => {
	const dir = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post);
	const hiddenFile = path.join(dir, ".hidden");
	if (!fs.existsSync(hiddenFile)) {
		res.sendStatus(404);
		return;
	}
	fs.rmSync(hiddenFile);
	res.sendStatus(200);
	// Sync database, then sync activitypub
	syncDatabase().then(() => ap).then(({ sync }) => sync(req as unknown as Request)).catch(err => console.error("Failed to sync posts:", err));
});

app.get("/api/edit/:year/:month/:day/:post/:file", (req, res) => {
	const file = path.join(__dirname , "..", dataDir, req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) res.sendStatus(404);
	else res.sendFile(file);
});

app.post("/api/edit/:year/:month/:day/:post/:file", (req, res) => {
	if (typeof req.body?.code != "string") {
		res.sendStatus(400);
		return;
	}
	const file = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) {
		res.sendStatus(404);
		return;
	}
	fs.writeFileSync(file, req.body.code);
	res.sendStatus(200);
});

app.patch("/api/edit/:year/:month/:day/:post/:file", (req, res) => {
	if (!req.body?.name) {
		res.sendStatus(400);
		return;
	}
	const file = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) {
		res.sendStatus(404);
		return;
	}
	fs.renameSync(file, path.join(__dirname , "../data", req.params.year, req.params.month, req.params.day, req.params.post, req.body.name));
	res.sendStatus(200);
});

app.delete("/api/edit/:year/:month/:day/:post/:file", (req, res) => {
	const file = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) {
		res.sendStatus(404);
		return;
	}
	fs.rmSync(file);
	res.sendStatus(200);
});

app.delete("/api/delete/:year/:month/:day/:post", (req, res) => {
	const dir = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post);
	if (!fs.existsSync(dir)) {
		res.sendStatus(404);
		return;
	}
	fs.rmSync(dir, { recursive: true });
	res.sendStatus(200);
});

app.get("/api/comments/:year/:month/:day/:post", async (req, res) => {
	const comments = await getCommentsByPostPath(path.join(req.params.year, req.params.month, req.params.day, req.params.post));
	if (!comments) {
		res.sendStatus(404);
		return;
	}
	res.json(comments.map(comment => comment.comments));
});