import { hashSync } from "bcryptjs";
import React, { useRef } from "react"

const DeleteApp: React.FC = () => {
	const pwRef = useRef<HTMLInputElement>(null);
	const [year, month, day, title] = window.location.pathname.slice(8).split("/");
	function answer(ans: boolean) {
		if (ans) {
			if (!pwRef.current) return;
			if (!pwRef.current.value) pwRef.current.style.borderColor = "#ff0000";
			else {
				fetch(`/api/delete/${year}/${month}/${day}/${title}`, {
					method: "DELETE",
					headers: { Authorization: hashSync(pwRef.current.value) }
				}).then(res => {
					if (res.ok) window.location.pathname = "/";
					else if (res.status === 400) pwRef.current!.style.borderColor = "#ff0000";
				})
			}
		} else window.location.pathname = "/";
	}

	return <div style={{ textAlign: "center" }}>
		<h1>Hold it!</h1>
		<h3>You are about to delete</h3>
		<h2 style={{ margin: 0 }}><a href={window.location.pathname.replace("/delete", "/p")} target="post">{`${year}/${month}/${day} - ${title}`}</a></h2>
		<h3>Are you sure?</h3>
		<div className="flex hcenter"><input type="password" id="pw" placeholder="Password..." ref={pwRef} style={{ width: "50%" }} /></div>
		<div className="flex hcenter">
			<div className="button flex-child" onClick={() => answer(true)}>Yes</div>
			<div className="button flex-child" style={{ marginLeft: "1vw" }} onClick={() => answer(false)}>No</div>
		</div>
	</div>
}

export default DeleteApp;