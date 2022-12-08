"use strict";

const Base64 = (() => {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	const lookup = new Uint8Array(256);
	for (let i = 0; i < chars.length; i++)
		lookup[chars.charCodeAt(i)] = i;

	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	/**
	 * @param {ArrayBufferLike | ArrayLike<number>} buffer 
	 */
	function encode(buffer) {
		const array = new Uint8Array(buffer);
		const len = array.length;
		let base64 = "";

		for (let i = 0; i < len; i += 3) {
			base64 += chars[array[i] >> 2];
			base64 += chars[((array[i] & 3) << 4) | (array[i + 1] >> 4)];
			base64 += chars[((array[i + 1] & 15) << 2) | (array[i + 2] >> 6)];
			base64 += chars[array[i + 2] & 63];
		}

		if ((len % 3) === 2) {
			base64 = base64.substring(0, base64.length - 1) + "=";
		} else if (len % 3 === 1) {
			base64 = base64.substring(0, base64.length - 2) + "==";
		}

		return base64;
	}

	/**
	 * @param {string} base64 
	 */
	function decode(base64) {
		const len = base64.length;

		let bufLen = base64.length * 0.75;
		let p = 0;

		if (base64[len - 1] === "=") {
			bufLen--;
			if (base64[len - 2] === "=") {
				bufLen--;
			}
		}

		const array = new Uint8Array(bufLen);

		for (let i = 0; i < len; i += 4) {
			const b0 = lookup[base64.charCodeAt(i)];
			const b1 = lookup[base64.charCodeAt(i + 1)];
			const b2 = lookup[base64.charCodeAt(i + 2)];
			const b4 = lookup[base64.charCodeAt(i + 3)];

			array[p++] = (b0 << 2) | (b1 >> 4);
			array[p++] = ((b1 & 15) << 4) | (b2 >> 2);
			array[p++] = ((b2 & 3) << 6) | (b4 & 63);
		}

		return array.buffer;
	}

	/**
	 * @param {string} str 
	 */
	function btoa(str) {
		return encode(encoder.encode(str));
	}

	/**
	 * @param {string} str 
	 */
	function atob(str) {
		return decoder.decode(decode(str), { stream: true });
	}

	return { encode, decode, btoa, atob };
})();
