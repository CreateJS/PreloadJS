this.createjs = this.createjs || {};

(function () {
	"use strict";

	/**
	 * Static class holding library specific information such as the version and buildDate of the library.
	 * @class PreloadJS
	 **/
	var s = createjs.PreloadJS = createjs.PreloadJS || {};

	/**
	 * The version string for this release.
	 * @property version
	 * @type {String}
	 * @static
	 **/
	s.version = /*=version*/""; // injected by build process

	/**
	 * The build date for this release in UTC format.
	 * @property buildDate
	 * @type {String}
	 * @static
	 **/
	s.buildDate = /*=date*/""; // injected by build process

})();
