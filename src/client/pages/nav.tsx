import TopBarComponent from "../components/TopBar";
import SideBarComponent from "../components/SideBar";
import useVertical from "../hooks/useVertical";

export default function NavBar() {
	// If we are inside iframe, hide navigation menu
	if (globalThis.window?.frameElement) return <></>;

	const vertical = useVertical();

	return <>
		{!vertical && <TopBarComponent />}
		{vertical && <SideBarComponent />}
	</>;
}