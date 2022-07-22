"use strict";

(() => {
function err(msg) {
	alert(msg, "Error");
}

// default error handler
window.onerror = (msg, src, lineno, colno, e) => {
	err(msg);
};

window.onbeforeunload = window.onunload = (e) => {
	storage.save();
};

Array.prototype.remove = function(element) {
	for (let i = 0; i < this.length; i++) {
		if (this[i] == element)
			this.splice(i, 1);
	}
};

let storage = (() => {
	let data = window.localStorage.getItem("data");
	if (data == null)
		data = "{}";
	data = JSON.parse(data);
	data.save = () => window.localStorage.setItem("data", JSON.stringify(data));
	data.getItem = (key, def) => {
		let item = data[key];
		if (item == null)
			return data[key] = def;
		return item;
	};

	let autosave = () => {
		data.save();
		setTimeout(autosave, 10000);
	};
	autosave();
	return data;
})();

if(!("serviceWorker" in navigator)) {
	// service workers are not supported
	alert("Your browser does not support service workers, please use a supported browser to continue", "Warning");
	return;
}

if (window != window.top) {
	// service workers are very likely to be rejected inside a frame
	alert(`This page might not function properly while running inside a frame, please click <a href="${window.location.href}" target="_blank">here</a> to open it in a new tab.`, "Warning");
}

let swReg = window.navigator.serviceWorker.register("/sw.js", {
	scope: "/",
	type: "classic",
	updateViaCache: "all"
});

let urlInput = document.getElementById("input");
let shortcutBar = document.getElementById("shortcut-bar");
let addShortcutButton = document.getElementById("add-shortcut");
let settingsMenu = document.getElementById("settings-menu");
let contextMenu = document.getElementById("context-menu");
let shortcutContextMenu = document.getElementById("shortcut-context-menu");
let proxyServer = document.getElementById("proxy-server");
let hideNav = document.getElementById("hide-nav");
let googleSearch = "https://www.google.com/search?q=";
let googleSearchR = "https://www.google.com/search?btnI=Im+Feeling+Lucky&q=";

let shortcuts = storage.shortcuts;
if (shortcuts == null)
	storage.shortcuts = shortcuts = [
		{
			name: "Google",
			icon: "res/google.svg",
			link: "https://www.google.com/"
		},
		{
			name: "YouTube",
			icon: "res/youtube.svg",
			link: "https://www.youtube.com/"
		},
		{
			name: "Facebook",
			icon: "res/facebook.svg",
			link: "https://www.facebook.com"
		},
		{
			name: "Instagram",
			icon: "res/instagram.svg",
			link: "https://www.instagram.com"
		},
		{
			name: "TikTok",
			icon: "res/tiktok.svg",
			link: "https://www.tiktok.com/"
		},
		{
			name: "Y8",
			icon: "https://www.y8.com/favicon.ico",
			link: "https://www.y8.com"
		}
	];

let proxy = storage.getItem("proxy", "https://incog.dev/bare/");
let enableFrame = storage.getItem("frame", false);

proxyServer.value = proxy;
hideNav.checked = enableFrame;

function updateShortcuts() {
	shortcutBar.innerHTML = "";
	for (let i = 0; i < shortcuts.length; i++) {
		let s = shortcuts[i];
		let item = document.createElement("div");
		item.className = "shortcut-item";
		item.onclick = () => _openUrl(s.link);
		item.oncontextmenu = (e) => {
			e.preventDefault();
			e.stopPropagation();
			shortcutContextMenu.style.top = e.clientY + "px";
			shortcutContextMenu.style.left = e.clientX + "px";
			shortcutContextMenu.style.display = "block";
			document.getElementById("delete-shortcut").onclick = () => {
				shortcuts.remove(s);
				storage.shortcuts = shortcuts;
				shortcutContextMenu.style.display = "none";
				updateShortcuts();
			};
			document.getElementById("edit-shortcut").onclick = () => {
				shortcutContextMenu.style.display = "none";
			};
		};

		let icon = document.createElement("img");
		icon.className = "shortcut-item-icon";
		icon.width = 60;
		icon.height = 60;
		icon.src = s.icon;
		item.appendChild(icon);

		let text = document.createElement("text");
		text.className = "shortcut-item-text";
		text.innerHTML = s.name;

		item.appendChild(text);
		shortcutBar.appendChild(item);
	}
	shortcutBar.appendChild(addShortcutButton);
}
updateShortcuts();

urlInput.onkeydown = (e) => {
	if (e.keyCode == 13) {
		e.preventDefault();
		run(googleSearch, false);
	}
};
document.getElementById("search-button").onclick = () => {
	run(googleSearch, true);
};
document.getElementById("random-button").onclick = () => {
	run(googleSearchR, true);
};
addShortcutButton.onclick = async () => {
	let name = await prompt("Name");
	if (name == null)
		return;
	if (name.length == 0) {
		alert("Please input a name");
		return;
	}

	let url = await prompt("URL");
	if (url == null)
		return;
	if (url.length == 0) {
		alert("Please input a URL");
		return;
	}

	try {
		url = new URL(url).href;
	} catch(e) {
		alert("Please input a valid URL that must start with http:// or https://");
		return;
	}

	shortcuts.push({
		name: name,
		icon: (() => {
			let favicon = new URL(url);
			favicon.pathname = "/favicon.ico";
			favicon.search = "";
			return favicon.href;
		})(),
		link: url
	});
	storage.shortcuts = shortcuts;
	updateShortcuts();
};
document.getElementById("clear-data").onclick = () => {
	contextMenu.style.display = "none";	
	window.sessionStorage.clear();
	window.localStorage.clear();
	window.caches.keys().then((keys) => {
		for (let i = 0; i < keys.length; i++)
			caches.delete(keys[i]);
	});
};
document.getElementById("settings-button").onclick = (e) => {
	e.stopPropagation();
	settingsMenu.style.display = "block";
};

document.body.onclick = (e) => {
	let elem = e.target;
	if (elem != settingsMenu && !settingsMenu.contains(elem))
		settingsMenu.style.display = "none";
	if (elem != contextMenu && !contextMenu.contains(elem))
		contextMenu.style.display = "none";
	if (elem != shortcutContextMenu && !shortcutContextMenu.contains(elem))
		shortcutContextMenu.style.display = "none";
};
document.oncontextmenu = (e) => {
	e.preventDefault();
	contextMenu.style.top = e.clientY + "px";
	contextMenu.style.left = e.clientX + "px";
	contextMenu.style.display = "block";
};
proxyServer.onblur = () => {
	storage.proxy = proxy = proxyServer.value;
};
hideNav.onchange = () => {
	storage.enableFrame = enableFrame = hideNav.checked;
};

function isUrl(str) {
	try {
		return new URL(str).href;
	} catch(err) {
		return null;
	}
}

function isHostname(str) {
	let containsSlash = str.includes("/");
	let host = str;
	if (containsSlash)
		host = str.substring(0, str.lastIndexOf("/"));

	if (/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^(?:(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){6})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:::(?:(?:(?:[0-9a-fA-F]{1,4})):){5})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:(?:[0-9a-fA-F]{1,4})):){4})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,1}(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:(?:[0-9a-fA-F]{1,4})):){3})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,2}(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:(?:[0-9a-fA-F]{1,4})):){2})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,3}(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:[0-9a-fA-F]{1,4})):)(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,4}(?:(?:[0-9a-fA-F]{1,4})))?::)(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,5}(?:(?:[0-9a-fA-F]{1,4})))?::)(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,6}(?:(?:[0-9a-fA-F]{1,4})))?::))))$/.test(host))
		return containsSlash || str.includes(".");
	return false;
}

function encodeUrl(url) {
	let eurl = __uv$config.encodeUrl(url);
	let base = new URL(window.location.href);
	base.pathname = "/";
	base.search = "";
	base = base.href.slice(0, -1);
	return base +  __uv$config.prefix + eurl;
}

function fixUrl(url, searchUrl, searchOnly) {
	url = url.replace(/^\s+|\s+$/gm, "");

	if (searchOnly)
		return searchUrl + encodeURIComponent(url);
	if (isUrl(url))
		return url;
	if (isHostname(url))
		return "https://" + url;

	return searchUrl + encodeURIComponent(url);
}

async function openUrl(win, url) {
	win.location = new URL(encodeUrl(url));
}

function _openUrl(url) {
	__uv$config.bare = new URL(proxyServer.value).href;
	if (hideNav.checked) {
		document.getElementById("main-screen").style.display = "none";
		document.getElementById("frame-screen").style.display = "block";
		openUrl(document.getElementById("frame").contentWindow, url);
	} else {
		openUrl(window, url);
	}
}

function run(searchUrl, searchOnly) {
	let url = fixUrl(urlInput.value, searchUrl, searchOnly);
	_openUrl(url);
}

})();
