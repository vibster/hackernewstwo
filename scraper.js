var http = require('http'),
	urlparse = require('url'),
	cheerio = require('cheerio'),
	mongoose = require('mongoose'),
	Item = require(__dirname + '/models/item.js'),
	config = require(__dirname + '/config.js');
	
mongoose.connect('mongo://' + config.dbUser + ':' + config.dbPass + '@localhost/' + config.db);
	
var requests = [];

function getDate(string) {
	var split = string.split(' ');
	
	var units = {
		'minutes': 60 * 1000,
		'hours': 60 * 60 * 1000,
		'days': 24 * 60 * 60 * 1000
	};
	
	var unit = split[1];
	if(unit.charAt(unit.length - 1) !== 's') unit += 's';
	
	return new Date(Date.now() - (parseInt(split[0]) * units[unit]));
};

var get = function(url, callback) {
	while(requests.length && requests[0] < Date.now() - (60 * 1000)) requests.shift();
	
	if(requests.length < config.scraper.maxRequests) {
		requests.push(Date.now());
		
		url = urlparse.parse(url);
	
		try {
			http.get({
				host: url.host,
				path: url.path
			}, function(res) {
				res.setEncoding('utf8');
				var data = '';
				res.on('data', function(chunk) { data += chunk; });
				res.on('end', function() { callback(null, data); });
			});
		} catch(err) {
			callback(err);
		}
	} else {
		callback('dropping scrape request, at request limit');
	}
};

var scrapeList = module.exports.scrapeList = function(path, callback) {
	get('http://news.ycombinator.com/' + path, function(err, data) {
		if(err) {
			callback(err);
		} else {
			try {
				var $ = cheerio.load(data),
					items = [];
	
				$('td.title a').each(function(i) {
					if($(this).text() !== 'More') {
						items[i] = {
							url : $(this).attr('href'),
							title : $(this).text()
						};
					}
				});
	
				$('td.subtext').each(function(i) {
					if($(this).children('a').eq(0).text()) {
						items[i].points = parseInt($(this).children('span').text().split(' ')[0]);
						items[i].author = $(this).children('a').eq(0).text();
						
						var commentCount = $(this).children('a').eq(1).text().split(' ')[0];
						if(commentCount === 'discuss') items[i].commentCount = 0;
						else items[i].commentCount = parseInt(commentCount);
						
						items[i].date = getDate($('td.subtext').text()
							.split($(this).find('td.subtext a').eq(0).html())[1]
							.split($(this).find('td.subtext a').eq(1).html())[0]
							.trim());
						
						items[i].id = parseInt($(this).children('a').eq(1).attr('href').split('id=')[1]);
					} else {
						items[i].id = parseInt(items[i].url.split('id=')[1]);
						items[i].url = 'http://news.ycombinator.com/' + items[i].url;
					}
				});
				
				callback(null, items);
			} catch(err) {
				callback(err);
			}
		}
	});
};

var scrapeItem = module.exports.scrapeItem = function(id, callback) {
	id = String(id);
	
	get('http://news.ycombinator.com/item?id=' + id, function(err, data) {
		if(err) {
			callback(err);
		} else {
			try {
				var $ = cheerio.load(data);
				var item = {
					id : parseInt(id),
					title : $('td.title a').text(),
					url : $('td.title a').attr('href'),
					comments : []
				};
				
				var stack = [id];
				$('td.default').each(function(i) {
					// get comment depth by indent size
					var depth = $(this).siblings('td:first').children('img').attr('width') / 40;
					
					while(stack.length - 1 > depth) stack.pop();
					item.comments[i] = { parent: stack[stack.length - 1] };
					
					if($(this).children('span.comment').text() !== '[dead]') {
						item.comments[i].author = $(this).find('span.comhead a').first().text();
						item.comments[i].id = parseInt($(this).find('div span.comhead a').last().attr('href').split('id=')[1]);
						item.comments[i].text = $(this).children('span.comment').html();
					}
					
					stack.push(item.comments[i].id);
				});
				
				item.commentCount = item.comments.length;
			
				callback(null, item);
			} catch(err) {
				callback(err);
			}
		}
	});
};

var scrapeNewComments = module.exports.scrapeNewComments = function(callback) {
	get('http://news.ycombinator.com/newcomments', function(err, data) {
		if(err) {
			callback(err);
		} else {
			try {
				var $ = cheerio.load(data);
				var comments = [];
				
				$('td.default').each(function(i) {
					comments[i] = {
						author: $(this).find('span.comhead a').eq(0).text(),
						id: parseInt($(this).find('span.comhead a').eq(1).attr('href').split('id=')[1]),
						parent: parseInt($(this).find('span.comhead a').eq(2).attr('href').split('id=')[1]),
						text: $(this).find('.comment').html(),
						post: parseInt($(this).find('span.comhead a').eq(3).attr('href').split('id=')[1])
					};
				});
			
				callback(null, comments);
			} catch(err) {
				callback(err);
			}
		}
	});
};

function createOrUpdate(item) {
	Item.findById(item.id, function(err, doc) {
		if(err) {
			process.send('error - ' + err);
		} else if(!doc) {
			if(item.id) {
				var doc = new Item;
				doc._id = item.id;
				doc.title = item.title;
				doc.author = item.author;
				doc.date = item.date || new Date;
				doc.updated = new Date;
				doc.url = item.url;
				doc.text = item.text;
				doc.points = item.points;
				doc.commentCount = item.commentCount;
				doc.comments = item.comments;
				doc.rendered = false;
				doc.save();
				
				process.send({event: 'new', body: item});
			}
		} else {
			doc.updated = new Date;
			doc.points = item.points;
			doc.commentCount = item.commentCount;
			doc.comments = item.comments;
			doc.save();
		}
	});
};

function saveList(err, list) {
	if(err) {
		process.send('error - ' + err);
	} else {
		for(var i = 0; i < list.length; i++) {
			createOrUpdate(list[i]); 
		}
	}
}

setInterval(function() {
	process.send('scraping new');
	scrapeList('newest', saveList);
}, config.scraper.postInterval);


setInterval(function() {
	process.send('scraping front pages');
	scrapeList('', saveList);
	scrapeList('/news2', saveList);
}, config.scraper.frontInterval);

process.send('initialized');
