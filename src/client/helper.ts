import { hashSync } from "bcryptjs";

let saltHolder: { salt: string, bestBefore: number } | undefined;

export async function serverHash(plain: string) {
	if (!saltHolder || Date.now() > saltHolder.bestBefore) {
		const res = await fetch("/api/salt");
		if (res.ok) {
			const newSaltHolder = await res.json();
			if (typeof newSaltHolder.salt != "string" || typeof newSaltHolder.bestBefore != "number")
				throw new Error("Could not parse server salt");
			saltHolder = newSaltHolder;
		}
		else throw new Error("Could not obtain server salt");
		console.log("Current salt:", saltHolder?.salt);
	}
	return hashSync(plain, saltHolder?.salt);
}