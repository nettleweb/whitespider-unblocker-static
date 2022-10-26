"use strict";

(() => {

const location = (() => {
	// DOM Context
	const doc = self.document;
	if (doc != null) {
		return new URL(doc.currentScript.src);
	}

	// Worker Context
	return new URL(self.location.href);
})();
const configStr = location.searchParams.get("config");
const mode = location.searchParams.get("mode");

if (configStr == null || configStr.length == 0) {
	throw new Error("No config specified in search params");
}

const config = JSON.parse(configStr);
const coder=new function(){this.encode=e=>{e=function(e){if(e instanceof URL)return e.href;try{return new URL(e).href}catch(r){throw TypeError("Invalid URL: "+e)}}(e);let r=Array.from(e).map(((e,r)=>r%2?String.fromCharCode(127^e.charCodeAt(0)):e)).join("");return encodeURIComponent(r)},this.decode=e=>{let[r,...n]=e.split("?");return r=decodeURIComponent(r),Array.from(r).map(((e,r)=>r%2?String.fromCodePoint(127^e.charCodeAt(0)):e)).join("")+(n.length?"?"+n.join("?"):"")}};
config.encodeUrl = coder.encode;
config.decodeUrl = coder.decode;
config.config = (() => {
	location.searchParams.set("config", JSON.stringify(config));
	location.searchParams.set("mode", "get");
	return location.href;
})();

if (mode === "get") {
	self.__uv$config = config;
	return;
}

// SERVICE WORKER

importScripts("/uv/uv.sw.js");
importScripts("/app.js");

const sw = new UVServiceWorker(config);
const cacheName = `${location.hostname}-${app.cacheName}-${app.cacheVersion}`;

async function install() {
	const cache = await caches.open(cacheName);
	await cache.addAll(app.cacheList);
}

/**
 * @param {Request} request 
 * @param {Response} response 
 */
async function cache(request, response) {
	try {
		const cache = await caches.open(cacheName);
		await cache.put(request, response.clone());
	} catch(err) {
		// ignore - this is usually caused by an unsupported request method
	}
}

/**
 * @param {Request} request 
 */
async function fetchRe(request) {
	let response = await caches.match(request, { cacheName });
	if (response == null) {
		response = await sw.fetch(request);
		if (response == null) {
			// fetch as normal
			response = await fetch(request);

			// cross-origin response
			if (response.status == 0)
				return response;

			await cache(request, response);
		}
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: (() => {
			let head = new Headers(response.headers);
			for (let e of Object.entries(app.headers))
				head.set(e[0], e[1]);
			return head;
		})()
	});
}

async function removeOldCaches() {
	for (let k of await caches.keys()) {
		if (k != cacheName)
			await caches.delete(k);
	}
}

self.addEventListener("install", (event) => {
	event.waitUntil(install());
});

self.addEventListener("fetch", (event) => {
	event.respondWith(fetchRe(event.request));
});

self.addEventListener("activate", (event) => {
	event.waitUntil(removeOldCaches());
});

})();