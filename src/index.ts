import "dotenv/config";
import express from "express";
import * as fs from "fs";
import { AddressInfo } from "net";
import * as path from "path";
import { generateFeed, generateLatest, generatePostArray, postIterator } from "./util";
import compression from "compression";
import sirv from "sirv";
import { renderIndexPage } from "./ssr";
import { incrementVisit } from "./db";
import { dataDir, debugFlag, donateAbout, port, redirectAbout } from "./constants";

fs.mkdirSync(dataDir, { recursive: true });

const app = express();
export { app };

app.use(compression());
app.use("/", sirv("./public", { extensions: [], dev: debugFlag }));

app.get("/p/latest", (_req, res) => {
	const post = postIterator().next().value!;
	res.redirect(`/p/${path.relative(dataDir, post.dir)}`);
});

app.get("/p/:year/:month/:day/:post", async (req, res) => {
	const relDir = path.join(req.params.year, req.params.month, req.params.day, req.params.post);
	const file = path.join(dataDir, relDir, "index.html");
	if (fs.existsSync(file)) {
		if (!fs.existsSync(path.join(path.dirname(file), ".hidden")) && req.headers["sec-fetch-dest"] != "iframe")
			await incrementVisit(relDir);
		res.sendFile(path.resolve(__dirname, "..", file));
	} else res.sendFile(path.join(__dirname, "../public/errors/404.html"));
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
	res.sendFile(path.join(__dirname, "../public", "new.html"));
});

app.get("/edit/:year/:month/:day/:post", (_req, res) => {
	res.sendFile(path.join(__dirname, "../public", "edit.html"));
});

app.get("/delete/:year/:month/:day/:post", (_req, res) => {
	res.sendFile(path.join(__dirname, "../public", "delete.html"));
});

const HTML = {
	index: fs.readFileSync("./public/index.html", "utf8"),
}

app.get("/", async (_req, res) => {
	res.send(renderIndexPage(HTML.index, generateLatest(), await generatePostArray()));
});

const server = app.listen(port, () => {
	console.log(`App listening on port ${(<AddressInfo>server.address()).port}`);
});