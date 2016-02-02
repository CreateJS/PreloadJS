// File for legacy window.createjs support.
(function (name, definition) {
	if (typeof module != 'undefined') module.exports = definition();
	else if (typeof define == 'function' && typeof define.amd == 'object') define(definition);
	else this[name] = definition();
}('createjs', function () {
	// TODO Merge in other libraries.
	return {
		LoadQueue: require("./LoadQueue"),
		promote: require('../createjs/utils/promote'),
		extend: require('../createjs/utils/extend'),
		Event: require('../createjs/events/Event'),
		ErrorEvent: require('../createjs/events/ErrorEvent'),
		ProgressEvent: require('./events/ProgressEvent')
	};
}));
