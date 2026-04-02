import * as cheerio from "cheerio";
import * as fs from "fs";
import { closify, prettify } from "htmlfy";
import * as path from "path";

for (const year of fs.readdirSync("data").filter(dir => fs.statSync(path.join("data", dir)).isDirectory())) {
	const yearPath = path.join("data", year);
	for (const month of fs.readdirSync(yearPath).filter(dir => fs.statSync(path.join(yearPath, dir)).isDirectory())) {
		const monthPath = path.join(yearPath, month);
		for (const day of fs.readdirSync(monthPath).filter(dir => fs.statSync(path.join(monthPath, dir)).isDirectory())) {
			const dayPath = path.join(monthPath, day);
			for (const post of fs.readdirSync(dayPath).filter(dir => fs.statSync(path.join(dayPath, dir)).isDirectory())) {
				const postPath = path.join(dayPath, post);
				console.log(postPath);
				fs.readFile(path.join(postPath, "index.html"), "utf8", (err, html) => {
					if (err) console.err(err);
					const $ = cheerio.load(html);
					if (!$(".h-entry").length) {
						$("body").addClass("h-entry");
						const h2 = $("h2").first();
						const date = h2.html();
						h2.html(`<time class="dt-published" datetime="${date}">${date}</time>`);
						$("h1").first().addClass("p-name");
						const content = $(`<article class="e-content"></article>`);
						$("h1").nextAll().appendTo(content);
						$("body").append(content);
						fs.writeFileSync(path.join(postPath, "index.html"), prettify(closify($.html()), { tab_size: 2, content_wrap: 80 }));
					}
				});
			}
		}
	}
}