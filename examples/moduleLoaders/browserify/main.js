var build = require('../build');

var label = document.createElement("div");
label.innerText = "createjs exists! Its classes are: \n"+Object.keys(createjs).join("\n");
document.body.appendChild(label);
