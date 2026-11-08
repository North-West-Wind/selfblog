import { createRoot } from 'react-dom/client';
import React, { useCallback, useState } from "react";
import { serverHash } from "../helper";

const NewPage: React.FC = () => {
	const [title, setTitle] = useState("");
	const [date, setDate] = useState((() => {
		const d = new Date();
		return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
	})());
	const [password, setPassword] = useState("");
	const [createState, setCreateState] = useState(0);

	const create = useCallback(async () => {
		if (!title || !date || !password) return;
		setCreateState(1);
		try {
			const res = await fetch("/api/new", {
				method: "POST",
				headers: {
					Authorization: await serverHash(password),
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ title, date })
			});
			if (res.ok) {
				setCreateState(2);
				setTimeout(async () => {
					window.location.pathname = (await res.json()).url;
				}, 3000);
			} else throw new Error("Not OK");
		} catch (err) {
			setCreateState(0);
			console.error(err);
		}
	}, [title, date, password]);

	return <div style={{ margin: "auto" }}>
		<h2>Create a new post</h2>
		<div className="flex"><input type="text" id="title" placeholder="Title..." value={title} onChange={ev => setTitle(ev.currentTarget.value)} /></div>
		<div className="flex"><input type="date" id="date" value={date} onChange={ev => setDate(ev.currentTarget.value)} /></div>
		<div className="flex"><input type="password" id="pw" placeholder="Password..." value={password} onChange={ev => setPassword(ev.currentTarget.value)} /></div>
		<div className="flex hcenter">
			{createState == 0 && <div className="button" style={{ width: "min-content", marginTop: "2vh" }} onClick={() => create()}>Create</div>}
			{createState == 1 && <div className="button" style={{ width: "min-content", marginTop: "2vh", filter: "brightness(50%) grayscale()" }}>Creating...</div>}
			{createState == 2 && <div className="button" style={{ width: "min-content", marginTop: "2vh", filter: "brightness(50%) grayscale()" }}>Created!</div>}
		</div>
	</div>;
};

createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <NewPage />
  </React.StrictMode>
);