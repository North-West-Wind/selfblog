import { SKIP, visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root, Element, ElementContent, Text } from "hast";

type SurroundedTextConfig = {
  surrounders: [string, string][];
  className?: string;
};

type RehypeSurroundedTextOptions = SurroundedTextConfig[];

type Segment =
  | { type: "text"; value: string }
  | { type: "quoted"; value: string; className: string };

type Matcher = { className: string; regexes: RegExp[] };

const rehypeSurroundedText: Plugin<[RehypeSurroundedTextOptions], Root> = (options) => {
  const skipTags = ["code", "pre", "script", "style"];
  const markerAttr = "data-surrounded-text";
  const markerValue = "1";

  const matchers = options.map((cfg) => {
    const {
      className = "quoted",
      surrounders,
    } = cfg;
    const regexes = surrounders.map(([open, close]) => {
      const o = open.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const c = close.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`${o}([^\\n]*?)${c}`, "g");
    });
    return { className, regexes };
  });

  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (skipTags.includes(node.tagName)) return;

      const marker = node.properties?.[markerAttr];
      if (marker === markerValue) return SKIP;

      const newChildren: ElementContent[] = [];
      let changed = false;

      for (const child of node.children) {
        if (child.type !== "text") {
          newChildren.push(child);
          continue;
        }

        const segments = splitQuoted(child.value, matchers);
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
              tagName: "span",
              properties: {
                className: [seg.className],
                [markerAttr]: markerValue,
              },
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

function splitQuoted(text: string, matchers: Matcher[]): Segment[] {
  const out: Segment[] = [];
  let rest = text;

  while (rest.length > 0) {
    let best: { start: number; end: number; full: string; className: string } | null = null;

    for (const { regexes, className } of matchers) {
      for (const re of regexes) {
        re.lastIndex = 0;
        const m = re.exec(rest);
        if (m && (best === null || m.index < best.start)) {
          best = {
            start: m.index,
            end: m.index + m[0].length,
            full: m[0],
            className,
          };
        }
      }
    }

    if (!best) {
      out.push({ type: "text", value: rest });
      break;
    }

    if (best.start > 0) {
      out.push({ type: "text", value: rest.slice(0, best.start) });
    }
    out.push({ type: "quoted", value: best.full, className: best.className });
    rest = rest.slice(best.end);
  }

  return out;
}

export default rehypeSurroundedText;