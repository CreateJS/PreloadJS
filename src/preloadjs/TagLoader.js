/*
* TagLoader for PreloadJS
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
this.createjs = this.createjs||{};

(function() {

	/**
	 * A preloader that loads items using a tag-based approach. HTML audio and images can use this plugin to load content
	 * cross-domain without security errors, whereas anything loaded with XHR has issues.
	 * <br />
	 * Note that for audio tags, we rely on the <code>canPlayThrough</code> event, which fires when the buffer is full
	 * enough to play the audio all the way through at the current download speed. This completely preloads most sound
	 * effects, however longer tracks like background audio will only load a portion before the event is fired. Most
	 * browsers (all excluding Chrome) will continue to preload once this is fired, so this is considered good enough
	 * for most cases.
	 * <br />
	 * There is a built-in fallback for XHR loading for tags that do not fire onload events, such as &lt;script&gt;
	 * and &lt;style&gt;. This approach is used so that a proper script or style object is returned to PreloadJS when it
	 * is loaded.
	 * @class TagLoader
	 * @constructor
	 * @extends AbstractLoader
	 * @param {String | Object} item The item to load
	 * @param {String} srcAttr The attribute to use as the "source" param, since some tags use different items, such as &lt;style&gt;
	 * @param {Boolean} useXHR Determine if the content should be loaded via XHR before being put on the tag.
	 */
	var TagLoader = function (item, srcAttr, useXHR) {
		this.init(item, srcAttr, useXHR);
	};

	var p = TagLoader.prototype = new createjs.AbstractLoader();

// Protected
	/**
	 * The attribute on a tag that sets the source. It is usually "src" or "href".
	 * @property _srcAttr
	 * @type {String}
	 * @private
	 */
	p._srcAttr = null;
	p._loadTimeOutTimeout = null;
	p.tagCompleteProxy = null;
	p.xhr = null;

	p.init = function (item, srcAttr, useXHR) {
		this._item = item;
		this._srcAttr = srcAttr || "src";
		this.useXHR = (useXHR == true);
		this.isAudio = (window['HTMLAudioElement'] && item.tag instanceof HTMLAudioElement);
		this.tagCompleteProxy = createjs.PreloadJS.proxy(this._handleTagLoad, this);
	};

	p.cancel = function() {
		this.canceled = true;
		if (this.xhr) { this.xhr.cancel(); }
		this._clean();
		var item = this.getItem();
		if (item != null) { item.src = null; }
	};

	p.load = function() {
		if (this.useXHR) {
			this.loadXHR();
		} else {
			this.loadTag();
		}
	};

// XHR Loading
	p.loadXHR = function() {
		var item = this.getItem();
		var xhr = this.xhr = new createjs.XHRLoader(item);

		xhr.onProgress = createjs.PreloadJS.proxy(this._handleProgress, this);
		xhr.onFileLoad = createjs.PreloadJS.proxy(this._handleXHRComplete, this);
		xhr.onComplete = createjs.PreloadJS.proxy(this._handleXHRComplete, this); //This is needed when loading JS files via XHR.
		xhr.onError = createjs.PreloadJS.proxy(this._handleLoadError, this);
		xhr.load();
	};

	p._handleXHRComplete = function(event) {
		if (this._isCanceled()) { return; }
		this._clean();

		//Remove complete handlers, to suppress duplicate callbacks.
		var xhr = this.xhr;
		xhr.onFileLoad = null;
		xhr.onComplete = null;

		var item = xhr.getItem();
		var result = xhr.getResult();

		if (item.type == createjs.PreloadJS.IMAGE) {
			item.tag.onload = createjs.PreloadJS.proxy(this._sendComplete, this);
			item.tag.src = item.src;
		} else {
			item.tag[this._srcAttr] = item.src;
			this._sendComplete();
		}
	};

	p._handleLoadError = function(event) {
		 //Security error, try TagLoading now
		if (event.error && event.error.code == 101) {
			this.loadTag();
		} else {
			this._clean();
			this._sendError(event);
		}
	};

// Tag Loading
	p.loadTag = function() {
		var item = this.getItem();
		var tag = item.tag;

		// In case we don't get any events...
		clearTimeout(this._loadTimeOutTimeout);
		this._loadTimeOutTimeout = setTimeout(createjs.PreloadJS.proxy(this._handleLoadTimeOut, this), createjs.PreloadJS.TIMEOUT_TIME);

		if (this.isAudio) {
			tag.src = null;
			//tag.type = "audio/ogg"; // TODO: Set proper types
			tag.preload = "auto";
		}

		// Handlers for all tags
		tag.onerror = createjs.PreloadJS.proxy(this._handleLoadError, this);
		//tag.onprogress = createjs.PreloadJS.proxy(this._handleProgress, this); // Note: Progress events for audio tags in Chrome only.

		if (this.isAudio) {
			// Handlers for audio tags
			tag.onstalled = createjs.PreloadJS.proxy(this._handleStalled, this);
			tag.addEventListener("canplaythrough", this.tagCompleteProxy, false); //Note that this property isn't helpful.
		} else {
			// Handlers for non-audio tags
			tag.onload = createjs.PreloadJS.proxy(this._handleTagLoad, this);
		}

		// Set the src after the events are all added.
		tag[this._srcAttr] = item.src;

		//If its SVG, it needs to be on the dom to load (we remove it before sending complete)
		if (item.type == createjs.PreloadJS.SVG) {
			document.getElementsByTagName('body')[0].appendChild(tag);
		}

		// Note: Previous versions didn't seem to work when we called load() for OGG tags in Firefox. Seems fixed in 15.0.1
		if (tag.load != null) {
			tag.load();
		}
	}

	p._handleLoadTimeOut = function() {
		this._clean();
		this._sendError();
	};

	p._handleStalled = function() {
		//Ignore, let the timeout take care of it. Sometimes its not really stopped.
	};

	p._handleLoadError = function(event) {
		this._clean();
		this._sendError();
	};

	p._handleTagLoad = function(event) {
		if (this._isCanceled()) { return; }
		var tag = this.getItem().tag;
		clearTimeout(this._loadTimeOutTimeout);
		if (this.loaded || this.isAudio && tag.readyState !== 4) { return; }

		if (this.getItem().type == createjs.PreloadJS.SVG) {
			document.getElementsByTagName('body')[0].removeChild(tag);
		}

		this.loaded = true;
		this._clean();
		this._sendComplete();
	};

	p._clean = function() {
		clearTimeout(this._loadTimeOutTimeout);

		// Delete handlers.
		var tag = this.getItem().tag;
		tag.onload = null;
		tag.removeEventListener && tag.removeEventListener("canplaythrough", this.tagCompleteProxy, false);
		tag.onstalled = null;
		tag.onprogress = null;
		tag.onerror = null;

		// Clean Up XHR
		var xhr = this.xhr;
		if (xhr) {
			xhr.onProgress = null;
			xhr.onFileLoad = null;
			xhr.onComplete = null;
			xhr.onError = null;
			xhr = null;
		}
	};

	p._handleProgress = function(event) {
		clearTimeout(this._loadTimeOutTimeout);
		var progress = event;
		//TODO: Check if this works with XHR Audio...
		if (this.isAudio) {
			var item = this.getItem();
			if (item.buffered == null) { return; }
			progress = {loaded:(item.buffered.length > 0) ? item.buffered.end(0) : 0, total: item.duration};
		}
		this._sendProgress(progress);
	};

	p.toString = function() {
		return "[PreloadJS TagLoader]";
	}

	createjs.TagLoader = TagLoader;

}());