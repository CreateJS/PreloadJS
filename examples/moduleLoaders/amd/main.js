requirejs(["../build"], function(value) {
    var label = document.createElement("div");
	label.innerText = "createjs exists! Its classes are: \n"+Object.keys(this.createjs).join("\n");
	document.body.appendChild(label);

	console.log(value);

	var q = new createjs.LoadQueue();
	q.addEventListener("complete", function(evt) {
		console.log(evt);
	});
	q.loadFile('https://www.google.ca/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png');
});
