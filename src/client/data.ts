import { createContext } from "preact";
import type { Post } from "../util";

export type ServerData = { latest?: string, posts?: Post[], markdown?: string };
export const DataContext = createContext<ServerData | undefined>(undefined);