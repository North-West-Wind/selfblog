import { ServerData } from "../client/data";
import { Post } from "../util";

declare global {
    interface Window {
        pageData?: {
            latest?: string,
            posts?: Post[],
            title?: string,
            date?: string,
            summary?: string,
            html?: string
        }
    }
}