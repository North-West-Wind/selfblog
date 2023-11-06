import React from "react";

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
				<div className="button" style={{ marginTop: "9vh" }} onClick={() => window.location.href = "/"}>Home</div>
				<div className="button" onClick={() => window.location.href = "/"}>About</div>
				<div className="button" onClick={() => window.location.href = "/list"}>Posts</div>
			</div>
		</>
	}
}