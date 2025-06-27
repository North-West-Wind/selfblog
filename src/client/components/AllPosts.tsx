import { Base64 } from "js-base64";
import { useEffect, useState } from "preact/hooks";
import { Post } from "src/types";

const AllPostsComponent = (props: { posts?: Post[] }) => {
	if (!props.posts) {
		// read from body data
		const data = document.body.getAttribute("data");
		if (data)
			try {
				props.posts = JSON.parse(Base64.decode(data));
			} catch (err) {}
	}
	const [posts, setPosts] = useState<Post[] | undefined>(props.posts);
	useEffect(() => {
		fetch("/api/list").then(async res => {
			if (res.ok) setPosts(await res.json());
			else setPosts([]);
		});
	}, []);

	return <>
		{posts === undefined && <h2>Loading posts...</h2>}
		{Array.isArray(posts) && posts.length && <>
			<table className="more" style={{ marginTop: "calc(4vh + max(2vw, 4vh))" }}>
				<tbody>
					<tr><th>Date</th><th>Post</th></tr>
					{posts.map(p => <tr key={p.title}><td style={{ textAlign: "center" }}>{p.date}</td><td><a href={p.url}>{p.title}</a></td></tr>)}
				</tbody>
			</table>
			<h3>End of list</h3>
		</>}
	</>
}

export default AllPostsComponent;