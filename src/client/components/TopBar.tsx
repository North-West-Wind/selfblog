import NavBarItems from "./NavBarItems";

export default function TopBar(props: { hidden: boolean }) {
	return <>
		<div className={"topbar flex" + (props.hidden ? " hidden" : "")}>
			<NavBarItems />
		</div>
		<div className={"topbar-filler" + (props.hidden ? " hidden" : "")}></div>
	</>;
}