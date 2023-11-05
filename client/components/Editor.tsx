import { Editor } from "@monaco-editor/react";
import React from "react";

export default class EditorComponent extends React.Component {
	state: { code: string, file: string, files: { name: string, type: "txt" | "bin" }[], password: string };

	constructor(props: object) {
		super(props);
		this.state = { code: "", file: window.location.hash?.slice(1), files: [], password: "" };

		window.addEventListener("hashchange", () => {
			const file = window.location.hash?.slice(1);
			this.setState({ file });
			if (this.state.password)
				fetch(`/api${window.location.pathname}/${file}`, { headers: { Authorization: `Bearer ${this.state.password}` } }).then(async res => {
					if (res.ok) this.setState({ code: await res.text() });
					else this.setState({ code: "" });
				});
		});

		window.addEventListener("keydown", (e) => {
			if (e.key == "s" && e.ctrlKey) {
				e.preventDefault();
				this.save();
			}
		});
	}

	onPwKeyUp(e: React.KeyboardEvent) {
		if (e.key == "Enter") {
			(e.target as HTMLInputElement).blur();
			this.reload();
		}
	}

	save() {
		if (this.state.password)
			fetch(`/api${window.location.pathname}/${this.state.file}`, {
				method: "POST",
				headers: { Authorization: `Bearer ${this.state.password}`, "Content-Type": "application/json" },
				body: JSON.stringify({ code: this.state.code })
			});
	}

	reload() {
		if (this.state.password) {
			fetch(`/api${window.location.pathname}/files`, { headers: { Authorization: `Bearer ${this.state.password}` } }).then(async res => {
				if (res.ok) this.setState({ files: await res.json() });
			});
			if (this.state.file) {
				fetch(`/api${window.location.pathname}/${this.state.file}`, { headers: { Authorization: `Bearer ${this.state.password}` } }).then(async res => {
					const text = await res.text();
					if (res.ok) this.setState({ code: text });
					else this.setState({ code: "" });
				});
			}
		}
	}

	rename() {
		if (this.state.password) {
			const name = prompt("Rename to:");
			if (!name) return;
			fetch(`/api${window.location.pathname}/${this.state.file}`, {
				method: "PATCH",
				headers: { Authorization: `Bearer ${this.state.password}`, "Content-Type": "application/json" },
				body: JSON.stringify({ name })
			}).then(res => {
				if (res.ok) {
					this.reload();
					window.location.hash = name;
				}
			});
		}
	}

	newFile() {
		if (this.state.password) {
			const name = prompt("File name:");
			if (!name) return;
			fetch(`/api${window.location.pathname}/new`, {
				method: "POST",
				headers: { Authorization: `Bearer ${this.state.password}`, "Content-Type": "application/json" },
				body: JSON.stringify({ name })
			}).then(res => {
				if (res.ok) {
					this.reload();
					window.location.hash = name;
				}
			});
		}
	}

	delete() {
		if (this.state.password) {
			const result = confirm("Are you sure you want to delete this file?");
			if (!result) return;
			fetch(`/api${window.location.pathname}/${this.state.file}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${this.state.password}`, "Content-Type": "application/json" }
			}).then(res => {
				if (res.ok) {
					this.reload();
					window.location.hash = "";
				}
			});
		}
	}

	render() {
		return <div className="flex" style={{ position: "fixed", top: 0, left: 0 }}>
			<div style={{ width: "20%", padding: "1vw" }}>
				<div className="flex"><input type="password" placeholder="Password..." style={{ width: "100%" }} value={this.state.password} onChange={(e) => this.setState({ password: e.target.value })} onKeyUp={e => this.onPwKeyUp(e)} /></div>
				<h2>Files</h2>
				<ul>
					{this.state.files.map(f => <li key={f.name}><a href={f.type == "txt" ? "#" + f.name : f.name} target={f.type == "txt" ? undefined : "binary"}>{f.name}</a></li>)}
				</ul>
				<div className="flex">
					<div className="button flex-child" onClick={() => this.newFile()}>New</div>
				</div>
				<div className="flex">
					<div className="button flex-child" onClick={() => this.save()}>Save</div>
					<div className="button flex-child" onClick={() => this.reload()}>Reload</div>
				</div>
				<div className="flex">
					<div className="button flex-child" onClick={() => this.rename()}>Rename</div>
					<div className="button flex-child" onClick={() => this.delete()}>Delete</div>
				</div>
				<iframe name="useless" style={{ display: "none" }}></iframe>
				<form action={`/api${window.location.pathname}/upload`} method="post" encType="multipart/form-data" className="flex" target="useless">
					<div>
					  <div className="flex"><input id="file" name="file" type="file" /></div>
						<div className="flex" style={{ marginTop: "1vh" }}>
					  	<button className="button" style={{ border: "none", width: "100%" }}>Upload</button>
						</div>
					</div>
				</form>
			</div>
			<Editor
				value={this.state.code}
				language={this.state.file?.split(".").pop() || "txt"}
				onChange={(value) => this.setState({ code: value })}
				height="100vh"
				theme="vs-dark"
			/>
		</div>
	}
}