/*
 * XHRLoader
 * Visit http://createjs.com/ for documentation, updates and examples.
 *
 *
 * Copyright (c) 2012 gskinner.com, inc.
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @module PreloadJS
 */

// namespace:
this.createjs = this.createjs || {};

(function () {
	"use strict";

	/**
	 * A preloader that loads items using XHR requests, usually XMLHttpRequest. However XDomainRequests will be used
	 * for cross-domain requests if possible, and older versions of IE fall back on to ActiveX objects when necessary.
	 * XHR requests load the content as text or binary data, provide progress and consistent completion events, and
	 * can be canceled during load. Note that XHR is not supported in IE 6 or earlier, and is not recommended for
	 * cross-domain loading.
	 * @class XHRLoader
	 * @constructor
	 * @param {Object} item The object that defines the file to load. Please see the {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}}
	 * for an overview of supported file properties.
	 * @param {String} [crossOrigin] An optional flag to support images loaded from a CORS-enabled server. Please see
	 * {{#crossLink "LoadQueue/_crossOrigin:property"}}{{/crossLink}} for more info.
	 * @extends AbstractLoader
	 */
	var XHRLoader = function (item, crossOrigin) {
		this.init(item, crossOrigin);
	};

	var s = XHRLoader;

	/**
	 * A list of XMLHTTP object IDs to try when building an ActiveX object for XHR requests in earlier versions of IE.
	 * @property ACTIVEX_VERSIONS
	 * @type {Array}
	 * @since 0.4.2
	 * @private
	 */
	s.ACTIVEX_VERSIONS = [
		"Msxml2.XMLHTTP.6.0",
		"Msxml2.XMLHTTP.5.0",
		"Msxml2.XMLHTTP.4.0",
		"MSXML2.XMLHTTP.3.0",
		"MSXML2.XMLHTTP",
		"Microsoft.XMLHTTP"
	];

	var p = XHRLoader.prototype = new createjs.AbstractLoader();

	//Protected
	/**
	 * A reference to the XHR request used to load the content.
	 * @property _request
	 * @type {XMLHttpRequest | XDomainRequest | ActiveX.XMLHTTP}
	 * @private
	 */
	p._request = null;

	/**
	 * A manual load timeout that is used for browsers that do not support the onTimeout event on XHR (XHR level 1,
	 * typically IE9).
	 * @property _loadTimeout
	 * @type {Number}
	 * @private
	 */
	p._loadTimeout = null;

	/**
	 * The browser's XHR (XMLHTTPRequest) version. Supported versions are 1 and 2. There is no official way to detect
	 * the version, so we use capabilities to make a best guess.
	 * @property _xhrLevel
	 * @type {Number}
	 * @default 1
	 * @private
	 */
	p._xhrLevel = 1;

	/**
	 * The response of a loaded file. This is set because it is expensive to look up constantly. This property will be
	 * null until the file is loaded.
	 * @property _response
	 * @type {mixed}
	 * @private
	 */
	p._response = null;

	/**
	 * The response of the loaded file before it is modified. In most cases, content is converted from raw text to
	 * an HTML tag or a formatted object which is set to the <code>result</code> property, but the developer may still
	 * want to access the raw content as it was loaded.
	 * @property _rawResponse
	 * @type {String|Object}
	 * @private
	 */
	p._rawResponse = null;

	/**
	 * See {{#crossLink "LoadQueue/_crossOrigin:property"}}{{/crossLink}}
	 * @property _crossOrigin
	 * @type {String}
	 * @defaultValue ""
	 * @private
	 */
	p._crossOrigin = "";

	// Overrides abstract method in AbstractLoader
	p.init = function (item, crossOrigin) {
		this._item = item;
		this._crossOrigin = crossOrigin;
		if (!this._createXHR(item)) {
			//TODO: Throw error?
		}
	};

	/**
	 * Look up the loaded result.
	 * @method getResult
	 * @param {Boolean} [rawResult=false] Return a raw result instead of a formatted result. This applies to content
	 * loaded via XHR such as scripts, XML, CSS, and Images. If there is no raw result, the formatted result will be
	 * returned instead.
	 * @return {Object} A result object containing the content that was loaded, such as:
	 * <ul>
	 *      <li>An image tag (&lt;image /&gt;) for images</li>
	 *      <li>A script tag for JavaScript (&lt;script /&gt;). Note that scripts loaded with tags may be added to the
	 *      HTML head.</li>
	 *      <li>A style tag for CSS (&lt;style /&gt;)</li>
	 *      <li>Raw text for TEXT</li>
	 *      <li>A formatted JavaScript object defined by JSON</li>
	 *      <li>An XML document</li>
	 *      <li>An binary arraybuffer loaded by XHR</li>
	 * </ul>
	 * Note that if a raw result is requested, but not found, the result will be returned instead.
	 */
	p.getResult = function (rawResult) {
		if (rawResult && this._rawResponse) {
			return this._rawResponse;
		}
		return this._response;
	};

	// Overrides abstract method in AbstractLoader
	p.cancel = function () {
		this.canceled = true;
		this._clean();
		this._request.abort();
	};

	// Overrides abstract method in AbstractLoader
	p.load = function () {
		if (this._request == null) {
			this._handleError();
			return;
		}

		//Events
		this._request.onloadstart = createjs.proxy(this._handleLoadStart, this);
		this._request.onprogress = createjs.proxy(this._handleProgress, this);
		this._request.onabort = createjs.proxy(this._handleAbort, this);
		this._request.onerror = createjs.proxy(this._handleError, this);
		this._request.ontimeout = createjs.proxy(this._handleTimeout, this);
		// Set up a timeout if we don't have XHR2
		if (this._xhrLevel == 1) {
			var duration = createjs.LoadQueue.LOAD_TIMEOUT;
			if (duration == 0) {
				duration = createjs.LoadQueue.loadTimeout;
			} else {
				try { console.warn("LoadQueue.LOAD_TIMEOUT has been deprecated in favor of LoadQueue.loadTimeout");} catch(e) {}
			}
			this._loadTimeout = setTimeout(createjs.proxy(this._handleTimeout, this), duration);
		}

		// Note: We don't get onload in all browsers (earlier FF and IE). onReadyStateChange handles these.
		this._request.onload = createjs.proxy(this._handleLoad, this);

		this._request.onreadystatechange = createjs.proxy(this._handleReadyStateChange, this);

		// Sometimes we get back 404s immediately, particularly when there is a cross origin request.  // note this does not catch in Chrome
		try {
			if (!this._item.values || this._item.method == createjs.LoadQueue.GET) {
				this._request.send();
			} else if (this._item.method == createjs.LoadQueue.POST) {
				this._request.send(this._formatQueryString(this._item.values));
			}
		} catch (error) {
			var event = new createjs.Event("error");
			event.error = error;
			this._sendError(event);
		}
	};

	/**
	 * Get all the response headers from the XmlHttpRequest.
	 *
	 * <strong>From the docs:</strong> Return all the HTTP headers, excluding headers that are a case-insensitive match
	 * for Set-Cookie or Set-Cookie2, as a single string, with each header line separated by a U+000D CR U+000A LF pair,
	 * excluding the status line, and with each header name and header value separated by a U+003A COLON U+0020 SPACE
	 * pair.
	 * @method getAllResponseHeaders
	 * @return {String}
	 * @since 0.4.1
	 */
	p.getAllResponseHeaders = function () {
		if  (this._request.getAllResponseHeaders instanceof Function) {
			return this._request.getAllResponseHeaders();
		} else {
			return null;
		}
	};

	/**
	 * Get a specific response header from the XmlHttpRequest.
	 *
	 * <strong>From the docs:</strong> Returns the header field value from the response of which the field name matches
	 * header, unless the field name is Set-Cookie or Set-Cookie2.
	 * @method getResponseHeader
	 * @param {String} header The header name to retrieve.
	 * @return {String}
	 * @since 0.4.1
	 */
	p.getResponseHeader = function (header) {
		if (this._request.getResponseHeader instanceof Function) {
			return this._request.getResponseHeader(header);
		} else {
			return null;
		}
	};

	/**
	 * The XHR request has reported progress.
	 * @method _handleProgress
	 * @param {Object} event The XHR progress event.
	 * @private
	 */
	p._handleProgress = function (event) {
		if (!event || event.loaded > 0 && event.total == 0) {
			return; // Sometimes we get no "total", so just ignore the progress event.
		}

		var newEvent = new createjs.Event("progress");
		newEvent.loaded = event.loaded;
		newEvent.total = event.total;
		this._sendProgress(newEvent);
	};

	/**
	 * The XHR request has reported a load start.
	 * @method _handleLoadStart
	 * @param {Object} event The XHR loadStart event.
	 * @private
	 */
	p._handleLoadStart = function (event) {
		clearTimeout(this._loadTimeout);
		this._sendLoadStart();
	};

	/**
	 * The XHR request has reported an abort event.
	 * @method handleAbort
	 * @param {Object} event The XHR abort event.
	 * @private
	 */
	p._handleAbort = function (event) {
		this._clean();
		var newEvent = new createjs.Event("error");
		newEvent.text = "XHR_ABORTED";
		this._sendError(newEvent);
	};

	/**
	 * The XHR request has reported an error event.
	 * @method _handleError
	 * @param {Object} event The XHR error event.
	 * @private
	 */
	p._handleError = function (event) {
		this._clean();
		var newEvent = new createjs.Event("error");
		//TODO: Propagate event error
		this._sendError(newEvent);
	};

	/**
	 * The XHR request has reported a readyState change. Note that older browsers (IE 7 & 8) do not provide an onload
	 * event, so we must monitor the readyStateChange to determine if the file is loaded.
	 * @method _handleReadyStateChange
	 * @param {Object} event The XHR readyStateChange event.
	 * @private
	 */
	p._handleReadyStateChange = function (event) {
		if (this._request.readyState == 4) {
			this._handleLoad();
		}
	};

	/**
	 * The XHR request has completed. This is called by the XHR request directly, or by a readyStateChange that has
	 * <code>request.readyState == 4</code>. Only the first call to this method will be processed.
	 * @method _handleLoad
	 * @param {Object} event The XHR load event.
	 * @private
	 */
	p._handleLoad = function (event) {
		if (this.loaded) {
			return;
		}
		this.loaded = true;

		if (!this._checkError()) {
			this._handleError();
			return;
		}

		this._response = this._getResponse();
		this._clean();
		var isComplete = this._generateTag();
		if (isComplete) {
			this._sendComplete();
		}
	};

	/**
	 * The XHR request has timed out. This is called by the XHR request directly, or via a <code>setTimeout</code>
	 * callback.
	 * @method _handleTimeout
	 * @param {Object} [event] The XHR timeout event. This is occasionally null when called by the backup setTimeout.
	 * @private
	 */
	p._handleTimeout = function (event) {
		this._clean();
		var newEvent = new createjs.Event("error");
		newEvent.text = "PRELOAD_TIMEOUT";
		//TODO: Propagate actual event error
		this._sendError(event);
	};


// Protected
	/**
	 * Determine if there is an error in the current load. This checks the status of the request for problem codes. Note
	 * that this does not check for an actual response. Currently, it only checks for 404 or 0 error code.
	 * @method _checkError
	 * @return {Boolean} If the request status returns an error code.
	 * @private
	 */
	p._checkError = function () {
		//LM: Probably need additional handlers here, maybe 501
		var status = parseInt(this._request.status);

		switch (status) {
			case 404:   // Not Found
			case 0:     // Not Loaded
				return false;
		}
		return true;
	};

	/**
	 * Validate the response. Different browsers have different approaches, some of which throw errors when accessed
	 * in other browsers. If there is no response, the <code>_response</code> property will remain null.
	 * @method _getResponse
	 * @private
	 */
	p._getResponse = function () {
		if (this._response != null) {
			return this._response;
		}

		if (this._request.response != null) {
			return this._request.response;
		}

		// Android 2.2 uses .responseText
		try {
			if (this._request.responseText != null) {
				return this._request.responseText;
			}
		} catch (e) {
		}

		// When loading XML, IE9 does not return .response, instead it returns responseXML.xml
		//TODO: TEST
		try {
			if (this._request.responseXML != null) {
				return this._request.responseXML;
			}
		} catch (e) {
		}
		return null;
	};

	/**
	 * Create an XHR request. Depending on a number of factors, we get totally different results.
	 * <ol><li>Some browsers get an <code>XDomainRequest</code> when loading cross-domain.</li>
	 *      <li>XMLHttpRequest are created when available.</li>
	 *      <li>ActiveX.XMLHTTP objects are used in older IE browsers.</li>
	 *      <li>Text requests override the mime type if possible</li>
	 *      <li>Origin headers are sent for crossdomain requests in some browsers.</li>
	 *      <li>Binary loads set the response type to "arraybuffer"</li></ol>
	 * @method _createXHR
	 * @param {Object} item The requested item that is being loaded.
	 * @return {Boolean} If an XHR request or equivalent was successfully created.
	 * @private
	 */
	p._createXHR = function (item) {
		// Check for cross-domain loads. We can't fully support them, but we can try.
		var crossdomain = this._isCrossDomain(item);
		var headers = {};

		// Create the request. Fallback to whatever support we have.
		var req = null;
		if (window.XMLHttpRequest) {
			req = new XMLHttpRequest();
			// This is 8 or 9, so use XDomainRequest instead.
			if (crossdomain && req.withCredentials === undefined && window.XDomainRequest) {
				req = new XDomainRequest();
			}
		} else { // Old IE versions use a different approach
			for (var i = 0, l=s.ACTIVEX_VERSIONS.length; i<l; i++) {
	            var axVersion = s.ACTIVEX_VERSIONS[i];
	            try {
	                req = new ActiveXObject(axVersions);
		            break;
	            } catch (e) {}
	        }
			if (req == null) { return false; }
		}

		// IE9 doesn't support overrideMimeType(), so we need to check for it.
		if (createjs.LoadQueue.isText(item.type) && req.overrideMimeType) {
			req.overrideMimeType("text/plain; charset=utf-8");
		}

		// Determine the XHR level
		this._xhrLevel = (typeof req.responseType === "string") ? 2 : 1;

		var src = null;
		if (item.method == createjs.LoadQueue.GET) {
			src = this.buildPath(item.src, item.values);
		} else {
			src = item.src;
		}

		// Open the request.  Set cross-domain flags if it is supported (XHR level 1 only)
		req.open(item.method || createjs.LoadQueue.GET, src, true);

		if (crossdomain && req instanceof XMLHttpRequest && this._xhrLevel == 1) {
			headers["Origin"] = location.origin;
		}

		// To send data we need to set the Content-type header)
		if (item.values && item.method == createjs.LoadQueue.POST) {
			headers["Content-Type"] = "application/x-www-form-urlencoded";
		}

		if (!crossdomain && !headers["X-Requested-With"]) {
			headers["X-Requested-With"] = "XMLHttpRequest";
		}

		if (item.headers) {
			for (var n in item.headers) {
				headers[n] = item.headers[n];
			}
		}

		// Blobs and binary files are loaded differently.
        if (createjs.LoadQueue.isBlob(item.type)) {
            req.responseType = "blob";
        } else if (createjs.LoadQueue.isBinary(item.type)) {
			req.responseType = "arraybuffer";
		}

		for (n in headers) {
			req.setRequestHeader(n, headers[n])
		}

		this._request = req;

		return true;
	};

	/**
	 * A request has completed (or failed or canceled), and needs to be disposed.
	 * @method _clean
	 * @private
	 */
	p._clean = function () {
		clearTimeout(this._loadTimeout);

		var req = this._request;
		req.onloadstart = null;
		req.onprogress = null;
		req.onabort = null;
		req.onerror = null;
		req.onload = null;
		req.ontimeout = null;
		req.onloadend = null;
		req.onreadystatechange = null;
	};

	/**
	 * Generate a tag for items that can be represented as tags. For example, IMAGE, SCRIPT, and LINK. This also handles
	 * XML and SVG objects.
	 * @method _generateTag
	 * @return {Boolean} If a tag was generated and is ready for instantiation. If it still needs processing, this
	 * method returns false.
	 * @private
	 */
	p._generateTag = function () {
		var type = this._item.type;
		var tag = this._item.tag;

		switch (type) {
			// Note: Images need to wait for onload, but do use the cache.
			case createjs.LoadQueue.IMAGE:
				tag.onload = createjs.proxy(this._handleTagReady, this);
				if (this._crossOrigin != "") { tag.crossOrigin = "Anonymous"; }// We can assume this, since XHR images are always loaded on a server.
				tag.src = this.buildPath(this._item.src, this._item.values);

				this._rawResponse = this._response;
				this._response = tag;
				return false; // Images need to get an onload event first

			case createjs.LoadQueue.JAVASCRIPT:
				tag = document.createElement("script");
				tag.text = this._response;

				this._rawResponse = this._response;
				this._response = tag;
				return true;

			case createjs.LoadQueue.CSS:
				// Maybe do this conditionally?
				var head = document.getElementsByTagName("head")[0]; //Note: This is unavoidable in IE678
				head.appendChild(tag);

				if (tag.styleSheet) { // IE
					tag.styleSheet.cssText = this._response;
				} else {
					var textNode = document.createTextNode(this._response);
					tag.appendChild(textNode);
				}

				this._rawResponse = this._response;
				this._response = tag;
				return true;

			case createjs.LoadQueue.XML:
				var xml = this._parseXML(this._response, "text/xml");
				this._rawResponse = this._response;
				this._response = xml;
				return true;

			case createjs.LoadQueue.SVG:
				var xml = this._parseXML(this._response, "image/svg+xml");
				this._rawResponse = this._response;
				if (xml.documentElement != null) {
					tag.appendChild(xml.documentElement);
					this._response = tag;
				} else { // For browsers that don't support SVG, just give them the XML. (IE 9-8)
					this._response = xml;
				}
				return true;

			case createjs.LoadQueue.JSON:
			case createjs.LoadQueue.MANIFEST:
				var json = {};
				try {
					json = JSON.parse(this._response);
				} catch (error) {
					json = error;
				}

				this._rawResponse = this._response;
				this._response = json;
				return true;

		}
		return true;
	};

	/**
	 * Parse XML using the DOM. This is required when preloading XML or SVG.
	 * @method _parseXML
	 * @param {String} text The raw text or XML that is loaded by XHR.
	 * @param {String} type The mime type of the XML.
	 * @return {XML} An XML document.
	 * @private
	 */
	p._parseXML = function (text, type) {
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
	 * A generated tag is now ready for use.
	 * @method _handleTagReady
	 * @private
	 */
	p._handleTagReady = function () {
		var tag = this._item.tag;
		tag && (tag.onload = null);
		this._sendComplete();
	};

	p.toString = function () {
		return "[PreloadJS XHRLoader]";
	};

	createjs.XHRLoader = XHRLoader;

}());

/**
 * Include json2 here, to correctly parse json.
 * Used on browsers that don't have a native JSON object.
 *
 */
/*
 json2.js
 2012-10-08

 Public Domain.

 NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

 See http://www.JSON.org/js.html


 This code should be minified before deployment.
 See http://javascript.crockford.com/jsmin.html

 USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
 NOT CONTROL.
 */


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (typeof JSON !== 'object') {
	JSON = {};
}

(function () {
	'use strict';

	function f(n) {
		// Format integers to have at least two digits.
		return n < 10 ? '0' + n : n;
	}

	if (typeof Date.prototype.toJSON !== 'function') {

		Date.prototype.toJSON = function (key) {

			return isFinite(this.valueOf())
					? this.getUTCFullYear() + '-' +
					f(this.getUTCMonth() + 1) + '-' +
					f(this.getUTCDate()) + 'T' +
					f(this.getUTCHours()) + ':' +
					f(this.getUTCMinutes()) + ':' +
					f(this.getUTCSeconds()) + 'Z'
					: null;
		};

		String.prototype.toJSON =
				Number.prototype.toJSON =
						Boolean.prototype.toJSON = function (key) {
							return this.valueOf();
						};
	}

	var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
			escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
			gap,
			indent,
			meta = {    // table of character substitutions
				'\b':'\\b',
				'\t':'\\t',
				'\n':'\\n',
				'\f':'\\f',
				'\r':'\\r',
				'"':'\\"',
				'\\':'\\\\'
			},
			rep;


	function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

		escapable.lastIndex = 0;
		return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
			var c = meta[a];
			return typeof c === 'string'
					? c
					: '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
		}) + '"' : '"' + string + '"';
	}


	function str(key, holder) {

// Produce a string from holder[key].

		var i, // The loop counter.
				k, // The member key.
				v, // The member value.
				length,
				mind = gap,
				partial,
				value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

		if (value && typeof value === 'object' &&
				typeof value.toJSON === 'function') {
			value = value.toJSON(key);
		}

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

		if (typeof rep === 'function') {
			value = rep.call(holder, key, value);
		}

// What happens next depends on the value's type.

		switch (typeof value) {
			case 'string':
				return quote(value);

			case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

				return isFinite(value) ? String(value) : 'null';

			case 'boolean':
			case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

				return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

			case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

				if (!value) {
					return 'null';
				}

// Make an array to hold the partial results of stringifying this object value.

				gap += indent;
				partial = [];

// Is the value an array?

				if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

					length = value.length;
					for (i = 0; i < length; i += 1) {
						partial[i] = str(i, value) || 'null';
					}

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

					v = partial.length === 0
							? '[]'
							: gap
							? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
							: '[' + partial.join(',') + ']';
					gap = mind;
					return v;
				}

// If the replacer is an array, use it to select the members to be stringified.

				if (rep && typeof rep === 'object') {
					length = rep.length;
					for (i = 0; i < length; i += 1) {
						if (typeof rep[i] === 'string') {
							k = rep[i];
							v = str(k, value);
							if (v) {
								partial.push(quote(k) + (gap ? ': ' : ':') + v);
							}
						}
					}
				} else {

// Otherwise, iterate through all of the keys in the object.

					for (k in value) {
						if (Object.prototype.hasOwnProperty.call(value, k)) {
							v = str(k, value);
							if (v) {
								partial.push(quote(k) + (gap ? ': ' : ':') + v);
							}
						}
					}
				}

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

				v = partial.length === 0
						? '{}'
						: gap
						? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
						: '{' + partial.join(',') + '}';
				gap = mind;
				return v;
		}
	}

