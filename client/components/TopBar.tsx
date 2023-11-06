import React from "react";

const TopBarComponent: React.FC = () => {
	return <div className="topbar flex">
		<div className="button" onClick={() => window.location.href = "/"}>Home</div>
		<div className="button" onClick={() => window.location.href = "/"}>About</div>
		<div className="button" onClick={() => window.location.href = "/list"}>Posts</div>
	</div>;
}

export default TopBarComponent;