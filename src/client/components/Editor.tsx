import { Editor, useMonaco } from "@monaco-editor/react";
import { hashSync } from "bcryptjs";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

let code = "";
let password = "";

export default function EditorComponent() {
	const [file, setFile] = useState(window.location.hash?.slice(1));
	const [files, setFiles] = useState<{ name: string, type: "txt" | "bin" }[]>([]);
	const [hashed, setHashed] = useState("");
	const monaco = useMonaco();

	useEffect(() => {
		monaco?.languages.typescript.javascriptDefaults.setEagerModelSync(true);
		
		const hashchange = () => {
			const file = window.location.hash?.slice(1);
			setFile(file);
			if (password)
				fetch(`/api${window.location.pathname}/${file}`, { headers: { Authorization: hashSync(password) } }).then(async res => {
					if (res.ok) {
						const text = await res.text();
						code = text;
						monaco?.editor.getModels()[0].setValue(text);
					} else {
						code = "";
						monaco?.editor.getModels()[0].setValue("");
					}
				});
		};

		window.addEventListener("hashchange", hashchange);
		return () => window.removeEventListener("hashchange", hashchange);
	}, [monaco]);

	useEffect(() => {
		const keydown = (ev: KeyboardEvent) => {
			if (ev.key == "s" && ev.ctrlKey) {
				ev.preventDefault();
				save();
			}
		};

		window.addEventListener("keydown", keydown);
		return () => window.removeEventListener("keydown", keydown);
	}, []);

	const onPwKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key == "Enter") {
			password = e.currentTarget.value;
			setHashed(hashSync(password));

			e.preventDefault();
			(e.target as HTMLInputElement).blur();
		}
	}

	const save = () => {
		if (password)
			toast.promise(new Promise<void>((resolve, reject) => {
				fetch(`/api${window.location.pathname}/${file}`, {
					method: "POST",
					headers: { Authorization: hashSync(password), "Content-Type": "application/json" },
					body: JSON.stringify({ code })
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

	const reload = () => {
		if (password) {
			toast.promise(new Promise<void>((resolve, reject) => {
				fetch(`/api${window.location.pathname}/files`, { headers: { Authorization: hashSync(password) } }).then(async res => {
					if (res.ok) {
						setFiles(await res.json());
						resolve();
					} else reject();
				});
			}), {
				pending: "Reloading...",
				success: "File list reloaded!",
				error: "Failed to reload file list!"
			})
			if (file) {
				toast.promise(new Promise<void>((resolve, reject) => {
					fetch(`/api${window.location.pathname}/${file}`, { headers: { Authorization: hashSync(password) } }).then(async res => {
						const text = await res.text();
						if (res.ok) {
							code = text;
							monaco?.editor.getModels()[0].setValue(text);
							resolve();
						} else {
							code = "";
							monaco?.editor.getModels()[0].setValue("");
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

	const rename = (currentFile: string) => {
		if (password) {
			const name = prompt("Rename to:");
			if (!name) return;
			toast.promise(new Promise<void>((resolve, reject) => {
				fetch(`/api${window.location.pathname}/${currentFile}`, {
					method: "PATCH",
					headers: { Authorization: hashSync(password), "Content-Type": "application/json" },
					body: JSON.stringify({ name })
				}).then(res => {
					if (res.ok) {
						reload();
						if (file == currentFile) window.location.hash = name;
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

	const renamePath = () => {
		if (password) {
			const name = prompt("New path name:");
			if (!name) return;
			fetch(`/api${window.location.pathname}/rename`, {
				method: "POST",
				headers: { Authorization: hashSync(password), "Content-Type": "application/json" },
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

	const newFile = () => {
		if (password) {
			const name = prompt("File name:");
			if (!name) return;
			toast.promise(new Promise<void>((resolve, reject) => {
				fetch(`/api${window.location.pathname}/new`, {
					method: "POST",
					headers: { Authorization: hashSync(password), "Content-Type": "application/json" },
					body: JSON.stringify({ name })
				}).then(res => {
					if (res.ok) {
						reload();
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

	const deleteFile = (currentFile: string) => {
		if (password) {
			const result = confirm("Are you sure you want to delete this file?");
			if (!result) return;
			toast.promise(new Promise<void>((resolve, reject) => {
				fetch(`/api${window.location.pathname}/${currentFile}`, {
					method: "DELETE",
					headers: { Authorization: hashSync(password), "Content-Type": "application/json" }
				}).then(res => {
					if (res.ok) {
						reload();
						if (file == currentFile) window.location.hash = "";
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

	return <div className="flex" style={{ position: "fixed", top: 0, left: 0 }}>
		<div style={{ width: "20%", padding: "1vw" }}>
			<div className="flex"><input
				type="password"
				placeholder="Password..."
				style={{ width: "100%" }}
				value={password}
				onKeyDown={e => {
					if (e.key === "Enter")
						e.preventDefault();
				}}
				onKeyUp={e => onPwKeyUp(e)} onBlur={() => reload()}
			/></div>
			<div className="flex">
				<div className="button flex-child" onClick={() => renamePath()}>Rename Path</div>
			</div>
			<h2>Files</h2>
			<ul>
				{files.map(f => <li key={f.name} className="flex vcenter">
					<a href={f.type == "txt" ? "#" + f.name : (window.location.pathname.replace("edit", "p") + "/" + f.name)} target={f.type == "txt" ? undefined : "binary"}>{f.name}</a>
					<div className="flex" style={{ marginLeft: "auto", order: 2 }}>
						<div className="file-button" onClick={() => rename(f.name)} title="Rename">R</div>
						<div className="file-button" style={{ backgroundColor: "#ff0000" }} onClick={() => deleteFile(f.name)} title="Delete">X</div>
					</div>
				</li>)}
			</ul>
			<div className="flex">
				<div className="button flex-child" onClick={() => newFile()}>New</div>
			</div>
			<div className="flex">
				<div className="button flex-child" onClick={() => save()}>Save</div>
				<div className="button flex-child" onClick={() => reload()}>Reload</div>
			</div>
			<iframe name="useless" style={{ display: "none" }}></iframe>
			<form id="upload" action={`/api${window.location.pathname}/upload`} method="post" encType="multipart/form-data" className="flex" target="useless" onSubmit={() => toast("File submitted! Try reloading.")}>
				{/* Hidden input field for sending password as POST body parsed by multer */}
				<input class="hidden" value={hashed} name="password" />
				<div>
				  <div className="flex"><input id="file" name="file" type="file" /></div>
					<div className="flex" style={{ marginTop: "1vh" }}>
				  	<button className="button" style={{ border: "none", width: "100%" }}>Upload</button>
					</div>
				</div>
			</form>
		</div>
		<Editor
			language={file?.split(".").pop() || "txt"}
			onChange={(value) => code = value || ""}
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
	</div>;
}