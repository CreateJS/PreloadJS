/*
* PreloadJS
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
 * PreloadJS provides a consistent way to preload content for use in HTML applications. Preloading can be done using
 * HTML tags, as well as XHR.
 *
 * By default, PreloadJS will try and load content using XHR, since it provides better support for progress and
 * completion events, <b>however due to cross-domain issues, it may still be preferable to use tag-based loading
 * instead</b>. Note that some content requires XHR to work (plain text, web audio), and some requires tags (HTML audio).
 * Note this is handled automatically where possible.
 *
 * PreloadJS currently supports all modern browsers, and we have done our best to include support for most older
 * browsers. If you find an issue with any specific OS/browser combination, please visit http://community.createjs.com/
 * and report it.
 *
 * <h4>Getting Started</h4>
 * To get started, check out the {{#crossLink "LoadQueue"}}{{/crossLink}} class, which includes a quick overview of how
 * to load files and process results.
 *
 * <h4>Example</h4>
 *      var queue = new createjs.LoadQueue();
 *      queue.installPlugin(createjs.Sound);
 *      queue.addEventListener("complete", handleComplete);
 *      queue.loadFile({id:"sound", src:"http://path/to/sound.mp3"});
 *      queue.loadManifest([
 *          {id: "myImage", src:"path/to/myImage.jpg"}
 *      ]);
 *      function handleComplete() {
 *          createjs.Sound.play("sound");
 *          var image = queue.getResult("myImage");
 *          document.body.appendChild(image);
 *      }
 *
 * <b>Important note on plugins:</b> Plugins must be installed <i>before</i> items are added to the queue, otherwise
 * they will not be processed, even if the load has not actually kicked off yet. Plugin functionality is handled when
 * the items are added to the LoadQueue.
 *
 * @module PreloadJS
 * @main PreloadJS
 */

// namespace:
this.createjs = this.createjs||{};

//TODO: JSONP support?
//TODO: addHeadTags support

/*
TODO: WINDOWS ISSUES
	* No error for HTML audio in IE 678
	* SVG no failure error in IE 67 (maybe 8) TAGS AND XHR
	* No script complete handler in IE 67 TAGS (XHR is fine)
	* No XML/JSON in IE6 TAGS
	* Need to hide loading SVG in Opera TAGS
	* No CSS onload/readystatechange in Safari or Android TAGS (requires rule checking)
	* SVG no load or failure in Opera XHR
	*
 */

