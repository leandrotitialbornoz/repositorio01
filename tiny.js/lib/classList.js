/*!
 * tiny.js v0.2.3
 *
 * Copyright (c) 2015, MercadoLibre.com
 * Released under the MIT license.
 * https://raw.githubusercontent.com/mercadolibre/tiny.js/master/LICENSE
 */
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.addClass = addClass;
exports.removeClass = removeClass;
exports.hasClass = hasClass;
var testEl = document.createElement('div');
var isClassList = !!testEl.classList;

/**
 * Adds the specified class to an element
 *
 * @param el {HTMLElement}
 * @param className {String}
 *
 * @example
 * tiny.addClass(document.body, 'tiny-example');
 */
function addClass(el, className) {
    if (isClassList) {
        el.classList.add(className);
    } else {
        el.setAttribute('class', el.getAttribute('class') + ' ' + className);
    }
}

/**
 * Remove a single class from an element
 *
 * @param el {HTMLElement}
 * @param className {String}
 *
 * @example
 * tiny.removeClass(document.body, 'tiny-example');
 */
function removeClass(el, className) {
    if (isClassList) {
        el.classList.remove(className);
    } else {
        el.setAttribute('class', el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' '));
    }
}

/**
 * Determine whether is the given class is assigned to an element
 * @param el {HTMLElement}
 * @param className {String}
 * @returns {Boolean}
 *
 * @example
 * tiny.hasClass(document.body, 'tiny-example');
 */
function hasClass(el, className) {
    var exist;
    if (isClassList) {
        exist = el.classList.contains(className);
    } else {
        exist = new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className);
    }
    return exist;
}

var classList = {
    addClass: addClass,
    removeClass: removeClass,
    hasClass: hasClass
};

exports['default'] = classList;