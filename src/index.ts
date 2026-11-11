import "dotenv/config";
import express from "express";
import * as fs from "fs";
import { AddressInfo } from "net";
import * as path from "path";
import { generateFeed, generateLatest, generatePostArray, postIterator } from "./util";
import compression from "compression";
import sirv from "sirv";
import { renderDeletePage, renderEditPage, renderIndexPage, renderNewPage, renderPostPage } from "./ssr";
import { incrementVisit } from "./db";
import { dataDir, debugFlag, donateAbout, port, redirectAbout } from "./constants";

fs.mkdirSync(dataDir, { recursive: true });

const app = express();
export { app };

app.use(compression());
app.use("/", sirv("./public", { extensions: [], dev: debugFlag }));

import("./api");

app.get("/p/latest", (_req, res) => {
	const post = postIterator().next().value!;
	res.redirect(`/p/${path.relative(dataDir, post.dir)}`);
});

app.get("/p/:year/:month/:day/:post", async (req, res) => {
	const relDir = path.join(req.params.year, req.params.month, req.params.day, req.params.post);
	const mdFile = path.join(dataDir, relDir, "index.md");
	const insideFrame = req.headers["sec-fetch-dest"] == "iframe";
	let html: string;
	if (fs.existsSync(mdFile)) {
		if (!fs.existsSync(path.join(dataDir, relDir, ".hidden")) && !insideFrame)
			await incrementVisit(relDir);
		html = renderPostPage(req.path, insideFrame, fs.readFileSync(mdFile, "utf8"));
	} else html = renderPostPage(req.path, insideFrame);
	res.send(html);
});

app.get("/p/:year/:month/:day/:post/:file", (req, res) => {
	res.sendFile(path.resolve(__dirname, "..", dataDir, req.params.year, req.params.month, req.params.day, req.params.post, req.params.file));
});

app.get("/rss", (req, res) => {
	res.setHeader("Content-Disposition", "attachment; filename=\"northwestblog.rss\"");
	res.send(generateFeed(`${req.protocol}://${req.headers.host}`, parseInt(<string> req.query.limit) || 0).rss2());
});

app.get("/about", (_req, res) => {
	res.redirect(redirectAbout || "/");
});

app.get("/donate", (_req, res) => {
	res.redirect(donateAbout || "/");
});

app.get("/new", (_req, res) => {
	res.send(renderNewPage());
});

app.get("/edit/:year/:month/:day/:post", (_req, res) => {
	res.send(renderEditPage());
});

app.get("/edit/:year/:month/:day/:post/:file", (req, res) => {
	const file = path.join(__dirname , "..", dataDir, req.params.year, req.params.month, req.params.day, req.params.post, req.params.file);
	if (!fs.existsSync(file)) res.sendStatus(404);
	else res.sendFile(file);
});

app.get("/delete/:year/:month/:day/:post", (_req, res) => {
	res.send(renderDeletePage());
});

app.get("/", async (_req, res) => {
	res.send(renderIndexPage(generateLatest(), await generatePostArray()));
});

const server = app.listen(port, () => {
	console.log(`App listening on port ${(<AddressInfo>server.address()).port}`);
});