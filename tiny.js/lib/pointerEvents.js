/*!
 * tiny.js v0.2.3
 *
 * Copyright (c) 2015, MercadoLibre.com
 * Released under the MIT license.
 * https://raw.githubusercontent.com/mercadolibre/tiny.js/master/LICENSE
 */
'use strict';

/**
 * Polyfill for supporting pointer events on every browser
 *
 * @see Based on: <a href="https://github.com/deltakosh/handjs" target="_blank">Hand.js</a>
 */
(function (window) {
    'use strict';

    var POINTER_TYPE_TOUCH = 'touch';
    var POINTER_TYPE_PEN = 'pen';
    var POINTER_TYPE_MOUSE = 'mouse';

    // If the user agent already supports Pointer Events, do nothing
    if (window.PointerEvent) {
        return;
    }

    // Due to polyfill IE8 can has document.createEvent but it has no support for
    // custom Mouse Events
    var supportsMouseEvents = !!window.MouseEvent;

    if (!supportsMouseEvents) {
        return;
    }

    // The list of standardized pointer events http://www.w3.org/TR/pointerevents/
    var upperCaseEventsNames = ['PointerDown', 'PointerUp', 'PointerMove', 'PointerOver', 'PointerOut', 'PointerCancel', 'PointerEnter', 'PointerLeave'];
    var supportedEventsNames = upperCaseEventsNames.map(function (name) {
        return name.toLowerCase();
    });

    var previousTargets = {};

    var checkPreventDefault = function checkPreventDefault(node) {
        while (node && !node.ch_forcePreventDefault) {
            node = node.parentNode;
        }
        return !!node || window.ch_forcePreventDefault;
    };

    // Touch events
    var generateTouchClonedEvent = function generateTouchClonedEvent(sourceEvent, newName, canBubble, target, relatedTarget) {
        // Considering touch events are almost like super mouse events
        var evObj;

        if (document.createEvent && supportsMouseEvents) {
            evObj = document.createEvent('MouseEvents');
            // TODO: Replace 'initMouseEvent' with 'new MouseEvent'
            evObj.initMouseEvent(newName, canBubble, true, window, 1, sourceEvent.screenX, sourceEvent.screenY, sourceEvent.clientX, sourceEvent.clientY, sourceEvent.ctrlKey, sourceEvent.altKey, sourceEvent.shiftKey, sourceEvent.metaKey, sourceEvent.button, relatedTarget || sourceEvent.relatedTarget);
        } else {
            evObj = document.createEventObject();
            evObj.screenX = sourceEvent.screenX;
            evObj.screenY = sourceEvent.screenY;
            evObj.clientX = sourceEvent.clientX;
            evObj.clientY = sourceEvent.clientY;
            evObj.ctrlKey = sourceEvent.ctrlKey;
            evObj.altKey = sourceEvent.altKey;
            evObj.shiftKey = sourceEvent.shiftKey;
            evObj.metaKey = sourceEvent.metaKey;
            evObj.button = sourceEvent.button;
            evObj.relatedTarget = relatedTarget || sourceEvent.relatedTarget;
        }
        // offsets
        if (evObj.offsetX === undefined) {
            if (sourceEvent.offsetX !== undefined) {

                // For Opera which creates readonly properties
                if (Object && Object.defineProperty !== undefined) {
                    Object.defineProperty(evObj, 'offsetX', {
                        writable: true
                    });
                    Object.defineProperty(evObj, 'offsetY', {
                        writable: true
                    });
                }

                evObj.offsetX = sourceEvent.offsetX;
                evObj.offsetY = sourceEvent.offsetY;
            } else if (Object && Object.defineProperty !== undefined) {
                Object.defineProperty(evObj, 'offsetX', {
                    get: function get() {
                        if (this.currentTarget && this.currentTarget.offsetLeft) {
                            return sourceEvent.clientX - this.currentTarget.offsetLeft;
                        }
                        return sourceEvent.clientX;
                    }
                });
                Object.defineProperty(evObj, 'offsetY', {
                    get: function get() {
                        if (this.currentTarget && this.currentTarget.offsetTop) {
                            return sourceEvent.clientY - this.currentTarget.offsetTop;
                        }
                        return sourceEvent.clientY;
                    }
                });
            } else if (sourceEvent.layerX !== undefined) {
                evObj.offsetX = sourceEvent.layerX - sourceEvent.currentTarget.offsetLeft;
                evObj.offsetY = sourceEvent.layerY - sourceEvent.currentTarget.offsetTop;
            }
        }

        // adding missing properties

        if (sourceEvent.isPrimary !== undefined) evObj.isPrimary = sourceEvent.isPrimary;else evObj.isPrimary = true;

        if (sourceEvent.pressure) evObj.pressure = sourceEvent.pressure;else {
            var button = 0;

            if (sourceEvent.which !== undefined) button = sourceEvent.which;else if (sourceEvent.button !== undefined) {
                button = sourceEvent.button;
            }
            evObj.pressure = button === 0 ? 0 : 0.5;
        }

        if (sourceEvent.rotation) evObj.rotation = sourceEvent.rotation;else evObj.rotation = 0;

        // Timestamp
        if (sourceEvent.hwTimestamp) evObj.hwTimestamp = sourceEvent.hwTimestamp;else evObj.hwTimestamp = 0;

        // Tilts
        if (sourceEvent.tiltX) evObj.tiltX = sourceEvent.tiltX;else evObj.tiltX = 0;

        if (sourceEvent.tiltY) evObj.tiltY = sourceEvent.tiltY;else evObj.tiltY = 0;

        // Width and Height
        if (sourceEvent.height) evObj.height = sourceEvent.height;else evObj.height = 0;

        if (sourceEvent.width) evObj.width = sourceEvent.width;else evObj.width = 0;

        // preventDefault
        evObj.preventDefault = function () {
            if (sourceEvent.preventDefault !== undefined) sourceEvent.preventDefault();
        };

        // stopPropagation
        if (evObj.stopPropagation !== undefined) {
            var current = evObj.stopPropagation;
            evObj.stopPropagation = function () {
                if (sourceEvent.stopPropagation !== undefined) sourceEvent.stopPropagation();
                current.call(this);
            };
        }

        // Pointer values
        evObj.pointerId = sourceEvent.pointerId;
        evObj.pointerType = sourceEvent.pointerType;

        switch (evObj.pointerType) {// Old spec version check
            case 2:
                evObj.pointerType = POINTER_TYPE_TOUCH;
                break;
            case 3:
                evObj.pointerType = POINTER_TYPE_PEN;
                break;
            case 4:
                evObj.pointerType = POINTER_TYPE_MOUSE;
                break;
        }

        // Fire event
        if (target) target.dispatchEvent(evObj);else if (sourceEvent.target && supportsMouseEvents) {
            sourceEvent.target.dispatchEvent(evObj);
        } else {
            sourceEvent.srcElement.fireEvent('on' + getMouseEquivalentEventName(newName), evObj); // We must fallback to mouse event for very old browsers
        }
    };

    var generateMouseProxy = function generateMouseProxy(evt, eventName, canBubble, target, relatedTarget) {
        evt.pointerId = 1;
        evt.pointerType = POINTER_TYPE_MOUSE;
        generateTouchClonedEvent(evt, eventName, canBubble, target, relatedTarget);
    };

    var generateTouchEventProxy = function generateTouchEventProxy(name, touchPoint, target, eventObject, canBubble, relatedTarget) {
        var touchPointId = touchPoint.identifier + 2; // Just to not override mouse id

        touchPoint.pointerId = touchPointId;
        touchPoint.pointerType = POINTER_TYPE_TOUCH;
        touchPoint.currentTarget = target;

        if (eventObject.preventDefault !== undefined) {
            touchPoint.preventDefault = function () {
                eventObject.preventDefault();
            };
        }

        generateTouchClonedEvent(touchPoint, name, canBubble, target, relatedTarget);
    };

    var checkEventRegistration = function checkEventRegistration(node, eventName) {
        return node.__chGlobalRegisteredEvents && node.__chGlobalRegisteredEvents[eventName];
    };
    var findEventRegisteredNode = function findEventRegisteredNode(node, eventName) {
        while (node && !checkEventRegistration(node, eventName)) {
            node = node.parentNode;
        }if (node) return node;else if (checkEventRegistration(window, eventName)) return window;
    };

    var generateTouchEventProxyIfRegistered = function generateTouchEventProxyIfRegistered(eventName, touchPoint, target, eventObject, canBubble, relatedTarget) {
        // Check if user registered this event
        if (findEventRegisteredNode(target, eventName)) {
            generateTouchEventProxy(eventName, touchPoint, target, eventObject, canBubble, relatedTarget);
        }
    };

    var getMouseEquivalentEventName = function getMouseEquivalentEventName(eventName) {
        return eventName.toLowerCase().replace('pointer', 'mouse');
    };

    var getPrefixEventName = function getPrefixEventName(prefix, eventName) {
        var upperCaseIndex = supportedEventsNames.indexOf(eventName);
        var newEventName = prefix + upperCaseEventsNames[upperCaseIndex];

        return newEventName;
    };

    var registerOrUnregisterEvent = function registerOrUnregisterEvent(item, name, func, enable) {
        if (item.__chRegisteredEvents === undefined) {
            item.__chRegisteredEvents = [];
        }

        if (enable) {
            if (item.__chRegisteredEvents[name] !== undefined) {
                item.__chRegisteredEvents[name]++;
                return;
            }

            item.__chRegisteredEvents[name] = 1;
            item.addEventListener(name, func, false);
        } else {

            if (item.__chRegisteredEvents.indexOf(name) !== -1) {
                item.__chRegisteredEvents[name]--;

                if (item.__chRegisteredEvents[name] !== 0) {
                    return;
                }
            }
            item.removeEventListener(name, func);
            item.__chRegisteredEvents[name] = 0;
        }
    };

    var setTouchAware = function setTouchAware(item, eventName, enable) {
        // Leaving tokens
        if (!item.__chGlobalRegisteredEvents) {
            item.__chGlobalRegisteredEvents = [];
        }
        if (enable) {
            if (item.__chGlobalRegisteredEvents[eventName] !== undefined) {
                item.__chGlobalRegisteredEvents[eventName]++;
                return;
            }
            item.__chGlobalRegisteredEvents[eventName] = 1;
        } else {
            if (item.__chGlobalRegisteredEvents[eventName] !== undefined) {
                item.__chGlobalRegisteredEvents[eventName]--;
                if (item.__chGlobalRegisteredEvents[eventName] < 0) {
                    item.__chGlobalRegisteredEvents[eventName] = 0;
                }
            }
        }

        var nameGenerator;
        var eventGenerator;
        if (window.MSPointerEvent) {
            nameGenerator = function nameGenerator(name) {
                return getPrefixEventName('MS', name);
            };
            eventGenerator = generateTouchClonedEvent;
        } else {
            nameGenerator = getMouseEquivalentEventName;
            eventGenerator = generateMouseProxy;
        }
        switch (eventName) {
            case 'pointerenter':
            case 'pointerleave':
                var targetEvent = nameGenerator(eventName);
                if (item['on' + targetEvent.toLowerCase()] !== undefined) {
                    registerOrUnregisterEvent(item, targetEvent, function (evt) {
                        eventGenerator(evt, eventName);
                    }, enable);
                }
                break;
        }
    };

    // Intercept addEventListener calls by changing the prototype
    var interceptAddEventListener = function interceptAddEventListener(root) {
        var current = root.prototype ? root.prototype.addEventListener : root.addEventListener;

        var customAddEventListener = function customAddEventListener(name, func, capture) {
            // Branch when a PointerXXX is used
            if (supportedEventsNames.indexOf(name) !== -1) {
                setTouchAware(this, name, true);
            }

            if (current === undefined) {
                this.attachEvent('on' + getMouseEquivalentEventName(name), func);
            } else {
                current.call(this, name, func, capture);
            }
        };

        if (root.prototype) {
            root.prototype.addEventListener = customAddEventListener;
        } else {
            root.addEventListener = customAddEventListener;
        }
    };

    // Intercept removeEventListener calls by changing the prototype
    var interceptRemoveEventListener = function interceptRemoveEventListener(root) {
        var current = root.prototype ? root.prototype.removeEventListener : root.removeEventListener;

        var customRemoveEventListener = function customRemoveEventListener(name, func, capture) {
            // Release when a PointerXXX is used
            if (supportedEventsNames.indexOf(name) !== -1) {
                setTouchAware(this, name, false);
            }

            if (current === undefined) {
                this.detachEvent(getMouseEquivalentEventName(name), func);
            } else {
                current.call(this, name, func, capture);
            }
        };
        if (root.prototype) {
            root.prototype.removeEventListener = customRemoveEventListener;
        } else {
            root.removeEventListener = customRemoveEventListener;
        }
    };

    // Hooks
    interceptAddEventListener(window);
    interceptAddEventListener(window.HTMLElement || window.Element);
    interceptAddEventListener(document);
    interceptAddEventListener(HTMLBodyElement);
    interceptAddEventListener(HTMLDivElement);
    interceptAddEventListener(HTMLImageElement);
    interceptAddEventListener(HTMLUListElement);
    interceptAddEventListener(HTMLAnchorElement);
    interceptAddEventListener(HTMLLIElement);
    interceptAddEventListener(HTMLTableElement);
    if (window.HTMLSpanElement) {
        interceptAddEventListener(HTMLSpanElement);
    }
    if (window.HTMLCanvasElement) {
        interceptAddEventListener(HTMLCanvasElement);
    }
    if (window.SVGElement) {
        interceptAddEventListener(SVGElement);
    }

    interceptRemoveEventListener(window);
    interceptRemoveEventListener(window.HTMLElement || window.Element);
    interceptRemoveEventListener(document);
    interceptRemoveEventListener(HTMLBodyElement);
    interceptRemoveEventListener(HTMLDivElement);
    interceptRemoveEventListener(HTMLImageElement);
    interceptRemoveEventListener(HTMLUListElement);
    interceptRemoveEventListener(HTMLAnchorElement);
    interceptRemoveEventListener(HTMLLIElement);
    interceptRemoveEventListener(HTMLTableElement);
    if (window.HTMLSpanElement) {
        interceptRemoveEventListener(HTMLSpanElement);
    }
    if (window.HTMLCanvasElement) {
        interceptRemoveEventListener(HTMLCanvasElement);
    }
    if (window.SVGElement) {
        interceptRemoveEventListener(SVGElement);
    }

    // Prevent mouse event from being dispatched after Touch Events action
    var touching = false;
    var touchTimer = -1;

    function setTouchTimer() {
        touching = true;
        clearTimeout(touchTimer);
        touchTimer = setTimeout(function () {
            touching = false;
        }, 700);
        // 1. Mobile browsers dispatch mouse events 300ms after touchend
        // 2. Chrome for Android dispatch mousedown for long-touch about 650ms
        // Result: Blocking Mouse Events for 700ms.
    }

    function getFirstCommonNode(x, y) {
        while (x) {
            if (x === document.documentElement || x.contains && x.contains(y)) {
                return x;
            }
            x = x.parentNode;
        }

        return null;
    }

    //generateProxy receives a node to dispatch the event
    function dispatchPointerEnter(currentTarget, relatedTarget, generateProxy) {
        var commonParent = getFirstCommonNode(currentTarget, relatedTarget);
        var node = currentTarget;
        var nodelist = [];
        while (node && node !== commonParent) {
            //target range: this to the direct child of parent relatedTarget
            if (checkEventRegistration(node, 'pointerenter')) //check if any parent node has pointerenter
                nodelist.push(node);
            node = node.parentNode;
        }
        while (nodelist.length > 0) {
            generateProxy(nodelist.pop());
        }
    }

    //generateProxy receives a node to dispatch the event
    function dispatchPointerLeave(currentTarget, relatedTarget, generateProxy) {
        var commonParent = getFirstCommonNode(currentTarget, relatedTarget);
        var node = currentTarget;
        while (node && node !== commonParent) {
            //target range: this to the direct child of parent relatedTarget
            if (checkEventRegistration(node, 'pointerleave')) //check if any parent node has pointerleave
                generateProxy(node);
            node = node.parentNode;
        }
    }

    // Handling events on window to prevent unwanted super-bubbling
    // All mouse events are affected by touch fallback
    function applySimpleEventTunnels(nameGenerator, eventGenerator) {
        ['pointerdown', 'pointermove', 'pointerup', 'pointerover', 'pointerout'].forEach(function (eventName) {
            window.addEventListener(nameGenerator(eventName), function (evt) {
                if (!touching && findEventRegisteredNode(evt.target, eventName)) eventGenerator(evt, eventName, true);
            });
        });
        if (window['on' + nameGenerator('pointerenter').toLowerCase()] === undefined) window.addEventListener(nameGenerator('pointerover'), function (evt) {
            if (touching) return;
            var foundNode = findEventRegisteredNode(evt.target, 'pointerenter');
            if (!foundNode || foundNode === window) return;else if (!foundNode.contains(evt.relatedTarget)) {
                dispatchPointerEnter(foundNode, evt.relatedTarget, function (targetNode) {
                    eventGenerator(evt, 'pointerenter', false, targetNode, evt.relatedTarget);
                });
            }
        });
        if (window['on' + nameGenerator('pointerleave').toLowerCase()] === undefined) window.addEventListener(nameGenerator('pointerout'), function (evt) {
            if (touching) return;
            var foundNode = findEventRegisteredNode(evt.target, 'pointerleave');
            if (!foundNode || foundNode === window) return;else if (!foundNode.contains(evt.relatedTarget)) {
                dispatchPointerLeave(foundNode, evt.relatedTarget, function (targetNode) {
                    eventGenerator(evt, 'pointerleave', false, targetNode, evt.relatedTarget);
                });
            }
        });
    }

    (function () {
        if (window.MSPointerEvent) {
            //IE 10
            applySimpleEventTunnels(function (name) {
                return getPrefixEventName('MS', name);
            }, generateTouchClonedEvent);
        } else {
            applySimpleEventTunnels(getMouseEquivalentEventName, generateMouseProxy);

            // Handling move on window to detect pointerleave/out/over
            if (window.ontouchstart !== undefined) {
                window.addEventListener('touchstart', function (eventObject) {
                    for (var i = 0; i < eventObject.changedTouches.length; ++i) {
                        var touchPoint = eventObject.changedTouches[i];
                        previousTargets[touchPoint.identifier] = touchPoint.target;

                        generateTouchEventProxyIfRegistered('pointerover', touchPoint, touchPoint.target, eventObject, true);

                        //pointerenter should not be bubbled
                        dispatchPointerEnter(touchPoint.target, null, function (targetNode) {
                            generateTouchEventProxy('pointerenter', touchPoint, targetNode, eventObject, false);
                        });

                        generateTouchEventProxyIfRegistered('pointerdown', touchPoint, touchPoint.target, eventObject, true);
                    }
                    setTouchTimer();
                });

                window.addEventListener('touchend', function (eventObject) {
                    for (var i = 0; i < eventObject.changedTouches.length; ++i) {
                        var touchPoint = eventObject.changedTouches[i];
                        var currentTarget = previousTargets[touchPoint.identifier];

                        if (!currentTarget) {
                            continue;
                        }

                        generateTouchEventProxyIfRegistered('pointerup', touchPoint, currentTarget, eventObject, true);
                        generateTouchEventProxyIfRegistered('pointerout', touchPoint, currentTarget, eventObject, true);

                        //pointerleave should not be bubbled
                        dispatchPointerLeave(currentTarget, null, function (targetNode) {
                            generateTouchEventProxy('pointerleave', touchPoint, targetNode, eventObject, false);
                        });

                        delete previousTargets[touchPoint.identifier];
                    }
                    setTouchTimer();
                });

                window.addEventListener('touchmove', function (eventObject) {
                    for (var i = 0; i < eventObject.changedTouches.length; ++i) {
                        var touchPoint = eventObject.changedTouches[i];
                        var newTarget = document.elementFromPoint(touchPoint.clientX, touchPoint.clientY);
                        var currentTarget = previousTargets[touchPoint.identifier];

                        // If force preventDefault
                        if (currentTarget && checkPreventDefault(currentTarget) === true) eventObject.preventDefault();

                        // Viewport manipulation fires non-cancelable touchmove
                        if (!eventObject.cancelable) {
                            delete previousTargets[touchPoint.identifier];
                            generateTouchEventProxyIfRegistered('pointercancel', touchPoint, currentTarget, eventObject, true);
                            generateTouchEventProxyIfRegistered('pointerout', touchPoint, currentTarget, eventObject, true);

                            dispatchPointerLeave(currentTarget, null, function (targetNode) {
                                generateTouchEventProxy('pointerleave', touchPoint, targetNode, eventObject, false);
                            });
                            continue;
                        }

                        generateTouchEventProxyIfRegistered('pointermove', touchPoint, currentTarget, eventObject, true);

                        if (currentTarget === newTarget) {
                            continue; // We can skip this as the pointer is effectively over the current target
                        }

                        if (currentTarget) {
                            // Raise out
                            generateTouchEventProxyIfRegistered('pointerout', touchPoint, currentTarget, eventObject, true, newTarget);

                            // Raise leave
                            if (!currentTarget.contains(newTarget)) {
                                // Leave must be called if the new target is not a child of the current
                                dispatchPointerLeave(currentTarget, newTarget, function (targetNode) {
                                    generateTouchEventProxy('pointerleave', touchPoint, targetNode, eventObject, false, newTarget);
                                });
                            }
                        }

                        if (newTarget) {
                            // Raise over
                            generateTouchEventProxyIfRegistered('pointerover', touchPoint, newTarget, eventObject, true, currentTarget);

                            // Raise enter
                            if (!newTarget.contains(currentTarget)) {
                                // Leave must be called if the new target is not the parent of the current
                                dispatchPointerEnter(newTarget, currentTarget, function (targetNode) {
                                    generateTouchEventProxy('pointerenter', touchPoint, targetNode, eventObject, false, currentTarget);
                                });
                            }
                        }
                        previousTargets[touchPoint.identifier] = newTarget;
                    }
                    setTouchTimer();
                });

                window.addEventListener('touchcancel', function (eventObject) {
                    for (var i = 0; i < eventObject.changedTouches.length; ++i) {
                        var touchPoint = eventObject.changedTouches[i];

                        generateTouchEventProxyIfRegistered('pointercancel', touchPoint, previousTargets[touchPoint.identifier], eventObject, true);
                    }
                });
            }
        }
    })();

    // Extension to navigator
    if (navigator.pointerEnabled === undefined) {

        // Indicates if the browser will fire pointer events for pointing input
        navigator.pointerEnabled = true;

        // IE
        if (navigator.msPointerEnabled) {
            navigator.maxTouchPoints = navigator.msMaxTouchPoints;
        }
    }
})(window);

