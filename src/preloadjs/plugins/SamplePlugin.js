/**
 * @module PreloadJS
 */

(function () {
	"use strict";

	/**
	 * A PreloadJS plugin provides a way to inject functionality into PreloadJS to load file types that are unsupported,
	 * or in a way that PreloadJS does not.
	 *
	 * <strong>Note that this class is mainly for documentation purposes, and is not a real plugin.</strong>
	 *
	 * Plugins are registered based on file extension, or supported preload types, which are defined as constants on
	 * the {{#crossLink "LoadQueue"}}{{/crossLink}} class. Available load types are:
	 * <ul>
	 *     <li>binary ({{#crossLink "LoadQueue/BINARY:property"}}{{/crossLink}})</li>
	 *     <li>css ({{#crossLink "LoadQueue/CSS:property"}}{{/crossLink}})</li>
	 *     <li>image ({{#crossLink "LoadQueue/IMAGE:property"}}{{/crossLink}})</li>
	 *     <li>javascript ({{#crossLink "LoadQueue/JAVASCRIPT:property"}}{{/crossLink}})</li>
	 *     <li>json ({{#crossLink "LoadQueue/JSON:property"}}{{/crossLink}})</li>
	 *     <li>jsonp ({{#crossLink "LoadQueue/JSONP:property"}}{{/crossLink}})</li>
	 *     <li>manifest ({{#crossLink "LoadQueue/MANIFEST:property"}}{{/crossLink}})</li>
	 *     <li>sound ({{#crossLink "LoadQueue/SOUND:property"}}{{/crossLink}})</li>
	 *     <li>spriteSheet ({{#crossLink "LoadQueue/SPRITESHEET:property"}}{{/crossLink}})</li>
	 *     <li>svg ({{#crossLink "LoadQueue/SVG:property"}}{{/crossLink}})</li>
	 *     <li>text ({{#crossLink "LoadQueue/TEXT:property"}}{{/crossLink}})</li>
	 *     <li>xml ({{#crossLink "LoadQueue/XML:property"}}{{/crossLink}})</li>
	 * </ul>
	 *
	 * A plugin defines what types or extensions it handles via a {{#crossLink "SamplePlugin/getPreloadHandlers"}}{{/crossLink}}
	 * method, which is called when a plugin is first registered.
	 *
	 * To register a plugin with PreloadJS, simply install it into a LoadQueue before files begin to load using the
	 * {{#crossLink "LoadQueue/installPlugin"}}{{/crossLink}} method:
	 *
	 *      var queue = new createjs.LoadQueue();
	 *      queue.installPlugin(createjs.SamplePlugin);
	 *      queue.loadFile("test.jpg");
	 *
	 * The {{#crossLink "SamplePlugin/getPreloadHandlers"}}{{/crossLink}} method can also return a `callback`
	 * property, which is a function that will be invoked before each file is loaded. Check out the {{#crossLink "SamplePlugin/preloadHandler"}}{{/crossLink}}
	 * for more information on how the callback works. For example, the SoundJS plugin allows PreloadJS to manage a
	 * download that uses the Flash Player.
	 *
	 * @class SamplePlugin
	 * @static
	 */
	var SamplePlugin = function () {
	};
	var s = SamplePlugin;

	/**
	 * When a plugin is installed, this method will be called to let PreloadJS know when to invoke the plugin.
	 *
	 * PreloadJS expects this method to return an object containing:
	 * <ul>
	 *     <li><strong>callback:</strong> The function to call on the plugin class right before an item is loaded. Check
	 *     out the {{#crossLink "SamplePlugin/preloadHandler"}}{{/crossLink}} method for more information. The callback
	 *     is automatically called in the scope of the plugin.</li>
	 *     <li><strong>types:</strong> An array of recognized PreloadJS load types to handle. Supported load types are
	 *     "binary","image", "javascript", "json", "jsonp", "sound", "svg", "text", and "xml".</li>
	 *     <li><strong>extensions:</strong> An array of strings containing file extensions to handle, such as "jpg",
	 *     "mp3", etc. This only fires if an applicable type handler is not found by the plugin.</li>
	 * </ul>
	 *
	 * Note that currently, PreloadJS only supports a single handler for each extension or file type.
	 *
	 * <h4>Example</h4>
	 *
	 *      // Check out the SamplePlugin source for a more complete example.
	 *      SamplePlugin.getPreloadHandlers = function() {
	 *          return {
	 *              callback: SamplePlugin.preloadHandler,
	 *              extensions: ["jpg", "jpeg", "png", "gif"]
	 *          }
	 *      }
	 *
	 * If a plugin provides both "type" and "extension" handlers, the type handler will take priority, and will only
	 * fire once per file. For example if you have a handler for type=sound, and for extension=mp3, the callback will
	 * fire when it matches the type.
	 *
	 * @method getPreloadHandlers
	 * @return {Object} An object defining a callback, type handlers, and extension handlers (see description)
	 */
	s.getPreloadHandlers = function () {
		return {
			callback: s.preloadHandler, // Proxy the method to maintain scope
			types: ["image"],
			extensions: ["jpg", "jpeg", "png", "gif"]
		}
	};

	/**
	 * This is a sample method to show how to handle the callback specified in the {{#crossLink "LoadQueue/getPreloadHandlers"}}{{/crossLink}}.
	 * Right before a file is loaded, if a plugin for the file type or extension is found, then the callback for that
	 * plugin will be invoked. This gives the plugin an opportunity to modify the load item, or even cancel the load.
	 * The return value of the callback determines how PreloadJS will handle the file:
	 * <ul>
	 *     <li><strong>false:</strong> Skip the item. This allows plugins to determine if a file should be loaded or
	 *     not. For example,the plugin could determine if a file type is supported at all on the current system, and
	 *     skip those that do not.</li>
	 *     <li><strong>true:</strong> Continue normally. The plugin will not affect the load.</li>
	 *     <li><strong>AbstractLoader instance:</strong> Used as the loader for the content. This is new in 0.6.0.</li>
	 * </ul>
	 *
	 * Since the {{#crossLink "LoadItem"}}{{/crossLink}} is passed by reference, a plugin can modify as needed, even
	 * appending additional data to it. Note that if the {{#crossLink "LoadItem/src:property"}}{{/crossLink}} is
	 * modified, PreloadJS will automatically update the {{#crossLink "LoadItem/ext:property"}}{{/crossLink}} property.
	 *
	 * <h4>Example</h4>
	 *
	 *      // Cancel a load
	 *      SamplePlugin.preloadHandler = function(loadItem, queue) {
     *          if (loadItem.id.indexOf("thumb") { return false; } // Don't load items like "image-thumb.png"
     *          return true;
     *      }
	 *
	 *      // Specify a completeHandler
	 *      SamplePlugin.preloadHandler = function(loadItem, queue) {
	 *          item.completeHandler = SamplePlugin.fileLoadHandler;
	 *      }
	 *
	 *      // Check out the SamplePlugin source to see another example.
	 *
	 * <em>Note: In 0.4.2 and earlier, instead of a {{#crossLink "LoadItem"}}{{/crossLink}}, arguments were passed in,
	 * and a modified object was returned to PreloadJS. This has been changed to passing a reference to the LoadItem,
	 * which can be directly modified.</em>
	 *
	 * @method preloadHandler
	 * @param {LoadItem|Object} loadItem The item that PreloadJS is going to load. This item is passes by reference,
	 * so it can be directly modified.
	 * @param {LoadQueue} queue The {{#crossLink "LoadQueue"}}{{/crossLink}} instance that is preloading the item.
	 * @return {Boolean|AbstractLoader} How PreloadJS should handle the load. See the main description for more info.
	 */
	s.preloadHandler = function (loadItem, queue) {
		var options = {};

		// Tell PreloadJS to skip this file
		if (options.stopDownload) { return false; }

		// Tell PreloadJS to continue normally
		if (options.doNothing) { return true; }

		// Modify the LoadItem
		loadItem.id = "newId";
		loadItem.completeHandler = createjs.proxy(s.fileCompleteHandler, s);

		// Return a new loader. This is an advanced usage, similar to what SoundJS does.
		var loader = new createjs.ImageLoader(loadItem);
		loader.on("complete", createjs.proxy(s.fileCompleteHandler, s));

		return loader;
	};

	/**
	 * This is a sample method to show a `completeHandler`, which is optionally specified by the return object in the
	 * {{#crossLink "SamplePlugin/preloadHandler"}}{{/crossLink}}. This sample provides a `completeHandler` to the
	 * {{#crossLink "LoadItem"}}{{/crossLink}}. This method is called after the item has completely loaded, but before
	 * the {{#crossLink "LoadQueue/fileload:event"}}{{/crossLink}} event is dispatched from the {{#crossLink "LoadQueue"}}{{/crossLink}}.
	 *
	 * The provided sample also listens for the {{#crossLink "AbstractLoader/complete:event"}}{{/crossLink}}
	 * event on the loader it returns to show a different usage.
	 *
	 * @method fileLoadHandler
	 * @param event {Event} A {{#crossLink "LoadQueue/fileload:event"}}{{/crossLink}} event.
	 */
	s.fileLoadHandler = function (event) {
		// Do something with the result.
	};

	createjs.SamplePlugin = SamplePlugin;

}());
