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

		this.resultFormatter = this._formatResult;
	};

	var p = createjs.extend(CSSLoader, createjs.AbstractLoader);
	var s = CSSLoader;

	// static properties

	// public methods

	// protected methods
	p._formatResult = function(loader) {
		if (this._useXHR) {
			var tag = loader.getTag();
			var head = document.getElementsByTagName("head")[0]; //Note: This is unavoidable in IE678
			head.appendChild(tag);

			if (tag.styleSheet) { // IE
				tag.styleSheet.cssText = loader.getResult(true);
			} else {
				var textNode = document.createTextNode(loader.getResult(true));
				tag.appendChild(textNode);
			}
		}

		return tag;
	};

	createjs.CSSLoader = createjs.promote(CSSLoader, "AbstractLoader");

}());
