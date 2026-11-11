import React, { useState } from "react";
import NavBarItemsComponent from "./NavBarItems";

export default function SideBar() {
	const [opened, setOpened] = useState(false);

	return <>
		<div className="sidebar-button" onClick={() => setOpened(true)}>≡</div>
		<div className={"sidebar" + (opened ? "" : " hidden")}>
			<div className="sidebar-close" onClick={() => setOpened(false)}>⨯</div>
			<NavBarItemsComponent sidebar />
		</div>
	</>
}