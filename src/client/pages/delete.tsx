import  { useCallback, useRef } from "react";
import { serverHash } from "../helper";
import NavBar from "../components/NavBar";
import { hydrate } from "preact";

export default function DeletePage() {
	const path = window.location.pathname;

	const pwRef = useRef<HTMLInputElement>(null);
	const [year, month, day, title] = path.slice(8).split("/");
	const answer = useCallback(async (ans: boolean) => {
		if (ans) {
			if (!pwRef.current) return;
			if (!pwRef.current.value) pwRef.current.style.borderColor = "#ff0000";
			else {
				fetch(`/api/delete/${year}/${month}/${day}/${title}`, {
					method: "DELETE",
					headers: { Authorization: await serverHash(pwRef.current.value) }
				}).then(res => {
					if (res.ok) window.location.pathname = "/";
					else if (res.status === 400) pwRef.current!.style.borderColor = "#ff0000";
				})
			}
		} else window.location.pathname = "/";
	}, []);

	return <>
		<NavBar />
		<div style={{ textAlign: "center" }}>
			<h1>Hold it!</h1>
			<h3>You are about to delete</h3>
			<h2 style={{ margin: 0 }}><a href={path.replace("/delete", "/p")} target="post">{`${year}/${month}/${day} - ${title}`}</a></h2>
			<h3>Are you sure?</h3>
			<div className="flex hcenter"><input type="password" id="pw" placeholder="Password..." ref={pwRef} style={{ width: "50%" }} /></div>
			<div className="flex hcenter">
				<div className="button flex-child" onClick={() => answer(true)}>Yes</div>
				<div className="button flex-child" style={{ marginLeft: "1vw" }} onClick={() => answer(false)}>No</div>
			</div>
		</div>
	</>;
}

if (globalThis.document) hydrate(<DeletePage />, document.getElementById("app")!);