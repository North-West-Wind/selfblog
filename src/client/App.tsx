import { Post } from "src/types";
import LatestPostComponent from "./components/LatestPost";
import MorePostsComponent from "./components/MorePosts";
import useVertical from "./hooks/useVertical";
import { Base64 } from "js-base64";

const App = (props: { latest?: string, posts?: Post[] }) => {
	if (!props.latest || !props.posts) {
		// read from body data
		const data = document.body.getAttribute("data");
		if (data)
			try {
				const json = JSON.parse(Base64.decode(data));
				props.latest = json.latest;
				props.posts = json.posts;
			} catch (err) {}
	}

	const vertical = useVertical();

  return <>
		<div className="flex" style={{ marginTop: "calc(max(2vw, 4vh) + 4vh)" }}>
			<div style={{ textAlign: vertical ? "center" : "left", width: vertical ? "100%" : "auto" }}>
				<h1>NorthWestBlog</h1>
				<h3>The blogging site of NorthWestWind.</h3>
				<h3>I wrote this in 3 days.</h3>
			</div>
			{!vertical && <div className="flex vcenter" style={{ marginLeft: "auto", marginTop: "4vw" }}>
				<img src="/assets/icon.gif" style={{ borderRadius: "50%", aspectRatio: "1/1", width: "20vw", height: "20vw" }} />
			</div>}
		</div>
		{vertical && <div className="flex hcenter" style={{ marginTop: "2vh" }}>
			<img src="/assets/icon.gif" style={{ borderRadius: "50%", aspectRatio: "1/1", width: "50vw", height: "50vw" }} />
		</div>}

		<LatestPostComponent latest={props.latest} />
		<MorePostsComponent posts={props.posts} />
	</>;
};

export default App;