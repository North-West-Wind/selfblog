// rehype-quoted-text.js
import { Root } from 'hast';
import { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const QUOTE_PAIRS = [
  ['"', '"'],
  ["'", "'"],
  ['\u201C', '\u201D'], // “ ”
  ['\u2018', '\u2019'], // ‘ ’
];

type Options = {
	className: string,
	tagName: string,
	keepQuotes: boolean,
	skipTags: string[]
};

const rehypeQuotedText: Plugin<[Options], Root> = (options = { className: "quoted", tagName: "span", keepQuotes: true, skipTags: ["code", "pre", "script", "style"] }) => {
  const { className, tagName, keepQuotes, skipTags } = options;

  // Build one alternation regex per quote type so we don't mix “ with ' etc.
  const regexes = QUOTE_PAIRS.map(([open, close]) => {
    const o = escapeRegExp(open);
    const c = escapeRegExp(close);
    // Non-greedy, no newlines inside a quoted string.
    return new RegExp(`${o}([^\\n]*?)${c}`, 'g');
  });

  return (tree: any) => {
    visit(tree, 'element', (node, index, parent) => {
      if (!parent || skipTags.includes(node.tagName)) return;

      const newChildren = [];
      let changed = false;

      for (const child of node.children) {
        if (child.type !== 'text') {
          newChildren.push(child);
          continue;
        }

        const segments = splitQuoted(child.value, regexes, keepQuotes);
        if (segments.length === 1 && segments[0].type === 'text') {
          newChildren.push(child);
          continue;
        }

        changed = true;
        for (const seg of segments) {
          if (seg.type === 'text') {
            newChildren.push({ type: 'text', value: seg.value });
          } else {
            newChildren.push({
              type: 'element',
              tagName,
              properties: { className: [className] },
              children: [{ type: 'text', value: seg.value }],
            });
          }
        }
      }

      if (changed) node.children = newChildren;
    });
  };
}

function splitQuoted(text: string, regexes: RegExp[], keepQuotes: boolean) {
  // Find earliest match among all quote types, repeatedly.
  const out = [];
  let rest = text;

  while (rest.length > 0) {
    let best = null; // { start, end, inner, full }
    for (const re of regexes) {
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
      out.push({ type: 'text', value: rest });
      break;
    }

    if (best.start > 0) {
      out.push({ type: 'text', value: rest.slice(0, best.start) });
    }
    out.push({
      type: 'quoted',
      value: keepQuotes ? best.full : best.inner,
    });
    rest = rest.slice(best.end);
  }

  return out;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default rehypeQuotedText;