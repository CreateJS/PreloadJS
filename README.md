# PreloadJS

PreloadJS is a library to make working with asset preloading easier. It provides a consistent API for loading different
file types, automatic detection of XHR (XMLHttpRequest) availability with a fallback to tag-base loading, composite
progress events, and a plugin model to assist with preloading in other libraries such as [SoundJS](http://www.soundjs.com).

## Example
	var preload = new createjs.LoadQueue();
	preload.addEventListener("fileload", handleFileComplete);
	preload.loadFile('http://createjs.com/images/404/gBot-confused.jpg');
	function handleFileComplete(event) {
		document.body.appendChild(event.result);
	}


## Support and Resources
* Find examples and more information at the [PreloadJS web site](http://www.preloadjs.com/)
* Read the [documentation](http://createjs.com/Docs/PreloadJS/)
* You can also ask questions and interact with other users at our [Community](http://community.createjs.com) site.
* Have a look at the included [examples](https://github.com/CreateJS/PreloadJS/tree/master/examples) and [API documentation](http://createjs.com/Docs/PreloadJS/) for more in-depth information.

Built by [gskinner.com](http://www.gskinner.com), and is released for free under the MIT license, which means you can
use it for almost any purpose (including commercial projects). We appreciate credit where possible, but it is not a requirement.


## Classes

**LoadQueue**
The main class that manages all preloading. Instantiate a LoadQueue instance, load a file or manifest, and track
progress and complete events. Check out the [docs](http://createjs.com/Docs/PreloadJS/) for more information.