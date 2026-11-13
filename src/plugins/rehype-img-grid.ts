import { SKIP, visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root, Element, ElementContent } from "hast";

export interface RehypeImgGridOptions {
	className?: string;
	tagName?: string;
	ignoreWhitespaceText?: boolean;
}

const rehypeImgGrid: Plugin<[RehypeImgGridOptions?], Root> = (options = {}) => {
	const {
		className = "img-grid",
		tagName = "div",
		ignoreWhitespaceText = true,
	} = options;

	return (tree: Root) => {
		visit(tree, "element", (node: Element) => {
			if (isContained(node, tagName, className)) return SKIP;
			if (!hasConsecutiveImgs(node.children, ignoreWhitespaceText)) return;

			const newChildren: ElementContent[] = [];
			let run: Element[] = [];

			const flush = () => {
				if (run.length === 0) return;
				newChildren.push(makeContainer(run, tagName, className));
				run = [];
			};

			for (const child of node.children) {
				if (isImg(child)) {
					run.push(child);
					continue;
				}

				// Whitespace-only text between images doesn't break the run.
				if (ignoreWhitespaceText && child.type === "text" && child.value.trim() === "" && run.length > 0)
					continue;

				flush();
				newChildren.push(child);
			}

			flush();
			node.children = newChildren;
		});
	};
};

function isContained(node: Element, tagName: string, className: string): boolean {
	if (node.tagName !== tagName) return false;
	const cls = node.properties?.className;
	if (Array.isArray(cls)) return cls.includes(className);
	if (typeof cls === 'string') return cls.split(/\s+/).includes(className);
	return false;
}

function isImg(node: ElementContent): node is Element {
	return node.type === "element" && node.tagName === "img";
}

function hasConsecutiveImgs(children: ElementContent[], ignoreWhitespaceText: boolean): boolean {
	let count = 0;
	for (const child of children) {
		if (isImg(child)) {
			count++;
			if (count >= 2) return true;
		} else if (ignoreWhitespaceText && child.type === "text" && child.value.trim() === "") {
			continue;
		} else {
			count = 0;
		}
	}
	return false;
}

function makeContainer(imgs: Element[], tagName: string, className: string): Element {
	return {
		type: "element",
		tagName,
		properties: { className: [className] },
		children: imgs,
	};
}

export default rehypeImgGrid;