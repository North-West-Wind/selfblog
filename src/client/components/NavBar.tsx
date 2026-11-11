import TopBar from "./TopBar";
import SideBarComponent from "./SideBar";
import useVertical from "../hooks/useVertical";
import { useEffect, useState } from "preact/hooks";

export default function NavBar(props: { hidden?: boolean }) {
	// Server-side rendering can't see window. We can only hide afterwards
	const [hidden, setHidden] = useState(!!props.hidden);
	useEffect(() => {
		setHidden(!!globalThis.window.frameElement);
	}, []);

	// If we are inside iframe, hide navigation menu
	if (hidden) return <></>;

	const vertical = useVertical();

	return <>
		{!vertical && <TopBar hidden={props.hidden} />}
		{vertical && <SideBarComponent />}
	</>;
}