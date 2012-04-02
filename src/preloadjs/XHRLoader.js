/* Copyright */
/**
 * @module PreloadJS
 */
(function (window) {

	/**
	 * The loader that handles XmlHttpRequests.
	 * @class XHRLoader
	 * @constructor
	 * @param {Object} file The object that defines the file to load.
	 * @extends AbstractLoader
	 */
	var XHRLoader = function (file) {
		this.init(file);
	};

	var p = XHRLoader.prototype = new AbstractLoader();

	//Protected
	p._wasLoaded = false;
	p._request = null;
	p._loadTimeOutTimeout = null;

	/**
	 * Is the browsers XMLHTTPRequest version 1 or 2.
	 * There is no way to accurately detect v1 vs v2 ... so its our best guess.
	 * @private
	 */
	p._xhrLevel = null;

	p.init = function (item) {
		this._item = item;
		if (!this._createXHR(item)) {
			//TODO: Throw error?
			PreloadJS.log("Unable to create XHR instance")
		}
	};

	p.getResult = function() {
		//[SB] When loading XML IE9 does not return .response, instead it returns responseXML.xml
	    try {
		    if (this._request.responseXML) {
		        return this._request.responseXML.xml;
		    }
	    } catch (error) {}
		return this._request.response;
	}

	p.cancel = function() {
		this._clean();
		this._request.abort();
	};

	p.load = function() {
		if (this._request == null) {
			this.handleError();
			return;
		}

		//Setup timeout if we're not using XHR2
		if (this._xhrLevel == 1) {
			this._loadTimeOutTimeout = setTimeout(PreloadJS.proxy(this.handleTimeout, this), PreloadJS.TIMEOUT_TIME);
		}
		
		//Events
		this._request.onloadstart = PreloadJS.proxy(this.handleLoadStart, this);
		this._request.onprogress = PreloadJS.proxy(this.handleProgress, this);
		this._request.onabort = PreloadJS.proxy(this.handleAbort, this);
		this._request.onerror = PreloadJS.proxy(this.handleError, this);
		this._request.ontimeout = PreloadJS.proxy(this.handleTimeout, this);
		//this._request.onloadend = PreloadJS.proxy(this.handleLoadEnd, this);

		//LM: Firefox does not get onload. Chrome gets both. Might need onload for other things.
		this._request.onload = PreloadJS.proxy(this.handleLoad, this);
		this._request.onreadystatechange = PreloadJS.proxy(this.handleReadyStateChange, this);

		this._request.send();
	};

	p.handleProgress = function(event) {
		if (event.loaded > 0 && event.total == 0) {
			this.handleError();
			return;
		}
		this._sendProgress({loaded:event.loaded, total:event.total});
	};

	p.handleLoadStart = function() {
		clearTimeout(this._loadTimeOutTimeout);
		this._sendLoadStart();
	};

	p.handleAbort = function() {
		this._clean();
		this._sendError();
	};

	p.handleError = function() {
		this._clean();
		this._sendError();
	};

	p.handleReadyStateChange = function() {
		if (this._request.readyState == 4) {
			this.handleLoad();
		}
	}

	p.handleLoad = function(event) {
		if (this.loaded) { return; }
		this.loaded = true;

		if(!this._checkError()) {
			this.handleError();
			return;
		}

		this._clean();
		this._sendComplete();
	};

	p._checkError = function() {
		//LM: Probably need additional handlers here.
		switch (this._request.status) {
			case "404":
				return false;
		}
		if (this._request.response == null) { //LM: Might need to check the MS equivalent
			return false;
		}
		return true;
	};

	p.handleTimeout = function() {
		this._clean();
		this._sendError();
	};

	p.handleLoadEnd = function() {
		this._clean();
	};

	p._createXHR = function(item) {
		this._xhrLevel = 1;
		
		if (window.ArrayBuffer) {
			this._xhrLevel = 2;
		}

		// Old IE versions use a different approach
		if (window.XMLHttpRequest) {
		    this._request = new XMLHttpRequest();
		} else {
			try {
				this._request = new ActiveXObject("MSXML2.XMLHTTP.3.0");
			} catch(ex) {
				return null;
			}
		}

		if (item.type == PreloadJS.TEXT) {
			this._request.overrideMimeType('text/plain; charset=x-user-defined');
		}

		this._request.open('GET', item.src, true);

		if (PreloadJS.isBinary(item.type)) {
			this._request.responseType = 'arraybuffer';
		}
        return true;
	};

	p._clean = function() {
		clearTimeout(this._loadTimeOutTimeout);

		var req = this._request;
		req.onloadstart = null;
		req.onprogress = null;
		req.onabort = null;
		req.onerror = null;
		req.onload = null;
		req.ontimeout = null;
		req.onloadend = null;
		req.onreadystatechange = null;

		clearInterval(this._checkLoadInterval);
	};

	p.toString = function() {
		return "[PreloadJS XHRLoader]";
	}

	PreloadJS.lib.XHRLoader = XHRLoader;

}(window));