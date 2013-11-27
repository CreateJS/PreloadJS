/*
* TagLoader
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
	"use strict";
	/**
	 * A preloader that loads items using a tag-based approach. HTML audio and images can use this loader to load
	 * content cross-domain without security errors, whereas anything loaded with XHR has potential issues with cross-
	 * domain requests.
	 *
	 * Note for audio tags, TagLoader relies on the <code>canPlayThrough</code> event, which fires when the buffer
	 * is full enough to play the audio all the way through at the current download speed. This completely preloads most
	 * sound effects, however longer tracks like background audio will only load a portion before the event is fired.
	 * Most browsers (all excluding Chrome) will continue to preload once this is fired, so this is considered good
	 * enough for most cases.
	 * @class TagLoader
	 * @constructor
	 * @extends AbstractLoader
	 * @param {Object} item The item to load. Please see {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}} for
	 * information on load items.
	 */
	var TagLoader = function (item) {
		this.init(item);
	};

	var p = TagLoader.prototype = new createjs.AbstractLoader();

// Protected

	/**
	 * The timeout that is fired if nothing is loaded after a certain delay. See the <code>LoadQueue.LOAD_TIMEOUT</code>
	 * for the timeout duration.
	 * @property _loadTimeout
	 * @type {Number}
	 * @private
	 */
	p._loadTimeout = null;

	/**
	 * A reference to a bound function, which we need in order to properly remove the event handler when the load
	 * completes.
	 * @property _tagCompleteProxy
	 * @type {Function}
	 * @private
	 */
	p._tagCompleteProxy = null;

	/**
	 * Determines if the load item is an audio tag, since we take some specific approaches to properly load audio.
	 * @property _isAudio
	 * @type {Boolean}
	 * @default false
	 * @protected
	 */
	p._isAudio = false;

	/**
	 * The HTML tag or JavaScript object this loader uses to preload content. Note that a tag may be a custom object
	 * that matches the API of an HTML tag (load method, onload callback). For example, flash audio from SoundJS passes
	 * in a custom object to handle preloading for Flash audio and WebAudio.
	 * @property _tag
	 * @type {HTMLAudioElement | Object}
	 * @private
	 */
	p._tag = null;

	/**
	 * When loading a JSONP request this will be the parsed JSON result.
	 *
	 * @type {Object}
	 * @private
	 */
	p._jsonResult = null;

	// Overrides abstract method in AbstractLoader
	p.init = function (item) {
		this._item = item;
		this._tag = item.tag;
		this._isAudio = (window.HTMLAudioElement && item.tag instanceof window.HTMLAudioElement);
		this._tagCompleteProxy = createjs.proxy(this._handleLoad, this);
	};

	/**
	 * Get the loaded content. This is usually an HTML tag or other tag-style object that has been fully loaded. If the
	 * loader is not complete, this will be null.
	 * @method getResult
	 * @return {HTMLImageElement | HTMLAudioElement | Object} The loaded and parsed content.
	 */
	p.getResult = function() {
		if (this._item.type == createjs.LoadQueue.JSONP || this._item.type == createjs.LoadQueue.MANIFEST) {
			return this._jsonResult;
		} else {
			return this._tag;
		}
	};

	// Overrides abstract method in AbstractLoader
	p.cancel = function() {
		this.canceled = true;
		this._clean();
	};

	// Overrides abstract method in AbstractLoader
	p.load = function() {
		var item = this._item;
		var tag = this._tag;

		clearTimeout(this._loadTimeout); // Clear out any existing timeout
		var duration = createjs.LoadQueue.LOAD_TIMEOUT;
		if (duration == 0) { duration = createjs.LoadQueue.loadTimeout; }
		this._loadTimeout = setTimeout(createjs.proxy(this._handleTimeout, this), duration);

		if (this._isAudio) {
			tag.src = null; // Unset the source so we can set the preload type to "auto" without kicking off a load. This is only necessary for audio tags passed in by the developer.
			tag.preload = "auto";
		}

		// Handlers for all tags
		tag.onerror = createjs.proxy(this._handleError,  this);
		// Note: We only get progress events in Chrome, but do not fully load tags in Chrome due to its behaviour, so we ignore progress.

		if (this._isAudio) {
			tag.onstalled = createjs.proxy(this._handleStalled,  this);
			// This will tell us when audio is buffered enough to play through, but not when its loaded.
			// The tag doesn't keep loading in Chrome once enough has buffered, and we have decided that behaviour is sufficient.
			tag.addEventListener("canplaythrough", this._tagCompleteProxy, false); // canplaythrough callback doesn't work in Chrome, so we use an event.
		} else {
			tag.onload = createjs.proxy(this._handleLoad,  this);
			tag.onreadystatechange = createjs.proxy(this._handleReadyStateChange,  this);
		}

		var src = this.buildPath(item.src, item.values);

		// Set the src after the events are all added.
		switch(item.type) {
			case createjs.LoadQueue.CSS:
				tag.href = src;
				break;
			case createjs.LoadQueue.SVG:
				tag.data = src;
				break;
			default:
				tag.src = src;
		}

		// If we're loading JSONP, we need to add our callback now.
		if (item.type == createjs.LoadQueue.JSONP
				|| item.type == createjs.LoadQueue.JSON
				|| item.type == createjs.LoadQueue.MANIFEST) {
			if (item.callback == null) {
				throw new Error('callback is required for loading JSONP requests.');
			}

			if (window[item.callback] != null) {
				throw new Error('JSONP callback "' + item.callback + '" already exists on window. You need to specify a different callback. Or re-name the current one.');
			}

			window[item.callback] = createjs.proxy(this._handleJSONPLoad, this);
		}

		// If its SVG, it needs to be on the DOM to load (we remove it before sending complete).
		// It is important that this happens AFTER setting the src/data.
		if (item.type == createjs.LoadQueue.SVG ||
			item.type == createjs.LoadQueue.JSONP ||
			item.type == createjs.LoadQueue.JSON ||
			item.type == createjs.LoadQueue.MANIFEST ||
			item.type == createjs.LoadQueue.JAVASCRIPT ||
			item.type == createjs.LoadQueue.CSS) {
				this._startTagVisibility = tag.style.visibility;
				tag.style.visibility = "hidden";
				(document.body || document.getElementsByTagName("body")[0]).appendChild(tag);
		}

		// Note: Previous versions didn't seem to work when we called load() for OGG tags in Firefox. Seems fixed in 15.0.1
		if (tag.load != null) {
			tag.load();
		}
	};

	p._handleJSONPLoad = function(data) {
		this._jsonResult = data;
	};

	/**
	 * Handle an audio timeout. Newer browsers get a callback from the tags, but older ones may require a setTimeout
	 * to handle it. The setTimeout is always running until a response is handled by the browser.
	 * @method _handleTimeout
	 * @private
	 */
	p._handleTimeout = function() {
		this._clean();
		var event = new createjs.Event("error");
		event.text = "PRELOAD_TIMEOUT";
		this._sendError(event);
	};

	/**
	 * Handle a stalled audio event. The main place we seem to get these is with HTMLAudio in Chrome when we try and
	 * playback audio that is already in a load, but not complete.
	 * @method _handleStalled
	 * @private
	 */
	p._handleStalled = function() {
		//Ignore, let the timeout take care of it. Sometimes its not really stopped.
	};

	/**
	 * Handle an error event generated by the tag.
	 * @method _handleError
	 * @private
	 */
	p._handleError = function(event) {
		this._clean();

		var newEvent = new createjs.Event("error");
		//TODO: Propagate actual event error?
		this._sendError(newEvent);
	};

	/**
	 * Handle the readyStateChange event from a tag. We sometimes need this in place of the onload event (mainly SCRIPT
	 * and LINK tags), but other cases may exist.
	 * @method _handleReadyStateChange
	 * @private
	 */
	p._handleReadyStateChange = function() {
		clearTimeout(this._loadTimeout);
		// This is strictly for tags in browsers that do not support onload.
		var tag = this.getItem().tag;

		// Complete is for old IE support.
		if (tag.readyState == "loaded" || tag.readyState == "complete") {
			this._handleLoad();
		}
	};

	/**
	 * Handle a load (complete) event. This is called by tag callbacks, but also by readyStateChange and canPlayThrough
	 * events. Once loaded, the item is dispatched to the {{#crossLink "LoadQueue"}}{{/crossLink}}.
	 * @method _handleLoad
	 * @param {Object} [event] A load event from a tag. This is sometimes called from other handlers without an event.
	 * @private
	 */
	p._handleLoad = function(event) {
		if (this._isCanceled()) { return; }

		var item = this.getItem();
		var tag = item.tag;

		if (this.loaded || this._isAudio && tag.readyState !== 4) { return; } //LM: Not sure if we still need the audio check.
		this.loaded = true;

		// Remove from the DOM
		switch (item.type) {
			case createjs.LoadQueue.SVG:
			case createjs.LoadQueue.JSON:
			case createjs.LoadQueue.JSONP: // Note: Removing script tags is a fool's errand.
			case createjs.LoadQueue.MANIFEST:
			case createjs.LoadQueue.CSS:
				// case createjs.LoadQueue.CSS:
				//LM: We may need to remove CSS tags loaded using a LINK
				tag.style.visibility = this._startTagVisibility;
				(document.body || document.getElementsByTagName("body")[0]).removeChild(tag);
			break;
			default:
		}

		this._clean();
		this._sendComplete();
	};

	/**
	 * Clean up the loader.
	 * This stops any timers and removes references to prevent errant callbacks and clean up memory.
	 * @method _clean
	 * @private
	 */
	p._clean = function() {
		clearTimeout(this._loadTimeout);

		// Delete handlers.
		var item = this.getItem();
		var tag = item.tag;
		if (tag != null) {
			tag.onload = null;
			tag.removeEventListener && tag.removeEventListener("canplaythrough", this._tagCompleteProxy, false);
			tag.onstalled = null;
			tag.onprogress = null;
			tag.onerror = null;

			//TODO: Test this
			if (tag.parentNode != null
					&& item.type == createjs.LoadQueue.SVG
					&& item.type == createjs.LoadQueue.JSON
					&& item.type == createjs.LoadQueue.MANIFEST
					&& item.type == createjs.LoadQueue.CSS
					&& item.type == createjs.LoadQueue.JSONP) {
				 // Note: Removing script tags is a fool's errand.
				tag.parentNode.removeChild(tag);
			}
		}

		var item = this.getItem();
		if (item.type == createjs.LoadQueue.JSONP
			|| item.type == createjs.LoadQueue.MANIFEST) {
			window[item.callback] = null;
		}
	};

	p.toString = function() {
		return "[PreloadJS TagLoader]";
	};

	createjs.TagLoader = TagLoader;

}());
