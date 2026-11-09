import { useCallback, useEffect, useRef, useState } from "react";
import { ToastContainer, toast } from 'react-toastify';
import { serverHash } from "../helper";
import { Group, Panel, Separator } from "react-resizable-panels";
import MDEditor from '@uiw/react-md-editor';
import { useFilePicker } from "use-file-picker";
import { TargetedKeyboardEvent } from "preact";
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

export default function EditorComponent() {
	const passwordRef = useRef("");
	const textRef = useRef("");
	const [loaded, setLoaded] = useState(false);
	const [files, setFiles] = useState<string[]>([]);
	const [text, setText] = useState<string>();
  const { openFilePicker, plainFiles, clear } = useFilePicker({
		multiple: true,
		readFilesContent: false,
	});

	// Ctrl+S save
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

	const onPasswordKeyUp = useCallback((e: TargetedKeyboardEvent<HTMLInputElement>) => {
		if (e.key != "Enter") return;
		passwordRef.current = e.currentTarget.value;

		e.preventDefault();
		(e.target as HTMLInputElement).blur();
	}, []);

	useEffect(() => {
		textRef.current = text || "";
	}, [text]);

	const save = useCallback(() => {
		if (!passwordRef.current) return;
		toast.promise(async () => {
			const res = await fetch(`/api${window.location.pathname}/save`, {
				method: "POST",
				headers: { Authorization: await serverHash(passwordRef.current), "Content-Type": "text/plain" },
				body: textRef.current
			});
			if (!res.ok) throw new Error("Save not OK");
		}, {
			pending: "Saving...",
			success: "Saved!",
			error: "Failed to save!"
		});
	}, []);

	const reload = useCallback(() => {
		if (!passwordRef.current) return;
		toast.promise(async () => {
			let res = await fetch(`/api${window.location.pathname}/files`, { headers: { Authorization: await serverHash(passwordRef.current) } });
			if (!res.ok) throw new Error("Reload not OK");
			setFiles((await res.text()).split("\n"));

			res = await fetch(`/api${window.location.pathname}/file/index.md`);
			if (!res.ok) throw new Error("Load markdown not OK");
			setText(await res.text());
			setLoaded(true);
		}, {
			pending: "Reloading files...",
			success: "Reloaded files",
			error: "Failed to reload files!"
		});
	}, []);

	const rename = useCallback((file: string) => {
		if (!passwordRef.current) return;
		const name = prompt("Rename to:");
		if (!name) return;
		toast.promise(async () => {
			const res = await fetch(`/api${window.location.pathname}/file/${file}`, {
				method: "PATCH",
				headers: { Authorization: await serverHash(passwordRef.current), "Content-Type": "text/plain" },
				body: name
			});
			if (!res.ok) throw new Error("Rename not OK");
		}, {
			pending: `Renaming "${file}" to "${name}"...`,
			success: `Renamed "${file}" to "${name}"`,
			error: "Failed to rename file!"
		});
	}, []);

	const renameTitle = useCallback(async () => {
		if (!passwordRef.current) return;
		const name = prompt("New title:");
		if (!name) return;
		const res = await fetch(`/api${window.location.pathname}/rename`, {
			method: "PATCH",
			headers: { Authorization: await serverHash(passwordRef.current), "Content-Type": "text/plain" },
			body: name
		});
		if (res.ok) {
			const paths = window.location.pathname.split("/");
			paths[paths.length - 1] = await res.text();
			window.location.pathname = paths.join("/");
		}
	}, []);

	const deleteFile = useCallback((file: string) => {
		if (!passwordRef.current) return;
		const result = confirm("Are you sure you want to delete this file?");
		if (!result) return;
		toast.promise(async () => {
			const res = await fetch(`/api${window.location.pathname}/file/${file}`, {
				method: "DELETE",
				headers: { Authorization: await serverHash(passwordRef.current) }
			});
			if (!res.ok) throw new Error("Delete not OK");
		}, {
			pending: `Deleting "${file}"...`,
			success: `Deleted ${file}`,
			error: "Failed to delete file!"
		});
	}, []);

	// Upload button opens file picker
	// File picker changes plainFiles
	useEffect(() => {
		if (!plainFiles.length) return;
		(async () => {
			for (const file of plainFiles) {
				await toast.promise(async () => {
					const res = await fetch(`/api${window.location.pathname}/file/${file.name}`, {
						method: "POST",
						headers: { Authorization: await serverHash(passwordRef.current), "Content-Type": "application/octet-stream" },
						body: file.stream(),
						//@ts-ignore
						duplex: "half"
					});
					if (!res.ok) throw new Error("Upload not OK");
				}, {
					pending: `Uploading "${file.name}"...`,
					success: `Uploaded "${file.name}"`,
					error: `Failed to upload "${file.name}"`
				});
			}
			reload();
			clear();
		})();
	}, [plainFiles]);

	const publish = async () => {
		if (files.every(file => file != ".hidden")) return toast.warn("Already published");
		if (!confirm("Are you sure you want to publish this blog post?")) return;
		
		toast.promise(new Promise<void>(async (resolve, reject) => {
			fetch(`/api${window.location.pathname}/publish`, {
				method: "POST",
				headers: { Authorization: await serverHash(passwordRef.current) }
			}).then(res => {
				if (res.ok) {
					reload();
					resolve();
				} else reject();
			});
		}), {
			pending: "Publishing...",
			success: "Published!",
			error: "Failed to publish post!"
		});
	};

	return <div className="flex" style={{ height: "100vh" }}>
		<Group>
			<Panel defaultSize="25%" minSize={100} collapsible style={{ padding: "1vmin" }}>
				<div className="flex"><input
					type="password"
					placeholder="Password..."
					style={{ width: "100%" }}
					value={passwordRef.current}
					onKeyDown={e => {
						if (e.key === "Enter")
							e.preventDefault();
					}}
					onKeyUp={onPasswordKeyUp} onBlur={reload}
				/></div>
				<div className="flex">
					<button className="button flex-child" onClick={renameTitle}>Rename Title</button>
				</div>
				<h2>Files</h2>
				<ul>
					{files.map(file => [".hidden", "index.md"].includes(file) ? undefined : <li key={file} className="flex vcenter">
						<a href={window.location.pathname.replace("edit", "p") + "/" + file} target={"_blank"}>{file}</a>
						<div className="flex" style={{ marginLeft: "auto", order: 2 }}>
							<div className="file-button" onClick={() => rename(file)} title="Rename">R</div>
							<div className="file-button" style={{ backgroundColor: "#ff0000" }} onClick={() => deleteFile(file)} title="Delete">X</div>
						</div>
					</li>)}
				</ul>
				<div className="flex">
					<button className="button flex-child" onClick={save}>Save</button>
					<button className="button flex-child" onClick={reload}>Reload</button>
				</div>
				<div className="flex">
					<button className="button flex-child" onClick={openFilePicker} disabled={!!plainFiles.length}>Upload Files</button>
				</div>
				<div className="flex">
					<button className="button flex-child" onClick={publish} disabled={files.every(file => file != ".hidden")}>Publish</button>
				</div>
			</Panel>
			<Separator />
			<Panel defaultSize="75%" minSize="50%" style={{ overflowY: "hidden" }}>
				<MDEditor value={text} onChange={setText} height={null} disabled={!loaded} />
				<MDEditor.Markdown source={text} style={{ whiteSpace: "pre-wrap" }} />
			</Panel>
		</Group>
		<ToastContainer
			position="bottom-left"
			autoClose={3000}
			closeOnClick
			pauseOnFocusLoss
			pauseOnHover
			theme="dark"
		/>
	</div>;
}