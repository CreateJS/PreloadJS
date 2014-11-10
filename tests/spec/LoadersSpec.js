describe("PreloadJS Standalone loaders should all work with minimal classes.", function () {

	beforeEach(function() {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;
	});

	it("XHRLoader should load text files.");
	it("JavascriptLoader");
	it("CSSLoader");
	it("JSONLoader");
	it("JSONPLoader");
	it("SVGLoader");
	it("XMLLoader", function(done) {
		var hasProgress = false;
		var loader = new createjs.XMLLoader(this.getFilePath("grant.xml"));
		loader.addEventListener("complete", function (evt) {
			expect(evt.result instanceof Document).toBe(true);
			expect(hasProgress).toBe(true);
			done();
		});

		loader.addEventListener("progress", function (evt) {
			hasProgress = true;
		});

		loader.load();
	});
	it("ImageLoader");
	it("BinaryLoader");
	it("ManifestLoader");
	it("SoundLoader");

});
