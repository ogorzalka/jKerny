/*global jQuery */
/*!
 * jKerny.js
 * Version: 0.1
 * Copyright 2011 Olivier Gorzalka
 * CSS Parser adapted from JSS by Andy Kent
 * MIT license
 */ (function ($) {

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
        loadExternalStyles: true,
        // set to false to only analyse in document styles and avoid ajax requests. 
        exclude: [],
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
        pseudo_selectors : /:(hover|active|focus|visited)/,
        
        // only include selectors that match one these patterns
        disableCaching: false,
        // turn this on to disable caching
        checkMediaTypes: true,
        // set this to false if you want to always run all media types regardless of context.
        cache: {},
        // used to cache selectors
        loadQueue: [],
        // tracks the load order of external sheets to make sure that styles are applied in the correct order
        completeQueue: [],
        // tacks which css files have been loaded
        media: {},
        // a cache of media types and if they are supported in the current state
        testDiv: null,
        // used to test selector functionality. lazy loaded when needed. see mediumApplies()
        run: function (content) {
            var selectors = [];
            var jkerny = this;

            $('style:not([rel=jkerny]),link[rel=stylesheet]').each(function () {
                if (jkerny.checkMediaTypes) { // media type support enabled
                    if (!jkerny.mediumApplies(this.media)) return; // medium doesn't run in this context so ignore it entirely.
                }
                if (this.href) {
                    if (jkerny.loadExternalStyles) {
                        jkerny.loadQueue.push(this.href);
                        jkerny.loadStylesFrom(this.href);
                    };
                } else {
                    content = jkerny.convertPseudoSelectors(this.innerHTML);
                    selectors = selectors.concat(jkerny.parse(content));
                    jkerny.proceedLettering(selectors);
                };
            });
            if (content) {
                selectors.concat(this.parse(content)); // parse any passed in styles
            }
            selectors = this.filterSelectors(selectors);
        },
        
        ignoreMediaQueries: function(content) {
        	return content.replace(new RegExp("@media[^\{]+\{([^\{\}]+\{[^\}\{]+\})+", 'gi'), '');
        },

        convertPseudoSelectors: function (content) {
            var jkerny = this;
            for (var key_letter in jkerny.lettering_replace) {
                content = content.replace(new RegExp(key_letter, 'g'), ' ' + jkerny.lettering_replace[key_letter]);
            }
            return content;
        },

        loadStylesFrom: function (href) {
            var jkerny = this;
            $.ajax({
                url: href,
                success: function (data) {
                    content = jkerny.convertPseudoSelectors(data);
                    content = jkerny.ignoreMediaQueries(content);
                    jkerny.refreshLoadQueue(href, content);
                }
            });
        },

        refreshLoadQueue: function (href, txt) {
            if (this.loadQueue.length == 0) return; // everything in the queue is loaded
            if (href) { // a new sheet has been recieved
                if (href == this.loadQueue[0]) { // this sheet is next in the queue
                    this.loadQueue.shift(); // move the queue on
                    this.runStylesFromText(txt); // process this sheet
                    this.refreshLoadQueue(); // recurse to see if any sheets are ready for loading.
                } else {
                    this.completeQueue.push({
                        href: href,
                        txt: txt
                    }); // not next so put aside for later
                    this.refreshLoadQueue(); // recurse to see if any sheets are ready for loading.
                };
            } else { // no new sheet, lets see if the next load queue sheet matches anything in the completed queue
                if (this.completeQueue.length > 0) {
                    for (i in this.completeQueue) {
                        var doc = this.completeQueue[i];
                        if (doc.href == this.loadQueue[0]) { // we have a match
                            this.loadQueue.shift(); // move the queue on
                            this.completeQueue.splice(i, 1); // clean up the completed queue
                            this.runStylesFromText(doc.txt); // process this sheet
                            this.refreshLoadQueue();
                        };
                    };
                };
            };
        },

        runStylesFromText: function (data) {
            var jkerny = this,
                selectors = this.filterSelectors(this.parse(data));
            jkerny.proceedLettering(selectors);
        },
		
		rawCss: function(selector, attributes) {
			var cssStyle = selector + ' { ';
			for (attribute in attributes) {
				cssStyle += attribute+':'+attributes[attribute]+'; ';
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
            
            $.each(selectors, function () {
                var s = this,
                    $elements = $(s.selector.replace(this.pseudo_selectors, '').split(/ span.(letter|word)/g)[0]);
                $elements
                	.not('.jkerny')
                		.addClass('jkerny')
                		.css('visibility', 'inherit')
                		.lettering('words')
                			.children('span')
                				.css('display', 'inline-block') // break down into words
                				.addClass('word')
                		.lettering()
                			.children('span')
                				.css('display', 'inline-block') // break down into letters
                				.addClass('letter');

                if (typeof s.attributes['-jkerny-letter-spacing'] != 'undefined') {
                    var letterSpacingValues = s.attributes['-jkerny-letter-spacing'].replace(/[\n\s]+/g, ' ').split(' ');
                    for (var i = 0; i <= letterSpacingValues.length; i++) {
                        jkerny.applyCss(s.selector + (s.selector.indexOf('span.word') > -1 ? ''  : ' span.word') +(s.selector.indexOf('span.letter') > -1 ? ''  : ' span')+':eq(' + i + ')', {
                            marginRight: letterSpacingValues[i]
                        });
                    }
                }

                if (typeof s.attributes['-jkerny-word-spacing'] != 'undefined') {
                    var letterSpacingValues = s.attributes['-jkerny-word-spacing'].replace(/[\n\s]+/g, ' ').split(' ');
                    for (var i = 0; i <= letterSpacingValues.length; i++) {
                        jkerny.applyCss(s.selector + (s.selector.indexOf('span.word') > -1 ? ''  : ' span.word') + ':eq(' + i + ')', {
                            marginRight: letterSpacingValues[i]
                        });
                    }
                }
                
                $.each(jkerny.only_selectors, function () {
                    if (s.selector.match(this)) {
                        cssStyle += jkerny.rawCss(s.selector, s.attributes);
                    }
                });
            });
            $('<style rel="jkerny">'+cssStyle+'</style>').appendTo('body');
        },

        scanCache: function (selector) {
            for (var s in this.cache) {
                if (selector.search(new RegExp('^' + s + '[ >]')) > -1) return [this.cache[s], selector.replace(new RegExp('^' + s + '[ >]'), '')];
            };
        },

        filterSelectors: function (selectors) {
            if (!selectors.length) return [];
            var s = selectors;
            
            if ((this.only_selectors && this.only_selectors.length) || (this.only_properties && this.only_properties.length)) { // filter selectors to remove those that don't match the only include rules
                var s_inclusions = this.only_selectors,
                    p_inclusions = this.only_properties,
                    t = [],
                    included_selectors = []; // temp store for matches
                for (var i = 0; i < s_inclusions.length; i++) {
                    for (var pos = 0; pos < s.length; pos++) {
                        if (typeof s_inclusions[i] == 'string' ? s[pos].selector == s_inclusions[i] : s[pos].selector.match(s_inclusions[i])) {
                            t.push(s[pos]);
                            included_selectors.push(s[pos].selector);
                        };
                    };
                };

                for (var i = 0; i < p_inclusions.length; i++) {
                    for (var pos = 0; pos < s.length; pos++) {
                        for (attribute in s[pos].attributes) {
                            if (
                            typeof p_inclusions[i] == 'string' ? attribute.selector == p_inclusions[i] : attribute.match(p_inclusions[i]) && jQuery.inArray(s[pos].selector, included_selectors) < 0) {
                                t.push(s[pos]);
                                continue;
                            };
                        }
                    };
                };
                s = t;
            };

            if (this.exclude && this.exclude.length) { // filter selectors to remove those that match the exclusion rules
                var exclusions = this.exclude;
                for (var i = 0; i < exclusions.length; i++) {
                    for (var pos = 0; pos < s.length; pos++) {
                        if (typeof exclusions[i] == 'string' ? s[pos].selector == exclusions[i] : s[pos].selector.match(exclusions[i])) {
                            s.splice(pos, 1);
                            pos--;
                        };
                    };
                };
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