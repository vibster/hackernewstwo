var phantom = require('phantom'),
	Item = require(__dirname + '/models/item.js');

var render = module.exports.render = function(url, filename, callback) {
	phantom.create(function(ph) {
		ph.createPage(function(page) {
		    page.open(url, function (status) {
		        if (status !== 'success') {
		            process.send('error - could not load page (' + url + ')');
		        } else {
					page.set('viewportSize', { width: 1024, height: 768 });	
				    page.set('clipRect', {
				    	top: 10, left: 40,
				        width: 500,
				        height: 300
				    });
				    
				    page.evaluate(function() {
				    	document.body.style.webkitTransform = "scale(0.3)";
				    	document.body.style.webkitTransformOrigin = "0% 0%";
				    });
				    
				    setTimeout(function() {
			        	page.render(filename, callback);
			            ph.exit();
			         }, 200);
		        }
		    });
		});
	});
}

var queue = [];

function queueItem(url, id) {
	if(!id) return;
	
	if(url.indexOf('http://') !== 0) url = 'http://news.ycombinator.com/' + url;
	
	for(var i = 0; i < queue.length; i++) {
		if(queue[i].id === id) return;
	}
	
	queue.push({url: url, id: id});
};

process.on('message', function(m) {
	if(m.event === 'new') {
		queueItem(m.body.url, m.body.id);
	}
});

setInterval(function() {
	Item.find({rendered: false}, function(err, docs) {
		if(err) process.send('error - could not read db');
		else {
			for(var i = 0; i < docs.length; i++) {
				queueItem(docs[i].url, docs[i].id);
			}
		}
	});
}, 60 * 1000);

setInterval(function() {
	if(queue.length) {
		var item = queue.shift();
		render(item.url, __dirname + '/public/img/' + item.id + '.png', function() {
			process.send('finished render for ' + item.id);
			Item.findById(item.id, function(err, doc) {
				if(err) process.send('error - could not update db');
				else {
					doc.rendered = true;
					doc.save();
				}
			});
		});
	}
}, 3000);
