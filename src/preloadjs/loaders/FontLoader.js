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
 
 /*
 
 Notes:
 getResult should probably just return true?
 defFromSrc
 defFromCSSSrc
 
 Param examples:
 [font list], "font"
 fontName, "font"?
 src
 css
 
100 - Thin
200 - Extra Light, Ultra Light
300 - Light, Semi Light, Demi Light
400 - Normal, Book, Regular
500 - Medium
600 - Semi Bold, Demi Bold
700 - Bold
800 - Extra Bold, Ultra Bold
900 - Black, Heavy
 From: http://www.w3.org/TR/css3-fonts/#font-weight-numeric-values
 With addition of book, regular, semi light, demi light
 
 http://jsfiddle.net/7aw9mkqn/
 
 Italic & Oblique are both translated to italic.
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
	 * Description
	 * @class FontLoader
	 * @constructor
	 **/
	function FontLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, loadItem.type);

		// public properties:

		// private properties:
		this._faces = {};
		this._watched = [];
		this._count = 0;

		this._watchInterval = null;
		this._loadTimeout = null;
		this._injectCSS = (loadItem.injectCSS === undefined) ? true : loadItem.injectCSS;

		this.dispatchEvent("initialize");
	}
	var p = createjs.extend(FontLoader, createjs.AbstractLoader);
    
    /**
     * Determines if the loader can load a specific item. This loader can only load items that are of type
     * {{#crossLink "AbstractLoader/FONT:property"}}{{/crossLink}}.
     * @method canLoadItem
     * @param {LoadItem|Object} item The LoadItem that a LoadQueue is trying to load.
     * @returns {Boolean} Whether the loader can load the item.
     * @static
     */
    FontLoader.canLoadItem = function (item) {
        return item.type == createjs.AbstractLoader.FONT || item.type == createjs.AbstractLoader.FONTCSS;
    };


// static properties:
	FontLoader.sampleText = "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	FontLoader._ctx = document.createElement("canvas").getContext("2d");
	FontLoader._referenceFonts = ["serif","monospace"];
	
	FontLoader.WEIGHT_REGEX = /[- ._]*(thin|normal|book|regular|medium|black|heavy|[1-9]00|(?:extra|ultra|semi|demi)?[- ._]*(?:light|bold))[- ._]*/ig;
	FontLoader.STYLE_REGEX = /[- ._]*(italic|oblique)[- ._]*/ig;
	FontLoader.FONT_FORMAT = {"woff2":"woff2", woff:"woff", ttf:"truetype", otf:"truetype"};
	FontLoader.FONT_WEIGHT = {thin:100, extralight:200, ultralight:200, light:300, semilight:300, demilight:300, book:"normal", regular:"normal", semibold:600, demibold:600, extrabold:800, ultrabold:800, black:900, heavy:900};

// public methods:
	p.load = function() {
		if (this.type == createjs.AbstractLoader.FONTCSS) {
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

	p._handleTimeout = function () {
		this._stopWatching();
		this.dispatchEvent(new createjs.ErrorEvent("PRELOAD_TIMEOUT", null, event));
	};

	// WatchCSS does the work for us, and provides a modified src.
	p._createRequest = function() {
		return this._request;
	};

	p.handleEvent = function (event) {
		switch (event.type) {
			case "complete":
				clearTimeout(this._loadTimeout);
				this._rawResult = event.target._response;
				this._result = true;
				this._parseCSS(this._rawResult);
				return;
				break;
			case "error":
				clearTimeout(this._loadTimeout);
				this._stopWatching(); // Might not be necessary since fonts haven't started watching
				this.AbstractLoader_handleEvent(event);
				break;
		}
	};

// private methods:
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

		// Load a CSS Path. Note that we CAN NOT load it without XHR. LM: Why not?
		this._request = new createjs.XHRRequest(this._item);
		return false;
	};
	
	p._parseCSS = function(css) {
		var regex = /@font-face\s*\{([^}]+)}/g
		while (true) {
			var result = regex.exec(css);
			if (!result) { break; }
			this._watchFont(this._parseFontFace(result[1]));
		}
		this._injectStyleTag(css);
	};
	
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
	
	p._injectStyleTag = function(css) {
		//TODO: Maybe use an internal CSSLoader instance.
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
	
	p._parseFontFace = function(str) {
		var family = this._getCSSValue(str, "font-family"), src = this._getCSSValue(str, "src");
		if (!family || !src) { return; }
		return this._defFromObj({
			family: family,
			src: src,
			style: this._getCSSValue(str, "font-style"),
			weight: this._getCSSValue(str, "font-weight")
		});
	};
	
	p._watchFont = function(def) {
		if (!def || this._faces[def.id]) { return; }
		this._faces[def.id] = def;
		this._watched.push(def);
		this._count++;
		
		this._calculateReferenceSizes(def);
		this._startWatching();
	};
	
	p._startWatching = function() {
		if (this._watchInterval != null) { return; }
		this._watchInterval = setInterval(createjs.proxy(this._watch, this), FontLoader.WATCH_DURATION);
	};
	
	p._stopWatching = function() {
		clearInterval(this._watchInterval);
		this._watchInterval = null;
	};
	
	p._watch = function() {
		var defs = this._watched, refFonts = FontLoader._referenceFonts, l = defs.length;
		for (var i = l - 1; i >= 0; i--) {
			var def = defs[i], refs = def.refs;
			for (var j = refs.length - 1; j >= 0; j--) {
				var w = this._getTextWidth(def.family + "," + refFonts[j], def.weight, def.style);
				if (w != refs[j]) {
					var event = new createjs.Event("fileload");
					event.item = def.family;
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
	
	p._calculateReferenceSizes = function(def) {
		var refFonts = FontLoader._referenceFonts;
		var refs = def.refs = [];
		for (var i=0; i<refFonts.length; i++) {
			refs[i] = this._getTextWidth(refFonts[i], def.weight, def.style);
		}
	};
	
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
		
		var family=name;
		
		var weight = family.match(FontLoader.WEIGHT_REGEX);
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
	
	p._cssFromDef = function(def) {
		return "@font-face {\n" +
			"\tfont-family: '"+def.family+"';\n" +
			"\tfont-style: "+def.style+";\n" +
			"\tfont-weight: "+def.weight+";\n" +
			"\tsrc: "+def.src+";\n" +
			"}";
	};
	
	p._getTextWidth = function(family, weight, style) {
		var ctx = FontLoader._ctx;
		ctx.font = style+" "+weight+" 72px "+family;
		return ctx.measureText(FontLoader.sampleText).width;
	};
	
	p._getCSSValue = function(str, value) {
		var regex = new RegExp(value+":\s*([^;}]+?)\s*[;}]");
		var result = regex.exec(str);
		if (!result || !result[1]) { return null; }
		return result[1];
	};
	

	createjs.FontLoader = createjs.promote(FontLoader, "AbstractLoader");
})();