(function() {

	/**
	 * The LoadQueue class is the main API for preloading content. LoadQueue is a load manager, which maintains
	 * a single file, or a queue of files.
	 *
	 * <b>Creating a Queue</b><br />
	 * To use LoadQueue, create a LoadQueue instance. If you want to force tag loading where possible, set the useXHR
	 * argument to false.
	 *
	 *      var queue = new createjs.LoadQueue(true);
	 *
	 * <b>Listening for Events</b><br />
	 * Add any listeners you want to the queue. Since PreloadJS 0.3.0, the {{#crossLink "EventDispatcher"}}{{/crossLink}}
	 * lets you add as many listeners as you want for events. You can subscribe to complete, error, fileload, progress,
	 * and fileprogress.
	 *
	 *      queue.addEventListener("fileload", handleFileLoad);
	 *      queue.addEventListener("complete", handleComplete);
	 *
	 * <b>Adding files and manifests</b><br />
	 * Add files you want to load using {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}} or add multiple files at a
	 * time using {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}}. Files are appended to the queue, so you can use
	 * these methods as many times as you like, whenever you like.
	 *
	 *      queue.loadFile("filePath/file.jpg");
	 *      queue.loadFile({id:"image", src:"filePath/file.jpg"});
	 *      queue.loadManifest(["filePath/file.jpg", {id:"image", src:"filePath/file.jpg"}];
	 *
	 * If you pass <code>false</code> as the second parameter, the queue will not immediately load the files (unless it
	 * has already been started). Call the {{#crossLink "AbstractLoader/load"}}{{/crossLink}} method to begin a paused queue.
	 * Note that a paused queue will automatically resume when new files are added to it.
	 *
	 *      queue.load();
	 *
	 * <b>Handling Results</b><br />
	 * When a file is finished downloading, a "fileload" event is dispatched. In an example above, there is an event
	 * listener snippet for fileload. Loaded files are always an object that can be used immediately, including:
	 * <ul>
	  *     <li>Image: An &lt;img /&gt; tag</li>
	  *     <li>Audio: An &lt;audio /&gt; tag</a>
	  *     <li>JavaScript: A &lt;script /&gt; tag</li>
	  *     <li>CSS: A &lt;link /&gt; tag</li>
	  *     <li>XML: An XML DOM node</li>
	  *     <li>SVG: An &lt;object /&gt; tag</li>
	  *     <li>JSON: A formatted JavaScript Object</li>
	  *     <li>Text: Raw text</li>
	  *     <li>Binary: The binary loaded result</li>
	  * </ul>
	 *
	 *      function handleFileLoad(event) {
	 *          var item = event.item; // A reference to the item that was passed in
	 *          var type = item.type;
	 *
	 *          // Add any images to the page body.
	 *          if (type == createjs.LoadQueue.IMAGE) {
	 *              document.body.appendChild(event.result);
	 *          }
	 *      }
	 *
	 * At any time after the file has been loaded (usually after the queue has completed), any result can be looked up
	 * via its "id" using {{#crossLink "LoadQueue/getResult"}}{{/crossLink}}. If no id was provided, then the "src" or
	 * file path can be used instead. It is recommended to always pass an id.
	 *
	 *      var image = queue.getResult("image");
	 *      document.body.appendChild(image);
	 *
	 * Raw loaded content can be accessed using the <code>rawResult</code> property of the <code>fileload</code> event,
	 * or can be looked up using {{#crossLink "LoadQueue/getResult"}}{{/crossLink}}, and <code>true</code> as the 2nd
	 * parameter. This is only applicable for content that has been parsed for the browser, specifically, JavaScript,
	 * CSS, XML, SVG, and JSON objects.
	 *
	 *      var image = queue.getResult("image", true);
	 *
	 * <b>Plugins</b><br />
	 * LoadQueue has a simple plugin architecture to help process and preload content. For example, to preload audio,
	 * make sure to install the <a href="http://soundjs.com">SoundJS</a> Sound class, which will help preload HTML
	 * audio, Flash audio, and WebAudio files. This should be installed <b>before</b> loading any audio files.
	 *
	 *      queue.installPlugin(createjs.Sound);
	 *
	 * <h4>Known Browser Issues</h4>
	 * <ul><li>Browsers without audio support can not load audio files.</li>
	 *      <li>Audio tags will only download until their <code>canPlayThrough</code> event is fired. Browsers other
	 *      than Chrome will continue to download in the background.</li>
	 *      <li>When loading scripts using tags, they are automatically added to the document.</li>
	 *      <li>Scripts loaded via XHR may not be properly inspectable with browser tools.</li>
	 *      <li>IE6 and IE7 (and some other browsers) may not be able to load XML, Text, or JSON, since they require
	 *      XHR to work.</li>
	 *      <li>Content loaded via tags will not show progress, and although they can be canceled, they will continue
	 *      to download in the background.</li>
	 * </ul>
	 *
	 * @class LoadQueue
	 * @param {Boolean} [useXHR=true] Determines whether the preload instance will favor loading with XHR (XML HTTP Requests),
	 * or HTML tags. When this is <code>false</code>, LoadQueue will use tag loading when possible, and fall back on XHR
	 * when necessary.
	 * @constructor
	 * @extends AbstractLoader
	 */
	var LoadQueue = function(useXHR) {
		this.init(useXHR);
	};

	var p = LoadQueue.prototype = new createjs.AbstractLoader();
	var s = LoadQueue;

	/**
	 * Time in milliseconds to assume a load has failed.
	 * @property LOAD_TIMEOUT
	 * @type {Number}
	 * @default 8000
	 * @static
	 */
	s.LOAD_TIMEOUT = 8000;

// Preload Types
	/**
	 * The preload type for generic binary types. Note that images and sound files are treated as binary.
	 * @property BINARY
	 * @type {String}
	 * @default binary
	 * @static
	 */
	s.BINARY = "binary";

	/**
	 * The preload type for css files. CSS files are loaded into a LINK or STYLE tag (depending on the load type)
	 * @property CSS
	 * @type {String}
	 * @default css
	 * @static
	 */
	s.CSS = "css";

	/**
	 * The preload type for image files, usually png, gif, or jpg/jpeg. Images are loaded into an IMAGE tag.
	 * @property IMAGE
	 * @type {String}
	 * @default image
	 * @static
	 */
	s.IMAGE = "image";

	/**
	 * The preload type for javascript files, usually with the "js" file extension. JavaScript files are loaded into a
	 * SCRIPT tag.
	 * @property JAVASCRIPT
	 * @type {String}
	 * @default javascript
	 * @static
	 */
	s.JAVASCRIPT = "javascript";

	/**
	 * The preload type for json files, usually with the "json" file extension. JSON data is loaded and parsed into a
	 * JavaScript object.
	 * @property JSON
	 * @type {String}
	 * @default json
	 * @static
	 */
	s.JSON = "json";

	/**
	 * The preload type for sound files, usually mp3, ogg, or wav. Audio is loaded into an AUDIO tag.
	 * @property SOUND
	 * @type {String}
	 * @default sound
	 * @static
	 */
	s.SOUND = "sound";

	/**
     * The preload type for SVG files.
	 * @property SVG
	 * @type {String}
	 * @default svg
	 * @static
	 */
	s.SVG = "svg";

	/**
	 * The preload type for text files, which is also the default file type if the type can not be determined. Text is
	 * loaded as raw text.
	 * @property TEXT
	 * @type {String}
	 * @default text
	 * @static
	 */
	s.TEXT = "text";

	/**
	 * The preload type for xml files. XML is loaded into an XML document.
	 * @property XML
	 * @type {String}
	 * @default xml
	 * @static
	 */
	s.XML = "xml";


// Prototype
	/**
	 * Use XMLHttpRequest (XHR) when possible. Note that LoadQueue will default to tag loading or XHR loading depending
	 * on the requirements for a media type. For example, HTML audio can not be loaded with XHR, and WebAudio can not be
	 * loaded with tags, so it will default the the correct type instead of using the user-defined type.
	 *
	 * <b>Note: This property is read-only.</b> To change it, please use the {{#crossLink "LoadQueue/setUseXHR"}}{{/crossLink}}
	 * method.
	 * @property useXHR
	 * @type {Boolean}
	 * @readOnly
	 * @default true
	 */
	p.useXHR = true;

	/**
	 * Does LoadQueue stop processing the current queue when an error is encountered.
	 * @property stopOnError
	 * @type {Boolean}
	 * @default false
	 */
	p.stopOnError = false;

	/**
	 * Ensure loaded scripts "complete" in the order they are specified. Note that scripts loaded via tags will only
	 * load one at a time, and will be added to the document when they are loaded.
	 * @property maintainScriptOrder
	 * @type {Boolean}
	 * @default true
	 */
	p.maintainScriptOrder = true;

	/*
	 * LM: Not Implemented.
	 * Automatically add tags to the HEAD of the document when they are loaded. Note that when loading JavaScript
	 * using a tag-based approach (<code>useXHR=false</code>), tags are automatically added to the HEAD in order to
	 * load them.
	 * @property addHeadTags
	 * @type {Boolean}
	 * @default trues
	 */
	//p.addHeadTags = true;

	/**
	 * The next preload queue to process when this one is complete. If an error is thrown in the current queue, and
	 * <code>loadQueue.stopOnError</code> is <code>true</code>, the next queue will not be processed.
	 * @property next
	 * @type {LoadQueue}
	 * @default null
	 */
	p.next = null;

// Events
	/**
	 * This event is fired when an individual file has loaded, and been processed.
	 * @event fileload
	 * @param {Object} target The object that dispatched the event.
	 * @param {String} type The event type.
	 * @param {Object} item The file item which was specified in the {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}}
	 * or {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}} call. If only a string path or tag was specified, the
	 * object will contain that value as a property.
	 * @param {Object} result The HTML tag or parsed result of the loaded item.
	 * @param {Object} rawResult The unprocessed result, usually the raw text or binary data before it is converted
	 * to a usable object.
	 * @since 0.3.0
	 */

	/**
	 * This event is fired when an an individual file progress changes.
	 * @event fileprogress
	 * @param {Object} The object that dispatched the event.
	 * @param {String} type The event type.
	 * @param {Object} item The file item which was specified in the {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}}
	 * or {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}} call. If only a string path or tag was specified, the
	 * object will contain that value as a property.
	 * @param {Number} loaded The number of bytes that have been loaded. Note that this may just be a percentage of 1.
	 * @param {Number} total The total number of bytes. If it is unknown, the value is 1.
	 * @param {Number} percent The percentage that has been loaded. This will be a number between 0 and 1.
	 * @since 0.3.0
	 */

// Callbacks (deprecated)
	/**
	 * The callback that is fired when an individual file is loaded.
	 * @property onFileLoad
	 * @type {Function}
	 * @deprecated In favour of the "fileload" event. Will be removed in a future version.
	 */
	p.onFileLoad = null;

	/**
	 * The callback that is fired when an individual files progress changes.
	 * @property onFileProgress
	 * @type {Function}
	 * @deprecated In favour of the "fileprogress" event. Will be removed in a future version.
	 */
	p.onFileProgress = null;


// Protected
	/**
	 * An object hash of callbacks that are fired for each file type before the file is loaded, giving plugins the
	 * ability to override properties of the load. Please see the {{#crossLink "LoadQueue/installPlugin"}}{{/crossLink}}
	 * method for more information.
	 * @property _typeCallbacks
	 * @type {Object}
	 * @private
	 */
	p._typeCallbacks = null;

	/**
	 * An object hash of callbacks that are fired for each file extension before the file is loaded, giving plugins the
	 * ability to override properties of the load. Please see the {{#crossLink "LoadQueue/installPlugin"}}{{/crossLink}}
	 * method for more information.
	 * @property _extensionCallbacks
	 * @type {null}
	 * @private
	 */
	p._extensionCallbacks = null;

	/**
	 * Determines if the loadStart event was dispatched already. This event is only fired one time, when the first
	 * file is requested.
	 * @property _loadStartWasDispatched
	 * @type {Boolean}
	 * @default false
	 * @private
	 */
	p._loadStartWasDispatched = false;

	/**
	 * The number of maximum open connections that a loadQueue tries to maintain. Please see
	 * {{#crossLink "LoadQueue/setMaxConnections"}}{{/crossLink}} for more information.
	 * @property _maxConnections
	 * @type {Number}
	 * @default 1
	 * @private
	 */
	p._maxConnections = 1;

	/**
	 * Determines if there is currently a script loading. This helps ensure that only a single script loads at once when
	 * using a script tag to do preloading.
	 * @property _currentlyLoadingScript
	 * @type {Boolean}
	 * @private
	 */
	p._currentlyLoadingScript = null;

	/**
	 * An array containing the currently downloading files.
	 * @property _currentLoads
	 * @type {Array}
	 * @private
	 */
	p._currentLoads = null;

	/**
	 * An array containing the queued items that have not yet started downloading.
	 * @property _loadQueue
	 * @type {Array}
	 * @private
	 */
	p._loadQueue = null;

	/**
	 * An array containing downloads that have not completed, so that the LoadQueue can be properly reset.
	 * @property _loadQueueBackup
	 * @type {Array}
	 * @private
	 */
	p._loadQueueBackup = null;

	/**
	 * An object hash of items that have finished downloading, indexed by item IDs.
	 * @property _loadItemsById
	 * @type {Object}
	 * @private
	 */
	p._loadItemsById = null;

	/**
	 * An object hash of items that have finished downloading, indexed by item source.
	 * @property _loadItemsBySrc
	 * @type {Object}
	 * @private
	 */
	p._loadItemsBySrc = null;

	/**
	 * An object hash of loaded items, indexed by the ID of the load item.
	 * @property _loadedResults
	 * @type {Object}
	 * @private
	 */
	p._loadedResults = null;

	/**
	 * An object hash of un-parsed loaded items, indexed by the ID of the load item.
	 * @property _loadedRawResults
	 * @type {Object}
	 * @private
	 */
	p._loadedRawResults = null;

	/**
	 * The number of items that have been requested. This helps manage an overall progress without knowing how large
	 * the files are before they are downloaded.
	 * @property _numItems
	 * @type {Number}
	 * @default 0
	 * @private
	 */
	p._numItems = 0;

	/**
	 * The number of items that have completed loaded. This helps manage an overall progress without knowing how large
	 * the files are before they are downloaded.
	 * @property _numItemsLoaded
	 * @type {Number}
	 * @default 0
	 * @private
	 */
	p._numItemsLoaded = 0;

	/**
	 * A list of scripts in the order they were requested. This helps ensure that scripts are "completed" in the right
	 * order.
	 * @property _scriptOrder
	 * @type {Array}
	 * @private
	 */
	p._scriptOrder = null;

	/**
	 * A list of scripts that have been loaded. Items are added to this list as <code>null</code> when they are
	 * requested, contain the loaded item if it has completed, but not been dispatched to the user, and <code>true</true>
	 * once they are complete and have been dispatched.
	 * @property _loadedScripts
	 * @type {Array}
	 * @private
	 */
	p._loadedScripts = null;

	// Overrides abstract method in AbstractLoader
	p.init = function(useXHR) {
		this._numItems = this._numItemsLoaded = 0;
		this._paused = false;
		this._loadStartWasDispatched = false;

		this._currentLoads = [];
		this._loadQueue = [];
		this._loadQueueBackup = [];
		this._scriptOrder = [];
		this._loadedScripts = [];
		this._loadItemsById = {};
		this._loadItemsBySrc = {};
		this._loadedResults = {};
		this._loadedRawResults = {};

		// Callbacks for plugins
		this._typeCallbacks = {};
		this._extensionCallbacks = {};

		this.setUseXHR(useXHR);
	};

	/**
	 * Change the usXHR value. Note that if this is set to true, it may fail depending on the browser's capabilities.
	 * @method setUseXHR
	 * @param {Boolean} value The new useXHR value to set.
	 * @return {Boolean} The new useXHR value. If XHR is not supported by the browser, this will return false, even if
	 * the provided value argument was true.
	 * @since 0.3.0
	 */
	p.setUseXHR = function(value) {
		// Determine if we can use XHR. XHR defaults to TRUE, but the browser may not support it.
		//TODO: Should we be checking for the other XHR types? Might have to do a try/catch on the different types similar to createXHR.
		this.useXHR = (value != false && window.XMLHttpRequest != null);
		return this.useXHR;
	};

	/**
	 * Stops all queued and loading items, and clears the queue. This also removes all internal references to loaded
	 * content, and allows the queue to be used again. Items that have not yet started can be kicked off again using
	 * the {{#crossLink "AbstractLoader/load"}}{{/crossLink}} method.
	 * @method removeAll
	 * @since 0.3.0
	 */
	p.removeAll = function() {
		this.remove();
	};

	/**
	 * Stops an item from being loaded, and removes it from the queue. If nothing is passed, all items are removed.
	 * This also removes internal references to loaded item(s).
	 * @method remove
	 * @param {String | Array} idsOrUrls The id or ids to remove from this queue. You can pass an item, an array of
	 * items, or multiple items as arguments.
	 * @since 0.3.0
	 */
	p.remove = function(idsOrUrls) {
		var args = null;

		if (idsOrUrls && !(idsOrUrls instanceof Array)) {
			args = [idsOrUrls];
		} else if (idsOrUrls) {
			args = idsOrUrls;
		}

		var itemsWereRemoved = false;

		// Destroy everything
		if (!args) {
			this.close();

			for (var n in this._loadItemsById) {
				this._disposeItem(this._loadItemsById[n]);
			}

			this.init(this.useXHR);

		// Remove specific items
		} else {
			while (args.length) {
				var item = args.pop();
				var r = this.getResult(item);

				//Remove from the main load Queue
				for (i = this._loadQueue.length-1;i>=0;i--) {
					loadItem = this._loadQueue[i].getItem();
					if (loadItem.id == item || loadItem.src == item) {
						this._loadQueue.splice(i,1)[0].cancel();
						break;
					}
				}

				//Remove from the backup queue
				for (i = this._loadQueueBackup.length-1;i>=0;i--) {
					loadItem = this._loadQueueBackup[i].getItem();
					if (loadItem.id == item || loadItem.src == item) {
						this._loadQueueBackup.splice(i,1)[0].cancel();
						break;
					}
				}

				if (r) {
					delete this._loadItemsById[r.id];
					delete this._loadItemsBySrc[r.src];
					this._disposeItem(r);
				} else {
					for (var i=this._currentLoads.length-1;i>=0;i--) {
						var loadItem = this._currentLoads[i].getItem();
						if (loadItem.id == item || loadItem.src == item) {
							this._currentLoads.splice(i,1)[0].cancel();
							itemsWereRemoved = true;
							break;
						}
					}
				}
			}

			// If this was called during a load, try to load the next item.
			if (itemsWereRemoved) {
				this._loadNext();
			}
		}
	};

	/**
	 * Stops all open loads, destroys any loaded items, and resets the queue, so all items can
	 * be reloaded again by calling {{#crossLink "AbstractLoader/load"}}{{/crossLink}}. Items are not removed from the
	 * queue. To remove items use the {{#crossLink "LoadQueue/remove"}}{{/crossLink}} or
	 * {{#crossLink "LoadQueue/removeAll"}}{{/crossLink}} method.
	 * @method reset
	 * @since 0.3.0
	 */
	p.reset = function() {
		this.close();
		for (var n in this._loadItemsById) {
			this._disposeItem(this._loadItemsById[n]);
		}

		//Reset the queue to its start state
		var a = [];
		for (i=0,l=this._loadQueueBackup.length;i<l;i++) {
			a.push(this._loadQueueBackup[i].getItem());
		}

		this.loadManifest(a, false);
	};

	/**
	 * Determine if a specific type should be loaded as a binary file. Currently, only images and items marked
	 * specifically as "binary" are loaded as binary. Note that audio is <b>not</b> a binary type, as we can not play
	 * back using an audio tag if it is loaded as binary. Plugins can change the item type to binary to ensure they get
	 * a binary result to work with. Binary files are loaded using XHR2.
	 * @method isBinary
	 * @param {String} type The item type.
	 * @return If the specified type is binary.
	 * @private
	 */
	s.isBinary = function(type) {
		switch (type) {
			case createjs.LoadQueue.IMAGE:
			case createjs.LoadQueue.BINARY:
				return true;
			default:
				return false;
		}
	};

	/**
	 * Register a plugin. Plugins can map to both load types (sound, image, etc), or can map to specific extensions
	 * (png, mp3, etc). Currently, only one plugin can exist per type/extension. Plugins must return an object containing:
	 *  <ul><li>callback: The function to call</li>
	 *      <li>types: An array of types to handle</li>
	 *      <li>extensions: An array of extensions to handle. This only fires if an applicable type handler has not fired.</li></ul>
	 * Note that even though a plugin might match both a type and extension handler, the type handler takes priority and
     * is the only one that gets fired.  For example if you have a handler for type=sound, and a handler for extension=mp3,
     * only the type handler would fire when an mp3 file is loaded.
	 * @method installPlugin
	 * @param {Function} plugin The plugin to install
	 */
	p.installPlugin = function(plugin) {
		if (plugin == null || plugin.getPreloadHandlers == null) { return; }
		var map = plugin.getPreloadHandlers();
		if (map.types != null) {
			for (var i=0, l=map.types.length; i<l; i++) {
				this._typeCallbacks[map.types[i]] = map.callback;
			}
		}
		if (map.extensions != null) {
			for (i=0, l=map.extensions.length; i<l; i++) {
				this._extensionCallbacks[map.extensions[i]] = map.callback;
			}
		}
	};

	/**
	 * Set the maximum number of concurrent connections. Note that browsers and servers may have a built-in maximum
	 * number of open connections, so any additional connections may remain in a pending state until the browser
	 * opens the connection. Note that when loading scripts using tags, with <code>maintainScriptOrder=true</code>, only
	 * one script is loaded at a time due to browser limitations.
	 * @method setMaxConnections
	 * @param {Number} value The number of concurrent loads to allow. By default, only a single connection per LoadQueue
	 * is open at any time.
	 */
	p.setMaxConnections = function (value) {
		this._maxConnections = value;
		if (!this._paused) {
			this._loadNext();
		}
	}

	/**
	 * Load a single file. To add multiple files at once, use the {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}}
	 * method.
	 *
	 * Note that files are always appended to the current queue, so this method can be used multiple times to add files.
	 * To clear the queue first, use the {{#crossLink "AbstractLoader/close"}}{{/crossLink}} method.
	 * @method loadFile
	 * @param {Object | String} file The file object or path to load. A file can be either
     * <ol>
     *     <li>a path to a resource (string). Note that this kind of load item will be
     *     converted to an object (see below) in the background.</li>
     *     <li>OR an object that contains:<ul>
     *         <li>src: The source of the file that is being loaded. This property is <b>required</b>. The source can
	 *         either be a string (recommended), or an HTML tag.</li>
     *         <li>type: The type of file that will be loaded (image, sound, json, etc). PreloadJS does auto-detection
	 *         of types using the extension. Supported types are defined on LoadQueue, such as <code>LoadQueue.IMAGE</code>.
	 *         It is recommended that a type is specified when a non-standard file URI (such as a php script) us used.</li>
     *         <li>id: A string indentifier which can be used to reference the loaded object.</li>
     *         <li>data: An arbitrary data object, which is included with the loaded object</li>
     *     </ul>
     * </ol>
	 * @param {Boolean} [loadNow=true] Kick off an immediate load (true) or wait for a load call (false). The default
	 * value is true. If the queue is paused using {{#crossLink "LoadQueue/setPaused"}}{{/crossLink}}, and the value is
	 * true, the queue will resume automatically.
	 */
	p.loadFile = function(file, loadNow) {
		if (file == null) {
			this._sendError({text: "PRELOAD_NO_FILE"});
			return;
		}
		this._addItem(file);

		if (loadNow !== false) {
			this.setPaused(false);
		}
	}

	/**
	 * Load an array of items. To load a single file, use the {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}} method.
	 * The files in the manifest are requested in the same order, but may complete in a different order if the max
	 * connections are set above 1 using {{#crossLink "LoadQueue/setMaxConnections"}}{{/crossLink}}. Scripts will load
	 * in the right order as long as <code>loadQueue.maintainScriptOrder</code> is true (which is default).
	 *
	 * Note that files are always appended to the current queue, so this method can be used multiple times to add files.
	 * To clear the queue first, use the {{#crossLink "AbstractLoader/close"}}{{/crossLink}} method.
	 * @method loadManifest
	 * @param {Array} manifest The list of files to load. Each file can be either:
	 * <ol>
	 *     <li>a path to a resource (string). Note that this kind of load item will be
	 *      converted to an object (see below) in the background.</li>
	 *     <li>OR an object that contains:<ul>
	 *         <li>src: The source of the file that is being loaded. This property is <b>required</b>.
	 *         The source can either be a string (recommended), or an HTML tag. </li>
	 *         <li>type: The type of file that will be loaded (image, sound, json, etc). PreloadJS does auto-detection
	 *         of types using the extension. Supported types are defined on LoadQueue, such as <code>LoadQueue.IMAGE</code>.
	 *         It is recommended that a type is specified when a non-standard file URI (such as a php script) us used.</li>
	 *         <li>id: A string identifier which can be used to reference the loaded object.</li>
	 *         <li>data: An arbitrary data object, which is returned with the loaded object</li>
	 *     </ul>
	 * </ol>
	 * @param {Boolean} [loadNow=true] Kick off an immediate load (true) or wait for a load call (false). The default
	 * value is true. If the queue is paused using {{#crossLink "LoadQueue/setPaused"}}{{/crossLink}} and this value is
	 * true, the queue will resume automatically.
	 */
	p.loadManifest = function(manifest, loadNow) {
		var data = null;

		if (manifest instanceof Array) {
			if (manifest.length == 0) {
				this._sendError({text: "PRELOAD_MANIFEST_EMPTY"});
				return;
			}
			data = manifest;
		} else {
			if (manifest == null) {
				this._sendError({text: "PRELOAD_MANIFEST_NULL"});
				return;
			}
			data = [manifest];
		}

		for (var i=0, l=data.length; i<l; i++) {
			this._addItem(data[i]);
		}

		if (loadNow !== false) {
			this.setPaused(false);
		}
	};

	// Overrides abstract method in AbstractLoader
	p.load = function() {
		this.setPaused(false);
	};

	/**
	 * Look up a load item using either the "id" or "src" that was specified when loading it.
	 * @method getItem
	 * @param {String} value The <code>id</code> or <code>src</code> of the load item.
	 * @return {Object} The load item that was initially requested using {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}}
	 * or {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}}. This object is also returned via the "fileload" event
	 * as the "item" parameter.
	 */
	p.getItem = function(value) {
		return this._loadItemsById[value] || this._loadItemsBySrc[value];
	};

	/**
	 * Look up a loaded result using either the "id" or "src" that was specified when loading it.
	 * @method getResult
	 * @param {String} value The <code>id</code> or <code>src</code> of the load item.
	 * @param {Boolean} [rawResult=false] Return a raw result instead of a formatted result. This applies to content
	 * loaded via XHR such as scripts, XML, CSS, and Images. If there is no raw result, the formatted result will be
	 * returned instead.
	 * @return {Object} A result object containing the content that was loaded, such as:
     * <ul>
	 *      <li>An image tag (&lt;image /&gt;) for images</li>
	 *      <li>A script tag for JavaScript (&lt;script /&gt;). Note that scripts loaded with tags may be added to the
	 *      HTML head.</li>
	 *      <li>A style tag for CSS (&lt;style /&gt;)</li>
	 *      <li>Raw text for TEXT</li>
	 *      <li>A formatted JavaScript object defined by JSON</li>
	 *      <li>An XML document</li>
	 *      <li>An binary arraybuffer loaded by XHR</li>
	 *      <li>An audio tag (&lt;audio &gt;) for HTML audio. Note that it is recommended to use SoundJS APIs to play
	 *      loaded audio. Specifically, audio loaded by Flash and WebAudio will return a loader object using this method
	 *      which can not be used to play audio back.</li>
	 * </ul>
     * This object is also returned via the "fileload" event as the "item" parameter. Note that if a raw result is
	 * requested, but not found, the result will be returned instead.
	 */
	p.getResult = function(value, rawResult) {
		var item = this._loadItemsById[value] || this._loadItemsBySrc[value];
		if (item == null) { return null; }
		var id = item.id;
		if (rawResult && this._loadedRawResults[id]) {
			return this._loadedRawResults[id];
		}
		return this._loadedResults[id];
	};

	/**
	 * Pause or resume the current load. Active loads will not be cancelled, but the next items in the queue will not
	 * be processed when active loads complete. LoadQueues are not paused by default.
	 * @method setPaused
	 * @param {Boolean} value Whether the queue should be paused or not.
	 */
	p.setPaused = function(value) {
		this._paused = value;
		if (!this._paused) {
			this._loadNext();
		}
	};

	// Overrides abstract method in AbstractLoader
	p.close = function() {
		while (this._currentLoads.length) {
			this._currentLoads.pop().cancel();
		}
		this._scriptOrder.length = 0;
		this._loadedScripts.length = 0;
		this.loadStartWasDispatched = false;
	};


//Protected Methods
	/**
	 * Add an item to the queue. Items are formatted into a usable object containing all the properties necessary to
	 * load the content. The load queue is populated with the loader instance that handles preloading, and not the load
	 * item that was passed in by the user. To look up the load item by id or src, use the {{#crossLink "LoadQueue.getItem"}}{{/crossLink}}
	 * method.
	 * @method _addItem
	 * @param {String|Object} value The item to add to the queue.
	 * @private
	 */
	p._addItem = function(value) {
		var item = this._createLoadItem(value);
		if (item == null) { return; } // Sometimes plugins or types should be skipped.
		var loader = this._createLoader(item);
		if (loader != null) {
			this._loadQueue.push(loader);
			this._loadQueueBackup.push(loader);

			this._numItems++;
			this._updateProgress();

			// Only worry about script order when using XHR to load scripts. Tags are only loading one at a time.
			if (this.maintainScriptOrder
					&& item.type == createjs.LoadQueue.JAVASCRIPT
					&& loader instanceof createjs.XHRLoader) {
				this._scriptOrder.push(item);
				this._loadedScripts.push(null);
			}
		}
	};

	/**
	 * Create a refined load item, which contains all the required properties (src, type, extension, tag). The type of
	 * item is determined by browser support, requirements based on the file type, and developer settings. For example,
	 * XHR is only used for file types that support it in new browsers.
	 *
	 * Before the item is returned, any plugins registered to handle the type or extension will be fired, which may
	 * alter the load item.
	 * @method _createLoadItem
	 * @param {String | Object | HTMLAudioElement | HTMLImageElement} value The item that needs to be preloaded.
	 * @return {Object} The loader instance that will be used.
	 * @private
	 */
	p._createLoadItem = function(value) {
		var item = null;

		// Create/modify a load item
		switch(typeof(value)) {
			case "string":
				item = {
					src: value
				}; break;
			case "object":
				if (window.HTMLAudioElement && value instanceof HTMLAudioElement) {
					item = {
						tag: value,
						src: item.tag.src,
						type: createjs.LoadQueue.SOUND
					};
				} else {
					item = value;
				}
				break;
			default:
				break;
		}

		var match = this._parseURI(item.src);
		if (match != null) { item.ext = match[5]; }
		if (item.type == null) {
			item.type = this._getTypeByExtension(item.ext);
		}

		// Create a tag for the item. This ensures there is something to either load with or populate when finished.
		if (item.tag == null) {
			item.tag = this._createTag(item.type);
		}

		// If there's no id, set one now.
		if (item.id == null || item.id == "") {
            item.id = item.src;
		}

		// Give plugins a chance to modify the loadItem:
		var customHandler = this._typeCallbacks[item.type] || this._extensionCallbacks[item.ext];
		if (customHandler) {
			var result = customHandler(item.src, item.type, item.id, item.data);
			//Plugin will handle the load, so just ignore it.
			if (result === false) {
				return null;

			// Load as normal:
			} else if (result === true) {
				// Do Nothing

			// Result is a loader class:
			} else {
				if (result.src != null) { item.src = result.src; }
				if (result.id != null) { item.id = result.id; }
				if (result.tag != null && result.tag.load instanceof Function) { //Item has what we need load
					item.tag = result.tag;
				}
                if (result.completeHandler != null) {item.completeHandler = result.completeHandler;}  // we have to call back this function when we are done loading
			}

			// Allow type overriding:
			if (result.type) { item.type = result.type; }

			// Update the extension in case the type changed:
			match = this._parseURI(item.src);
			if (match != null) { item.ext = match[5]; }
		}

		// Store the item for lookup. This also helps clean-up later.
		this._loadItemsById[item.id] = item;
		this._loadItemsBySrc[item.src] = item;

		return item;
	};

	/**
	 * Create a loader for a load item.
	 * @method _createLoader
	 * @param {Object} item A formatted load item that can be used to generate a loader.
	 * @return {AbstractLoader} A loader that can be used to load content.
	 * @private
	 */
	p._createLoader = function(item) {
		// Initially, try and use the provided/supported XHR mode:
		var useXHR = this.useXHR;

		// Determine the XHR usage overrides:
		switch (item.type) {
			case createjs.LoadQueue.JSON:
			case createjs.LoadQueue.XML:
			case createjs.LoadQueue.TEXT:
				useXHR = true; // Always use XHR2 with text/XML
				break;
			case createjs.LoadQueue.SOUND:
				useXHR = false; // Never load audio using XHR. WebAudio will provide its own loader.
				break;
			// Note: IMAGE, CSS, SCRIPT, SVG can all use TAGS or XHR.
		}

		if (useXHR) {
			return new createjs.XHRLoader(item);
		} else {
			return new createjs.TagLoader(item);
		}
	};


	/**
	 * Load the next item in the queue. If the queue is empty (all items have been loaded), then the complete event
	 * is processed. The queue will "fill up" any empty slots, up to the max connection specified using
	 * {{#crossLink "LoadQueue.setMaxConnections"}}{{/crossLink}} method. The only exception is scripts that are loaded
	 * using tags, which have to be loaded one at a time to maintain load order.
	 * @method _loadNext
	 * @private
	 */
	p._loadNext = function() {
		if (this._paused) { return; }

		// Only dispatch loadStart event when the first file is loaded.
		if (!this._loadStartWasDispatched) {
			this._sendLoadStart();
			this._loadStartWasDispatched = true;
		}

		if (this._numItems == this._numItemsLoaded) {
			this.loaded = true;
			this._sendComplete();
			if (this.next && this.next.load) {
				this.next.load();
				//TODO: Test. This was changed from a load.apply
			}
		}

		// Must iterate forwards to load in the right order.
		for (var i=0, l=this._loadQueue.length; i<l; i++) {
			if (this._currentLoads.length >= this._maxConnections) { break; }
			var loader = this._loadQueue[i];

			// Determine if we should be only loading one at a time:
			if (this.maintainScriptOrder
					&& loader instanceof createjs.TagLoader
					&& loader.getItem().type == createjs.LoadQueue.JAVASCRIPT) {
				if (this._currentlyLoadingScript) { continue; } // Later items in the queue might not be scripts.
				this._currentlyLoadingScript = true;
			}
			this._loadQueue.splice(i, 1);
            this._loadItem(loader);
  			i--; l--;
		}
	};

	/**
	 * Begin loading an item. Events are not added to the loaders until the load starts.
	 * @method _loadItem
	 * @param {AbstractLoader} loader The loader instance to start. Currently, this will be an XHRLoader or TagLoader.
	 * @private
	 */
	p._loadItem = function(loader) {
		loader.addEventListener("progress", createjs.proxy(this._handleProgress, this));
		loader.addEventListener("complete", createjs.proxy(this._handleFileComplete, this));
		loader.addEventListener("error", createjs.proxy(this._handleFileError, this));
		this._currentLoads.push(loader);
		loader.load();
	};

	/**
	 * The callback that is fired when a loader encounters an error. The queue will continue loading unless
	 * <code>stopOnError</code> is set to <code>true</code>.
	 * @method _handleFileError
	 * @param {Object} event The error event, containing relevant error information.
	 * @private
	 */
	p._handleFileError = function(event) {
		var loader = event.target;
		this._numItemsLoaded++;
		this._updateProgress();

		var event = {
			//TODO: Add error text?
			item: loader.getItem()
		};
		this._sendError(event);

		if (!this.stopOnError) {
			this._removeLoadItem(loader);
			this._loadNext();
		}
	};

	/**
	 * An item has finished loading. We can assume that it is totally loaded, has been parsed for immediate use, and
	 * is available as the "result" property on the load item. The raw text result for a parsed item (such as JSON, XML, 
	 * CSS, JavaScript, etc) is available as the "rawResult" event, and can also be looked up using {{#crossLink "LoadQueue/getResult"}}{{/crossLink}}.
	 * @method _handleFileComplete
	 * @param {Object} event The event object from the loader.
	 * @private
	 */
	p._handleFileComplete = function(event) {
		var loader = event.target;
		var item = loader.getItem();

		this._loadedResults[item.id] = loader.getResult();
		if (loader instanceof createjs.XHRLoader) {
			this._loadedRawResults[item.id] = loader.getResult(true);
		}

		this._removeLoadItem(loader);

		// Ensure that script loading happens in the right order.
		if (this.maintainScriptOrder && item.type == createjs.LoadQueue.JAVASCRIPT) {
			if (loader instanceof createjs.TagLoader) {
				this._currentlyLoadingScript = false;
			} else {
				this._loadedScripts[this._scriptOrder.indexOf(item)] = item;
				this._checkScriptLoadOrder(loader);
				return;
			}
		}

		this._processFinishedLoad(item);
	}

	p._processFinishedLoad = function(item) {
		// Old handleFileTagComplete follows here.
		this._numItemsLoaded++;

		this._updateProgress();
		this._sendFileComplete(item);

		this._loadNext();
	};

	/**
	 * Ensure the scripts load and dispatch in the correct order. When using XHR, scripts are stored in an array in the
	 * order they were added, but with a "null" value. When they are completed, the value is set to the load item,
	 * and then when they are processed and dispatched, the value is set to <code>true</code>. This method simply
	 * iterates the array, and ensures that any loaded items that are not preceded by a <code>null</code> value are
	 * dispatched.
	 * @method _checkScriptLoadOrder
	 * @private
	 */
	p._checkScriptLoadOrder = function () {
		var l = this._loadedScripts.length;

		for (var i=0;i<l;i++) {
			var item = this._loadedScripts[i];
			if (item === null) { break; } // This is still loading. Do not process further.
			if (item === true) { continue; } // This has completed, and been processed. Move on.

			// This item has finished, and is the next one to get dispatched.
			this._processFinishedLoad(item);
			this._loadedScripts[i] = true;
			i--; l--;
		}
	};

	/**
	 * A load item is completed or was canceled, and needs to be removed from the LoadQueue.
	 * @method _removeLoadItem
	 * @param {AbstractLoader} loader A loader instance to remove.
	 * @private
	 */
	p._removeLoadItem = function(loader) {
		var l = this._currentLoads.length;
		for (var i=0;i<l;i++) {
			if (this._currentLoads[i] == loader) {
				this._currentLoads.splice(i,1); break;
			}
		}
	};

	/**
	 * An item has dispatched progress. Propagate that progress, and update the LoadQueue overall progress.
	 * @method _handleProgress
	 * @param {Object} event The progress event from the item.
	 * @private
	 */
	p._handleProgress = function(event) {
		var loader = event.target;
		this._sendFileProgress(loader.getItem(), loader.progress);
		this._updateProgress();
	};

	/**
	 * Overall progress has changed, so determine the new progress amount and dispatch it. This changes any time an
	 * item dispatches progress or completes. Note that since we don't know the actual filesize of items before they are
	 * loaded, and even then we can only get the size of items loaded with XHR. In this case, we define a "slot" for
	 * each item (1 item in 10 would get 10%), and then append loaded progress on top of the already-loaded items.
	 *
	 * For example, if 5/10 items have loaded, and item 6 is 20% loaded, the total progress would be:<ul>
	 *      <li>5/10 of the items in the queue (50%)</li>
	 *      <li>plus 20% of item 6's slot (2%)</li>
	 *      <li>equals 52%</li></ul>
	 * @method _updateProgress
	 * @private
	 */
	p._updateProgress = function () {
		var loaded = this._numItemsLoaded / this._numItems; // Fully Loaded Progress
		var remaining = this._numItems-this._numItemsLoaded;
		if (remaining > 0) {
			var chunk = 0;
			for (var i=0, l=this._currentLoads.length; i<l; i++) {
				chunk += this._currentLoads[i].progress;
			}
			loaded += (chunk / remaining) * (remaining/this._numItems);
		}
		this._sendProgress(loaded);
	}

	/**
	 * Clean out item results, to free them from memory. Mainly, the loaded item and results are cleared from internal
	 * hashes.
	 * @method _disposeItem
	 * @param {Object} item The item that was passed in for preloading.
	 * @private
	 */
	p._disposeItem = function(item) {
		delete this._loadedResults[item.id];
		delete this._loadedRawResults[item.id];
		delete this._loadItemsById[item.id];
		delete this._loadItemsBySrc[item.src];
	};


	/**
	 * Create an HTML tag. This is in LoadQueue instead of {{#crossLink "TagLoader"}}{{/crossLink}} because no matter
	 * how we load the data, we may need to return it in a tag.
	 * @method _createTag
	 * @param {String} type The item type. Items are passed in by the developer, or deteremined by the extension.
	 * @return {HTMLImageElement|HTMLAudioElement|HTMLScriptElement|HTMLLinkElement|Object} The tag that is created.
	 * Note that tags are not appended to the HTML body.
	 * @private
	 */
	p._createTag = function(type) {
		var tag = null;
		switch (type) {
			case createjs.LoadQueue.IMAGE:
				return document.createElement("img");
			case createjs.LoadQueue.SOUND:
				tag = document.createElement("audio");
				tag.autoplay = false;
				// Note: The type property doesn't seem necessary.
				return tag;
			case createjs.LoadQueue.JAVASCRIPT:
				tag = document.createElement("script");
				tag.type = "text/javascript";
				return tag;
			case createjs.LoadQueue.CSS:
				if (this.useXHR) {
					tag = document.createElement("style");
				} else {
					tag = document.createElement("link");
				}
				tag.rel  = "stylesheet";
				tag.type = "text/css";
				return tag;
			case createjs.LoadQueue.SVG:
				if (this.useXHR) {
					tag = document.createElement("svg");
				} else {
					tag = document.createElement("object");
					tag.type = "image/svg+xml";
				}
				return tag;
		}
		return null;
	};

	/**
	 * Determine the type of the object using common extensions. Note that the type can be passed in with the load item
	 * if it is an unusual extension.
	 * @param {String} extension The file extension to use to determine the load type.
	 * @return {String} The determined load type (for example, <code>LoadQueue.IMAGE</code> or null if it can not be
	 * determined by the extension.
	 * @private
	 */
	p._getTypeByExtension = function(extension) {
		switch (extension) {
			case "jpeg":
			case "jpg":
			case "gif":
			case "png":
			case "webp":
			case "bmp":
				return createjs.LoadQueue.IMAGE;
			case "ogg":
			case "mp3":
			case "wav":
				return createjs.LoadQueue.SOUND;
			case "json":
				return createjs.LoadQueue.JSON;
			case "xml":
				return createjs.LoadQueue.XML;
			case "css":
				return createjs.LoadQueue.CSS;
			case "js":
				return createjs.LoadQueue.JAVASCRIPT;
			case 'svg':
				return createjs.LoadQueue.SVG;
			default:
				return createjs.LoadQueue.TEXT;
		}
	};

	/**
	 * Dispatch a fileprogress event (and onFileProgress callback). Please see the <code>LoadQueue.fileprogress</code>
	 * event for details on the event payload.
	 * @method _sendFileProgress
	 * @param {Object} item The item that is being loaded.
	 * @param {Number} progress The amount the item has been loaded (between 0 and 1).
	 * @protected
	 */
	p._sendFileProgress = function(item, progress) {
		if (this._isCanceled()) {
			this._cleanUp();
			return;
		}
		var event = {
			target: this,
			type: "fileprogress",
			progress: progress,
			loaded: progress,
			total: 1,
			item: item
		};
		this.onFileProgress && this.onFileProgress(event);
		this.dispatchEvent(event);
	};

	/**
	 * Dispatch a fileload event (and onFileLoad callback). Please see the <code>LoadQueue.fileload</code> event for
	 * details on the event payload.
	 * @method _sendFileComplete
	 * @param {Object} item The item that is being loaded.
	 * @protected
	 */
	p._sendFileComplete = function(item) {
		if (this._isCanceled()) { return; }
		var event = {
			target: this,
			type: "fileload",
			item: item,
			result: this._loadedResults[item.id],
			rawResult: this._loadedRawResults[item.id]
		};

        // This calls a handler specified on the actual load item. Currently, the SoundJS plugin uses this.
        if (item.completeHandler) {
            item.completeHandler(event);
        }

        this.onFileLoad && this.onFileLoad(event);
		this.dispatchEvent(event)
	};

	p.toString = function() {
		return "[PreloadJS LoadQueue]";
	};
	/**
	 * A function proxy for PreloadJS methods. By default, JavaScript methods do not maintain scope, so passing a
	 * method as a callback will result in the method getting called in the scope of the caller. Using a proxy
	 * ensures that the method gets called in the correct scope.
	 * @method proxy
	 * @param {Function} method The function to call
	 * @param {Object} scope The scope to call the method name on
	 * @static
	 * @private
	 * @deprecated In favour of the createjs.proxy method (see LoadQueue source).
	 */
	createjs.proxy = function(method, scope) {
		return function() {
			return method.apply(scope, arguments);
		};
	}

	createjs.LoadQueue = LoadQueue;


// Helper methods
	/**
	 * A function proxy for PreloadJS methods. By default, JavaScript methods do not maintain scope, so passing a
	 * method as a callback will result in the method getting called in the scope of the caller. Using a proxy
	 * ensures that the method gets called in the correct scope.
	 * #method proxy
	 * @param {Function} method The function to call
	 * @param {Object} scope The scope to call the method name on
	 * @param {mixed} [arg]* Arguments that are appended to the callback.
	 * @static
	 * @private
	 */
	if (!createjs.proxy) {
		createjs.proxy = function(method, scope) {
			var aArgs = Array.prototype.slice.call(arguments, 2);
			return function() {
				return method.apply(scope, Array.prototype.slice.call(arguments, 0).concat(aArgs));
			};
		}
	}


	// An additional module to determine the current browser, version, operating system, and other environmental variables.
	var BrowserDetect = function() {}

	BrowserDetect.init = function() {
		var agent = navigator.userAgent;
		BrowserDetect.isFirefox = (agent.indexOf("Firefox") > -1);
		BrowserDetect.isOpera = (window.opera != null);
		BrowserDetect.isChrome = (agent.indexOf("Chrome") > -1);
		BrowserDetect.isIOS = agent.indexOf("iPod") > -1 || agent.indexOf("iPhone") > -1 || agent.indexOf("iPad") > -1;
	}

	BrowserDetect.init();

	createjs.LoadQueue.BrowserDetect = BrowserDetect;

	// Patch for IE7 and 8 that don't have indexOf
	// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/indexOf
	if (!Array.prototype.indexOf) {
	    Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
	        if (this == null) {
	            throw new TypeError();
	        }
	        var t = Object(this);
	        var len = t.length >>> 0;
	        if (len === 0) {
	            return -1;
	        }
	        var n = 0;
	        if (arguments.length > 1) {
	            n = Number(arguments[1]);
	            if (n != n) { // shortcut for verifying if it's NaN
	                n = 0;
	            } else if (n != 0 && n != Infinity && n != -Infinity) {
	                n = (n > 0 || -1) * Math.floor(Math.abs(n));
	            }
	        }
	        if (n >= len) {
	            return -1;
	        }
	        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
	        for (; k < len; k++) {
	            if (k in t && t[k] === searchElement) {
	                return k;
	            }
	        }
	        return -1;
	    }
	}
}());