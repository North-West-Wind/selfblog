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

const siteName = process.env.SITE_NAME || "Blog";
const siteDescription = process.env.SITE_DESCRIPTION || "This is a blog";

const feedImage = process.env.FEED_IMAGE;
const feedFavicon = process.env.FEED_FAVICON;
const feedCopyright = process.env.FEED_COPYRIGHT || "All rights reserved";
const feedAuthor = process.env.FEED_AUTHOR;
const feedAuthorLink = process.env.FEED_AUTHOR_LINK;

const apUsername = process.env.AP_USERNAME || "";

export {
	dataDir,
	debugFlag,
	port,
	baseUrl,
	password,
	redirectAbout,
	donateAbout,
	siteName,
	siteDescription,
	feedImage,
	feedFavicon,
	feedCopyright,
	feedAuthor,
	feedAuthorLink,
	apUsername
};