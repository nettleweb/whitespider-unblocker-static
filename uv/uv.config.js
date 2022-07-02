self.__uv$config = {
	prefix: "/0OO00O/",
	bare: "https://incog.dev/bare/",
	encodeUrl: (url) => encodeURIComponent(url),
	decodeUrl: (url) => decodeURIComponent(url),
	handler: '/uv/uv.handler.js',
	bundle: '/uv/uv.bundle.js',
	config: '/uv/uv.config.js',
	sw: '/uv/uv.sw.js',
};