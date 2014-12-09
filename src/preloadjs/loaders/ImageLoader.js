/*
 * ImageLoader
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
	 * The ImageLoader class description goes here.
	 *
	 */
	function ImageLoader (loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.AbstractLoader.IMAGE);

		// public properties

		// protected properties
		this._tagSrcAttribute = "src";

		if (createjs.RequestUtils.isImageTag(loadItem) || createjs.RequestUtils.isImageTag(loadItem.src)) {
			this._tag = createjs.RequestUtils.isImageTag(loadItem) ? loadItem : loadItem.src;
			this._preferXHR = false;
		} else {
			this._tag = document.createElement("img");
		}

		this._tag.style.visibility = "hidden";

		this.on("initialize", this._updateXHR, this);
		this.resultFormatter = this._formatResult;
	};

	var p = createjs.extend(ImageLoader, createjs.AbstractLoader);
	var s = ImageLoader;

	/**
	 * LoadQueue calls this when it creates loaders.
	 * Each loader has the option to say either yes (true) or no (false).
	 *
	 * @private
	 * @param item The LoadItem LoadQueue is trying to load.
	 * @returns {boolean}
	 */
	s.canLoadItem = function (item) {
		return item.type == createjs.AbstractLoader.IMAGE;
	};

	// static properties

	// public methods
	p.load = function () {
		if (this._tag.src != "" && this._tag.complete) {
			this._sendComplete();
			return;
		}

		if (this._item.crossOrigin != null) {
			this._tag.crossOrigin = this._item.crossOrigin;
		}
		this.AbstractLoader_load();
	};

	// protected methods
	p._updateXHR = function (evt) {
		evt.loader.mimeType = 'text/plain; charset=x-user-defined-binary';

		// Only exists for XHR
		if (evt.loader.setResponseType) {
			evt.loader.setResponseType("blob");
		}
	};

	p._formatResult = function (loader) {
		var _this = this;
		return function (done) {
			var tag = _this._tag;
			var URL = window.URL || window.webkitURL;

			if (!_this._preferXHR) {
				document.body.removeChild(tag);
			} else if (URL) {
				var objURL = URL.createObjectURL(loader.getResult(true));
				tag.src = objURL;
				tag.onload = function () {
					URL.revokeObjectURL(_this.src);
				}
			} else {
				tag.src = loader.getItem().src;
			}

			tag.style.visibility = "";

			if (tag.complete) {
				done(tag);
			} else {
				tag.onload = function () {
					done(this);
				}
			}
		};
	};

	createjs.ImageLoader = createjs.promote(ImageLoader, "AbstractLoader");

}());
