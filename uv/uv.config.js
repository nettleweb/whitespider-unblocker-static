self.__uv$config = {
	prefix: '/O0OOO0O/',
	bare: 'https://test248.herokuapp.com/bare/',
	encodeUrl: (url) => encodeURIComponent(btoa(url)),
	decodeUrl: (url) => atob(decodeURIComponent(url)),
	handler: '/uv/uv.handler.js',
	bundle: '/uv/uv.bundle.js',
	config: '/uv/uv.config.js',
	sw: '/uv/uv.sw.js',
};