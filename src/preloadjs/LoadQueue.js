/*
* LoadQueue
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
 *
 *      var queue = new createjs.LoadQueue();
 *      queue.installPlugin(createjs.Sound);
 *      queue.on("complete", handleComplete, this);
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
 * <h4>Browser Support</h4>
 * PreloadJS is partially supported in all browsers, and fully supported in all modern browsers. Known exceptions:
 * <ul><li>XHR loading of any content will not work in many older browsers (See a matrix here: <a href="http://caniuse.com/xhr2">http://caniuse.com/xhr2</a>).
 *      In many cases, you can fall back on tag loading (images, audio, CSS, scripts, SVG, and JSONP). Text and
 *      WebAudio will only work with XHR.</li>
 *      <li>Some formats have poor support for complete events in IE 6, 7, and 8 (SVG, tag loading of scripts, XML/JSON)</li>
 *      <li>Opera has poor support for SVG loading with XHR</li>
 *      <li>CSS loading in Android and Safari will not work with tags (currently, a workaround is in progress)</li>
 *      <li>Local loading is not permitted with XHR, which is required by some file formats. When testing local content
 *      use either a local server, or enable tag loading, which is supported for most formats. See {{#crossLink "LoadQueue/setUseXHR"}}{{/crossLink}}
 *      for more information.</li>
 * </li>
 *
 * @module PreloadJS
 * @main PreloadJS
 */

// namespace:
this.createjs = this.createjs||{};

/*
TODO: WINDOWS ISSUES
	* No error for HTML audio in IE 678
	* SVG no failure error in IE 67 (maybe 8) TAGS AND XHR
	* No script complete handler in IE 67 TAGS (XHR is fine)
	* No XML/JSON in IE6 TAGS
	* Need to hide loading SVG in Opera TAGS
	* No CSS onload/readystatechange in Safari or Android TAGS (requires rule checking)
	* SVG no load or failure in Opera XHR
	* Reported issues with IE7/8
 */

