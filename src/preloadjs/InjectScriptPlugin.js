// namespace:
this.createjs = this.createjs||{};

(function() {
	"use strict";

	var InjectScriptPlugin = function () {};
	var s = InjectScriptPlugin;

	s.getPreloadHandlers = function() {
		console.log("Get Handlers");
		return {
			callback: s.preloadHandler,
			types: ["javascript"],
			extensions: ["js","javascript"]
		};
	};

	s.preloadHandler = function (src, type, id, data, basePath, queue) {
		console.log("Preload", src, queue, basePath);
		return {
			completeHandler: createjs.proxy(s.fileLoadHandler, s)
		};
	};

	s.fileLoadHandler = function(event) {
		console.log("Loaded script", event.item.src);
	};

	createjs.InjectScriptPlugin = InjectScriptPlugin;

}());