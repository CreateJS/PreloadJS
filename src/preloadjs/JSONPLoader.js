/*
* JSONPLoader
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
	 * The JSONPLoader class description goes here.
	 *
	 */
	function JSONPLoader(loadItem) {
		this.AbstractLoader_constructor(loadItem, false, createjs.DataTypes.JSONP);

		// public properties

		// protected properties
		this._tag = document.createElement("script");
		this._tag.type = "text/javascript";
	};

	var p = createjs.extend(JSONPLoader, createjs.AbstractLoader);
	var s = JSONPLoader;

	// static properties

	// public methods
	p.cancel = function () {
		this.AbstractLoader_cancel();
		this._dispose();
	}

	p.load = function () {
		if (this._item.callback == null) {
			throw new Error('callback is required for loading JSONP requests.');
		}

		// TODO: Look into creating our own iFrame to handle the load
		// In the first attempt, FF did not get the result
		//   result instanceof Object did not work either
		//   so we would need to clone the result.
		if (window[this._item.callback] != null) {
			throw new Error(
				'JSONP callback "' +
				this.item.callback +
				'" already exists on window.' +
				' You need to specify a different callback.' +
				' Or re-name the current one.');
		}

		window[this._item.callback] = createjs.proxy(this._handleLoad, this);
		window.document.body.appendChild(this._tag);

		// Load the tag
		this._tag.src = this._item.src;
	};

	// protected methods
	/**
	 * @todo
	 * @param data
	 * @private
	 */
	p._handleLoad = function (data) {
		this._result = this._rawResult = data;
		this._sendComplete();

		this._dispose();
	};

	p._dispose = function() {
		window.document.body.removeChild(this._tag);
	}

	createjs.JSONPLoader = createjs.promote(JSONPLoader, "AbstractLoader");

}());
