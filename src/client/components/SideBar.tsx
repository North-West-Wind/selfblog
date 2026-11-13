import { useState } from "react";
import NavBarItems from "./NavBarItems";

export default function SideBar(props: { hidden: boolean }) {
	const [opened, setOpened] = useState(false);

	return <>
		<div className={"sidebar-button" + (props.hidden ? " hidden" : "")} onClick={() => setOpened(true)}>≡</div>
		<div className={"sidebar" + (opened || props.hidden ? "" : " hidden")}>
			<div className="sidebar-close" onClick={() => setOpened(false)}>⨯</div>
			<NavBarItems sidebar />
		</div>
	</>
}