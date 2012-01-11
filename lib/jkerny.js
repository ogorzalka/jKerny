// ==ClosureCompiler==
// @output_file_name jkerny.min.js
// @compilation_level SIMPLE_OPTIMIZATIONS
// ==/ClosureCompiler==

/*global jQuery */
/*!
 * jkerny.js
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
    
    // Add or replace a style sheet
    // css argument is a string of CSS rule sets
    // options.id is an optional name identifying the style sheet
    // options.doc is an optional document reference
    // N.B.: Uses DOM methods instead of jQuery to ensure cross-browser comaptibility.
    $.style = function(r, opts) {
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
    
    $.jkerny = {
        lettering_replace: {
            ':unknown':'', // prevent ie bug with unknown pseudo-selectors
            ':((first|last)(-))?(letter|word)':'._$2$3$4',
            '._(letter|word):(first|last)-child':'._$2-$1',
            '._((last|first)-)letter':'span.jkerny-word:$2-child span.jkerny-letter:$2-child',
            '._((last|first)-)word':'span.jkerny-word:$2-child',
            '._(letter|word)':'span.jkerny-$1',
            '(span.jkerny-word([^ ]*)?) *span.jkerny-word:(first|last)-child':'$1' // prevent double span.jkerny-word
        },
        pseudo_structural:':(empty|(first|last|only|nth(-last)?)-(child|of-type))([^\\)]*\\))?', // courtesy of selectivizr by keithclark http://selectivizr.com
        pseudo_selectors: ':(hover|enabled|disabled|focus|checked|target|active|visited|after|before)',
        split_expr: /(>|~|\+)? span.jkerny-(letter|word)/gi,
        medias_screen: 'all',
        kerning_counter: 0,
        output : {},

        // run jkerny run !
        run: function () {
            var selectors = {},
                jkerny = this,
                content = '';
            
            $.style(
                {
                    'span.jkerny-word, span.jkerny-letter' : {'display' : 'inline-block'},
                    '.jkerny' : { 'visibility' : 'inherit' }
                }, { styleClass : 'jkerny'}
            );

            $('style:not(.jkerny),link[rel=stylesheet]').each(function () {
                jkerny.medias_screen = typeof $(this).attr('media') == 'undefined' ? 'all' : $(this).attr('media');
                jkerny.output[jkerny.medias_screen] = {};
                if(
                    this.href && !this.disabled && !(this.href.indexOf('//'+window.location.host) < 0 && /^\w+:/.test(this.href)) 
                ) {
                    $.ajax({
                        url: this.href,
                        success: function (content) {
                            jkerny.parseCss(content);
                        }
                    });
                } else {
                    jkerny.parseCss($(this).removeAttr('type').html());
                }
            });
        },
        
        parseMediaQueries: function(content) {
            var jkerny = this,
                datas,
                media_datas = content.match(/@media[^\{]+\{([^\{\}]+\{[^\}\{]+\})+/gi);
            
            for (var key in media_datas) {
                datas = content.match(new RegExp(/@media([^\{]+)\{([^\{\}]+\{[^\}\{]+\})+/), 'gi');
                jkerny.medias_screen = $.trim(datas[1]);
                if (typeof jkerny.output[jkerny.medias_screen] == 'undefined') {
                    jkerny.output[jkerny.medias_screen] = {};
                }
                jkerny.parseCss(datas[2], true);
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
            var jkerny = this;
            for (var key_letter in jkerny.lettering_replace) {
                content = content.replace(new RegExp(key_letter, 'gi'), ' ' + jkerny.lettering_replace[key_letter]);
            }
            return content;
        },
        
        getLength: function(obj) {
            var i=0;
            for (var key in obj) { i++; }
            return i;
        },
        
        applyProperties: function(selectors, selector, type) {
            var jkerny, $mainSelector, convertedSelector, elements, kerningValues, selectorType, split_selector;
            jkerny = this;
            split_selector = selector.split(",");
            
            for (var i = 0; i < split_selector.length; i++) {
                elements = split_selector[i].replace(new RegExp(jkerny.pseudo_selectors), '').split(jkerny.split_expr)[0];
                if (type == 'pseudo-selector') {
                    $mainSelector = $(split_selector[i].replace(new RegExp(jkerny.pseudo_selectors), ''));
                    selectorType = $mainSelector.is('.jkerny-letter') ? 'letter' : 'word';
                    convertedSelector = split_selector[i].replace(new RegExp('span.jkerny-(letter|word)('+jkerny.pseudo_structural+')?', 'gi'), '.jkerny-$1-'+jkerny.kerning_counter);
                    $mainSelector.addClass('jkerny-'+selectorType+'-'+jkerny.kerning_counter).parent('.jkerny-word').addClass('jkerny-word-'+jkerny.kerning_counter);
                    jkerny.output[jkerny.medias_screen][convertedSelector] =  selectors[selector];
                    jkerny.kerning_counter++;
                } else if (typeof selectors[selector]['-jkerny-'+type+'-spacing'] != 'undefined') {
                    kerningValues = selectors[selector]['-jkerny-'+type+'-spacing'].replace(/[\n\s]+/g, ' ').split(' ');
                    for (var j = 0; j < kerningValues.length; j++) {
                        $mainSelector = $(elements).find('span.jkerny-'+type+':eq('+j+')');
                        $mainSelector.addClass('kerning-'+jkerny.kerning_counter);
                        jkerny.output[jkerny.medias_screen][elements+' .jkerny-'+type+'.kerning-'+jkerny.kerning_counter] = { 'margin-right' : kerningValues[j] };
                        jkerny.kerning_counter++;
                    }
                }
            }
        },
        
        proceedCss: function (selectors) {
            var jkerny = this;
            if (jkerny.getLength(selectors) > 0) {
                for (var selector in selectors) {
                    var elements = selector.replace(new RegExp(jkerny.pseudo_selectors), '').split(jkerny.split_expr)[0];
                    $(elements)
                        .not('.jkerny')
                            .addClass('jkerny')
                            .lettering('words')
                                .children('span')
                                    .addClass('jkerny-word')
                                .lettering()
                                    .children('span')
                                        .addClass('jkerny-letter');
                    
                    jkerny.applyProperties(selectors, selector, 'word');
                    jkerny.applyProperties(selectors, selector, 'letter');
                    jkerny.applyProperties(selectors, selector, 'pseudo-selector');
                }
            }
            
            if (jkerny.getLength(jkerny.output[jkerny.medias_screen]) > 0) {
                $.style(jkerny.output[jkerny.medias_screen], {media: jkerny.medias_screen, styleClass : 'jkerny'});
                jkerny.output[jkerny.medias_screen] = {};
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
    };

    $(function () { $.jkerny.run(); });
})(jQuery);