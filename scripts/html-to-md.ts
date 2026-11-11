import "dotenv/config";
import { load } from "cheerio";
import fs from "fs";
import { NodeHtmlMarkdown } from "node-html-markdown";
import path from "path";

const dataDir = process.env.DATA_DIR || "data";

for (const year of fs.readdirSync(dataDir).filter(dir => fs.statSync(path.join(dataDir, dir)).isDirectory())) {
	const yearPath = path.join(dataDir, year);
	for (const month of fs.readdirSync(yearPath).filter(dir => fs.statSync(path.join(yearPath, dir)).isDirectory())) {
		const monthPath = path.join(yearPath, month);
		for (const day of fs.readdirSync(monthPath).filter(dir => fs.statSync(path.join(monthPath, dir)).isDirectory())) {
			const dayPath = path.join(monthPath, day);
			for (const post of fs.readdirSync(dayPath).filter(dir => fs.statSync(path.join(dayPath, dir)).isDirectory())) {
				const postPath = path.join(dayPath, post);
				if (fs.existsSync(path.join(postPath, "index.md")) || !fs.existsSync(path.join(postPath, "index.html"))) continue;
				console.log(`Converting ${year}/${month}/${day}/${post}...`);
				const $ = load(fs.readFileSync(path.join(postPath, "index.html")));
				const body = $("body");
				const title = body.find("h1").first().remove().text(); // title
				const summaryHtml = body.find("p.p-summary").first().remove().html(); // summary
				const summary = summaryHtml ? NodeHtmlMarkdown.translate(summaryHtml) : undefined;
				body.find("h2").first().remove(); // date
				const markdown = NodeHtmlMarkdown.translate(body.html()!);
				const writeStream = fs.createWriteStream(path.join(postPath, "index.md"), "utf8");
				writeStream.write(`# ${title}\n`);
				writeStream.write(`Date: ${year}/${month}/${day}\n\n`);
				if (summary) writeStream.write(`## Summary\n${summary}\n`);
				writeStream.write("\n---\n" + markdown);
				writeStream.close();
			}
		}
	}
}