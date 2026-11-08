import { hashSync } from "bcryptjs";
import z from "zod";

const SaltHolderSchema = z.object({
	salt: z.string(),
	bestBefore: z.number()
});

let saltHolder: z.infer<typeof SaltHolderSchema> | undefined;

export async function serverHash(plain: string) {
	if (!saltHolder || Date.now() > saltHolder.bestBefore) {
		const res = await fetch("/api/salt");
		if (res.ok) saltHolder = SaltHolderSchema.parse(await res.json());
		else throw new Error("Could not obtain server salt")
	}
	return hashSync(plain, saltHolder?.salt);
}