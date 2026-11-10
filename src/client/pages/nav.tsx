import { hydrate } from "preact";
import TopBarComponent from "../components/TopBar";
import SideBarComponent from "../components/SideBar";
import useVertical from "../hooks/useVertical";
import { createRoot } from "react-dom/client";
import Comments from "../components/Comments";

const NavBar = () => {
	// If we are inside iframe, hide navigation menu
	if (globalThis.window !== undefined && window.frameElement) return <></>;

	const vertical = useVertical();

	return <>
		{!vertical && <TopBarComponent />}
		{vertical && <SideBarComponent />}
	</>;
}

if (globalThis.location?.pathname.startsWith("/p/")) {
	const div = document.createElement("div");
	div.id = "comments";
	document.body.appendChild(div);
	createRoot(div).render(<Comments />);
}

if (globalThis.document)
	hydrate(<NavBar />, document.getElementById("nav")!);

export default NavBar;