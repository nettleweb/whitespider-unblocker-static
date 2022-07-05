"use strict";

(() => {
importScripts("/uv/uv.sw.js");
importScripts('/uv/uv.config.js');

function getQueryString(name, fallback = null, url) {
	name = name.replace(/[\[\]]/g, '\\$&');
	let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
	let results = regex.exec(url);
	if (results == null)
		return fallback;
	if (results[2] == null)
		return "";
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function createServiceWorker() {
	let configStr = getQueryString("config", "", self.location.href);
	let defcfg = __uv$config;
	if (configStr.length > 0) {
		let cfg = JSON.parse(configStr);
		cfg.encodeUrl = (url) => encodeURIComponent(url);
		cfg.decodeUrl = (url) => decodeURIComponent(url);
		defcfg = cfg;
	}
	return new UVServiceWorker(defcfg);
}

let sw = createServiceWorker();
self.addEventListener('fetch', event => event.respondWith(sw.fetch(event)));

})();
