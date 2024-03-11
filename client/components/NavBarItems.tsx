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
			<a href="/list">Posts</a>
		</div>
	</>
}

export default NavBarItemsComponent;