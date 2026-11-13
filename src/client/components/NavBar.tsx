import TopBar from "./TopBar";
import SideBar from "./SideBar";
import useVertical from "../hooks/useVertical";
import { useEffect, useState } from "preact/hooks";

export default function NavBar() {
	// Server-side rendering can't see window. We can only hide afterwards
	const [hidden, setHidden] = useState(false);
	useEffect(() => {
		// If we are inside iframe, hide navigation menu
		setHidden(!!globalThis.window.frameElement);
	}, []);

	const vertical = useVertical();

	return <>
		{!vertical && <TopBar hidden={hidden} />}
		{vertical && <SideBar hidden={hidden} />}
	</>;
}