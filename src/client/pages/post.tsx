import { Remark } from "react-remark";
import remarkFediverseUser from "remark-fediverse-user";
import remarkGfm from "remark-gfm";
import remarkFlexibleMarkers from "remark-flexible-markers";
import remarkMath from "remark-math";
import remarkImgLinks from "@pondorasti/remark-img-links";
import rehypeKatex from "rehype-katex";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeWrapSibling from "rehype-wrap-sibling";
import rehypeReact from "rehype-react";
import runtime from "preact/jsx-runtime";
import { useLocation } from "preact-iso";
import rehypeQuotedText from "../../plugins/rehype-quoted-text";
import Comments from "../components/Comments";
import NotFoundPage from "./not-found";
import { useContext } from "preact/hooks";
import { DataContext } from "../data";

export default function PostPage() {
	const context = useContext(DataContext);
	if (!context?.markdown) return <NotFoundPage />;

	const { url } = useLocation();

	const [meta, content] = context.markdown.split(/^-{3,}$/m, 2);
	const title = meta.match(/^#\s+(.+)$/m)?.[1];
	const date = meta.match(/^Date: (\d{4}[/-]\d{2}[/-]\d{2})$/m)?.[1];
	const summary = meta.split(/^#+\s+Summary\s*$/m, 2)[1].replace(/  $/m, "\n");

	const rendered = unified()
		.use(remarkParse)
		.use(remarkFediverseUser)
		.use(remarkFlexibleMarkers, { markerTagName: "span", markerClassName: "colored-2" })
		.use(remarkMath)
		.use(remarkGfm)
		.use(remarkImgLinks, { absolutePath: url })
		.use(remarkRehype)
		.use(rehypeKatex)
		.use(rehypeWrapSibling, { wrapper: "div.flex.hcenter", selector: "img" })
		.use(rehypeQuotedText)
		.use(rehypeReact, runtime)
		.processSync(content);

	return <>
		<h2><time class="dt-publish" datetime={date}>{date}</time></h2>
		<h1 class="p-name">{title}</h1>
		<p class="p-summary">{summary}</p>
		<article class="e-content">{rendered.result}</article>
		<Comments />
	</>;
}