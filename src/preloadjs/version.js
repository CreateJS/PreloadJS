this.createjs = this.createjs||{};

(function() {
	"use strict";

	/**
	 * Static class holding library specific information such as the version and buildDate of
	 * the library.
	 *
	 * The old PreloadJS class has been renamed to LoadQueue. Please see the {{#crossLink "LoadQueue"}}{{/crossLink}}
	 * class for information on loading files.
	 * @class PreloadJS
	 **/
	var s = createjs.PreloadJS = createjs.PreloadJS || {};

	/**
	 * The version string for this release.
	 * @property version
	 * @type String
	 * @static
	 **/
	s.version = /*version*/"NEXT"; // injected by build process

	/**
	 * The build date for this release in UTC format.
	 * @property buildDate
	 * @type String
	 * @static
	 **/
	s.buildDate = /*date*/"Fri, 29 Nov 2013 16:17:31 GMT"; // injected by build process

})();
