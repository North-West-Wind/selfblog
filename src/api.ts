import express from "express";
import { app } from ".";
import { genSaltSync, hashSync } from "bcryptjs";
import fs from "fs";
import path from "path";
import { generatePostArray } from "./util";
import { apUsername, dataDir, password } from "./constants";
import { getCommentsByPostPath, syncDatabase } from "./db";
import moment from "moment";
import z from "zod";
import templateMd from "./assets/template.md";

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

// Create new post
app.post("/api/new", express.json(), (req, res) => {
	const parsed = z.object({ title: z.string(), date: z.iso.date() }).safeParse(req.body);
	if (!parsed.success) return res.sendStatus(400);
	const body = parsed.data;
	const date = moment(body.date);
	const title = body.title.split(" ").slice(0, 5).join("-").replace(/[^a-z0-9-]/gi, "").toLowerCase();
	const dir = path.join(dataDir, date.format("YYYY/MM/DD"), title);
	fs.mkdirSync(dir, { recursive: true });
	if (!fs.existsSync(path.join(dir, "index.md"))) {
		fs.writeFileSync(path.join(dir, "index.md"), templateMd
			.replace(/{date}/g, date.format("YYYY-MM-DD"))
			.replace(/{title}/g, body.title)
		);
		// hidden by default
		fs.writeFileSync(path.join(dir, ".hidden"), "");
	}
	res.send(`/edit/${date.format("YYYY/MM/DD")}/${title}`);
});

// Get file list
app.get("/api/edit/:year/:month/:day/:post/files", (req, res) => {
	const dir = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post);
	if (!fs.existsSync(dir)) {
		res.sendStatus(404);
		return;
	}
	res.send(fs.readdirSync(dir).join("\n"));
});

// Get file content
app.get("/api/edit/:year/:month/:day/:post/file/:file", (req, res) => {
	const file = path.join(__dirname , "..", dataDir, req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) res.sendStatus(404);
	else res.sendFile(file);
});

// Upload a file
app.post("/api/edit/:year/:month/:day/:post/file/:name", express.raw({ limit: "1gb" }), async (req, res) => {
	const filePath = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post, req.params.name);
	// Check if overwrite
	if (fs.existsSync(filePath)) {
		res.sendStatus(400);
		return;
	}
	fs.writeFileSync(filePath, req.body);
	res.sendStatus(200);
});

// Rename a file
app.patch("/api/edit/:year/:month/:day/:post/file/:name", express.text(), (req, res) => {
	const dir = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post);
	// Check if exists
	if (!fs.existsSync(path.join(dir, req.params.name))) return res.sendStatus(404);
	// Rename file
	fs.renameSync(path.join(dir, req.params.name), path.join(dir, req.body));
	res.sendStatus(200);
});

// Delete a file
app.delete("/api/edit/:year/:month/:day/:post/file/:file", (req, res) => {
	if (req.params.file == ".hidden") return res.sendStatus(400);
	const file = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) {
		res.sendStatus(404);
		return;
	}
	fs.rmSync(file);
	res.sendStatus(200);
});

// Save main markdown file of post
app.post("/api/edit/:year/:month/:day/:post/save", express.text(), (req, res) => {
	const file = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post, "index.md");
	fs.writeFileSync(file, req.body);
	res.sendStatus(200);
});

// Rename post and path
app.patch("/api/edit/:year/:month/:day/:post/rename", express.text(), (req, res) => {
	const dir = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post);
	if (!fs.existsSync(dir)) {
		res.sendStatus(404);
		return;
	}
	const title = (req.body as string).split(" ").slice(0, 5).join("-").replace(/[^a-z0-9-]/gi, "").toLowerCase();
	fs.renameSync(dir, path.join(dataDir, req.params.year, req.params.month, req.params.day, title));
	res.send(title);
});

// Publish the post
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

// Delete the post
app.delete("/api/delete/:year/:month/:day/:post", (req, res) => {
	const dir = path.join(dataDir, req.params.year, req.params.month, req.params.day, req.params.post);
	if (!fs.existsSync(dir)) {
		res.sendStatus(404);
		return;
	}
	fs.rmSync(dir, { recursive: true });
	res.sendStatus(200);
});

// Get comment of the post
app.get("/api/comments/:year/:month/:day/:post", async (req, res) => {
	const comments = await getCommentsByPostPath(path.join(req.params.year, req.params.month, req.params.day, req.params.post));
	if (!comments) {
		res.sendStatus(404);
		return;
	}
	res.json(comments.map(comment => comment.comments));
});

app.get("/api/activitypub", (_req, res) => {
	res.send(apUsername);
});