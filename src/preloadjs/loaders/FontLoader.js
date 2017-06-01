/*
 * FontLoader
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

// constructor:
	/**
	 * A loader that handles font files, CSS definitions, and CSS paths. FontLoader doesn't actually preload fonts
	 * themselves, but rather generates CSS definitions, and then tests the size changes on an HTML5 Canvas element.
	 *
	 * Note that FontLoader does not support tag-based loading due to the requirement that CSS be read to determine the
	 * font definitions to test for.
	 * @class FontLoader
	 * @param {LoadItem|object|string} loadItem The item to be loaded.
	 * @extends AbstractLoader
	 * @constructor
	 **/
	function FontLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, loadItem.type);

		// private properties:
		/**
		 * A lookup of font faces to load.
		 * @property _faces
		 * @protected
		 * @type Object
		 **/
		this._faces = {};

		/**
		 * A list of font faces currently being "watched". Watched fonts will be tested on a regular interval, and be
		 * removed from this list when they are complete.
		 * @oroperty _watched
		 * @type {Array}
		 * @protected
		 */
		this._watched = [];

		/**
		 * A count of the total font faces to load.
		 * @property _count
		 * @type {number}
		 * @protected
		 * @default 0
		 */
		this._count = 0;

		/**
		 * The interval for checking if fonts have been loaded.
		 * @property _watchInterval
		 * @type {Number}
		 * @protected
		 */
		this._watchInterval = null;

		/**
		 * The timeout for determining if a font can't be loaded. Uses the LoadItem {{#crossLink "LoadImte/timeout:property"}}{{/crossLink}}
		 * value.
		 * @property _loadTimeout
		 * @type {Number}
		 * @protected
		 */
		this._loadTimeout = null;
		/**
		 * Determines if generated CSS should be injected into the document.
		 * @property _injectCSS
		 * @type {boolean}
		 * @protected
		 */
		this._injectCSS = (loadItem.injectCSS === undefined) ? true : loadItem.injectCSS;

		this.dispatchEvent("initialize");
	}
	var p = createjs.extend(FontLoader, createjs.AbstractLoader);
    
    /**
     * Determines if the loader can load a specific item. This loader can only load items that are of type
     * {{#crossLink "Types/FONT:property"}}{{/crossLink}}.
     * @method canLoadItem
     * @param {LoadItem|Object} item The LoadItem that a LoadQueue is trying to load.
     * @returns {Boolean} Whether the loader can load the item.
     * @static
     */
    FontLoader.canLoadItem = function (item) {
        return item.type == createjs.Types.FONT || item.type == createjs.Types.FONTCSS;
    };

// static properties:
	/**
	 * Sample text used by the FontLoader to determine if the font has been loaded. The sample text size is compared
	 * to the loaded font size, and a change indicates that the font has completed.
	 * @property sampleText
	 * @type {String}
	 * @default abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ
	 * @static
	 * @private
	 */
	FontLoader.sampleText = "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ";

	/**
	 * The canvas context used to test the font size. Note that this currently requires an HTML DOM.
	 * @property _ctx
	 * @type {CanvasRenderingContext2D}
	 * @static
	 * @private
	 */
	FontLoader._ctx = document.createElement("canvas").getContext("2d"); // TODO: Consider a method to do this like EaselJS Stage has.

	/**
	 * A list of reference fonts to test. Multiple faces are tested to address the rare case of a loaded font being the
	 * exact same dimensions as the test font.
	 * @property _referenceFonts
	 * @type {Array}
	 * @default ["serif", "monospace"]
	 * @private
	 */
	FontLoader._referenceFonts = ["serif","monospace"];

	/**
	 * A regular expression that pulls out possible style values from the font name.
	 * <ul>
	 *     <li>This includes font names that include thin, normal, book, regular, medium, black, and heavy (such as
	 *     "Arial Black")</li>
	 *     <li>Weight modifiers including extra, ultra, semi, demi, light, and bold (such as "WorkSans SemiBold")</li>
	 * </ul>
	 *
	 * Weight descriptions map to font weight values by default using the following (from
	 * http://www.w3.org/TR/css3-fonts/#font-weight-numeric-values):
	 * <ul>
	 *     <li>100 - Thin</li>
	 * 	   <li>200 - Extra Light, Ultra Light</li>
	 *     <li>300 - Light, Semi Light, Demi Light</li>
	 *     <li>400 - Normal, Book, Regular</li>
	 *     <li>500 - Medium</li>
	 *     <li>600 - Semi Bold, Demi Bold</li>
	 *     <li>700 - Bold</li>
	 *     <li>800 - Extra Bold, Ultra Bold</li>
	 *     <li>900 - Black, Heavy</li>
	 * </ul>
	 * @property WEIGHT_REGEX
	 * @type {RegExp}
	 * @static
	 */
	FontLoader.WEIGHT_REGEX = /[- ._]*(thin|normal|book|regular|medium|black|heavy|[1-9]00|(?:extra|ultra|semi|demi)?[- ._]*(?:light|bold))[- ._]*/ig;

	/**
	 * A regular expression that pulls out possible style values from the font name. These include "italic"
	 * and "oblique".
	 * @property STYLE_REGEX
	 * @type {RegExp}
	 * @static
	 */
	FontLoader.STYLE_REGEX = /[- ._]*(italic|oblique)[- ._]*/ig;

	/**
	 * A lookup of font types for generating a CSS definition. For example, TTF fonts requires a "truetype" type.
	 * @property FONT_FORMAT
	 * @type {Object}
	 * @static
	 */
	FontLoader.FONT_FORMAT = {woff2:"woff2", woff:"woff", ttf:"truetype", otf:"truetype"};

	/**
	 * A lookup of font weights based on a name. These values are from http://www.w3.org/TR/css3-fonts/#font-weight-numeric-values.
	 * @property FONT_WEIGHT
	 * @type {Object}
	 * @static
	 */
	FontLoader.FONT_WEIGHT = {thin:100, extralight:200, ultralight:200, light:300, semilight:300, demilight:300, book:"normal", regular:"normal", semibold:600, demibold:600, extrabold:800, ultrabold:800, black:900, heavy:900};

	/**
	 * The frequency in milliseconds to check for loaded fonts.
	 * @property WATCH_DURATION
	 * @type {number}
	 * @default 10
	 * @static
	 */
	FontLoader.WATCH_DURATION = 10;
