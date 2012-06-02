var cp = require('child_process'),
	express = require('express'),
	app = express.createServer()
	io = require('socket.io').listen(app),
	mongoose = require('mongoose'),
	config = require(__dirname + '/config.js');
	
mongoose.connect('mongo://' + config.dbUser + ':' + config.dbPass + '@localhost/' + config.db);

// serve static files
app.use(express.staticCache());
app.use(express.static(__dirname + '/public', {maxAge: config.cacheAge}));

app.listen(config.port);

// start thumbnail renderer
var renderer = cp.fork(__dirname + '/renderer.js');
renderer.on('message', function(message) {
	if(message.event) {
		
	} else {
		console.log('renderer: ' + message);
	}
});


// start HN scraper
var scraper = cp.fork(__dirname + '/scraper.js');
scraper.on('message', function(message) {
	if(message.event) {
		if(message.event === 'new') {
			renderer.send(message);
		}
	} else {
		console.log('scraper: ' + message);
	}
});