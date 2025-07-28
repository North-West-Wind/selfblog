import "dotenv/config";
import express from "express";
import * as fs from "fs";
import isTextPath from "is-text-path";
import { AddressInfo } from "net";
import * as path from "path";
import { checkAuth, generateFeed, generateLatest, generatePostArray } from "./util";
import compression from "compression";
import sirv from "sirv";
import { renderIndexPage, renderListPage } from "./ssr";
import multer from "multer";
import { incrementVisit } from "./db";

if (!fs.existsSync("data")) fs.mkdirSync("data");

const app = express();
app.use(compression());
app.use("/", sirv("./public", { extensions: [] }));
app.use(express.json());
app.use(multer({ dest: "data/" }).single("file"));

app.get("/p/latest", (_req, res) => {
	const item = generateFeed("", 1).items[0];
	const year = item.date.getFullYear();
	const month = (item.date.getMonth() + 1).toString().padStart(2, "0");
	const day = item.date.getDate().toString().padStart(2, "0");
	res.redirect(`/p/${year}/${month}/${day}/${item.id?.split("/").pop()}`);
});

app.get("/p/:year/:month/:day/:post", (req, res) => {
	const file = path.join(__dirname, "../data", req.params.year, req.params.month, req.params.day, req.params.post, "index.html");
	if (fs.existsSync(file)) {
		if (!fs.existsSync(path.join(path.dirname(file), ".hidden")) && req.headers["sec-fetch-dest"] != "iframe")
			incrementVisit(req.params.year, req.params.month, req.params.day, req.params.post);
		res.sendFile(file);
	} else res.sendFile(path.join(__dirname, "../public/errors/404.html"));
});

app.get("/p/:year/:month/:day/:post/:file", (req, res) => {
	res.sendFile(path.join(__dirname, "../data", req.params.year, req.params.month, req.params.day, req.params.post, req.params.file));
});

app.get("/api/list", (req, res) => {
	const limit = parseInt(<string> req.query.limit) || 0;
	res.json(generatePostArray(limit));
});

app.post("/api/new", (req, res) => {
	const auth = checkAuth(req);
	if (auth != 200) {
		res.sendStatus(auth);
		return;
	}
	if (!req.body?.title || !req.body.date) {
		res.sendStatus(400);
		return;
	}
	const date = new Date(req.body.date);
	const title = (req.body.title as string).split(" ").slice(0, 5).join("-").replace(/[^a-z0-9-]/gi, "").toLowerCase();
	const dir = path.join("data", date.getFullYear().toString(), (date.getMonth() + 1).toString().padStart(2, "0"), date.getDate().toString().padStart(2, "0"), title);
	fs.mkdirSync(dir, { recursive: true });
	if (!fs.existsSync(path.join(dir, "index.html"))) {
		fs.cpSync(path.join("public", "template.html"), path.join(dir, "index.html"));
		const content = fs.readFileSync(path.join(dir, "index.html"), { encoding: "utf8" });
		fs.writeFileSync(path.join(dir, "index.html"), content
			.replace("{date}", [date.getFullYear().toString(), (date.getMonth() + 1).toString().padStart(2, "0"), date.getDate().toString().padStart(2, "0")].join("-"))
			.replace(/{title}/g, req.body.title)
		);
		// hidden by default
		fs.writeFileSync(path.join(dir, ".hidden"), "");
	}
	res.json({ url: `/edit/${[date.getFullYear().toString(), (date.getMonth() + 1).toString().padStart(2, "0"), date.getDate().toString().padStart(2, "0"), title].join("/")}` });
});

app.get("/api/edit/:year/:month/:day/:post/files", (req, res) => {
	const auth = checkAuth(req);
	if (auth != 200) {
		res.sendStatus(auth);
		return;
	}
	const dir = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post);
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
	const auth = checkAuth(req);
	if (auth != 200) {
		res.sendStatus(auth);
		return;
	}
	if (!req.body?.name) {
		res.sendStatus(400);
		return;
	}
	const file = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post, req.body.name);
	if (!fs.existsSync(file)) fs.createWriteStream(file).end();
	res.sendStatus(200);
});

