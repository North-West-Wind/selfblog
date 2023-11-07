import "dotenv/config";
import express from "express";
import fileUpload, { UploadedFile } from "express-fileupload";
import * as fs from "fs";
import isTextPath from "is-text-path";
import { AddressInfo } from "net";
import * as path from "path";
import sanitize from "sanitize-filename";

if (!fs.existsSync("data")) fs.mkdirSync("data");

const app = express();
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());
app.use(fileUpload());

app.get("/p/latest", (_req, res) => {
	const year = fs.readdirSync("data").sort().pop();
	if (!year) return res.sendStatus(404);
	const month = fs.readdirSync(path.join("data", year)).sort().pop();
	if (!month) return res.sendStatus(404);
	const day = fs.readdirSync(path.join("data", year, month)).sort().pop();
	if (!day) return res.sendStatus(404);
	const dir = path.join("data", year, month, day);
	const post = fs.readdirSync(dir).map(v => ({ name:v, time:fs.statSync(path.join(dir, v)).mtime.getTime() })).sort((a, b) => a.time - b.time).pop()?.name;
	if (!post) return res.sendStatus(404);
	res.redirect(`/p/${year}/${month}/${day}/${post}`);
});

app.get("/p/:year/:month/:day/:post", (req, res) => {
	const file = path.join(__dirname, "../data", req.params.year, req.params.month, req.params.day, req.params.post, "index.html");
	if (fs.existsSync(file)) res.sendFile(path.join(__dirname, "../data", req.params.year, req.params.month, req.params.day, req.params.post, "index.html"));
	else res.sendFile(path.join(__dirname, "../public/errors/404.html"));
});

app.get("/p/:year/:month/:day/:post/:file", (req, res) => {
	res.sendFile(path.join(__dirname, "../data", req.params.year, req.params.month, req.params.day, req.params.post, req.params.file));
});

app.get("/api/list", (req, res) => {
	const limit = parseInt(<string> req.query.limit) || 0;
	const posts: { title: string, url: string }[] = [];
	for (const year of fs.readdirSync("data")) {
		for (const month of fs.readdirSync(path.join("data", year))) {
			for (const day of fs.readdirSync(path.join("data", year, month))) {
				const dir = path.join("data", year, month, day);
				for (const post of fs.readdirSync(dir).map(v => ({ name:v, time:fs.statSync(path.join(dir, v)).mtime.getTime() })).sort((a, b) => a.time - b.time).map(v => v.name)) {
					if (fs.existsSync(path.join(dir, post, "index.html"))) {
						const html = fs.readFileSync(path.join(dir, post, "index.html"), { encoding: "utf8" });
						const matched = html.match(/<title>(?<title>.*)<\/title>/);
						let title = `${year}/${month}/${day}`;
						if (matched?.groups?.title) title += ` - ${matched?.groups?.title}`;
						posts.push({ title, url: `/p/${year}/${month}/${day}/${post}` });
						if (limit && posts.length >= limit) return res.json(posts);
					}
				}
			}
		}
	}
	res.json(posts);
});

app.post("/api/new", (req, res) => {
	if (!req.headers.authorization?.startsWith("Bearer ") || !req.body?.title || !req.body.date) return res.sendStatus(400);
	if (req.headers.authorization.slice(7) !== process.env.PASSWORD) return res.sendStatus(403);
	const date = new Date(req.body.date);
	const title = sanitize(req.body.title.split(" ").slice(0, 5).join(" ").toLowerCase(), { replacement: "-" });
	const dir = path.join("data", date.getFullYear().toString(), (date.getMonth() + 1).toString().padStart(2, "0"), date.getDate().toString().padStart(2, "0"), title);
	fs.mkdirSync(dir, { recursive: true });
	if (!fs.existsSync(path.join(dir, "index.html"))) {
		fs.cpSync(path.join("public", "template.html"), path.join(dir, "index.html"));
		const content = fs.readFileSync(path.join(dir, "index.html"), { encoding: "utf8" });
		fs.writeFileSync(path.join(dir, "index.html"), content.replace("{date}", [date.getFullYear().toString(), (date.getMonth() + 1).toString().padStart(2, "0"), date.getDate().toString().padStart(2, "0")].join("-")))
	}
	res.json({ url: `/edit/${[date.getFullYear().toString(), (date.getMonth() + 1).toString().padStart(2, "0"), date.getDate().toString().padStart(2, "0"), title].join("/")}` });
});

app.get("/api/edit/:year/:month/:day/:post/files", (req, res) => {
	if (!req.headers.authorization?.startsWith("Bearer ")) return res.sendStatus(400);
	if (req.headers.authorization.slice(7) !== process.env.PASSWORD) return res.sendStatus(403);
	const dir = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post);
	if (!fs.existsSync(dir)) return res.sendStatus(404);
	const files: { name: string, type: "txt" | "bin" }[] = [];
	for (const file of fs.readdirSync(dir)) {
		if (isTextPath(path.join(dir, file))) files.push({ name: file, type: "txt" });
		else files.push({ name: file, type: "bin" });
	}
	res.json(files);
});

