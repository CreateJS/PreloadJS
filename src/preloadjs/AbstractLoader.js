/* Copyright */
/**
 * @module PreloadJS
 */
(function (window) {

	/**
	 * The base loader, which handles all callbacks. All loaders should extend this class.
	 * @class AbstractLoader
	 * @constructor
	 */
	var AbstractLoader = function () {
		this.init();
	};

	AbstractLoader.prototype = {};
	var p = AbstractLoader.prototype;

	/**
	 * Determine if this loader has completed already.
	 * @property loaded
	 * @type Boolean
	 * @default false
	 */
	p.loaded = false;

	/**
	 * The current load progress (percentage) for this item.
	 * @property progress
	 * @type Number
	 * @default 0
	 */
	p.progress = 0;

	// The manifest item we are loading
	p._item = null;

//Callbacks
	/**
	 * The callback to fire when progress changes.
	 * @property onProgress
	 * @type Function
	 * @default null
	 */
	p.onProgress = null;

	/**
	 * The callback to fire when a load starts.
	 * @property onLoadStart
	 * @type Function
	 * @default null
	 */
	p.onLoadStart = null;

	/**
	 * The callback to fire when a file completes.
	 * @property onFileLoad
	 * @type Function
	 * @default null
	 */
	p.onFileLoad = null;

	/**
	 * The callback to fire when a file progress changes.
	 * @property onFileProgress
	 * @type Function
	 * @default null
	 */
	p.onFileLoad = null;

	/**
	 * The callback to fire when all loading is complete.
	 * @property onComplete
	 * @type Function
	 * @default null
	 */
	p.onComplete = null;

	/**
	 * The callback to fire when a file encounters an error.
	 * @property onFileError
	 * @type Function
	 * @default null
	 */
	p.onFileError = null;


	/**
	 * Get a reference to the manifest item that is loaded by this loader.
	 * @return {Object} The manifest item
	 */
	p.getItem = function() {
		return this._item;
	};

	/**
	 * Initialize the loader.
	 * @private
	 */
	p.init = function () {};

	/**
	 * Begin the load.
	 */
	p.load = function() {};

	/**
	 * Cancel the load.
	 */
	p.cancel = function() {};


//Callback proxies
	p._sendLoadStart = function(value) {
		if (this.onLoadStart) {
			this.onLoadStart({target:this});
		}
	};

	p._sendProgress = function(value) {
		var event;
		if (value instanceof Number) {
			this.progress = value;
			event = {loaded:this.progress, total:1};
		} else {
			event = value;
			this.progress = value.loaded / value.total;
			if (isNaN(this.progress) || this.progress == Infinity) { this.progress = 0; }
		}
		event.target = this;
		if (this.onProgress) {
			this.onProgress(event);
		}
	};

	p._sendFileProgress = function(event) {
		if (this.onFileProgress) {
			event.target = this;
			this.onFileProgress(event);
		}
	};

	p._sendComplete = function() {
		if (this.onComplete) {
			this.onComplete({target:this});
		}
	};

	p._sendFileComplete = function(event) {
		if (this.onFileLoad) {
			event.target = this;
			this.onFileLoad(event);
		}
	};

	p._sendError = function(event) {
		if (this.onError) {
			if (event == null) { event = {}; }
			event.target = this;
			this.onError(event); //!(data instanceof Event) || this); //LM: Almost always returns "true"
		}
	};

	p.toString = function() {
		return "[PreloadJS AbstractLoader]";
	};

	// Note: Abstract Loader is initialized before Preload, so it has to live on Window instead of PreloadJS.lib
	window.AbstractLoader = AbstractLoader;

}(window));