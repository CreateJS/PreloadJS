describe("PreloadJS Standalone loaders should all work with minimal classes.", function () {

	beforeEach(function () {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;
	});

	it("TextLoader", function (done) {
		var _this = this;
		var loader = new createjs.TextLoader((this.getFilePath("grant.json")), true);
		loader.addEventListener("complete", function (evt) {
			expect(typeof evt.result).toBe("string");

			done();
		});

		loader.load();
	});

	it("JavascriptLoader (tag)", function (done) {
		var loader = new createjs.JavascriptLoader(this.getFilePath("scriptExample.js"));
		loader.addEventListener("complete", function (evt) {
			expect(window.foo).toBe(true);
			done();
		});
		loader.load();
	});

	it("CSSLoader (tag)", function (done) {
		var _this = this;
		var loader = new createjs.CSSLoader(this.getFilePath("demoStyles.css"));
		loader.addEventListener("complete", function (evt) {
			var foundClass = _this.findClass(".loader");
			expect(foundClass).toBe(true);

			done();
		});

		loader.load();
	});
	it("CSSLoader (xhr)", function (done) {
		var _this = this;
		var loader = new createjs.CSSLoader((this.getFilePath("demoStyles.css")), true);
		loader.addEventListener("complete", function (evt) {
			var foundClass = _this.findClass(".content");
			expect(foundClass).toBe(true);

			done();
		});

		loader.load();
	});
	it("JSONLoader", function (done) {
		var hasProgress = false;
		var loader = new createjs.JSONLoader(this.getFilePath("grant.json"));
		loader.addEventListener("complete", function (evt) {
			expect(evt.result instanceof Object).toBe(true);
			expect(hasProgress).toBe(true);
			done();
		});

		loader.addEventListener("progress", function (evt) {
			hasProgress = true;
		});

		loader.load();
	});

	it("JSONPLoader", function (done) {
		var loader = new createjs.JSONPLoader(
			{
				src: "http://gskinner.com/assets/createjs/mapsJSONP.json",
				callback: "maps"
			}
		);

		loader.addEventListener("complete", function (evt) {
			expect(typeof evt.result == "object").toBe(true);
			done();
		});

		loader.load();
	});

	it("SVGLoader (tag)", function (done) {
		var _this = this;
		var loader = new createjs.SVGLoader((this.getFilePath("gbot.svg")), false);
		loader.addEventListener("complete", function (evt) {
			expect(typeof evt.result).toBe("object");

			done();
		});

		loader.load();
	});

	it("SVGLoader (xhr)", function (done) {
		var _this = this;
		var loader = new createjs.SVGLoader((this.getFilePath("gbot.svg")), true);
		loader.addEventListener("complete", function (evt) {
			expect(typeof evt.result).toBe("object");

			done();
		});

		loader.load();
	});

	it("XMLLoader", function (done) {
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

	it("ImageLoader (tag)", function (done) {
		var _this = this;
		var loader = new createjs.ImageLoader((this.getFilePath("Texas.jpg")), false);
		loader.addEventListener("complete", function (evt) {
			expect(evt.result instanceof HTMLImageElement).toBe(true);

			done();
		});

		loader.load();
	});

	it("ImageLoader (xhr)", function (done) {
		var _this = this;
		var loader = new createjs.ImageLoader((this.getFilePath("Texas.jpg")), true);
		loader.addEventListener("complete", function (evt) {
			expect(evt.result instanceof  HTMLImageElement).toBe(true);

			done();
		});

		loader.load();
	});

	it("BinaryLoader", function (done) {
		var _this = this;
		var loader = new createjs.BinaryLoader((this.getFilePath("Thunder.mp3")));
		loader.addEventListener("complete", function (evt) {
			expect(typeof evt.result).toBe("object");

			done();
		});

		loader.load();
	});

	it("ManifestLoader");

	it("SoundLoader (tag)", function (done) {
		var _this = this;
		var loader = new createjs.SoundLoader(this.getFilePath("Thunder.mp3"), false);
		loader.addEventListener("complete", function (evt) {
			expect(typeof evt.result).toBe("object");

			done();
		});

		loader.load();
	});

	xit("SoundLoader (xhr)", function (done) {
		var _this = this;
		var loader = new createjs.SoundLoader(this.getFilePath("Thunder.mp3"), true);
		loader.addEventListener("complete", function (evt) {
			expect(typeof evt.result).toBe("object");

			done();
		});

		loader.load();
	});

});
