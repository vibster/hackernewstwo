var Item = Backbone.Model.extend({
	initialize: function() {
		_.bindAll(this, 'remove');
	},
	remove: function() {
		this.trigger('remove');
		delete this;
	}
});
	
var Items = Backbone.Collection.extend({
	model: Item,
	
	initialize: function() {
		_.bindAll(this, 'getRank');
	},
	getRank: function(item) {
		var lower = 0;
		this.each(function(i) {
			if(i.get('points') < item.get('points')) lower++;
		});
		return lower / this.length;
	}
});
	
var Cell = Backbone.View.extend({
	tagName: 'li',
	className: 'item',
	
	template: _.template($('#cell-template').html()),
	
	initialize: function() {
		_.bindAll(this, 'render', 'remove');
		this.model.bind('change', this.render);
		this.model.bind('remove', this.remove);
		this.render();
		this.$el.attr('id', this.model.get('_id'));
	},
	render: function() {
		this.$el.html(this.template(this.model.attributes));
		return this;
	}
});

var Grid = Backbone.View.extend({
	initialize: function() {
		_.bindAll(this, 'append', 'rank', 'clear');
		this.clear();
	},
	
	append: function(item) {
		item.set({view: new Cell({model: item})});
		this.$el.append(item.get('view').$el);
	},
	rank: function() {
		this.collection.each(function(item) {
			var rank = Math.floor(this.collection.getRank(item) * 4);
			item.get('view').$el.addClass('span' + (rank + 2));
		}.bind(this));
	},
	clear: function() {
		this.collection = new Items;
		this.collection.bind('add', this.append);
		this.rank();
	}
});

var Router = Backbone.Router.extend({
	initialize: function(options) {
		_.bindAll(this, 'clearPage');
		this.grid = options.grid;
		this.socket = options.socket;
	},
	
	routes: {
		'about': 'about',
		'new': 'new',
		'*path': 'front'
	},
	
	clearPage: function() {
		console.log('clearing');
		_.each(this.grid.collection.models, function(item) {
			item.remove();
		});
		this.grid.clear();
		$('#about').hide();
	},
	
	about: function() {
		this.clearPage();
		this.current = 'about';
		$('#about').show();
	},
	
	'new': function() {
		this.clearPage();
		this.current = 'new';
		this.socket.emit('get', 'new');
	},
	
	front: function() {
		console.log('getting front');
		this.clearPage();
		this.current = 'front';
		this.page = 0;
		this.socket.emit('get', 'front');
	}
});

$(function() {
	var grid = new Grid({
		el: $('#grid')
	});
	
	var socket = io.connect();
	
	var router = new Router({grid: grid, socket: socket});
	Backbone.history.start();
	
	socket.on('online', function(online) {
		$('#online').text(online);
	});
	
	socket.on('posts', function(data) {
		if(data.length) {
			_.each(data, function(item) {
				grid.collection.add(new Item(item));
			});
		} else {
			grid.collection.add(new Item(data));
		}
		grid.rank();
	});
	
	var lastScroll = Date.now();
	$(window).scroll(function(e) {
		console.log((Date.now() - lastScroll), $(window).scrollTop() + $(window).innerHeight() + 100, $(document).height());
		if(router.current === 'front'
		&& (Date.now() - lastScroll) > 2000
		&& $(window).scrollTop() + $(window).innerHeight() > $(document).height() - 100) {
			lastScroll = Date.now();
			socket.emit('get','front.' +  ++router.page);
			console.log('getting page', router.page);
		}		
	});
});