// public methods:
	p.load = function() {
		if (this.type == createjs.Types.FONTCSS) {
			var loaded = this._watchCSS();

			// If the CSS is not ready, it will create a request, which AbstractLoader can handle.
			if (!loaded) {
				this.AbstractLoader_load();
				return;
			}

		} else if (this._item.src instanceof Array) {
			this._watchFontArray();
		} else {
			var def = this._defFromSrc(this._item.src);
			this._watchFont(def);
			this._injectStyleTag(this._cssFromDef(def));
		}

		this._loadTimeout = setTimeout(createjs.proxy(this._handleTimeout, this), this._item.loadTimeout);

		this.dispatchEvent("loadstart");
	};

	/**
	 * The font load has timed out. This is called via a <code>setTimeout</code>.
	 * callback.
	 * @method _handleTimeout
	 * @protected
	 */
	p._handleTimeout = function () {
		this._stopWatching();
		this.dispatchEvent(new createjs.ErrorEvent("PRELOAD_TIMEOUT"));
	};

	// WatchCSS does the work for us, and provides a modified src.
	p._createRequest = function() {
		return this._request;
	};

	// Events come from the internal XHR loader.
	p.handleEvent = function (event) {
		switch (event.type) {
			case "complete":
				this._rawResult = event.target._response;
				this._result = true;
				this._parseCSS(this._rawResult);
				break;

			case "error":
				this._stopWatching();
				this.AbstractLoader_handleEvent(event);
				break;
		}
	};