app.post("/api/edit/:year/:month/:day/:post/rename", (req, res) => {
	const auth = checkAuth(req);
	if (auth != 200) {
		res.sendStatus(auth);
		return;
	}
	if (!req.body?.name) {
		res.sendStatus(400);
		return;
	}
	const dir = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post);
	if (!fs.existsSync(dir)) {
		res.sendStatus(404);
		return;
	}
	const title = (req.body.name as string).split(" ").slice(0, 5).join("-").replace(/[^a-z0-9-]/gi, "").toLowerCase();
	fs.renameSync(dir, path.join("data", req.params.year, req.params.month, req.params.day, title));
	res.send(title);
});

app.post("/api/edit/:year/:month/:day/:post/upload", (req, res) => {
	const auth = checkAuth(req, true);
	if (auth != 200) {
		res.sendStatus(auth);
		return;
	}
	if (!req.file) {
		res.sendStatus(400);
		return;
	}
	const uploaded = <Express.Multer.File> req.file;
	fs.rename(uploaded.path, path.join("data", req.params.year, req.params.month, req.params.day, req.params.post, uploaded.originalname), err => {
		if (err) return res.sendStatus(500);
		res.sendStatus(200);
	});
});

app.get("/api/edit/:year/:month/:day/:post/:file", (req, res) => {
	const auth = checkAuth(req);
	if (auth != 200) {
		res.sendStatus(auth);
		return;
	}
	const file = path.join(__dirname , "../data", req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) res.sendStatus(404);
	else res.sendFile(file);
});

app.post("/api/edit/:year/:month/:day/:post/:file", (req, res) => {
	const auth = checkAuth(req);
	if (auth != 200) {
		res.sendStatus(auth);
		return;
	}
	if (typeof req.body?.code != "string") {
		res.sendStatus(400);
		return;
	}
	const file = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) {
		res.sendStatus(404);
		return;
	}
	fs.writeFileSync(file, req.body.code);
	res.sendStatus(200);
});

app.patch("/api/edit/:year/:month/:day/:post/:file", (req, res) => {
	const auth = checkAuth(req);
	if (auth != 200) {
		res.sendStatus(auth);
		return;
	}
	if (!req.body?.name) {
		res.sendStatus(400);
		return;
	}
	const file = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) {
		res.sendStatus(404);
		return;
	}
	fs.renameSync(file, path.join(__dirname , "../data", req.params.year, req.params.month, req.params.day, req.params.post, req.body.name));
	res.sendStatus(200);
});

app.delete("/api/edit/:year/:month/:day/:post/:file", (req, res) => {
	const auth = checkAuth(req);
	if (auth != 200) {
		res.sendStatus(auth);
		return;
	}
	const file = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) {
		res.sendStatus(404);
		return;
	}
	fs.rmSync(file);
	res.sendStatus(200);
});

app.delete("/api/delete/:year/:month/:day/:post", (req, res) => {
	const auth = checkAuth(req);
	if (auth != 200) {
		res.sendStatus(auth);
		return;
	}
	const dir = path.join("data", req.params.year, req.params.month, req.params.day, req.params.post);
	if (!fs.existsSync(dir)) {
		res.sendStatus(404);
		return;
	}
	fs.rmSync(dir, { recursive: true });
	res.sendStatus(200);
});

app.get("/rss", (req, res) => {
	res.setHeader("Content-Disposition", "attachment; filename=\"northwestblog.rss\"");
	res.send(generateFeed(`${req.protocol}://${req.headers.host}`, parseInt(<string> req.query.limit) || 0).rss2());
});

app.get("/about", (_req, res) => {
	res.redirect(process.env.ABOUT_REDIRECT || "/");
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

const HTML = {
	list: fs.readFileSync("./public/list.html", "utf8"),
	index: fs.readFileSync("./public/index.html", "utf8"),
}

app.get("/list", (_req, res) => {
	res.send(renderListPage(HTML.list, generatePostArray()));
});

app.get("/", (_req, res) => {
	res.send(renderIndexPage(HTML.index, generateLatest(), generatePostArray(10)));
});

const server = app.listen(process.env.PORT || 3000, () => {
	console.log(`App listening on port ${(<AddressInfo>server.address()).port}`);
});