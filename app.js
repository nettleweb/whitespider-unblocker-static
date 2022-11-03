
self.app = {
	debug: true,
	cacheName: "whitespider-unblocker",
	cacheVersion: "0.7.3",
	cacheList: [],
	headers: {
		"Content-Security-Policy": "default-src 'self'; connect-src 'self'; font-src 'self' data: blob:; img-src 'self' data: blob:; media-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; style-src 'self' 'unsafe-inline' data: blob:; worker-src 'self';",
		"Cross-Origin-Embedder-Policy": "require-corp",
		"Cross-Origin-Opener-Policy": "same-origin",
		"Referrer-Policy": "no-referrer",
		"X-Content-Type-Options": "nosniff"
	}
};