/**
 * Normalizes touch/touch+click events into a 'pointertap' event that is not
 * part of standard.
 * Uses pointerEvents polyfill or native PointerEvents when supported.
 *
 * @example
 * // Use pointertap as fastclick on touch enabled devices
 * document.querySelector('.btn').addEventListener(ch.pointertap, function(e) {
 *   console.log('tap');
 * });
 */
(function () {
    'use strict';

    // IE8 has no support for custom Mouse Events, fallback to onclick

    if (!window.MouseEvent) {
        return;
    }

    var POINTER_TYPE_TOUCH = 'touch';
    var POINTER_TYPE_PEN = 'pen';
    var POINTER_TYPE_MOUSE = 'mouse';

    var isScrolling = false;
    var scrollTimeout = false;
    var sDistX = 0;
    var sDistY = 0;
    var activePointer;

    window.addEventListener('scroll', function () {
        if (!isScrolling) {
            sDistX = window.pageXOffset;
            sDistY = window.pageYOffset;
        }
        isScrolling = true;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function () {
            isScrolling = false;
            sDistX = 0;
            sDistY = 0;
        }, 100);
    });

    window.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointerleave', pointerLeave);

    window.addEventListener('pointermove', function () /* e */{});

    /**
     * Handles the 'pointerdown' event from pointerEvents polyfill or native PointerEvents when supported.
     *
     * @private
     * @param {MouseEvent|PointerEvent} e Event.
     */
    function pointerDown(e) {
        // don't register an activePointer if more than one touch is active.
        var singleFinger = e.pointerType === POINTER_TYPE_MOUSE || e.pointerType === POINTER_TYPE_PEN || e.pointerType === POINTER_TYPE_TOUCH && e.isPrimary;

        if (!isScrolling && singleFinger) {
            activePointer = {
                id: e.pointerId,
                clientX: e.clientX,
                clientY: e.clientY,
                x: e.x || e.pageX,
                y: e.y || e.pageY,
                type: e.pointerType
            };
        }
    }

    /**
     * Handles the 'pointerleave' event from pointerEvents polyfill or native PointerEvents when supported.
     *
     * @private
     * @param {MouseEvent|PointerEvent} e Event.
     */
    function pointerLeave() /* e */{
        activePointer = null;
    }

    /**
     * Handles the 'pointerup' event from pointerEvents polyfill or native PointerEvents when supported.
     *
     * @private
     * @param {MouseEvent|PointerEvent} e Event.
     */
    function pointerUp(e) {
        // Does our event is the same as the activePointer set by pointerdown?
        if (activePointer && activePointer.id === e.pointerId) {
            // Have we moved too much?
            if (Math.abs(activePointer.x - (e.x || e.pageX)) < 5 && Math.abs(activePointer.y - (e.y || e.pageY)) < 5) {
                // Have we scrolled too much?
                if (!isScrolling || Math.abs(sDistX - window.pageXOffset) < 5 && Math.abs(sDistY - window.pageYOffset) < 5) {
                    makePointertapEvent(e);
                }
            }
        }
        activePointer = null;
    }

    /**
     * Creates the pointertap event that is not part of standard.
     *
     * @private
     * @param {MouseEvent|PointerEvent} sourceEvent An event to use as a base for pointertap.
     */
    function makePointertapEvent(sourceEvent) {
        var evt = document.createEvent('MouseEvents');
        var newTarget = document.elementFromPoint(sourceEvent.clientX, sourceEvent.clientY);

        // According to the MDN docs if the specified point is outside the visible bounds of the document
        // or either coordinate is negative, the result is null
        if (!newTarget) {
            return null;
        }

        // TODO: Replace 'initMouseEvent' with 'new MouseEvent'
        evt.initMouseEvent('pointertap', true, true, window, 1, sourceEvent.screenX, sourceEvent.screenY, sourceEvent.clientX, sourceEvent.clientY, sourceEvent.ctrlKey, sourceEvent.altKey, sourceEvent.shiftKey, sourceEvent.metaKey, sourceEvent.button, newTarget);

        evt.maskedEvent = sourceEvent;
        newTarget.dispatchEvent(evt);

        return evt;
    }
})();