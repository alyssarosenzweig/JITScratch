JITScratch is a framework for compiling procedure-based Scratch projects to node.js-compatible JavaScript.

It exposes a simple API simple install via npm:

$ npm install jitscratch

Once installed, it exposes a simple, CommonJS interface.

### Hello, World ###
```
var JITScratch = require("JITScratch");

var helloWorld = new JITScratch();
helloWorld.fetchScratchProject(10297480, function() {
	console.log(helloWorld.generateSourceCode());
});
```

### API ###

require("JITScratch"): returns a JITScratch class

JITScratch class:
	
	fetchScratchProject(id, callback)
	
	Fetches a Scratch project off the Scratch website where id is the project ID. callback has no parameters, and calls rawProject with the fetched JSON-representation of the project.
	
	rawProject(json)
	
	Loads the JSON project representation directly into JITScratch
	
	generateSourceCode()
	
	Returns JavaScript source code of the JSON project.
	
	getProcDefs()
	
	Returns an array of block specs used by the procedures, in the order of the procedure function calls in the source code.