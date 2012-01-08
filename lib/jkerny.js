/*global jQuery */
/*!
 * jKerny.js
 * Version: 1.3
 * Copyright 2011 Olivier Gorzalka
 * CSS Parser adapted from the jQuery based CSS parser by Daniel Wachsstock Copyright (c) 2011
 * MIT license
 */
 
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

    $.parsecss.isValidSelector = function (str) {
        var s = $('<style>' + str + '{}</style>').appendTo('head')[0];
        // s.styleSheet is IE; it accepts illegal selectors but converts them to UNKNOWN. Standards-based (s.shee.cssRules) just reject the rule
        return [s.styleSheet ? !/UNKNOWN/i.test(s.styleSheet.cssText) : !! s.sheet.cssRules.length, $(s).remove()][0]; // the [x,y][0] is a silly hack to evaluate two expressions and return the first
    };

    $.parsecss.parseArguments = function (str) {
        if (!str) return [];
        var ret = [],
            mungedArguments = munge(str, true).split(/\s+/); // can't use $.map because it flattens arrays !
        for (var i = 0; i < mungedArguments.length; ++i) {
            var a = restore(mungedArguments[i]);
            try {
                ret.push(eval('(' + a + ')'));
            } catch (err) {
                ret.push(a);
            }
        }
        return ret;
    };

    // expose the styleAttributes function
    $.parsecss.styleAttributes = styleAttributes;

    // caches
    var media = {}; // media description strings
    var munged = {}; // strings that were removed by the parser so they don't mess up searching for specific characters
    // private functions
    function parsedeclarations(index) { // take a string from the munged array and parse it into an object of property: value pairs
        var str = munged[index].replace(/^{|}$/g, ''); // find the string and remove the surrounding braces
        str = munge(str); // make sure any internal braces or strings are escaped
        var parsed = {};
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
    var REbraces = /{[^{}]*}/;
    var REfull = /\[[^\[\]]*\]|{[^{}]*}|\([^()]*\)|function(\s+\w+)?(\s*%b`\d+`b%){2}/; // match pairs of parentheses, brackets, and braces and function definitions.
    var REatcomment = /\/\*@((?:[^\*]|\*[^\/])*)\*\//g; // comments of the form /*@ text */ have text parsed 
    // we have to combine the comments and the strings because comments can contain string delimiters and strings can contain comment delimiters
    // var REcomment = /\/\*(?:[^\*]|\*[^\/])*\*\/|<!--|-->/g; // other comments are stripped. (this is a simplification of real SGML comments (see http://htmlhelp.com/reference/wilbur/misc/comment.html) , but it's what real browsers use)
    // var REstring = /\\.|"(?:[^\\\"]|\\.|\\\n)*"|'(?:[^\\\']|\\.|\\\n)*'/g; //  match escaped characters and strings
    var REcomment_string = /(?:\/\*(?:[^\*]|\*[^\/])*\*\/)|(\\.|"(?:[^\\\"]|\\.|\\\n)*"|'(?:[^\\\']|\\.|\\\n)*')/g;
    var REmunged = /%\w`(\d+)`\w%/;
    var uid = 0; // unique id number
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
        var split = rule.split(/\s+/); // split on whitespace
        var type = split.shift(); // first word
        if (type == 'media') {
            var css = restore(split.pop()).slice(1, -1); // last word is the rule; need to strip the outermost braces
            if ($.parsecss.mediumApplies(split.join(' '))) {
                $.parsecss(css, callback);
            }
        } else if (type = 'import') {
            var url = restore(split.shift());
            if ($.parsecss.mediumApplies(split.join(' '))) {
                url = url.replace(/^url\(|\)$/gi, '').replace(/^["']|["']$/g, ''); // remove the url('...') wrapper
                $.get(url, function (str) {
                    $.parsecss(str, callback)
                });
            }
        }
    }

    // experimental: find unrecognized style attributes in elements by reloading the code as text
    var RESGMLcomment = /<!--([^-]|-[^-])*-->/g; // as above, a simplification of real comments. Don't put -- in your HTML comments!
    var REnotATag = /(>)[^<]*/g;
    var REtag = /<(\w+)([^>]*)>/g;

    function styleAttributes(HTMLtext, callback) {
        var ret = '',
            style, tags = {}; //  keep track of tags so we can identify elements unambiguously
        HTMLtext = HTMLtext.replace(RESGMLcomment, '').replace(REnotATag, '$1');
        munge(HTMLtext).replace(REtag, function (s, tag, attrs) {
            tag = tag.toLowerCase();
            if (tags[tag])++tags[tag];
            else tags[tag] = 1;
            if (style = /\bstyle\s*=\s*(%s`\d+`s%)/i.exec(attrs)) { // style attributes must be of the form style = "a: bc" ; they must be in quotes. After munging, they are marked with numbers. Grab that number
                var id = /\bid\s*=\s*(\S+)/i.exec(attrs); // find the id if there is one.
                if (id) id = '#' + restore(id[1]).replace(/^['"]|['"]$/g, '');
                else id = tag + ':eq(' + (tags[tag] - 1) + ')';
                ret += [id, '{', restore(style[1]).replace(/^['"]|['"]$/g, ''), '}'].join('');
            }
        });
        $.parsecss(ret, callback);
    };

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
    
    $.jkerny = {
        lettering_replace: {
            ':word *:first-letter': 'span.jkerny-word span.jkerny-letter:first-child',
            ':word *:last-letter': 'span.jkerny-word span.jkerny-letter:last-child',
            ':letter': 'span.jkerny-letter',
            ':word': 'span.jkerny-word',
            ':first-word': 'span.jkerny-word:first-child',
            ':last-word': 'span.jkerny-word:last-child',
            ':first-letter': 'span.jkerny-word:first-child span.jkerny-letter:first-child',
            ':last-letter': 'span.jkerny-word:last-child span.jkerny-letter:last-child'
        },

        // pseudo selectors
        pseudo_selectors: /:(hover|active|focus|visited|after|before)/,
        medias_screen: false,
        kerning_counter: 0,

        // run jkerny run !
        run: function () {
            var selectors = {},
                jkerny = this,
                content = '';

            $('style:not([rel=jkerny]),link[rel=stylesheet]').each(function () {
            	jkerny.medias_screen = typeof $(this).attr('media') == 'undefined' ? false : $(this).attr('media');
                if (this.href) {
                    $.ajax({
                        url: this.href,
                        success: function (content) {
                            jkerny.parseCss(content);
                        }
                    });
                } else {
                    jkerny.parseCss(this.innerHTML);
                }
            });
        },
        
        parseMediaQueries: function(content) {
			var jkerny = this,
				media_datas = content.match(/@media[^\{]+\{([^\{\}]+\{[^\}\{]+\})+/gi);
			
			for (key in media_datas) {
				datas = media_datas[key].match(new RegExp(/@media([^\{]+)\{([^\{\}]+\{[^\}\{]+\})+/), 'gi');
				
				jkerny.medias_screen = $.trim(datas[1]);
				jkerny.parseCss(datas[2]);
			}
        },

		// ok, let's parse the motherfucking css
        parseCss: function (content) {
            var jkerny = this,
                content = jkerny.convertPseudoSelectors(content);

            $.parsecss(content, function (data) {
                selectors = jkerny.filterSelectors(data);
                jkerny.proceedCss(selectors);
            });
            jkerny.parseMediaQueries(content);
        },

        convertPseudoSelectors: function (content) {
            var jkerny = this;
            for (var key_letter in jkerny.lettering_replace) {
                content = content.replace(new RegExp(key_letter, 'g'), ' ' + jkerny.lettering_replace[key_letter]);
            }
            return content;
        },

        rawCss: function (selector, attributes) {
            var cssStyle = selector + ' { ';
            for (attribute in attributes) {
                cssStyle += attribute + ':' + attributes[attribute] + '; ';
            }
            cssStyle += '} ';
            return cssStyle;
        },

        applyCss: function (selector, attributes) {
            if (selector.indexOf(':hover') > -1) {
                var splitSelector = selector.split(':hover'),
                    $hoverElements = $(splitSelector[0]);
                $hoverElements.on('mouseenter', function () {
                    $styledElements = $.trim(splitSelector[1]) != '' ? $(this).find($.trim(splitSelector[1])) : $(this);
                    $styledElements.data({
                        'default-style': $styledElements.attr('style')
                    }).css(attributes);
                });
                $hoverElements.on('mouseleave', function () {
                    $styledElements = $.trim(splitSelector[1]) != '' ? $(this).find($.trim(splitSelector[1])) : $(this);
                    $styledElements.attr('style', $styledElements.data('default-style'));
                });
            } else {
                $(selector).css(attributes);
            }
        },
        
        getLength: function(obj) {
            var i=0;
            for (var key in obj) { i++; };
            return i;
        },
        
        adjustKerning: function(selectors, selector, type) {
            if (typeof selectors[selector]['-jkerny-'+type+'-spacing'] != 'undefined') {
                var jkerny = this,
                    kerningValues = selectors[selector]['-jkerny-'+type+'-spacing'].replace(/[\n\s]+/g, ' ').split(' '),
                    elements = selector.replace(this.pseudo_selectors, '').split(/ span.jkerny-(letter|word)/g)[0]; 
                
                for (var i = 0; i <= kerningValues.length; i++) {
                    $letterSelector = $(elements).find('span.jkerny-'+type+':eq('+i+')');
                    $letterSelector.each(function(j, item) {
                        if (typeof kerningValues[i] != 'undefined') {
                            $(this).addClass('kerning-'+jkerny.kerning_counter);
                            selectors[elements+' .jkerny-'+type+'.kerning-'+jkerny.kerning_counter] = {
                                'margin-right' : kerningValues[i]
                            };
                            jkerny.kerning_counter++;
                        }
                    });
                }
            }
            return selectors;
        },

        proceedCss: function (selectors) {
            var jkerny = this,
                cssStyle = 'span.jkerny-word, span.jkerny-letter { display:inline-block } .jkerny { visibility: inherit; }',
                styleTagSelector = (jkerny.medias_screen !== false) ? 'style[media="'+jkerny.medias_screen+'"]' : '.global';
                
			if (jkerny.getLength(selectors) > 0) {
	            for (var selector in selectors) {
	                var elements = selector.replace(this.pseudo_selectors, '').split(/ span.jkerny-(letter|word)/g)[0];
	                
	                $(elements)
	                	.not('.jkerny')
	                		.addClass('jkerny')
	                		.lettering('words')
		                		.children('span')
		                			.addClass('jkerny-word')
		                		.lettering()
			                		.children('span')
			                			.addClass('jkerny-letter');
			        
			        selectors = jkerny.adjustKerning(selectors, selector, 'word');
	                selectors = jkerny.adjustKerning(selectors, selector, 'letter');
	            }
	            
	            for (var selector in selectors) {
	                if (selector.indexOf('jkerny-word') > -1 || selector.indexOf('jkerny-letter') > -1) {
                        cssStyle += jkerny.rawCss(selector, selectors[selector]);
	                }
	            }
	            
	            if ($(styleTagSelector).length) {
	                $(styleTagSelector).get(0).innerHTML += cssStyle;
	            } else {
	                $('<style'+(jkerny.medias_screen !== false ? ' media="'+jkerny.medias_screen+'" class="media"' : ' class="global"')+' rel="jkerny">' + cssStyle + '</style>').appendTo('head');
	            }
            }
        },
        
        filterSelectors: function (selectors) {
            var s = selectors,
                t = {}; 
            for (var selector in s) {
                if (selector.indexOf('jkerny-') > -1) {
                    t[selector] = s[selector];
                } else {
                    for (var attribute in s[selector]) {
                        if (attribute.indexOf('jkerny-') > -1) {
                            t[selector] = s[selector];
                            continue;
                        }
                    }
                }
            }
            s = t;
            return s;
        }
    }

	$(function () { $.jkerny.run(); });
})(jQuery);