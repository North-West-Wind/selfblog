import React, { useEffect, useState } from "react";

const LatestPostComponent: React.FC = () => {
	const [latestPost, setLatestPost] = useState<string | null | undefined>(undefined);
	useEffect(() => {
		fetch("/p/latest").then(res => {
			if (!res.ok) setLatestPost(null);
			else setLatestPost("/p/latest");
		});
	});

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