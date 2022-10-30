import swreg from "./swreg.js";

const location = new URL(window.location.href);
const swUrl = location.searchParams.get("swurl");

if (swUrl == null || swUrl.length == 0) {
	console.warn("Variable swurl not specified.");
} else {
	await swreg.registerServiceWorker(swUrl);
	swreg.tick(swUrl, 8000);
}

export const locker = { lock: () => { /*****/ console.log("%cPage Verified", "position: relative;display: block;width: fit-content;height: fit-content;color: #ffffff;background-color: #008000;font-size: 14px;font-weight: 600;font-family: \"Ubuntu Mono\";font-stretch: normal;text-align: start;text-decoration: none;"); } };
