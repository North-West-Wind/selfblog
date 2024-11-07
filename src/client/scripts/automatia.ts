// make image not side by side in vertical
let prevVert = false;
const flexDivs: HTMLDivElement[] = [];

document.body.querySelectorAll("img").forEach(img => {
	let parent = img.parentElement;
	while (parent?.tagName == "DIV" || parent?.tagName == "A") { // A is for formatia
		if (parent.children.length == 1) {
			parent = parent.parentElement;
		} else if (parent.children.length == 2) {
			// this is probably a side by side img/p
			if (parent.classList.contains("flex"))
				flexDivs.push(parent as HTMLDivElement);
			break;
		}
	}
});

const onResize = () => {
	const vertical = window.innerHeight > window.innerWidth;
	if (vertical && !prevVert) {
		prevVert = vertical;
		flexDivs.forEach(div => {
			div.classList.remove("flex");
			div.classList.add("automatia-vertical");
		});
	} else if (!vertical && prevVert) {
		prevVert = vertical;
		flexDivs.forEach(div => {
			div.classList.add("flex");
			div.classList.remove("automatia-vertical");
		});
	}
}

window.addEventListener("resize", onResize);
onResize();