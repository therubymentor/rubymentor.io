/*!
 * Quform jQuery plugin
 *
 * Copyright (c) 2009 - 2013 ThemeCatcher
 */
;(function($) {
	var Quform = function($form, options) {
		var self = this,
			submitted = false,
			useProp = !!$.fn.prop;

		// Class properties
		self.$form = $form;
		self.options = options;
		self.$container = $(options.container, $form);
		self.$loading = $(options.loading, $form);
		self.$submitButton = $(options.submitButton, $form);

		/**
		 * Form reset
		 *
		 * Resets the form to its original state
		 *
		 * @param boolean resetValues If true it also resets form values
		 */
		self.reset = function (resetValues) {
			// Reload the recaptcha, we can't use it twice
			if (typeof Recaptcha === 'object') {
				try {
					Recaptcha.reload();
				} catch (e) {}
			}

			// Allow the form to be submitted again
			submitted = false;
			self.$submitButton[useProp ? 'prop' : 'attr']('disabled', false);

			// Hide the loading text/gif
			self.$loading.stop(true, true).hide();

			// Remove any previous errors/success messages from the form
            $('.quform-success-message', $form).remove();
            $('.quform-error-message', $form).remove();
            $('.quform-has-error', $form).removeClass('quform-has-error');
            $('.quform-errors-wrap', $form).remove();

            if (options.reset && resetValues) {
	            // Reset the form
	            $form.resetForm();
			}
		};

		/**
		 * Display an error message above the form
		 *
		 * @param string html The error message HTML
		 */
		self.errorMessage = function (html, showTitle) {
			// Display the message
			var $message = $('<div class="quform-error-message"/>');

			if (showTitle !== false) {
			    $message.append($('<div class="quform-error-title"/>').html(options.errorTitle));
			}

	        $message.append(html)
	                .hide();

	        if (options.errorPosition == 'below') {
	            $message.insertAfter(self.$container);
	        } else {
	            $message.insertBefore(self.$container);
	        }

	        $message.fadeIn('slow');

			self.scrollTo($message);
		};

		/**
		 * Scroll to a DOM element if it's not in the current viewport
		 *
		 * @param object $target The jQuery object to scroll to
		 */
		self.scrollTo = function ($target) {
		    if (options.scrolling && $target && $target.length && $(window).scrollTop() >= ($target.offset().top - options.scrollThreshold)) {
                $.smoothScroll({
                    offset: options.scrollOffset,
                    scrollTarget: $target,
                    speed: options.scrollSpeed
                });
            }
		};

		// Bind on submit to submit via Ajax
		$form.bind('submit', function (event) {
			// Prevent double submit
			if (submitted) {
				return false;
			} else {
				submitted = true;
				self.$submitButton[useProp ? 'prop' : 'attr']('disabled', true);
			}

			// Prevent the browser submitting the form normally
			event.preventDefault();

			// Show the loading text/gif
			self.$loading.fadeIn('slow');

			// Submit the form
			$form.ajaxSubmit({
				async: false,
				dataType: 'json',
				data: { 'quform_ajax': 1 },
				iframe: true,
				success: function(response) {
					// Check if the form submission was successful
					if (response === null || typeof response === 'undefined') {
						self.reset();
						self.errorMessage(options.errorResponseEmpty);
					} else if (typeof response === 'object') {
						if (response.type === 'success') {
							if (typeof response.redirect === 'string') {
								window.location = response.redirect;
								return;
							}

							// successStart function
							if (typeof options.successStart === 'function') {
								options.successStart.call(self, response);
							}

							// Check for a custom success function
							if (typeof options.success === 'function') {
								options.success.call(self, response);
							} else {
								var success = function () {
									// Reset the form
									self.reset(true);

			                        // Create a new success message
			                        var $successMessage = $('<div class="quform-success-message"/>').html(response.message).hide().insertBefore(self.$container).fadeIn(options.successFadeInSpeed).show(0, function() {
		                                // successEnd function
		                                if (typeof options.successEnd === 'function') {
	                                        options.successEnd.call(self, response, $successMessage);
		                                }
			                        });

			                        // Scroll to the success message if it's not visible
			                        self.scrollTo($successMessage);

			                        // Fade out the success message after some time
			                        if (options.successTimeout > 0) {
				                        setTimeout(function () {
				                            $successMessage.fadeOut(options.successFadeOutSpeed).hide(0, function () {
				                            	$successMessage.remove();
				                            });
				                        }, options.successTimeout);
			                        }
								};

								if (options.hideFormSpeed) {
									self.$container.fadeOut(options.hideFormSpeed).hide(0, function () {
										success();
									});
								} else {
									success();
								}
							}
						} else if (response.type == 'error') {
							// errorStart callback
							if (typeof options.errorStart === 'function') {
								options.errorStart.call(self, response);
							}

							// Check for a custom error function
							if (typeof options.error === 'function') {
								options.error.call(self, response);
							} else {
							    var scrolled = false;
								// Reset the form (keep form values)
								self.reset();

								if (response.error.length) {
								    self.errorMessage(response.error, false);
								    scrolled = true;
								}

								var $firstError;

								// Go through each element containing errors
								$.each(response.elementErrors, function(index, info) {
									// If there are errors for this element
									if (typeof info.errors === 'object' && info.errors.length > 0) {
										// Save a reference to this element
										var $element = $("[name='" + index + "']", $form);

										// If the element exists
										if ($element.length) {
											// Create a blank error list
											var $errorList = $('<div class="quform-errors quform-cf"/>'),
											$errorWrap = $('<div class="quform-errors-wrap"/>').append($errorList);

											// Append the error
											$errorList.append('<div class="quform-error">' + info.errors[0] + '</div>');

											// Add the error list after the element's wrapper
											$element.parents('.quform-input').append($errorWrap).end().parents('.quform-element').addClass('quform-has-error');

											// Save the first error so we can scroll to it
											if (!$firstError) $firstError = $element;
										} else {
											alert("Element '" + index + "' does not exist in the HTML but is being validated, you must also remove the element configuration from process.php");
										}
									}
								});

								// Fade all errors in
								$('.quform-errors', $form).fadeIn('slow');

								// Scroll to the first error
								if (!scrolled) {
    								self.scrollTo($firstError);
								}

								// errorEnd callback
								if (typeof options.errorEnd === 'function') {
									options.errorEnd.call(self, response);
								}
							}
						} // response.type == 'error'
					} // typeof response === 'object'
				},
				error: function (response) {
					// Reset the form
					self.reset();

					if (typeof response.responseText === 'string' && response.responseText.length > 0) {
						self.errorMessage('<pre>' + response.responseText + '</pre>');
					} else {
						self.errorMessage(options.errorAjax);
					}
				}
			}); // $form.ajaxSubmit()
		}); // $form.bind('submit')
	}; // var Quform

	$.fn.Quform = function (options) {
		var defaults = {
			container: '.quform-elements',
			loading: '.quform-loading-wrap',
			submitButton: '.quform-submit',
			reset: true,
			hideFormSpeed: false,
			successFadeInSpeed: 'slow',
			successFadeOutSpeed: 'slow',
			successTimeout: 8000,
			scrolling: true,
			scrollSpeed: 400,
			scrollThreshold: 20,
			scrollOffset: -50,
			errorTitle: 'There was a problem',
			errorResponseEmpty: 'An error occurred and the response from the server was empty.',
			errorAjax: 'An Ajax error occurred.',
			errorPosition: 'above'
		},
		settings = $.extend({}, defaults, options);

		if (!$.isFunction($.fn.smoothScroll)) {
			settings.scrolling = false;
		}

		return this.each(function () {
			var $this = $(this);
			if (!$this.data('quform')) {
				$this.data('quform', new Quform($(this), settings));
			}
		});
	}; // End $.fn.Quform
})(jQuery); // End jQuery wrapper

/*
 * Replace a select menu with a text input field
 */
(function($) {
	$.fn.replaceSelectWithTextInput = function (options) {
		var defaults = {
			onValue: 'Other',
			cancel: 'Cancel'
		};

		options = $.extend({}, defaults, options);

		return this.each(function () {
			var $this = $(this),
			$wrapper = $this.parent(),
			$element = $this.parents('.quform-element').addClass('quform-select-replaced'),
			html = $wrapper.html();

			$wrapper.delegate('select', 'change', function () {
				if ($(this).val() == options.onValue) {
					$wrapper.html('<input type="text" name="' + $this.attr('name') + '" id="' + $this.attr('id') + '" value="" />');
					$element.removeClass('quform-element-select').addClass('quform-element-text');

					$cancel = $('<a>').click(function () {
						$wrapper.html(html);
						$element.removeClass('quform-element-text').addClass('quform-element-select');
						$(this).remove();
						return false;
					}).attr('href', '#').addClass('quform-cancel-button').attr('title', options.cancel);

					$wrapper.append($cancel);
				}
			});

			$this.change();
		});
	};
})(jQuery);

/*
 * Image preloader
 *
 * Usage: $.preloadImages([array of paths], 'common path prefix');
 */
(function(b){b.preloadImages=function(d,a){for(var a=a?a:"",f=[],c=0;c<d.length;c++){var e=new Image;e.src=a+d[c];f.push(e)}}})(jQuery);

