/*
* CSSLoader
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
	 * The CSSLoader class description goes here.
	 *
	 */
	function CSSLoader(loadItem, useXHR) {
		this.AbstractLoader_constructor();
		this._init(loadItem, useXHR, createjs.DataTypes.CSS);

		// public properties

		// protected properties
		this._tagSrcAttribute = "href";

		if (useXHR) {
			this._tag = document.createElement("style");
		} else {
			this._tag = document.createElement("link");
		}

		this._tag.rel  = "stylesheet";
		this._tag.type = "text/css";
	};

	var p = createjs.extend(CSSLoader, createjs.AbstractLoader);
	var s = CSSLoader;

	// static properties

	// public methods

	// protected methods
	p._formatResult = function() {
		if (this._useXHR) {
			var head = document.getElementsByTagName("head")[0]; //Note: This is unavoidable in IE678
			head.appendChild(this._tag);

			if (this._tag.styleSheet) { // IE
				this._tag.styleSheet.cssText = this._rawResult;
			} else {
				var textNode = document.createTextNode(this._rawResult);
				this._tag.appendChild(textNode);
			}
		}

		return this._tag;
	};

	createjs.CSSLoader = createjs.promote(CSSLoader, "AbstractLoader");

}());
