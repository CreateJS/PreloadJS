beforeEach(function () {
	this.baseAssetsPath = "../_assets/";

	this.getFilePath = function (fileObj) {
        var path = "";
		if (typeof fileObj == "string") {
           return this._formatFilePath(fileObj);
        } else if (fileObj.src instanceof Array) {
            for (var i=0;i<fileObj.src.length;i++) {
                fileObj.src[i] = this._formatFilePath(fileObj.src[i]);
            }
            return fileObj;
		} else {
			fileObj.src = this._formatFilePath(fileObj.src);
            return fileObj;
		}
	}

    this._formatFilePath = function(path) {
        if (path.indexOf("http") == 0) {
            return path;
        } else {
            return this.baseAssetsPath + path;
        }
    }

	this.findClass = function (selector) {
		// search backwards because the last match is more likely the right one
		for (var i = document.styleSheets.length - 1; i >= 0; i--) {
			var cssRules = document.styleSheets[i].cssRules ||
						   document.styleSheets[i].rules || []; // IE support
			for (var c = 0; c < cssRules.length; c++) {
				if (cssRules[c].selectorText === selector) {
					return true;
				}
			}
		}
		return false;
	}
});