app.post("/api/edit/:year/:month/:day/:post/new", (req, res) => {
	if (!req.headers.authorization?.startsWith("Bearer ") || !req.body?.name) return res.sendStatus(400);
	if (req.headers.authorization.slice(7) !== process.env.PASSWORD) return res.sendStatus(403);
	const file = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post, req.body.name);
	if (!fs.existsSync(file)) fs.createWriteStream(file).end();
	res.sendStatus(200);
});

app.post("/api/edit/:year/:month/:day/:post/rename", (req, res) => {
	console.log(req.body);
	if (!req.headers.authorization?.startsWith("Bearer ") || !req.body?.name) return res.sendStatus(400);
	if (req.headers.authorization.slice(7) !== process.env.PASSWORD) return res.sendStatus(403);
	const dir = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post);
	if (!fs.existsSync(dir)) return res.sendStatus(404);
	const title = sanitize(req.body.name.split(" ").slice(0, 5).join(" ").toLowerCase(), { replacement: "-" });
	fs.renameSync(dir, path.join("data", req.params.year, req.params.month, req.params.day, title));
	res.send(title);
});

app.post("/api/edit/:year/:month/:day/:post/upload", (req, res) => {
	if (!req.body?.password || !req.files?.file) return res.sendStatus(400);
	if (req.body.password !== process.env.PASSWORD) return res.sendStatus(403);
	const uploaded = <UploadedFile> req.files.file;
	uploaded.mv(path.join("data", req.params.year, req.params.month, req.params.day, req.params.post, uploaded.name), err => {
		if (err) return res.sendStatus(500);
		res.sendStatus(200);
	});
});

app.get("/api/edit/:year/:month/:day/:post/:file", (req, res) => {
	if (!req.headers.authorization?.startsWith("Bearer ")) return res.sendStatus(400);
	if (req.headers.authorization.slice(7) !== process.env.PASSWORD) return res.sendStatus(403);
	const file = path.join(__dirname , "../data", req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) return res.sendStatus(404);
	return res.sendFile(file);
});

app.post("/api/edit/:year/:month/:day/:post/:file", (req, res) => {
	if (!req.headers.authorization?.startsWith("Bearer ") || !req.body?.code) return res.sendStatus(400);
	if (req.headers.authorization.slice(7) !== process.env.PASSWORD) return res.sendStatus(403);
	const file = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) return res.sendStatus(404);
	fs.writeFileSync(file, req.body.code);
	return res.sendStatus(200);
});

app.patch("/api/edit/:year/:month/:day/:post/:file", (req, res) => {
	if (!req.headers.authorization?.startsWith("Bearer ") || !req.body?.name) return res.sendStatus(400);
	if (req.headers.authorization.slice(7) !== process.env.PASSWORD) return res.sendStatus(403);
	const file = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) return res.sendStatus(404);
	if (sanitize(req.body.name) !== req.body.name) return res.sendStatus(400);
	fs.renameSync(file, path.join(__dirname , "../data", req.params.year, req.params.month, req.params.day, req.params.post, req.body.name));
	return res.sendStatus(200);
});

app.delete("/api/edit/:year/:month/:day/:post/:file", (req, res) => {
	if (!req.headers.authorization?.startsWith("Bearer ")) return res.sendStatus(400);
	if (req.headers.authorization.slice(7) !== process.env.PASSWORD) return res.sendStatus(403);
	const file = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) return res.sendStatus(404);
	fs.rmSync(file);
	res.sendStatus(200);
});

app.delete("/api/delete/:year/:month/:day/:post", (req, res) => {
	if (!req.headers.authorization?.startsWith("Bearer ")) return res.sendStatus(400);
	if (req.headers.authorization.slice(7) !== process.env.PASSWORD) return res.sendStatus(403);
	const dir = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post);
	if (!fs.existsSync(dir)) return res.sendStatus(404);
	fs.rmSync(dir, { recursive: true });
	res.sendStatus(200);
});

app.get("/about", (_req, res) => {
	res.redirect(process.env.ABOUT_REDIRECT || "/");
});

app.get("/list", (_req, res) => {
	res.sendFile(path.join(__dirname, "../public", "list.html"));
});

app.get("/new", (_req, res) => {
	res.sendFile(path.join(__dirname, "../public", "new.html"));
});

app.get("/edit/:year/:month/:day/:post", (_req, res) => {
	res.sendFile(path.join(__dirname, "../public", "edit.html"));
});

app.get("/delete/:year/:month/:day/:post", (_req, res) => {
	res.sendFile(path.join(__dirname, "../public", "delete.html"));
});

app.get("/", (_req, res) => {
	res.sendFile(path.join(__dirname, "../public", "index.html"));
});

const server = app.listen(process.env.PORT || 3000, () => {
	console.log(`App listening on port ${(<AddressInfo>server.address()).port}`);
});