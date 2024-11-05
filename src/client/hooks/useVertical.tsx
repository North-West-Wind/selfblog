import { useEffect, useState } from "preact/hooks";

const useVertical = () => {
	const [vertical, setVertical] = useState(false);
	useEffect(() => {
		const onresize = () => {
			console.log("resizing. vertical?", window.innerWidth < window.innerHeight);
			setVertical(window.innerWidth < window.innerHeight);
		};
		onresize();
		window.addEventListener("resize", onresize);
		return () => window.removeEventListener("resize", onresize);
	}, []);
	return vertical;
}

export default useVertical;