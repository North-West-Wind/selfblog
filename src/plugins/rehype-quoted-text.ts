import { SKIP, visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root, Element, ElementContent, Text } from "hast";

const REGEXES = [
  ['"', '"'],
  ["\u201C", "\u201D"], // “ ”
  ["\u2018", "\u2019"], // ‘ ’
].map(([open, close]) => {
  const o = open.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const c = close.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${o}([^\\n]*?)${c}`, "g");
});

type Segment =
  | { type: "text"; value: string }
  | { type: "quoted"; value: string };

const rehypeQuotedText: Plugin<[], Root> = () => {
  const className = "quoted";
  const tagName = "span";
  const skipTags = ["code", "pre", "script", "style"];

  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (skipTags.includes(node.tagName)) return;
      if (node.tagName === tagName) {
        const nodeClassName = node.properties?.className;
        if (nodeClassName) {
          if (typeof nodeClassName == "string" && nodeClassName == className) return SKIP;
          if (Array.isArray(nodeClassName) && nodeClassName.includes(className)) return SKIP;
        }
      }

      const newChildren: ElementContent[] = [];
      let changed = false;

      for (const child of node.children) {
        if (child.type !== "text") {
          newChildren.push(child);
          continue;
        }

        const segments = splitQuoted(child.value);
        if (segments.length === 1 && segments[0].type === "text") {
          newChildren.push(child);
          continue;
        }

        changed = true;
        for (const seg of segments) {
          if (seg.type === "text") {
            const text: Text = { type: "text", value: seg.value };
            newChildren.push(text);
          } else {
            const wrapper: Element = {
              type: "element",
              tagName,
              properties: { className: [className] },
              children: [{ type: "text", value: seg.value }],
            };
            newChildren.push(wrapper);
          }
        }
      }

      if (changed) {
        node.children = newChildren;
        return SKIP;
      }
    });
  };
};

function splitQuoted(text: string): Segment[] {
  const out: Segment[] = [];
  let rest = text;

  while (rest.length > 0) {
    let best: { start: number; end: number; inner: string; full: string } | null = null;

    for (const re of REGEXES) {
      re.lastIndex = 0;
      const m = re.exec(rest);
      if (m && (best === null || m.index < best.start)) {
        best = {
          start: m.index,
          end: m.index + m[0].length,
          inner: m[1],
          full: m[0],
        };
      }
    }

    if (!best) {
      out.push({ type: "text", value: rest });
      break;
    }

    if (best.start > 0) {
      out.push({ type: "text", value: rest.slice(0, best.start) });
    }
    out.push({
      type: "quoted",
      value: best.full,
    });
    rest = rest.slice(best.end);
  }

  return out;
}

export default rehypeQuotedText;