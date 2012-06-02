var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var Comment = new Schema({
	id: {type: String, index: true},
	
	author: String,
	text: String,
	date: Date,
	
	_parent: {type: Number, index: true}
});

var Item = new Schema({
	_id: {type: String, index: {unique: true}},
	
	title: String,
	author: {type: String, index: true},
	date: {type: Date, index: true},
	url: String,
	text: String,
	
	points: Number,
	
	commentCount: Number,
	comments: [Comment],
	
	updated: Date,
	rendered: Boolean
});

module.exports = mongoose.model('Item', Item);
