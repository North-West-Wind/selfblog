import React, { useEffect, useState } from "react";
import LatestPostComponent from "./components/LatestPost";
import MorePostsComponent from "./components/MorePosts";

const App: React.FC = () => {
	const [vertical, setVertical] = useState(window.innerWidth < window.innerHeight);
	useEffect(() => {
		window.addEventListener("resize", () => {
			setVertical(window.innerWidth < window.innerHeight);
		});
	});

  return <>
		<div className="flex" style={{ marginTop: "calc(max(2vw, 4vh) + 4vh)" }}>
			<div style={{ textAlign: vertical ? "center" : "left", width: vertical ? "100%" : "auto" }}>
				<h1>NorthWestBlog</h1>
				<h3>The blogging site of NorthWestWind.</h3>
				<h3>Idea in a week. Deployment in 3 days.</h3>
			</div>
			{!vertical && <div className="flex vcenter" style={{ marginLeft: "auto", marginTop: "4vw" }}>
				<img src="/assets/icon.gif" style={{ borderRadius: "50%", aspectRatio: "1/1", width: "20vw", height: "20vw" }} />
			</div>}
		</div>
		{vertical && <div className="flex hcenter" style={{ marginTop: "2vh" }}>
			<img src="/assets/icon.gif" style={{ borderRadius: "50%", aspectRatio: "1/1", width: "50vw", height: "50vw" }} />
		</div>}

		<LatestPostComponent />
		<MorePostsComponent />
	</>;
};

export default App;