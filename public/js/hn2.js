$(function() {
	$('.item .title').click(function(e) {
		localStorage[$(this).parents('.item').attr('id')] = true;
	});
});