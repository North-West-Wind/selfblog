import React from "react";
import NavBarItemsComponent from "./NavBarItems";

export default class SideBarComponent extends React.Component {
	state: { opened: boolean };

	constructor(props: object) {
		super(props);
		this.state = { opened: false };
	}

	render() {
		return <>
			<div className="sidebar-button" onClick={() => this.setState({ opened: true })}>≡</div>
			<div className={"sidebar" + (this.state.opened ? "" : " hidden")}>
				<div className="sidebar-close" onClick={() => this.setState({ opened: false })}>X</div>
				<NavBarItemsComponent sidebar />
			</div>
		</>
	}
}