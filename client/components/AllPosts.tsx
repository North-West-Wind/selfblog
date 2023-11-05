import React, { useEffect, useState } from "react";

const AllPostsComponent: React.FC = () => {
	const [posts, setPosts] = useState<{ title: string, url: string }[] | undefined>(undefined);
	useEffect(() => {
		fetch("/api/list").then(async res => {
			if (res.ok) setPosts(await res.json());
			else setPosts([]);
		});
	});

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