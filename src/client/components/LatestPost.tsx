import { useEffect, useState } from "preact/hooks";

const LatestPostComponent = (props: { latest?: string }) => {
	const [latestPost, setLatestPost] = useState<string | null | undefined>(props.latest);
	useEffect(() => {
		fetch("/api/list?limit=1").then(async res => {
			if (!res.ok || !(await res.json() as any[]).length) setLatestPost(null);
			else setLatestPost("/p/latest");
		});
	}, []);

	return <>
		{latestPost === undefined && <h2>Loading latest post...</h2>}
		{latestPost === null && <h2>No post exists :(</h2>}
		{latestPost && <>
			<h2><a href={latestPost}>Latest Post</a></h2>
			<iframe src={latestPost}></iframe>
		</>}
	</>
}

export default LatestPostComponent;