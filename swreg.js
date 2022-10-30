
const swreg = (() => {
	const nsw = window.navigator.serviceWorker;
	if (nsw == null) {
		block("Your browser does not support service workers, please use a supported browser to continue.", "Warning");
		return null;
	}

	/**
	 * @param {string} url
	 */
	async function registerServiceWorker(url) {
		try {
			await nsw.register(url, {
				scope: "/",
				type: "classic",
				updateViaCache: "none"
			});
			return await nsw.ready;
		} catch (err) {
			await block("Failed to register service worker, please reload this page or try again with a different browser.", "Error");
			return null;
		}
	}

	/**
	 * @param {string} url
	 */
	async function updateServiceWorker(url) {
		const regs = await nsw.getRegistrations();
		for (let reg of regs)
			await reg.unregister();

		return await registerServiceWorker(url);
	}

	/**
	 * @param {string} url
	 * @param {number} interval
	 */
	function tick(url, interval = 10000) {
		const tick = setInterval(async () => {
			const reg = await registerServiceWorker(url);
			if (reg == null) {
				clearInterval(tick);
			}
		}, interval);
	}

	return {
		registerServiceWorker,
		updateServiceWorker,
		tick
	};
})();

export default swreg;
