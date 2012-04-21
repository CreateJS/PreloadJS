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
(function (window) {

	/**
	 * The loader that handles loading items using a tag-based approach. There is a built-in
	 * fallback for XHR loading for tags that do not fire onload events, such as &lt;script&gt; and &lt;style&gt;.
	 * @class TagLoader
	 * @constructor
	 * @extends AbstractLoader
	 * @param {String | Object} item The item to load
	 * @param {String} srcAttr The attribute to use as the "source" param, since some tags use different items, such as <style>
	 * @param {Boolean} useXHR Determine if the content should be loaded via XHR before being put on the tag.
	 */
	var TagLoader = function (item, srcAttr, useXHR) {
		this.init(item, srcAttr, useXHR);
	};
	var p = TagLoader.prototype = new AbstractLoader();

	//Protected
	p._srcAttr = null;
	p._loadTimeOutTimeout = null;
	p.tagCompleteProxy = null;

	p.init = function (item, srcAttr, useXHR) {
		this._item = item;
		this._srcAttr = srcAttr || "src";
		this._useXHR = (useXHR == true);
		this.isAudio = (item.tag instanceof HTMLAudioElement);
		this.tagCompleteProxy = PreloadJS.proxy(this._handleTagLoad, this);
	};

	p.cancel = function() {
		this._clean();
		var item = this.getItem();
		if (item != null) { item.src = null; }
	};

	p.load = function() {
		if (this._useXHR) {
			this.loadXHR();
		} else {
			this.loadTag();
		}
	};

// XHR Loading
	p.loadXHR = function() {
		var item = this.getItem();
		var xhr = new PreloadJS.lib.XHRLoader(item);

		xhr.onProgress = PreloadJS.proxy(this._handleProgress, this);
		xhr.onFileLoad = PreloadJS.proxy(this._handleXHRComplete, this);
		//xhr.onComplete = PreloadJS.proxy(this._handleXHRComplete, this);
		xhr.onFileError = PreloadJS.proxy(this._handleLoadError, this);
		xhr.load();
	};

	p._handleXHRComplete = function(loader) {
		this._clean();

		var item = loader.getItem();
		var result = loader.getResult();

		//LM: Consider moving this to XHRLoader
		if (item.type == PreloadJS.IMAGE) {
			item.tag.onload = PreloadJS.proxy(this._sendComplete, this);
			item.tag.src = item.src;
		} else {
			item.tag[this._srcAttr] = item.src;
			this._sendComplete();
		}
	};

	p._handleLoadError = function(event) {
		this._clean();
		this._sendError(event);
	};


// Tag Loading
	p.loadTag = function() {
		var item = this.getItem();
		var tag = item.tag;

		// In case we don't get any events...
		clearTimeout(this._loadTimeOutTimeout);
		this._loadTimeOutTimeout = setTimeout(PreloadJS.proxy(this._handleLoadTimeOut, this), PreloadJS.TIMEOUT_TIME);

		if (this.isAudio) {
			tag.src = null;
			//tag.type = "audio/ogg"; // TODO: Set proper types
			tag.preload = "auto";
			tag.setAttribute("data-temp", "true"); //LM: Do we need this?
		}

		// Handlers for all tags
		tag.onerror = PreloadJS.proxy(this._handleLoadError, this);
		tag.onprogress = PreloadJS.proxy(this._handleProgress, this);

		if (this.isAudio) {
			// Handlers for audio tags
			tag.onstalled = PreloadJS.proxy(this._handleStalled, this);
			tag.addEventListener("canplaythrough", this.tagCompleteProxy, true); //LM: oncanplaythrough callback does not work in Chrome.
		} else {
			// Handlers for non-audio tags
			tag.onload = PreloadJS.proxy(this._handleTagLoad, this);
		}

		// Set the src after the events are all added.
		tag[this._srcAttr] = item.src;

		// We can NOT call load() for OGG in Firefox.
		var isOgg = (item.type == PreloadJS.SOUND && item.ext == "ogg" && PreloadJS.lib.BrowserDetect.isFirefox);
		if (tag.load != null && !isOgg) {
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
		var tag = this.getItem().tag;
		clearTimeout(this._loadTimeOutTimeout);
		if (this.isAudio && tag.readyState !== 4) { return; }

		if (this.loaded) { return; }
		this.loaded = true;
		this._clean();
		this._sendComplete();
	};

	p._clean = function() {
		clearTimeout(this._loadTimeOutTimeout);

		// Delete handlers.
		var tag = this.getItem().tag;
		tag.onload = null;
		tag.removeEventListener("canplaythrough", this.tagCompleteProxy, true);
		tag.onstalled = null;
		tag.onprogress = null;
		tag.onerror = null;
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

	PreloadJS.lib.TagLoader = TagLoader;

}(window))