/*
* XHRLoader for PreloadJS
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
		}
	};

	p.getResult = function() {
		//[SB] When loading XML IE9 does not return .response, instead it returns responseXML.xml
	    try {
			return this._request.responseText;
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

		try { // Sometimes we get back 404s immediately, particularly when there is a cross origin request.
			this._request.send();
		} catch (error) {}
	};

	p.handleProgress = function(event) {
		if (event.loaded > 0 && event.total == 0) {
			return; // Sometimes we get no "total", so just ignore the progress event.
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

    p._checkError = function() {
        //LM: Probably need additional handlers here.
        var status = parseInt(this._request.status);
        switch (status) {
            case 404:   // Not Found
            case 0:     // Not Loaded
                return false;
        }

        if (this._request.response == null) {
		    try {
		        // We have to check this for IE, and other browsers will throw errors, so we have to try/catch it.
		        if (this._request.responseXML != null) { return true; }
		    } catch (error) {}
	        return false; }
        return true;
    };

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

		//IE9 doesn't suport .overrideMimeType(), so we need to check for it.
		if (item.type == PreloadJS.TEXT && this._request.overrideMimeType) {
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