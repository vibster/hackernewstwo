var cp = require('child_process'),
	express = require('express'),
	app = express.createServer()
	io = require('socket.io').listen(app),
	mongoose = require('mongoose'),
	config = require(__dirname + '/config.js');
	
mongoose.connect('mongo://' + config.dbUser + ':' + config.dbPass
	+ '@' + config.master + '/' + config.db);

// serve static files
app.use(express.staticCache());
app.use(express.static(__dirname + '/public', {maxAge: config.cacheAge}));

app.listen(config.port);
