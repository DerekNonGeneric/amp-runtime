(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
exports.__esModule = true;
exports.register = register;
exports.run = run;
exports.writeScript = writeScript;
exports.loadScript = loadScript;
exports.nextTick = nextTick;
exports.validateSrcPrefix = validateSrcPrefix;
exports.validateSrcContains = validateSrcContains;
exports.computeInMasterFrame = computeInMasterFrame;
exports.validateData = validateData;
exports.isExperimentOn = isExperimentOn;
exports.setExperimentToggles = setExperimentToggles;
/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Utility functions for scripts running inside of a third
 * party iframe.
 */

// Note: loaded by 3p system. Cannot rely on babel polyfills.

var _srcLog = require('../src/log');

var _srcTypes = require('../src/types');

var _srcUtilsObject = require('../src/utils/object');

/** @typedef {function(!Window, !Object)}  */
var ThirdPartyFunctionDef = undefined;

/**
 * @const {!Object<ThirdPartyFunctionDef>}
 * @visibleForTesting
 */
var registrations = _srcUtilsObject.map();

exports.registrations = registrations;
/** @type {number} */
var syncScriptLoads = 0;

/**
 * @param {string} id The specific 3p integration.
 * @param {ThirdPartyFunctionDef} draw Function that draws the 3p integration.
 */

function register(id, draw) {
  _srcLog.dev().assert(!registrations[id], 'Double registration %s', id);
  registrations[id] = draw;
}

/**
 * Execute the 3p integration with the given id.
 * @param {string} id
 * @param {!Window} win
 * @param {!Object} data
 */

function run(id, win, data) {
  var fn = registrations[id];
  _srcLog.user().assert(fn, 'Unknown 3p: ' + id);
  fn(win, data);
}

/**
 * Synchronously load the given script URL. Only use this if you need a sync
 * load. Otherwise use {@link loadScript}.
 * Supports taking a callback that will be called synchronously after the given
 * script was executed.
 * @param {!Window} win
 * @param {string} url
 * @param {function()=} opt_cb
 */

function writeScript(win, url, opt_cb) {
  /*eslint no-useless-concat: 0*/
  win.document.write('<' + 'script src="' + encodeURI(url) + '"><' + '/script>');
  if (opt_cb) {
    executeAfterWriteScript(win, opt_cb);
  }
}

/**
 * Asynchronously load the given script URL.
 * @param {!Window} win
 * @param {string} url
 * @param {function()=} opt_cb
 * @param {function()=} opt_errorCb
 */

function loadScript(win, url, opt_cb, opt_errorCb) {
  /** @const {!Element} */
  var s = win.document.createElement('script');
  s.src = url;
  if (opt_cb) {
    s.onload = opt_cb;
  }
  if (opt_errorCb) {
    s.onerror = opt_errorCb;
  }
  win.document.body.appendChild(s);
}

/**
 * Call function in micro task or timeout as a fallback.
 * This is a lightweight helper, because we cannot guarantee that
 * Promises are available inside the 3p frame.
 * @param {!Window} win
 * @param {function()} fn
 */

function nextTick(win, fn) {
  var P = win.Promise;
  if (P) {
    P.resolve().then /*OK*/(fn);
  } else {
    win.setTimeout(fn, 0);
  }
}

/**
 * Run the function after all currently waiting sync scripts have been
 * executed.
 * @param {!Window} win
 * @param {function()} fn
 */
function executeAfterWriteScript(win, fn) {
  var index = syncScriptLoads++;
  win['__runScript' + index] = fn;
  win.document.write('<' + 'script>__runScript' + index + '()<' + '/script>');
}

/**
 * Throws if the given src doesn't start with prefix(es).
 * @param {!Array<string>|string} prefix
 * @param {string} src
 */

function validateSrcPrefix(prefix, src) {
  if (!_srcTypes.isArray(prefix)) {
    prefix = [prefix];
  }
  if (src !== undefined) {
    for (var p = 0; p <= prefix.length; p++) {
      var protocolIndex = src.indexOf(prefix[p]);
      if (protocolIndex == 0) {
        return;
      }
    }
  }
  throw new Error('Invalid src ' + src);
}

/**
 * Throws if the given src doesn't contain the string
 * @param {string} string
 * @param {string} src
 */

function validateSrcContains(string, src) {
  if (src.indexOf(string) === -1) {
    throw new Error('Invalid src ' + src);
  }
}

/**
 * Utility function to perform a potentially asynchronous task
 * exactly once for all frames of a given type and the provide the respective
 * value to all frames.
 * @param {!Window} global Your window
 * @param {string} taskId Must be not conflict with any other global variable
 *     you use. Must be the same for all callers from all frames that want
 *     the same result.
 * @param {function(function(*))} work Function implementing the work that
 *     is to be done. Receives a second function that should be called with
 *     the result when the work is done.
 * @param {function(*)} cb Callback function that is called when the work is
 *     done. The first argument is the result.
 */

function computeInMasterFrame(global, taskId, work, cb) {
  var master = global.context.master;
  var tasks = master.__ampMasterTasks;
  if (!tasks) {
    tasks = master.__ampMasterTasks = {};
  }
  var cbs = tasks[taskId];
  if (!tasks[taskId]) {
    cbs = tasks[taskId] = [];
  }
  cbs.push(cb);
  if (!global.context.isMaster) {
    return; // Only do work in master.
  }
  work(function (result) {
    for (var i = 0; i < cbs.length; i++) {
      cbs[i].call(null, result);
    }
    tasks[taskId] = {
      push: function (cb) {
        cb(result);
      }
    };
  });
}

/**
 * Validates given data. Throws an exception if the data does not
 * contains a mandatory field. If called with the optional param
 * opt_optionalFields, it also validates that the data contains no fields other
 * than mandatory and optional fields.
 *
 * Mandatory fields also accept a string Array as an item. All items in that
 * array are considered as alternatives to each other. So the validation checks
 * that the data contains exactly one of those alternatives.
 *
 * @param {!Object} data
 * @param {!Array<string|!Array<string>>} mandatoryFields
 * @param {Array<string>=} opt_optionalFields
 */

function validateData(data, mandatoryFields, opt_optionalFields) {
  var allowedFields = opt_optionalFields || [];
  for (var i = 0; i < mandatoryFields.length; i++) {
    var field = mandatoryFields[i];
    if (Array.isArray(field)) {
      validateExactlyOne(data, field);
      allowedFields = allowedFields.concat(field);
    } else {
      _srcLog.user().assert(data[field], 'Missing attribute for %s: %s.', data.type, field);
      allowedFields.push(field);
    }
  }
  if (opt_optionalFields) {
    validateAllowedFields(data, allowedFields);
  }
}

/**
 * Throws an exception if data does not contains exactly one field
 * mentioned in the alternativeField array.
 * @param {!Object} data
 * @param {!Array<string>} alternativeFields
 */
function validateExactlyOne(data, alternativeFields) {
  var countFileds = 0;

  for (var i = 0; i < alternativeFields.length; i++) {
    var field = alternativeFields[i];
    if (data[field]) {
      countFileds += 1;
    }
  }

  _srcLog.user().assert(countFileds === 1, '%s must contain exactly one of attributes: %s.', data.type, alternativeFields.join(', '));
}

/**
 * Throws a non-interrupting exception if data contains a field not supported
 * by this embed type.
 * @param {!Object} data
 * @param {!Array<string>} allowedFields
 */
function validateAllowedFields(data, allowedFields) {
  var defaultAvailableFields = {
    width: true,
    height: true,
    type: true,
    referrer: true,
    canonicalUrl: true,
    pageViewId: true,
    location: true,
    mode: true,
    consentNotificationId: true,
    ampSlotIndex: true
  };

  for (var field in data) {
    if (!data.hasOwnProperty(field) || field in defaultAvailableFields) {
      continue;
    }
    if (allowedFields.indexOf(field) < 0) {
      // Throw in a timeout, because we do not want to interrupt execution,
      // because that would make each removal an instant backward incompatible
      // change.
      _srcLog.rethrowAsync(new Error('Unknown attribute for ' + data.type + ': ' + field + '.'));
    }
  }
}

/** @private {!Object<string, boolean>} */
var experimentToggles = {};

/**
 * Returns true if an experiment is enabled.
 * @param {string} experimentId
 * @return {boolean}
 */

function isExperimentOn(experimentId) {
  return !!experimentToggles[experimentId];
}

/**
 * Set experiment toggles.
 * @param {!Object<string, boolean>} toggles
 */

function setExperimentToggles(toggles) {
  experimentToggles = toggles;
}

},{"../src/log":9,"../src/types":16,"../src/utils/object":18}],2:[function(require,module,exports){
/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

require('./polyfills');

var _ampcontextJs = require('./ampcontext.js');

var _srcLog = require('../src/log');

_srcLog.initLogConstructor();

// TODO(alanorozco): Refactor src/error.reportError so it does not contain big
// transitive dependencies and can be included here.
_srcLog.setReportError(function () {});

/**
 *  If window.context does not exist, we must instantiate a replacement and
 *  assign it to window.context, to provide the creative with all the required
 *  functionality.
 */
try {
  var windowContextCreated = new Event('amp-windowContextCreated');
  window.context = new _ampcontextJs.AmpContext(window);
  // Allows for pre-existence, consider validating correct window.context lib instance?
  window.dispatchEvent(windowContextCreated);
} catch (err) {
  // do nothing with error
}

},{"../src/log":9,"./ampcontext.js":3,"./polyfills":5}],3:[function(require,module,exports){
exports.__esModule = true;
/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _srcUtilsObject = require('../src/utils/object');

var _srcLog = require('../src/log');

var _iframeMessagingClient = require('./iframe-messaging-client');

var _src3pFrameMessaging = require('../src/3p-frame-messaging');

var _p = require('./3p');

var _srcJson = require('../src/json');

var _srcTypes = require('../src/types');

var AbstractAmpContext = (function () {

  /**
   *  @param {!Window} win The window that the instance is built inside.
   */

  function AbstractAmpContext(win) {
    babelHelpers.classCallCheck(this, AbstractAmpContext);

    _srcLog.dev().assert(!this.isAbstractImplementation_(), 'Should not construct AbstractAmpContext instances directly');

    /** @protected {!Window} */
    this.win_ = win;

    // This value is cached since it could be overwritten by the master frame
    // check using a value of a different type.
    /** @private {?string} */
    this.cachedFrameName_ = this.win_.name || null;

    /** @type {?string} */
    this.embedType_ = null;

    // ----------------------------------------------------
    // Please keep public attributes alphabetically sorted.
    // ----------------------------------------------------

    /** @public {?string|undefined} */
    this.canary = null;

    /** @type {?string} */
    this.canonicalUrl = null;

    /** @type {?string} */
    this.clientId = null;

    /** @type {?string|undefined} */
    this.container = null;

    /** @type {?Object<String, *>} */
    this.data = null;

    /** @type {?boolean} */
    this.hidden = null;

    /** @type {?Object} */
    this.initialLayoutRect = null;

    /** @type {?Object} */
    this.initialIntersection = null;

    /** @type {?Location} */
    this.location = null;

    /** @type {?Object} */
    this.mode = null;

    /** @type {?string} */
    this.pageViewId = null;

    /** @type {?string} */
    this.referrer = null;

    /** @type {?string} */
    this.sentinel = null;

    /** @type {?string} */
    this.sourceUrl = null;

    /** @type {?number} */
    this.startTime = null;

    /** @type {?string} */
    this.tagName = null;

    this.findAndSetMetadata_();

    /** @protected {!IframeMessagingClient} */
    this.client_ = new _iframeMessagingClient.IframeMessagingClient(win);
    this.client_.setHostWindow(this.getHostWindow_());
    this.client_.setSentinel(_srcLog.dev().assertString(this.sentinel));

    this.listenForPageVisibility_();
  }

  /**
   * @return {boolean}
   * @protected
   */

  AbstractAmpContext.prototype.isAbstractImplementation_ = function isAbstractImplementation_() {
    return true;
  };

  /** Registers an general handler for page visibility. */

  AbstractAmpContext.prototype.listenForPageVisibility_ = function listenForPageVisibility_() {
    var _this = this;

    this.client_.makeRequest(_src3pFrameMessaging.MessageType.SEND_EMBED_STATE, _src3pFrameMessaging.MessageType.EMBED_STATE, function (data) {
      _this.hidden = data.pageHidden;
      _this.dispatchVisibilityChangeEvent_();
    });
  };

  /**
   * TODO(alanorozco): Deprecate native event mechanism.
   * @private
   */

  AbstractAmpContext.prototype.dispatchVisibilityChangeEvent_ = function dispatchVisibilityChangeEvent_() {
    var event = this.win_.document.createEvent('Event');
    event.data = { hidden: this.hidden };
    event.initEvent('amp:visibilitychange', true, true);
    this.win_.dispatchEvent(event);
  };

  /**
   *  Listen to page visibility changes.
   *  @param {function({hidden: boolean})} callback Function to call every time
   *    we receive a page visibility message.
   *  @returns {function()} that when called stops triggering the callback
   *    every time we receive a page visibility message.
   */

  AbstractAmpContext.prototype.onPageVisibilityChange = function onPageVisibilityChange(callback) {
    return this.client_.registerCallback(_src3pFrameMessaging.MessageType.EMBED_STATE, function (data) {
      callback({ hidden: data.pageHidden });
    });
  };

  /**
   *  Send message to runtime to start sending intersection messages.
   *  @param {function(Array<Object>)} callback Function to call every time we
   *    receive an intersection message.
   *  @returns {function()} that when called stops triggering the callback
   *    every time we receive an intersection message.
   */

  AbstractAmpContext.prototype.observeIntersection = function observeIntersection(callback) {
    var _this2 = this;

    var unlisten = this.client_.makeRequest(_src3pFrameMessaging.MessageType.SEND_INTERSECTIONS, _src3pFrameMessaging.MessageType.INTERSECTION, function (intersection) {
      callback(intersection.changes);
    });

    // Call the callback with the value that was transmitted when the
    // iframe was drawn. Called in nextTick, so that callers don't
    // have to specially handle the sync case.
    // TODO(lannka, #8562): Deprecate this behavior
    _p.nextTick(this.win_, function () {
      callback([_this2.initialIntersection]);
    });

    return unlisten;
  };

  /**
   *  Send message to runtime requesting to resize ad to height and width.
   *    This is not guaranteed to succeed. All this does is make the request.
   *  @param {number} width The new width for the ad we are requesting.
   *  @param {number} height The new height for the ad we are requesting.
   */

  AbstractAmpContext.prototype.requestResize = function requestResize(width, height) {
    this.client_.sendMessage(_src3pFrameMessaging.MessageType.EMBED_SIZE, _srcUtilsObject.dict({
      'width': width,
      'height': height
    }));
  };

  /**
   *  Allows a creative to set the callback function for when the resize
   *    request returns a success. The callback should be set before resizeAd
   *    is ever called.
   *  @param {function(number, number)} callback Function to call if the resize
   *    request succeeds.
   */

  AbstractAmpContext.prototype.onResizeSuccess = function onResizeSuccess(callback) {
    this.client_.registerCallback(_src3pFrameMessaging.MessageType.EMBED_SIZE_CHANGED, function (obj) {
      callback(obj.requestedHeight, obj.requestedWidth);
    });
  };

  /**
   *  Allows a creative to set the callback function for when the resize
   *    request is denied. The callback should be set before resizeAd
   *    is ever called.
   *  @param {function(number, number)} callback Function to call if the resize
   *    request is denied.
   */

  AbstractAmpContext.prototype.onResizeDenied = function onResizeDenied(callback) {
    this.client_.registerCallback(_src3pFrameMessaging.MessageType.EMBED_SIZE_DENIED, function (obj) {
      callback(obj.requestedHeight, obj.requestedWidth);
    });
  };

  /**
   *  Takes the current name on the window, and attaches it to
   *  the name of the iframe.
   *  @param {HTMLIFrameElement} iframe The iframe we are adding the context to.
   */

  AbstractAmpContext.prototype.addContextToIframe = function addContextToIframe(iframe) {
    // TODO(alanorozco): consider the AMP_CONTEXT_DATA case
    iframe.name = _srcLog.dev().assertString(this.cachedFrameName_);
  };

  /**
   *  Notifies the parent document of no content available inside embed.
   */

  AbstractAmpContext.prototype.noContentAvailable = function noContentAvailable() {
    this.client_.sendMessage(_src3pFrameMessaging.MessageType.NO_CONTENT);
  };

  /**
   *  Parse the metadata attributes from the name and add them to
   *  the class instance.
   *  @param {!Object|string} data
   *  @private
   */

  AbstractAmpContext.prototype.setupMetadata_ = function setupMetadata_(data) {
    var dataObject = _srcLog.dev().assert(typeof data === 'string' ? _srcJson.tryParseJson(data) : data, 'Could not setup metadata.');

    var context = dataObject._context || dataObject.attributes._context;

    this.canary = context.canary;
    this.canonicalUrl = context.canonicalUrl;
    this.clientId = context.clientId;
    this.container = context.container;
    this.data = context.tagName;
    this.hidden = context.hidden;
    this.initialLayoutRect = context.initialLayoutRect;
    this.initialIntersection = context.initialIntersection;
    this.location = context.location;
    this.mode = context.mode;
    this.pageViewId = context.pageViewId;
    this.referrer = context.referrer;
    this.sentinel = context.sentinel;
    this.sourceUrl = context.sourceUrl;
    this.startTime = context.startTime;
    this.tagName = context.tagName;

    this.embedType_ = dataObject.type || null;
  };

  /**
   *  Calculate the hostWindow
   *  @private
   */

  AbstractAmpContext.prototype.getHostWindow_ = function getHostWindow_() {
    var sentinelMatch = this.sentinel.match(/((\d+)-\d+)/);
    _srcLog.dev().assert(sentinelMatch, 'Incorrect sentinel format');
    var depth = Number(sentinelMatch[2]);
    var ancestors = [];
    for (var win = this.win_; win && win != win.parent; win = win.parent) {
      // Add window keeping the top-most one at the front.
      ancestors.push(win.parent);
    }
    return ancestors[ancestors.length - 1 - depth];
  };

  /**
   *  Checks to see if there is a window variable assigned with the
   *  sentinel value, sets it, and returns true if so.
   *  @private
   */

  AbstractAmpContext.prototype.findAndSetMetadata_ = function findAndSetMetadata_() {
    // If the context data is set on window, that means we don't need
    // to check the name attribute as it has been bypassed.
    // TODO(alanorozco): why the heck could AMP_CONTEXT_DATA be two different
    // types? FIX THIS.
    if (_srcTypes.isObject(this.win_.sf_) && this.win_.sf_.cfg) {
      this.setupMetadata_( /** @type {!string}*/this.win_.sf_.cfg);
    } else if (this.win_.AMP_CONTEXT_DATA) {
      if (typeof this.win_.AMP_CONTEXT_DATA == 'string') {
        this.sentinel = this.win_.AMP_CONTEXT_DATA;
      } else if (_srcTypes.isObject(this.win_.AMP_CONTEXT_DATA)) {
        this.setupMetadata_(this.win_.AMP_CONTEXT_DATA);
      }
    } else {
      this.setupMetadata_(this.win_.name);
    }
  };

  return AbstractAmpContext;
})();

exports.AbstractAmpContext = AbstractAmpContext;

var AmpContext = (function (_AbstractAmpContext) {
  babelHelpers.inherits(AmpContext, _AbstractAmpContext);

  function AmpContext() {
    babelHelpers.classCallCheck(this, AmpContext);

    _AbstractAmpContext.apply(this, arguments);
  }

  /** @return {boolean} */

  AmpContext.prototype.isAbstractImplementation_ = function isAbstractImplementation_() {
    return false;
  };

  return AmpContext;
})(AbstractAmpContext);

exports.AmpContext = AmpContext;

},{"../src/3p-frame-messaging":6,"../src/json":8,"../src/log":9,"../src/types":16,"../src/utils/object":18,"./3p":1,"./iframe-messaging-client":4}],4:[function(require,module,exports){
exports.__esModule = true;
/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _srcObservable = require('../src/observable');

var _srcUtilsObject = require('../src/utils/object');

var _src3pFrameMessaging = require('../src/3p-frame-messaging');

var _srcMode = require('../src/mode');

var _srcLog = require('../src/log');

var IframeMessagingClient = (function () {

  /**
   *  @param {!Window} win A window object.
   */

  function IframeMessagingClient(win) {
    babelHelpers.classCallCheck(this, IframeMessagingClient);

    /** @private {!Window} */
    this.win_ = win;
    /** @private {?string} */
    this.rtvVersion_ = _srcMode.getMode().rtvVersion || null;
    /** @private {!Window} */
    this.hostWindow_ = win.parent;
    /** @private {?string} */
    this.sentinel_ = null;
    /**
     * Map messageType keys to observables to be fired when messages of that
     * type are received.
     * @private {!Object}
     */
    this.observableFor_ = _srcUtilsObject.map();
    this.setupEventListener_();
  }

  /**
   * Make an event listening request to the host window.
   *
   * @param {string} requestType The type of the request message.
   * @param {string} responseType The type of the response message.
   * @param {function(Object)} callback The callback function to call
   *   when a message with type responseType is received.
   */

  IframeMessagingClient.prototype.makeRequest = function makeRequest(requestType, responseType, callback) {
    var unlisten = this.registerCallback(responseType, callback);
    this.sendMessage(requestType);
    return unlisten;
  };

  /**
   * Register callback function for message with type messageType.
   *   As it stands right now, only one callback can exist at a time.
   *   All future calls will overwrite any previously registered
   *   callbacks.
   * @param {string} messageType The type of the message.
   * @param {function(Object)} callback The callback function to call
   *   when a message with type messageType is received.
   */

  IframeMessagingClient.prototype.registerCallback = function registerCallback(messageType, callback) {
    // NOTE : no validation done here. any callback can be register
    // for any callback, and then if that message is received, this
    // class *will execute* that callback
    return this.getOrCreateObservableFor_(messageType).add(callback);
  };

  /**
   *  Send a postMessage to Host Window
   *  @param {string} type The type of message to send.
   *  @param {JsonObject=} opt_payload The payload of message to send.
   */

  IframeMessagingClient.prototype.sendMessage = function sendMessage(type, opt_payload) {
    this.hostWindow_.postMessage /*OK*/(_src3pFrameMessaging.serializeMessage(type, _srcLog.dev().assertString(this.sentinel_), opt_payload, this.rtvVersion_), '*');
  };

  /**
   * Sets up event listener for post messages of the desired type.
   *   The actual implementation only uses a single event listener for all of
   *   the different messages, and simply diverts the message to be handled
   *   by different callbacks.
   *   To add new messages to listen for, call registerCallback with the
   *   messageType to listen for, and the callback function.
   * @private
   */

  IframeMessagingClient.prototype.setupEventListener_ = function setupEventListener_() {
    var _this = this;

    _src3pFrameMessaging.listen(this.win_, 'message', function (event) {
      // Does it look a message from AMP?
      if (event.source != _this.hostWindow_) {
        return;
      }

      var message = _src3pFrameMessaging.deserializeMessage(event.data);
      if (!message || message['sentinel'] != _this.sentinel_) {
        return;
      }

      _this.fireObservable_(message['type'], message);
    });
  };

  /**
   * @param {!Window} win
   */

  IframeMessagingClient.prototype.setHostWindow = function setHostWindow(win) {
    this.hostWindow_ = win;
  };

  /**
   * @param {string} sentinel
   */

  IframeMessagingClient.prototype.setSentinel = function setSentinel(sentinel) {
    this.sentinel_ = sentinel;
  };

  /**
   * @param {string} messageType
   * @return {!Observable<Object>}
   */

  IframeMessagingClient.prototype.getOrCreateObservableFor_ = function getOrCreateObservableFor_(messageType) {
    if (!(messageType in this.observableFor_)) {
      this.observableFor_[messageType] = new _srcObservable.Observable();
    }
    return this.observableFor_[messageType];
  };

  /**
   * @param {string} messageType
   * @param {Object} message
   */

  IframeMessagingClient.prototype.fireObservable_ = function fireObservable_(messageType, message) {
    if (messageType in this.observableFor_) {
      this.observableFor_[messageType].fire(message);
    }
  };

  return IframeMessagingClient;
})();

exports.IframeMessagingClient = IframeMessagingClient;

},{"../src/3p-frame-messaging":6,"../src/log":9,"../src/mode":11,"../src/observable":12,"../src/utils/object":18}],5:[function(require,module,exports){
/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Loads all polyfills needed by the AMP 3p integration frame.
 */

// This list should not get longer without a very good reason.

require('../third_party/babel/custom-babel-helpers');

var _srcPolyfillsMathSign = require('../src/polyfills/math-sign');

var _srcPolyfillsObjectAssign = require('../src/polyfills/object-assign');

_srcPolyfillsMathSign.install(self);
_srcPolyfillsObjectAssign.install(self);

},{"../src/polyfills/math-sign":13,"../src/polyfills/object-assign":14,"../third_party/babel/custom-babel-helpers":19}],6:[function(require,module,exports){
exports.__esModule = true;
exports.listen = listen;
exports.serializeMessage = serializeMessage;
exports.deserializeMessage = deserializeMessage;
exports.isAmpMessage = isAmpMessage;
/**
 * Copyright 2017 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _log = require('./log');

var _utilsObject = require('./utils/object');

var _eventHelperListen = require('./event-helper-listen');

var _json = require('./json');

/** @const */
var AMP_MESSAGE_PREFIX = 'amp-';

/** @enum {string} */
var MessageType = {
  // For amp-ad
  SEND_EMBED_STATE: 'send-embed-state',
  EMBED_STATE: 'embed-state',
  SEND_EMBED_CONTEXT: 'send-embed-context',
  EMBED_CONTEXT: 'embed-context',
  SEND_INTERSECTIONS: 'send-intersections',
  INTERSECTION: 'intersection',
  EMBED_SIZE: 'embed-size',
  EMBED_SIZE_CHANGED: 'embed-size-changed',
  EMBED_SIZE_DENIED: 'embed-size-denied',
  NO_CONTENT: 'no-content',

  // For the frame to be placed in full overlay mode for lightboxes
  FULL_OVERLAY_FRAME: 'full-overlay-frame',
  FULL_OVERLAY_FRAME_RESPONSE: 'full-overlay-frame-response',
  CANCEL_FULL_OVERLAY_FRAME: 'cancel-full-overlay-frame',
  CANCEL_FULL_OVERLAY_FRAME_RESPONSE: 'cancel-full-overlay-frame-response',

  // For amp-inabox
  SEND_POSITIONS: 'send-positions',
  POSITION: 'position'
};

exports.MessageType = MessageType;
/**
 * Listens for the specified event on the element.
 * @param {!EventTarget} element
 * @param {string} eventType
 * @param {function(!Event)} listener
 * @param {boolean=} opt_capture
 * @return {!UnlistenDef}
 */

function listen(element, eventType, listener, opt_capture) {
  return _eventHelperListen.internalListenImplementation(element, eventType, listener, opt_capture);
}

/**
 * Serialize an AMP post message. Output looks like:
 * 'amp-011481323099490{"type":"position","sentinel":"12345","foo":"bar"}'
 * @param {string} type
 * @param {string} sentinel
 * @param {JsonObject=} data
 * @param {?string=} rtvVersion
 * @returns {string}
 */

function serializeMessage(type, sentinel) {
  var data = arguments.length <= 2 || arguments[2] === undefined ? _utilsObject.dict() : arguments[2];
  var rtvVersion = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

  // TODO: consider wrap the data in a "data" field. { type, sentinal, data }
  var message = data;
  message['type'] = type;
  message['sentinel'] = sentinel;
  return AMP_MESSAGE_PREFIX + (rtvVersion || '') + JSON.stringify(message);
}

/**
 * Deserialize an AMP post message.
 * Returns null if it's not valid AMP message format.
 *
 * @param {*} message
 * @returns {?JsonObject|undefined}
 */

function deserializeMessage(message) {
  if (!isAmpMessage(message)) {
    return null;
  }
  var startPos = message.indexOf('{');
  _log.dev().assert(startPos != -1, 'JSON missing in %s', message);
  try {
    return _json.parseJson(message.substr(startPos));
  } catch (e) {
    _log.dev().error('MESSAGING', 'Failed to parse message: ' + message, e);
    return null;
  }
}

/**
 *  Returns true if message looks like it is an AMP postMessage
 *  @param {*} message
 *  @return {!boolean}
 */

function isAmpMessage(message) {
  return typeof message == 'string' && message.indexOf(AMP_MESSAGE_PREFIX) == 0 && message.indexOf('{') != -1;
}

},{"./event-helper-listen":7,"./json":8,"./log":9,"./utils/object":18}],7:[function(require,module,exports){
exports.__esModule = true;
exports.internalListenImplementation = internalListenImplementation;
/**
 * Copyright 2017 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Listens for the specified event on the element.
 *
 * Do not use this directly. This method is implemented as a shared
 * dependency. Use `listen()` in either `event-helper` or `3p-frame-messaging`,
 * depending on your use case.
 *
 * @param {!EventTarget} element
 * @param {string} eventType
 * @param {function(!Event)} listener
 * @param {boolean=} opt_capture
 * @return {!UnlistenDef}
 */

function internalListenImplementation(element, eventType, listener, opt_capture) {
  var localElement = element;
  var localListener = listener;
  /** @type {?Function}  */
  var wrapped = function (event) {
    try {
      return localListener(event);
    } catch (e) {
      // reportError is installed globally per window in the entry point.
      self.reportError(e);
      throw e;
    }
  };
  var capture = opt_capture || false;
  localElement.addEventListener(eventType, wrapped, capture);
  return function () {
    if (localElement) {
      localElement.removeEventListener(eventType, wrapped, capture);
    }
    // Ensure these are GC'd
    localListener = null;
    localElement = null;
    wrapped = null;
  };
}

},{}],8:[function(require,module,exports){
exports.__esModule = true;
exports.recreateNonProtoObject = recreateNonProtoObject;
exports.getValueForExpr = getValueForExpr;
exports.parseJson = parseJson;
exports.tryParseJson = tryParseJson;
/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview This module declares JSON types as defined in the
 * {@link http://json.org/}.
 */

var _types = require('./types');

// NOTE Type are changed to {*} because of
// https://github.com/google/closure-compiler/issues/1999

/**
 * JSON scalar. It's either string, number or boolean.
 * @typedef {*} should be string|number|boolean
 */
var JSONScalarDef = undefined;

/**
 * JSON object. It's a map with string keys and JSON values.
 * @typedef {*} should be !Object<string, ?JSONValueDef>
 */
var JSONObjectDef = undefined;

/**
 * JSON array. It's an array with JSON values.
 * @typedef {*} should be !Array<?JSONValueDef>
 */
var JSONArrayDef = undefined;

/**
 * JSON value. It's either a scalar, an object or an array.
 * @typedef {*} should be !JSONScalarDef|!JSONObjectDef|!JSONArrayDef
 */
var JSONValueDef = undefined;

/**
 * Recreates objects with prototype-less copies.
 * @param {!JsonObject} obj
 * @return {!JsonObject}
 */

function recreateNonProtoObject(obj) {
  var copy = Object.create(null);
  for (var k in obj) {
    if (!hasOwnProperty(obj, k)) {
      continue;
    }
    var v = obj[k];
    copy[k] = _types.isObject(v) ? recreateNonProtoObject(v) : v;
  }
  return (/** @type {!JsonObject} */copy
  );
}

/**
 * Returns a value from an object for a field-based expression. The expression
 * is a simple nested dot-notation of fields, such as `field1.field2`. If any
 * field in a chain does not exist or is not an object, the returned value will
 * be `undefined`.
 *
 * @param {!JsonObject} obj
 * @param {string} expr
 * @return {*}
 */

function getValueForExpr(obj, expr) {
  // The `.` indicates "the object itself".
  if (expr == '.') {
    return obj;
  }
  // Otherwise, navigate via properties.
  var parts = expr.split('.');
  var value = obj;
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (!part) {
      value = undefined;
      break;
    }
    if (!_types.isObject(value) || value[part] === undefined || !hasOwnProperty(value, part)) {
      value = undefined;
      break;
    }
    value = value[part];
  }
  return value;
}

/**
 * Simple wrapper around JSON.parse that casts the return value
 * to JsonObject.
 * Create a new wrapper if an array return value is desired.
 * @param {*} json JSON string to parse
 * @return {?JsonObject|undefined} May be extend to parse arrays.
 */

function parseJson(json) {
  return (/** @type {?JsonObject} */JSON.parse( /** @type {string} */json)
  );
}

/**
 * Parses the given `json` string without throwing an exception if not valid.
 * Returns `undefined` if parsing fails.
 * Returns the `Object` corresponding to the JSON string when parsing succeeds.
 * @param {*} json JSON string to parse
 * @param {function(!Error)=} opt_onFailed Optional function that will be called
 *     with the error if parsing fails.
 * @return {?JsonObject|undefined} May be extend to parse arrays.
 */

function tryParseJson(json, opt_onFailed) {
  try {
    return parseJson(json);
  } catch (e) {
    if (opt_onFailed) {
      opt_onFailed(e);
    }
    return undefined;
  }
}

/**
 * @param {*} obj
 * @param {string} key
 * @return {boolean}
 */
function hasOwnProperty(obj, key) {
  if (obj == null || typeof obj != 'object') {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(
  /** @type {!Object} */obj, key);
}

},{"./types":16}],9:[function(require,module,exports){
exports.__esModule = true;
exports.isUserErrorMessage = isUserErrorMessage;
exports.setReportError = setReportError;
exports.duplicateErrorIfNecessary = duplicateErrorIfNecessary;
exports.rethrowAsync = rethrowAsync;
exports.initLogConstructor = initLogConstructor;
exports.resetLogConstructorForTesting = resetLogConstructorForTesting;
exports.user = user;
exports.dev = dev;
/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _mode = require('./mode');

var _modeObject = require('./mode-object');

var _types = require('./types');

/** @const Time when this JS loaded.  */
var start = Date.now();

/**
 * Triple zero width space.
 *
 * This is added to user error messages, so that we can later identify
 * them, when the only thing that we have is the message. This is the
 * case in many browsers when the global exception handler is invoked.
 *
 * @const {string}
 */
var USER_ERROR_SENTINEL = '\u200B\u200B\u200B';

exports.USER_ERROR_SENTINEL = USER_ERROR_SENTINEL;
/**
 * @return {boolean} Whether this message was a user error.
 */

function isUserErrorMessage(message) {
  return message.indexOf(USER_ERROR_SENTINEL) >= 0;
}

/**
 * @enum {number}
 * @private Visible for testing only.
 */
var LogLevel = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  FINE: 4
};

exports.LogLevel = LogLevel;
/**
 * Sets reportError function. Called from error.js to break cyclic
 * dependency.
 * @param {function(*, !Element=)|undefined} fn
 */

function setReportError(fn) {
  self.reportError = fn;
}

/**
 * Logging class.
 * @final
 * @private Visible for testing only.
 */

var Log = (function () {
  /**
   * @param {!Window} win
   * @param {function(!./mode.ModeDef):!LogLevel} levelFunc
   * @param {string=} opt_suffix
   */

  function Log(win, levelFunc, opt_suffix) {
    babelHelpers.classCallCheck(this, Log);

    /**
     * In tests we use the main test window instead of the iframe where
     * the tests runs because only the former is relayed to the console.
     * @const {!Window}
     */
    this.win = _mode.getMode().test && win.AMP_TEST_IFRAME ? win.parent : win;

    /** @private @const {function(!./mode.ModeDef):!LogLevel} */
    this.levelFunc_ = levelFunc;

    /** @private @const {!LogLevel} */
    this.level_ = this.calcLevel_();

    /** @private @const {string} */
    this.suffix_ = opt_suffix || '';
  }

  /**
   * @param {string|!Element} val
   * @return {string}
   */

  /**
   * @return {!LogLevel}
   * @private
   */

  Log.prototype.calcLevel_ = function calcLevel_() {
    // No console - can't enable logging.
    if (!this.win.console || !this.win.console.log) {
      return LogLevel.OFF;
    }

    // Logging has been explicitly disabled.
    if (_mode.getMode().log == '0') {
      return LogLevel.OFF;
    }

    // Logging is enabled for tests directly.
    if (_mode.getMode().test && this.win.ENABLE_LOG) {
      return LogLevel.FINE;
    }

    // LocalDev by default allows INFO level, unless overriden by `#log`.
    if (_mode.getMode().localDev && !_mode.getMode().log) {
      return LogLevel.INFO;
    }

    // Delegate to the specific resolver.
    return this.levelFunc_(_modeObject.getModeObject());
  };

  /**
   * @param {string} tag
   * @param {string} level
   * @param {!Array} messages
   */

  Log.prototype.msg_ = function msg_(tag, level, messages) {
    if (this.level_ != LogLevel.OFF) {
      var fn = this.win.console.log;
      if (level == 'ERROR') {
        fn = this.win.console.error || fn;
      } else if (level == 'INFO') {
        fn = this.win.console.info || fn;
      } else if (level == 'WARN') {
        fn = this.win.console.warn || fn;
      }
      messages.unshift(Date.now() - start, '[' + tag + ']');
      fn.apply(this.win.console, messages);
    }
  };

  /**
   * Whether the logging is enabled.
   * @return {boolean}
   */

  Log.prototype.isEnabled = function isEnabled() {
    return this.level_ != LogLevel.OFF;
  };

  /**
   * Reports a fine-grained message.
   * @param {string} tag
   * @param {...*} var_args
   */

  Log.prototype.fine = function fine(tag, var_args) {
    if (this.level_ >= LogLevel.FINE) {
      this.msg_(tag, 'FINE', Array.prototype.slice.call(arguments, 1));
    }
  };

  /**
   * Reports a informational message.
   * @param {string} tag
   * @param {...*} var_args
   */

  Log.prototype.info = function info(tag, var_args) {
    if (this.level_ >= LogLevel.INFO) {
      this.msg_(tag, 'INFO', Array.prototype.slice.call(arguments, 1));
    }
  };

  /**
   * Reports a warning message.
   * @param {string} tag
   * @param {...*} var_args
   */

  Log.prototype.warn = function warn(tag, var_args) {
    if (this.level_ >= LogLevel.WARN) {
      this.msg_(tag, 'WARN', Array.prototype.slice.call(arguments, 1));
    }
  };

  /**
   * Reports an error message. If the logging is disabled, the error is rethrown
   * asynchronously.
   * @param {string} tag
   * @param {...*} var_args
   * @return {!Error|undefined}
   * @private
   */

  Log.prototype.error_ = function error_(tag, var_args) {
    if (this.level_ >= LogLevel.ERROR) {
      this.msg_(tag, 'ERROR', Array.prototype.slice.call(arguments, 1));
    } else {
      var error = createErrorVargs.apply(null, Array.prototype.slice.call(arguments, 1));
      this.prepareError_(error);
      return error;
    }
  };

  /**
   * Reports an error message.
   * @param {string} unusedTag
   * @param {...*} var_args
   * @return {!Error|undefined}
   */

  Log.prototype.error = function error(unusedTag, var_args) {
    var error = this.error_.apply(this, arguments);
    if (error) {
      // reportError is installed globally per window in the entry point.
      self.reportError(error);
    }
  };

  /**
   * Reports an error message and marks with an expected property. If the
   * logging is disabled, the error is rethrown asynchronously.
   * @param {string} unusedTag
   * @param {...*} var_args
   */

  Log.prototype.expectedError = function expectedError(unusedTag, var_args) {
    var error = this.error_.apply(this, arguments);
    if (error) {
      error.expected = true;
      // reportError is installed globally per window in the entry point.
      self.reportError(error);
    }
  };

  /**
   * Creates an error object.
   * @param {...*} var_args
   * @return {!Error}
   */

  Log.prototype.createError = function createError(var_args) {
    var error = createErrorVargs.apply(null, arguments);
    this.prepareError_(error);
    return error;
  };

  /**
   * Creates an error object with its expected property set to true.
   * @param {...*} var_args
   * @return {!Error}
   */

  Log.prototype.createExpectedError = function createExpectedError(var_args) {
    var error = createErrorVargs.apply(null, arguments);
    this.prepareError_(error);
    error.expected = true;
    return error;
  };

  /**
   * Throws an error if the first argument isn't trueish.
   *
   * Supports argument substitution into the message via %s placeholders.
   *
   * Throws an error object that has two extra properties:
   * - associatedElement: This is the first element provided in the var args.
   *   It can be used for improved display of error messages.
   * - messageArray: The elements of the substituted message as non-stringified
   *   elements in an array. When e.g. passed to console.error this yields
   *   native displays of things like HTML elements.
   *
   * @param {T} shouldBeTrueish The value to assert. The assert fails if it does
   *     not evaluate to true.
   * @param {string=} opt_message The assertion message
   * @param {...*} var_args Arguments substituted into %s in the message.
   * @return {T} The value of shouldBeTrueish.
   * @template T
   */
  /*eslint "google-camelcase/google-camelcase": 0*/

  Log.prototype.assert = function assert(shouldBeTrueish, opt_message, var_args) {
    var firstElement = undefined;
    if (!shouldBeTrueish) {
      var message = opt_message || 'Assertion failed';
      var splitMessage = message.split('%s');
      var first = splitMessage.shift();
      var formatted = first;
      var messageArray = [];
      pushIfNonEmpty(messageArray, first);
      for (var i = 2; i < arguments.length; i++) {
        var val = arguments[i];
        if (val && val.tagName) {
          firstElement = val;
        }
        var nextConstant = splitMessage.shift();
        messageArray.push(val);
        pushIfNonEmpty(messageArray, nextConstant.trim());
        formatted += toString(val) + nextConstant;
      }
      var e = new Error(formatted);
      e.fromAssert = true;
      e.associatedElement = firstElement;
      e.messageArray = messageArray;
      this.prepareError_(e);
      // reportError is installed globally per window in the entry point.
      self.reportError(e);
      throw e;
    }
    return shouldBeTrueish;
  };

  /**
   * Throws an error if the first argument isn't an Element
   *
   * Otherwise see `assert` for usage
   *
   * @param {*} shouldBeElement
   * @param {string=} opt_message The assertion message
   * @return {!Element} The value of shouldBeTrueish.
   * @template T
   */
  /*eslint "google-camelcase/google-camelcase": 2*/

  Log.prototype.assertElement = function assertElement(shouldBeElement, opt_message) {
    var shouldBeTrueish = shouldBeElement && shouldBeElement.nodeType == 1;
    this.assert(shouldBeTrueish, (opt_message || 'Element expected') + ': %s', shouldBeElement);
    return (/** @type {!Element} */shouldBeElement
    );
  };

  /**
   * Throws an error if the first argument isn't a string. The string can
   * be empty.
   *
   * For more details see `assert`.
   *
   * @param {*} shouldBeString
   * @param {string=} opt_message The assertion message
   * @return {string} The string value. Can be an empty string.
   */
  /*eslint "google-camelcase/google-camelcase": 2*/

  Log.prototype.assertString = function assertString(shouldBeString, opt_message) {
    this.assert(typeof shouldBeString == 'string', (opt_message || 'String expected') + ': %s', shouldBeString);
    return (/** @type {string} */shouldBeString
    );
  };

  /**
   * Throws an error if the first argument isn't a number. The allowed values
   * include `0` and `NaN`.
   *
   * For more details see `assert`.
   *
   * @param {*} shouldBeNumber
   * @param {string=} opt_message The assertion message
   * @return {number} The number value. The allowed values include `0`
   *   and `NaN`.
   */

  Log.prototype.assertNumber = function assertNumber(shouldBeNumber, opt_message) {
    this.assert(typeof shouldBeNumber == 'number', (opt_message || 'Number expected') + ': %s', shouldBeNumber);
    return (/** @type {number} */shouldBeNumber
    );
  };

  /**
   * Asserts and returns the enum value. If the enum doesn't contain such a value,
   * the error is thrown.
   *
   * @param {!Object<T>} enumObj
   * @param {string} s
   * @param {string=} opt_enumName
   * @return T
   * @template T
   */
  /*eslint "google-camelcase/google-camelcase": 2*/

  Log.prototype.assertEnumValue = function assertEnumValue(enumObj, s, opt_enumName) {
    if (_types.isEnumValue(enumObj, s)) {
      return s;
    }
    this.assert(false, 'Unknown %s value: "%s"', opt_enumName || 'enum', s);
  };

  /**
   * @param {!Error} error
   * @private
   */

  Log.prototype.prepareError_ = function prepareError_(error) {
    error = duplicateErrorIfNecessary(error);
    if (this.suffix_) {
      if (!error.message) {
        error.message = this.suffix_;
      } else if (error.message.indexOf(this.suffix_) == -1) {
        error.message += this.suffix_;
      }
    } else if (isUserErrorMessage(error.message)) {
      error.message = error.message.replace(USER_ERROR_SENTINEL, '');
    }
  };

  return Log;
})();

exports.Log = Log;
function toString(val) {
  // Do check equivalent to `val instanceof Element` without cross-window bug
  if (val && val.nodeType == 1) {
    return val.tagName.toLowerCase() + (val.id ? '#' + val.id : '');
  }
  return (/** @type {string} */val
  );
}

/**
 * @param {!Array} array
 * @param {*} val
 */
function pushIfNonEmpty(array, val) {
  if (val != '') {
    array.push(val);
  }
}

/**
 * Some exceptions (DOMException, namely) have read-only message.
 * @param {!Error} error
 * @return {!Error};
 */

function duplicateErrorIfNecessary(error) {
  var message = error.message;
  var test = String(Math.random());
  error.message = test;

  if (error.message === test) {
    error.message = message;
    return error;
  }

  var e = new Error(error.message);
  // Copy all the extraneous things we attach.
  for (var prop in error) {
    e[prop] = error[prop];
  }
  // Ensure these are copied.
  e.stack = error.stack;
  return e;
}

/**
 * @param {...*} var_args
 * @return {!Error}
 * @private
 */
function createErrorVargs(var_args) {
  var error = null;
  var message = '';
  for (var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];
    if (arg instanceof Error && !error) {
      error = duplicateErrorIfNecessary(arg);
    } else {
      if (message) {
        message += ' ';
      }
      message += arg;
    }
  }

  if (!error) {
    error = new Error(message);
  } else if (message) {
    error.message = message + ': ' + error.message;
  }
  return error;
}

/**
 * Rethrows the error without terminating the current context. This preserves
 * whether the original error designation is a user error or a dev error.
 * @param {...*} var_args
 */

function rethrowAsync(var_args) {
  var error = createErrorVargs.apply(null, arguments);
  setTimeout(function () {
    // reportError is installed globally per window in the entry point.
    self.reportError(error);
    throw error;
  });
}

/**
 * Cache for logs. We do not use a Service since the service module depends
 * on Log and closure literally can't even.
 * @type {{user: ?Log, dev: ?Log}}
 */
self.log = self.log || {
  user: null,
  dev: null
};

var logs = self.log;

/**
 * Eventually holds a constructor for Log objects. Lazily initialized, so we
 * can avoid ever referencing the real constructor except in JS binaries
 * that actually want to include the implementation.
 * @type {?Function}
 */
var logConstructor = null;

function initLogConstructor() {
  logConstructor = Log;
  // Initialize instances for use. If a binary (an extension for example) that
  // does not call `initLogConstructor` invokes `dev()` or `user()` earlier
  // than the binary that does call `initLogConstructor` (amp.js), the extension
  // will throw an error as that extension will never be able to initialize
  // the log instances and we also don't want it to call `initLogConstructor`
  // either (since that will cause the Log implementation to be bundled into that
  // binary). So we must initialize the instances eagerly so that they are
  // ready for use (stored globally) after the main binary calls
  // `initLogConstructor`.
  dev();
  user();
}

function resetLogConstructorForTesting() {
  logConstructor = null;
}

/**
 * Publisher level log.
 *
 * Enabled in the following conditions:
 *  1. Not disabled using `#log=0`.
 *  2. Development mode is enabled via `#development=1` or logging is explicitly
 *     enabled via `#log=D` where D >= 1.
 *
 * @return {!Log}
 */

function user() {
  if (logs.user) {
    return logs.user;
  }
  if (!logConstructor) {
    throw new Error('failed to call initLogConstructor');
  }
  return logs.user = new logConstructor(self, function (mode) {
    var logNum = parseInt(mode.log, 10);
    if (mode.development || logNum >= 1) {
      return LogLevel.FINE;
    }
    return LogLevel.OFF;
  }, USER_ERROR_SENTINEL);
}

/**
 * AMP development log. Calls to `devLog().assert` and `dev.fine` are stripped in
 * the PROD binary. However, `devLog().assert` result is preserved in either case.
 *
 * Enabled in the following conditions:
 *  1. Not disabled using `#log=0`.
 *  2. Logging is explicitly enabled via `#log=D`, where D >= 2.
 *
 * @return {!Log}
 */

function dev() {
  if (logs.dev) {
    return logs.dev;
  }
  if (!logConstructor) {
    throw new Error('failed to call initLogConstructor');
  }
  return logs.dev = new logConstructor(self, function (mode) {
    var logNum = parseInt(mode.log, 10);
    if (logNum >= 3) {
      return LogLevel.FINE;
    }
    if (logNum >= 2) {
      return LogLevel.INFO;
    }
    return LogLevel.OFF;
  });
}

},{"./mode":11,"./mode-object":10,"./types":16}],10:[function(require,module,exports){
exports.__esModule = true;
exports.getModeObject = getModeObject;
/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _mode = require('./mode');

/**
 * Provides info about the current app. This return value may be cached and
 * passed around as it will always be DCE'd.
 * @param {?Window=} opt_win
 * @return {!./mode.ModeDef}
 */

function getModeObject(opt_win) {
  return {
    localDev: _mode.getMode(opt_win).localDev,
    development: _mode.getMode(opt_win).development,
    filter: _mode.getMode(opt_win).filter,
    minified: _mode.getMode(opt_win).minified,
    lite: _mode.getMode(opt_win).lite,
    test: _mode.getMode(opt_win).test,
    log: _mode.getMode(opt_win).log,
    version: _mode.getMode(opt_win).version,
    rtvVersion: _mode.getMode(opt_win).rtvVersion
  };
}

},{"./mode":11}],11:[function(require,module,exports){
exports.__esModule = true;
exports.getMode = getMode;
exports.getRtvVersionForTesting = getRtvVersionForTesting;
exports.resetRtvVersionForTesting = resetRtvVersionForTesting;
/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _string = require('./string');

var _urlParseQueryString = require('./url-parse-query-string');

/**
 * @typedef {{
 *   localDev: boolean,
 *   development: boolean,
 *   filter: (string|undefined),
 *   minified: boolean,
 *   lite: boolean,
 *   test: boolean,
 *   log: (string|undefined),
 *   version: string,
 *   rtvVersion: string,
 * }}
 */
var ModeDef = undefined;

exports.ModeDef = ModeDef;
/** @type {string} */
var version = '1499663230322';

/**
 * `rtvVersion` is the prefixed version we serve off of the cdn.
 * The prefix denotes canary(00) or prod(01) or an experiment version ( > 01).
 * @type {string}
 */
var rtvVersion = '';

/**
 * A #querySelector query to see if we have any scripts with development paths.
 * @type {string}
 */
var developmentScriptQuery = 'script[src*="/dist/"],script[src*="/base/"]';

/**
 * Provides info about the current app.
 * @param {?Window=} opt_win
 * @return {!ModeDef}
 */

function getMode(opt_win) {
  var win = opt_win || self;
  if (win.AMP_MODE) {
    return win.AMP_MODE;
  }
  return win.AMP_MODE = getMode_(win);
}

/**
 * Provides info about the current app.
 * @param {!Window} win
 * @return {!ModeDef}
 */
function getMode_(win) {
  // For 3p integration code
  if (win.context && win.context.mode) {
    return win.context.mode;
  }

  // Magic constants that are replaced by closure compiler.
  // IS_MINIFIED is always replaced with true when closure compiler is used
  // while IS_DEV is only replaced when the --fortesting flag is NOT used.
  var IS_DEV = true;
  var IS_MINIFIED = false;
  var FORCE_LOCALDEV = !!(self.AMP_CONFIG && self.AMP_CONFIG.localDev);
  var AMP_CONFIG_3P_FRAME_HOST = self.AMP_CONFIG && self.AMP_CONFIG.thirdPartyFrameHost;

  var isLocalDev = IS_DEV && !!(win.location.hostname == 'localhost' || FORCE_LOCALDEV && win.location.hostname == AMP_CONFIG_3P_FRAME_HOST || win.location.ancestorOrigins && win.location.ancestorOrigins[0] && _string.startsWith(win.location.ancestorOrigins[0], 'http://localhost:')) && (
  // Filter out localhost running against a prod script.
  // Because all allowed scripts are ours, we know that these can only
  // occur during local dev.
  !win.document || !!win.document.querySelector(developmentScriptQuery));

  var hashQuery = _urlParseQueryString.parseQueryString_(
  // location.originalHash is set by the viewer when it removes the fragment
  // from the URL.
  win.location.originalHash || win.location.hash);

  var searchQuery = _urlParseQueryString.parseQueryString_(win.location.search);

  if (!rtvVersion) {
    rtvVersion = getRtvVersion(win, isLocalDev);
  }

  // The `minified`, `test` and `localDev` properties are replaced
  // as boolean literals when we run `gulp dist` without the `--fortesting`
  // flags. This improved DCE on the production file we deploy as the code
  // paths for localhost/testing/development are eliminated.
  return {
    localDev: isLocalDev,
    // Triggers validation
    development: !!(hashQuery['development'] == '1' || win.AMP_DEV_MODE),
    examiner: hashQuery['development'] == '2',
    // Allows filtering validation errors by error category. For the
    // available categories, see ErrorCategory in validator/validator.proto.
    filter: hashQuery['filter'],
    minified: IS_MINIFIED,
    // Whether document is in an amp-lite viewer. It signal that the user
    // would prefer to use less bandwidth.
    lite: searchQuery['amp_lite'] != undefined,
    test: IS_DEV && !!(win.AMP_TEST || win.__karma__),
    log: hashQuery['log'],
    version: version,
    rtvVersion: rtvVersion
  };
}

/**
 * Retrieve the `rtvVersion` which will have a numeric prefix
 * denoting canary/prod/experiment (unless `isLocalDev` is true).
 *
 * @param {!Window} win
 * @param {boolean} isLocalDev
 * @return {string}
 */
function getRtvVersion(win, isLocalDev) {
  // If it's local dev then we won't actually have a full version so
  // just use the version.
  if (isLocalDev) {
    return version;
  }

  if (win.AMP_CONFIG && win.AMP_CONFIG.v) {
    return win.AMP_CONFIG.v;
  }

  // Currently `1499663230322` and thus `mode.version` contain only
  // major version. The full version however must also carry the minor version.
  // We will default to production default `01` minor version for now.
  // TODO(erwinmombay): decide whether 1499663230322 should contain
  // minor version.
  return '01' + version;
}

/**
 * @param {!Window} win
 * @param {boolean} isLocalDev
 * @return {string}
 * @visibleForTesting
 */

function getRtvVersionForTesting(win, isLocalDev) {
  return getRtvVersion(win, isLocalDev);
}

/** @visibleForTesting */

function resetRtvVersionForTesting() {
  rtvVersion = '';
}

},{"./string":15,"./url-parse-query-string":17}],12:[function(require,module,exports){
exports.__esModule = true;
/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * This class helps to manage observers. Observers can be added, removed or
 * fired through and instance of this class.
 * @template TYPE
 */

var Observable = (function () {
  function Observable() {
    babelHelpers.classCallCheck(this, Observable);

    /** @type {?Array<function(TYPE)>} */
    this.handlers_ = null;
  }

  /**
   * Adds the observer to this instance.
   * @param {function(TYPE)} handler Observer's handler.
   * @return {!UnlistenDef}
   */

  Observable.prototype.add = function add(handler) {
    var _this = this;

    if (!this.handlers_) {
      this.handlers_ = [];
    }
    this.handlers_.push(handler);
    return function () {
      _this.remove(handler);
    };
  };

  /**
   * Removes the observer from this instance.
   * @param {function(TYPE)} handler Observer's instance.
   */

  Observable.prototype.remove = function remove(handler) {
    if (!this.handlers_) {
      return;
    }
    var index = this.handlers_.indexOf(handler);
    if (index > -1) {
      this.handlers_.splice(index, 1);
    }
  };

  /**
   * Removes all observers.
   */

  Observable.prototype.removeAll = function removeAll() {
    if (!this.handlers_) {
      return;
    }
    this.handlers_.length = 0;
  };

  /**
   * Fires an event. All observers are called.
   * @param {TYPE=} opt_event
   */

  Observable.prototype.fire = function fire(opt_event) {
    if (!this.handlers_) {
      return;
    }
    var handlers = this.handlers_;
    for (var i = 0; i < handlers.length; i++) {
      var handler = handlers[i];
      handler(opt_event);
    }
  };

  /**
   * Returns number of handlers. Mostly needed for tests.
   * @return {number}
   */

  Observable.prototype.getHandlerCount = function getHandlerCount() {
    if (!this.handlers_) {
      return 0;
    }
    return this.handlers_.length;
  };

  return Observable;
})();

exports.Observable = Observable;

},{}],13:[function(require,module,exports){
exports.__esModule = true;
exports.sign = sign;
exports.install = install;
/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Parses the number x and returns its sign. For positive x returns 1, for
 * negative, -1. For 0 and -0, returns 0 and -0 respectively. For any number
 * that parses to NaN, returns NaN.
 *
 * @param {number} x
 * @returns {number}
 */

function sign(x) {
  x = Number(x);

  // If x is 0, -0, or NaN, return it.
  if (!x) {
    return x;
  }

  return x > 0 ? 1 : -1;
}

;

/**
 * Sets the Math.sign polyfill if it does not exist.
 * @param {!Window} win
 */

function install(win) {
  if (!win.Math.sign) {
    win.Object.defineProperty(win.Math, 'sign', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: sign
    });
  }
}

},{}],14:[function(require,module,exports){
exports.__esModule = true;
exports.assign = assign;
exports.install = install;
/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Copies values of all enumerable own properties from one or more source
 * objects (provided as extended arguments to the function) to a target object.
 *
 * @param {!Object} target
 * @param {...Object} var_args
 * @returns {!Object}
 */

function assign(target, var_args) {
  if (target == null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  var output = Object(target);
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    if (source != null) {
      for (var key in source) {
        if (hasOwnProperty.call(source, key)) {
          output[key] = source[key];
        }
      }
    }
  }
  return output;
}

/**
 * Sets the Object.assign polyfill if it does not exist.
 * @param {!Window} win
 */

function install(win) {
  if (!win.Object.assign) {
    win.Object.defineProperty(win.Object, 'assign', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: assign
    });
  }
}

},{}],15:[function(require,module,exports){
exports.__esModule = true;
exports.dashToCamelCase = dashToCamelCase;
exports.dashToUnderline = dashToUnderline;
exports.endsWith = endsWith;
exports.startsWith = startsWith;
exports.expandTemplate = expandTemplate;
/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @param {string} _match
 * @param {string} character
 * @return {string}
 */
function toUpperCase(_match, character) {
  return character.toUpperCase();
}

/**
 * @param {string} name Attribute name with dashes
 * @return {string} Dashes removed and character after to upper case.
 * visibleForTesting
 */

function dashToCamelCase(name) {
  return name.replace(/-([a-z])/g, toUpperCase);
}

/**
 * @param {string} name Attribute name with dashes
 * @return {string} Dashes replaced by underlines.
 */

function dashToUnderline(name) {
  return name.replace('-', '_');
}

/**
 * Polyfill for String.prototype.endsWith.
 * @param {string} string
 * @param {string} suffix
 * @return {boolean}
 */

function endsWith(string, suffix) {
  var index = string.length - suffix.length;
  return index >= 0 && string.indexOf(suffix, index) == index;
}

/**
 * Polyfill for String.prototype.startsWith.
 * @param {string} string
 * @param {string} prefix
 * @return {boolean}
 */

function startsWith(string, prefix) {
  if (prefix.length > string.length) {
    return false;
  }
  return string.lastIndexOf(prefix, 0) == 0;
}

/**
 * Expands placeholders in a given template string with values.
 *
 * Placeholders use ${key-name} syntax and are replaced with the value
 * returned from the given getter function.
 *
 * @param {string} template The template string to expand.
 * @param {!function(string):*} getter Function used to retrieve a value for a
 *   placeholder. Returns values will be coerced into strings.
 * @param {number=} opt_maxIterations Number of times to expand the template.
 *   Defaults to 1, but should be set to a larger value your placeholder tokens
 *   can be expanded to other placeholder tokens. Take caution with large values
 *   as recursively expanding a string can be exponentially expensive.
 */

function expandTemplate(template, getter, opt_maxIterations) {
  var maxIterations = opt_maxIterations || 1;

  var _loop = function (i) {
    var matches = 0;
    template = template.replace(/\${([^}]*)}/g, function (_a, b) {
      matches++;
      return getter(b);
    });
    if (!matches) {
      return 'break';
    }
  };

  for (var i = 0; i < maxIterations; i++) {
    var _ret = _loop(i);

    if (_ret === 'break') break;
  }
  return template;
}

},{}],16:[function(require,module,exports){
exports.__esModule = true;
exports.isArray = isArray;
exports.toArray = toArray;
exports.isObject = isObject;
exports.isFiniteNumber = isFiniteNumber;
exports.isFormData = isFormData;
exports.isEnumValue = isEnumValue;
/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* @const */
var toString_ = Object.prototype.toString;

/**
 * Returns the ECMA [[Class]] of a value
 * @param {*} value
 * @return {string}
 */
function toString(value) {
  return toString_.call(value);
}

/**
 * Determines if value is actually an Array.
 * @param {*} value
 * @return {boolean}
 */

function isArray(value) {
  return Array.isArray(value);
}

/**
 * Converts an array-like object to an array.
 * @param {?IArrayLike<T>|string} arrayLike
 * @return {!Array<T>}
 * @template T
 */

function toArray(arrayLike) {
  if (!arrayLike) {
    return [];
  }
  var array = new Array(arrayLike.length);
  for (var i = 0; i < arrayLike.length; i++) {
    array[i] = arrayLike[i];
  }
  return array;
}

/**
 * Determines if value is actually an Object.
 * @param {*} value
 * @return {boolean}
 */

function isObject(value) {
  return toString(value) === '[object Object]';
}

/**
 * Determines if value is of number type and finite.
 * NaN and Infinity are not considered a finite number.
 * String numbers are not considered numbers.
 * @param {*} value
 * @return {boolean}
 */

function isFiniteNumber(value) {
  return typeof value === 'number' && isFinite(value);
}

/**
 * Determines if value is of FormData type.
 * @param {*} value
 * @return {boolean}
 */

function isFormData(value) {
  return toString(value) === '[object FormData]';
}

/**
 * Checks whether `s` is a valid value of `enumObj`.
 *
 * @param {!Object<T>} enumObj
 * @param {T} s
 * @return {boolean}
 * @template T
 */

function isEnumValue(enumObj, s) {
  for (var k in enumObj) {
    if (enumObj[k] === s) {
      return true;
    }
  }
  return false;
}

},{}],17:[function(require,module,exports){
exports.__esModule = true;
exports.parseQueryString_ = parseQueryString_;
/**
 * Copyright 2017 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var regex = /(?:^[#?]?|&)([^=&]+)(?:=([^&]*))?/g;

/**
 * Parses the query string of an URL. This method returns a simple key/value
 * map. If there are duplicate keys the latest value is returned.
 *
 * DO NOT import the function from this file. Instead, import parseQueryString
 * from `src/url.js`.
 *
 * @param {string} queryString
 * @return {!JsonObject}
 */

function parseQueryString_(queryString) {
  var params = /** @type {!JsonObject} */Object.create(null);
  if (!queryString) {
    return params;
  }

  var match = undefined;
  while (match = regex.exec(queryString)) {
    var _name = decodeURIComponent(match[1]).trim();
    var value = match[2] ? decodeURIComponent(match[2]).trim() : '';
    params[_name] = value;
  }
  return params;
}

},{}],18:[function(require,module,exports){
exports.__esModule = true;
exports.map = map;
exports.dict = dict;
exports.hasOwn = hasOwn;
exports.ownProperty = ownProperty;
exports.deepMerge = deepMerge;
/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _types = require('../types');

/* @const */
var hasOwn_ = Object.prototype.hasOwnProperty;

/**
 * Returns a map-like object.
 * If opt_initial is provided, copies its own properties into the
 * newly created object.
 * @param {T=} opt_initial This should typically be an object literal.
 * @return {T}
 * @template T
 */

function map(opt_initial) {
  var obj = Object.create(null);
  if (opt_initial) {
    Object.assign(obj, opt_initial);
  }
  return obj;
}

/**
 * Returns a `map`, and will always return a at-dict like object.
 * The JsonObject type is just a simple object that is a dict.
 * See
 * https://github.com/google/closure-compiler/wiki/@struct-and-@dict-Annotations
 * for what a dict is type-wise.
 * @param {!Object=} opt_initial
 * @return {!JsonObject}
 */

function dict(opt_initial) {
  return (/** @type {!JsonObject} */map(opt_initial)
  );
}

/**
 * Checks if the given key is a property in the map.
 *
 * @param {T}  obj a map like property.
 * @param {string}  key
 * @return {boolean}
 * @template T
 */

function hasOwn(obj, key) {
  return hasOwn_.call(obj, key);
}

/**
 * Returns obj[key] iff key is obj's own property (is not inherited).
 * Otherwise, returns undefined.
 *
 * @param {Object} obj
 * @param {string} key
 * @return {*}
 */

function ownProperty(obj, key) {
  if (hasOwn(obj, key)) {
    return obj[key];
  } else {
    return undefined;
  }
}

/**
 * @param {!Object} target
 * @param {!Object} source
 * @param {number} maxDepth The maximum depth for deep merge, beyond which
 *    Object.assign will be used.
 * @return {!Object}
 * @throws {Error} if `source` contains a circular reference
 */
function deepMerge_(target, source, maxDepth) {
  // Keep track of seen objects to prevent infinite loops on objects with
  // recursive references.
  var seen = [];
  // Traversal must be breadth-first so any object encountered for the first
  // time does not have a reference  at a shallower depth. Otherwise, a
  // circular reference found at depth == maxDepth could cause an unexpected
  // change at a shallower depth if the same object exists at a shallower depth.
  var queue = [{ target: target, source: source, depth: 0 }];

  var _loop = function () {
    var _queue$shift = queue.shift();

    var target = _queue$shift.target;
    var source = _queue$shift.source;
    var depth = _queue$shift.depth;

    if (seen.includes(source)) {
      throw new Error('Source object contains circular references');
    }
    seen.push(source);
    if (target === source) {
      return 'continue';
    }
    if (depth > maxDepth) {
      Object.assign(target, source);
      return 'continue';
    }
    Object.keys(source).forEach(function (key) {
      var newValue = source[key];
      // Perform a deep merge IFF both a and b have the same property and
      // the properties on both a and b are non-null plain objects.
      if (hasOwn(target, key)) {
        var oldValue = target[key];
        if (_types.isObject(newValue) && _types.isObject(oldValue)) {
          queue.push({ target: oldValue, source: newValue, depth: depth + 1 });
          return;
        }
      }
      target[key] = newValue;
    });
  };

  while (queue.length > 0) {
    var _ret = _loop();

    if (_ret === 'continue') continue;
  }
  return target;
}

/**
 * Deep merge object b into object a. Both a and b should only contain
 * primitives, arrays, and plain objects. For any conflicts, object b wins.
 * Arrays are replaced, not merged. Plain objects are recursively merged.
 * @param {!Object} target
 * @param {!Object} source
 * @param {number=} opt_maxDepth The maximum depth for deep merge,
 *     beyond which Object.assign will be used.
 * @return {!Object}
 * @throws {Error} if `source` contains a circular reference
 */

function deepMerge(target, source, opt_maxDepth) {
  return deepMerge_(target, source, opt_maxDepth || Number.POSITIVE_INFINITY);
}

},{"../types":16}],19:[function(require,module,exports){
(function (global){
(function (global) {
  var babelHelpers = global.babelHelpers = {};

  babelHelpers.inherits = function (subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  };

  babelHelpers.createClass = (function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();

  babelHelpers.slice = Array.prototype.slice;
  babelHelpers.bind = Function.prototype.bind;

  babelHelpers.interopRequireWildcard = function (obj) {
    if (obj && obj.__esModule) {
      return obj;
    } else {
      var newObj = {};

      if (obj != null) {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
        }
      }

      newObj["default"] = obj;
      return newObj;
    }
  };

  babelHelpers.interopRequireDefault = function (obj) {
    return obj && obj.__esModule ? obj : { "default": obj };
  };

  babelHelpers.get = function get(_x, _x2, _x3) {
    var _again = true;

    _function: while (_again) {
      var object = _x,
          property = _x2,
          receiver = _x3;
      _again = false;

      if (object === null) object = Function.prototype;
      var desc = Object.getOwnPropertyDescriptor(object, property);

      if (desc === undefined) {
        var parent = Object.getPrototypeOf(object);

        if (parent === null) {
          return undefined;
        } else {
          _x = parent;
          _x2 = property;
          _x3 = receiver;
          _again = true;
          desc = parent = undefined;
          continue _function;
        }
      } else if ("value" in desc) {
        return desc.value;
      } else {
        var getter = desc.get;

        if (getter === undefined) {
          return undefined;
        }

        return getter.call(receiver);
      }
    }
  };

  babelHelpers.classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  babelHelpers.defineProperty = function (obj, key, value) {
    obj[key] = value;
    return obj;
  };
})(typeof global === "undefined" ? self : global);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[2])

//# sourceMappingURL=ampcontext-lib.js.map