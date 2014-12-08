/*
 * ManifestLoader
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

// namespace:
this.createjs = this.createjs || {};

(function () {
	"use strict";

	// constructor
	/**
	 *
	 * @param itemSrc
	 * @param useXHR Default true; Specifies whether or not to load the manifest as JSONP (false), or to use XHR (true/default).
	 * @constructor
	 */
	function ManifestLoader(itemSrc) {
		this.AbstractLoader_constructor(itemSrc, null, createjs.AbstractLoader.MANIFEST);

		// public properties
		// protected properties
		/**
		 * An internal queue which loads the contents of the manifest.
		 * @type {LoadQueue}
		 * @private
		 */
		this._manifestQueue = null;
	};

	var p = createjs.extend(ManifestLoader, createjs.AbstractLoader);
	var s = ManifestLoader;

	// static properties

	/**
	 * The amount of progress that the manifest itself takes up.
	 * @property MANIFEST_PROGRESS
	 * @type {number}
	 * @private
	 * @static
	 */
	s.MANIFEST_PROGRESS = 0.25;

	/**
	 * LoadQueue calls this when it creates loaders.
	 * Each loader has the option to say either yes (true) or no (false).
	 *
	 * @private
	 * @param item The LoadItem LoadQueue is trying to load.
	 * @returns {boolean}
	 */
	s.canLoadItem = function (item) {
		return item.type == createjs.AbstractLoader.MANIFEST;
	};

	// public methods
	p.load = function () {
		this.AbstractLoader_load();
	};

	// protected methods
	p._createRequest = function() {
		var callback = this._item.callback
		if (callback != null) {
			this._request = new createjs.JSONPLoader(this._item);
		} else {
			this._request = new createjs.JSONLoader(this._item);
		}
	};

	p.handleEvent = function (event) {
		switch (event.type) {
			case "complete":
				this._rawResult = event.target.getResult(true);
				this._result = event.target.getResult();
				this._sendProgress(s.MANIFEST_PROGRESS);
				this._loadManifest(this._result);
				return;
			case "progress":
				event.loaded *= s.MANIFEST_PROGRESS;
				this.progress = event.loaded / event.total;
				if (isNaN(this.progress) || this.progress == Infinity) { this.progress = 0; }
				this._sendProgress(event);
				return;
		}
		this.AbstractLoader_handleEvent(event);
	};

	p.destroy = function() {
		this.AbstractLoader_destroy();
		this._manifestQueue.close();
	};

	p._loadManifest = function (json) {
		if (json && json.manifest) {
			var queue = this._manifestQueue = new createjs.LoadQueue();
			queue.on("complete", this._handleManifestComplete, this, true);
			queue.on("progress", this._handleManifestProgress, this);
			queue.on("error", this._handleManifestError, this, true);
			queue.loadManifest(json);
		} else {
			this._sendComplete();
		}
	};

	p._handleManifestComplete = function (event) {
		this._loadedItems = this._manifestQueue.getItems(true);
		this._sendComplete();
	};

	p._handleManifestProgress = function (event) {
		this.progress = event.progress * (1 - s.MANIFEST_PROGRESS) + s.MANIFEST_PROGRESS;
		this._sendProgress(this.progress);
	};

	p._handleManifestError = function (event) {
		this._sendError(event);
	};

	createjs.ManifestLoader = createjs.promote(ManifestLoader, "AbstractLoader");

}());
