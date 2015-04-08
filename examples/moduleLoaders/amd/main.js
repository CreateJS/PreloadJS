requirejs(["../../../lib/preloadjs-NEXT.min.js"], function(value) {
    var label = document.createElement("div");
	label.innerText = "createjs exists! Its classes are: \n"+Object.keys(this.createjs).join("\n");
	document.body.appendChild(label);
});