// If the JSON object does not yet have a stringify method, give it one.

	if (typeof JSON.stringify !== 'function') {
		JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

			var i;
			gap = '';
			indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

			if (typeof space === 'number') {
				for (i = 0; i < space; i += 1) {
					indent += ' ';
				}

// If the space parameter is a string, it will be used as the indent string.

			} else if (typeof space === 'string') {
				indent = space;
			}

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

			rep = replacer;
			if (replacer && typeof replacer !== 'function' &&
					(typeof replacer !== 'object' ||
							typeof replacer.length !== 'number')) {
				throw new Error('JSON.stringify');
			}

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

			return str('', {'':value});
		};
	}


// If the JSON object does not yet have a parse method, give it one.

	if (typeof JSON.parse !== 'function') {
		JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

			var j;

			function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

				var k, v, value = holder[key];
				if (value && typeof value === 'object') {
					for (k in value) {
						if (Object.prototype.hasOwnProperty.call(value, k)) {
							v = walk(value, k);
							if (v !== undefined) {
								value[k] = v;
							} else {
								delete value[k];
							}
						}
					}
				}
				return reviver.call(holder, key, value);
			}


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

			text = String(text);
			cx.lastIndex = 0;
			if (cx.test(text)) {
				text = text.replace(cx, function (a) {
					return '\\u' +
							('0000' + a.charCodeAt(0).toString(16)).slice(-4);
				});
			}

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

			if (/^[\],:{}\s]*$/
					.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
								  .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
								  .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

				j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

				return typeof reviver === 'function'
						? walk({'':j}, '')
						: j;
			}

// If the text is not JSON parseable, then a SyntaxError is thrown.

			throw new SyntaxError('JSON.parse');
		};
	}
}());
