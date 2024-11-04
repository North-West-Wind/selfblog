import TopBarComponent from "../components/TopBar";
import SideBarComponent from "../components/SideBar";
import useVertical from "../hooks/useVertical";

const NavApp = () => {
	// If we are inside iframe, hide navigation menu
	if (globalThis.window !== undefined && window.frameElement) return <></>;

	const vertical = useVertical();

	return <>
		{!vertical && <TopBarComponent />}
		{vertical && <SideBarComponent />}
	</>;
}

export default NavApp;