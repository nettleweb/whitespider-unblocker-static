"use strict";

(() => {

let location = (() => {
	if (typeof document != "undefined")
		return document.currentScript.src;
	return self.location.href;
})();

function getQueryString(key, fallback,  url = location) {
	key = key.replace(/[\[\]]/g, '\\$&');
	let regex = new RegExp('[?&]' + key + '(=([^&#]*)|&|#|$)');
	let results = regex.exec(url);
	if (!results) return fallback;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

let config = JSON.parse(getQueryString("config", "{}"));
config.encodeUrl = (url) => encodeURIComponent(url);
config.decodeUrl = (url) => decodeURIComponent(url);
self.__uv$config = config;

let mode = getQueryString("mode", "");
if (mode == "get")
	return;

importScripts("/uv/uv.sw.js");
let sw = new UVServiceWorker(config);
self.addEventListener('fetch', event => event.respondWith(sw.fetch(event)));

})();
