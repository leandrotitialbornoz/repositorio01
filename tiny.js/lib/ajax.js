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

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports['default'] = ajax;

var _extend = require('./extend');

var _extend2 = _interopRequireDefault(_extend);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function ajax(url, settings) {
    var args = arguments;
    var opts = void 0;

    settings = args.length === 1 ? args[0] : args[1];

    var noop = function noop() {};

    var defaults = {
        url: args.length === 2 && typeof url === 'string' ? url : '.',
        cache: true,
        data: null,
        headers: {},
        context: null,
        dataType: 'text',
        method: 'GET',
        credentials: 'omit',
        success: noop,
        error: noop,
        complete: noop
    };

    opts = (0, _extend2['default'])(defaults, settings || {});

    var mimeTypes = {
        'application/json': 'json',
        'text/html': 'html',
        'text/plain': 'text'
    };

    var dataTypes = {};
    for (var type in mimeTypes) {
        if (mimeTypes.hasOwnProperty(type)) {
            dataTypes[mimeTypes[type]] = type;
        }
    }

    if (!opts.cache) {
        opts.url = opts.url + (~opts.url.indexOf('?') ? '&' : '?') + 'nc=' + Math.floor(Math.random() * 9e9);
    }

    var complete = function complete(status, xhr) {
        opts.complete.call(opts.context, xhr, status);
    };

    var success = function success(data, xhr) {
        var status = 'success';
        opts.success.call(opts.context, data, status, xhr);
        complete(status, xhr);
    };

    var error = function error(_error, status, xhr) {
        opts.error.call(opts.context, xhr, status, _error);
        complete(status, xhr);
    };

    // toString shortcut for DRY
    var toString = Object.prototype.toString;

    var normalizeRequestData = function normalizeRequestData(data, headers, cors) {
        var charset = 'charset=UTF-8';
        var formUrlEncoded = 'application/x-www-form-urlencoded; ' + charset;

        if (typeof FormData !== 'undefined' && data instanceof FormData || /^\[object\s(ArrayBuffer|File|Blob)\]$/.test(toString.call(data))) {
            return data;
        }

        if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams || typeof data === 'string') {
            if (headers['Content-Type'] === undefined) {
                headers['Content-Type'] = formUrlEncoded;
            }

            return data.toString();
        }

        if (data !== null && (typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object') {
            if (headers['Content-Type'] === undefined) {
                if (cors) {
                    // The content type of a CORS request is limited to
                    // application/x-www-form-urlencoded, multipart/form-data, or text/plain
                    headers['Content-Type'] = formUrlEncoded;
                } else {
                    headers['Content-Type'] = 'application/json;  ' + charset;
                }
            }

            return JSON.stringify(data);
        }

        return data;
    };

    // Normalize the method name
    opts.method = opts.method.toUpperCase();

    // Set the cross domain option
    // To avoid the preflight requests please use the "simple" requests only
    // @see https://www.w3.org/TR/cors/#resource-requests
    var testAnchor = document.createElement('a');
    var originAnchor = document.createElement('a');
    originAnchor.href = location.href;

    try {
        testAnchor.href = opts.url;

        // Support: IE lte 11
        // Anchor's host property isn't correctly set when opts.url is relative
        testAnchor.href = testAnchor.href;
        opts.crossDomain = originAnchor.protocol + '//' + originAnchor.host !== testAnchor.protocol + '//' + testAnchor.host;
    } catch (e) {
        opts.crossDomain = true;
    }

    var xhr = new XMLHttpRequest();

    var useXDR = opts.crossDomain && !('withCredentials' in xhr) && 'XDomainRequest' in window;

    if (useXDR) {
        // Use XDomainRequest instead of XMLHttpRequest for IE<=9 and when CORS is requested
        xhr = new XDomainRequest();
        xhr.onload = function () {
            var mime = xhr.contentType;
            var dataType = mime && mimeTypes[mime[1]] ? mimeTypes[mime[1]].toLowerCase() : 'json';
            var result = void 0;

            if (dataType === 'json') {
                try {
                    result = JSON.parse(xhr.responseText);
                } catch (e) {
                    result = xhr.responseText;
                }
            } else {
                result = xhr.responseText;
            }
            success(result, xhr);
        };
    } else {
        // Still cannot use xhr.onload for normal xhr due to required support of IE8 which
        // has no `onload` event https://msdn.microsoft.com/en-us/library/ms535874(v=vs.85).aspx#events
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var result = void 0;
                var status = xhr.status === 1223 ? 204 : xhr.status;

                if (status >= 200 && status < 300 || status === 304) {
                    var mime = /([\/a-z]+)(;|\s|$)/.exec(xhr.getResponseHeader('content-type'));
                    var dataType = mime && mimeTypes[mime[1]] ? mimeTypes[mime[1]].toLowerCase() : 'text';
                    result = xhr.responseText;

                    if (dataType === 'json') {
                        try {
                            result = JSON.parse(result);
                        } catch (e) {
                            result = xhr.responseText;
                        }
                    }

                    success(result, xhr);
                } else {
                    error(new Error(xhr.statusText), 'error', xhr, opts);
                }

                return;
            }
        };
    }

    xhr.onerror = function () {
        error(new Error(xhr.statusText || 'Network request failed'), 'error', xhr, opts);
    };

    if ((opts.method === 'GET' || opts.method === 'HEAD') && typeof opts.data === 'string') {
        opts.url += (~opts.url.indexOf('?') ? '&' : '?') + opts.data;
    }

    xhr.open(opts.method, opts.url);

    if (opts.dataType && dataTypes[opts.dataType.toLowerCase()]) {
        opts.headers.Accept = dataTypes[opts.dataType.toLowerCase()] + ', */*; q=0.01';
    }

    // Set the "X-Requested-With" header only if it is not already set
    if (!opts.crossDomain && !opts.headers['X-Requested-With']) {
        opts.headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    if (opts.credentials === 'include') {
        xhr.withCredentials = true;
    }

    opts.data = normalizeRequestData(opts.data, opts.headers, opts.crossDomain);

    if (!useXDR) {
        for (var key in opts.headers) {
            xhr.setRequestHeader(key, opts.headers[key]);
        }
    }

    xhr.send(opts.data);

    return this;
}
module.exports = exports['default'];