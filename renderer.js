var phantom = require('phantom');

var render = module.exports.render = function(url, filename, callback) {
	phantom.create(function(ph) {
		ph.createPage(function(page) {
			page.viewportSize = { width: 1366, height: 768 };
		    page.open(url, function (status) {
		        if (status !== 'success') {
		            process.send('error - could not load page');
		        } else {
		        	page.evaluate(function () {
			        	document.body.style.webkitTransform = "scale(0.4)";
			        	document.body.style.webkitTransformOrigin = "0% 0%";
		        	});
		        	
		        	page.clipRect = {
		        		top: 0, left: 0,
		        		width: 500,
		        		height: 300
		        	};
		        	
		            window.setTimeout(function () {
		                page.render(filename, callback);
		                ph.exit();
		            }, 200);
		        }
		    });
		});
	});
}


