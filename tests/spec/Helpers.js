beforeEach(function () {
	this.baseAssetsPath = "../examples/assets/";

	this.getFilePath = function (fileObj) {
		if (typeof fileObj == "string") {
			return this.baseAssetsPath + fileObj;
		} else {
			return this.baseAssetsPath + fileObj.src;
		}
	}
});
