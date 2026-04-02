import React from "react";

type Attributes = { sidebar?: boolean };

const NavBarItemsComponent: React.FC<Attributes> = (props: Attributes) => {
	return <>
		<div className="button" style={{ marginTop: props.sidebar ? "9vh" : 0 }}>
			<a href="/">Home</a>
		</div>
		<div className="button">
			<a href="/about">About</a>
		</div>
		<div className="button">
			<a href="/rss">RSS</a>
		</div>
		<div className="button donation" style={{ marginTop: props.sidebar ? "auto" : 0 }}>
			<a href="/donate">
				{props.sidebar && <div>Donate!</div>}
				<img id="donation" src="/assets/donation.svg" />
			</a>
		</div>
		{/* h-card */}
		<div className="h-card">
			<a class="p-name p-org u-url" href="https://blog.northwestw.in">NorthWestWind</a>
			<a class="u-email" href="mailto:nw@northwestw.in">e</a>
			<img class="u-photo" src="/assets/icon.gif" />
			<p class="p-note">
				Vector Artist/Animator, Streamer, Minecraft Modder, Hongkonger (Trilingual)
			</p>
		</div>
	</>
}

export default NavBarItemsComponent;