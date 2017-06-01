/*
 * SVGLoader
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
	 * A loader for SVG files.
	 * @class SVGLoader
	 * @param {LoadItem|Object} loadItem
	 * @param {Boolean} preferXHR
	 * @extends AbstractLoader
	 * @constructor
	 */
	function SVGLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.Types.SVG);

		// public properties
		this.resultFormatter = this._formatResult;

		// protected properties
		this._tagSrcAttribute = "data";

		if (preferXHR) {
			this.setTag(createjs.Elements.svg());
		} else {
			this.setTag(createjs.Elements.object());
			this.getTag().type = "image/svg+xml";
		}
	};

	var p = createjs.extend(SVGLoader, createjs.AbstractLoader);
	var s = SVGLoader;

	// static methods
	/**
	 * Determines if the loader can load a specific item. This loader can only load items that are of type
	 * {{#crossLink "Types/SVG:property"}}{{/crossLink}}
	 * @method canLoadItem
	 * @param {LoadItem|Object} item The LoadItem that a LoadQueue is trying to load.
	 * @returns {Boolean} Whether the loader can load the item.
	 * @static
	 */
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.SVG;
	};

	// protected methods
	/**
	 * The result formatter for SVG files.
	 * @method _formatResult
	 * @param {AbstractLoader} loader
	 * @returns {Object}
	 * @private
	 */
	p._formatResult = function (loader) {
		// mime should be image/svg+xml, but Opera requires text/xml
		var xml = createjs.DataUtils.parseXML(loader.getResult(true));
		var tag = loader.getTag();

		if (!this._preferXHR && document.body.contains(tag)) {
			document.body.removeChild(tag);
		}

		if (xml.documentElement != null) {
			var element = xml.documentElement;
			// Support loading an SVG from a different domain in ID
			if (document.importNode) {
				element = document.importNode(element, true);
			}
			tag.appendChild(element);
			return tag;
		} else { // For browsers that don't support SVG, just give them the XML. (IE 9-8)
			return xml;
		}
	};

	createjs.SVGLoader = createjs.promote(SVGLoader, "AbstractLoader");

}());
