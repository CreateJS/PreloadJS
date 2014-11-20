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
this.createjs = this.createjs||{};

(function () {
	"use strict";

	// constructor
	/**
	* The ImageLoader class description goes here.
	*
	*/
	function ImageLoader(loadItem, useXHR) {
		this.AbstractLoader_constructor();
		this._init(loadItem, useXHR, createjs.DataTypes.IMAGE);

		// public properties

		// protected properties
		this._tagSrcAttribute = "src";

		this._tag = document.createElement("img");

		this.on("initialize", this._updateXHR, this);
		this.resultFormatter = this._formatResult;
	};

	var p = createjs.extend(ImageLoader, createjs.AbstractLoader);
	var s = ImageLoader;

	// static properties

	// public methods
	p.load = function() {
		if (this._crossOrigin != "") { this._tag.crossOrigin = "Anonymous"; } // We can assume this, since XHR images are always loaded on a server.
		this.AbstractLoader_load();
	};

	// protected methods
	p._updateXHR = function(evt) {
		evt.loader.mimeType = 'text/plain; charset=x-user-defined-binary';

		// Only exists for XHR
		if (evt.loader.setResponseType) {
			evt.loader.setResponseType("blob");
		}
	};

	p._formatResult = function(loader) {
		if (!this._useXHR) {
			document.body.removeChild(loader.getTag());
		} else if (window.URL && window.URL.createObjectURL) {
			this._tag.src = window.URL.createObjectURL(loader.getResult(true));
		} else {
			// TODO: Should we just prevent XHR image loading when Object URL's are not supported?
			loader.getTag().src = loader.getItem().src;
		}

		return this._tag;
	};

	createjs.ImageLoader = createjs.promote(ImageLoader, "AbstractLoader");

}());
