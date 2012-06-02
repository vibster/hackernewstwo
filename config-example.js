var config = {};

config.port = 80; // the port to listen on for user connection
	
config.master = 'localhost'; // the master server (which scrapes HN and renders site images)
config.dbUser = 'mongoUser';
config.dbPadd = '1234',
config.db = 'hn2';
	
config.cacheAge = 7 * 24 * 60 * 60 * 1000; // the maxAge for web resources
	
config.scraper = {
	frontInterval: 10 * 1000, // how often to update front page posts
	postInterval: 10 * 1000, // how often to check for new posts
	commentInterval: 30 * 1000, // how often to check for new comments
	
	maxAge: 30 * 60 * 1000, // when an item is accessed, update it if it's older than this
	
	maxRequests: 100 // the max amount of requests that we will make in 1 minute
};

module.exports = config;