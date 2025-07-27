import { abbreviateNumber } from "js-abbreviation-number";
import { useEffect, useState } from "preact/hooks";
import { Post } from "src/types";

const MorePostsComponent = (props: { posts?: Post[] }) => {
	const [posts, setPosts] = useState<Post[] | undefined>(props.posts);
	useEffect(() => {
		fetch("/api/list?limit=10").then(async res => {
			if (res.ok) setPosts(await res.json());
			else setPosts([]);
		});
	}, []);

	const maxVisit = Math.max(...posts?.map(post => post.visits) || [1]);

	return <>
		{posts === undefined && <h2>Loading more posts...</h2>}
		{Array.isArray(posts) && posts.length && <>
			<h2>More Posts</h2>
			<table className="more">
				<tbody>
					<tr><th>Date</th><th>Post</th><th>Visits</th></tr>
					{posts.map(p => <tr key={p.title}>
						<td style={{ textAlign: "center" }}>{p.date}</td>
						<td><a href={p.url}>{p.title}</a></td>
						<td style={{ filter: `hue-rotate(${180 * p.visits / maxVisit}deg)` }}>{abbreviateNumber(p.visits)}</td>
					</tr>)}
				</tbody>
			</table>
			<h3><a href="/list">Show all...</a></h3>
		</>}
	</>
}

export default MorePostsComponent;