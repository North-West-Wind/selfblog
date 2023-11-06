import React, { useEffect, useState } from "react";
import TopBarComponent from "../components/TopBar";
import SideBarComponent from "../components/SideBar";

const NavApp: React.FC = () => {
	const [vertical, setVertical] = useState(window.innerWidth < window.innerHeight);
	useEffect(() => {
		window.addEventListener("resize", () => {
			setVertical(window.innerWidth < window.innerHeight);
		});
	});

	return <>
		{!vertical && <TopBarComponent />}
		{vertical && <SideBarComponent />}
	</>;
}

export default NavApp;