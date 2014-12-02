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

// namespace:
this.createjs = this.createjs || {};

(function () {
	"use strict";

	// constructor
	/**
	 * The SVGLoader class description goes here.
	 *
	 */
	function SVGLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.AbstractLoader.SVG);

		// public properties

		// protected properties
		this._tagSrcAttribute = "data";

		if (preferXHR) {
			this.setTag(document.createElement("svg"));
		} else {
			this.setTag(document.createElement("object"));
			this.getTag().type = "image/svg+xml";
		}

		this.getTag().style.visibility = "hidden";

		this.resultFormatter = this._formatResult;
	};

	var p = createjs.extend(SVGLoader, createjs.AbstractLoader);
	var s = SVGLoader;
	/**
	 * LoadQueue calls this when it creates loaders.
	 * Each loader has the option to say either yes (true) or no (false).
	 *
	 * @private
	 * @param item The LoadItem LoadQueue is trying to load.
	 * @returns {boolean}
	 */
	s.canLoadItem = function (item) {
		return item.type == createjs.AbstractLoader.SVG;
	};

	// static properties

	// public methods

	// protected methods
	p._formatResult = function (loader) {
		var xml = createjs.DataUtils.parseXML(loader.getResult(true), "image/svg+xml");
		var tag = loader.getTag();

		if (!this._preferXHR) {
			document.body.removeChild(tag);
		}

		if (xml.documentElement != null) {
			tag.appendChild(xml.documentElement);
			tag.style.visibility = "visible";
			return tag;
		} else { // For browsers that don't support SVG, just give them the XML. (IE 9-8)
			return xml;
		}
	}

	createjs.SVGLoader = createjs.promote(SVGLoader, "AbstractLoader");

}());
