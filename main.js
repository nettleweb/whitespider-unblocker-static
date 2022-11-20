"use strict";

(async () => {

// default error handler
window.onerror = (message, src, lineno, colno, error) => {
	alert(`Error at "${src}", line ${lineno}:${colno}: \n${error}`, "Error");
};

Array.prototype.remove = function(element) {
	for (let i = 0; i < this.length; i++) {
		if (this[i] == element)
			this.splice(i, 1);
	}
};

const backgroundScreen = document.getElementById("background-screen");
const homeScreen = document.getElementById("home-screen");
const tomcatScreen = document.getElementById("tomcat-screen");
const backButton = document.getElementById("back");
const forwardButton = document.getElementById("forward");
const refreshButton = document.getElementById("refresh");
const addressBar = document.getElementById("address-bar");
const frame = document.getElementById("frame");
const input = document.getElementById("c");

const nsw = window.navigator.serviceWorker;
if (nsw != null) {
	try {
		await nsw.register("/sw.js", {
			scope: "/",
			type: "classic",
			updateViaCache: "none"
		});
		await nsw.ready;
	} catch(err) {
		console.log(err);
		// ignore as service worker is now optional
	}
}

let frameKilled = false;

/**
 * @param {string} str 
 */
function isUrl(str) {
	try {
		return new URL(str).href;
	} catch(err) {
		return null;
	}
}

/**
 * @param {string} str 
 */
function isHostname(str) {
	const slash = str.indexOf("/");
	if (slash > 0) {
		str = str.substring(0, slash);
	}
	str = str.toLowerCase();

	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		if (ch != 0x2d/*hyphen*/ && ch != 0x2e/*dot*/ && (ch < 0x30 || ch > 0x39)/*0-9*/ && (ch < 0x61 || ch > 0x7a)/*a-z*/) {
			return false;
		}
	}

	return slash > 0 || str.includes(".");
}

/**
 * @param {string} url 
 * @param {string} searchUrl 
 * @param {boolean} searchOnly 
 */
function fixUrl(url, searchUrl, searchOnly) {
	url = url.replace(/^\s+|\s+$/gm, "");

	if (searchOnly)
		return searchUrl + encodeURIComponent(url);
	if (isUrl(url))
		return url;
	if (isHostname(url))
		return "http://" + url;

	return searchUrl + encodeURIComponent(url);
}

function hideTitleAndFav() {
	document.title = "\u2060";
	document.querySelector("link[rel=\"icon\"]").setAttribute("href", "favicon.ico");
}

/**
 * @param {string} searchUrl 
 * @param {boolean} searchOnly 
 */
async function run(searchUrl, searchOnly) {
	await openUrl(fixUrl(urlInput.value, searchUrl, searchOnly));
}

/**
 * @param {string} url 
 */
async function openUrl(url) {
	hideTitleAndFav();
	backgroundScreen.style.display = "none";
	homeScreen.style.display = "none";
	tomcatScreen.style.display = "block";

	// check dimension
	frame.width = 1280;
	frame.height = 720;
	if (frame.clientWidth != 1280 || frame.clientHeight != 720) {
		frame.setAttribute("style", "width:1280px;height:720px;min-width:1280px;min-height:720px;max-width:1280px;max-height:720px;");
	}

	////////////////////////////
	// INIT
	////////////////////////////

	// connect to server
	const socket = io();
	await new Promise(resolve => socket.on("connected", resolve));
	socket.emit("new_session");
	await new Promise(resolve => socket.on("session_id", resolve));

	// setup input proxy element
	input.autofocus = true;
	input.focus({ preventScroll: true });

	// setup navigation elements
	backButton.onclick = () => socket.emit("goback");
	forwardButton.onclick = () => socket.emit("goforward");
	refreshButton.onclick = () => socket.emit("refresh");
	addressBar.onkeydown = (e) => {
		if (e.keyCode == 13) {
			e.preventDefault();
			socket.emit("navigate", fixUrl(addressBar.value, googleSearch, false));
		}
	};

	////////////////////////////
	// Event Listeners
	////////////////////////////

	// mouse button names, used in server side
	const buttons = [
		"left",
		"middle",
		"right",
		"back",
		"forward"
	];

	/**
	 * @param {MouseEvent} e 
	 */
	function mouseEventHandler(e) {
		// prevent default and override
		e.preventDefault();
		e.stopPropagation();
		e.returnValue = false;

		socket.emit("mouseevent", {
			type: e.type,
			x: e.offsetX,
			y: e.offsetY,
			button: buttons[e.button]
		});

		return false;
	}

	/**
	 * @param {WheelEvent} e 
	 */
	function wheelEventHandler(e) {
		e.preventDefault();
		e.stopPropagation();
		e.returnValue = false;

		socket.emit("wheelevent", {
			type: e.type,
			deltaX: e.deltaX,
			deltaY: e.deltaY
		});

		return false;
	}

	/**
	 * @param {KeyboardEvent} e 
	 */
	function keyboardEventHandler(e) {
		e.preventDefault();
		e.stopPropagation();
		e.returnValue = false;

		socket.emit("keyboardevent", {
			type: e.type,
			key: e.key
		});

		return false;
	}

	/**
	 * @param {InputEvent} e 
	 */
	function inputEventHandler(e) {
		e.preventDefault();
		e.stopPropagation();
		e.returnValue = false;

		socket.emit("inputevent", {
			type: e.type,
			data: e.data
		});

		return false;
	}

	const options = { capture: false, passive: false, once: false };
	frame.addEventListener("click", mouseEventHandler, options);
	frame.addEventListener("contextmenu", mouseEventHandler, options);
	frame.addEventListener("mousedown", mouseEventHandler, options);
	frame.addEventListener("mouseup", mouseEventHandler, options);
	frame.addEventListener("mousemove", mouseEventHandler, options);
	frame.addEventListener("wheel", wheelEventHandler, options);
	input.addEventListener("keydown", keyboardEventHandler, options);
	input.addEventListener("keyup", keyboardEventHandler, options);
	input.addEventListener("input", inputEventHandler, options);

	////////////////////////////
	// Main loop / update
	////////////////////////////

	async function loop() {
		if (frameKilled) {
			socket.disconnect();
			return;
		}

		socket.emit("sync");

		const data = await new Promise(resolve => socket.on("data", resolve));
		const blob = new Blob([data.buf], { type: "image/jpeg", endings: "native" });

		const prev = frame.src;
		if (prev.length > 0) {
			URL.revokeObjectURL(prev);
		}
		frame.src = URL.createObjectURL(blob);

		const active = document.activeElement;
		if (active != addressBar) {
			if (active == null || active == document.body)
				input.focus({ preventScroll: true });
			addressBar.value = data.url;
		}

		// wait before next frame
		await new Promise(resolve => setTimeout(resolve, 100));
		requestAnimationFrame(loop);
	}

	socket.emit("navigate", url);
	frameKilled = false;
	await loop();
}

document.getElementById("home").onclick = () => {
	frameKilled = true;
	tomcatScreen.style.display = "none";
	homeScreen.style.display = "block";
};

const location = new URL(window.location.href);
const open = location.searchParams.get("open");
if (open != null && isUrl(open)) {
	await openUrl(open);
	return;
}

backgroundScreen.style.display = "none";
homeScreen.style.display = "block";

const storage = (() => {
	const base = {
		getItem: function (key, def) {
			let item = this[key];
			if (item == null)
				return this[key] = def;
			return item;
		},
		save: () => { }
	};

	try {
		const data = localStorage.getItem("data") || "{}";
		Object.assign(base, JSON.parse(data));
		base.save = function () {
			localStorage.setItem("data", JSON.stringify(this));
		};

		// autosave
		setInterval(() => {
			base.save();
		}, 10000);
	} catch(err) {
		alert("Local storage is disabled by your browser, your browsing data will not be saved.", "Warning");
	}

	return base;
})();

window.onbeforeunload = window.onunload = () => {
	storage.save();
};

const urlInput = document.getElementById("input");
const shortcutBar = document.getElementById("shortcut-bar");
const addShortcutButton = document.getElementById("add-shortcut");
const editShortcutButton = document.getElementById("edit-shortcut");
const deleteShortcutButton = document.getElementById("delete-shortcut");
const contextMenu = document.getElementById("context-menu");
const shortcutContextMenu = document.getElementById("shortcut-context-menu");

const googleSearch = "https://www.google.com/search?q=";
const googleSearchR = "https://www.google.com/search?btnI=Im+Feeling+Lucky&q=";
const shortcuts = storage.getItem("shortcuts", [
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
		icon: "res/y8.svg",
		link: "https://www.y8.com"
	}
]);

