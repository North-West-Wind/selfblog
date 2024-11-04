import React, { useRef, useState } from "react";

const NewApp: React.FC = () => {
	const [date, setDate] = useState((() => {
		const d = new Date();
		return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
	})());
	const [createState, setCreateState] = useState(0);

	const titleRef = useRef<HTMLInputElement>(null);
	const dateRef = useRef<HTMLInputElement>(null);
	const pwRef = useRef<HTMLInputElement>(null);

	function create() {
		if (!titleRef.current?.value || !dateRef.current?.value || !pwRef.current?.value) return;
		setCreateState(1);
		fetch("/api/new", {
			method: "POST",
			headers: {
				Authorization: "Bearer " + pwRef.current.value,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ title: titleRef.current.value, date: dateRef.current.value })
		}).then(res => {
			if (res.ok) {
				setCreateState(2);
				setTimeout(async () => {
					window.location.pathname = (await res.json()).url;
				}, 3000);
			} else setCreateState(0);
		});
	}

  return <div style={{ margin: "auto" }}>
		<h2>Create a new post</h2>
		<div className="flex"><input type="text" id="title" placeholder="Title..." ref={titleRef} /></div>
		<div className="flex"><input type="date" id="date" onChange={(e) => setDate((e.target as HTMLInputElement).value)} value={date} ref={dateRef} /></div>
		<div className="flex"><input type="password" id="pw" placeholder="Password..." ref={pwRef} /></div>
		<div className="flex hcenter">
			{createState == 0 && <div className="button" style={{ width: "min-content", marginTop: "2vh" }} onClick={() => create()}>Create</div>}
			{createState == 1 && <div className="button" style={{ width: "min-content", marginTop: "2vh", filter: "brightness(50%) grayscale()" }}>Creating...</div>}
			{createState == 2 && <div className="button" style={{ width: "min-content", marginTop: "2vh", filter: "brightness(50%) grayscale()" }}>Created!</div>}
		</div>
	</div>;
};

export default NewApp;