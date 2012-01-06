/*global jQuery */
/*!
 * jKerny.js
 * Version: 1.3
 * Copyright 2011 Olivier Gorzalka
 * CSS Parser adapted the jQuery based CSS parser from Daniel Wachsstock Copyright (c) 2011
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
            ':word *:first-letter': 'span.word span.letter:first-child',
            ':word *:last-letter': 'span.word span.letter:last-child',
            ':letter': 'span.letter',
            ':word': 'span.word',
            ':first-word': 'span.word:first-child',
            ':last-word': 'span.word:last-child',
            ':first-letter': 'span.word:first-child span.letter:first-child',
            ':last-letter': 'span.word:last-child span.letter:last-child'
        },
        
        only_selectors: [/span\.(word|letter)/],
        // only include selectors that match one these patterns
        only_properties: [/-jkerny-(word|letter)-spacing/],

        // pseudo selectors
        pseudo_selectors: /:(hover|active|focus|visited)/,

        // used to test selector functionality. lazy loaded when needed. see mediumApplies()
        run: function () {
            var selectors = {},
                jkerny = this;

            $('style:not([rel=jkerny]),link[rel=stylesheet]').each(function () {
                if (this.href) {
                    $.ajax({
                        url: this.href,
                        success: function (data) {
                            jkerny.parseCss(data);
                        }
                    });
                } else {
                    jkerny.parseCss(this.innerHTML);
                }
            });
        },

        parseCss: function (content) {
            var jkerny = this,
                content = jkerny.convertPseudoSelectors(content);
            $.parsecss(content, function (data) {
                selectors = jkerny.filterSelectors(data);
                jkerny.proceedLettering(selectors);
            });
        },

        convertPseudoSelectors: function (content) {
            var jkerny = this;
            for (var key_letter in jkerny.lettering_replace) {
                content = content.replace(new RegExp(key_letter, 'g'), ' ' + jkerny.lettering_replace[key_letter]);
            }
            return content;
        },

        runStylesFromText: function (data) {
            var jkerny = this,
                selectors = this.filterSelectors(this.parse(data));
            jkerny.proceedLettering(selectors);
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

        proceedLettering: function (selectors) {
            var jkerny = this,
                cssStyle = '';

            for (selector in selectors) {
                var $elements = $(selector.replace(this.pseudo_selectors, '').split(/ span.(letter|word)/g)[0]);
                $elements.not('.jkerny').addClass('jkerny').css('visibility', 'inherit').lettering('words').children('span').css('display', 'inline-block') // break down into words
                .addClass('word').lettering().children('span').css('display', 'inline-block') // break down into letters
                .addClass('letter');

                if (typeof selectors[selector]['-jkerny-letter-spacing'] != 'undefined') {
                    var letterSpacingValues = selectors[selector]['-jkerny-letter-spacing'].replace(/[\n\s]+/g, ' ').split(' ');
                    for (var i = 0; i <= letterSpacingValues.length; i++) {
                        jkerny.applyCss(selector + (selector.indexOf('span.word') > -1 ? '' : ' span.word') + (selector.indexOf('span.letter') > -1 ? '' : ' span') + ':eq(' + i + ')', {
                            marginRight: letterSpacingValues[i]
                        });
                    }
                }

                if (typeof selectors[selector]['-jkerny-word-spacing'] != 'undefined') {
                    var letterSpacingValues = selectors[selector]['-jkerny-word-spacing'].replace(/[\n\s]+/g, ' ').split(' ');
                    for (var i = 0; i <= letterSpacingValues.length; i++) {
                        jkerny.applyCss(selector + (selector.indexOf('span.word') > -1 ? '' : ' span.word') + ':eq(' + i + ')', {
                            marginRight: letterSpacingValues[i]
                        });
                    }
                }

                $.each(jkerny.only_selectors, function () {
                    if (selector.match(this)) {
                        cssStyle += jkerny.rawCss(selector, selectors[selector]);
                    }
                });
            }
            $('<style rel="jkerny">' + cssStyle + '</style>').appendTo('body');
        },

        scanCache: function (selector) {
            for (var s in this.cache) {
                if (selector.search(new RegExp('^' + s + '[ >]')) > -1) return [this.cache[s], selector.replace(new RegExp('^' + s + '[ >]'), '')];
            };
        },

        filterSelectors: function (selectors) {
            if (typeof selectors == 'undefined') return [];
            var s = selectors;
            if ((this.only_selectors && this.only_selectors.length) || (this.only_properties && this.only_properties.length)) { // filter selectors to remove those that don't match the only include rules
                var s_inclusions = this.only_selectors,
                    p_inclusions = this.only_properties,
                    t = {},
                    included_selectors = []; // temp store for matches
                for (var i = 0; i < s_inclusions.length; i++) {
                    for (selector in s) {
                        if (typeof s_inclusions[i] == 'string' ? selector == s_inclusions[i] : selector.match(s_inclusions[i])) {
                            t[selector] = s[selector];
                            included_selectors.push(s[selector].selector);
                        };
                    }
                };

                for (var i = 0; i < p_inclusions.length; i++) {
                    for (selector in s) {
                        for (attribute in s[selector]) {
                            if (
                            typeof p_inclusions[i] == 'string' ? attribute.selector == p_inclusions[i] : attribute.match(p_inclusions[i]) && jQuery.inArray(selector, included_selectors) < 0) {
                                t[selector] = s[selector];
                                continue;
                            };
                        }
                    };
                };
                s = t;
            };
            return s;
        },


        // ---
        // A test to see if a particular media type should be applied
        // ---
        mediumApplies: function (str) {
            if (!str) return true; // if no descriptor, everything applies
            if (str in this.media) return this.media[str]; // cache
            if (!this.testDiv) {
                this.testDiv = $('<div id="mediaTestDiv" style="position:relative">').append('<div>').appendTo('body'); // lazy create
            };
            var style = $('<style type="text/css" media="' + str + '" />').appendTo('head')[0];
            try {
                style.appendChild(document.createTextNode(''));
            } catch (e) { /* nothing */
            }
            if (style.styleSheet) {
                // IE
                style.styleSheet.addRule('#mediaTestDiv', 'left: 1px');
            } else if (style.sheet) {
                // standards
                style.sheet.insertRule('#mediaTestDiv {left: 1px}', 0);
            }
            this.media[str] = this.testDiv.css('left') == '1px';
            $(style).remove();
            return this.media[str];
        },


        // ---
        // ultra lightweight CSS parser, only works with 100% valid css files, no support for hacks etc.
        // ---
        sanitize: function (content) {
            if (!content) return '';
            var c = content.replace(/[\n\r]/gi, ''); // remove newlines
            c = c.replace(/\/\*.+?\*\//gi, ''); // remove comments
            c = c.replace(/\} *\r*\t*\}/, '}'); // clean old media queries declarations
            return c;
        },

        parse: function (content) {
            var c = this.sanitize(content),
                tree = []; // this is the css tree that is built up
            c = c.match(/.+?\{.+?\}/gi); // seperate out selectors
            if (!c) return [];
            for (var i = 0; i < c.length; i++) // loop through the selectors & parse the attributes
            if (c[i]) tree.push({
                selector: this.parseSelectorName(c[i]),
                attributes: this.parseAttributes(c[i])
            });
            return tree;
        },

        parseSelectorName: function (content) {
            return $.trim(content.match(/^.+?\{/)[0].replace('{', '')); // extract the selector
        },

        parseAttributes: function (content) {
            var attributes = {};
            c = content.match(/\{.+?\}/)[0].replace(/[\{\}]/g, '').split(';').slice(0, -1);
            for (var i = 0; i < c.length; i++) {
                if (c[i]) {
                    c[i] = c[i].split(':');
                    attributes[$.trim(c[i][0])] = $.trim(c[i][1]);
                };
            };
            return attributes;
        }

    };
})(jQuery);

$(document).ready(function () {
    $.jkerny.run();
});