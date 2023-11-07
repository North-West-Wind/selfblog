import React from "react";

type Attributes = { sidebar?: boolean };

const NavBarItemsComponent: React.FC<Attributes> = (props: Attributes) => {
	return <>
		<div className="button" style={{ marginTop: props.sidebar ? "9vh" : 0 }} onClick={() => window.location.href = "/"}>Home</div>
		<div className="button" onClick={() => window.location.href = "/about"}>About</div>
		<div className="button" onClick={() => window.location.href = "/list"}>Posts</div>
	</>
}

export default NavBarItemsComponent;