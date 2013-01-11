var logs = {
	PRELOAD_NO_FILE: "The specified file is null",
	PRELOAD_MANIFEST_EMPTY: "The provided manifest has no files to load",
	PRELOAD_MANIFEST_NULL: "The provided manifest is null.",
	POLYFILL_BIND: "Using the Function.bind PolyFill",
	POLYFILL_INDEXOF: "Using the Array.indexOf PolyFill"
}
createjs && createjs.Log && createjs.Log.addKeys(logs);