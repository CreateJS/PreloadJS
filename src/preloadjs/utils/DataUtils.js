(function () {

	var s = {};

	/**
	 * Parse XML using the DOM. This is required when preloading XML or SVG.
	 * @method _parseXML
	 * @param {String} text The raw text or XML that is loaded by XHR.
	 * @param {String} type The mime type of the XML.
	 * Use "text/xml" for XML parsing
	 * Use "image/svg+xml" for SVG parsing.
	 *
	 * @return {XML} An XML document.
	 * @private
	 */
	s.parseXML = function (text, type) {
		var xml = null;
		try {
			// CocoonJS does not support XML parsing with either method.
			// Windows (?) Opera DOMParser throws DOMException: NOT_SUPPORTED_ERR  // potential solution https://gist.github.com/1129031
			if (window.DOMParser) {
				var parser = new DOMParser();
				xml = parser.parseFromString(text, type);
			} else { // IE
				xml = new ActiveXObject("Microsoft.XMLDOM");
				xml.async = false;
				xml.loadXML(text);
			}
		} catch (e) {}
		return xml;
	};

	/**
	 * Parse a string into an Object
	 *
	 * @param value
	 * @returns {*}
	 */
	s.parseJSON = function (value) {
		if (value == null) {
			return null;
		}

		try {
			return JSON.parse(value);
		} catch (e) {
			// TODO; Handle this with a custom error?
			throw e;
		}
	};

	createjs.DataUtils = s;

}());
