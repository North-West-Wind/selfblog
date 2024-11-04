import { useEffect, useState } from "preact/hooks";
import { Post } from "src/types";

const AllPostsComponent = (props: { posts?: Post[] }) => {
	if (!props.posts) {
		// read from body data
		const data = document.body.getAttribute("data");
		if (data)
			try {
				props.posts = JSON.parse(atob(data));
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
			<h2>Posts</h2>
			{posts.map(p => <h3><a href={p.url}>{p.title}</a></h3>)}
			<h3>End of list</h3>
		</>}
	</>
}

export default AllPostsComponent;