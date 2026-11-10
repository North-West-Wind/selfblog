document.querySelectorAll("article img").forEach(element => {
	const parent = element.parentElement;
	if (parent?.tagName != "DIV") return;
	const children = Array.from(parent.children);
	if (children.some(child => child.tagName != "IMG")) return;
	const width = 90 / children.length;
	children.forEach((child) => {
		(child as HTMLElement).style.maxWidth = `${width}%`;
		(child as HTMLElement).style.margin = `1vmax`;
	});
});