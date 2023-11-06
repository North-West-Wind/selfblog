import React from "react";
import NavBarItemsComponent from "./NavBarItems";

const TopBarComponent: React.FC = () => {
	return <div className="topbar flex">
		<NavBarItemsComponent />
	</div>;
}

export default TopBarComponent;