// private methods:
	/**
	 * Determine if the provided CSS is a string definition, CSS HTML element, or a CSS file URI. Depending on the
	 * format, the CSS will be parsed, or loaded.
	 * @method _watchCSS
	 * @returns {boolean} Whether or not the CSS is ready
	 * @protected
	 */
	p._watchCSS = function() {
		var src = this._item.src;

		// An HTMLElement was passed in. Just use it.
		if (src instanceof HTMLStyleElement) {
			if (this._injectCSS && !src.parentNode) { (document.head || document.getElementsByTagName('head')[0]).appendChild(src); }
			this._injectCSS = false;
			src = "\n"+src.textContent;
		}

		// A CSS string was passed in. Parse and use it
		if (src.search(/\n|\r|@font-face/i) !== -1) { // css string.
			this._parseCSS(src);
			return true;
		}

		// Load a CSS Path. Note that we CAN NOT load it without XHR because we need to read the CSS definition
		this._request = new createjs.XHRRequest(this._item);
		return false;
	};

	/**
	 * Parse a CSS string to determine the fonts to load.
	 * @method _parseCSS
	 * @param {String} css The CSS string to parse
	 * @protected
	 */
	p._parseCSS = function(css) {
		var regex = /@font-face\s*\{([^}]+)}/g
		while (true) {
			var result = regex.exec(css);
			if (!result) { break; }
			this._watchFont(this._parseFontFace(result[1]));
		}
		this._injectStyleTag(css);
	};

	/**
	 * The provided fonts were an array of object or string definitions. Parse them, and inject any that are ready.
	 * @method _watchFontArray
	 * @protected
	 */
	p._watchFontArray = function() {
		var arr = this._item.src, css = "", def;
		for (var i=arr.length-1; i>=0; i--) {
			var o = arr[i];
			if (typeof o === "string") { def = this._defFromSrc(o) }
			else { def = this._defFromObj(o); }
			this._watchFont(def);
			css += this._cssFromDef(def)+"\n";
		}
		this._injectStyleTag(css);
	};

	/**
	 * Inject any style definitions into the document head. This is necessary when the definition is just a string or
	 * object definition in order for the styles to be applied to the document. If the loaded fonts are already HTML CSS
	 * elements, they don't need to be appended again.
	 * @method _injectStyleTag
	 * @param {String} css The CSS string content to be appended to the
	 * @protected
	 */
	p._injectStyleTag = function(css) {
		if (!this._injectCSS) { return; }
		var head = document.head || document.getElementsByTagName('head')[0];
		var styleTag = document.createElement("style");
		styleTag.type = "text/css";
		if (styleTag.styleSheet){
			styleTag.styleSheet.cssText = css;
		} else {
			styleTag.appendChild(document.createTextNode(css));
		}
		head.appendChild(styleTag);
	};

	/**
	 * Determine the font face from a CSS definition.
	 * @method _parseFontFace
	 * @param {String} str The CSS string definition
	 * @protected
	 * @return {String} A modified CSS object containing family name, src, style, and weight
	 */
	p._parseFontFace = function(str) {
		var family = this._getCSSValue(str, "font-family"), src = this._getCSSValue(str, "src");
		if (!family || !src) { return null; }
		return this._defFromObj({
			family: family,
			src: src,
			style: this._getCSSValue(str, "font-style"),
			weight: this._getCSSValue(str, "font-weight")
		});
	};

	/**
	 * Add a font to the list of fonts currently being watched. If the font is already watched or loaded, it won't be
	 * added again.
	 * @method _watchFont
	 * @param {Object} def The font definition
	 * @protected
	 */
	p._watchFont = function(def) {
		if (!def || this._faces[def.id]) { return; }
		this._faces[def.id] = def;
		this._watched.push(def);
		this._count++;

		this._calculateReferenceSizes(def);
		this._startWatching();
	};

	/**
	 * Create a interval to check for loaded fonts. Only one interval is used for all fonts. The fonts are checked based
	 * on the {{#crossLink "FontLoader/WATCH_DURATION:property"}}{{/crossLink}}.
	 * @method _startWatching
	 * @protected
	 */
	p._startWatching = function() {
		if (this._watchInterval != null) { return; }
		this._watchInterval = setInterval(createjs.proxy(this._watch, this), FontLoader.WATCH_DURATION);
	};

	/**
	 * Clear the interval used to check fonts. This happens when all fonts are loaded, or an error occurs, such as a
	 * CSS file error, or a load timeout.
	 * @method _stopWatching
	 * @protected
	 */
	p._stopWatching = function() {
		clearInterval(this._watchInterval);
		clearTimeout(this._loadTimeout);
		this._watchInterval = null;
	};

	/**
	 * Check all the fonts that have not been loaded. The fonts are drawn to a canvas in memory, and if their font size
	 * varies from the default text size, then the font is considered loaded.
	 *
	 * A {{#crossLink "AbstractLoader/fileload"}}{{/crossLink}} event will be dispatched when each file is loaded, along
	 * with the font family name as the `item` value. A {{#crossLink "ProgressEvent"}}{{/crossLink}} is dispatched a
	 * maximum of one time per check when any fonts are loaded, with the {{#crossLink "ProgressEvent/progress:property"}}{{/crossLink}}
	 * value showing the percentage of fonts that have loaded.
	 * @method _watch
	 * @protected
	 */
	p._watch = function() {
		var defs = this._watched, refFonts = FontLoader._referenceFonts, l = defs.length;
		for (var i = l - 1; i >= 0; i--) {
			var def = defs[i], refs = def.refs;
			for (var j = refs.length - 1; j >= 0; j--) {
				var w = this._getTextWidth(def.family + "," + refFonts[j], def.weight, def.style);
				if (w != refs[j]) {
					var event = new createjs.Event("fileload");
					def.type = "font-family";
					event.item = def;
					this.dispatchEvent(event);
					defs.splice(i, 1);
					break;
				}
			}
		}
		if (l !== defs.length) {
			var event = new createjs.ProgressEvent(this._count-defs.length, this._count);
			this.dispatchEvent(event);
		}
		if (l === 0) {
			this._stopWatching();
			this._sendComplete();
		}
	};

	/**
	 * Determine the default size of the reference fonts used to compare against loaded fonts.
	 * @method _calculateReferenceSizes
	 * @param {Object} def The font definition to get the size of.
	 * @protected
	 */
	p._calculateReferenceSizes = function(def) {
		var refFonts = FontLoader._referenceFonts;
		var refs = def.refs = [];
		for (var i=0; i<refFonts.length; i++) {
			refs[i] = this._getTextWidth(refFonts[i], def.weight, def.style);
		}
	};

	/**
	 * Get a CSS definition from a font source and name.
	 * @method _defFromSrc
	 * @param {String} src The font source
	 * @protected
	 */
	p._defFromSrc = function(src) {
		var re = /[- ._]+/g, name = src, ext = null, index;
		
		index = name.search(/[?#]/);
		if (index !== -1) {
			name = name.substr(0,index);
		}
		index = name.lastIndexOf(".");
		if (index !== -1) {
			ext = name.substr(index+1);
			name = name.substr(0,index);
		}
		index = name.lastIndexOf("/");
		if (index !== -1) {
			name = name.substr(index+1);
		}
		
		var family = name,
				weight = family.match(FontLoader.WEIGHT_REGEX);
		if (weight) {
			weight = weight[0];
			family = family.replace(weight, "");
			weight = weight.replace(re, "").toLowerCase();
		}
		var style = name.match(FontLoader.STYLE_REGEX);
		if (style) {
			family = family.replace(style[0], "");
			style = "italic";
		}
		family = family.replace(re, "");
		
		var cssSrc = "local('"+name.replace(re," ")+"'), url('"+src+"')";
		var format = FontLoader.FONT_FORMAT[ext];
		if (format) { cssSrc += " format('"+format+"')"; }
		
		return this._defFromObj({
			family: family,
			weight: FontLoader.FONT_WEIGHT[weight]||weight,
			style: style,
			src: cssSrc
		});
	};

	/**
	 * Get a font definition from a raw font object.
	 * @method _defFromObj
	 * @param {Object} o A raw object provided to the FontLoader
	 * @returns {Object} A standard font object that the FontLoader understands
	 * @protected
	 */
	p._defFromObj = function(o) {
		var def = {
			family: o.family,
			src: o.src,
			style: o.style || "normal",
			weight: o.weight || "normal"
		};
		def.id = def.family + ";" + def.style + ";" + def.weight;
		return def;
	};

	/**
	 * Get CSS from a font definition.
	 * @method _cssFromDef
	 * @param {Object} def A font definition
	 * @returns {string} A CSS string representing the object
	 * @protected
	 */
	p._cssFromDef = function(def) {
		return "@font-face {\n" +
			"\tfont-family: '"+def.family+"';\n" +
			"\tfont-style: "+def.style+";\n" +
			"\tfont-weight: "+def.weight+";\n" +
			"\tsrc: "+def.src+";\n" +
			"}";
	};

	/**
	 * Get the text width of text using the family, weight, and style
	 * @method _getTextWidth
	 * @param {String} family The font family
	 * @param {String} weight The font weight
	 * @param {String} style The font style
	 * @returns {Number} The pixel measurement of the font.
	 * @protected
	 */
	p._getTextWidth = function(family, weight, style) {
		var ctx = FontLoader._ctx;
		ctx.font = style+" "+weight+" 72px "+family;
		return ctx.measureText(FontLoader.sampleText).width;
	};

	/**
	 * Get the value of a property from a CSS string. For example, searches a CSS string for the value of the
	 * "font-family" property.
	 * @method _getCSSValue
	 * @param {String} str The CSS string to search
	 * @param {String} propName The property name to get the value for
	 * @returns {String} The value in the CSS for the provided property name
	 * @protected
	 */
	p._getCSSValue = function(str, propName) {
		var regex = new RegExp(propName+":\s*([^;}]+?)\s*[;}]");
		var result = regex.exec(str);
		if (!result || !result[1]) { return null; }
		return result[1];
	};

	createjs.FontLoader = createjs.promote(FontLoader, "AbstractLoader");

})();


