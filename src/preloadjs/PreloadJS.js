/* Copyright */
/**
 * PreloadJS provides a consistent API for preloading content in HTML5.
 * @module PreloadJS
 */
(function (window) {

	//TODO: Add an API to clear the preloader. Handy if we want to reuse it, and don't want the composite progress.

	/**
	 * PreloadJS provides a consistent way to preload content for use in HTML applications.
	 * @class PreloadJS
	 * @param Boolean useXHR2 Determines whether the preload instance will use XmlHttpRequests, or fall back on tag loading.
	 * @constructor
	 * @extends AbstractLoader
	 */
	var PreloadJS = function(useXHR2) {
		this.initialize(useXHR2);
	};

	var p = PreloadJS.prototype = new AbstractLoader();
	var s = PreloadJS;

	// Preload Types
	/**
	 * The preload type for image files, usually png, gif, or jpg/jpeg
	 * @property IMAGE
	 * @type String
	 * @default image
	 * @static
	 */
	s.IMAGE = "image";

	/**
	 * The preload type for sound files, usually mp3, ogg, or wav.
	 * @property SOUND
	 * @type String
	 * @default sound
	 * @static
	 */
	s.SOUND = "sound";

	/**
	 * The preload type for json files, usually with the "json" file extension.
	 * @property JSON
	 * @type String
	 * @default json
	 * @static
	 */
	s.JSON = "json";

	/**
	 * The preload type for javascript files, usually with the "js" file extension.
	 * @property JAVASCRIPT
	 * @type String
	 * @default javascript
	 * @static
	 */
	s.JAVASCRIPT = "javascript";

	/**
	 * The preload type for css files.
	 * @property CSS
	 * @type String
	 * @default css
	 * @static
	 */
	s.CSS = "css";

	/**
	 * The preload type for xml files.
	 * @property XML
	 * @type String
	 * @default xml
	 * @static
	 */
	s.XML = "xml";

	/**
	 * The preload type for text files, which is also the default file type if the type can not be determined.
	 * @property TEXT
	 * @type String
	 * @default text
	 * @static
	 */
	s.TEXT = "text";

	/**
	 * Time in millseconds to assume a load has failed.
	 * @property TIMEOUT_TIME
	 * @type Number
	 * @default 8000
	 * @static
	 */
	s.TIMEOUT_TIME = 8000;

	// Flags
	/**
	 * Use XMLHttpRequest when possible.
	 * @property useXHR
	 * @type Boolean
	 * @default true
	 */
	p.useXHR = true;

	/**
	 * Use asynchronous XMLHttpRequests.
	 * @property async
	 * @type Boolean
	 * @default false
	 */
	p.async = false;

	/**
	 * Stop processing the current queue when an error is encountered.
	 * @property stopOnError
	 * @type Boolean
	 * @default false
	 */
	p.stopOnError = false;

	/**
	 * Ensure loaded scripts "complete" in the order they are specified.
	 * @property maintainScriptOrder
	 * @type Boolean
	 * @default true
	 */
	p.maintainScriptOrder = true;

	/**
	 * The next preload queue to process when this one is complete.
	 * @property next
	 * @type PreloadJS
	 * @default null
	 */
	p.next = null;

	/**
	 * The callback to fire when item progress changes.
	 * @property onItemProgress
	 * @type Function
	 * @default null
	 */
	p.onItemProgress = null;

	//Protected properties
	p.typeHandlers = null;
	p.extensionHandlers = null;

	p._maxLoads = 1;
	p._currentLoads = null;
	p._loadQueue = null;
	p._loadedItemsById = null;
	p._loadedItemsBySrc = null;
	p._targetProgress = 0; // Actual Progress
	//p._currentProgress = 0; // Progress to Display when tweening
	//p._progressInterval = null;
	p._numItems = 0;
	p._numItemsLoaded = null;
	p._scriptOrder = null;
	p._loadedScripts = null;

	// Browser Capabilities
	p.TAG_LOAD_OGGS = true;

	/**
	 * Initialize a PreloadJS instance
	 * @method initialize
	 * @param useXHR Use XHR for loading (vs tag/script loading)
	 */
	p.initialize = function(useXHR) {
		this._numItems = 0;
		this._numItemsLoaded = 0;
		this._targetProgress = 0;
		this._paused = false;
		this._currentLoads = [];
		this._loadQueue = [];
		this._scriptOrder = [];
		this._loadedScripts = [];
		this._loadedItemsById = {};
		this._loadedItemsBySrc = {};
		this.typeHandlers = {};
		this.extensionHandlers = {};

		this.useXHR = (useXHR != false && window.XMLHttpRequest != null);
		this.determineCapabilities();
	};

	/**
	 * Determine the capabilities based on the current browser/version.
	 * @method determineCapabilities
	 * @private
	 */
	p.determineCapabilities = function() {
		var BD = BrowserDetect;
		if (BD == null) { return; }// Throw Error?
		PreloadJS.TAG_LOAD_OGGS = BD.isFirefox || BD.isOpera;
			// && (otherCondictions)
	}

	/**
	 * Determine if a specific type should be loaded as a binary file
	 * @method isBinary
	 * @param type The type to check
	 * @private
	 */
	s.isBinary = function(type) {
		switch (type) {
			case PreloadJS.IMAGE:
			case PreloadJS.SOUND:
				return true;
			default:
				return false;
		}
	};

	/**
	 * Register a plugin. Plugins can map to both load types (sound, image, etc), or can map to specific
	 * extensions (png, mp3, etc). Only one plugin can currently exist per suffix/type.
	 * Plugins must return an object containing:
	 *  * callback: The function to call
	 *  * types: An array of types to handle
	 *  * extensions: An array of extensions to handle. This is overriden by type handlers
	 * @method installPlugin
	 * @param {Function} plugin The plugin to install
	 */
	p.installPlugin = function(plugin) {
		if (plugin == null || plugin.getPreloadHandlers == null) { return; }
		var map = plugin.getPreloadHandlers();
		if (map.types != null) {
			for (var i=0, l=map.types.length; i<l; i++) {
				this.typeHandlers[map.types[i]] = map.callback;
			}
		}
		if (map.extensions != null) {
			for (i=0, l=map.extensions.length; i<l; i++) {
				this.extensionHandlers[map.extensions[i]] = map.callback;
			}
		}
	};

	/**
	 * Set the maximum number of concurrent loads.
	 * @method setMaxLoads
	 * @param {Number} value The number of concurrent loads to allow.
	 */
	p.setMaxLoads = function (value) {
		this._maxLoads = value;
		if (!this._paused) {
			this._loadNext();
		}
	}

	/**
	 * Load a single file
	 * @method loadFile
	 * @param {Object | String} file The file object or path to load
	 * @param {Boolean} loadNow Kick off an immediate load (true) or wait for a load call (false)
	 */
	p.loadFile = function(file, loadNow) {
		this._addItem(file);

		if (loadNow === undefined || loadNow == true) {
			this.setPaused(false);
		}
	}

	/**
	 * Load a manifest, containing a list of files
	 * @method loadManifest
	 * @param {Array} manifest The array of files to load
	 * @param {Boolean} loadNow Kick off an immediate load (true) or wait for a load call (false)
	 */
	p.loadManifest = function(manifest, loadNow) {
		var data;

		if (manifest instanceof Array) {
			data = manifest;
		} else if (manifest instanceof Object) {
			data = [manifest];
		}

		//Parse it
		for (var i=0, l=data.length; i<l; i++) {
			this._addItem(data[i]);
		}

		if (loadNow != false) {
			this._loadNext();
		}
	};

	/**
	 * Begin loading the queued items.
	 * @method load
	 */
	p.load = function() {
		this.setPaused(false);
	};

	/**
	 * Get the load result of an item by ID or SRC
	 * @method getResult
	 * @param {String} value The ID or SRC of the loaded item.
	 * @return {Object} The item that was loaded.
	 */
	p.getResult = function(value) {
		return this._loadedItemsById[value] || this._loadedItemsBySrc[value];
	};

	/**
	 * Pause or resume the current load. The active item will not cancel, but the next
	 * items in the queue will not be processed.
	 * @method setPaused
	 * @param {Boolean} value Whether the queue should be paused or not.
	 */
	p.setPaused = function(value) {
		this._paused = value;
		if (!this._paused) {
			this._loadNext();
		}
	};

	/**
	 * Close the active queue.
	 * @method close
	 */
	p.close = function() {
		while (this._currentLoads.length) {
			this._currentLoads.pop().cancel();
		}
		this._currentLoads = [];
		this._scriptOrder = [];
		this._loadedScripts = [];
	};


//Protected Methods
	p._addItem = function(item) {
		var loadItem = this._createLoadItem(item);
		if (loadItem != null) {
			this._loadQueue.push(loadItem);

			this._numItems++;
			this._updateProgress();

			if (loadItem.getItem().type == PreloadJS.JAVASCRIPT) {
				this._scriptOrder.push(loadItem.getItem());
				this._loadedScripts.push(null);
			}
		}
	};

	p._loadNext = function() {
		if (this._paused) { return; }

		//TODO: Test this.
		if (this._loadQueue.length == 0) {
			this._sendComplete();
			if (this.next && this.next.load) {
				//LM: Do we need to apply here?
				this.next.load.apply(this.next);
			}
		}

		while (this._loadQueue.length && this._currentLoads.length < this._maxLoads) {
			var loadItem = this._loadQueue.shift();

			loadItem.onProgress = PreloadJS.proxy(this._handleProgress, this);
			loadItem.onComplete = PreloadJS.proxy(this._handleFileComplete, this);
			loadItem.onError = PreloadJS.proxy(this._handleFileError, this);

			this._currentLoads.push(loadItem);

			loadItem.load();
		}
	};

	p._handleFileError = function(event) {
		var loader = event.target;
		var resultData = this._createResultData(loader.getItem());
		this._numItemsLoaded++;
		this._updateProgress();

		this._sendError(resultData);
		if (!this.stopOnError) {
			this._removeLoadItem(loader);
			this._loadNext();
		}
	};

	p._createResultData = function(item) {
		return {id:item.id, result:null, data:item.data, type:item.type, src:item.src};
	};

	p._handleFileComplete = function(event) {
		this._numItemsLoaded++;

		var loader = event.target;
		var item = loader.getItem();
		this._removeLoadItem(loader);

		var resultData = this._createResultData(item);

		//Convert to proper tag ... if we need to.
		if (loader instanceof PreloadJS.lib.XHRLoader) {
			resultData.result = this._createResult(item, loader.getResult());
		} else {
			resultData.result = item.tag;
		}

		this._loadedItemsById[item.id] = resultData;
		this._loadedItemsBySrc[item.src] = resultData;

		var _this = this;

		//TODO: Move tag creation to XHR?
		switch (item.type) {
			case PreloadJS.IMAGE: //LM: Consider moving this to XHRLoader
				if(loader instanceof PreloadJS.lib.XHRLoader) {
					resultData.result.onload = function(event) {
						_this._handleFileTagComplete(item, resultData);
					}
					return;
				}
				break;
			case PreloadJS.JAVASCRIPT:
				if (this.maintainScriptOrder) {
					this._loadedScripts[this._scriptOrder.indexOf(item)] = item;
					this._checkScriptLoadOrder();
					return;
				}
				break;
		}
		this._handleFileTagComplete(item, resultData);
	};

	p._checkScriptLoadOrder = function () {
		var l = this._loadedScripts.length;

		for (var i=0;i<l;i++) {
			var order = this._loadedScripts[i];
			if (order === null) { break; }
			if (order === true) { continue; }

			var item = this.getResult(order.src);
            var resultData = this._createResultData(item);
            resultData.result = item.result;
			this._handleFileTagComplete(item, resultData);
			this._loadedScripts[i] = true;
			i--;
			l--;
		}
	};

	p._handleFileTagComplete = function(item, resultData) {
		if (item.completeHandler) {
			item.completeHandler(resultData);
		}

		this._updateProgress();
		this._sendFileComplete(resultData);

		this._loadNext();
	};

	p._removeLoadItem = function(loader) {
		var l = this._currentLoads.length;
		for (var i=0;i<l;i++) {
			if (this._currentLoads[i] == loader) {
				this._currentLoads.splice(i,1); break;
			}
		}
	};

	p._createResult = function(item, data) {
		var tag = null;
		var resultData;
		switch (item.type) {
			case PreloadJS.IMAGE:
				tag = this._createImage(); break;
			case PreloadJS.SOUND:
				tag = item.tag || this._createAudio(); break;
			case PreloadJS.CSS:
				tag = this._createLink(); break;
			case PreloadJS.JAVASCRIPT:
				tag = this._createScript(); break;
			case PreloadJS.XML:
				if (window.DOMParser) {
					var parser = new DOMParser();
					data = parser.parseFromString(data, "text/xml");
				} else { // Internet Explorer
					var parser = new ActiveXObject("Microsoft.XMLDOM");
					parser.async = false;
					parser.loadXML(data);
					resultData = parser;
				}
				break;
			case PreloadJS.JSON:
			case PreloadJS.TEXT:
				resultData = data;
		}

		//LM: Might not need to do this with Audio.
		if (tag) {
			if (item.type == PreloadJS.CSS) {
				tag.href = item.src;
			} else {
				tag.src = item.src;
			}
			return tag;
		} else {
			return resultData;
		}
	};

	// This is item progress!
	p._handleProgress = function(event) {
		var loader = event.target;
		var resultData = this._createResultData(loader.getItem());
		resultData.progress = loader.progress;
		this._sendFileProgress(resultData);
		this._updateProgress();
	};

	p._updateProgress = function () {
		var loaded = this._numItemsLoaded / this._numItems; // Fully Loaded
		var dif = 1/this._numItems;
		for (var i=0, l=this._currentLoads.length; i<l; i++) {
			loaded += this._currentLoads[i].progress * dif;
		}
		this._sendProgress({loaded:loaded, total:1});
	}

	p._createLoadItem = function(loadItem) {
		var item = {};

		// Create/modify a load item
		switch(typeof(loadItem)) {
			case "string":
				item.src = loadItem; break;
			case "object":
				if (loadItem instanceof HTMLAudioElement) {
					item.tag = loadItem;
					item.src = item.tag.src;
					item.type = PreloadJS.SOUND;
				} else {
					item = loadItem;
				}
				break;
			default:
				break;
		}

		// Get source extension
		item.ext = this._getNameAfter(item.src, ".");
		if (!item.type) {
			item.type = this.getType(item.ext)
		}
		//If theres no id, set one now.
		if (item.id == null || item.id == "") {
			//item.id = this._getNameAfter(item.src, "/");
            item.id = item.src; //[SB] Using the full src is more robust, and more useful from a user perspective.
		}


		// Give plugins a chance to modify the loadItem
		var customHandler = this.typeHandlers[item.type] || this.extensionHandlers[item.ext];
		if (customHandler) {
			var result = customHandler(item.src, item.type, item.id, item.data);
			//Plugin will handle the load, so just ignore it.
			if (result === false) {
				return null;

			// Load as normal
			} else if (result === true) {
				// Do Nothing
			// Result is a loader class
			} else {
				if (result.src != null) { item.src = result.src; }
				if (result.id != null) { item.id = result.id; }
				if (result.tag != null && result.tag.load instanceof Function) { //Item has what we need load
					item.tag = result.tag;
				}
			}

			// Update the extension in case the type changed
			item.ext = this._getNameAfter(item.src, ".");
		}

		var useXHR2 = this.useXHR;

		// Determine the XHR2 usage overrides
		switch (item.type) {
			case PreloadJS.JSON:
			case PreloadJS.XML:
			case PreloadJS.TEXT:
				useXHR2 = true; // Always use XHR2 with text
				break;
			case PreloadJS.SOUND:
				if (item.ext == "ogg" && PreloadJS.TAG_LOAD_OGGS) {
					useXHR2 = false; // OGGs do not work well with XHR in Firefox.
				}
				break;
		}

		if (useXHR2) {
			return new PreloadJS.lib.XHRLoader(item);
		} else if (!item.tag) {
			var tag;
			var srcAttr = "src";
			var useXHR = false;

			//Create TagItem
			switch(item.type) {
				case PreloadJS.IMAGE:
					tag = this._createImage();
					break;
				case PreloadJS.SOUND:
					tag = this._createAudio();
					break;
				case PreloadJS.CSS:
					srcAttr = "href";
					useXHR = true;
					tag = this._createLink();
					break;
				case PreloadJS.JAVASCRIPT:
					useXHR = true; //We can't properly get onLoad events from <script /> tags.
					tag = this._createScript();
					break;
				default:
			}

			item.tag = tag;
			return new PreloadJS.lib.TagLoader(item, srcAttr, useXHR);

		} else {
			return new PreloadJS.lib.TagLoader(item);
		}
	};

	p.getType = function(ext) {
		switch (ext) {
			case "jpeg":
			case "jpg":
			case "gif":
			case "png":
				return PreloadJS.IMAGE;
			case "ogg":
			case "mp3":
			case "wav":
				return PreloadJS.SOUND;
			case "json":
				return PreloadJS.JSON;
			case "xml":
				return PreloadJS.XML;
			case "css":
				return PreloadJS.CSS;
			case "js":
				return PreloadJS.JAVASCRIPT;
			default:
				return PreloadJS.TEXT;
		}
	};

	p._getNameAfter = function(path, token) {
		var dotIndex = path.lastIndexOf(token);
		var lastPiece = path.substr(dotIndex+1);
		var endIndex = lastPiece.lastIndexOf(/[\b|\?|\#|\s]/);
		return (endIndex == -1) ? lastPiece : lastPiece.substr(0, endIndex);
	};

	p._createImage = function() {
		return document.createElement("img");
	};

	p._createAudio = function () {
		var tag = document.createElement("audio");
		tag.autoplay = false;
		tag.type = "audio/ogg";
		return tag;
	};

	p._createScript = function() {
		var tag = document.createElement("script");
		tag.type = "text/javascript";
		return tag;
	};

	p._createLink = function () {
		var tag = document.createElement("link");
		tag.type = "text/css";
		tag.rel  = "stylesheet";
		return tag;
	};

	p.toString = function() {
		return "[PreloadJS]";
	};

// Static methods
	/**
	 * Public proxy for SoundJS methods.
	 * @method proxy
	 * @param {Function} method The method name to call
	 * @param {Object} scope The scope to call the method name on
	 * @static
	 */
	s.proxy = function(method, scope) {
		return function(event) {
			return method.apply(scope, arguments);
		};
	}

	/**
	 * Debug function wraps console to prevent issues.
	 * @method log
	 * @static
	 */
	s.log = function() {
        //var log = Function.prototype.bind.call(console.log, console);
        //log.apply(console, arguments);
	}


	PreloadJS.lib = {};

	window.PreloadJS = PreloadJS;

}(window));

