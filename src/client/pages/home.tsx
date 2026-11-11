import LatestPostComponent from "../components/LatestPost";
import MorePostsComponent from "../components/MorePosts";
import useVertical from "../hooks/useVertical";
import { useContext, useState } from "preact/compat";
import WebStamp from "web-stamp";
import { DataContext } from "../data";

export default function HomePage() {
	const context = useContext(DataContext);

	const vertical = useVertical();
	const [stampOpened, setStampOpened] = useState(false);

	const openStamp = () => setStampOpened(true);

	return <>
		<div className="flex" style={{ marginTop: "calc(max(2vw, 4vh) + 4vh)" }}>
			<div style={{ textAlign: vertical ? "center" : "left", width: vertical ? "100%" : "auto" }}>
				<div class="flex hcenter vcenter">
					<h1>NorthWestBlog</h1>
					{vertical && <div class="button mini stamp" onClick={openStamp}>Stamp!</div>}
				</div>
				<h3>The blogging site of NorthWestWind</h3>
				<h3>I wrote this in 3 days (without AI)</h3>
				{!vertical && <div class="button mini stamp" onClick={openStamp}>Stamp!</div>}
			</div>
			{!vertical && <div className="flex vcenter" style={{ marginLeft: "auto", marginTop: "4vw" }}>
				<img src="/assets/icon.gif" style={{ borderRadius: "50%", aspectRatio: "1/1", width: "20vw", height: "20vw" }} />
			</div>}
		</div>
		{vertical && <div className="flex hcenter" style={{ marginTop: "2vh" }}>
			<img src="/assets/icon.gif" style={{ borderRadius: "50%", aspectRatio: "1/1", width: "50vw", height: "50vw" }} />
		</div>}

		<LatestPostComponent latest={context?.latest} />
		<MorePostsComponent posts={context?.posts} />
		{stampOpened && <WebStamp src="/assets/stamp.svg" onClose={() => setStampOpened(false)} />}
	</>;
}