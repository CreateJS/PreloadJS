PRELOADJS LIBRARY:

PreloadJS is a library to make working with asset preloading easier. It provides a consistent API for loading different file types, automatic detection of XHR (XMLHttpRequest) availability with a fallback to tag-base loading, composite progress events, and a plugin model to assist with preloading in other libraries such as SoundJS.

The home page for PreloadJS can be found at http://preloadjs.com/

There is a GitHub repository, which includes downloads, issue tracking, & a wiki at https://github.com/CreateJS/PreloadJS/

It was built by gskinner.com, and is released for free under the MIT license, which means you can use it for almost any purpose (including commercial projects). We appreciate credit where possible, but it is not a requirement.

PreloadJS is currently in alpha. We will be making significant improvements to the library, samples, and documentation over the coming weeks. Please be aware that this may necessitate changes to the existing API.


The key classes are:

PreloadJS
The wrapper that manages all preloading. Instantiate a PreloadJS instance, load a files or manifest, and track progress and complete events.

Have a look at the included examples and API documentation for more in-depth information.