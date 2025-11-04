import { hashSync } from "bcryptjs";

export function timeHash(password: string) {
	const now = Math.floor(Date.now() / 300000); // 5 minutes
	return hashSync(password + now);
};