(function() {
	"use strict";

	/**
	 * The LoadQueue class is the main API for preloading content. LoadQueue is a load manager, which can preload either
	 * a single file, or queue of files.
	 *
	 * <b>Creating a Queue</b><br />
	 * To use LoadQueue, create a LoadQueue instance. If you want to force tag loading where possible, set the useXHR
	 * argument to false.
	 *
	 *      var queue = new createjs.LoadQueue(true);
	 *
	 * <b>Listening for Events</b><br />
	 * Add any listeners you want to the queue. Since PreloadJS 0.3.0, the {{#crossLink "EventDispatcher"}}{{/crossLink}}
	 * lets you add as many listeners as you want for events. You can subscribe to the following events:<ul>
	 *     <li>{{#crossLink "AbstractLoader/complete:event"}}{{/crossLink}}: fired when a queue completes loading all
	 *     files</li>
	 *     <li>{{#crossLink "AbstractLoader/error:event"}}{{/crossLink}}: fired when the queue encounters an error with
	 *     any file.</li>
	 *     <li>{{#crossLink "AbstractLoader/progress:event"}}{{/crossLink}}: Progress for the entire queue has
	 *     changed.</li>
	 *     <li>{{#crossLink "LoadQueue/fileload:event"}}{{/crossLink}}: A single file has completed loading.</li>
	 *     <li>{{#crossLink "LoadQueue/fileprogress:event"}}{{/crossLink}}: Progress for a single file has changes. Note
	 *     that only files loaded with XHR (or possibly by plugins) will fire progress events other than 0 or 100%.</li>
	 * </ul>
	 *
	 *      queue.on("fileload", handleFileLoad, this);
	 *      queue.on("complete", handleComplete, this);
	 *
	 * <b>Adding files and manifests</b><br />
	 * Add files you want to load using {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}} or add multiple files at a
	 * time using a list or a manifest definition using {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}}. Files are
	 * appended to the end of the active queue, so you can use these methods as many times as you like, whenever you
	 * like.
	 *
	 *      queue.loadFile("filePath/file.jpg");
	 *      queue.loadFile({id:"image", src:"filePath/file.jpg"});
	 *      queue.loadManifest(["filePath/file.jpg", {id:"image", src:"filePath/file.jpg"}];
	 *
	 * If you pass `false` as the `loadNow` parameter, the queue will not kick of the load of the files, but it will not
	 * stop if it has already been started. Call the {{#crossLink "AbstractLoader/load"}}{{/crossLink}} method to begin
	 * a paused queue. Note that a paused queue will automatically resume when new files are added to it with a
	 * `loadNow` argument of `true`.
	 *
	 *      queue.load();
	 *
	 * <b>File Types</b><br />
	 * The file type of a manifest item is auto-determined by the file extension. The pattern matching in PreloadJS
	 * should handle the majority of standard file and url formats, and works with common file extensions. If you have
	 * either a non-standard file extension, or are serving the file using a proxy script, then you can pass in a
	 * <code>type</code> property with any manifest item.
	 *
	 *      queue.loadFile({src:"path/to/myFile.mp3x", type:createjs.LoadQueue.SOUND});
	 *
	 *      // Note that PreloadJS will not read a file extension from the query string
	 *      queue.loadFile({src:"http://server.com/proxy?file=image.jpg"}, type:createjs.LoadQueue.IMAGE});
	 *
	 * Supported types are defined on the LoadQueue class, and include:
	 * <ul>
	 *     <li>{{#crossLink "LoadQueue/BINARY:property"}}{{/crossLink}}: Raw binary data via XHR</li>
	 *     <li>{{#crossLink "LoadQueue/CSS:property"}}{{/crossLink}}: CSS files</li>
	 *     <li>{{#crossLink "LoadQueue/IMAGE:property"}}{{/crossLink}}: Common image formats</li>
	 *     <li>{{#crossLink "LoadQueue/JAVASCRIPT:property"}}{{/crossLink}}: JavaScript files</li>
	 *     <li>{{#crossLink "LoadQueue/JSON:property"}}{{/crossLink}}: JSON data</li>
	 *     <li>{{#crossLink "LoadQueue/JSONP:property"}}{{/crossLink}}: JSON files cross-domain</li>
	 *     <li>{{#crossLink "LoadQueue/MANIFEST:property"}}{{/crossLink}}: A list of files to load in JSON format, see
	 *     {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}}</li>
	 *     <li>{{#crossLink "LoadQueue/SOUND:property"}}{{/crossLink}}: Audio file formats</li>
	 *     <li>{{#crossLink "LoadQueue/SVG:property"}}{{/crossLink}}: SVG files</li>
	 *     <li>{{#crossLink "LoadQueue/TEXT:property"}}{{/crossLink}}: Text files - XHR only</li>
	 *     <li>{{#crossLink "LoadQueue/XML:property"}}{{/crossLink}}: XML data</li>
	 * </ul>
	 *
	 * <b>Handling Results</b><br />
	 * When a file is finished downloading, a {{#crossLink "LoadQueue/fileload:event"}}{{/crossLink}} event is
	 * dispatched. In an example above, there is an event listener snippet for fileload. Loaded files are usually a
	 * resolved object that can be used immediately, including:
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
	 *          var item = event.item; // A reference to the item that was passed in to the LoadQueue
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
	 * file path can be used instead, including the `path` defined by a manifest, but <strong>not including</strong> a
	 * base path defined on the LoadQueue. It is recommended to always pass an id.
	 *
	 *      var image = queue.getResult("image");
	 *      document.body.appendChild(image);
	 *
	 * Raw loaded content can be accessed using the <code>rawResult</code> property of the {{#crossLink "LoadQueue/fileload:event"}}{{/crossLink}}
	 * event, or can be looked up using {{#crossLink "LoadQueue/getResult"}}{{/crossLink}}, passing `true` as the 2nd
	 * argument. This is only applicable for content that has been parsed for the browser, specifically: JavaScript,
	 * CSS, XML, SVG, and JSON objects, or anything loaded with XHR.
	 *
	 *      var image = queue.getResult("image", true); // load the binary image data loaded with XHR.
	 *
	 * <b>Plugins</b><br />
	 * LoadQueue has a simple plugin architecture to help process and preload content. For example, to preload audio,
	 * make sure to install the <a href="http://soundjs.com">SoundJS</a> Sound class, which will help load HTML audio,
	 * Flash audio, and WebAudio files. This should be installed <strong>before</strong> loading any audio files.
	 *
	 *      queue.installPlugin(createjs.Sound);
	 *
	 * <h4>Known Browser Issues</h4>
	 * <ul>
	 *     <li>Browsers without audio support can not load audio files.</li>
	 *     <li>Safari on Mac OS X can only play HTML audio if QuickTime is installed</li>
	 *     <li>HTML Audio tags will only download until their <code>canPlayThrough</code> event is fired. Browsers other
	 *     than Chrome will continue to download in the background.</li>
	 *     <li>When loading scripts using tags, they are automatically added to the document.</li>
	 *     <li>Scripts loaded via XHR may not be properly inspectable with browser tools.</li>
	 *     <li>IE6 and IE7 (and some other browsers) may not be able to load XML, Text, or JSON, since they require
	 *     XHR to work.</li>
	 *     <li>Content loaded via tags will not show progress, and will continue to download in the background when
	 *     canceled, although no events will be dispatched.</li>
	 * </ul>
	 *
	 * @class LoadQueue
	 * @param {Boolean} [useXHR=true] Determines whether the preload instance will favor loading with XHR (XML HTTP
	 * Requests), or HTML tags. When this is `false`, the queue will use tag loading when possible, and fall back on XHR
	 * when necessary.
	 * @param {String} [basePath=""] A path that will be prepended on to the source parameter of all items in the queue
	 * before they are loaded.  Sources beginning with a protocol such as `http://` or a relative path such as `../`
	 * will not receive a base path.
	 * @constructor
	 * @extends AbstractLoader
	 */
	var LoadQueue = function(useXHR, basePath) {
		this.init(useXHR, basePath);
	};

	var p = LoadQueue.prototype = new createjs.AbstractLoader();
	var s = LoadQueue;

	/**
	 * Time in milliseconds to assume a load has failed. An {{#crossLink "AbstractLoader/error:event"}}{{/crossLink}}
	 * event is dispatched if the timeout is reached before any data is received.
	 * @property loadTimeout
	 * @type {Number}
	 * @default 8000
	 * @static
	 * @since 0.4.1
	 */
	s.loadTimeout = 8000;

	/**
	 * Time in milliseconds to assume a load has failed.
	 * @type {Number}
	 * @deprecated in favor of the {{#crossLink "LoadQueue/loadTimeout:property"}}{{/crossLink}} property.
	 */
	s.LOAD_TIMEOUT = 0;

// Preload Types
	/**
	 * The preload type for generic binary types. Note that images are loaded as binary files when using XHR.
	 * @property BINARY
	 * @type {String}
	 * @default binary
	 * @static
	 */
	s.BINARY = "binary";

	/**
	 * The preload type for css files. CSS files are loaded using a &lt;link&gt; when loaded with XHR, or a
	 * &lt;style&gt; tag when loaded with tags.
	 * @property CSS
	 * @type {String}
	 * @default css
	 * @static
	 */
	s.CSS = "css";

	/**
	 * The preload type for image files, usually png, gif, or jpg/jpeg. Images are loaded into an &lt;image&gt; tag.
	 * @property IMAGE
	 * @type {String}
	 * @default image
	 * @static
	 */
	s.IMAGE = "image";

	/**
	 * The preload type for javascript files, usually with the "js" file extension. JavaScript files are loaded into a
	 * &lt;script&gt; tag.
	 *
	 * Since version 0.4.1+, due to how tag-loaded scripts work, all JavaScript files are automatically injected into
	 * the body of the document to maintain parity between XHR and tag-loaded scripts. In version 0.4.0 and earlier,
	 * only tag-loaded scripts are injected.
	 * @property JAVASCRIPT
	 * @type {String}
	 * @default javascript
	 * @static
	 */
	s.JAVASCRIPT = "javascript";

	/**
	 * The preload type for json files, usually with the "json" file extension. JSON data is loaded and parsed into a
	 * JavaScript object. Note that if a `callback` is present on the load item, the file will be loaded with JSONP,
	 * no matter what the {{#crossLink "LoadQueue/useXHR:property"}}{{/crossLink}} property is set to, and the JSON
	 * must contain a matching wrapper function.
	 * @property JSON
	 * @type {String}
	 * @default json
	 * @static
	 */
	s.JSON = "json";

	/**
	 * The preload type for jsonp files, usually with the "json" file extension. JSON data is loaded and parsed into a
	 * JavaScript object. You are required to pass a callback parameter that matches the function wrapper in the JSON.
	 * Note that JSONP will always be used if there is a callback present, no matter what the {{#crossLink "LoadQueue/useXHR:property"}}{{/crossLink}}
	 * property is set to.
	 * @property JSONP
	 * @type {String}
	 * @default jsonp
	 * @static
	 */
	s.JSONP = "jsonp";

	/**
	 * The preload type for json-based manifest files, usually with the "json" file extension. The JSON data is loaded
	 * and parsed into a JavaScript object. PreloadJS will then look for a "manifest" property in the JSON, which is an
	 * Array of files to load, following the same format as the {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}}
	 * method. If a "callback" is specified on the manifest object, then it will be loaded using JSONP instead,
	 * regardless of what the {{#crossLink "LoadQueue/useXHR:property"}}{{/crossLink}} property is set to.
	 * @property MANIFEST
	 * @type {String}
	 * @default manifest
	 * @static
	 * @since 0.4.1
	 */
	s.MANIFEST = "manifest";

	/**
	 * The preload type for sound files, usually mp3, ogg, or wav. When loading via tags, audio is loaded into an
	 * &lt;audio&gt; tag.
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

	/**
	 * Defines a POST request, use for a method value when loading data.
	 *
	 * @type {string}
	 */
	s.POST = 'POST';

	/**
	 * Defines a GET request, use for a method value when loading data.
	 *
	 * @type {string}
	 */
	s.GET = 'GET';


// Prototype
	/**
	 * A path that will be prepended on to the item's `src`. The `_basePath` property will only be used if an item's
	 * source is relative, and does not include a protocol such as `http://`, or a relative path such as `../`.
	 * @property _basePath
	 * @type {String}
	 * @private
	 * @since 0.3.1
	 */
	p._basePath = null;

	/**
	 * Use XMLHttpRequest (XHR) when possible. Note that LoadQueue will default to tag loading or XHR loading depending
	 * on the requirements for a media type. For example, HTML audio can not be loaded with XHR, and WebAudio can not be
	 * loaded with tags, so it will default the the correct type instead of using the user-defined type.
	 *
	 * <b>Note: This property is read-only.</b> To change it, please use the {{#crossLink "LoadQueue/setUseXHR"}}{{/crossLink}}
	 * method, or specify the `useXHR` argument in the LoadQueue constructor.
	 *
	 * @property useXHR
	 * @type {Boolean}
	 * @readOnly
	 * @default true
	 */
	p.useXHR = true;

	/**
	 * Determines if the LoadQueue will stop processing the current queue when an error is encountered.
	 * @property stopOnError
	 * @type {Boolean}
	 * @default false
	 */
	p.stopOnError = false;

	/**
	 * Ensure loaded scripts "complete" in the order they are specified. Loaded scripts are added to the document head
	 * once they are loaded. Note that scripts loaded via tags will load one-at-a-time when this property is `true`.
	 * load one at a time
	 * @property maintainScriptOrder
	 * @type {Boolean}
	 * @default true
	 */
	p.maintainScriptOrder = true;

	/**
	 * The next preload queue to process when this one is complete. If an error is thrown in the current queue, and
	 * {{#crossLink "LoadQueue/stopOnError:property"}}{{/crossLink}} is `true`, the next queue will not be processed.
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
	 * object will contain that value as a `src` property.
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
	 * object will contain that value as a `src` property.
	 * @param {Number} loaded The number of bytes that have been loaded. Note that this may just be a percentage of 1.
	 * @param {Number} total The total number of bytes. If it is unknown, the value is 1.
	 * @param {Number} progress The amount that has been loaded between 0 and 1.
	 * @since 0.3.0
	 */

	/**
	 * This event is fired when an individual file starts to load.
	 * @event filestart
	 * @param {Object} The object that dispatched the event.
	 * @param {String} type The event type.
	 * @param {Object} item The file item which was specified in the {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}}
	 * or {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}} call. If only a string path or tag was specified, the
	 * object will contain that value as a property.
	 */

	//TODO: Deprecated
	/**
	 * REMOVED. Use {{#crossLink "EventDispatcher/addEventListener"}}{{/crossLink}} and the {{#crossLink "LoadQueue/fileload:event"}}{{/crossLink}}
	 * event.
	 * @property onFileLoad
	 * @type {Function}
	 * @deprecated Use addEventListener and the "fileload" event.
	 */
	/**
	 * REMOVED. Use {{#crossLink "EventDispatcher/addEventListener"}}{{/crossLink}} and the {{#crossLink "LoadQueue/fileprogress:event"}}{{/crossLink}}
	 * event.
	 * @property onFileProgress
	 * @type {Function}
	 * @deprecated Use addEventListener and the "fileprogress" event.
	 */


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
	p.init = function(useXHR, basePath) {
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

		this._basePath = basePath;
		this.setUseXHR(useXHR);
	};

	/**
	 * Change the usXHR value. Note that if this is set to true, it may fail depending on the browser's capabilities.
	 * Additionally, some files require XHR in order to load, such as JSON (without JSONP), Text, and XML, so XHR will
	 * be used regardless of what is passed to this method.
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
	 * content, and allows the queue to be used again.
	 * @method removeAll
	 * @since 0.3.0
	 */
	p.removeAll = function() {
		this.remove();
	};

	/**
	 * Stops an item from being loaded, and removes it from the queue. If nothing is passed, all items are removed.
	 * This also removes internal references to loaded item(s).
	 *
	 * <h4>Example</h4>
	 *
	 *      queue.loadManifest([
	 *          {src:"test.png", id:"png"},
	 *          {src:"test.jpg", id:"jpg"},
	 *          {src:"test.mp3", id:"mp3"}
	 *      ]);
	 *      queue.remove("png"); // Single item by ID
	 *      queue.remove("png", "test.jpg"); // Items as arguments. Mixed id and src.
	 *      queue.remove(["test.png", "jpg"]); // Items in an Array. Mixed id and src.
	 *
	 * @method remove
	 * @param {String | Array} idsOrUrls* The id or ids to remove from this queue. You can pass an item, an array of
	 * items, or multiple items as arguments.
	 * @since 0.3.0
	 */
	p.remove = function(idsOrUrls) {
		var args = null;

		if (idsOrUrls && !(idsOrUrls instanceof Array)) {
			args = [idsOrUrls];
		} else if (idsOrUrls) {
			args = idsOrUrls;
		} else if (arguments.length > 0) {
			return;
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
		for (var i=0, l=this._loadQueueBackup.length; i<l; i++) {
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
	 * @return {Boolean} If the specified type is binary.
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
	 * Register a plugin. Plugins can map to load types (sound, image, etc), or specific extensions (png, mp3, etc).
	 * Currently, only one plugin can exist per type/extension.
	 *
	 * When a plugin is installed, a <code>getPreloadHandlers()</code> method will be called on it. For more information
	 * on this method, check out the {{#crossLink "SamplePlugin/getPreloadHandlers"}}{{/crossLink}} method in the
	 * {{#crossLink "SamplePlugin"}}{{/crossLink}} class.
	 *
	 * Before a file is loaded, a matching plugin has an opportunity to modify the load. If a `callback` is returned
	 * from the {{#crossLink "SamplePlugin/getPreloadHandlers"}}{{/crossLink}} method, it will be invoked first, and its
	 * result may cancel or modify the item. The callback method can also return a `completeHandler` to be fired when
	 * the file is loaded, or a `tag` object, which will manage the actual download. For more information on these
	 * methods, check out the {{#crossLink "SamplePlugin/preloadHandler"}}{{/crossLink}} and {{#crossLink "SamplePlugin/fileLoadHandler"}}{{/crossLink}}
	 * methods on the {{#crossLink "SamplePlugin"}}{{/crossLink}}.
	 *
	 * @method installPlugin
	 * @param {Function} plugin The plugin class to install.
	 */
	p.installPlugin = function(plugin) {
		if (plugin == null || plugin.getPreloadHandlers == null) { return; }
		var map = plugin.getPreloadHandlers();
		map.scope = plugin;

		if (map.types != null) {
			for (var i=0, l=map.types.length; i<l; i++) {
				this._typeCallbacks[map.types[i]] = map;
			}
		}
		if (map.extensions != null) {
			for (i=0, l=map.extensions.length; i<l; i++) {
				this._extensionCallbacks[map.extensions[i]] = map;
			}
		}
	};

	/**
	 * Set the maximum number of concurrent connections. Note that browsers and servers may have a built-in maximum
	 * number of open connections, so any additional connections may remain in a pending state until the browser
	 * opens the connection. When loading scripts using tags, and when {{#crossLink "LoadQueue/maintainScriptOrder:property"}}{{/crossLink}}
	 * is `true`, only one script is loaded at a time due to browser limitations.
	 *
	 * <h4>Example</h4>
	 *
	 *      var queue = new createjs.LoadQueue();
	 *      queue.setMaxConnections(10); // Allow 10 concurrent loads
	 *
	 * @method setMaxConnections
	 * @param {Number} value The number of concurrent loads to allow. By default, only a single connection per LoadQueue
	 * is open at any time.
	 */
	p.setMaxConnections = function (value) {
		this._maxConnections = value;
		if (!this._paused && this._loadQueue.length > 0) {
			this._loadNext();
		}
	};

	/**
	 * Load a single file. To add multiple files at once, use the {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}}
	 * method.
	 *
	 * Files are always appended to the current queue, so this method can be used multiple times to add files.
	 * To clear the queue first, use the {{#crossLink "AbstractLoader/close"}}{{/crossLink}} method.
	 * @method loadFile
	 * @param {Object | String} file The file object or path to load. A file can be either
     * <ul>
     *     <li>A string path to a resource. Note that this kind of load item will be converted to an object (see below)
	 *     in the background.</li>
     *     <li>OR an object that contains:<ul>
     *         <li>src: The source of the file that is being loaded. This property is <b>required</b>. The source can
	 *         either be a string (recommended), or an HTML tag.</li>
     *         <li>type: The type of file that will be loaded (image, sound, json, etc). PreloadJS does auto-detection
	 *         of types using the extension. Supported types are defined on LoadQueue, such as <code>LoadQueue.IMAGE</code>.
	 *         It is recommended that a type is specified when a non-standard file URI (such as a php script) us used.</li>
     *         <li>id: A string identifier which can be used to reference the loaded object.</li>
	 *         <li>callback: Optional, used for JSONP requests, to define what method to call when the JSONP is loaded.</li>
     *         <li>data: An arbitrary data object, which is included with the loaded object</li>
	 *         <li>method: used to define if this request uses GET or POST when sending data to the server. The default
	 *         value is "GET"</li>
	 *         <li>values: Optional object of name/value pairs to send to the server.</li>
     *     </ul>
     * </ul>
	 * @param {Boolean} [loadNow=true] Kick off an immediate load (true) or wait for a load call (false). The default
	 * value is true. If the queue is paused using {{#crossLink "LoadQueue/setPaused"}}{{/crossLink}}, and the value is
	 * `true`, the queue will resume automatically.
	 * @param {String} [basePath] A base path that will be prepended to each file. The basePath argument overrides the
	 * path specified in the constructor. Note that if you load a manifest using a file of type {{#crossLink "LoadQueue/MANIFEST:property"}}{{/crossLink}},
	 * its files will <strong>NOT</strong> use the basePath parameter. <strong>The basePath parameter is deprecated.</strong>
	 * This parameter will be removed in a future version. Please either use the `basePath` parameter in the LoadQueue
	 * constructor, or a `path` property in a manifest definition.
	 */
	p.loadFile = function(file, loadNow, basePath) {
		if (file == null) {
			var event = new createjs.Event("error");
			event.text = "PRELOAD_NO_FILE";
			this._sendError(event);
			return;
		}
		this._addItem(file, null, basePath);

		if (loadNow !== false) {
			this.setPaused(false);
		} else {
			this.setPaused(true);
		}
	};

	/**
	 * Load an array of files. To load a single file, use the {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}} method.
	 * The files in the manifest are requested in the same order, but may complete in a different order if the max
	 * connections are set above 1 using {{#crossLink "LoadQueue/setMaxConnections"}}{{/crossLink}}. Scripts will load
	 * in the right order as long as {{#crossLink "LoadQueue/maintainScriptOrder"}}{{/crossLink}} is true (which is
	 * default).
	 *
	 * Files are always appended to the current queue, so this method can be used multiple times to add files.
	 * To clear the queue first, use the {{#crossLink "AbstractLoader/close"}}{{/crossLink}} method.
	 * @method loadManifest
	 * @param {Array|String|Object} manifest An list of files to load. The loadManifest call supports four types of
	 * manifests:
	 * <ol>
	 *     <li>A string path, which points to a manifest file, which is a JSON file that contains a "manifest" property,
	 *     which defines the list of files to load, and can optionally contain a "path" property, which will be
	 *     prepended to each file in the list.</li>
	 *     <li>An object which defines a "src", which is a JSON or JSONP file. A "callback" can be defined for JSONP
	 *     file. The JSON/JSONP file should contain a "manifest" property, which defines the list of files to load,
	 *     and can optionally contain a "path" property, which will be prepended to each file in the list.</li>
	 *     <li>An object which contains a "manifest" property, which defines the list of files to load, and can
	 *     optionally contain a "path" property, which will be prepended to each file in the list.</li>
	 *     <li>An Array of files to load.</li>
	 * </ol>
	 *
	 * Each "file" in a manifest can be either:
	 * <ul>
	 *     <li>A string path to a resource (string). Note that this kind of load item will be converted to an object
	 *     (see below) in the background.</li>
	 *      <li>OR an object that contains:<ul>
	 *         <li>src: The source of the file that is being loaded. This property is <b>required</b>. The source can
	 *         either be a string (recommended), or an HTML tag.</li>
	 *         <li>type: The type of file that will be loaded (image, sound, json, etc). PreloadJS does auto-detection
	 *         of types using the extension. Supported types are defined on LoadQueue, such as <code>LoadQueue.IMAGE</code>.
	 *         It is recommended that a type is specified when a non-standard file URI (such as a php script) us used.</li>
	 *         <li>id: A string identifier which can be used to reference the loaded object.</li>
	 *         <li>callback: Optional, used for JSONP requests, to define what method to call when the JSONP is loaded.</li>
	 *         <li>data: An arbitrary data object, which is included with the loaded object</li>
	 *         <li>method: used to define if this request uses GET or POST when sending data to the server. The default
	 *         value is "GET"</li>
	 *         <li>values: Optional object of name/value pairs to send to the server.</li>
	 *     </ul>
	 * </ul>
	 * @param {Boolean} [loadNow=true] Kick off an immediate load (true) or wait for a load call (false). The default
	 * value is true. If the queue is paused using {{#crossLink "LoadQueue/setPaused"}}{{/crossLink}} and this value is
	 * `true`, the queue will resume automatically.
	 * @param {String} [basePath] A base path that will be prepended to each file. The basePath argument overrides the
	 * path specified in the constructor. Note that if you load a manifest using a file of type {{#crossLink "LoadQueue/MANIFEST:property"}}{{/crossLink}},
	 * its files will <strong>NOT</strong> use the basePath parameter. <strong>The basePath parameter is deprecated.</strong>
	 * This parameter will be removed in a future version. Please either use the `basePath` parameter in the LoadQueue
	 * constructor, or a `path` property in a manifest definition.
	 */
	p.loadManifest = function(manifest, loadNow, basePath) {
		var fileList = null;
		var path = null;

		// Array-based list of items
		if (manifest instanceof Array) {
			if (manifest.length == 0) {
				var event = new createjs.Event("error");
				event.text = "PRELOAD_MANIFEST_EMPTY";
				this._sendError(event);
				return;
			}
			fileList = manifest;

		// String-based. Only file manifests can be specified this way. Any other types will cause an error when loaded.
		} else if (typeof(manifest) === "string") {
			fileList = [{
				src: manifest,
				type: s.MANIFEST
			}];

		} else if (typeof(manifest) == "object") {

			// An object that defines a manifest path
			if (manifest.src !== undefined) {
				if (manifest.type == null) {
					manifest.type = s.MANIFEST;
				} else if (manifest.type != s.MANIFEST) {
					var event = new createjs.Event("error");
					event.text = "PRELOAD_MANIFEST_ERROR";
					this._sendError(event);
				}
				fileList = [manifest];

			// An object that defines a manifest
			} else if (manifest.manifest !== undefined) {
				fileList = manifest.manifest;
				path = manifest.path;
			}

		// Unsupported. This will throw an error.
		} else {
			var event = new createjs.Event("error");
			event.text = "PRELOAD_MANIFEST_NULL";
			this._sendError(event);
			return;
		}

		for (var i=0, l=fileList.length; i<l; i++) {
			this._addItem(fileList[i], path, basePath);
		}

		if (loadNow !== false) {
			this.setPaused(false);
		} else {
			this.setPaused(true);
		}

	};

	// Overrides abstract method in AbstractLoader
	p.load = function() {
		this.setPaused(false);
	};

	/**
	 * Look up a load item using either the "id" or "src" that was specified when loading it. Note that if no "id" was
	 * supplied with the load item, the ID will be the "src", including a `path` property defined by a manifest. The
	 * `basePath` will not be part of the ID.
	 * @method getItem
	 * @param {String} value The <code>id</code> or <code>src</code> of the load item.
	 * @return {Object} The load item that was initially requested using {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}}
	 * or {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}}. This object is also returned via the {{#crossLink "LoadQueue/fileload:event"}}{{/crossLink}}
	 * event as the `item` parameter.
	 */
	p.getItem = function(value) {
		return this._loadItemsById[value] || this._loadItemsBySrc[value];
	};

	/**
	 * Look up a loaded result using either the "id" or "src" that was specified when loading it. Note that if no "id"
	 * was supplied with the load item, the ID will be the "src", including a `path` property defined by a manifest. The
	 * `basePath` will not be part of the ID.
	 * @method getResult
	 * @param {String} value The <code>id</code> or <code>src</code> of the load item.
	 * @param {Boolean} [rawResult=false] Return a raw result instead of a formatted result. This applies to content
	 * loaded via XHR such as scripts, XML, CSS, and Images. If there is no raw result, the formatted result will be
	 * returned instead.
	 * @return {Object} A result object containing the content that was loaded, such as:
     * <ul>
	 *      <li>An image tag (&lt;image /&gt;) for images</li>
	 *      <li>A script tag for JavaScript (&lt;script /&gt;). Note that scripts are automatically added to the HTML
	 *      DOM.</li>
	 *      <li>A style tag for CSS (&lt;style /&gt; or &lt;link &gt;)</li>
	 *      <li>Raw text for TEXT</li>
	 *      <li>A formatted JavaScript object defined by JSON</li>
	 *      <li>An XML document</li>
	 *      <li>A binary arraybuffer loaded by XHR</li>
	 *      <li>An audio tag (&lt;audio &gt;) for HTML audio. Note that it is recommended to use SoundJS APIs to play
	 *      loaded audio. Specifically, audio loaded by Flash and WebAudio will return a loader object using this method
	 *      which can not be used to play audio back.</li>
	 * </ul>
     * This object is also returned via the {{#crossLink "LoadQueue/fileload:event"}}{{/crossLink}}  event as the 'item`
	 * parameter. Note that if a raw result is requested, but not found, the result will be returned instead.
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
	 *
	 * Note that if new items are added to the queue using {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}} or {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}},
	 * a paused queue will be resumed, unless the `loadNow` argument is `false`.
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
	 * @param {String} [path] An optional path prepended to the `src`. The path will only be prepended if the src is
	 * relative, and does not start with a protocol such as `http://`, or a path like `../`. If the LoadQueue was
	 * provided a {{#crossLink "_basePath"}}{{/crossLink}}, then it will optionally be prepended after.
	 * @param {String} [basePath] <strong>Deprecated</strong>An optional basePath passed into a {{#crossLink "LoadQueue/loadManifest"}}{{/crossLink}}
	 * or {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}} call. This parameter will be removed in a future tagged
	 * version.
	 * @private
	 */
	p._addItem = function(value, path, basePath) {
		var item = this._createLoadItem(value, path, basePath); // basePath and manifest path are added to the src.
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
 	 * @param {String} [path] A path to prepend to the item's source. Sources beginning with http:// or similar will
	 * not receive a path. Since PreloadJS 0.4.1, the src will be modified to include the `path` and {{#crossLink "LoadQueue/_basePath:property"}}{{/crossLink}}
	 * when it is added.
	 * @param {String} [basePath] <strong>Deprectated</strong> A base path to prepend to the items source in addition to
	 * the path argument.
	 * @return {Object} The loader instance that will be used.
	 * @private
	 */
	p._createLoadItem = function(value, path, basePath) {
		var item = null;

		// Create/modify a load item
		switch(typeof(value)) {
			case "string":
				item = {
					src: value
				}; break;
			case "object":
				if (window.HTMLAudioElement && value instanceof window.HTMLAudioElement) {
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
				return null;
		}

		// Determine Extension, etc.
		var match = this._parseURI(item.src);
		if (match != null) { item.ext = match[6]; }
		if (item.type == null) {
			item.type = this._getTypeByExtension(item.ext);
		}

		// Inject path & basePath
		var bp = ""; // Store the generated basePath
		var useBasePath = basePath || this._basePath;
		var autoId = item.src;
		if (match && match[1] == null && match[3] == null) {
			if (path) {
				bp = path;
				var pathMatch = this._parsePath(path);
				autoId = path + autoId;
				// Also append basePath
				if (useBasePath != null && pathMatch && pathMatch[1] == null && pathMatch[2] == null) {
					bp = useBasePath + bp;
				}
			} else if (useBasePath != null) {
				bp = useBasePath;
			}
		}
		item.src = bp + item.src;
		item.path = bp;

		if (item.type == createjs.LoadQueue.JSON || item.type == createjs.LoadQueue.MANIFEST) {
			item._loadAsJSONP = (item.callback != null);
		}

		if (item.type == createjs.LoadQueue.JSONP && item.callback == null) {
			throw new Error('callback is required for loading JSONP requests.');
		}

		// Create a tag for the item. This ensures there is something to either load with or populate when finished.
		if (item.tag === undefined || item.tag === null) {
			item.tag = this._createTag(item);
		}

		// If there's no id, set one now.
		if (item.id === undefined || item.id === null || item.id === "") {
            item.id = autoId;
		}

		// Give plugins a chance to modify the loadItem:
		var customHandler = this._typeCallbacks[item.type] || this._extensionCallbacks[item.ext];
		if (customHandler) {
			// Plugins are now passed both the full source, as well as a combined path+basePath (appropriately)
			var result = customHandler.callback.call(customHandler.scope, item.src, item.type, item.id, item.data,
					bp, this);
			// NOTE: BasePath argument is deprecated. We pass it to plugins.allow SoundJS to modify the file. to sanymore. The full path is sent to the plugin

			// The plugin will handle the load, or has canceled it. Ignore it.
			if (result === false) {
				return null;

			// Load as normal:
			} else if (result === true) {
				// Do Nothing

			// Result is a loader class:
			} else {
				if (result.src != null) { item.src = result.src; }
				if (result.id != null) { item.id = result.id; } // TODO: Evaluate this. An overridden ID could be problematic
				if (result.tag != null) { // Assumes that the returned tag either has a load method or a src setter.
					item.tag = result.tag;
				}
                if (result.completeHandler != null) { item.completeHandler = result.completeHandler; }

				// Allow type overriding:
				if (result.type) { item.type = result.type; }

				// Update the extension in case the type changed:
				match = this._parseURI(item.src);
				if (match != null && match[6] != null) {
					item.ext = match[6].toLowerCase();
				}
			}
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
			case createjs.LoadQueue.MANIFEST:
				useXHR = !item._loadAsJSONP;
				break;
			case createjs.LoadQueue.XML:
			case createjs.LoadQueue.TEXT:
				useXHR = true; // Always use XHR2 with text/XML
				break;
			case createjs.LoadQueue.SOUND:
			case createjs.LoadQueue.JSONP:
				useXHR = false; // Never load audio using XHR. WebAudio will provide its own loader.
				break;
			case null:
				return null;
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

		// Only dispatch loadstart event when the first file is loaded.
		if (!this._loadStartWasDispatched) {
			this._sendLoadStart();
			this._loadStartWasDispatched = true;
		}

		// The queue has completed.
		if (this._numItems == this._numItemsLoaded) {
			this.loaded = true;
			this._sendComplete();

			// Load the next queue, if it has been defined.
			if (this.next && this.next.load) {
				this.next.load();
			}
		} else {
			this.loaded = false;
		}

		// Must iterate forwards to load in the right order.
		for (var i=0; i<this._loadQueue.length; i++) {
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
  			i--;
            this._loadItem(loader);
		}
	};

	/**
	 * Begin loading an item. Events are not added to the loaders until the load starts.
	 * @method _loadItem
	 * @param {AbstractLoader} loader The loader instance to start. Currently, this will be an XHRLoader or TagLoader.
	 * @private
	 */
	p._loadItem = function(loader) {
		loader.on("progress", this._handleProgress, this);
		loader.on("complete", this._handleFileComplete, this);
		loader.on("error", this._handleFileError, this);
		this._currentLoads.push(loader);
		this._sendFileStart(loader.getItem());
		loader.load();
	};

	/**
	 * The callback that is fired when a loader encounters an error. The queue will continue loading unless {{#crossLink "LoadQueue/stopOnError:property"}}{{/crossLink}}
	 * is set to `true`.
	 * @method _handleFileError
	 * @param {Object} event The error event, containing relevant error information.
	 * @private
	 */
	p._handleFileError = function(event) {
		var loader = event.target;
		this._numItemsLoaded++;
		this._updateProgress();

		var newEvent = new createjs.Event("error");
		newEvent.text = "FILE_LOAD_ERROR";
		newEvent.item = loader.getItem();
		// TODO: Propagate actual error message.

		this._sendError(newEvent);

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
				this._loadedScripts[createjs.indexOf(this._scriptOrder, item)] = item;
				this._checkScriptLoadOrder(loader);
				return;
			}
		}

		// Clean up the load item
		delete item._loadAsJSONP;

		// If the item was a manifest, then
		if (item.type == createjs.LoadQueue.MANIFEST) {
			var result = loader.getResult();
			if (result != null && result.manifest !== undefined) {
				this.loadManifest(result, true);
			}
		}

		this._processFinishedLoad(item, loader);
	};

	/**
	 * @method _processFinishedLoad
	 * @param {Object} item
	 * @param {AbstractLoader} loader
	 * @protected
	 */
	p._processFinishedLoad = function(item, loader) {
		// Old handleFileTagComplete follows here.
		this._numItemsLoaded++;

		this._updateProgress();
		this._sendFileComplete(item, loader);

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

			// Append script tags to the head automatically. Tags do this in the loader, but XHR scripts have to maintain order.
			var loadItem = this._loadedResults[item.id];
			(document.body || document.getElementsByTagName("body")[0]).appendChild(loadItem);

			this._processFinishedLoad(item);
			this._loadedScripts[i] = true;
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
	};

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
	p._createTag = function(item) {
		var tag = null;
		switch (item.type) {
			case createjs.LoadQueue.IMAGE:
				tag = document.createElement("img");
				if (!this._isLocal(item)) { tag.crossOrigin = "Anonymous"; }
				return tag;
			case createjs.LoadQueue.SOUND:
				tag = document.createElement("audio");
				tag.autoplay = false;
				// Note: The type property doesn't seem necessary.
				return tag;
			case createjs.LoadQueue.JSON:
			case createjs.LoadQueue.JSONP:
			case createjs.LoadQueue.JAVASCRIPT:
			case createjs.LoadQueue.MANIFEST:
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
		if (extension == null) {
			return createjs.LoadQueue.TEXT;
		}
		switch (extension.toLowerCase()) {
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
		if (!this.hasEventListener("fileprogress")) { return; }

		var event = new createjs.Event("fileprogress");
		event.progress = progress;
		event.loaded = progress;
		event.total = 1;
		event.item = item;

		this.dispatchEvent(event);
	};

	/**
	 * Dispatch a fileload event. Please see the {{#crossLink "LoadQueue/fileload:event"}}{{/crossLink}} event for
	 * details on the event payload.
	 * @method _sendFileComplete
	 * @param {Object} item The item that is being loaded.
	 * @param {TagLoader | XHRLoader} loader
	 * @protected
	 */
	p._sendFileComplete = function(item, loader) {
		if (this._isCanceled()) { return; }

		var event = new createjs.Event("fileload");
		event.loader = loader;
		event.item = item;
		event.result = this._loadedResults[item.id];
		event.rawResult = this._loadedRawResults[item.id];

        // This calls a handler specified on the actual load item. Currently, the SoundJS plugin uses this.
        if (item.completeHandler) {
            item.completeHandler(event);
        }

		this.hasEventListener("fileload") && this.dispatchEvent(event)
	};

	/**
	 * Dispatch a filestart event immediately before a file starts to load. Please see the {{#crossLink "LoadQueue/filestart:event"}}{{/crossLink}}
	 * event for details on the event payload.
	 * @method _sendFileStart
	 * @param {Object} item The item that is being loaded.
	 * @protected
	 */
	p._sendFileStart = function(item) {
		var event = new createjs.Event("filestart");
		event.item = item;
		this.hasEventListener("filestart") && this.dispatchEvent(event);
	};

	/**
	 * REMOVED.  Use createjs.proxy instead
	 * @method proxy
	 * @param {Function} method The function to call
	 * @param {Object} scope The scope to call the method name on
	 * @static
	 * @private
	 * @deprecated In favour of the createjs.proxy method (see LoadQueue source).
	 */

	p.toString = function() {
		return "[PreloadJS LoadQueue]";
	};

	createjs.LoadQueue = LoadQueue;


// Helper methods

	// An additional module to determine the current browser, version, operating system, and other environmental variables.
	var BrowserDetect = function() {}

	BrowserDetect.init = function() {
		var agent = navigator.userAgent;
		BrowserDetect.isFirefox = (agent.indexOf("Firefox") > -1);
		BrowserDetect.isOpera = (window.opera != null);
		BrowserDetect.isChrome = (agent.indexOf("Chrome") > -1);
		BrowserDetect.isIOS = agent.indexOf("iPod") > -1 || agent.indexOf("iPhone") > -1 || agent.indexOf("iPad") > -1;
	};

	BrowserDetect.init();

	createjs.LoadQueue.BrowserDetect = BrowserDetect;

}());
