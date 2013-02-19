/*
* AbstractLoader for PreloadJS
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
this.createjs = this.createjs||{};

(function() {

	/**
	 * The base loader, which defines all the generic callbacks and events. All loaders extend this class, including the
	 * {{#crossLink "LoadQueue"}}{{/crossLink}}.
	 * @class AbstractLoader
	 * @uses EventDispatcher
	 */
	var AbstractLoader = function () {
		this.init();
	};

	AbstractLoader.prototype = {};
	var p = AbstractLoader.prototype;
	var s = AbstractLoader;

	/**
	 * The RegExp pattern to use to parse file URIs. This supports simple file names, as well as full domain URIs with
	 * query strings. The resulting match is: protocol:$1 domain:$2 path:$3 file name:$4 extension:$5 query:$6.
	 * @property FILE_PATTERN
	 * @type {RegExp}
	 * @static
	 * @protected
	 */
	s.FILE_PATTERN = /(\w+:\/{2})?((?:\w+\.){2}\w+)?(\/?[\S]+\/|\/)?([\w\-%\.]+)(?:\.)(\w+)?(\?\S+)?/i;

	/**
	 * If the loader has completed loading. This provides a quick check, but also ensures that the different approaches
	 * used for loading do not pile up resulting in more than one <code>complete</code> event.
	 * @property loaded
	 * @type {Boolean}
	 * @default false
	 */
	p.loaded = false;

	/**
	 * Determine if the loader was canceled. Canceled loads will not fire complete events. Note that
	 * {{#crossLink "LoadQueue"}}{{/crossLink}} queues should be closed using {{#crossLink "AbstractLoader/close"}}{{/crossLink}}
	 * instead of canceled.
	 * @property canceled
	 * @type {Boolean}
	 * @default false
	 */
	p.canceled = false;

	/**
	 * The current load progress (percentage) for this item. This will be a number between 0 and 1.
	 * @property progress
	 * @type {Number}
	 * @default 0
	 */
	p.progress = 0;

	/**
	 * The item this loader represents. Note that this is null in a {{#crossLink "LoadQueue"}}{{/crossLink}}, but will
	 * be available on loaders such as {{#crossLink "XHRLoader"}}{{/crossLink}} and {{#crossLink "TagLoader"}}{{/crossLink}}.
	 * @property _item
	 * @type {Object}
	 * @private
	 */
	p._item = null;

// Events
	/**
	 * The event that is fired when the overall progress changes.
	 * @event progress
	 * @param {Object} target The object that dispatched the event.
	 * @param {String} type The event type.
	 * @param {Number} loaded The amount that has been loaded so far. Note that this is may just be a percentage of 1,
	 * since file sizes can not be determined before a load is kicked off, if at all.
	 * @param {Number} total The total number of bytes. Note that this may just be 1.
	 * @param {Number} percent The percentage that has been loaded. This will be a number between 0 and 1.
	 * @since 0.3.0
	 */

	/**
	 * The event that is fired when a load starts.
	 * @event loadStart
	 * @param {Object} target The object that dispatched the event.
	 * @param {String} type The event type.
	 * @since 0.3.0
	 */

	/**
	 * The event that is fired when the entire queue has been loaded.
	 * @event complete
	 * @param {Object} target The object that dispatched the event.
	 * @param {String} type The event type.
	 * @since 0.3.0
	 */

	/**
	 * The event that is fired when the loader encounters an error. If the error was encountered by a file, the event will
	 * contain the item that caused the error. There may be additional properties such as the error reason on event
	 * objects.
	 * @event error
	 * @param {Object} target The object that dispatched the event.
	 * @param {String} type The event type.
	 * @param {Object} [item] The item that was being loaded that caused the error. The item was specified in
	 * the {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}} or {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}}
	 * call. If only a string path or tag was specified, the object will contain that value as a property.
	 * @param {String} [error] The error object or text.
	 * @since 0.3.0
	 */

// Callbacks (deprecated)
	/**
	 * The callback that is fired when the overall progress changes.
	 * @property onProgress
	 * @type {Function}
	 * @deprecated In favour of the "progress" event. Will be removed in a future version.
	 */
	p.onProgress = null;

	/**
	 * The callback that is fired when a load starts.
	 * @property onLoadStart
	 * @type {Function}
	 * @deprecated In favour of the "loadStart" event. Will be removed in a future version.
	 */
	p.onLoadStart = null;

	/**
	 * The callback that is fired when the loader's content has been entirely loaded.
	 * @property onComplete
	 * @type {Function}
	 * @deprecated In favour of the "complete" event. Will be removed in a future version.
	 */
	p.onComplete = null;

	/**
	 * The callback that is fired when the loader encounters an error.
	 * @property onError
	 * @type {Function}
	 * @deprecated In favour of the "error" event. Will be removed in a future version.
	 */
	p.onError = null;


