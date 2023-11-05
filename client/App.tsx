import React from "react";
import LatestPostComponent from "./components/LatestPost";
import MorePostsComponent from "./components/MorePosts";

const App: React.FC = () => {
  return <>
		<div className="flex">
			<div>
				<h1>NorthWestBlog</h1>
				<h3>The blogging site of NorthWestWind.</h3>
				<h3>Idea in a week. Deployment in 3 days.</h3>
			</div>
			<div className="flex vcenter" style={{ marginLeft: "auto" }}>
				<img src="/assets/icon.gif" style={{ borderRadius: "50%", aspectRatio: "1/1", width: "20vw", height: "20vw" }} />
			</div>
		</div>

		<LatestPostComponent />
		<MorePostsComponent />
	</>;
};

export default App;