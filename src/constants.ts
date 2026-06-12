import "dotenv/config";

const dataDir = process.env.DATA_DIR || "data";
const debugFlag = !!process.env.DEBUG;
const port = process.env.PORT || 3000;

const baseUrl = process.env.BASE_URL!;
if (!baseUrl) throw new Error("Missing BASE_URL environment variable");
const password = process.env.PASSWORD!;
if (!password) throw new Error("Missing PASSWORD environment variable");

const redirectAbout = process.env.ABOUT_REDIRECT;
const donateAbout = process.env.DONATE_REDIRECT;

const apUsername = process.env.AP_USERNAME!;
const apDisplayName = process.env.AP_DISPLAYNAME;
const apSummary = process.env.AP_SUMMARY;

export { dataDir, debugFlag, port, baseUrl, password, redirectAbout, donateAbout, apUsername, apDisplayName, apSummary };