var Item = Backbone.Model.extend({});
	
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
		_.bindAll(this, 'render');
		this.model.bind('change', this.render);
		this.model.bind('destroy', this.remove);
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
		_.bindAll(this, 'append', 'rank');
		this.collection.bind('add', this.append);
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
	}
});

$(function() {
	var items = new Items;

	var grid = new Grid({
		el: $('#grid'),
		collection: items
	});
	
	var socket = io.connect();
	
	socket.on('online', function(online) {
		$('#online').text(online);
	});
	
	socket.on('new', function(data) {
		if(data.length) {
			_.each(data, function(item) {
				items.add(new Item(item));
			});
		} else {
			items.add(new Item(data));
		}
		grid.rank();
	});
});