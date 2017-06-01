/*
 * VideoLoader
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
	 * A loader for video files.
	 * @class VideoLoader
	 * @param {LoadItem|Object} loadItem
	 * @param {Boolean} preferXHR
	 * @extends AbstractMediaLoader
	 * @constructor
	 */
	function VideoLoader(loadItem, preferXHR) {
		this.AbstractMediaLoader_constructor(loadItem, preferXHR, createjs.Types.VIDEO);

		if (createjs.DomUtils.isVideoTag(loadItem) || createjs.DomUtils.isVideoTag(loadItem.src)) {
			this.setTag(createjs.DomUtils.isVideoTag(loadItem)?loadItem:loadItem.src);

			// We can't use XHR for a tag that's passed in.
			this._preferXHR = false;
		} else {
			this.setTag(this._createTag());
		}
	};

	var p = createjs.extend(VideoLoader, createjs.AbstractMediaLoader);
	var s = VideoLoader;

	/**
	 * Create a new video tag
	 *
	 * @returns {HTMLElement}
	 * @private
	 */
	p._createTag = function () {
		return createjs.Elements.video();
	};

	// static methods
	/**
	 * Determines if the loader can load a specific item. This loader can only load items that are of type
	 * {{#crossLink "Types/VIDEO:property"}}{{/crossLink}}.
	 * @method canLoadItem
	 * @param {LoadItem|Object} item The LoadItem that a LoadQueue is trying to load.
	 * @returns {Boolean} Whether the loader can load the item.
	 * @static
	 */
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.VIDEO;
	};

	createjs.VideoLoader = createjs.promote(VideoLoader, "AbstractMediaLoader");

}());
