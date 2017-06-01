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

/**
 * @module PreloadJS
 */

// namespace:
this.createjs = this.createjs || {};

(function () {
	"use strict";

	// constructor
	/**
	 * A loader for CSS files.
	 * @class CSSLoader
	 * @param {LoadItem|Object} loadItem
	 * @param {Boolean} preferXHR
	 * @extends AbstractLoader
	 * @constructor
	 */
	function CSSLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.Types.CSS);

		// public properties
		this.resultFormatter = this._formatResult;

		// protected properties
		this._tagSrcAttribute = "href";

		if (preferXHR) {
			this._tag = createjs.Elements.style();
		} else {
			this._tag = createjs.Elements.link();
		}

		this._tag.rel = "stylesheet";
		this._tag.type = "text/css";
	};

	var p = createjs.extend(CSSLoader, createjs.AbstractLoader);
	var s = CSSLoader;

	// static methods
	/**
	 * Determines if the loader can load a specific item. This loader can only load items that are of type
	 * {{#crossLink "Types/CSS:property"}}{{/crossLink}}.
	 * @method canLoadItem
	 * @param {LoadItem|Object} item The LoadItem that a LoadQueue is trying to load.
	 * @returns {Boolean} Whether the loader can load the item.
	 * @static
	 */
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.CSS;
	};

	// protected methods
	/**
	 * The result formatter for CSS files.
	 * @method _formatResult
	 * @param {AbstractLoader} loader
	 * @returns {HTMLLinkElement|HTMLStyleElement}
	 * @private
	 */
	p._formatResult = function (loader) {
		if (this._preferXHR) {
			var tag = loader.getTag();

			if (tag.styleSheet) { // IE
				tag.styleSheet.cssText = loader.getResult(true);
			} else {
				var textNode = createjs.Elements.text(loader.getResult(true));
				tag.appendChild(textNode);
			}
		} else {
			tag = this._tag;
		}

		createjs.DomUtils.appendToHead(tag);

		return tag;
	};

	createjs.CSSLoader = createjs.promote(CSSLoader, "AbstractLoader");

}());