// mix-ins:
	// EventDispatcher methods:
	p.addEventListener = null;
	p.removeEventListener = null;
	p.removeAllEventListeners = null;
	p.dispatchEvent = null;
	p.hasEventListener = null;
	p._listeners = null;
	createjs.EventDispatcher.initialize(p);


	/**
	 * Get a reference to the manifest item that is loaded by this loader. In most cases this will be the value that was
	 * passed into {{#crossLink "LoadQueue"}}{{/crossLink}} using {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}} or
	 * {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}}. However if only a String path was passed in, then it will
	 * be an Object created by the LoadQueue.
	 * @return {Object} The manifest item that this loader is responsible for loading.
	 */
	p.getItem = function() {
		return this._item;
	};

	/**
	 * Initialize the loader. This is called by the constructor.
	 * @method init
	 * @private
	 */
	p.init = function () {};

	/**
	 * Begin loading the queued items. This method can be called when a {{#crossLink "LoadQueue"}}{{/crossLink}} is set
	 * up but not started immediately.
	 * @example
	 *      var queue = new createjs.LoadQueue();
	 *      queue.addEventListener("complete", handleComplete);
	 *      queue.loadManifest(fileArray, false); // Note the 2nd argument that tells the queue not to start loading yet
	 *      queue.load();
	 * @method load
	 */
	p.load = function() {};

	/**
	 * Close the active queue. Closing a queue completely empties the queue, and prevents any remaining items from
	 * starting to download. Note that currently any active loads will remain open, and events may be processed.
	 *
	 * To stop and restart a queue, use the {{#crossLink "LoadQueue/setPaused"}}{{/crossLink}} method instead.
	 * @method close
	 */
	p.close = function() {};


//Callback proxies
	/**
	 * Dispatch a loadStart event (and onLoadStart callback). Please see the <code>AbstractLoader.loadStart</code> event
	 * for details on the event payload.
	 * @method _sendLoadStart
	 * @protected
	 */
	p._sendLoadStart = function() {
		if (this._isCanceled()) { return; }
		this.onLoadStart && this.onLoadStart({target:this});
		this.dispatchEvent("loadStart");
	};

	/**
	 * Dispatch a progress event (and onProgress callback). Please see the <code>AbstractLoader.progress</code> event
	 * for details on the event payload.
	 * @method _sendProgress
	 * @param {Number | Object} value The progress of the loaded item, or an object containing <code>loaded</code>
	 * and <code>total</code> properties.
	 * @protected
	 */
	p._sendProgress = function(value) {
		if (this._isCanceled()) { return; }
		var event = null;
		if (typeof(value) == "number") {
			this.progress = value;
			event = {loaded:this.progress, total:1};
		} else {
			event = value;
			this.progress = value.loaded / value.total;
			if (isNaN(this.progress) || this.progress == Infinity) { this.progress = 0; }
		}
		event.target = this;
		event.type = "progress";
		this.onProgress && this.onProgress(event);
		this.dispatchEvent(event);
	};

	/**
	 * Dispatch a complete event (and onComplete callback). Please see the <code>AbstractLoader.complete</code> event
	 * for details on the event payload.
	 * @method _sendComplete
	 * @protected
	 */
	p._sendComplete = function() {
		if (this._isCanceled()) { return; }
		this.onComplete && this.onComplete({target:this});
		this.dispatchEvent("complete");
	};

	/**
	 * Dispatch an error event (and onError callback). Please see the <code>AbstractLoader.error</code> event for
	 * details on the event payload.
	 * @method _sendError
	 * @param {Object} event The event object containing specific error properties.
	 * @protected
	 */
	p._sendError = function(event) {
		if (this._isCanceled()) { return; }
		if (event == null) { event = {}; }
		event.target = this;
		event.type = "error";
		this.onError && this.onError(event);
		this.dispatchEvent(event);
	};

	/**
	 * Determine if the load has been canceled. This is important to ensure that method calls or asynchronous events
	 * do not cause issues after the queue has been cleaned up.
	 * @method _isCanceled
	 * @return {Boolean} If the loader has been canceled.
	 * @protected
	 */
	p._isCanceled = function() {
		if (window.createjs == null || this.canceled) {
			return true;
		}
		return false;
	};

	/**
	 * Parse a file URI using the <code>AbstractLoader.FILE_PATTERN</code> RegExp pattern.
	 * @method _parseURI
	 * @param {String} path The file path to parse.
	 * @return {Array} The matched file contents. Please see the <code>AbstractLoader.FILE_PATTERN</code> property for
	 * details on the return value. This will return null if it does not match.
	 * @protected
	 */
	p._parseURI = function(path) {
		if (!path) { return null; }
		return path.match(s.FILE_PATTERN);
	};

	/**
	 * @method toString
	 * @return {String} a string representation of the instance.
	 */
	p.toString = function() {
		return "[PreloadJS AbstractLoader]";
	};

	createjs.AbstractLoader = AbstractLoader;

}());