import { useEffect, useState } from "preact/hooks";
import { Post } from "src/types";

const MorePostsComponent = (props: { posts?: Post[] }) => {
	const [posts, setPosts] = useState<{ title: string, url: string }[] | undefined>(props.posts);
	useEffect(() => {
		fetch("/api/list?limit=10").then(async res => {
			if (res.ok) setPosts(await res.json());
			else setPosts([]);
		});
	}, []);

	return <>
		{posts === undefined && <h2>Loading more posts...</h2>}
		{Array.isArray(posts) && posts.length && <>
			<h2>More Posts</h2>
			{posts.map(p => <h3 key={p.title}><a href={p.url}>{p.title}</a></h3>)}
			<h3><a href="/list">Show all...</a></h3>
		</>}
	</>
}

export default MorePostsComponent;