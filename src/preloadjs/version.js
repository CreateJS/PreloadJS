(function() {

/**
 * Static class holding library specific information such as the version and buildDate of
 * the library.
 *
 * The old PreloadJS class has been renamed to LoadQueue. Please see the {{#crossLink "LoadQueue"}}{{/crossLink}}
 * class for information on loading files.
 * @class PreloadJS
 **/
var o = this.createjs = this.createjs||{};
o = (o.PreloadJS = o.PreloadJS||{});
 
/**
 * The version string for this release.
 * @property version
 * @type String
 * @static
 **/
o.version = /*version*/"NEXT"; // injected by build process

/**
 * The build date for this release in UTC format.
 * @property buildDate
 * @type String
 * @static
 **/
o.buildDate = /*date*/"Thu, 21 Feb 2013 16:18:44 GMT"; // injected by build process

})();