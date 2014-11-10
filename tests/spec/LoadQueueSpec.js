describe("PreloadJS.LoadQueue", function () {

	beforeEach(function () {
		this.queue = new createjs.LoadQueue();

		var _this = this;
		this.loadFile = function (fileObj) {
			if (typeof fileObj == "string") {
				_this.queue.loadFile(this.baseAssetsPath + fileObj);
			} else {
				fileObj.src = this.baseAssetsPath + fileObj.src;
				_this.queue.loadFile(fileObj);
			}
		}
	});

	it("should load XML", function (done) {
		this.queue.addEventListener("fileload", function (evt) {
			expect(evt.result instanceof Document).toBe(true);
			done();
		});
		this.loadFile("grant.xml");
	});

	it("should load JSON", function (done) {
		this.queue.addEventListener("fileload", function (evt) {
			expect(evt.result instanceof Object).toBe(true);
			done();
		});
		this.loadFile("MediaGridManifest.json");
	});

	it("should load JSONp", function (done) {
		this.queue.addEventListener("fileload", function (evt) {
			expect(evt.result instanceof Object).toBe(true);
			done();
		});
		this.loadFile({
						  src: "jsonpSample.json",
						  callback: "x",
						  type: createjs.LoadQueue.JSONP
					  });
	});

	it("should load and execute Javascript", function (done) {
		this.queue.addEventListener("fileload", function (evt) {
			expect(window.foo).toBe(true);
			done();
		});
		this.loadFile("scriptExample.js");
	});

	it("should load css", function (done) {
		this.queue.addEventListener("fileload", function (evt) {
			expect(evt.result instanceof HTMLElement).toBe(true);
			done();
		});
		this.loadFile("font.css");
	});

	it("should load images", function (done) {
		this.queue.addEventListener("fileload", function (evt) {
			expect(evt.result instanceof HTMLImageElement).toBe(true);
			done();
		});
		this.loadFile("image0.jpg");
	});

	it("should load binary data", function (done) {
		this.queue.addEventListener("fileload", function (evt) {
			expect(evt.result instanceof ArrayBuffer).toBe(true);
			done();
		});
		this.loadFile({src: "Thunder.mp3", type: createjs.LoadQueue.BINARY});
	});

	it("should load svg", function (done) {
		this.queue.addEventListener("fileload", function (evt) {
			expect(typeof evt.result).toBe("object");
			done();
		});
		this.loadFile("gbot.svg");
	});

	it("should load text", function (done) {
		this.queue.addEventListener("fileload", function (evt) {
			expect(typeof evt.result).toBe("string");
			done();
		});
		this.loadFile({src: "gbot.svg", type: createjs.LoadQueue.TEXT});
	});

	it("should load sounds", function (done) {
		this.queue.addEventListener("fileload", function (evt) {
			expect(evt.result instanceof HTMLMediaElement).toBe(true);
			done();
		});
		this.loadFile({src: "Thunder.mp3", type: createjs.LoadQueue.SOUND});
	});

	it("should load a manifest and its children", function (done) {
		var fileCount = 0;

		this.queue.addEventListener("fileload", function (evt) {
			fileCount++;
		});

		this.queue.addEventListener("complete", function (evt) {
			expect(fileCount).toBe(10);
			done();
		});
		this.loadFile({
						  src: "ManifestTest.json",
						  callback: "maps",
						  type: createjs.LoadQueue.MANIFEST
					  });
	});

	it("should send progress events.", function (done) {
		var _this = this;
		var callback = function (evt) {
			expect(true).toBe(true);
			_this.queue.removeEventListener("progress", callback);
			done();
		};
		this.queue.addEventListener("progress", callback);
		this.loadFile({src: "Thunder.mp3", type: createjs.LoadQueue.BINARY});
	});

	it("should error on a 404", function (done) {
		this.queue.addEventListener("error", function (evt) {
			expect(evt.text).toBe("FILE_LOAD_ERROR");
			done();
		});
		this.loadFile("This_file_does_not_EXIST_.no");
	});

	it("should pass data through to the complete handler", function (done) {
		this.queue.addEventListener("fileload", function (evt) {
			expect(evt.item.data).toBe("foo");
			done();
		});
		this.loadFile({
						  src: "gbot.svg",
						  type: createjs.LoadQueue.TEXT,
						  data: "foo"
					  });
	});

	it("should have custom plugins", function (done) {
		var SamplePlugin = function () { }
		var s = SamplePlugin;
		s.getPreloadHandlers = function () {
			return {
				callback: s.preloadHandler, // Proxy the method to maintain scope
				types: [createjs.LoadQueue.JSON],
				extensions: ["json"]
			}
		};

		s.preloadHandler = function (src, type, id, data, basePath, queue) {
			var options = {};

			// Tell PreloadJS to skip this file
			if (options.stopDownload) { return false; }

			// Tell PreloadJS to continue normally
			if (options.doNothing) { return true; }

			// Return modified values, as well as additional instructions
			return {
				src: src,
				id: "foo",
				data: "foo",
				tag: null
			}
		};

		this.queue.installPlugin(SamplePlugin);

		this.queue.addEventListener("fileload", function (evt) {
			expect(evt.item.id).toBe("foo");
			expect(evt.item.data).toBe("foo");
			done();
		});
		this.loadFile("grant.json");
	});

	it("should POST data.", function (done) {
		var value = {foo: "bar"};
		this.queue.addEventListener("fileload", function (evt) {
			expect(evt.result).toBe(JSON.stringify(value));
			done();
		});

		// the grunt server will echo back whatever we send it.
		this.loadFile({
						  src: "",
						  method: createjs.LoadQueue.POST,
						  values: value
					  });
	});

});
