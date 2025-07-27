const fs = require("fs");
const path = require("path");

for (const year of fs.readdirSync("data").filter(dir => fs.statSync(path.join("data", dir)).isDirectory())) {
	const yearPath = path.join("data", year);
	for (const month of fs.readdirSync(yearPath).filter(dir => fs.statSync(path.join(yearPath, dir)).isDirectory())) {
		const monthPath = path.join(yearPath, month);
		for (const day of fs.readdirSync(monthPath).filter(dir => fs.statSync(path.join(monthPath, dir)).isDirectory())) {
			const dayPath = path.join(monthPath, day);
			for (const post of fs.readdirSync(dayPath).filter(dir => fs.statSync(path.join(dayPath, dir)).isDirectory())) {
				const postPath = path.join(dayPath, post);
				for (const file of fs.readdirSync(postPath).filter(file => file.endsWith(".html"))) {
					let html = fs.readFileSync(path.join(postPath, file), "utf8");
					const [before, after] = html.split("<head>");
					fs.writeFileSync(path.join(postPath, file), `${before}<head>\n\t<link rel="icon" href="/favicon-light.png" media="(prefers-color-scheme: light)" />\n\t<link rel="icon" href="/favicon-dark.png" media="(prefers-color-scheme: dark)" />${after}`)
				}
			}
		}
	}
}