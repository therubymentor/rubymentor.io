jQuery(document).ready(function($) {
	$('form.quform').Quform();

	// Tooltip settings
	if ($.isFunction($.fn.qtip)) {
		$('.quform-tooltip').qtip({
			content: {
				text: false
			},
			style: {
				classes: 'qtip-default qtip-shadow quform-tt',
				width: '180px'
			},
			position: {
				my: 'left center',
				at: 'right center'
			}
		});
	}

	// Changes subject to a text field when 'Other' is chosen
	$('#subject').replaceSelectWithTextInput({onValue: 'Other'});
}); // End document ready
(function ($) {
	$(window).load(function () {
		// Preload images
		var images = [
      		'contact-form/images/close.png',
    		'contact-form/images/success.png',
    		'contact-form/images/error.png',
    		'contact-form/images/default-loading.gif'
    	];

		// Preload images for any active themes
		if ($('.quform-theme-light-light, .quform-theme-light-rounded').length) {
			images = images.concat([
         		'contact-form/themes/light/images/button-active-bg-rep.png',
         		'contact-form/themes/light/images/close.png',
         		'contact-form/themes/light/images/input-active-bg-rep.png'
         	]);
		}

		if ($('.quform-theme-dark-dark, .quform-theme-dark-rounded').length) {
			images = images.concat([
         		'contact-form/themes/dark/images/button-active-bg-rep.png',
         		'contact-form/themes/dark/images/close.png',
         		'contact-form/themes/dark/images/input-active-bg-rep.png',
         		'contact-form/themes/dark/images/loading.gif'
         	]);
		}

		if ($('.quform-theme-minimal-light').length) {
			images = images.concat([
         		'contact-form/themes/minimal/images/close-light.png'
         	]);
		}

		if ($('.quform-theme-minimal-dark').length) {
			images = images.concat([
         		'contact-form/themes/minimal/images/close-dark.png',
         		'contact-form/themes/minimal/images/loading-dark.gif'
         	]);
		}

		$.preloadImages(images);
	});
})(jQuery);