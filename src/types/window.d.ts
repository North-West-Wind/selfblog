import { ServerData } from "../client/data";

declare global {
    interface Window {
        pageData?: ServerData
    }
}