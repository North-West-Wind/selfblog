import { Editor } from "@monaco-editor/react";
import { hashSync } from "bcryptjs";
import React from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default class EditorComponent extends React.Component {
	state: { code: string, file: string, files: { name: string, type: "txt" | "bin" }[], password: string };

	constructor(props: object) {
		super(props);
		this.state = { code: "", file: window.location.hash?.slice(1), files: [], password: "" };

		window.addEventListener("hashchange", () => {
			const file = window.location.hash?.slice(1);
			this.setState({ file });
			if (this.state.password)
				fetch(`/api${window.location.pathname}/${file}`, { headers: { Authorization: hashSync(this.state.password) } }).then(async res => {
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

	onPwKeyUp(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key == "Enter") {
			e.preventDefault();
			(e.target as HTMLInputElement).blur();
		}
	}

	save() {
		if (this.state.password)
			toast.promise(new Promise<void>((resolve, reject) => {
				fetch(`/api${window.location.pathname}/${this.state.file}`, {
					method: "POST",
					headers: { Authorization: hashSync(this.state.password), "Content-Type": "application/json" },
					body: JSON.stringify({ code: this.state.code })
				}).then(res => {
					if (res.ok) resolve();
					else reject();
				});
			}), {
				pending: "Saving...",
				success: "File saved!",
				error: "Failed to save file!"
			});
	}

	reload() {
		if (this.state.password) {
			toast.promise(new Promise<void>((resolve, reject) => {
				fetch(`/api${window.location.pathname}/files`, { headers: { Authorization: hashSync(this.state.password) } }).then(async res => {
					if (res.ok) {
						this.setState({ files: await res.json() });
						resolve();
					} else reject();
				});
			}), {
				pending: "Reloading...",
				success: "File list reloaded!",
				error: "Failed to reload file list!"
			})
			if (this.state.file) {
				toast.promise(new Promise<void>((resolve, reject) => {
					fetch(`/api${window.location.pathname}/${this.state.file}`, { headers: { Authorization: hashSync(this.state.password) } }).then(async res => {
						const text = await res.text();
						if (res.ok) {
							this.setState({ code: text });
							resolve();
						} else {
							this.setState({ code: "" });
							reject();
						}
					});
				}), {
					pending: "Reloading...",
					success: "File content reloaded!",
					error: "Failed to reload file content!"
				});
			}
		}
	}

	rename(file: string) {
		if (this.state.password) {
			const name = prompt("Rename to:");
			if (!name) return;
			toast.promise(new Promise<void>((resolve, reject) => {
				fetch(`/api${window.location.pathname}/${file}`, {
					method: "PATCH",
					headers: { Authorization: hashSync(this.state.password), "Content-Type": "application/json" },
					body: JSON.stringify({ name })
				}).then(res => {
					if (res.ok) {
						this.reload();
						if (this.state.file == file) window.location.hash = name;
						resolve();
					} else reject();
				});
			}), {
				pending: "Renaming...",
				success: "File renamed!",
				error: "Failed to name file!"
			});
		}
	}

	renamePath() {
		if (this.state.password) {
			const name = prompt("New path name:");
			if (!name) return;
			fetch(`/api${window.location.pathname}/rename`, {
				method: "POST",
				headers: { Authorization: hashSync(this.state.password), "Content-Type": "application/json" },
				body: JSON.stringify({ name })
			}).then(async res => {
				if (res.ok) {
					const paths = window.location.pathname.split("/");
					paths[paths.length - 1] = await res.text();
					window.location.pathname = paths.join("/");
				}
			});
		}
	}

	newFile() {
		if (this.state.password) {
			const name = prompt("File name:");
			if (!name) return;
			toast.promise(new Promise<void>((resolve, reject) => {
				fetch(`/api${window.location.pathname}/new`, {
					method: "POST",
					headers: { Authorization: hashSync(this.state.password), "Content-Type": "application/json" },
					body: JSON.stringify({ name })
				}).then(res => {
					if (res.ok) {
						this.reload();
						window.location.hash = name;
						resolve();
					} else reject();
				});
			}), {
				pending: "Creating...",
				success: "File created!",
				error: "Failed to create file!"
			});
		}
	}

	delete(file: string) {
		if (this.state.password) {
			const result = confirm("Are you sure you want to delete this file?");
			if (!result) return;
			toast.promise(new Promise<void>((resolve, reject) => {
				fetch(`/api${window.location.pathname}/${file}`, {
					method: "DELETE",
					headers: { Authorization: hashSync(this.state.password), "Content-Type": "application/json" }
				}).then(res => {
					if (res.ok) {
						this.reload();
						if (this.state.file == file) window.location.hash = "";
						resolve();
					} else reject();
				});
			}), {
				pending: "Deleting...",
				success: "File deleted!",
				error: "Failed to delete file!"
			});
		}
	}

	render() {
		return <div className="flex" style={{ position: "fixed", top: 0, left: 0 }}>
			<div style={{ width: "20%", padding: "1vw" }}>
				<div className="flex"><input form="upload" name="password" type="password" placeholder="Password..." style={{ width: "100%" }} value={this.state.password} onChange={(e) => this.setState({ password: (e.target as HTMLInputElement).value })} onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }} onKeyUp={e => this.onPwKeyUp(e)} onBlur={() => this.reload()} /></div>
				<div className="flex">
					<div className="button flex-child" onClick={() => this.renamePath()}>Rename Path</div>
				</div>
				<h2>Files</h2>
				<ul>
					{this.state.files.map(f => <li key={f.name} className="flex vcenter">
						<a href={f.type == "txt" ? "#" + f.name : (window.location.pathname.replace("edit", "p") + "/" + f.name)} target={f.type == "txt" ? undefined : "binary"}>{f.name}</a>
						<div className="flex" style={{ marginLeft: "auto", order: 2 }}>
							<div className="file-button" onClick={() => this.rename(f.name)} title="Rename">R</div>
							<div className="file-button" style={{ backgroundColor: "#ff0000" }} onClick={() => this.delete(f.name)} title="Delete">X</div>
						</div>
					</li>)}
				</ul>
				<div className="flex">
					<div className="button flex-child" onClick={() => this.newFile()}>New</div>
				</div>
				<div className="flex">
					<div className="button flex-child" onClick={() => this.save()}>Save</div>
					<div className="button flex-child" onClick={() => this.reload()}>Reload</div>
				</div>
				<iframe name="useless" style={{ display: "none" }}></iframe>
				<form id="upload" action={`/api${window.location.pathname}/upload`} method="post" encType="multipart/form-data" className="flex" target="useless" onSubmit={() => toast("File submitted! Try reloading.")}>
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
				width="80%"
				height="100vh"
				theme="vs-dark"
			/>
			<ToastContainer
				position="bottom-right"
				autoClose={3000}
				closeOnClick
				pauseOnFocusLoss
				pauseOnHover
				theme="dark"
			/>
		</div>
	}
}