/*! Smooth Scroll - v1.4.9 - 2013-01-21
* https://github.com/kswedberg/jquery-smooth-scroll
* Copyright (c) 2013 Karl Swedberg; Licensed MIT
*
* Modified by ThemeCatcher to be compatible with jQuery Tools Scrollable
* The following code was removed from the original file:
*
*   scrollable: function(dir) {
*	    var scrl = getScrollable.call(this, {dir: dir});
*	    return this.pushStack(scrl);
*  	},
*/
(function(b){function m(b){return b.replace(/(:|\.)/g,"\\$1")}b.fn.extend({firstScrollable:function(e){var c=[],a=!1,f=e&&"left"==e?"scrollLeft":"scrollTop";this.each(function(){if(!(this==document||this==window)){var d=b(this);0<d[f]()?c.push(this):(d[f](1),(a=0<d[f]())&&c.push(this),d[f](0))}});c.length||this.each(function(){"BODY"===this.nodeName&&(c=[this])});1<c.length&&(c=[c[0]]);return this.pushStack(c)},smoothScroll:function(e){e=e||{};var c=b.extend({},b.fn.smoothScroll.defaults,e),a=b.smoothScroll.filterPath(location.pathname); this.unbind("click.smoothscroll").bind("click.smoothscroll",function(e){var d=b(this),g=c.exclude,j=c.excludeWithin,h=0,k=0,l=!0,n={},q=location.hostname===this.hostname||!this.hostname,r=c.scrollTarget||(b.smoothScroll.filterPath(this.pathname)||a)===a,p=m(this.hash);if(!c.scrollTarget&&(!q||!r||!p))l=!1;else{for(;l&&h<g.length;)d.is(m(g[h++]))&&(l=!1);for(;l&&k<j.length;)d.closest(j[k++]).length&&(l=!1)}l&&(e.preventDefault(),b.extend(n,c,{scrollTarget:c.scrollTarget||p,link:this}),b.smoothScroll(n))}); return this}});b.smoothScroll=function(e,c){var a,f,d,g;g=0;var j="offset",h="scrollTop",k={};d={};"number"===typeof e?(a=b.fn.smoothScroll.defaults,d=e):(a=b.extend({},b.fn.smoothScroll.defaults,e||{}),a.scrollElement&&(j="position","static"==a.scrollElement.css("position")&&a.scrollElement.css("position","relative")));a=b.extend({link:null},a);h="left"==a.direction?"scrollLeft":h;a.scrollElement?(f=a.scrollElement,g=f[h]()):f=b("html, body").firstScrollable();a.beforeScroll.call(f,a);d="number"=== typeof e?e:c||b(a.scrollTarget)[j]()&&b(a.scrollTarget)[j]()[a.direction]||0;k[h]=d+g+a.offset;g=a.speed;"auto"===g&&(g=k[h]||f.scrollTop(),g/=a.autoCoefficent);d={duration:g,easing:a.easing,complete:function(){a.afterScroll.call(a.link,a)}};a.step&&(d.step=a.step);f.length?f.stop().animate(k,d):a.afterScroll.call(a.link,a)};b.smoothScroll.version="1.4.9";b.smoothScroll.filterPath=function(b){return b.replace(/^\//,"").replace(/(index|default).[a-zA-Z]{3,4}$/,"").replace(/\/$/,"")};b.fn.smoothScroll.defaults= {exclude:[],excludeWithin:[],offset:0,direction:"top",scrollElement:null,scrollTarget:null,beforeScroll:function(){},afterScroll:function(){},easing:"swing",speed:400,autoCoefficent:2}})(jQuery);

/*!
 * selectivizr v1.0.2 - (c) Keith Clark, freely distributable under the terms of the MIT license.
 * selectivizr.com
 */
(function(j){function A(a){return a.replace(B,h).replace(C,function(a,d,b){for(var a=b.split(","),b=0,e=a.length;b<e;b++){var s=D(a[b].replace(E,h).replace(F,h))+o,l=[];a[b]=s.replace(G,function(a,b,c,d,e){if(b){if(l.length>0){var a=l,f,e=s.substring(0,e).replace(H,i);if(e==i||e.charAt(e.length-1)==o)e+="*";try{f=t(e)}catch(k){}if(f){e=0;for(c=f.length;e<c;e++){for(var d=f[e],h=d.className,j=0,m=a.length;j<m;j++){var g=a[j];if(!RegExp("(^|\\s)"+g.className+"(\\s|$)").test(d.className)&&g.b&&(g.b===!0||g.b(d)===!0))h=u(h,g.className,!0)}d.className=h}}l=[]}return b}else{if(b=c?I(c):!v||v.test(d)?{className:w(d),b:!0}:null)return l.push(b),"."+b.className;return a}})}return d+a.join(",")})}function I(a){var c=!0,d=w(a.slice(1)),b=a.substring(0,5)==":not(",e,f;b&&(a=a.slice(5,-1));var l=a.indexOf("(");l>-1&&(a=a.substring(0,l));if(a.charAt(0)==":")switch(a.slice(1)){case "root":c=function(a){return b?a!=p:a==p};break;case "target":if(m==8){c=function(a){function c(){var d=location.hash,e=d.slice(1);return b?d==i||a.id!=e:d!=i&&a.id==e}k(j,"hashchange",function(){g(a,d,c())});return c()};break}return!1;case "checked":c=function(a){J.test(a.type)&&k(a,"propertychange",function(){event.propertyName=="checked"&&g(a,d,a.checked!==b)});return a.checked!==b};break;case "disabled":b=!b;case "enabled":c=function(c){if(K.test(c.tagName))return k(c,"propertychange",function(){event.propertyName=="$disabled"&&g(c,d,c.a===b)}),q.push(c),c.a=c.disabled,c.disabled===b;return a==":enabled"?b:!b};break;case "focus":e="focus",f="blur";case "hover":e||(e="mouseenter",f="mouseleave");c=function(a){k(a,b?f:e,function(){g(a,d,!0)});k(a,b?e:f,function(){g(a,d,!1)});return b};break;default:if(!L.test(a))return!1}return{className:d,b:c}}function w(a){return M+"-"+(m==6&&N?O++:a.replace(P,function(a){return a.charCodeAt(0)}))}function D(a){return a.replace(x,h).replace(Q,o)}function g(a,c,d){var b=a.className,c=u(b,c,d);if(c!=b)a.className=c,a.parentNode.className+=i}function u(a,c,d){var b=RegExp("(^|\\s)"+c+"(\\s|$)"),e=b.test(a);return d?e?a:a+o+c:e?a.replace(b,h).replace(x,h):a}function k(a,c,d){a.attachEvent("on"+c,d)}function r(a,c){if(/^https?:\/\//i.test(a))return c.substring(0,c.indexOf("/",8))==a.substring(0,a.indexOf("/",8))?a:null;if(a.charAt(0)=="/")return c.substring(0,c.indexOf("/",8))+a;var d=c.split(/[?#]/)[0];a.charAt(0)!="?"&&d.charAt(d.length-1)!="/"&&(d=d.substring(0,d.lastIndexOf("/")+1));return d+a}function y(a){if(a)return n.open("GET",a,!1),n.send(),(n.status==200?n.responseText:i).replace(R,i).replace(S,function(c,d,b,e,f){return y(r(b||f,a))}).replace(T,function(c,d,b){d=d||i;return" url("+d+r(b,a)+d+") "});return i}function U(){var a,c;a=f.getElementsByTagName("BASE");for(var d=a.length>0?a[0].href:f.location.href,b=0;b<f.styleSheets.length;b++)if(c=f.styleSheets[b],c.href!=i&&(a=r(c.href,d)))c.cssText=A(y(a));q.length>0&&setInterval(function(){for(var a=0,c=q.length;a<c;a++){var b=q[a];if(b.disabled!==b.a)b.disabled?(b.disabled=!1,b.a=!0,b.disabled=!0):b.a=b.disabled}},250)}if(!/*@cc_on!@*/true){var f=document,p=f.documentElement,n=function(){if(j.XMLHttpRequest)return new XMLHttpRequest;try{return new ActiveXObject("Microsoft.XMLHTTP")}catch(a){return null}}(),m=/MSIE (\d+)/.exec(navigator.userAgent)[1];if(!(f.compatMode!="CSS1Compat"||m<6||m>8||!n)){var z={NW:"*.Dom.select",MooTools:"$$",DOMAssistant:"*.$",Prototype:"$$",YAHOO:"*.util.Selector.query",Sizzle:"*",jQuery:"*",dojo:"*.query"},t,q=[],O=0,N=!0,M="slvzr",R=/(\/\*[^*]*\*+([^\/][^*]*\*+)*\/)\s*/g,S=/@import\s*(?:(?:(?:url\(\s*(['"]?)(.*)\1)\s*\))|(?:(['"])(.*)\3))[^;]*;/g,T=/\burl\(\s*(["']?)(?!data:)([^"')]+)\1\s*\)/g,L=/^:(empty|(first|last|only|nth(-last)?)-(child|of-type))$/,B=/:(:first-(?:line|letter))/g,C=/(^|})\s*([^\{]*?[\[:][^{]+)/g,G=/([ +~>])|(:[a-z-]+(?:\(.*?\)+)?)|(\[.*?\])/g,H=/(:not\()?:(hover|enabled|disabled|focus|checked|target|active|visited|first-line|first-letter)\)?/g,P=/[^\w-]/g,K=/^(INPUT|SELECT|TEXTAREA|BUTTON)$/,J=/^(checkbox|radio)$/,v=m>6?/[\$\^*]=(['"])\1/:null,E=/([(\[+~])\s+/g,F=/\s+([)\]+~])/g,Q=/\s+/g,x=/^\s*((?:[\S\s]*\S)?)\s*$/,i="",o=" ",h="$1";(function(a,c){function d(){try{p.doScroll("left")}catch(a){setTimeout(d,50);return}b("poll")}function b(d){if(!(d.type=="readystatechange"&&f.readyState!="complete")&&((d.type=="load"?a:f).detachEvent("on"+d.type,b,!1),!e&&(e=!0)))c.call(a,d.type||d)}var e=!1,g=!0;if(f.readyState=="complete")c.call(a,i);else{if(f.createEventObject&&p.doScroll){try{g=!a.frameElement}catch(h){}g&&d()}k(f,"readystatechange",b);k(a,"load",b)}})(j,function(){for(var a in z){var c,d,b=j;if(j[a]){for(c=z[a].replace("*",a).split(".");(d=c.shift())&&(b=b[d]););if(typeof b=="function"){t=b;U();break}}}})}}})(this);

/*!
 * jQuery Form Plugin
 * version: 3.28.0-2013.02.06
 * @requires jQuery v1.5 or later
 *
 * Examples and documentation at: http://malsup.com/jquery/form/
 * Project repository: https://github.com/malsup/form
 * Dual licensed under the MIT and GPL licenses:
 *    http://malsup.github.com/mit-license.txt
 *    http://malsup.github.com/gpl-license-v2.txt
 */
(function(c){function n(a){var e=a.data;a.isDefaultPrevented()||(a.preventDefault(),c(this).ajaxSubmit(e))}function v(a){var e=a.target,g=c(e);if(!g.is("[type=submit],[type=image]")){e=g.closest("[type=submit]");if(0===e.length)return;e=e[0]}var b=this;b.clk=e;"image"==e.type&&(void 0!==a.offsetX?(b.clk_x=a.offsetX,b.clk_y=a.offsetY):"function"==typeof c.fn.offset?(g=g.offset(),b.clk_x=a.pageX-g.left,b.clk_y=a.pageY-g.top):(b.clk_x=a.pageX-e.offsetLeft,b.clk_y=a.pageY-e.offsetTop));setTimeout(function(){b.clk= b.clk_x=b.clk_y=null},100)}function s(){if(c.fn.ajaxSubmit.debug){var a="[jquery.form] "+Array.prototype.join.call(arguments,"");window.console&&window.console.log?window.console.log(a):window.opera&&window.opera.postError&&window.opera.postError(a)}}var A,D;A=void 0!==c("<input type='file'/>").get(0).files;D=void 0!==window.FormData;c.fn.ajaxSubmit=function(a){function e(b){function e(){function a(){try{var b=(p.contentWindow?p.contentWindow.document:p.contentDocument?p.contentDocument:p.document).readyState; s("state = "+b);b&&"uninitialized"==b.toLowerCase()&&setTimeout(a,50)}catch(c){s("Server abort: ",c," (",c.name,")"),j(B),u&&clearTimeout(u),u=void 0}}var b=l.attr("target"),h=l.attr("action");f.setAttribute("target",n);g||f.setAttribute("method","POST");h!=d.url&&f.setAttribute("action",d.url);!d.skipEncodingOverride&&(!g||/post/i.test(g))&&l.attr({encoding:"multipart/form-data",enctype:"multipart/form-data"});d.timeout&&(u=setTimeout(function(){v=!0;j(z)},d.timeout));var m=[];try{if(d.extraData)for(var k in d.extraData)d.extraData.hasOwnProperty(k)&& (c.isPlainObject(d.extraData[k])&&d.extraData[k].hasOwnProperty("name")&&d.extraData[k].hasOwnProperty("value")?m.push(c('<input type="hidden" name="'+d.extraData[k].name+'">').val(d.extraData[k].value).appendTo(f)[0]):m.push(c('<input type="hidden" name="'+k+'">').val(d.extraData[k]).appendTo(f)[0]));d.iframeTarget||(w.appendTo("body"),p.attachEvent?p.attachEvent("onload",j):p.addEventListener("load",j,!1));setTimeout(a,15);try{f.submit()}catch(r){document.createElement("form").submit.apply(f)}}finally{f.setAttribute("action", h),b?f.setAttribute("target",b):l.removeAttr("target"),c(m).remove()}}function j(a){if(!h.aborted&&!C){try{r=p.contentWindow?p.contentWindow.document:p.contentDocument?p.contentDocument:p.document}catch(b){s("cannot access response document: ",b),a=B}if(a===z&&h)h.abort("timeout"),x.reject(h,"timeout");else if(a==B&&h)h.abort("server abort"),x.reject(h,"error","server abort");else if(r&&r.location.href!=d.iframeSrc||v){p.detachEvent?p.detachEvent("onload",j):p.removeEventListener("load",j,!1);a="success"; var e;try{if(v)throw"timeout";var g="xml"==d.dataType||r.XMLDocument||c.isXMLDoc(r);s("isXml="+g);if(!g&&(window.opera&&(null===r.body||!r.body.innerHTML))&&--D){s("requeing onLoad callback, DOM not available");setTimeout(j,250);return}var f=r.body?r.body:r.documentElement;h.responseText=f?f.innerHTML:null;h.responseXML=r.XMLDocument?r.XMLDocument:r;g&&(d.dataType="xml");h.getResponseHeader=function(a){return{"content-type":d.dataType}[a]};f&&(h.status=Number(f.getAttribute("status"))||h.status,h.statusText= f.getAttribute("statusText")||h.statusText);var k=(d.dataType||"").toLowerCase(),l=/(json|script|text)/.test(k);if(l||d.textarea){var q=r.getElementsByTagName("textarea")[0];if(q)h.responseText=q.value,h.status=Number(q.getAttribute("status"))||h.status,h.statusText=q.getAttribute("statusText")||h.statusText;else if(l){var n=r.getElementsByTagName("pre")[0],E=r.getElementsByTagName("body")[0];n?h.responseText=n.textContent?n.textContent:n.innerText:E&&(h.responseText=E.textContent?E.textContent:E.innerText)}}else"xml"== k&&(!h.responseXML&&h.responseText)&&(h.responseXML=H(h.responseText));try{var g=h,f=d,t=g.getResponseHeader("content-type")||"",F="xml"===k||!k&&0<=t.indexOf("xml"),y=F?g.responseXML:g.responseText;F&&"parsererror"===y.documentElement.nodeName&&c.error&&c.error("parsererror");f&&f.dataFilter&&(y=f.dataFilter(y,k));"string"===typeof y&&("json"===k||!k&&0<=t.indexOf("json")?y=I(y):("script"===k||!k&&0<=t.indexOf("javascript"))&&c.globalEval(y));A=y}catch(J){a="parsererror",h.error=e=J||a}}catch(G){s("error caught: ", G),a="error",h.error=e=G||a}h.aborted&&(s("upload aborted"),a=null);h.status&&(a=200<=h.status&&300>h.status||304===h.status?"success":"error");"success"===a?(d.success&&d.success.call(d.context,A,"success",h),x.resolve(h.responseText,"success",h),m&&c.event.trigger("ajaxSuccess",[h,d])):a&&(void 0===e&&(e=h.statusText),d.error&&d.error.call(d.context,h,a,e),x.reject(h,"error",e),m&&c.event.trigger("ajaxError",[h,d,e]));m&&c.event.trigger("ajaxComplete",[h,d]);m&&!--c.active&&c.event.trigger("ajaxStop"); d.complete&&d.complete.call(d.context,h,a);C=!0;d.timeout&&clearTimeout(u);setTimeout(function(){d.iframeTarget||w.remove();h.responseXML=null},100)}}}var f=l[0],k,d,m,n,w,p,h,t,v,u;t=!!c.fn.prop;var x=c.Deferred();if(b)for(k=0;k<q.length;k++)b=c(q[k]),t?b.prop("disabled",!1):b.removeAttr("disabled");d=c.extend(!0,{},c.ajaxSettings,a);d.context=d.context||d;n="jqFormIO"+(new Date).getTime();d.iframeTarget?(w=c(d.iframeTarget),(b=w.attr("name"))?n=b:w.attr("name",n)):(w=c('<iframe name="'+n+'" src="'+ d.iframeSrc+'" />'),w.css({position:"absolute",top:"-1000px",left:"-1000px"}));p=w[0];h={aborted:0,responseText:null,responseXML:null,status:0,statusText:"n/a",getAllResponseHeaders:function(){},getResponseHeader:function(){},setRequestHeader:function(){},abort:function(a){var b="timeout"===a?"timeout":"aborted";s("aborting upload... "+b);this.aborted=1;try{p.contentWindow.document.execCommand&&p.contentWindow.document.execCommand("Stop")}catch(e){}w.attr("src",d.iframeSrc);h.error=b;d.error&&d.error.call(d.context, h,b,a);m&&c.event.trigger("ajaxError",[h,d,b]);d.complete&&d.complete.call(d.context,h,b)}};(m=d.global)&&0===c.active++&&c.event.trigger("ajaxStart");m&&c.event.trigger("ajaxSend",[h,d]);if(d.beforeSend&&!1===d.beforeSend.call(d.context,h,d))return d.global&&c.active--,x.reject(),x;if(h.aborted)return x.reject(),x;if(t=f.clk)if((b=t.name)&&!t.disabled)d.extraData=d.extraData||{},d.extraData[b]=t.value,"image"==t.type&&(d.extraData[b+".x"]=f.clk_x,d.extraData[b+".y"]=f.clk_y);var z=1,B=2;t=c("meta[name=csrf-token]").attr("content"); if((b=c("meta[name=csrf-param]").attr("content"))&&t)d.extraData=d.extraData||{},d.extraData[b]=t;d.forceSync?e():setTimeout(e,10);var A,r,D=50,C,H=c.parseXML||function(a,b){window.ActiveXObject?(b=new ActiveXObject("Microsoft.XMLDOM"),b.async="false",b.loadXML(a)):b=(new DOMParser).parseFromString(a,"text/xml");return b&&b.documentElement&&"parsererror"!=b.documentElement.nodeName?b:null},I=c.parseJSON||function(a){return window.eval("("+a+")")};return x}if(!this.length)return s("ajaxSubmit: skipping submit process - no element selected"), this;var g,b,l=this;"function"==typeof a&&(a={success:a});g=this.attr("method");b=this.attr("action");(b=(b="string"===typeof b?c.trim(b):"")||window.location.href||"")&&(b=(b.match(/^([^#]+)/)||[])[1]);a=c.extend(!0,{url:b,success:c.ajaxSettings.success,type:g||"GET",iframeSrc:/^https/i.test(window.location.href||"")?"javascript:false":"about:blank"},a);b={};this.trigger("form-pre-serialize",[this,a,b]);if(b.veto)return s("ajaxSubmit: submit vetoed via form-pre-serialize trigger"),this;if(a.beforeSerialize&& !1===a.beforeSerialize(this,a))return s("ajaxSubmit: submit aborted via beforeSerialize callback"),this;var f=a.traditional;void 0===f&&(f=c.ajaxSettings.traditional);var q=[],j,m=this.formToArray(a.semantic,q);a.data&&(a.extraData=a.data,j=c.param(a.data,f));if(a.beforeSubmit&&!1===a.beforeSubmit(m,this,a))return s("ajaxSubmit: submit aborted via beforeSubmit callback"),this;this.trigger("form-submit-validate",[m,this,a,b]);if(b.veto)return s("ajaxSubmit: submit vetoed via form-submit-validate trigger"), this;b=c.param(m,f);j&&(b=b?b+"&"+j:j);"GET"==a.type.toUpperCase()?(a.url+=(0<=a.url.indexOf("?")?"&":"?")+b,a.data=null):a.data=b;var k=[];a.resetForm&&k.push(function(){l.resetForm()});a.clearForm&&k.push(function(){l.clearForm(a.includeHidden)});if(!a.dataType&&a.target){var B=a.success||function(){};k.push(function(b){var e=a.replaceTarget?"replaceWith":"html";c(a.target)[e](b).each(B,arguments)})}else a.success&&k.push(a.success);a.success=function(b,c,e){for(var g=a.context||this,f=0,d=k.length;f< d;f++)k[f].apply(g,[b,c,e||l,l])};j=0<c('input[type=file]:enabled[value!=""]',this).length;b="multipart/form-data"==l.attr("enctype")||"multipart/form-data"==l.attr("encoding");f=A&&D;s("fileAPI :"+f);var z;if(!1!==a.iframe&&(a.iframe||(j||b)&&!f))a.closeKeepAlive?c.get(a.closeKeepAlive,function(){z=e(m)}):z=e(m);else if((j||b)&&f){var n=new FormData;for(b=0;b<m.length;b++)n.append(m[b].name,m[b].value);if(a.extraData){b=c.param(a.extraData).split("&");f=b.length;j=[];var u,v;for(u=0;u<f;u++)b[u]= b[u].replace(/\+/g," "),v=b[u].split("="),j.push([decodeURIComponent(v[0]),decodeURIComponent(v[1])]);for(b=0;b<j.length;b++)j[b]&&n.append(j[b][0],j[b][1])}a.data=null;j=c.extend(!0,{},c.ajaxSettings,a,{contentType:!1,processData:!1,cache:!1,type:g||"POST"});a.uploadProgress&&(j.xhr=function(){var b=jQuery.ajaxSettings.xhr();b.upload&&b.upload.addEventListener("progress",function(b){var c=0,e=b.loaded||b.position,f=b.total;b.lengthComputable&&(c=Math.ceil(100*(e/f)));a.uploadProgress(b,e,f,c)},!1); return b});j.data=null;var C=j.beforeSend;j.beforeSend=function(a,b){b.data=n;C&&C.call(this,a,b)};z=c.ajax(j)}else z=c.ajax(a);l.removeData("jqxhr").data("jqxhr",z);for(j=0;j<q.length;j++)q[j]=null;this.trigger("form-submit-notify",[this,a]);return this};c.fn.ajaxForm=function(a){a=a||{};a.delegation=a.delegation&&c.isFunction(c.fn.on);if(!a.delegation&&0===this.length){var e=this.selector,g=this.context;if(!c.isReady&&e)return s("DOM not ready, queuing ajaxForm"),c(function(){c(e,g).ajaxForm(a)}), this;s("terminating; zero elements found by selector"+(c.isReady?"":" (DOM not ready)"));return this}return a.delegation?(c(document).off("submit.form-plugin",this.selector,n).off("click.form-plugin",this.selector,v).on("submit.form-plugin",this.selector,a,n).on("click.form-plugin",this.selector,a,v),this):this.ajaxFormUnbind().bind("submit.form-plugin",a,n).bind("click.form-plugin",a,v)};c.fn.ajaxFormUnbind=function(){return this.unbind("submit.form-plugin click.form-plugin")};c.fn.formToArray=function(a, e){var g=[];if(0===this.length)return g;var b=this[0],l=a?b.getElementsByTagName("*"):b.elements;if(!l)return g;var f,q,j,m,k,n;f=0;for(n=l.length;f<n;f++)if(k=l[f],j=k.name)if(a&&b.clk&&"image"==k.type)!k.disabled&&b.clk==k&&(g.push({name:j,value:c(k).val(),type:k.type}),g.push({name:j+".x",value:b.clk_x},{name:j+".y",value:b.clk_y}));else if((m=c.fieldValue(k,!0))&&m.constructor==Array){e&&e.push(k);q=0;for(k=m.length;q<k;q++)g.push({name:j,value:m[q]})}else if(A&&"file"==k.type&&!k.disabled)if(e&& e.push(k),m=k.files,m.length)for(q=0;q<m.length;q++)g.push({name:j,value:m[q],type:k.type});else g.push({name:j,value:"",type:k.type});else null!==m&&"undefined"!=typeof m&&(e&&e.push(k),g.push({name:j,value:m,type:k.type,required:k.required}));if(!a&&b.clk&&(l=c(b.clk),f=l[0],(j=f.name)&&!f.disabled&&"image"==f.type))g.push({name:j,value:l.val()}),g.push({name:j+".x",value:b.clk_x},{name:j+".y",value:b.clk_y});return g};c.fn.formSerialize=function(a){return c.param(this.formToArray(a))};c.fn.fieldSerialize= function(a){var e=[];this.each(function(){var g=this.name;if(g){var b=c.fieldValue(this,a);if(b&&b.constructor==Array)for(var l=0,f=b.length;l<f;l++)e.push({name:g,value:b[l]});else null!==b&&"undefined"!=typeof b&&e.push({name:this.name,value:b})}});return c.param(e)};c.fn.fieldValue=function(a){for(var e=[],g=0,b=this.length;g<b;g++){var l=c.fieldValue(this[g],a);null===l||("undefined"==typeof l||l.constructor==Array&&!l.length)||(l.constructor==Array?c.merge(e,l):e.push(l))}return e};c.fieldValue= function(a,e){var g=a.name,b=a.type,l=a.tagName.toLowerCase();void 0===e&&(e=!0);if(e&&(!g||a.disabled||"reset"==b||"button"==b||("checkbox"==b||"radio"==b)&&!a.checked||("submit"==b||"image"==b)&&a.form&&a.form.clk!=a||"select"==l&&-1==a.selectedIndex))return null;if("select"==l){var f=a.selectedIndex;if(0>f)return null;for(var g=[],l=a.options,n=(b="select-one"==b)?f+1:l.length,f=b?f:0;f<n;f++){var j=l[f];if(j.selected){var m=j.value;m||(m=j.attributes&&j.attributes.value&&!j.attributes.value.specified? j.text:j.value);if(b)return m;g.push(m)}}return g}return c(a).val()};c.fn.clearForm=function(a){return this.each(function(){c("input,select,textarea",this).clearFields(a)})};c.fn.clearFields=c.fn.clearInputs=function(a){var e=/^(?:color|date|datetime|email|month|number|password|range|search|tel|text|time|url|week)$/i;return this.each(function(){var g=this.type,b=this.tagName.toLowerCase();if(e.test(g)||"textarea"==b)this.value="";else if("checkbox"==g||"radio"==g)this.checked=!1;else if("select"== b)this.selectedIndex=-1;else if("file"==g)/MSIE/.test(navigator.userAgent)?c(this).replaceWith(c(this).clone()):c(this).val("");else if(a&&(!0===a&&/hidden/.test(g)||"string"==typeof a&&c(this).is(a)))this.value=""})};c.fn.resetForm=function(){return this.each(function(){("function"==typeof this.reset||"object"==typeof this.reset&&!this.reset.nodeType)&&this.reset()})};c.fn.enable=function(a){void 0===a&&(a=!0);return this.each(function(){this.disabled=!a})};c.fn.selected=function(a){void 0===a&& (a=!0);return this.each(function(){var e=this.type;"checkbox"==e||"radio"==e?this.checked=a:"option"==this.tagName.toLowerCase()&&(e=c(this).parent("select"),a&&(e[0]&&"select-one"==e[0].type)&&e.find("option").selected(!1),this.selected=a)})};c.fn.ajaxSubmit.debug=!1})(jQuery);

/*! qTip2 v2.0.1-36- (includes: tips / basic css3) | qtip2.com | Licensed MIT, GPL | Wed Mar 20 2013 08:57:14 */
(function(e,t,n){(function(e){"use strict";typeof define=="function"&&define.amd?define(["jquery"],e):jQuery&&!jQuery.fn.qtip&&e(jQuery)})(function(r){function P(n){S={pageX:n.pageX,pageY:n.pageY,type:"mousemove",scrollX:e.pageXOffset||t.body.scrollLeft||t.documentElement.scrollLeft,scrollY:e.pageYOffset||t.body.scrollTop||t.documentElement.scrollTop}}function H(e){var t=function(e){return e===o||"object"!=typeof e},n=function(e){return!r.isFunction(e)&&(!e&&!e.attr||e.length<1||"object"==typeof e&&!e.jquery&&!e.then)};if(!e||"object"!=typeof e)return s;t(e.metadata)&&(e.metadata={type:e.metadata});if("content"in e){if(t(e.content)||e.content.jquery)e.content={text:e.content};n(e.content.text||s)&&(e.content.text=s),"title"in e.content&&(t(e.content.title)&&(e.content.title={text:e.content.title}),n(e.content.title.text||s)&&(e.content.title.text=s))}return"position"in e&&t(e.position)&&(e.position={my:e.position,at:e.position}),"show"in e&&t(e.show)&&(e.show=e.show.jquery?{target:e.show}:e.show===i?{ready:i}:{event:e.show}),"hide"in e&&t(e.hide)&&(e.hide=e.hide.jquery?{target:e.hide}:{event:e.hide}),"style"in e&&t(e.style)&&(e.style={classes:e.style}),r.each(E,function(){this.sanitize&&this.sanitize(e)}),e}function B(n,u,a,f){function R(e){var t=0,n,r=u,i=e.split(".");while(r=r[i[t++]])t<i.length&&(n=r);return[n||u,i.pop()]}function U(e){return C.concat("").join(e?"-"+e+" ":" ")}function z(){var e=u.style.widget,t=B.hasClass(F);B.removeClass(F),F=e?"ui-state-disabled":"qtip-disabled",B.toggleClass(F,t),B.toggleClass("ui-helper-reset "+U(),e).toggleClass(L,u.style.def&&!e),I.content&&I.content.toggleClass(U("content"),e),I.titlebar&&I.titlebar.toggleClass(U("header"),e),I.button&&I.button.toggleClass(x+"-icon",!e)}function W(e){I.title&&(I.titlebar.remove(),I.titlebar=I.title=I.button=o,e!==s&&l.reposition())}function X(){var e=u.content.title.button,t=typeof e=="string",n=t?e:"Close tooltip";I.button&&I.button.remove(),e.jquery?I.button=e:I.button=r("<a />",{"class":"qtip-close "+(u.style.widget?"":x+"-icon"),title:n,"aria-label":n}).prepend(r("<span />",{"class":"ui-icon ui-icon-close",html:"&times;"})),I.button.appendTo(I.titlebar||B).attr("role","button").click(function(e){return B.hasClass(F)||l.hide(e),s})}function V(){var e=g+"-title";I.titlebar&&W(),I.titlebar=r("<div />",{"class":x+"-titlebar "+(u.style.widget?U("header"):"")}).append(I.title=r("<div />",{id:e,"class":x+"-title","aria-atomic":i})).insertBefore(I.content).delegate(".qtip-close","mousedown keydown mouseup keyup mouseout",function(e){r(this).toggleClass("ui-state-active ui-state-focus",e.type.substr(-4)==="down")}).delegate(".qtip-close","mouseover mouseout",function(e){r(this).toggleClass("ui-state-hover",e.type==="mouseover")}),u.content.title.button&&X()}function J(e){var t=I.button;if(!l.rendered)return s;e?X():t.remove()}function K(e,t){var i=I.title;if(!l.rendered||!e)return s;r.isFunction(e)&&(e=e.call(n,q.event,l));if(e===s||!e&&e!=="")return W(s);e.jquery&&e.length>0?i.empty().append(e.css({display:"block"})):i.html(e),t!==s&&l.rendered&&B[0].offsetWidth>0&&l.reposition(q.event)}function Q(e){e&&r.isFunction(e.done)&&e.done(function(e){G(e,null,s)})}function G(e,t,i){function a(e){function s(t){if(t.src===b||r.inArray(t,i)!==-1)return;i.push(t),r.data(t,"imagesLoaded",{src:t.src}),n.length===i.length&&(setTimeout(e),n.unbind(".imagesLoaded"))}var t=r(this),n=t.find("img").add(t.filter("img")),i=[];if(!n.length)return e();n.bind("load.imagesLoaded error.imagesLoaded",function(e){s(e.target)}).each(function(e,t){var n=t.src,i=r.data(t,"imagesLoaded");if(i&&i.src===n||t.complete&&t.naturalWidth)s(t);else if(t.readyState||t.complete)t.src=b,t.src=n})}var o=I.content;return!l.rendered||!e?s:(r.isFunction(e)&&(e=e.call(n,q.event,l)||""),i!==s&&Q(u.content.deferred),e.jquery&&e.length>0?o.empty().append(e.css({display:"block"})):o.html(e),l.rendered<0?B.queue("fx",a):(M=0,a.call(B[0],r.noop)),l)}function Y(){function p(e){if(B.hasClass(F))return s;clearTimeout(l.timers.show),clearTimeout(l.timers.hide);var t=function(){l.toggle(i,e)};u.show.delay>0?l.timers.show=setTimeout(t,u.show.delay):t()}function d(e){if(B.hasClass(F)||y||M)return s;var t=r(e.relatedTarget),n=t.closest(k)[0]===B[0],i=t[0]===f.show[0];clearTimeout(l.timers.show),clearTimeout(l.timers.hide);if(this!==t[0]&&o.target==="mouse"&&n||u.hide.fixed&&/mouse(out|leave|move)/.test(e.type)&&(n||i)){try{e.preventDefault(),e.stopImmediatePropagation()}catch(a){}return}u.hide.delay>0?l.timers.hide=setTimeout(function(){l.hide(e)},u.hide.delay):l.hide(e)}function v(e){if(B.hasClass(F))return s;clearTimeout(l.timers.inactive),l.timers.inactive=setTimeout(function(){l.hide(e)},u.hide.inactive)}function m(e){l.rendered&&B[0].offsetWidth>0&&l.reposition(e)}var o=u.position,f={show:u.show.target,hide:u.hide.target,viewport:r(o.viewport),document:r(t),body:r(t.body),window:r(e)},c={show:r.trim(""+u.show.event).split(" "),hide:r.trim(""+u.hide.event).split(" ")},h=E.ie===6;B.bind("mouseenter"+j+" mouseleave"+j,function(e){var t=e.type==="mouseenter";t&&l.focus(e),B.toggleClass(O,t)}),/mouse(out|leave)/i.test(u.hide.event)&&u.hide.leave==="window"&&f.document.bind("mouseout"+j+" blur"+j,function(e){!/select|option/.test(e.target.nodeName)&&!e.relatedTarget&&l.hide(e)}),u.hide.fixed?(f.hide=f.hide.add(B),B.bind("mouseover"+j,function(){B.hasClass(F)||clearTimeout(l.timers.hide)})):/mouse(over|enter)/i.test(u.show.event)&&f.hide.bind("mouseleave"+j,function(e){clearTimeout(l.timers.show)}),(""+u.hide.event).indexOf("unfocus")>-1&&o.container.closest("html").bind("mousedown"+j+" touchstart"+j,function(e){var t=r(e.target),i=l.rendered&&!B.hasClass(F)&&B[0].offsetWidth>0,s=t.parents(k).filter(B[0]).length>0;t[0]!==n[0]&&t[0]!==B[0]&&!s&&!n.has(t[0]).length&&i&&l.hide(e)}),"number"==typeof u.hide.inactive&&(f.show.bind("qtip-"+a+"-inactive",v),r.each(w.inactiveEvents,function(e,t){f.hide.add(I.tooltip).bind(t+j+"-inactive",v)})),r.each(c.hide,function(e,t){var n=r.inArray(t,c.show),i=r(f.hide);n>-1&&i.add(f.show).length===i.length||t==="unfocus"?(f.show.bind(t+j,function(e){B[0].offsetWidth>0?d(e):p(e)}),delete c.show[n]):f.hide.bind(t+j,d)}),r.each(c.show,function(e,t){f.show.bind(t+j,p)}),"number"==typeof u.hide.distance&&f.show.add(B).bind("mousemove"+j,function(e){var t=q.origin||{},n=u.hide.distance,r=Math.abs;(r(e.pageX-t.pageX)>=n||r(e.pageY-t.pageY)>=n)&&l.hide(e)}),o.target==="mouse"&&(f.show.bind("mousemove"+j,P),o.adjust.mouse&&(u.hide.event&&(B.bind("mouseleave"+j,function(e){(e.relatedTarget||e.target)!==f.show[0]&&l.hide(e)}),I.target.bind("mouseenter"+j+" mouseleave"+j,function(e){q.onTarget=e.type==="mouseenter"})),f.document.bind("mousemove"+j,function(e){l.rendered&&q.onTarget&&!B.hasClass(F)&&B[0].offsetWidth>0&&l.reposition(e||S)}))),(o.adjust.resize||f.viewport.length)&&(r.event.special.resize?f.viewport:f.window).bind("resize"+j,m),o.adjust.scroll&&f.window.add(o.container).bind("scroll"+j,m)}function Z(){var n=[u.show.target[0],u.hide.target[0],l.rendered&&I.tooltip[0],u.position.container[0],u.position.viewport[0],u.position.container.closest("html")[0],e,t];l.rendered?r([]).pushStack(r.grep(n,function(e){return typeof e=="object"})).unbind(j):u.show.target.unbind(j+"-create")}var l=this,m=t.body,g=x+"-"+a,y=0,M=0,B=r(),j=".qtip-"+a,F="qtip-disabled",I,q;l.id=a,l.rendered=s,l.destroyed=s,l.elements=I={target:n},l.timers={img:{}},l.options=u,l.checks={},l.plugins={},l.cache=q={event:{},target:r(),disabled:s,attr:f,onTarget:s,lastClass:""},l.checks.builtin={"^id$":function(e,t,n){var o=n===i?w.nextid:n,u=x+"-"+o;o!==s&&o.length>0&&!r("#"+u).length&&(B[0].id=u,I.content[0].id=u+"-content",I.title[0].id=u+"-title")},"^content.text$":function(e,t,n){G(u.content.text)},"^content.deferred$":function(e,t,n){Q(u.content.deferred)},"^content.title.text$":function(e,t,n){if(!n)return W();!I.title&&n&&V(),K(n)},"^content.title.button$":function(e,t,n){J(n)},"^position.(my|at)$":function(e,t,n){"string"==typeof n&&(e[t]=new E.Corner(n))},"^position.container$":function(e,t,n){l.rendered&&B.appendTo(n)},"^show.ready$":function(){l.rendered?l.toggle(i):l.render(1)},"^style.classes$":function(e,t,n){B.attr("class",x+" qtip "+n)},"^style.width|height":function(e,t,n){B.css(t,n)},"^style.widget|content.title":z,"^events.(render|show|move|hide|focus|blur)$":function(e,t,n){B[(r.isFunction(n)?"":"un")+"bind"]("tooltip"+t,n)},"^(show|hide|position).(event|target|fixed|inactive|leave|distance|viewport|adjust)":function(){var e=u.position;B.attr("tracking",e.target==="mouse"&&e.adjust.mouse),Z(),Y()}},r.extend(l,{_triggerEvent:function(e,t,n){var i=r.Event("tooltip"+e);return i.originalEvent=(n?r.extend({},n):o)||q.event||o,B.trigger(i,[l].concat(t||[])),!i.isDefaultPrevented()},render:function(e){if(l.rendered)return l;var t=u.content.text,o=u.content.title,a=u.position;return r.attr(n[0],"aria-describedby",g),B=I.tooltip=r("<div/>",{id:g,"class":[x,L,u.style.classes,x+"-pos-"+u.position.my.abbrev()].join(" "),width:u.style.width||"",height:u.style.height||"",tracking:a.target==="mouse"&&a.adjust.mouse,role:"alert","aria-live":"polite","aria-atomic":s,"aria-describedby":g+"-content","aria-hidden":i}).toggleClass(F,q.disabled).data("qtip",l).appendTo(u.position.container).append(I.content=r("<div />",{"class":x+"-content",id:g+"-content","aria-atomic":i})),l.rendered=-1,y=1,o.text?(V(),r.isFunction(o.text)||K(o.text,s)):o.button&&X(),(!r.isFunction(t)||t.then)&&G(t,s),l.rendered=i,z(),r.each(u.events,function(e,t){r.isFunction(t)&&B.bind(e==="toggle"?"tooltipshow tooltiphide":"tooltip"+e,t)}),r.each(E,function(){this.initialize==="render"&&this(l)}),Y(),B.queue("fx",function(t){l._triggerEvent("render"),y=0,(u.show.ready||e)&&l.toggle(i,q.event,s),t()}),l},get:function(e){var t,n;switch(e.toLowerCase()){case"dimensions":t={height:B.outerHeight(s),width:B.outerWidth(s)};break;case"offset":t=E.offset(B,u.position.container);break;default:n=R(e.toLowerCase()),t=n[0][n[1]],t=t.precedance?t.string():t}return t},set:function(e,t){function p(e,t){var n,r,i;for(n in c)for(r in c[n])if(i=(new RegExp(r,"i")).exec(e))t.push(i),c[n][r].apply(l,t)}var n=/^position\.(my|at|adjust|target|container)|style|content|show\.ready/i,a=/^content\.(title|attr)|style/i,f=s,c=l.checks,h;return"string"==typeof e?(h=e,e={},e[h]=t):e=r.extend(i,{},e),r.each(e,function(t,i){var s=R(t.toLowerCase()),o;o=s[0][s[1]],s[0][s[1]]="object"==typeof i&&i.nodeType?r(i):i,e[t]=[s[0],s[1],i,o],f=n.test(t)||f}),H(u),y=1,r.each(e,p),y=0,l.rendered&&B[0].offsetWidth>0&&f&&l.reposition(u.position.target==="mouse"?o:q.event),l},toggle:function(e,n){function w(){e?(E.ie&&B[0].style.removeAttribute("filter"),B.css("overflow",""),"string"==typeof f.autofocus&&r(f.autofocus,B).focus(),f.target.trigger("qtip-"+a+"-inactive")):B.css({display:"",visibility:"",opacity:"",left:"",top:""}),l._triggerEvent(e?"visible":"hidden")}if(n){if(/over|enter/.test(n.type)&&/out|leave/.test(q.event.type)&&u.show.target.add(n.target).length===u.show.target.length&&B.has(n.relatedTarget).length)return l;q.event=r.extend({},n)}if(!l.rendered)return e?l.render(1):l;var o=e?"show":"hide",f=u[o],c=u[e?"hide":"show"],h=u.position,p=u.content,d=B.css("width"),v=B[0].offsetWidth>0,m=e||f.target.length===1,g=!n||f.target.length<2||q.target[0]===n.target,y,b;return(typeof e).search("boolean|number")&&(e=!v),!B.is(":animated")&&v===e&&g?l:!l._triggerEvent(o,[90])&&!l.destroyed?l:(r.attr(B[0],"aria-hidden",!e),e?(q.origin=r.extend({},S),l.focus(n),r.isFunction(p.text)&&G(p.text,s),r.isFunction(p.title.text)&&K(p.title.text,s),!D&&h.target==="mouse"&&h.adjust.mouse&&(r(t).bind("mousemove.qtip",P),D=i),d||B.css("width",B.outerWidth()),l.reposition(n,arguments[2]),d||B.css("width",""),!f.solo||(typeof f.solo=="string"?r(f.solo):r(k,f.solo)).not(B).not(f.target).qtip("hide",r.Event("tooltipsolo"))):(clearTimeout(l.timers.show),delete q.origin,D&&!r(k+'[tracking="true"]:visible',f.solo).not(B).length&&(r(t).unbind("mousemove.qtip"),D=s),l.blur(n)),f.effect===s||m===s?(B[o](),w.call(B)):r.isFunction(f.effect)?(B.stop(1,1),f.effect.call(B,l),B.queue("fx",function(e){w(),e()})):B.fadeTo(90,e?1:0,w),e&&f.target.trigger("qtip-"+a+"-inactive"),l)},show:function(e){return l.toggle(i,e)},hide:function(e){return l.toggle(s,e)},focus:function(e){if(!l.rendered)return l;var t=r(k),n=parseInt(B[0].style.zIndex,10),i=w.zindex+t.length,s=r.extend({},e),o;return B.hasClass(A)||l._triggerEvent("focus",[i],s)&&(n!==i&&(t.each(function(){this.style.zIndex>n&&(this.style.zIndex=this.style.zIndex-1)}),t.filter("."+A).qtip("blur",s)),B.addClass(A)[0].style.zIndex=i),l},blur:function(e){return B.removeClass(A),l._triggerEvent("blur",[B.css("zIndex")],e),l},reposition:function(n,i){if(!l.rendered||y)return l;y=1;var o=u.position.target,a=u.position,f=a.my,m=a.at,g=a.adjust,b=g.method.split(" "),w=B.outerWidth(s),x=B.outerHeight(s),T=0,N=0,C=B.css("position"),k=a.viewport,L={left:0,top:0},A=a.container,O=B[0].offsetWidth>0,M=n&&n.type==="scroll",_=r(e),D,P;if(r.isArray(o)&&o.length===2)m={x:h,y:c},L={left:o[0],top:o[1]};else if(o==="mouse"&&(n&&n.pageX||q.event.pageX))m={x:h,y:c},n=S&&S.pageX&&(g.mouse||!n||!n.pageX)?{pageX:S.pageX,pageY:S.pageY}:(!n||n.type!=="resize"&&n.type!=="scroll"?n&&n.pageX&&n.type==="mousemove"?n:(!g.mouse||u.show.distance)&&q.origin&&q.origin.pageX?q.origin:n:q.event)||n||q.event||S||{},C!=="static"&&(L=A.offset()),L={left:n.pageX-L.left,top:n.pageY-L.top},g.mouse&&M&&(L.left-=S.scrollX-_.scrollLeft(),L.top-=S.scrollY-_.scrollTop());else{o==="event"&&n&&n.target&&n.type!=="scroll"&&n.type!=="resize"?q.target=r(n.target):o!=="event"&&(q.target=r(o.jquery?o:I.target)),o=q.target,o=r(o).eq(0);if(o.length===0)return l;o[0]===t||o[0]===e?(T=E.iOS?e.innerWidth:o.width(),N=E.iOS?e.innerHeight:o.height(),o[0]===e&&(L={top:(k||o).scrollTop(),left:(k||o).scrollLeft()})):E.imagemap&&o.is("area")?D=E.imagemap(l,o,m,E.viewport?b:s):E.svg&&o[0].ownerSVGElement?D=E.svg(l,o,m,E.viewport?b:s):(T=o.outerWidth(s),N=o.outerHeight(s),L=o.offset()),D&&(T=D.width,N=D.height,P=D.offset,L=D.position),L=E.offset(o,L,A);if(E.iOS>3.1&&E.iOS<4.1||E.iOS>=4.3&&E.iOS<4.33||!E.iOS&&C==="fixed")L.left-=_.scrollLeft(),L.top-=_.scrollTop();L.left+=m.x===d?T:m.x===v?T/2:0,L.top+=m.y===p?N:m.y===v?N/2:0}return L.left+=g.x+(f.x===d?-w:f.x===v?-w/2:0),L.top+=g.y+(f.y===p?-x:f.y===v?-x/2:0),E.viewport?(L.adjusted=E.viewport(l,L,a,T,N,w,x),P&&L.adjusted.left&&(L.left+=P.left),P&&L.adjusted.top&&(L.top+=P.top)):L.adjusted={left:0,top:0},l._triggerEvent("move",[L,k.elem||k],n)?(delete L.adjusted,i===s||!O||isNaN(L.left)||isNaN(L.top)||o==="mouse"||!r.isFunction(a.effect)?B.css(L):r.isFunction(a.effect)&&(a.effect.call(B,l,r.extend({},L)),B.queue(function(e){r(this).css({opacity:"",height:""}),E.ie&&this.style.removeAttribute("filter"),e()})),y=0,l):l},disable:function(e){return"boolean"!=typeof e&&(e=!B.hasClass(F)&&!q.disabled),l.rendered?(B.toggleClass(F,e),r.attr(B[0],"aria-disabled",e)):q.disabled=!!e,l},enable:function(){return l.disable(s)},destroy:function(e){function t(){var e=n[0],t=r.attr(e,_),i=n.data("qtip");l.rendered&&(r.each(l.plugins,function(e){this.destroy&&this.destroy(),delete l.plugins[e]}),B.stop(1,0).find("*").remove().end().remove(),l.rendered=s),clearTimeout(l.timers.show),clearTimeout(l.timers.hide),Z();if(!i||l===i)n.removeData("qtip").removeAttr(T),u.suppress&&t&&(n.attr("title",t),n.removeAttr(_)),n.removeAttr("aria-describedby");n.unbind(".qtip-"+a),delete N[l.id],delete l.options,delete l.elements,delete l.cache,delete l.timers,delete l.checks}if(l.destroyed)return;l.destroyed=i;var o=s;return e!==i&&(B.bind("tooltiphide",function(){o=i,B.bind("tooltiphidden",t)}),l.hide()),o||t(),n}})}function j(e,n,u){var a,f,l,c,h,p=r(t.body),d=e[0]===t?p:e,v=e.metadata?e.metadata(u.metadata):o,m=u.metadata.type==="html5"&&v?v[u.metadata.name]:o,g=e.data(u.metadata.name||"qtipopts");try{g=typeof g=="string"?r.parseJSON(g):g}catch(y){}c=r.extend(i,{},w.defaults,u,typeof g=="object"?H(g):o,H(m||v)),f=c.position,c.id=n;if("boolean"==typeof c.content.text){l=e.attr(c.content.attr);if(c.content.attr===s||!l)return s;c.content.text=l}f.container.length||(f.container=p),f.target===s&&(f.target=d),c.show.target===s&&(c.show.target=d),c.show.solo===i&&(c.show.solo=f.container.closest("body")),c.hide.target===s&&(c.hide.target=d),c.position.viewport===i&&(c.position.viewport=f.container),f.container=f.container.eq(0),f.at=new E.Corner(f.at),f.my=new E.Corner(f.my);if(e.data("qtip"))if(c.overwrite)e.qtip("destroy");else if(c.overwrite===s)return s;return e.attr(T,!0),c.suppress&&(h=e.attr("title"))&&e.removeAttr("title").attr(_,h).attr("title",""),a=new B(e,c,n,!!l),e.data("qtip",a),e.one("remove.qtip-"+n+" removeqtip.qtip-"+n,function(){var e;(e=r(this).data("qtip"))&&e.destroy()}),a}function R(e,t,n){var r=Math.ceil(t/2),i=Math.ceil(n/2),s={bottomright:[[0,0],[t,n],[t,0]],bottomleft:[[0,0],[t,0],[0,n]],topright:[[0,n],[t,0],[t,n]],topleft:[[0,0],[0,n],[t,n]],topcenter:[[0,n],[r,0],[t,n]],bottomcenter:[[0,0],[t,0],[r,n]],rightcenter:[[0,0],[t,i],[0,n]],leftcenter:[[t,0],[t,n],[0,i]]};return s.lefttop=s.bottomright,s.righttop=s.bottomleft,s.leftbottom=s.topright,s.rightbottom=s.topleft,s[e.string()]}function U(e,t){function k(e){var t=w.is(":visible");w.show(),e(),w.toggle(t)}function L(){x.width=g.height,x.height=g.width}function A(){x.width=g.width,x.height=g.height}function O(t,r,o,f){if(!b.tip)return;var l=m.corner.clone(),w=o.adjusted,E=e.options.position.adjust.method.split(" "),x=E[0],T=E[1]||E[0],N={left:s,top:s,x:0,y:0},C,k={},L;m.corner.fixed!==i&&(x===y&&l.precedance===u&&w.left&&l.y!==v?l.precedance=l.precedance===u?a:u:x!==y&&w.left&&(l.x=l.x===v?w.left>0?h:d:l.x===h?d:h),T===y&&l.precedance===a&&w.top&&l.x!==v?l.precedance=l.precedance===a?u:a:T!==y&&w.top&&(l.y=l.y===v?w.top>0?c:p:l.y===c?p:c),l.string()!==S.corner.string()&&(S.top!==w.top||S.left!==w.left)&&m.update(l,s)),C=m.position(l,w),C[l.x]+=_(l,l.x),C[l.y]+=_(l,l.y),C.right!==n&&(C.left=-C.right),C.bottom!==n&&(C.top=-C.bottom),C.user=Math.max(0,g.offset);if(N.left=x===y&&!!w.left)l.x===v?k["margin-left"]=N.x=C["margin-left"]-w.left:(L=C.right!==n?[w.left,-C.left]:[-w.left,C.left],(N.x=Math.max(L[0],L[1]))>L[0]&&(o.left-=w.left,N.left=s),k[C.right!==n?d:h]=N.x);if(N.top=T===y&&!!w.top)l.y===v?k["margin-top"]=N.y=C["margin-top"]-w.top:(L=C.bottom!==n?[w.top,-C.top]:[-w.top,C.top],(N.y=Math.max(L[0],L[1]))>L[0]&&(o.top-=w.top,N.top=s),k[C.bottom!==n?p:c]=N.y);b.tip.css(k).toggle(!(N.x&&N.y||l.x===v&&N.y||l.y===v&&N.x)),o.left-=C.left.charAt?C.user:x!==y||N.top||!N.left&&!N.top?C.left:0,o.top-=C.top.charAt?C.user:T!==y||N.left||!N.left&&!N.top?C.top:0,S.left=w.left,S.top=w.top,S.corner=l.clone()}function M(){var t=g.corner,n=e.options.position,r=n.at,o=n.my.string?n.my.string():n.my;return t===s||o===s&&r===s?s:(t===i?m.corner=new E.Corner(o):t.string||(m.corner=new E.Corner(t),m.corner.fixed=i),S.corner=new E.Corner(m.corner.string()),m.corner.string()!=="centercenter")}function _(e,t,n){t=t?t:e[e.precedance];var r=b.titlebar&&e.y===c,i=r?b.titlebar:w,s="border-"+t+"-width",o=function(e){return parseInt(e.css(s),10)},u;return k(function(){u=(n?o(n):o(b.content)||o(i)||o(w))||0}),u}function D(e){var t=b.titlebar&&e.y===c,n=t?b.titlebar:b.content,r="-moz-",i="-webkit-",s="border-radius-"+e.y+e.x,o="border-"+e.y+"-"+e.x+"-radius",u=function(e){return parseInt(n.css(e),10)||parseInt(w.css(e),10)},a;return k(function(){a=u(o)||u(s)||u(r+o)||u(r+s)||u(i+o)||u(i+s)||0}),a}function P(e){function N(e,t,n){var r=e.css(t)||p;return n&&r===e.css(n)?s:f.test(r)?s:r}var t,n,o,u=b.tip.css("cssText",""),a=e||m.corner,f=/rgba?\(0, 0, 0(, 0)?\)|transparent|#123456/i,l="border-"+a[a.precedance]+"-color",h="background-color",p="transparent",d=" !important",y=b.titlebar,E=y&&(a.y===c||a.y===v&&u.position().top+x.height/2+g.offset<y.outerHeight(i)),S=E?y:b.content;k(function(){T.fill=N(u,h)||N(S,h)||N(b.content,h)||N(w,h)||u.css(h),T.border=N(u,l,"color")||N(S,l,"color")||N(b.content,l,"color")||N(w,l,"color")||w.css(l),r("*",u).add(u).css("cssText",h+":"+p+d+";border:0"+d+";")})}function H(e){var t=e.precedance===a,n=x[t?f:l],r=x[t?l:f],i=e.string().indexOf(v)>-1,s=n*(i?.5:1),o=Math.pow,u=Math.round,c,h,p,d=Math.sqrt(o(s,2)+o(r,2)),m=[N/s*d,N/r*d];return m[2]=Math.sqrt(o(m[0],2)-o(N,2)),m[3]=Math.sqrt(o(m[1],2)-o(N,2)),c=d+m[2]+m[3]+(i?0:m[0]),h=c/d,p=[u(h*r),u(h*n)],{height:p[t?0:1],width:p[t?1:0]}}function B(e,t,n){return"<qvml:"+e+' xmlns="urn:schemas-microsoft.com:vml" class="qtip-vml" '+(t||"")+' style="behavior: url(#default#VML); '+(n||"")+'" />'}var m=this,g=e.options.style.tip,b=e.elements,w=b.tooltip,S={top:0,left:0},x={width:g.width,height:g.height},T={},N=g.border||0,C;m.corner=o,m.mimic=o,m.border=N,m.offset=g.offset,m.size=x,e.checks.tip={"^position.my|style.tip.(corner|mimic|border)$":function(){m.init()||m.destroy(),e.reposition()},"^style.tip.(height|width)$":function(){x={width:g.width,height:g.height},m.create(),m.update(),e.reposition()},"^content.title.text|style.(classes|widget)$":function(){b.tip&&b.tip.length&&m.update()}},r.extend(m,{init:function(){var e=M()&&(q||E.ie);return e&&(m.create(),m.update(),w.unbind(I).bind("tooltipmove"+I,O)),e},create:function(){var e=x.width,t=x.height,n;b.tip&&b.tip.remove(),b.tip=r("<div />",{"class":"qtip-tip"}).css({width:e,height:t}).prependTo(w),q?r("<canvas />").appendTo(b.tip)[0].getContext("2d").save():(n=B("shape",'coordorigin="0,0"',"position:absolute;"),b.tip.html(n+n),r("*",b.tip).bind("click"+I+" mousedown"+I,function(e){e.stopPropagation()}))},update:function(e,t){var n=b.tip,f=n.children(),l=x.width,y=x.height,C=g.mimic,k=Math.round,O,M,D,j,F;e||(e=S.corner||m.corner),C===s?C=e:(C=new E.Corner(C),C.precedance=e.precedance,C.x==="inherit"?C.x=e.x:C.y==="inherit"?C.y=e.y:C.x===C.y&&(C[e.precedance]=e[e.precedance])),O=C.precedance,e.precedance===u?L():A(),b.tip.css({width:l=x.width,height:y=x.height}),P(e),T.border!=="transparent"?(N=_(e,o),g.border===0&&N>0&&(T.fill=T.border),m.border=N=g.border!==i?g.border:N):m.border=N=0,D=R(C,l,y),m.size=F=H(e),n.css(F).css("line-height",F.height+"px"),e.precedance===a?j=[k(C.x===h?N:C.x===d?F.width-l-N:(F.width-l)/2),k(C.y===c?F.height-y:0)]:j=[k(C.x===h?F.width-l:0),k(C.y===c?N:C.y===p?F.height-y-N:(F.height-y)/2)],q?(f.attr(F),M=f[0].getContext("2d"),M.restore(),M.save(),M.clearRect(0,0,3e3,3e3),M.fillStyle=T.fill,M.strokeStyle=T.border,M.lineWidth=N*2,M.lineJoin="miter",M.miterLimit=100,M.translate(j[0],j[1]),M.beginPath(),M.moveTo(D[0][0],D[0][1]),M.lineTo(D[1][0],D[1][1]),M.lineTo(D[2][0],D[2][1]),M.closePath(),N&&(w.css("background-clip")==="border-box"&&(M.strokeStyle=T.fill,M.stroke()),M.strokeStyle=T.border,M.stroke()),M.fill()):(D="m"+D[0][0]+","+D[0][1]+" l"+D[1][0]+","+D[1][1]+" "+D[2][0]+","+D[2][1]+" xe",j[2]=N&&/^(r|b)/i.test(e.string())?E.ie===8?2:1:0,f.css({coordsize:l+N+" "+(y+N),antialias:""+(C.string().indexOf(v)>-1),left:j[0],top:j[1],width:l+N,height:y+N}).each(function(e){var t=r(this);t[t.prop?"prop":"attr"]({coordsize:l+N+" "+(y+N),path:D,fillcolor:T.fill,filled:!!e,stroked:!e}).toggle(!!N||!!e),!e&&t.html()===""&&t.html(B("stroke",'weight="'+N*2+'px" color="'+T.border+'" miterlimit="1000" joinstyle="miter"'))})),setTimeout(function(){b.tip.css({display:"inline-block",visibility:"visible"})},1),t!==s&&m.position(e)},position:function(e){var t=b.tip,n={},i=Math.max(0,g.offset),o,p,d;return g.corner===s||!t?s:(e=e||m.corner,o=e.precedance,p=H(e),d=[e.x,e.y],o===u&&d.reverse(),r.each(d,function(t,r){var s,u,d;r===v?(s=o===a?h:c,n[s]="50%",n["margin-"+s]=-Math.round(p[o===a?f:l]/2)+i):(s=_(e,r),u=_(e,r,b.content),d=D(e),n[r]=t?u:i+(d>s?d:-s))}),n[e[o]]-=p[o===u?f:l],t.css({top:"",bottom:"",left:"",right:"",margin:""}).css(n),n)},destroy:function(){w.unbind(I),b.tip&&b.tip.find("*").remove().end().remove(),delete m.corner,delete m.mimic,delete m.size}}),m.init()}var i=!0,s=!1,o=null,u="x",a="y",f="width",l="height",c="top",h="left",p="bottom",d="right",v="center",m="flip",g="flipinvert",y="shift",b="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",w,E,S,x="qtip",T="data-hasqtip",N={},C=["ui-widget","ui-tooltip"],k="div.qtip."+x,L=x+"-default",A=x+"-focus",O=x+"-hover",M="_replacedByqTip",_="oldtitle",D;w=r.fn.qtip=function(e,t,u){var a=(""+e).toLowerCase(),f=o,l=r.makeArray(arguments).slice(1),c=l[l.length-1],h=this[0]?r.data(this[0],"qtip"):o;if(!arguments.length&&h||a==="api")return h;if("string"==typeof e)return this.each(function(){var e=r.data(this,"qtip");if(!e)return i;c&&c.timeStamp&&(e.cache.event=c);if(a!=="option"&&a!=="options"||!t)e[a]&&e[a].apply(e[a],l);else{if(!r.isPlainObject(t)&&u===n)return f=e.get(t),s;e.set(t,u)}}),f!==o?f:this;if("object"==typeof e||!arguments.length)return h=H(r.extend(i,{},e)),w.bind.call(this,h,c)},w.bind=function(e,t){return this.each(function(o){function p(e){function t(){c.render(typeof e=="object"||u.show.ready),a.show.add(a.hide).unbind(l)}if(c.cache.disabled)return s;c.cache.event=r.extend({},e),c.cache.target=e?r(e.target):[n],u.show.delay>0?(clearTimeout(c.timers.show),c.timers.show=setTimeout(t,u.show.delay),f.show!==f.hide&&a.hide.bind(f.hide,function(){clearTimeout(c.timers.show)})):t()}var u,a,f,l,c,h;h=r.isArray(e.id)?e.id[o]:e.id,h=!h||h===s||h.length<1||N[h]?w.nextid++:N[h]=h,l=".qtip-"+h+"-create",c=j(r(this),h,e);if(c===s)return i;u=c.options,r.each(E,function(){this.initialize==="initialize"&&this(c)}),a={show:u.show.target,hide:u.hide.target},f={show:r.trim(""+u.show.event).replace(/ /g,l+" ")+l,hide:r.trim(""+u.hide.event).replace(/ /g,l+" ")+l},/mouse(over|enter)/i.test(f.show)&&!/mouse(out|leave)/i.test(f.hide)&&(f.hide+=" mouseleave"+l),a.show.bind("mousemove"+l,function(e){P(e),c.cache.onTarget=i}),a.show.bind(f.show,p),(u.show.ready||u.prerender)&&p(t)})},E=w.plugins={Corner:function(e){e=(""+e).replace(/([A-Z])/," $1").replace(/middle/gi,v).toLowerCase(),this.x=(e.match(/left|right/i)||e.match(/center/)||["inherit"])[0].toLowerCase(),this.y=(e.match(/top|bottom|center/i)||["inherit"])[0].toLowerCase();var t=e.charAt(0);this.precedance=t==="t"||t==="b"?a:u,this.string=function(){return this.precedance===a?this.y+this.x:this.x+this.y},this.abbrev=function(){var e=this.x.substr(0,1),t=this.y.substr(0,1);return e===t?e:this.precedance===a?t+e:e+t},this.invertx=function(e){this.x=this.x===h?d:this.x===d?h:e||this.x},this.inverty=function(e){this.y=this.y===c?p:this.y===p?c:e||this.y},this.clone=function(){return{x:this.x,y:this.y,precedance:this.precedance,string:this.string,abbrev:this.abbrev,clone:this.clone,invertx:this.invertx,inverty:this.inverty}}},offset:function(e,n,i){function c(e,t){n.left+=t*e.scrollLeft(),n.top+=t*e.scrollTop()}var s=e.closest("body"),o=E.ie&&t.compatMode!=="CSS1Compat",u=i,a,f,l;if(u){do u.css("position")!=="static"&&(f=u.position(),n.left-=f.left+(parseInt(u.css("borderLeftWidth"),10)||0)+(parseInt(u.css("marginLeft"),10)||0),n.top-=f.top+(parseInt(u.css("borderTopWidth"),10)||0)+(parseInt(u.css("marginTop"),10)||0),!a&&(l=u.css("overflow"))!=="hidden"&&l!=="visible"&&(a=u));while((u=r(u[0].offsetParent)).length);(a&&a[0]!==s[0]||o)&&c(a||s,1)}return n},ie:function(){var e=3,n=t.createElement("div");while(n.innerHTML="<!--[if gt IE "+ ++e+"]><i></i><![endif]-->")if(!n.getElementsByTagName("i")[0])break;return e>4?e:s}(),iOS:parseFloat((""+(/CPU.*OS ([0-9_]{1,5})|(CPU like).*AppleWebKit.*Mobile/i.exec(navigator.userAgent)||[0,""])[1]).replace("undefined","3_2").replace("_",".").replace("_",""))||s,fn:{attr:function(e,t){if(this.length){var n=this[0],i="title",s=r.data(n,"qtip");if(e===i&&s&&"object"==typeof s&&s.options.suppress)return arguments.length<2?r.attr(n,_):(s&&s.options.content.attr===i&&s.cache.attr&&s.set("content.text",t),this.attr(_,t))}return r.fn["attr"+M].apply(this,arguments)},clone:function(e){var t=r([]),n="title",i=r.fn["clone"+M].apply(this,arguments);return e||i.filter("["+_+"]").attr("title",function(){return r.attr(this,_)}).removeAttr(_),i}}},r.each(E.fn,function(e,t){if(!t||r.fn[e+M])return i;var n=r.fn[e+M]=r.fn[e];r.fn[e]=function(){return t.apply(this,arguments)||n.apply(this,arguments)}}),r.ui||(r["cleanData"+M]=r.cleanData,r.cleanData=function(e){for(var t=0,n;(n=r(e[t])).length&&n.attr(T);t++)try{n.triggerHandler("removeqtip")}catch(i){}r["cleanData"+M](e)}),w.version="2.0.1-36-",w.nextid=0,w.inactiveEvents="click dblclick mousedown mouseup mousemove mouseleave mouseenter".split(" "),w.zindex=15e3,w.defaults={prerender:s,id:s,overwrite:i,suppress:i,content:{text:i,attr:"title",deferred:s,title:{text:s,button:s}},position:{my:"top left",at:"bottom right",target:s,container:s,viewport:s,adjust:{x:0,y:0,mouse:i,scroll:i,resize:i,method:"flipinvert flipinvert"},effect:function(e,t,n){r(this).animate(t,{duration:200,queue:s})}},show:{target:s,event:"mouseenter",effect:i,delay:90,solo:s,ready:s,autofocus:s},hide:{target:s,event:"mouseleave",effect:i,delay:0,fixed:s,inactive:s,leave:"window",distance:s},style:{classes:"",widget:s,width:s,height:s,def:i},events:{render:o,move:o,show:o,hide:o,toggle:o,visible:o,hidden:o,focus:o,blur:o}};var F,I=".qtip-tip",q=!!t.createElement("canvas").getContext;F=E.tip=function(e){var t=e.plugins.tip;return"object"==typeof t?t:e.plugins.tip=new U(e)},F.initialize="render",F.sanitize=function(e){var t=e.style,n;t&&"tip"in t&&(n=e.style.tip,typeof n!="object"&&(e.style.tip={corner:n}),/string|boolean/i.test(typeof n.corner)||(n.corner=i),typeof n.width!="number"&&delete n.width,typeof n.height!="number"&&delete n.height,typeof n.border!="number"&&n.border!==i&&delete n.border,typeof n.offset!="number"&&delete n.offset)},r.extend(i,w.defaults,{style:{tip:{corner:i,mimic:s,width:6,height:6,border:i,offset:0}}})})})(window,document);