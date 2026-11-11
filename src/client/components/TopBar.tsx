import NavBarItemsComponent from "./NavBarItems";

export default function TopBar(props: { hidden?: boolean }) {
	return <div className={"topbar flex" + (props.hidden ? " hidden" : "")}>
		<NavBarItemsComponent />
	</div>;
}