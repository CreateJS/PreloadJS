/*
* XMLLoader
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

	/**
	* The XMLLoader class description goes here.
	*
	 * @constructor
	*/
	function XMLLoader(loadItem) {
		this.AbstractLoader_constructor();

		this.type = createjs.DataTypes.XML;
		this._item = createjs.LoadItem.create(loadItem);


		// public properties


		// protected properties
		this._xhr = new createjs.XHRRequest(this._item);
		this._xhr.addEventListener("complete", this);
		this._xhr.addEventListener("progress", this);
	};

	var p = createjs.extend(XMLLoader, createjs.AbstractLoader);
	var s = XMLLoader;

	// static properties

	// public methods
	p.load = function() {
		this._xhr.load();
	};

	p.cancel = function() {
		this._xhr.cancel();
	};

	// protected methods
	p.handleEvent = function(evt) {
		switch (evt.type) {
			case "complete":
				var event = new createjs.Event(evt.type);
				this._rawResult = event.rawResult = evt.target._response;
				this._result = event.result = createjs.DataUtils.parseXML(event.rawResult, "text/xml");
				this.dispatchEvent(event);
				break;
			case "progress":
				this._sendProgress(evt);
				break;
		}
	};

	createjs.XMLLoader = createjs.promote(XMLLoader, "AbstractLoader");

}());