function updateShortcuts() {
	shortcutBar.innerHTML = "";
	for (let s of shortcuts) {
		const item = document.createElement("div");
		item.className = "shortcut-item";

		const icon = document.createElement("img");
		icon.className = "shortcut-item-icon";
		icon.width = 60;
		icon.height = 60;
		icon.src = s.icon;
		item.appendChild(icon);

		const text = document.createElement("div");
		text.className = "shortcut-item-text";
		text.innerHTML = s.name;
		item.appendChild(text);

		item.onclick = () => openUrl(s.link);
		item.oncontextmenu = (e) => {
			e.preventDefault();
			e.stopPropagation();

			shortcutContextMenu.style.top = e.clientY + "px";
			shortcutContextMenu.style.left = e.clientX + "px";
			shortcutContextMenu.style.display = "block";

			deleteShortcutButton.onclick = () => {
				shortcuts.remove(s);
				updateShortcuts();
			};
			editShortcutButton.onclick = async () => {
				const result = await form("", "Edit shortcut", [
					{
						label: "Name",
						input: {
							type: "text",
							placeholder: "Name",
							value: s.name
						}
					},
					{
						label: "URL",
						input: {
							type: "text",
							placeholder: "https://example.com/example",
							value: s.link
						}
					}
				]);

				if (result == null)
					return; // canceled

				let name = result[0].value;
				let url = result[1].value;

				if (name.length == 0) {
					alert("Name cannot be empty.");
					return;
				}

				if (url.length == 0) {
					alert("URL cannot be empty.");
					return;
				}

				try {
					url = new URL(url).href;
				} catch(e) {
					alert("Invalid URL. A valid URL must start with http:// or https://");
					return;
				}

				s.name = name;
				s.link = url;
				updateShortcuts();
			};
		};

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
document.getElementById("clear-site-data").onclick = async () => {
	window.sessionStorage.clear();
	window.localStorage.clear();
	let databases = await indexedDB.databases();
	for (let i = 0; i < databases.length; i++)
		indexedDB.deleteDatabase(databases[i].name);
};
document.getElementById("clear-cache").onclick = async () => {
	let keys = await caches.keys();
	for (let i = 0; i < keys.length; i++)
		await caches.delete(keys[i]);
};
document.getElementById("leave-without-history").onclick = () => {
	window.location.replace(new URL("https://google.com/"));
};
document.getElementById("debug-shell").onclick = () => {
	inspect();
};
addShortcutButton.onclick = async () => {
	const result = await form("", "Add shortcut", [
		{
			label: "Name",
			input: {
				type: "text",
				placeholder: "Name"
			}
		},
		{
			label: "URL",
			input: {
				type: "text",
				placeholder: "https://example.com/example"
			}
		}
	]);

	if (result == null)
		return; // canceled

	let name = result[0].value;
	let url = result[1].value;

	if (name.length == 0) {
		alert("Name cannot be empty.");
		return;
	}

	if (url.length == 0) {
		alert("URL cannot be empty.");
		return;
	}

	try {
		url = new URL(url);
	} catch(e) {
		alert("Invalid URL. A valid URL must start with http:// or https://");
		return;
	}

	shortcuts.push({
		name: name,
		icon: new URL("/favicon.ico", url.origin).href,
		link: url.href
	});

	updateShortcuts();
};

document.body.onclick = () => {
	contextMenu.style.display = "none";
	shortcutContextMenu.style.display = "none";
};
document.oncontextmenu = (e) => {
	e.preventDefault();
	contextMenu.style.top = e.clientY + "px";
	contextMenu.style.left = e.clientX + "px";
	contextMenu.style.display = "block";
};
document.getElementById("version").innerHTML = app.cacheVersion;

console.log("%cWhiteSpider.gq", "background-color:#001a1a;border:3px solid #008080;border-radius:10px;color:#ffffff;display:block;font-family:Ubuntu;font-size:24px;font-stretch:normal;font-style:normal;font-weight:600;height:fit-content;margin:10px;padding:10px;position:relative;text-align:start;text-decoration:none;width:fit-content");
console.log("%cPage Verified", "position: relative;display: block;width: fit-content;height: fit-content;color: #ffffff;background-color: #008000;font-size: 14px;font-weight: 600;font-family: \"Ubuntu Mono\";font-stretch: normal;text-align: start;text-decoration: none;");

})();
