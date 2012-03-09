// ==ClosureCompiler==
// @jk_output_file_name jkerny.min.js
// @compilation_level SIMPLE_OPTIMIZATIONS
// ==/ClosureCompiler==

/*global jQuery */
/*!
 * jkerny.js
 * Version: 1.33
 * Copyright 2011 Olivier Gorzalka
 * CSS Parser adapted from the jQuery based CSS parser by Daniel Wachsstock Copyright (c) 2011
 * MIT license
 */
 
 // jkerny opts
 var jk_opts = {
     crossbrowser : true // it makes pseudo-selectors work with old browsers. Great but bad for performance
 };
 
// CSS feature detection for selectors by Diego Perini (https://github.com/dperini/css-support)
this.CSS || (this.CSS = (function (global) {

    var sheet, style, doc = global.document,
        root = doc.documentElement,
        head = root.getElementsByTagName('head')[0] || root,

        impl = doc.implementation || {
            hasFeature: function () {
                return false;
            }
        },

        style = doc.createElement("style");
    style.type = 'text/css';

    head.insertBefore(style, head.firstChild);

    sheet = style.sheet || style.styleSheet;

    return {
        supportSelector: impl.hasFeature('CSS2', '') ?
            function(selector) {
            	if (!(sheet && selector)) return false;
            	try {
            		sheet.insertRule(selector + '{ }', 0);
            		sheet.deleteRule(sheet.cssRules.length - 1);
            	} catch(e) { return false; }
            	return true;
            } : function (selector) {
            if (!(sheet && selector)) return false;
            try {
                sheet.cssText = selector + ' { }';
            } catch (e) {
                return false;
            }
            return sheet.cssText.length !== 0
                && !(/unknown/i).test(sheet.cssText)
                && sheet.cssText.indexOf(selector) === 0;
        }

    };

})(this));
 
 
(function ($) {

    $.parsecss = function (str, callback) {
        var ret = {};
        str = munge(str).replace(/@(([^;`]|`[^b]|`b[^%])*(`b%)?);?/g, function (s, rule) {
            // @rules end with ; or a block, with the semicolon not being part of the rule but the closing brace (represented by `b%) is
            processAtRule($.trim(rule), callback);
            return '';
        });

        $.each(str.split('`b%'), function (i, css) { // split on the end of a block 
            css = css.split('%b`'); // css[0] is the selector; css[1] is the index in munged for the cssText
            if (css.length < 2) return; // invalid css
            css[0] = restore(css[0]);
            ret[css[0]] = $.extend(ret[css[0]] || {}, parsedeclarations(css[1]));
        });
        callback(ret);
    };
    
    // explanation of the above: munge(str) strips comments and encodes strings and brace-delimited blocks, so that
    // %b` corresponds to { and `b% corresponds to }
    // munge(str) replaces blocks with %b`1`b% (for example)
    // 
    // str.split('`b%') splits the text by '}' (which ends every CSS statement) 
    // Each so the each(munge(str... function(i,css)
    // is called with css being empty (the string after the last delimiter), an @rule, or a css statement of the form
    // selector %b`n where n is a number (the block was turned into %b`n`b% by munge). Splitting on %b` gives the selector and the
    // number corresponding to the declaration block. parsedeclarations will do restore('%b`'+n+'`b%') to get it back.
    // if anyone ever implements http://www.w3.org/TR/cssom-view/#the-media-interface, we're ready
    $.parsecss.mediumApplies = (window.media && window.media.query) ||
    function (str) {
        if (!str) return true; // if no descriptor, everything applies
        if (str in media) return media[str];
        var style = $('<style media="' + str + '">body {position: relative; z-index: 1;}</style>').appendTo('head');
        return media[str] = [$('body').css('z-index') == 1, style.remove()][0]; // the [x,y][0] is a silly hack to evaluate two expressions and return the first
    };

    // caches
    var media = {}, // media description strings
        munged = {}; // strings that were removed by the parser so they don't mess up searching for specific characters
    // private functions
    function parsedeclarations(index) { // take a string from the munged array and parse it into an object of property: value pairs
        var str = munged[index].replace(/^{|}$/g, ''), // find the string and remove the surrounding braces
            parsed = {};
        str = munge(str); // make sure any internal braces or strings are escaped
        $.each(str.split(';'), function (i, decl) {
            decl = decl.split(':');
            if (decl.length < 2) return;
            parsed[restore(decl[0])] = restore(decl.slice(1).join(':'));
        });
        return parsed;
    }

    // replace strings and brace-surrounded blocks with %s`number`s% and %b`number`b%. By successively taking out the innermost
    // blocks, we ensure that we're matching braces. No way to do this with just regular expressions. Obviously, this assumes no one
    // would use %s` in the real world.
    // Turns out this is similar to the method that Dean Edwards used for his CSS parser in IE7.js (http://code.google.com/p/ie7-js/)
    var REbraces = /{[^{}]*}/,
        REfull = /\[[^\[\]]*\]|{[^{}]*}|\([^()]*\)|function(\s+\w+)?(\s*%b`\d+`b%){2}/, // match pairs of parentheses, brackets, and braces and function definitions.
        REatcomment = /\/\*@((?:[^\*]|\*[^\/])*)\*\//g, // comments of the form /*@ text */ have text parsed 
    // we have to combine the comments and the strings because comments can contain string delimiters and strings can contain comment delimiters
    // var REcomment = /\/\*(?:[^\*]|\*[^\/])*\*\/|<!--|-->/g; // other comments are stripped. (this is a simplification of real SGML comments (see http://htmlhelp.com/reference/wilbur/misc/comment.html) , but it's what real browsers use)
    // var REstring = /\\.|"(?:[^\\\"]|\\.|\\\n)*"|'(?:[^\\\']|\\.|\\\n)*'/g; //  match escaped characters and strings
        REcomment_string = /(?:\/\*(?:[^\*]|\*[^\/])*\*\/)|(\\.|"(?:[^\\\"]|\\.|\\\n)*"|'(?:[^\\\']|\\.|\\\n)*')/g,
        REmunged = /%\w`(\d+)`\w%/,
        uid = 0; // unique id number
        
    function munge(str, full) {
        str = str.replace(REatcomment, '$1') // strip /*@ comments but leave the text (to let invalid CSS through)
        .replace(REcomment_string, function (s, string) { // strip strings and escaped characters, leaving munged markers, and strip comments
            if (!string) return '';
            var replacement = '%s`' + (++uid) + '`s%';
            munged[uid] = string.replace(/^\\/, ''); // strip the backslash now
            return replacement;
        });
        // need a loop here rather than .replace since we need to replace nested braces
        var RE = full ? REfull : REbraces;
        while (match = RE.exec(str)) {
            replacement = '%b`' + (++uid) + '`b%';
            munged[uid] = match[0];
            str = str.replace(RE, replacement);
        }
        return str;
    }

    function restore(str) {
        if (str === undefined) return str;
        while (match = REmunged.exec(str)) {
            str = str.replace(REmunged, munged[match[1]]);
        }
        return $.trim(str);
    }

    function processAtRule(rule, callback) {
        var split = rule.split(/\s+/), // split on whitespace
            type = split.shift(); // first word
        if (type == 'media') {
            var css = restore(split.pop()).slice(1, -1); // last word is the rule; need to strip the outermost braces
            if ($.parsecss.mediumApplies(split.join(' '))) {
                $.parsecss(css, callback);
            }
        } else if (type == 'import') {
            var url = restore(split.shift());
            if ($.parsecss.mediumApplies(split.join(' '))) {
                url = url.replace(/^url\(|\)$/gi, '').replace(/^["']|["']$/g, ''); // remove the url('...') wrapper
                $.get(url, function (str) {
                    $.parsecss(str, callback);
                });
            }
        }
    }

    /*
     * Lettering.JS 0.6.1
     *
     * Copyright 2010, Dave Rupert http://daverupert.com
     * Released under the WTFPL license
     * http://sam.zoy.org/wtfpl/
     *
     * Thanks to Paul Irish - http://paulirish.com - for the feedback.
     *
     * Date: Mon Sep 20 17:14:00 2010 -0600
     */
    function injector(t, splitter, klass, after) {
        var a = t.text().split(splitter),
            inject = '';
        if (a.length) {
            $(a).each(function (i, item) {
                inject += '<span class="' + klass + (i + 1) + '">' + item + '</span>' + after;
            });
            t.empty().append(inject);
        }
    }

    var methods = {
        init: function () {
            return this.each(function () {
                injector($(this), '', 'char', '');
            });
        },

        words: function () {
            return this.each(function () {
                injector($(this), ' ', 'word', ' ');
            });
        },

        lines: function () {
            return this.each(function () {
                var r = "eefec303079ad17405c889e092e105b0";
                // Because it's hard to split a <br/> tag consistently across browsers,
                // (*ahem* IE *ahem*), we replaces all <br/> instances with an md5 hash
                // (of the word "split").  If you're trying to use this plugin on that
                // md5 hash string, it will fail because you're being ridiculous.
                injector($(this).children("br").replaceWith(r).end(), r, 'line', '');
            });
        }
    };

    $.fn.lettering = function (method) {
        // Method calling logic
        if (method && methods[method]) {
            return methods[method].apply(this, [].slice.call(arguments, 1));
        } else if (method === 'letters' || !method) {
            return methods.init.apply(this, [].slice.call(arguments, 0)); // always pass an array
        }
        $.error('Method ' + method + ' does not exist on jQuery.lettering');
        return this;
    };
    
    $.cached_ajax = function(url, data, callback) {   
    
        function generate_id_cache(str){
            var r="";
            var e=str.length;
            var c=0;
            var h;
            while(c<e){
                h=str.charCodeAt(c++).toString(16);
                while(h.length<3) h="0"+h;
                r+=h;
            }
            return 'cachedcss_'+r.replace(/0/g, '');
        }
    
      	// get the context
		var storage = window.sessionStorage; 

		if(typeof(data) == 'function') { callback = data; data = {}; }
		// Options par défaut
		data 			= data 			|| null;
		callback 	= callback 	|| function(){};

		// if sessionStorage is available
		if(storage) {
	
			// get the cache id
			var cache_id = generate_id_cache(url);
			
			// cache exists !
			if(storage[cache_id]) {
				if(window.console && console.log) 
					console.log("cachedLoad : ", url);
				callback(storage[cache_id]);
		
			// cache doesn't exist
			} else {
				// load the url and cache it
				$.ajax({
				    url: url,
				    success: function (r) {
				        storage[cache_id] = r;
				        callback(r);
				    }
				});
			}
		// if sessionStorage isn't available
		} else {
            $.ajax({
                url: url,
                success: function (r) {
                    callback(r);
                }
            });
		}
    };
    
    // Add or replace a style sheet
    // css argument is a string of CSS rule sets
    // options.id is an optional name identifying the style sheet
    // options.doc is an optional document reference
    // N.B.: Uses DOM methods instead of jQuery to ensure cross-browser comaptibility.
    $.jkerny_style = function(r, opts) {
        options = $.extend({
            type: 'text/css',
            media: 'all',
            styleClass : 'default'
        }, opts);
        
        var doc = document,
            el = doc.createElement("style"),
            css = '';
        
        // loop through
        for (var s in r) {
            // don't accidentally include prototype rules
            if (r[s].hasOwnProperty) {
                css += s + ' {';
                for (var attribute in r[s]) {
                    css += attribute + ':' + r[s][attribute] + '; ';
                }
                css += '} ';
            }
        }
        
        if(doc.createStyleSheet) { // IE-specific handling
            doc.getElementsByTagName("head")[0].insertAdjacentHTML("beforeEnd",
                '&nbsp;<style class="' + options.styleClass + '" media="' + options.media + '" type="text/css">' + css + '</style>'); // fails without &nbsp;
        } else { // modern browsers
            el = doc.createElement("style");
            el.type = "text/css";
            el.media = options.media;
            el.className = options.styleClass;
            el.appendChild(doc.createTextNode(css));
            doc.getElementsByTagName("head")[0].appendChild(el);
        }
    };
    
    var jk_lettering_replace = {
            ':unknown':'', // prevent ie bug with unknown pseudo-selectors
            ':((first|last)(-))?(letter|word)':'._$2$3$4',
            '._(letter|word):(first|last)-child':'._$2-$1',
            '._((last|first)-)letter':'span.jkerny-word:$2-child span.jkerny-letter:$2-child',
            '._((last|first)-)word':'span.jkerny-word:$2-child',
            '._(letter|word)':'span.jkerny-$1',
            '(span.jkerny-word([^ ]*)?) *span.jkerny-word:(first|last)-child':'$1' // prevent double span.jkerny-word
        },
        jk_pseudo_structural=':(eq|empty|(first|last|only|nth(-last)?)-(child|of-type))([^\\)]*\\))?', // courtesy of selectivizr by keithclark http://selectivizr.com
        jk_pseudo_selectors=':(hover|enabled|disabled|focus|checked|target|active|visited|after|before)',
        jk_split_expr= /(>|~|\+)? span.jkerny-(letter|word)/gi,
        jk_medias_screen= 'all',
        jk_kerning_counter= 0,
        jk_output = {};
    
    $.jkerny = {
    
        // run jkerny run !
        run: function () {
            var jkerny = this,
                selectors = {},
                content = '';
            
            $.jkerny_style(
                {
                    'span.jkerny-word, span.jkerny-letter' : {'display' : 'inline-block'},
                    '.jkerny' : { 'visibility' : 'inherit' }
                }, { styleClass : 'jkerny'}
            );

            $('style:not(.jkerny),link[rel=stylesheet]').each(function () {
                jk_output[jk_medias_screen] = {};
                
                if(
                    this.href && !this.disabled && !(this.href.indexOf('//'+window.location.host) < 0 && /^\w+:/.test(this.href)) 
                ) {
                    $.cached_ajax(this.href, function(content) {
                        jk_medias_screen = typeof $(this).attr('media') == 'undefined' ? 'all' : $(this).attr('media');
                        jkerny.parseCss(content);
                    });
                } else {
                    jk_medias_screen = typeof $(this).attr('media') == 'undefined' ? 'all' : $(this).attr('media');
                    jkerny.parseCss($(this).removeAttr('type').html());
                }
            });
        },
        
        parseMediaQueries: function(content) {
            var jkerny = this,
                media_datas = content.match(new RegExp(/@media([^\{]+)\{([^\{\}]+\{[^\}\{]+\})+/), 'gi');

            if (media_datas) {
                for (var i = 0; i < media_datas.length; i++) {
                    jk_medias_screen = $.trim(media_datas[1]);
                    if (typeof jk_output[jk_medias_screen] == 'undefined') {
                        jk_output[jk_medias_screen] = {};
                    }
                    jkerny.parseCss(media_datas[2], true);
                }
            }
        },

        // ok, let's parse the motherfucking css
        parseCss: function (content, mediaType) {
            var jkerny = this,
                mediaQueries = mediaType || false;
                
            content = jkerny.convertPseudoSelectors(content);

            $.parsecss(content, function (data) {
                selectors = jkerny.filterSelectors(data);
                jkerny.proceedCss(selectors);
            });
            
            if (mediaQueries === false) {
                jkerny.parseMediaQueries(content);
            }
        },

        convertPseudoSelectors: function (content) {
            for (var key_letter in jk_lettering_replace) {
                content = content.replace(new RegExp(key_letter, 'gi'), ' ' + jk_lettering_replace[key_letter]);
            }
            return content;
        },
        
        getLength: function(obj) {
            var i=0;
            for (var key in obj) { i++; }
            return i;
        },
        
        applyProperties: function(selectors, selector) {
            var $mainSelector, convertedSelector, elements, kerningValues, selectorType, split_selector, i, j;
            split_selector = selector.split(",");

            for (i = 0; i < split_selector.length; i++) {
                elements = split_selector[i].replace(new RegExp(jk_pseudo_selectors, 'gi'), '').split(jk_split_expr)[0];
                $mainSelector = $(split_selector[i].replace(new RegExp(jk_pseudo_selectors, 'gi'), ''));
                selectorType = $mainSelector.is('.jkerny-letter') ? 'letter' : 'word';
                convertedSelector = split_selector[i].replace(new RegExp('span.jkerny-(letter|word)('+jk_pseudo_structural+')?', 'gi'), '.jkerny-$1-'+jk_kerning_counter);
                $mainSelector.addClass('jkerny-'+selectorType+'-'+jk_kerning_counter).parent('.jkerny-word').addClass('jkerny-word-'+jk_kerning_counter);
                jk_output[jk_medias_screen][convertedSelector] =  selectors[selector];
            }
            jk_kerning_counter++;
        },
        
        proceedCss: function (selectors) {
            var jkerny = this,
                elements,
                split_selector,
                $elements,
                i;
            
            if (jkerny.getLength(selectors) > 0) {
                for (var selector in selectors) {
                    split_selector = selector.split(",");
                    for (i = 0; i < split_selector.length; i++) {
                        $elements = $(split_selector[i].replace(new RegExp(jk_pseudo_selectors, 'gi'), '').split(jk_split_expr)[0]);
                        $elements
                            .not('.jkerny')
                                .addClass('jkerny')
                                .lettering('words')
                                    .children('span')
                                        .addClass('jkerny-word')
                                    .lettering()
                                        .children('span')
                                            .addClass('jkerny-letter');
                    }
                    if (jk_opts.crossbrowser && !CSS.supportSelector(selector)) {
                        jkerny.applyProperties(selectors, selector);
                    } else {
                        jk_output[jk_medias_screen][selector] = selectors[selector];
                    }
                }
            }
               
            if (jkerny.getLength(jk_output[jk_medias_screen]) > 0) {
                $.jkerny_style(jk_output[jk_medias_screen], {media: jk_medias_screen, styleClass : 'jkerny'});
                jk_output[jk_medias_screen] = {};
            }
        },
        
        filterSelectors: function (selectors) {
            var s = selectors,
                t = {},
                kerningValues = [],
                attrMatch,
                split_selector,
                elements,
                i, j; 
            for (var selector in s) {
                if (selector.indexOf('jkerny-') > -1) {
                    t[selector] = s[selector];
                }
                for (var attribute in s[selector]) {
                    attrMatch = attribute.match(new RegExp(/-jkerny-(letter|word)-spacing/), 'gi');
                    if (attrMatch) {
                        kerningValues = s[selector][attrMatch[0]].replace(/[\n\s]+/g, ' ').split(' ');
                        split_selector = selector.split(",");
                        for (i = 0; i < split_selector.length; i++) {
                            for (j = 0; j < kerningValues.length; j++) {
                                elements = split_selector[i].replace(new RegExp(jk_pseudo_selectors, 'gi'), '').split(jk_split_expr)[0];
                                t[elements+' span.jkerny-'+attrMatch[1]+':eq('+j+')'] = { 'margin-right' : kerningValues[j] };
                            }
                        }
                    }
                }
            }
            s = t;
            return s;
        }
    };

    $(function () { $.jkerny.run(); });
})(jQuery);