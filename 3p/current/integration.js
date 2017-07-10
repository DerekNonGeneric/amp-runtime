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

},{"../src/log":141,"../src/types":149,"../src/utils/object":152}],2:[function(require,module,exports){
exports.__esModule = true;
exports.masterSelection = masterSelection;
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

var _ampcontext = require('./ampcontext');

var _p = require('./3p');

var _srcLog = require('../src/log');

var _srcUtilsObject = require('../src/utils/object');

/**
 * Returns the "master frame" for all widgets of a given type.
 * This frame should be used to e.g. fetch scripts that can
 * be reused across frames.
 * once experiment is removed.
 * @param {!Window} win
 * @param {string} type
 * @return {!Window}
 */

function masterSelection(win, type) {
  // The master has a special name.
  var masterName = 'frame_' + type + '_master';
  var master = undefined;
  try {
    // Try to get the master from the parent. If it does not
    // exist yet we get a security exception that we catch
    // and ignore.
    master = win.parent.frames[masterName];
  } catch (expected) {
    /* ignore */
  }
  if (!master) {
    // No master yet, rename ourselves to be master. Yaihh.
    win.name = masterName;
    master = win;
  }
  return master;
}

var IntegrationAmpContext = (function (_AbstractAmpContext) {
  babelHelpers.inherits(IntegrationAmpContext, _AbstractAmpContext);

  function IntegrationAmpContext() {
    babelHelpers.classCallCheck(this, IntegrationAmpContext);

    _AbstractAmpContext.apply(this, arguments);
  }

  /** @override */

  IntegrationAmpContext.prototype.isAbstractImplementation_ = function isAbstractImplementation_() {
    return false;
  };

  /**
   * @return {boolean}
   * @protected
   */

  IntegrationAmpContext.prototype.updateDimensionsEnabled_ = function updateDimensionsEnabled_() {
    // Only make this available to selected embeds until the generic solution is
    // available.
    return this.embedType_ === 'facebook' || this.embedType_ === 'twitter' || this.embedType_ == 'github';
  };

  /** @return {!Window} */

  /** @return {!Window} */

  IntegrationAmpContext.prototype.master_ = function master_() {
    return masterSelection(this.win_, _srcLog.dev().assertString(this.embedType_));
  };

  /** @return {boolean} */

  /** @return {boolean} */

  IntegrationAmpContext.prototype.isMaster_ = function isMaster_() {
    return this.master == this.win_;
  };

  /**
   * @param {number} width
   * @param {number} height
   */

  IntegrationAmpContext.prototype.updateDimensions = function updateDimensions(width, height) {
    _srcLog.user().assert(this.updateDimensionsEnabled_(), 'Not available.');
    this.requestResize(width, height);
  };

  IntegrationAmpContext.prototype.bootstrapLoaded = function bootstrapLoaded() {
    this.client_.sendMessage('bootstrap-loaded');
  };

  /**
   * @param {!JsonObject=} opt_data Fields: width, height
   */

  IntegrationAmpContext.prototype.renderStart = function renderStart(opt_data) {
    this.client_.sendMessage('render-start', opt_data);
  };

  /**
   * Reports the "entity" that was rendered to this frame to the parent for
   * reporting purposes.
   * The entityId MUST NOT contain user data or personal identifiable
   * information. One example for an acceptable data item would be the
   * creative id of an ad, while the user's location would not be
   * acceptable.
   * TODO(alanorozco): Remove duplicate in 3p/integration.js once this
   * implementation becomes canonical.
   * @param {string} entityId See comment above for content.
   */

  IntegrationAmpContext.prototype.reportRenderedEntityIdentifier = function reportRenderedEntityIdentifier(entityId) {
    this.client_.sendMessage('entity-id', _srcUtilsObject.dict({
      'id': _srcLog.user().assertString(entityId)
    }));
  };

  /**
   * Performs a potentially asynchronous task exactly once for all frames of a
   * given type and the provide the respective value to all frames.
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

  IntegrationAmpContext.prototype.computeInMasterFrame = function computeInMasterFrame(global, taskId, work, cb) {
    _p.computeInMasterFrame(global, taskId, work, cb);
  };

  babelHelpers.createClass(IntegrationAmpContext, [{
    key: 'master',
    get: function () {
      return this.master_();
    }
  }, {
    key: 'isMaster',
    get: function () {
      return this.isMaster_();
    }
  }]);
  return IntegrationAmpContext;
})(_ampcontext.AbstractAmpContext);

exports.IntegrationAmpContext = IntegrationAmpContext;

},{"../src/log":141,"../src/utils/object":152,"./3p":1,"./ampcontext":3}],3:[function(require,module,exports){
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

},{"../src/3p-frame-messaging":137,"../src/json":140,"../src/log":141,"../src/types":149,"../src/utils/object":152,"./3p":1,"./iframe-messaging-client":7}],4:[function(require,module,exports){
exports.__esModule = true;
exports.setInViewportForTesting = setInViewportForTesting;
exports.manageWin = manageWin;
exports.installEmbedStateListener = installEmbedStateListener;
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

var _messaging = require('./messaging');

/**
 * Info about the current document/iframe.
 * @type {boolean}
 */
var inViewport = true;

/**
 * @param {boolean} inV
 */

function setInViewportForTesting(inV) {
  inViewport = inV;
}

// Active intervals. Must be global, because people clear intervals
// with clearInterval from a different window.
var intervals = {};
var intervalId = 0;

/**
 * Add instrumentation to a window and all child iframes.
 * @param {!Window} win
 */

function manageWin(win) {
  try {
    manageWin_(win);
  } catch (e) {
    // We use a try block, because the ad integrations often swallow errors.
    console. /*OK*/error(e.message, e.stack);
  }
}

/**
 * @param {!Window} win
 */
function manageWin_(win) {
  if (win.ampSeen) {
    return;
  }
  win.ampSeen = true;
  // Instrument window.
  instrumentEntryPoints(win);

  // Watch for new iframes.
  installObserver(win);
  // Existing iframes.
  maybeInstrumentsNodes(win, win.document.querySelectorAll('iframe'));
  blockSyncPopups(win);
}

/**
 * Add instrumentation code to doc.write.
 * @param {!Window} parent
 * @param {!Window} win
 */
function instrumentDocWrite(parent, win) {
  var doc = win.document;
  var close = doc.close;
  doc.close = function () {
    parent.ampManageWin = function (win) {
      manageWin(win);
    };
    if (!parent.ampSeen) {
      // .call does not work in Safari with document.write.
      doc.write('<script>window.parent.ampManageWin(window)</script>');
    }
    doc._close = close;
    return doc._close();
  };
}

/**
 * Add instrumentation code to iframe's srcdoc.
 * @param {!Window} parent
 * @param {!Element} iframe
 */
function instrumentSrcdoc(parent, iframe) {
  var srcdoc = iframe.getAttribute('srcdoc');
  parent.ampManageWin = function (win) {
    manageWin(win);
  };
  srcdoc += '<script>window.parent.ampManageWin(window)</script>';
  iframe.setAttribute('srcdoc', srcdoc);
}

/**
 * Instrument added nodes if they are instrumentable iframes.
 * @param {!Window} win
 * @param {!Array<!Node>|NodeList<!Node>|NodeList<!Element>|null} addedNodes
 */
function maybeInstrumentsNodes(win, addedNodes) {
  var _loop = function (n) {
    var node = addedNodes[n];
    try {
      if (node.tagName != 'IFRAME') {
        return 'continue';
      }
      var src = node.getAttribute('src');
      var srcdoc = node.getAttribute('srcdoc');
      if (src == null || /^(about:|javascript:)/i.test(src.trim()) || srcdoc) {
        if (node.contentWindow) {
          instrumentIframeWindow(node, win, node.contentWindow);
          node.addEventListener('load', function () {
            try {
              instrumentIframeWindow(node, win, node.contentWindow);
            } catch (e) {
              console. /*OK*/error(e.message, e.stack);
            }
          });
        } else if (srcdoc) {
          instrumentSrcdoc(parent, node);
        }
      }
    } catch (e) {
      console. /*OK*/error(e.message, e.stack);
    }
  };

  for (var n = 0; n < addedNodes.length; n++) {
    var _ret = _loop(n);

    if (_ret === 'continue') continue;
  }
}

/**
 * Installs a mutation observer in a window to look for iframes.
 * @param {!Element} node
 * @param {!Window} parent
 * @param {!Window} win
 */
function instrumentIframeWindow(node, parent, win) {
  if (win.ampSeen) {
    return;
  }
  var doc = win.document;
  instrumentDocWrite(parent, win);
  if (doc.body && doc.body.childNodes.length) {
    manageWin(win);
  }
}

/**
 * Installs a mutation observer in a window to look for iframes.
 * @param {!Window} win
 */
function installObserver(win) {
  if (!window.MutationObserver) {
    return;
  }
  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      maybeInstrumentsNodes(win, mutations[i].addedNodes);
    }
  });
  observer.observe(win.document.documentElement, {
    subtree: true,
    childList: true
  });
}

/**
 * Replace timers with variants that can be throttled.
 * @param {!Window} win
 */
function instrumentEntryPoints(win) {
  // Change setTimeout to respect a minimum timeout.
  var setTimeout = win.setTimeout;
  win.setTimeout = function (fn, time) {
    time = minTime(time);
    arguments[1] = time;
    return setTimeout.apply(this, arguments);
  };
  // Implement setInterval in terms of setTimeout to make
  // it respect the same rules
  win.setInterval = function (fn) {
    var id = intervalId++;
    var args = Array.prototype.slice.call(arguments);
    function wrapper() {
      next();
      if (typeof fn == 'string') {
        // Handle rare and dangerous string arg case.
        return (0, win.eval /*NOT OK but whatcha gonna do.*/).call(win, fn);
      } else {
        return fn.apply(this, arguments);
      }
    }
    args[0] = wrapper;
    function next() {
      intervals[id] = win.setTimeout.apply(win, args);
    }
    next();
    return id;
  };
  var clearInterval = win.clearInterval;
  win.clearInterval = function (id) {
    clearInterval(id);
    win.clearTimeout(intervals[id]);
    delete intervals[id];
  };
}

/**
 * Blackhole the legacy popups since they should never be used for anything.
 * @param {!Window} win
 */
function blockSyncPopups(win) {
  var count = 0;
  function maybeThrow() {
    // Prevent deep recursion.
    if (count++ > 2) {
      throw new Error('security error');
    }
  }
  try {
    win.alert = maybeThrow;
    win.prompt = function () {
      maybeThrow();
      return '';
    };
    win.confirm = function () {
      maybeThrow();
      return false;
    };
  } catch (e) {
    console. /*OK*/error(e.message, e.stack);
  }
}

/**
 * Calculates the minimum time that a timeout should have right now.
 * @param {number|undefined} time
 * @return {number|undefined}
 */
function minTime(time) {
  if (!inViewport) {
    time += 1000;
  }
  // Eventually this should throttle like this:
  // - for timeouts in the order of a frame use requestAnimationFrame
  //   instead.
  // - only allow about 2-4 short timeouts (< 16ms) in a 16ms time frame.
  //   Throttle further timeouts to requestAnimationFrame.
  return time;
}

function installEmbedStateListener() {
  _messaging.listenParent(window, 'embed-state', function (data) {
    inViewport = data.inViewport;
  });
}

;

},{"./messaging":9}],5:[function(require,module,exports){
exports.__esModule = true;
exports.facebook = facebook;
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

var _p = require('./3p');

var _srcLog = require('../src/log');

var _srcString = require('../src/string');

/**
 * Produces the Facebook SDK object for the passed in callback.
 *
 * Note: Facebook SDK fails to render multiple plugins when the SDK is only
 * loaded in one frame. To Allow the SDK to render them correctly we load the
 * script per iframe.
 *
 * @param {!Window} global
 * @param {function(!Object)} cb
 */
function getFacebookSdk(global, cb) {
  _p.loadScript(global, 'https://connect.facebook.net/' + _srcString.dashToUnderline(window.navigator.language) + '/sdk.js', function () {
    cb(global.FB);
  });
}

/**
 * Create DOM element for the Facebook embedded content plugin.
 * Reference: https://developers.facebook.com/docs/plugins/embedded-posts
 * @param {!Window} global
 * @param {!Object} data The element data
 * @return {!Element} div
 */
function getPostContainer(global, data) {
  var container = global.document.createElement('div');
  var embedAs = data.embedAs || 'post';
  _srcLog.user().assert(['post', 'video'].indexOf(embedAs) !== -1, 'Attribute data-embed-as  for <amp-facebook> value is wrong, should be' + ' "post" or "video" was: %s', embedAs);
  container.className = 'fb-' + embedAs;
  container.setAttribute('data-href', data.href);
  return container;
}

/**
 * Create DOM element for the Facebook comments plugin:
 * Reference: https://developers.facebook.com/docs/plugins/comments
 * @param {!Window} global
 * @param {!Object} data The element data
 * @return {!Element} div
 */
function getCommentsContainer(global, data) {
  var container = global.document.createElement('div');
  container.className = 'fb-comments';
  container.setAttribute('data-href', data.href);
  container.setAttribute('data-numposts', data.numposts || 10);
  container.setAttribute('data-colorscheme', data.colorscheme || 'light');
  container.setAttribute('data-width', '100%');
  return container;
}

/**
 * Create DOM element for the Facebook like-button plugin:
 * Reference: https://developers.facebook.com/docs/plugins/like-button
 * @param {!Window} global
 * @param {!Object} data The element data
 * @return {!Element} div
 */
function getLikeContainer(global, data) {
  var container = global.document.createElement('div');
  container.className = 'fb-like';
  container.setAttribute('data-action', data.action || 'like');
  container.setAttribute('data-colorscheme', data.colorscheme || 'light');
  container.setAttribute('data-href', data.href);
  container.setAttribute('data-kd_site', data.kd_site || 'false');
  container.setAttribute('data-layout', data.layout || 'standard');
  container.setAttribute('data-ref', data.ref || '');
  container.setAttribute('data-share', data.share || 'false');
  container.setAttribute('data-show_faces', data.show_faces || 'false');
  container.setAttribute('data-size', data.size || 'small');
  return container;
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function facebook(global, data) {
  var extension = global.context.tagName;
  var container = undefined;
  if (extension === 'AMP-FACEBOOK-LIKE') {
    container = getLikeContainer(global, data);
  } else if (extension === 'AMP-FACEBOOK-COMMENTS') {
    container = getCommentsContainer(global, data);
  } else /*AMP-FACEBOOK */{
      container = getPostContainer(global, data);
    }

  global.document.getElementById('c').appendChild(container);

  getFacebookSdk(global, function (FB) {
    // Dimensions are given by the parent frame.
    delete data.width;
    delete data.height;

    FB.Event.subscribe('xfbml.resize', function (event) {
      context.updateDimensions(parseInt(event.width, 10), parseInt(event.height, 10) + /* margins */20);
    });

    FB.init({ xfbml: true, version: 'v2.5' });
  });
}

},{"../src/log":141,"../src/string":147,"./3p":1}],6:[function(require,module,exports){
exports.__esModule = true;
exports.github = github;
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

var _p = require('./3p');

var _srcLog = require('../src/log');

/**
 * Get the correct script for the gist.
 *
 * Use writeScript: Failed to execute 'write' on 'Document': It isn't possible
 * to write into a document from an asynchronously-loaded external script unless
 * it is explicitly opened.
 *
 * @param {!Window} global
 * @param {string} scriptSource The source of the script, different for post and comment embeds.
 */
function getGistJs(global, scriptSource, cb) {
  _p.writeScript(global, scriptSource, function () {
    cb(global.gist);
  });
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function github(global, data) {
  _srcLog.user().assert(data.gistid, 'The data-gistid attribute is required for <amp-gist> %s', data.element);

  var gistUrl = 'https://gist.github.com/' + encodeURIComponent(data.gistid) + '.js';

  if (data.file) {
    gistUrl += '?file=' + encodeURIComponent(data.file);
  }

  getGistJs(global, gistUrl, function () {
    // Dimensions are given by the parent frame.
    delete data.width;
    delete data.height;
    var gistContainer = global.document.querySelector('#c .gist');

    // get all links in the embed
    var gistLinks = global.document.querySelectorAll('.gist-meta a');
    for (var i = 0; i < gistLinks.length; i++) {
      // have the links open in a new tab #8587
      gistLinks[i].target = '_BLANK';
    }

    context.updateDimensions(gistContainer. /*OK*/offsetWidth, gistContainer. /*OK*/offsetHeight);
  });
}

},{"../src/log":141,"./3p":1}],7:[function(require,module,exports){
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

},{"../src/3p-frame-messaging":137,"../src/log":141,"../src/mode":143,"../src/observable":144,"../src/utils/object":152}],8:[function(require,module,exports){
exports.__esModule = true;
exports.draw3p = draw3p;
exports.validateParentOrigin = validateParentOrigin;
exports.validateAllowedTypes = validateAllowedTypes;
exports.validateAllowedEmbeddingOrigins = validateAllowedEmbeddingOrigins;
exports.ensureFramed = ensureFramed;
exports.parseFragment = parseFragment;
exports.isTagNameAllowed = isTagNameAllowed;
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
 * @fileoverview Registers all known ad network factories and then executes
 * one of them.
 *
 * This files gets minified and published to
 * https://3p.ampproject.net/$version/f.js
 */

require('./polyfills');

var _ampcontextIntegration = require('./ampcontext-integration');

var _environment = require('./environment');

var _p = require('./3p');

var _messaging = require('./messaging');

var _srcConfig = require('../src/config');

var _srcString = require('../src/string');

var _srcJson = require('../src/json');

var _srcUrl = require('../src/url');

var _srcLog = require('../src/log');

var _srcUtilsObjectJs = require('../src/utils/object.js');

var _srcMode = require('../src/mode');

var _srcStringJs = require('../src/string.js');

// 3P - please keep in alphabetic order

var _facebook = require('./facebook');

var _github = require('./github');

var _reddit = require('./reddit');

var _twitter = require('./twitter');

// 3P Ad Networks - please keep in alphabetic order

var _ads_ping_ = require('../ads/_ping_');

var _adsA8 = require('../ads/a8');

var _adsA9 = require('../ads/a9');

var _adsAccesstrade = require('../ads/accesstrade');

var _adsAdblade = require('../ads/adblade');

var _adsAdbutler = require('../ads/adbutler');

var _adsAdform = require('../ads/adform');

var _adsAdfox = require('../ads/adfox');

var _adsAdgeneration = require('../ads/adgeneration');

var _adsAdhese = require('../ads/adhese');

var _adsAdition = require('../ads/adition');

var _adsAdman = require('../ads/adman');

var _adsAdmanmedia = require('../ads/admanmedia');

var _adsAdreactor = require('../ads/adreactor');

var _adsGoogleAdsense = require('../ads/google/adsense');

var _adsAdsnative = require('../ads/adsnative');

var _adsAdspeed = require('../ads/adspeed');

var _adsAdspirit = require('../ads/adspirit');

var _adsAdstir = require('../ads/adstir');

var _adsAdtech = require('../ads/adtech');

var _adsAdthrive = require('../ads/adthrive');

var _adsAduptech = require('../ads/aduptech');

var _adsAdverline = require('../ads/adverline');

var _adsAdverticum = require('../ads/adverticum');

var _adsAdvertserve = require('../ads/advertserve');

var _adsAffiliateb = require('../ads/affiliateb');

var _adsAmoad = require('../ads/amoad');

var _adsAppnexus = require('../ads/appnexus');

var _adsAtomx = require('../ads/atomx');

var _adsBidtellect = require('../ads/bidtellect');

var _adsBrainy = require('../ads/brainy');

var _adsBringhub = require('../ads/bringhub');

var _adsCaajainfeed = require('../ads/caajainfeed');

var _adsCapirs = require('../ads/capirs');

var _adsCaprofitx = require('../ads/caprofitx');

var _adsChargeads = require('../ads/chargeads');

var _adsColombia = require('../ads/colombia');

var _adsContentad = require('../ads/contentad');

var _adsCriteo = require('../ads/criteo');

var _adsGoogleCsa = require('../ads/google/csa');

var _adsDistroscale = require('../ads/distroscale');

var _adsEzoic = require('../ads/ezoic');

var _adsDotandads = require('../ads/dotandads');

var _adsGoogleDoubleclick = require('../ads/google/doubleclick');

var _adsEas = require('../ads/eas');

var _adsEplanning = require('../ads/eplanning');

var _adsF1e = require('../ads/f1e');

var _adsF1h = require('../ads/f1h');

var _adsFelmat = require('../ads/felmat');

var _adsFlite = require('../ads/flite');

var _adsFluct = require('../ads/fluct');

var _adsFusion = require('../ads/fusion');

var _adsGenieessp = require('../ads/genieessp');

var _adsGmossp = require('../ads/gmossp');

var _adsGumgum = require('../ads/gumgum');

var _adsHolder = require('../ads/holder');

var _adsIbillboard = require('../ads/ibillboard');

var _adsGoogleImaVideo = require('../ads/google/imaVideo');

var _adsImedia = require('../ads/imedia');

var _adsImobile = require('../ads/imobile');

var _adsImprovedigital = require('../ads/improvedigital');

var _adsInmobi = require('../ads/inmobi');

var _adsIx = require('../ads/ix');

var _adsKargo = require('../ads/kargo');

var _adsKiosked = require('../ads/kiosked');

var _adsKixer = require('../ads/kixer');

var _adsLigatus = require('../ads/ligatus');

var _adsLoka = require('../ads/loka');

var _adsMads = require('../ads/mads');

var _adsMantis = require('../ads/mantis');

var _adsMediaimpact = require('../ads/mediaimpact');

var _adsMedianet = require('../ads/medianet');

var _adsMediavine = require('../ads/mediavine');

var _adsMeg = require('../ads/meg');

var _adsMicroad = require('../ads/microad');

var _adsMixpo = require('../ads/mixpo');

var _adsMywidget = require('../ads/mywidget');

var _adsNativo = require('../ads/nativo');

var _adsNavegg = require('../ads/navegg');

var _adsNend = require('../ads/nend');

var _adsNetletix = require('../ads/netletix');

var _adsNokta = require('../ads/nokta');

var _adsOpenadstream = require('../ads/openadstream');

var _adsOpenx = require('../ads/openx');

var _adsOutbrain = require('../ads/outbrain');

var _adsPlista = require('../ads/plista');

var _adsPolymorphicads = require('../ads/polymorphicads');

var _adsPopin = require('../ads/popin');

var _adsPubmatic = require('../ads/pubmatic');

var _adsPubmine = require('../ads/pubmine');

var _adsPulsepoint = require('../ads/pulsepoint');

var _adsPurch = require('../ads/purch');

var _adsRevcontent = require('../ads/revcontent');

var _adsRelap = require('../ads/relap');

var _adsRubicon = require('../ads/rubicon');

var _adsSharethrough = require('../ads/sharethrough');

var _adsSklik = require('../ads/sklik');

var _adsSlimcutmedia = require('../ads/slimcutmedia');

var _adsSmartadserver = require('../ads/smartadserver');

var _adsSmartclip = require('../ads/smartclip');

var _adsSortable = require('../ads/sortable');

var _adsSovrn = require('../ads/sovrn');

var _adsSpotx = require('../ads/spotx');

var _adsSunmedia = require('../ads/sunmedia');

var _adsSwoop = require('../ads/swoop');

var _adsTaboola = require('../ads/taboola');

var _adsTeads = require('../ads/teads');

var _adsTriplelift = require('../ads/triplelift');

var _adsValuecommerce = require('../ads/valuecommerce');

var _adsWebediads = require('../ads/webediads');

var _adsWeborama = require('../ads/weborama');

var _adsWidespace = require('../ads/widespace');

var _adsXlift = require('../ads/xlift');

var _adsYahoo = require('../ads/yahoo');

var _adsYahoojp = require('../ads/yahoojp');

var _adsYandex = require('../ads/yandex');

var _adsYieldbot = require('../ads/yieldbot');

var _adsYieldmo = require('../ads/yieldmo');

var _adsYieldone = require('../ads/yieldone');

var _adsZedo = require('../ads/zedo');

var _adsZergnet = require('../ads/zergnet');

var _adsZucks = require('../ads/zucks');

/**
 * Whether the embed type may be used with amp-embed tag.
 * @const {!Object<string, boolean>}
 */
var AMP_EMBED_ALLOWED = {
  _ping_: true,
  bringhub: true,
  'mantis-recommend': true,
  mywidget: true,
  outbrain: true,
  plista: true,
  smartclip: true,
  taboola: true,
  zergnet: true
};

/** @const {!JsonObject} */
var FALLBACK_CONTEXT_DATA = _srcUtilsObjectJs.dict({
  '_context': _srcUtilsObjectJs.dict()
});

// Need to cache iframeName as it will be potentially overwritten by
// masterSelection, as per below.
var iframeName = window.name;
var data = getData(iframeName);

window.context = data['_context'];

// This should only be invoked after window.context is set
_srcLog.initLogConstructor();
_srcLog.setReportError(console.error.bind(console));

// Experiment toggles
_p.setExperimentToggles(window.context.experimentToggles);
delete window.context.experimentToggles;

if (_srcMode.getMode().test || _srcMode.getMode().localDev) {
  _p.register('_ping_', _ads_ping_._ping_);
}

// Keep the list in alphabetic order
_p.register('a8', _adsA8.a8);
_p.register('a9', _adsA9.a9);
_p.register('accesstrade', _adsAccesstrade.accesstrade);
_p.register('adblade', _adsAdblade.adblade);
_p.register('adbutler', _adsAdbutler.adbutler);
_p.register('adform', _adsAdform.adform);
_p.register('adfox', _adsAdfox.adfox);
_p.register('adgeneration', _adsAdgeneration.adgeneration);
_p.register('adhese', _adsAdhese.adhese);
_p.register('adition', _adsAdition.adition);
_p.register('adman', _adsAdman.adman);
_p.register('admanmedia', _adsAdmanmedia.admanmedia);
_p.register('adreactor', _adsAdreactor.adreactor);
_p.register('adsense', _adsGoogleAdsense.adsense);
_p.register('adsnative', _adsAdsnative.adsnative);
_p.register('adspeed', _adsAdspeed.adspeed);
_p.register('adspirit', _adsAdspirit.adspirit);
_p.register('adstir', _adsAdstir.adstir);
_p.register('adtech', _adsAdtech.adtech);
_p.register('adthrive', _adsAdthrive.adthrive);
_p.register('aduptech', _adsAduptech.aduptech);
_p.register('adverline', _adsAdverline.adverline);
_p.register('adverticum', _adsAdverticum.adverticum);
_p.register('advertserve', _adsAdvertserve.advertserve);
_p.register('affiliateb', _adsAffiliateb.affiliateb);
_p.register('amoad', _adsAmoad.amoad);
_p.register('appnexus', _adsAppnexus.appnexus);
_p.register('atomx', _adsAtomx.atomx);
_p.register('bidtellect', _adsBidtellect.bidtellect);
_p.register('brainy', _adsBrainy.brainy);
_p.register('bringhub', _adsBringhub.bringhub);
_p.register('caajainfeed', _adsCaajainfeed.caajainfeed);
_p.register('capirs', _adsCapirs.capirs);
_p.register('caprofitx', _adsCaprofitx.caprofitx);
_p.register('chargeads', _adsChargeads.chargeads);
_p.register('colombia', _adsColombia.colombia);
_p.register('contentad', _adsContentad.contentad);
_p.register('criteo', _adsCriteo.criteo);
_p.register('csa', _adsGoogleCsa.csa);
_p.register('distroscale', _adsDistroscale.distroscale);
_p.register('dotandads', _adsDotandads.dotandads);
_p.register('doubleclick', _adsGoogleDoubleclick.doubleclick);
_p.register('eas', _adsEas.eas);
_p.register('eplanning', _adsEplanning.eplanning);
_p.register('ezoic', _adsEzoic.ezoic);
_p.register('f1e', _adsF1e.f1e);
_p.register('f1h', _adsF1h.f1h);
_p.register('facebook', _facebook.facebook);
_p.register('felmat', _adsFelmat.felmat);
_p.register('flite', _adsFlite.flite);
_p.register('fluct', _adsFluct.fluct);
_p.register('fusion', _adsFusion.fusion);
_p.register('genieessp', _adsGenieessp.genieessp);
_p.register('github', _github.github);
_p.register('gmossp', _adsGmossp.gmossp);
_p.register('gumgum', _adsGumgum.gumgum);
_p.register('holder', _adsHolder.holder);
_p.register('ibillboard', _adsIbillboard.ibillboard);
_p.register('ima-video', _adsGoogleImaVideo.imaVideo);
_p.register('imedia', _adsImedia.imedia);
_p.register('imobile', _adsImobile.imobile);
_p.register('improvedigital', _adsImprovedigital.improvedigital);
_p.register('industrybrains', _adsAdblade.industrybrains);
_p.register('inmobi', _adsInmobi.inmobi);
_p.register('ix', _adsIx.ix);
_p.register('kargo', _adsKargo.kargo);
_p.register('kiosked', _adsKiosked.kiosked);
_p.register('kixer', _adsKixer.kixer);
_p.register('ligatus', _adsLigatus.ligatus);
_p.register('loka', _adsLoka.loka);
_p.register('mads', _adsMads.mads);
_p.register('mantis-display', _adsMantis.mantisDisplay);
_p.register('mantis-recommend', _adsMantis.mantisRecommend);
_p.register('mediaimpact', _adsMediaimpact.mediaimpact);
_p.register('medianet', _adsMedianet.medianet);
_p.register('mediavine', _adsMediavine.mediavine);
_p.register('meg', _adsMeg.meg);
_p.register('microad', _adsMicroad.microad);
_p.register('mixpo', _adsMixpo.mixpo);
_p.register('mywidget', _adsMywidget.mywidget);
_p.register('nativo', _adsNativo.nativo);
_p.register('navegg', _adsNavegg.navegg);
_p.register('nend', _adsNend.nend);
_p.register('netletix', _adsNetletix.netletix);
_p.register('nokta', _adsNokta.nokta);
_p.register('openadstream', _adsOpenadstream.openadstream);
_p.register('openx', _adsOpenx.openx);
_p.register('outbrain', _adsOutbrain.outbrain);
_p.register('plista', _adsPlista.plista);
_p.register('polymorphicads', _adsPolymorphicads.polymorphicads);
_p.register('popin', _adsPopin.popin);
_p.register('pubmatic', _adsPubmatic.pubmatic);
_p.register('pubmine', _adsPubmine.pubmine);
_p.register('pulsepoint', _adsPulsepoint.pulsepoint);
_p.register('purch', _adsPurch.purch);
_p.register('reddit', _reddit.reddit);
_p.register('relap', _adsRelap.relap);
_p.register('revcontent', _adsRevcontent.revcontent);
_p.register('rubicon', _adsRubicon.rubicon);
_p.register('sharethrough', _adsSharethrough.sharethrough);
_p.register('sklik', _adsSklik.sklik);
_p.register('slimcutmedia', _adsSlimcutmedia.slimcutmedia);
_p.register('smartadserver', _adsSmartadserver.smartadserver);
_p.register('smartclip', _adsSmartclip.smartclip);
_p.register('sortable', _adsSortable.sortable);
_p.register('sovrn', _adsSovrn.sovrn);
_p.register('spotx', _adsSpotx.spotx);
_p.register('sunmedia', _adsSunmedia.sunmedia);
_p.register('swoop', _adsSwoop.swoop);
_p.register('taboola', _adsTaboola.taboola);
_p.register('teads', _adsTeads.teads);
_p.register('triplelift', _adsTriplelift.triplelift);
_p.register('twitter', _twitter.twitter);
_p.register('valuecommerce', _adsValuecommerce.valuecommerce);
_p.register('webediads', _adsWebediads.webediads);
_p.register('weborama-display', _adsWeborama.weboramaDisplay);
_p.register('widespace', _adsWidespace.widespace);
_p.register('xlift', _adsXlift.xlift);
_p.register('yahoo', _adsYahoo.yahoo);
_p.register('yahoojp', _adsYahoojp.yahoojp);
_p.register('yandex', _adsYandex.yandex);
_p.register('yieldbot', _adsYieldbot.yieldbot);
_p.register('yieldmo', _adsYieldmo.yieldmo);
_p.register('zergnet', _adsZergnet.zergnet);
_p.register('yieldone', _adsYieldone.yieldone);
_p.register('zedo', _adsZedo.zedo);
_p.register('zucks', _adsZucks.zucks);

// For backward compat, we always allow these types without the iframe
// opting in.
var defaultAllowedTypesInCustomFrame = [
// Entries must be reasonably safe and not allow overriding the injected
// JS URL.
// Each custom iframe can override this through the second argument to
// draw3p. See amp-ad docs.
'facebook', 'twitter', 'doubleclick', 'yieldbot', '_ping_'];

/**
 * Gets data encoded in iframe name attribute.
 * @return {!JsonObject}
 */
function getData(iframeName) {
  try {
    // TODO(bradfrizzell@): Change the data structure of the attributes
    //    to make it less terrible.
    return _srcJson.parseJson(iframeName)['attributes'];
  } catch (err) {
    if (!_srcMode.getMode().test) {
      _srcLog.dev().info('INTEGRATION', 'Could not parse context from:', iframeName);
    }
    return FALLBACK_CONTEXT_DATA;
  }
}

/**
 * Visible for testing.
 * Draws a 3p embed to the window. Expects the data to include the 3p type.
 * @param {!Window} win
 * @param {!Object} data
 * @param {function(!Object, function(!Object))|undefined} configCallback
 *     Optional callback that allows user code to manipulate the incoming
 *     configuration. See
 *     https://github.com/ampproject/amphtml/issues/1210 for some context
 *     on this.
 */

function draw3p(win, data, configCallback) {
  var type = data.type;

  _srcLog.user().assert(isTagNameAllowed(data.type, win.context.tagName), 'Embed type %s not allowed with tag %s', data.type, win.context.tagName);
  if (configCallback) {
    configCallback(data, function (data) {
      _srcLog.user().assert(data, 'Expected configuration to be passed as first argument');
      _p.run(type, win, data);
    });
  } else {
    _p.run(type, win, data);
  }
}

;

/**
 * @return {boolean} Whether this is the master iframe.
 */
function isMaster() {
  return window.context.master == window;
}

/**
 * Draws an embed, optionally synchronously, to the DOM.
 * @param {function(!Object, function(!Object))} opt_configCallback If provided
 *     will be invoked with two arguments:
 *     1. The configuration parameters supplied to this embed.
 *     2. A callback that MUST be called for rendering to proceed. It takes
 *        no arguments. Configuration is expected to be modified in-place.
 * @param {!Array<string>=} opt_allowed3pTypes List of advertising network
 *     types you expect.
 * @param {!Array<string>=} opt_allowedEmbeddingOrigins List of domain suffixes
 *     that are allowed to embed this frame.
 */
window.draw3p = function (opt_configCallback, opt_allowed3pTypes, opt_allowedEmbeddingOrigins) {
  try {
    var _location = _srcUrl.parseUrl(data['_context']['location']['href']);

    ensureFramed(window);
    validateParentOrigin(window, _location);
    validateAllowedTypes(window, data['type'], opt_allowed3pTypes);
    if (opt_allowedEmbeddingOrigins) {
      validateAllowedEmbeddingOrigins(window, opt_allowedEmbeddingOrigins);
    }
    installContext(window);
    delete data['_context'];
    _environment.manageWin(window);
    _environment.installEmbedStateListener();
    draw3p(window, data, opt_configCallback);

    if (isAmpContextExperimentOn()) {
      window.context.bootstrapLoaded();
    } else {
      updateVisibilityState(window);

      // Subscribe to page visibility updates.
      _messaging.nonSensitiveDataPostMessage('send-embed-state');
      _messaging.nonSensitiveDataPostMessage('bootstrap-loaded');
    }
  } catch (e) {
    var c = window.context || { mode: { test: false } };
    if (!c.mode.test) {
      lightweightErrorReport(e, c.canary);
      throw e;
    }
  }
};

/** @return {boolean} */
function isAmpContextExperimentOn() {
  return _p.isExperimentOn('3p-use-ampcontext');
}

/**
 * Installs window.context API.
 * @param {!Window} win
 */
function installContext(win) {
  if (isAmpContextExperimentOn()) {
    installContextUsingExperimentalImpl(win);
    return;
  }

  installContextUsingStandardImpl(win);
}

/**
 * Installs window.context API.
 * @param {!Window} win
 */
function installContextUsingExperimentalImpl(win) {
  win.context = new _ampcontextIntegration.IntegrationAmpContext(win);
}

/**
 * Installs window.context using standard (to be deprecated) implementation.
 * @param {!Window} win
 */
function installContextUsingStandardImpl(win) {
  // Define master related properties to be lazily read.
  Object.defineProperties(win.context, {
    master: {
      get: function () {
        return _ampcontextIntegration.masterSelection(win, data['type']);
      }
    },
    isMaster: {
      get: isMaster
    }
  });

  win.context.data = data;
  win.context.location = _srcUrl.parseUrl(data['_context']['location']['href']);
  win.context.noContentAvailable = triggerNoContentAvailable;
  win.context.requestResize = triggerResizeRequest;
  win.context.renderStart = triggerRenderStart;

  var type = data['type'];
  if (type === 'facebook' || type === 'twitter' || type === 'github') {
    // Only make this available to selected embeds until the
    // generic solution is available.
    win.context.updateDimensions = triggerDimensions;
  }

  // This only actually works for ads.
  var initialIntersection = win.context.initialIntersection;
  win.context.observeIntersection = function (cb) {
    var unlisten = observeIntersection(cb);
    // Call the callback with the value that was transmitted when the
    // iframe was drawn. Called in nextTick, so that callers don't
    // have to specially handle the sync case.
    _p.nextTick(win, function () {
      return cb([initialIntersection]);
    });
    return unlisten;
  };
  win.context.onResizeSuccess = onResizeSuccess;
  win.context.onResizeDenied = onResizeDenied;
  win.context.reportRenderedEntityIdentifier = reportRenderedEntityIdentifier;
  win.context.computeInMasterFrame = _p.computeInMasterFrame;
  win.context.addContextToIframe = function (iframe) {
    iframe.name = iframeName;
  };
  win.context.getHtml = getHtml;
}

function triggerNoContentAvailable() {
  _messaging.nonSensitiveDataPostMessage('no-content');
}

function triggerDimensions(width, height) {
  _messaging.nonSensitiveDataPostMessage('embed-size', _srcUtilsObjectJs.dict({
    'width': width,
    'height': height
  }));
}

function triggerResizeRequest(width, height) {
  _messaging.nonSensitiveDataPostMessage('embed-size', _srcUtilsObjectJs.dict({
    'width': width,
    'height': height
  }));
}

/**
 * @param {!JsonObject=} opt_data fields: width, height
 */
function triggerRenderStart(opt_data) {
  _messaging.nonSensitiveDataPostMessage('render-start', opt_data);
}

/**
 * Id for getHtml postMessage.
 * @type {!number}
 */
var currentMessageId = 0;

/**
 * See readme for window.context.getHtml
 * @param {!string} selector - CSS selector of the node to take content from
 * @param {!Array<string>} attributes - tag attributes to be left in the stringified HTML
 * @param {!Function} callback
 */
function getHtml(selector, attributes, callback) {
  var messageId = currentMessageId++;
  _messaging.nonSensitiveDataPostMessage('get-html', _srcUtilsObjectJs.dict({
    'selector': selector,
    'attributes': attributes,
    'messageId': messageId
  }));

  var unlisten = _messaging.listenParent(window, 'get-html-result', function (data) {
    if (data.messageId === messageId) {
      callback(data.content);
      unlisten();
    }
  });
}

/**
 * Registers a callback for intersections of this iframe with the current
 * viewport.
 * The passed in array has entries that aim to be compatible with
 * the IntersectionObserver spec callback.
 * http://rawgit.com/slightlyoff/IntersectionObserver/master/index.html#callbackdef-intersectionobservercallback
 * @param {function(!Array<IntersectionObserverEntry>)} observerCallback
 * @returns {!function()} A function which removes the event listener that
 *    observes for intersection messages.
 */
function observeIntersection(observerCallback) {
  // Send request to received records.
  _messaging.nonSensitiveDataPostMessage('send-intersections');
  return _messaging.listenParent(window, 'intersection', function (data) {
    observerCallback(data.changes);
  });
}

/**
 * Listens for events via postMessage and updates `context.hidden` based on
 * it and forwards the event to a custom event called `amp:visibilitychange`.
 * @param {!Window} global
 */
function updateVisibilityState(global) {
  _messaging.listenParent(window, 'embed-state', function (data) {
    global.context.hidden = data.pageHidden;
    dispatchVisibilityChangeEvent(global, data.pageHidden);
  });
}

function dispatchVisibilityChangeEvent(win, isHidden) {
  var event = win.document.createEvent('Event');
  event.data = { hidden: isHidden };
  event.initEvent('amp:visibilitychange', true, true);
  win.dispatchEvent(event);
}

/**
 * Registers a callback for communicating when a resize request succeeds.
 * @param {function(number, number)} observerCallback
 * @returns {!function()} A function which removes the event listener that
 *    observes for resize status messages.
 */
function onResizeSuccess(observerCallback) {
  return _messaging.listenParent(window, 'embed-size-changed', function (data) {
    observerCallback(data.requestedHeight, data.requestedWidth);
  });
}

/**
 * Registers a callback for communicating when a resize request is denied.
 * @param {function(number, number)} observerCallback
 * @returns {!function()} A function which removes the event listener that
 *    observes for resize status messages.
 */
function onResizeDenied(observerCallback) {
  return _messaging.listenParent(window, 'embed-size-denied', function (data) {
    observerCallback(data.requestedHeight, data.requestedWidth);
  });
}

/**
 * Reports the "entity" that was rendered to this frame to the parent for
 * reporting purposes.
 * The entityId MUST NOT contain user data or personal identifiable
 * information. One example for an acceptable data item would be the
 * creative id of an ad, while the user's location would not be
 * acceptable.
 * @param {string} entityId See comment above for content.
 */
function reportRenderedEntityIdentifier(entityId) {
  _srcLog.user().assert(typeof entityId == 'string', 'entityId should be a string %s', entityId);
  _messaging.nonSensitiveDataPostMessage('entity-id', _srcUtilsObjectJs.dict({
    'id': entityId
  }));
}

/**
 * Throws if the current frame's parent origin is not equal to
 * the claimed origin.
 * Only check for browsers that support ancestorOrigins
 * @param {!Window} window
 * @param {!Location} parentLocation
 * @visibleForTesting
 */

function validateParentOrigin(window, parentLocation) {
  var ancestors = window.location.ancestorOrigins;
  // Currently only webkit and blink based browsers support
  // ancestorOrigins. In that case we proceed but mark the origin
  // as non-validated.
  if (!ancestors || !ancestors.length) {
    return;
  }
  _srcLog.user().assert(ancestors[0] == parentLocation.origin, 'Parent origin mismatch: %s, %s', ancestors[0], parentLocation.origin);
}

/**
 * Check that this iframe intended this particular ad type to run.
 * @param {!Window} window
 * @param {string} type 3p type
 * @param {!Array<string>|undefined} allowedTypes May be undefined.
 * @visibleForTesting
 */

function validateAllowedTypes(window, type, allowedTypes) {
  var thirdPartyHost = _srcUrl.parseUrl(_srcConfig.urls.thirdParty).hostname;

  // Everything allowed in default iframe.
  if (window.location.hostname == thirdPartyHost) {
    return;
  }
  if (_srcConfig.urls.thirdPartyFrameRegex.test(window.location.hostname)) {
    return;
  }
  if (window.location.hostname == 'ads.localhost') {
    return;
  }
  if (defaultAllowedTypesInCustomFrame.indexOf(type) != -1) {
    return;
  }
  _srcLog.user().assert(allowedTypes && allowedTypes.indexOf(type) != -1, 'Non-whitelisted 3p type for custom iframe: ' + type);
}

/**
 * Check that parent host name was whitelisted.
 * @param {!Window} window
 * @param {!Array<string>} allowedHostnames Suffixes of allowed host names.
 * @visibleForTesting
 */

function validateAllowedEmbeddingOrigins(window, allowedHostnames) {
  if (!window.document.referrer) {
    throw new Error('Referrer expected: ' + window.location.href);
  }
  var ancestors = window.location.ancestorOrigins;
  // We prefer the unforgable ancestorOrigins, but referrer is better than
  // nothing.
  var ancestor = ancestors ? ancestors[0] : window.document.referrer;
  var hostname = _srcUrl.parseUrl(ancestor).hostname;
  if (_srcUrl.isProxyOrigin(ancestor)) {
    // If we are on the cache domain, parse the source hostname from
    // the referrer. The referrer is used because it should be
    // trustable.
    hostname = _srcUrl.parseUrl(_srcUrl.getSourceUrl(window.document.referrer)).hostname;
  }
  for (var i = 0; i < allowedHostnames.length; i++) {
    // Either the hostname is exactly as whitelisted…
    if (allowedHostnames[i] == hostname) {
      return;
    }
    // Or it ends in .$hostname (aka is a sub domain of the whitelisted domain.
    if (_srcString.endsWith(hostname, '.' + allowedHostnames[i])) {
      return;
    }
  }
  throw new Error('Invalid embedding hostname: ' + hostname + ' not in ' + allowedHostnames);
}

/**
 * Throws if this window is a top level window.
 * @param {!Window} window
 * @visibleForTesting
 */

function ensureFramed(window) {
  if (window == window.parent) {
    throw new Error('Must be framed: ' + window.location.href);
  }
}

/**
 * Expects the fragment to contain JSON.
 * @param {string} fragment Value of location.fragment
 * @return {?JsonObject}
 * @visibleForTesting
 */

function parseFragment(fragment) {
  try {
    var json = fragment.substr(1);
    // Some browser, notably Firefox produce an encoded version of the fragment
    // while most don't. Since we know how the string should start, this is easy
    // to detect.
    if (_srcStringJs.startsWith(json, '{%22')) {
      json = decodeURIComponent(json);
    }
    return (/** @type {!JsonObject} */json ? _srcJson.parseJson(json) : _srcUtilsObjectJs.dict()
    );
  } catch (err) {
    return null;
  }
}

/**
 * Not all types of embeds are allowed to be used with all tag names on the
 * AMP side. This function checks whether the current usage is permissible.
 * @param {string} type
 * @param {string|undefined} tagName The tagName that was used to embed this
 *     3p-frame.
 * @return {boolean}
 */

function isTagNameAllowed(type, tagName) {
  if (tagName == 'AMP-EMBED') {
    return !!AMP_EMBED_ALLOWED[type];
  }
  return true;
}

/**
 * Reports an error to the server. Must only be called once per page.
 * Not for use in event handlers.
 *
 * We don't use the default error in error.js handler because it has
 * too many deps for this small JS binary.
 *
 * @param {!Error} e
 * @param {boolean} isCanary
 */
function lightweightErrorReport(e, isCanary) {
  new Image().src = _srcConfig.urls.errorReporting + '?3p=1&v=' + encodeURIComponent('1499663230322') + '&m=' + encodeURIComponent(e.message) + '&ca=' + (isCanary ? 1 : 0) + '&r=' + encodeURIComponent(document.referrer) + '&s=' + encodeURIComponent(e.stack || '');
}

},{"../ads/_ping_":13,"../ads/a8":14,"../ads/a9":15,"../ads/accesstrade":16,"../ads/adblade":17,"../ads/adbutler":18,"../ads/adform":19,"../ads/adfox":20,"../ads/adgeneration":21,"../ads/adhese":22,"../ads/adition":23,"../ads/adman":24,"../ads/admanmedia":25,"../ads/adreactor":26,"../ads/adsnative":27,"../ads/adspeed":28,"../ads/adspirit":29,"../ads/adstir":30,"../ads/adtech":31,"../ads/adthrive":32,"../ads/aduptech":33,"../ads/adverline":34,"../ads/adverticum":35,"../ads/advertserve":36,"../ads/affiliateb":37,"../ads/amoad":38,"../ads/appnexus":39,"../ads/atomx":40,"../ads/bidtellect":41,"../ads/brainy":42,"../ads/bringhub":43,"../ads/caajainfeed":44,"../ads/capirs":45,"../ads/caprofitx":46,"../ads/chargeads":47,"../ads/colombia":48,"../ads/contentad":49,"../ads/criteo":50,"../ads/distroscale":51,"../ads/dotandads":52,"../ads/eas":53,"../ads/eplanning":54,"../ads/ezoic":55,"../ads/f1e":56,"../ads/f1h":57,"../ads/felmat":58,"../ads/flite":59,"../ads/fluct":60,"../ads/fusion":61,"../ads/genieessp":62,"../ads/gmossp":63,"../ads/google/adsense":64,"../ads/google/csa":66,"../ads/google/doubleclick":67,"../ads/google/imaVideo":68,"../ads/gumgum":70,"../ads/holder":71,"../ads/ibillboard":72,"../ads/imedia":73,"../ads/imobile":74,"../ads/improvedigital":75,"../ads/inmobi":76,"../ads/ix":77,"../ads/kargo":78,"../ads/kiosked":79,"../ads/kixer":80,"../ads/ligatus":81,"../ads/loka":82,"../ads/mads":83,"../ads/mantis":84,"../ads/mediaimpact":85,"../ads/medianet":86,"../ads/mediavine":87,"../ads/meg":88,"../ads/microad":89,"../ads/mixpo":90,"../ads/mywidget":91,"../ads/nativo":92,"../ads/navegg":93,"../ads/nend":94,"../ads/netletix":95,"../ads/nokta":96,"../ads/openadstream":97,"../ads/openx":98,"../ads/outbrain":99,"../ads/plista":100,"../ads/polymorphicads":101,"../ads/popin":102,"../ads/pubmatic":103,"../ads/pubmine":104,"../ads/pulsepoint":105,"../ads/purch":106,"../ads/relap":107,"../ads/revcontent":108,"../ads/rubicon":109,"../ads/sharethrough":110,"../ads/sklik":111,"../ads/slimcutmedia":112,"../ads/smartadserver":113,"../ads/smartclip":114,"../ads/sortable":115,"../ads/sovrn":116,"../ads/spotx":117,"../ads/sunmedia":118,"../ads/swoop":119,"../ads/taboola":120,"../ads/teads":121,"../ads/triplelift":122,"../ads/valuecommerce":123,"../ads/webediads":124,"../ads/weborama":125,"../ads/widespace":126,"../ads/xlift":127,"../ads/yahoo":128,"../ads/yahoojp":129,"../ads/yandex":130,"../ads/yieldbot":131,"../ads/yieldmo":132,"../ads/yieldone":133,"../ads/zedo":134,"../ads/zergnet":135,"../ads/zucks":136,"../src/config":138,"../src/json":140,"../src/log":141,"../src/mode":143,"../src/string":147,"../src/string.js":147,"../src/url":151,"../src/utils/object.js":152,"./3p":1,"./ampcontext-integration":2,"./environment":4,"./facebook":5,"./github":6,"./messaging":9,"./polyfills":10,"./reddit":11,"./twitter":12}],9:[function(require,module,exports){
exports.__esModule = true;
exports.nonSensitiveDataPostMessage = nonSensitiveDataPostMessage;
exports.listenParent = listenParent;
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

var _srcJson = require('../src/json');

/**
 * Send messages to parent frame. These should not contain user data.
 * @param {string} type Type of messages
 * @param {!JsonObject=} opt_object Data for the message.
 */

function nonSensitiveDataPostMessage(type, opt_object) {
  if (window.parent == window) {
    return; // Nothing to do.
  }
  var object = opt_object || /** @type {JsonObject} */{};
  object['type'] = type;
  object['sentinel'] = window.context.sentinel;
  window.parent. /*OK*/postMessage(object, window.context.location.origin);
}

/**
 * Message event listeners.
 * @const {!Array<{type: string, cb: function(!Object)}>}
 */
var listeners = [];

/**
 * Listen to message events from document frame.
 * @param {!Window} win
 * @param {string} type Type of messages
 * @param {function(*)} callback Called with data payload of message.
 * @return {function()} function to unlisten for messages.
 */

function listenParent(win, type, callback) {
  var listener = {
    type: type,
    cb: callback
  };
  listeners.push(listener);
  startListening(win);
  return function () {
    var index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

/**
 * Listens for message events and dispatches to listeners registered
 * via listenParent.
 * @param {!Window} win
 */
function startListening(win) {
  if (win.AMP_LISTENING) {
    return;
  }
  win.AMP_LISTENING = true;
  win.addEventListener('message', function (event) {
    // Cheap operations first, so we don't parse JSON unless we have to.
    if (event.source != win.parent || event.origin != win.context.location.origin || typeof event.data != 'string' || event.data.indexOf('amp-') != 0) {
      return;
    }
    // Parse JSON only once per message.
    var data = _srcJson.parseJson(event.data.substr(4));
    if (win.context.sentinel && data['sentinel'] != win.context.sentinel) {
      return;
    }
    // Don't let other message handlers interpret our events.
    if (event.stopImmediatePropagation) {
      event.stopImmediatePropagation();
    }
    // Find all the listeners for this type.
    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i].type != data['type']) {
        continue;
      }
      var cb = listeners[i].cb;
      try {
        cb(data);
      } catch (e) {
        // Do not interrupt execution.
        setTimeout(function () {
          throw e;
        });
      }
    }
  });
}

},{"../src/json":140}],10:[function(require,module,exports){
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

},{"../src/polyfills/math-sign":145,"../src/polyfills/object-assign":146,"../third_party/babel/custom-babel-helpers":153}],11:[function(require,module,exports){
exports.__esModule = true;
exports.reddit = reddit;
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

var _p = require('./3p');

/**
 * Get the correct script for the container.
 * @param {!Window} global
 * @param {string} scriptSource The source of the script, different for post and comment embeds.
 */
function getContainerScript(global, scriptSource) {
  _p.loadScript(global, scriptSource, function () {});
}

/**
 * Embedly looks for a blockquote with a '-card' suffixed class.
 * @param {!Window} global
 * @return {!Element} blockquote
 */
function getPostContainer(global) {
  var blockquote = global.document.createElement('blockquote');
  blockquote.classList.add('reddit-card');
  blockquote.setAttribute('data-card-created', Math.floor(Date.now() / 1000));
  return blockquote;
}

/**
 * @param {!Window} global
 * @param {!Object} data The element data
 * @return {!Element} div
 */
function getCommentContainer(global, data) {
  var div = global.document.createElement('div');
  div.classList.add('reddit-embed');
  div.setAttribute('data-embed-media', 'www.redditmedia.com');
  // 'uuid' and 'created' are provided by the embed script, but don't seem
  // to actually be needed. Account for them, but let them default to undefined.
  div.setAttribute('data-embed-uuid', data.uuid);
  div.setAttribute('data-embed-created', data.embedcreated);
  div.setAttribute('data-embed-parent', data.embedparent || 'false');
  div.setAttribute('data-embed-live', data.embedlive || 'false');

  return div;
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function reddit(global, data) {
  var embedtype = data.embedtype || 'post';

  var container = undefined;
  var scriptSource = '';

  // Post and comment embeds are handled totally differently.
  if (embedtype === 'post') {
    container = getPostContainer(global);
    scriptSource = 'https://embed.redditmedia.com/widgets/platform.js';
  } else if (embedtype === 'comment') {
    container = getCommentContainer(global, data);
    scriptSource = 'https://www.redditstatic.com/comment-embed.js';
  }

  var link = global.document.createElement('a');
  link.href = data.src;

  container.appendChild(link);
  global.document.getElementById('c').appendChild(container);

  getContainerScript(global, scriptSource);
}

},{"./3p":1}],12:[function(require,module,exports){
exports.__esModule = true;
exports.twitter = twitter;
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

// TODO(malteubl) Move somewhere else since this is not an ad.

var _p = require('./3p');

var _srcStyle = require('../src/style');

/**
 * Produces the Twitter API object for the passed in callback. If the current
 * frame is the master frame it makes a new one by injecting the respective
 * script, otherwise it schedules the callback for the script from the master
 * window.
 * @param {!Window} global
 * @param {function(!Object)} cb
 */
function getTwttr(global, cb) {
  _p.loadScript(global, 'https://platform.twitter.com/widgets.js', function () {
    cb(global.twttr);
  });
  // Temporarily disabled the code sharing between frames.
  // The iframe throttling implemented in modern browsers can break with this,
  // because things may execute in frames that are currently throttled, even
  // though they are needed in the main frame.
  // See https://github.com/ampproject/amphtml/issues/3220
  //
  // computeInMasterFrame(global, 'twttrCbs', done => {
  //  loadScript(global, 'https://platform.twitter.com/widgets.js', () => {
  //    done(global.twttr);
  //  });
  //}, cb);
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function twitter(global, data) {
  var tweet = global.document.createElement('div');
  tweet.id = 'tweet';
  _srcStyle.setStyles(tweet, {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });
  global.document.getElementById('c').appendChild(tweet);
  getTwttr(global, function (twttr) {
    // Dimensions are given by the parent frame.
    delete data.width;
    delete data.height;

    var twitterWidgetSandbox = undefined;
    twttr.events.bind('resize', function (event) {
      // To be safe, make sure the resize event was triggered for the widget we created below.
      if (twitterWidgetSandbox === event.target) {
        resize(twitterWidgetSandbox);
      }
    });

    twttr.widgets.createTweet(data.tweetid, tweet, data). /*OK*/then(function (el) {
      if (el) {
        // Not a deleted tweet
        twitterWidgetSandbox = el;
        resize(twitterWidgetSandbox);
      }
    });
  });

  function resize(container) {
    var height = container. /*OK*/offsetHeight;
    // 0 height is always wrong and we should get another resize request
    // later.
    if (height == 0) {
      return;
    }
    context.updateDimensions(container. /*OK*/offsetWidth, height + /* margins */20);
  }
}

},{"../src/style":148,"./3p":1}],13:[function(require,module,exports){
exports.__esModule = true;
exports._ping_ = _ping_;
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

var _p3p = require('../3p/3p');

var _srcLog = require('../src/log');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function _ping_(global, data) {
  _p3p.validateData(data, [], ['valid', 'adHeight', 'adWidth', 'enableIo', 'url']);
  global.document.getElementById('c').textContent = data.ping;
  global.ping = Object.create(null);

  global.context.onResizeSuccess(function () {
    global.ping.resizeSuccess = true;
  });

  global.context.onResizeDenied(function () {
    global.ping.resizeSuccess = false;
  });

  if (data.ad_container) {
    _srcLog.dev().assert(global.context.container == data.ad_container, 'wrong container');
  }
  if (data.valid && data.valid == 'true') {
    var img = document.createElement('img');
    if (data.url) {
      img.setAttribute('src', data.url);
      img.setAttribute('width', data.width);
      img.setAttribute('height', data.height);
    }
    var width = undefined,
        height = undefined;
    if (data.adHeight) {
      img.setAttribute('height', data.adHeight);
      height = Number(data.adHeight);
    }
    if (data.adWidth) {
      img.setAttribute('width', data.adWidth);
      width = Number(data.adWidth);
    }
    document.body.appendChild(img);
    if (width || height) {
      global.context.renderStart({ width: width, height: height });
    } else {
      global.context.renderStart();
    }
    if (data.enableIo) {
      global.context.observeIntersection(function (changes) {
        changes.forEach(function (c) {
          _srcLog.dev().info('AMP-AD', 'Intersection: (WxH)' + (c.intersectionRect.width + 'x' + c.intersectionRect.height));
        });
        // store changes to global.lastIO for testing purpose
        global.ping.lastIO = changes[changes.length - 1];
      });
    }
  } else {
    global.setTimeout(function () {
      global.context.noContentAvailable();
    }, 1000);
  }
}

},{"../3p/3p":1,"../src/log":141}],14:[function(require,module,exports){
exports.__esModule = true;
exports.a8 = a8;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function a8(global, data) {
  _p3p.validateData(data, ['aid'], ['wid', 'eno', 'mid', 'mat', 'type']);
  global.a8Param = data;
  _p3p.writeScript(global, 'https://statics.a8.net/amp/ad.js');
}

},{"../3p/3p":1}],15:[function(require,module,exports){
exports.__esModule = true;
exports.a9 = a9;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function a9(global, data) {
  // TODO: check mandatory fields
  _p3p.validateData(data, [], ['aax_size', 'aax_pubname', 'aax_src']);
  /*eslint "google-camelcase/google-camelcase": 0*/
  global.aax_size = data.aax_size;
  global.aax_pubname = data.aax_pubname;
  global.aax_src = data.aax_src;
  _p3p.writeScript(global, 'https://c.amazon-adsystem.com/aax2/assoc.js');
}

},{"../3p/3p":1}],16:[function(require,module,exports){
exports.__esModule = true;
exports.accesstrade = accesstrade;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function accesstrade(global, data) {
  _p3p.validateData(data, ['atops', 'atrotid']);
  global.atParams = data;
  _p3p.writeScript(global, 'https://h.accesstrade.net/js/amp/amp.js');
}

},{"../3p/3p":1}],17:[function(require,module,exports){
exports.__esModule = true;
exports.adblade = adblade;
exports.industrybrains = industrybrains;
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

var _p3p = require('../3p/3p');

var adbladeFields = ['width', 'height', 'cid'];
var adbladeHostname = 'web.adblade.com';
var industrybrainsHostname = 'web.industrybrains.com';

function addAdiantUnit(hostname, global, data) {
  _p3p.validateData(data, adbladeFields, []);

  // create a data element so our script knows what to do
  var ins = global.document.createElement('ins');
  ins.setAttribute('class', 'adbladeads');
  ins.setAttribute('data-width', data.width);
  ins.setAttribute('data-height', data.height);
  ins.setAttribute('data-cid', data.cid);
  ins.setAttribute('data-host', hostname);
  ins.setAttribute('data-protocol', 'https');
  ins.setAttribute('data-tag-type', 1);
  global.document.getElementById('c').appendChild(ins);

  ins.parentNode.addEventListener('eventAdbladeRenderStart', global.context.renderStart());

  // run our JavaScript code to display the ad unit
  _p3p.writeScript(global, 'https://' + hostname + '/js/ads/async/show.js');
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adblade(global, data) {
  addAdiantUnit(adbladeHostname, global, data);
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function industrybrains(global, data) {
  addAdiantUnit(industrybrainsHostname, global, data);
}

},{"../3p/3p":1}],18:[function(require,module,exports){
exports.__esModule = true;
exports.adbutler = adbutler;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adbutler(global, data) {
  _p3p.validateData(data, ['account', 'zone', 'width', 'height'], ['keyword', 'place']);

  data['place'] = data['place'] || 0;

  var placeholderID = 'placement_' + data['zone'] + '_' + data['place'];

  // placeholder div
  var d = global.document.createElement('div');
  d.setAttribute('id', placeholderID);
  global.document.getElementById('c').appendChild(d);

  global.AdButler = global.AdButler || {};
  global.AdButler.ads = global.AdButler.ads || [];

  global.AdButler.ads.push({
    handler: function (opt) {
      global.AdButler.register(data['account'], data['zone'], [data['width'], data['height']], placeholderID, opt);
    },
    opt: {
      place: data['place'],
      pageKey: global.context.pageViewId,
      keywords: data['keyword'],
      domain: 'servedbyadbutler.com',
      click: 'CLICK_MACRO_PLACEHOLDER'
    }
  });
  _p3p.loadScript(global, 'https://servedbyadbutler.com/app.js');
}

},{"../3p/3p":1}],19:[function(require,module,exports){
exports.__esModule = true;
exports.adform = adform;
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

var _p3p = require('../3p/3p');

// Valid adform ad source hosts
var hosts = {
  track: 'https://track.adform.net',
  adx: 'https://adx.adform.net',
  a2: 'https://a2.adform.net',
  adx2: 'https://adx2.adform.net',
  asia: 'https://asia.adform.net',
  adx3: 'https://adx3.adform.net'
};

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adform(global, data) {
  _p3p.validateData(data, [['src', 'bn', 'mid']]);
  global.Adform = { ampData: data };
  var src = data.src;
  var bn = data.bn;
  var mid = data.mid;
  var url = undefined;

  // Custom ad url using "data-src" attribute
  if (src) {
    _p3p.validateSrcPrefix(Object.keys(hosts).map(function (type) {
      return hosts[type];
    }), src);
    url = src;
  }
  // Ad tag using "data-bn" attribute
  else if (bn) {
      url = hosts.track + '/adfscript/?bn=' + encodeURIComponent(bn) + ';msrc=1';
    }
    // Ad placement using "data-mid" attribute
    else if (mid) {
        url = hosts.adx + '/adx/?mid=' + encodeURIComponent(mid);
      }

  _p3p.writeScript(global, url);
}

},{"../3p/3p":1}],20:[function(require,module,exports){
exports.__esModule = true;
exports.adfox = adfox;
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

var _p3p = require('../3p/3p');

var _yandex = require('./yandex');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adfox(global, data) {
  _p3p.validateData(data, ['adfoxParams', 'ownerId']);
  _p3p.loadScript(global, 'https://yastatic.net/pcode/adfox/loader.js', function () {
    return initAdFox(global, data);
  });
}

/**
 * @param {!Window} global
 * @param {Object} data
 */
function initAdFox(global, data) {
  var params = JSON.parse(data.adfoxParams);
  var container = global.document.createElement('div');

  container.setAttribute('id', 'adfox_container');
  global.document.getElementById('c').appendChild(container);

  global.Ya.adfoxCode.create({
    ownerId: data.ownerId,
    containerId: 'adfox_container',
    params: params,
    onLoad: function (data) {
      return checkLoading(global, data);
    },
    onRender: function () {
      return global.context.renderStart();
    },
    onError: function () {
      return global.context.noContentAvailable();
    },
    onStub: function () {
      return global.context.noContentAvailable();
    }
  });
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */
function checkLoading(global, data) {
  if (data.bundleName === 'banner.direct') {
    var dblParams = {
      blockId: data.bundleParams.blockId,
      data: data.bundleParams.data,
      isAdfox: true
    };

    _yandex.yandex(global, dblParams);
    return false;
  }
}

},{"../3p/3p":1,"./yandex":130}],21:[function(require,module,exports){
exports.__esModule = true;
exports.adgeneration = adgeneration;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adgeneration(global, data) {
  _p3p.validateData(data, ['id'], ['targetid', 'displayid', 'adtype', 'async', 'option']);

  // URL encoding
  var option = data.option ? encodeQueryValue(data.option) : null;

  var url = 'https://i.socdm.com/sdk/js/adg-script-loader.js?' + 'id=' + encodeURIComponent(data.id) + '&width=' + encodeURIComponent(data.width) + '&height=' + encodeURIComponent(data.height) + '&adType=' + (data.adtype ? encodeURIComponent(data.adtype.toUpperCase()) : 'FREE') + '&async=' + (data.async ? encodeURIComponent(data.async.toLowerCase()) : 'false') + '&displayid=' + (data.displayid ? encodeURIComponent(data.displayid) : '1') + '&tagver=2.0.0' + (data.targetid ? '&targetID=' + encodeURIComponent(data.targetid) : '') + (option ? '&' + option : '');

  if (data.async && data.async.toLowerCase() === 'true') {
    _p3p.loadScript(global, url);
  } else {
    _p3p.writeScript(global, url);
  }
}

/**
 * URL encoding of query string
 * @param {!String} str
 */
function encodeQueryValue(str) {
  return str.split('&').map(function (v) {
    var key = v.split('=')[0],
        val = v.split('=')[1];
    return encodeURIComponent(key) + '=' + encodeURIComponent(val);
  }).join('&');
}

},{"../3p/3p":1}],22:[function(require,module,exports){
(function (global){
exports.__esModule = true;
exports.adhese = adhese;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adhese(global, data) {
  _p3p.validateData(data, ['location', 'format', 'account', 'requestType']);
  var targetParam = '';
  if (data['targeting']) {
    var targetList = data['targeting'];
    for (var category in targetList) {
      targetParam += encodeURIComponent(category);
      var targets = targetList[category];
      for (var x = 0; x < targets.length; x++) {
        targetParam += encodeURIComponent(targets[x]) + (targets.length - 1 > x ? ';' : '');
      }
      targetParam += '/';
    }
  }
  targetParam += '?t=' + Date.now();
  _p3p.writeScript(window, 'https://ads-' + encodeURIComponent(data['account']) + '.adhese.com/' + encodeURIComponent(data['requestType']) + '/sl' + encodeURIComponent(data['location']) + encodeURIComponent(data['position']) + '-' + encodeURIComponent(data['format']) + '/' + targetParam);
  var co = global.document.querySelector('#c');
  co.width = data['width'];
  co.height = data['height'];
  co.addEventListener('adhLoaded', getAdInfo, false);
}

/**
 * @param {!Object} e
 */
function getAdInfo(e) {
  if (e.detail.isReady && e.detail.width == e.target.width && e.detail.height == e.target.height) {
    global.context.renderStart();
  } else if (e.detail.isReady && (e.detail.width != e.target.width || e.detail.width != e.target.width)) {
    global.context.renderStart({ width: e.detail.width,
      height: e.detail.height });
  } else {
    global.context.noContentAvailable();
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../3p/3p":1}],23:[function(require,module,exports){
exports.__esModule = true;
exports.adition = adition;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adition(global, data) {
  _p3p.validateData(data, ['version']);
  global.data = data;
  _p3p.writeScript(global, 'https://imagesrv.adition.com/js/amp/v' + encodeURIComponent(data['version']) + '.js');
}

},{"../3p/3p":1}],24:[function(require,module,exports){
exports.__esModule = true;
exports.adman = adman;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adman(global, data) {
  _p3p.validateData(data, ['ws', 'host', 's'], []);

  var script = global.document.createElement('script');
  script.setAttribute('data-ws', data.ws);
  script.setAttribute('data-h', data.host);
  script.setAttribute('data-s', data.s);
  script.setAttribute('data-tech', 'amp');

  script.src = 'https://static.adman.gr/adman.js';

  global.document.body.appendChild(script);
}

},{"../3p/3p":1}],25:[function(require,module,exports){
exports.__esModule = true;
exports.admanmedia = admanmedia;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function admanmedia(global, data) {
  _p3p.validateData(data, ['id']);

  var encodedId = encodeURIComponent(data.id);
  _p3p.loadScript(global, 'https://mona.admanmedia.com/go?id=' + encodedId, function () {
    var pattern = 'script[src$="id=' + encodedId + '"]';
    var scriptTag = global.document.querySelector(pattern);
    scriptTag.setAttribute('id', 'hybs-' + encodedId);
    global.context.renderStart();
  }, function () {
    global.context.noContentAvailable();
  });
}

},{"../3p/3p":1}],26:[function(require,module,exports){
exports.__esModule = true;
exports.adreactor = adreactor;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adreactor(global, data) {
  // TODO: check mandatory fields
  _p3p.validateData(data, [], ['zid', 'pid', 'custom3']);
  var url = 'https://adserver.adreactor.com' + '/servlet/view/banner/javascript/zone?' + 'zid=' + encodeURIComponent(data.zid) + '&pid=' + encodeURIComponent(data.pid) + '&custom3=' + encodeURIComponent(data.custom3) + '&random=' + Math.floor(89999999 * Math.random() + 10000000) + '&millis=' + Date.now();
  _p3p.writeScript(global, url);
}

},{"../3p/3p":1}],27:[function(require,module,exports){
exports.__esModule = true;
exports.adsnative = adsnative;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adsnative(global, data) {
  try {
    _p3p.validateData(data, ['anapiid'], ['ankv', 'ancat', 'antid']);
  } catch (e) {
    _p3p.validateData(data, ['annid', 'anwid'], ['ankv', 'ancat', 'antid']);
  }

  // convert string to object
  var actualkv = undefined;
  if (data.ankv) {
    actualkv = {};
    var arraykv = data.ankv.split(',');
    for (var k in arraykv) {
      var kv = arraykv[k].split(':');
      actualkv[kv.pop()] = kv.pop();
    }
  }

  // convert string to array
  var actualcat = data.ancat ? data.ancat.split(',') : undefined;

  // populate settings
  global._AdsNativeOpts = {
    apiKey: data.anapiid,
    networkKey: data.annid,
    nativeAdElementId: 'adsnative_ampad',
    currentPageUrl: global.context.location.href,
    widgetId: data.anwid,
    templateKey: data.antid,
    categories: actualcat,
    keyValues: actualkv,
    amp: true
  };

  // drop ad placeholder div
  var ad = global.document.createElement('div');
  var ampwrapper = global.document.getElementById('c');
  ad.id = global._AdsNativeOpts.nativeAdElementId;
  ampwrapper.appendChild(ad);

  // load renderjs
  _p3p.writeScript(global, 'https://static.adsnative.com/static/js/render.v1.js');
}

},{"../3p/3p":1}],28:[function(require,module,exports){
exports.__esModule = true;
exports.adspeed = adspeed;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adspeed(global, data) {
  _p3p.validateData(data, ['zone', 'client']);

  var url = 'https://g.adspeed.net/ad.php?do=amphtml&zid=' + data.zone + '&oid=' + data.client + '&cb=' + Math.random();

  _p3p.writeScript(global, url);
}

},{"../3p/3p":1}],29:[function(require,module,exports){
exports.__esModule = true;
exports.adspirit = adspirit;
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

var _p3p = require('../3p/3p');

var _srcStyle = require('../src/style');

/**
  * @param {!Window} global
  * @param {!Object} data
  */

function adspirit(global, data) {
  // TODO: check mandatory fields
  _p3p.validateData(data, [], ['asmParams', 'asmHost']);
  var i = global.document.createElement('ins');
  i.setAttribute('data-asm-params', data['asmParams']);
  i.setAttribute('data-asm-host', data['asmHost']);
  i.setAttribute('class', 'asm_async_creative');
  _srcStyle.setStyles(i, {
    display: 'inline-block',
    'text-align': 'left'
  });
  global.document.getElementById('c').appendChild(i);
  var s = global.document.createElement('script');
  s.src = 'https://' + data['asmHost'] + '/adasync.js';
  global.document.body.appendChild(s);
}

},{"../3p/3p":1,"../src/style":148}],30:[function(require,module,exports){
exports.__esModule = true;
exports.adstir = adstir;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adstir(global, data) {
  // TODO: check mandatory fields
  _p3p.validateData(data, [], ['appId', 'adSpot']);

  var v = '4.0';

  var d = global.document.createElement('div');
  d.setAttribute('class', 'adstir-ad-async');
  d.setAttribute('data-ver', v);
  d.setAttribute('data-app-id', data['appId']);
  d.setAttribute('data-ad-spot', data['adSpot']);
  d.setAttribute('data-amp', true);
  d.setAttribute('data-origin', global.context.location.href);
  global.document.getElementById('c').appendChild(d);

  _p3p.loadScript(global, 'https://js.ad-stir.com/js/adstir_async.js');
}

},{"../3p/3p":1}],31:[function(require,module,exports){
exports.__esModule = true;
exports.adtech = adtech;
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

var _p3p = require('../3p/3p');

function adtech(global, data) {
  var adsrc = data.src;
  if (typeof adsrc != 'undefined') {
    _p3p.validateSrcPrefix('https:', adsrc);
    _p3p.validateSrcContains('/addyn/', adsrc);
    _p3p.writeScript(global, adsrc);
  } else {
    _p3p.validateData(data, ['atwmn', 'atwdiv'], ['atwco', 'atwheight', 'atwhtnmat', 'atwmoat', 'atwnetid', 'atwothat', 'atwplid', 'atwpolar', 'atwsizes', 'atwwidth']);
    global.atwco = data.atwco;
    global.atwdiv = data.atwdiv;
    global.atwheight = data.atwheight;
    global.atwhtnmat = data.atwhtnmat;
    global.atwmn = data.atwmn;
    global.atwmoat = data.atwmoat;
    global.atwnetid = data.atwnetid;
    global.atwothat = data.atwothat;
    global.atwplid = data.atwplid;
    global.atwpolar = data.atwpolar;
    global.atwsizes = data.atwsizes;
    global.atwwidth = data.atwwidth;
    _p3p.writeScript(global, 'https://s.aolcdn.com/os/ads/adsWrapper3.js');
  }
}

},{"../3p/3p":1}],32:[function(require,module,exports){
exports.__esModule = true;
exports.adthrive = adthrive;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adthrive(global, data) {
  _p3p.validateData(data, ['siteId', 'adUnit'], ['sizes']);
  _p3p.loadScript(global, 'https://ads.adthrive.com/sites/' + encodeURIComponent(data.siteId) + '/amp.min.js');
}

},{"../3p/3p":1}],33:[function(require,module,exports){
exports.__esModule = true;
exports.aduptech = aduptech;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function aduptech(global, data) {
  var elementId = 'aduptech';

  _p3p.validateData(data, ['placementkey'], ['query', 'mincpc', 'adtest']);

  // add id attriubte to given container (required)
  global.document.getElementById('c').setAttribute('id', elementId);

  // load aduptech js api
  _p3p.loadScript(global, 'https://s.d.adup-tech.com/jsapi', function () {

    // force responsive ads for amp
    data.responsive = true;

    // ads callback => render start
    //
    // NOTE: Not using "data.onAds = global.context.renderStart;"
    //       because the "onAds()" callback returns our API object
    //       as first parameter which will cause errors
    data.onAds = function () {
      global.context.renderStart();
    };

    // no ads callback => noContentAvailable
    data.onNoAds = global.context.noContentAvailable;

    // embed iframe
    global.uAd.embed(elementId, data);
  });
}

},{"../3p/3p":1}],34:[function(require,module,exports){
exports.__esModule = true;
exports.adverline = adverline;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adverline(global, data) {
  _p3p.validateData(data, ['id', 'plc'], ['s', 'section']);

  _p3p.writeScript(global, 'https://ads.adverline.com/richmedias/amp.js');
}

},{"../3p/3p":1}],35:[function(require,module,exports){
exports.__esModule = true;
exports.adverticum = adverticum;
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

var _p3p = require('../3p/3p');

var _srcStyle = require('../src/style');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function adverticum(global, data) {
  _p3p.validateData(data, ['goa3zone'], ['costumetargetstring']);
  var zoneid = 'zone' + data['goa3zone'];
  var d = global.document.createElement('div');

  d.id = zoneid;
  d.classList.add('goAdverticum');

  document.getElementById('c').appendChild(d);
  if (data['costumetargetstring']) {
    var s = global.document.createTextNode(data['costumetargetstring']);
    var v = global.document.createElement('var');
    v.setAttribute('id', 'cT');
    v.setAttribute('class', 'customtarget');
    _srcStyle.setStyle(v, 'display', 'none');
    v.appendChild(s);
    document.getElementById(zoneid).appendChild(v);
  }
  _p3p.writeScript(global, '//ad.adverticum.net/g3.js');
}

},{"../3p/3p":1,"../src/style":148}],36:[function(require,module,exports){
exports.__esModule = true;
exports.advertserve = advertserve;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function advertserve(global, data) {
  _p3p.validateData(data, [], ['zid', 'pid', 'client']);

  var url = 'https://' + data.client + '.advertserve.com' + '/servlet/view/banner/javascript/zone?amp=true' + '&zid=' + encodeURIComponent(data.zid) + '&pid=' + encodeURIComponent(data.pid) + '&random=' + Math.floor(89999999 * Math.random() + 10000000) + '&millis=' + Date.now();

  _p3p.writeScript(global, url);
}

},{"../3p/3p":1}],37:[function(require,module,exports){
exports.__esModule = true;
exports.affiliateb = affiliateb;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function affiliateb(global, data) {
  _p3p.validateData(data, ['afb_a', 'afb_p', 'afb_t']);
  global.afbParam = data;
  _p3p.writeScript(global, 'https://track.affiliate-b.com/amp/a.js');
}

},{"../3p/3p":1}],38:[function(require,module,exports){
exports.__esModule = true;
exports.amoad = amoad;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function amoad(global, data) {
  _p3p.validateData(data, ['sid'], ['adType']);

  var script = undefined;
  var attrs = {};
  if (data['adType'] === 'native') {
    script = 'https://j.amoad.com/js/n.js';
    attrs['class'] = 'amoad_native';
    attrs['data-sid'] = data.sid;
  } else {
    script = 'https://j.amoad.com/js/a.js';
    attrs['class'] = 'amoad_frame sid_' + data.sid + ' container_div sp';
  }
  global.amoadOption = { ampData: data };

  var d = global.document.createElement('div');
  Object.keys(attrs).forEach(function (k) {
    d.setAttribute(k, attrs[k]);
  });
  global.document.getElementById('c').appendChild(d);

  _p3p.loadScript(global, script);
}

},{"../3p/3p":1}],39:[function(require,module,exports){
exports.__esModule = true;
exports.appnexus = appnexus;
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

var _p3p = require('../3p/3p');

var APPNEXUS_AST_URL = 'https://acdn.adnxs.com/ast/ast.js';

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function appnexus(global, data) {
  var args = [];
  args.push('size=' + data.width + 'x' + data.height);
  if (data.tagid) {
    _p3p.validateData(data, ['tagid']);
    args.push('id=' + encodeURIComponent(data.tagid));
    _p3p.writeScript(global, constructTtj(args));
    return;
  } else if (data.member && data.code) {
    _p3p.validateData(data, ['member', 'code']);
    args.push('member=' + encodeURIComponent(data.member));
    args.push('inv_code=' + encodeURIComponent(data.code));
    _p3p.writeScript(global, constructTtj(args));
    return;
  }

  /**
   * Construct the TTJ URL. Note params should be properly encoded first (use encodeURIComponent);
   * @param  {!Array<string>} args query string params to add to the base URL.
   * @return {string}      Formated TTJ URL.
   */
  function constructTtj(args) {
    var url = 'https://ib.adnxs.com/ttj?';
    for (var i = 0; i < args.length; i++) {
      //append arg to query. Please encode arg first.
      url += args[i] + '&';
    }

    return url;
  }

  appnexusAst(global, data);
}

function appnexusAst(global, data) {
  _p3p.validateData(data, ['adUnits']);
  var apntag = undefined;
  if (context.isMaster) {
    // in case we are in the master iframe, we load AST
    context.master.apntag = context.master.apntag || {};
    context.master.apntag.anq = context.master.apntag.anq || [];
    apntag = context.master.apntag;

    apntag.anq.push(function () {
      if (data.pageOpts) {
        apntag.anq.push(function () {
          //output console information
          apntag.debug = data.debug || false;
          apntag.setPageOpts(data.pageOpts);
        });
      }

      data.adUnits.forEach(function (adUnit) {
        apntag.defineTag(adUnit);
      });
    });
    _p3p.loadScript(global, APPNEXUS_AST_URL, function () {
      apntag.anq.push(function () {
        apntag.loadTags();
        apntag.initialRequestMade = true;
      });
    });
  }

  var div = global.document.createElement('div');
  div.setAttribute('id', data.target);
  var divContainer = global.document.getElementById('c');
  if (divContainer) {
    divContainer.appendChild(div);
  }

  if (!apntag) {
    apntag = context.master.apntag;

    //preserve a global reference
    global.apntag = context.master.apntag;
  }

  apntag.anq.push(function () {
    if (!apntag.initialRequestMade) {
      apntag.onEvent('adAvailable', data.target, function () {
        apntag.showTag(data.target, global.window);
      });
    } else {
      apntag.showTag(data.target, global.window);
    }

    apntag.onEvent('adNoBid', data.target, function () {
      context.noContentAvailable();
    });
  });
}

},{"../3p/3p":1}],40:[function(require,module,exports){
exports.__esModule = true;
exports.atomx = atomx;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function atomx(global, data) {
  var optionals = ['click', 'uv1', 'uv2', 'uv3', 'context'];

  _p3p.validateData(data, ['id'], optionals);

  var args = ['size=' + data.width + 'x' + data.height, 'id=' + encodeURIComponent(data.id)];

  for (var i = 0; i < optionals.length; i++) {
    var optional = optionals[i];
    if (optional in data) {
      args.push(optional + '=' + encodeURIComponent(data[optional]));
    }
  }

  _p3p.writeScript(global, 'https://s.ato.mx/p.js#' + args.join('&'));
}

},{"../3p/3p":1}],41:[function(require,module,exports){
exports.__esModule = true;
exports.bidtellect = bidtellect;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function bidtellect(global, data) {
  var requiredParams = ['t', 'pid', 'sid'];
  var optionalParams = ['sname', 'pubid', 'pubname', 'renderid', 'bestrender', 'autoplay', 'playbutton', 'videotypeid', 'videocloseicon', 'targetid', 'bustframe'];
  _p3p.validateData(data, requiredParams, optionalParams);
  var params = '?t=' + encodeURIComponent(data.t);
  params += '&pid=' + encodeURIComponent(data.pid);
  params += '&sid=' + encodeURIComponent(data.sid);
  if (data.width) {
    params += '&w=' + encodeURIComponent(data.width);
  }
  if (data.height) {
    params += '&h=' + encodeURIComponent(data.height);
  }
  optionalParams.forEach(function (param) {
    if (data[param]) {
      params += '&' + param + '=' + encodeURIComponent(data[param]);
    }
  });
  var url = 'https://cdn.bttrack.com/js/infeed/2.0/infeed.min.js' + params;
  _p3p.writeScript(global, url);
}

},{"../3p/3p":1}],42:[function(require,module,exports){
exports.__esModule = true;
exports.brainy = brainy;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function brainy(global, data) {

  _p3p.validateData(data, [], ['aid', 'slotId']);

  var url = 'https://proparm.jp/ssp/p/js1' + '?_aid=' + encodeURIComponent(data['aid']) + '&amp;_slot=' + encodeURIComponent(data['slotId']);

  _p3p.writeScript(global, url);
}

},{"../3p/3p":1}],43:[function(require,module,exports){
exports.__esModule = true;
exports.bringhub = bringhub;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function bringhub(global, data) {
  global._bringhub = global._bringhub || {
    viewId: global.context.pageViewId,
    htmlURL: data['htmlurl'] || global.context.canonicalUrl,
    ampURL: data['ampurl'] || global.context.sourceUrl,
    referrer: data['referrer'] || global.context.referrer
  };

  _p3p.writeScript(global, 'https://static.bh-cdn.com/msf/amp-loader.js?v=' + Date.now(), function () {
    _p3p.loadScript(global, 'https://static.bh-cdn.com/msf/amp-widget.js?v=' + global._bringhub.hash);
  });
}

},{"../3p/3p":1}],44:[function(require,module,exports){
exports.__esModule = true;
exports.caajainfeed = caajainfeed;
/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function caajainfeed(global, data) {

  _p3p.validateData(data, [], ['adSpot', 'format', 'test', 'optout', 'offset', 'ipv4', 'ipv6', 'networkReachability', 'osName', 'osVersion', 'osLang', 'osTimezone', 'deviceVersion', 'appId', 'appVersion', 'kv', 'uids', 'template', 'protocol', 'fields']);

  global.caAjaInfeedConfig = data;
  _p3p.loadScript(global, 'https://cdn.amanad.adtdp.com/sdk/ajaamp.js');
}

},{"../3p/3p":1}],45:[function(require,module,exports){
exports.__esModule = true;
exports.capirs = capirs;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function capirs(global, data) {
  _p3p.validateData(data, ['begunAutoPad', 'begunBlockId']);

  global['begun_callbacks'] = {
    lib: {
      init: function () {
        var block = global.document.createElement('div');
        block.id = 'x-' + Math.round(Math.random() * 1e8).toString(36);
        document.body.appendChild(block);

        global['Adf']['banner']['ssp'](block.id, data['params'], {
          'begun-auto-pad': data['begunAutoPad'],
          'begun-block-id': data['begunBlockId']
        });
      }
    },
    block: {
      draw: function (feed) {
        var banner = feed['banners']['graph'][0];
        window.context.renderStart({
          width: banner['width'],
          height: banner['height']
        });
        var reportId = 'capirs-' + banner['banner_id'];
        window.context.reportRenderedEntityIdentifier(reportId);
      },
      unexist: window.context.noContentAvailable
    }
  };

  _p3p.loadScript(global, '//ssp.rambler.ru/lpdid.js');
  _p3p.loadScript(global, '//ssp.rambler.ru/capirs_async.js');
}

},{"../3p/3p":1}],46:[function(require,module,exports){
exports.__esModule = true;
exports.caprofitx = caprofitx;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function caprofitx(global, data) {
  _p3p.validateData(data, ['tagid'], []);

  global.caprofitxConfig = data;
  _p3p.loadScript(global, 'https://cdn.caprofitx.com/tags/amp/profitx_amp.js');
}

},{"../3p/3p":1}],47:[function(require,module,exports){
exports.__esModule = true;
exports.chargeads = chargeads;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function chargeads(global, data) {
  var src = data.src;
  _p3p.validateSrcPrefix('https://www.chargeplatform.com/', src);
  _p3p.writeScript(global, src);
}

},{"../3p/3p":1}],48:[function(require,module,exports){
exports.__esModule = true;
exports.colombia = colombia;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function colombia(global, data) {
  _p3p.validateData(data, ['clmb_slot', 'clmb_position', 'clmb_section', 'clmb_divid', 'loadingStrategy']);
  // push the two object into the '_colombia' global
  (global._colombia = global._colombia || []).push({
    clmbslot: data.clmb_slot,
    clmbposition: data.clmb_position,
    clmbsection: data.clmb_section,
    clmbdivid: data.clmb_divid
  });
  // install observation on entering/leaving the view
  global.context.observeIntersection(function (newrequest) {
    newrequest.forEach(function (d) {
      if (d.intersectionRect.height > 0) {
        global._colombia.push({
          visible: true,
          rect: d
        });
      }
    });
  });
  _p3p.loadScript(global, 'https://static.clmbtech.com/ad/commons/js/colombia-amp.js');
}

},{"../3p/3p":1}],49:[function(require,module,exports){
exports.__esModule = true;
exports.contentad = contentad;
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

var _p3p = require('../3p/3p');

var _srcUrl = require('../src/url');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function contentad(global, data) {
  _p3p.validateData(data, [], ['id', 'd', 'wid', 'url']);
  global.id = data.id;
  global.d = data.d;
  global.wid = data.wid;
  global.url = data.url;

  /* Create div for ad to target */
  var cadDiv = window.document.createElement('div');
  cadDiv.id = 'contentad' + global.wid;
  window.document.body.appendChild(cadDiv);

  /* Pass Source URL */
  var sourceUrl = window.context.sourceUrl;
  if (data.url) {
    var domain = data.url || window.atob(data.d);
    sourceUrl = sourceUrl.replace(_srcUrl.parseUrl(sourceUrl).host, domain);
  }

  /* Build API URL */
  var cadApi = 'https://api.content-ad.net/Scripts/widget2.aspx' + '?id=' + encodeURIComponent(global.id) + '&d=' + encodeURIComponent(global.d) + '&wid=' + global.wid + '&url=' + encodeURIComponent(sourceUrl) + '&cb=' + Date.now();

  /* Call Content.ad Widget */
  _p3p.writeScript(global, cadApi);
}

},{"../3p/3p":1,"../src/url":151}],50:[function(require,module,exports){
exports.__esModule = true;
exports.criteo = criteo;
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

var _p3p = require('../3p/3p');

var _adsGoogleDoubleclick = require('../ads/google/doubleclick');

/* global Criteo: false */

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function criteo(global, data) {
  _p3p.loadScript(global, 'https://static.criteo.net/js/ld/publishertag.js', function () {
    if (data.tagtype === 'rta') {
      // Make sure RTA is called only once
      _p3p.computeInMasterFrame(window, 'call-rta', function (resultCallback) {
        var params = {
          networkid: data.networkid,
          cookiename: data.cookiename || Criteo.PubTag.RTA.DefaultCrtgRtaCookieName,
          varname: data.varname || Criteo.PubTag.RTA.DefaultCrtgContentName
        };
        Criteo.CallRTA(params);
        resultCallback(null);
      }, function () {});
      setTargeting(global, data);
    } else if (!data.tagtype || data.tagtype === 'passback') {
      Criteo.DisplayAd({
        zoneid: data.zone,
        containerid: 'c',
        integrationmode: 'amp'
      });
    }
  });
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */
function setTargeting(global, data) {
  if (data.adserver === 'DFP') {
    var dblParams = {
      slot: data.slot,
      targeting: Criteo.ComputeDFPTargetingForAMP(data.cookiename || Criteo.PubTag.RTA.DefaultCrtgRtaCookieName, data.varname || Criteo.PubTag.RTA.DefaultCrtgContentName),
      width: data.width,
      height: data.height,
      type: 'criteo'
    };
    _adsGoogleDoubleclick.doubleclick(global, dblParams);
  }
}

},{"../3p/3p":1,"../ads/google/doubleclick":67}],51:[function(require,module,exports){
exports.__esModule = true;
exports.distroscale = distroscale;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function distroscale(global, data) {
  _p3p.validateData(data, ['pid'], ['zid', 'tid']);
  var src = '//c.jsrdn.com/s/cs.js?p=' + encodeURIComponent(data.pid);

  if (data.zid) {
    src += '&z=' + encodeURIComponent(data.zid);
  } else {
    src += '&z=amp';
  }

  if (data.tid) {
    src += '&t=' + encodeURIComponent(data.tid);
  }

  var srcUrl = global.context.sourceUrl;

  srcUrl = srcUrl.replace(/#.+/, '').replace(/\?.+/, '');

  src += '&f=' + encodeURIComponent(srcUrl);

  global.dsAMPCallbacks = {
    renderStart: global.context.renderStart,
    noContentAvailable: global.context.noContentAvailable
  };
  _p3p.loadScript(global, src, function () {}, function () {
    global.context.noContentAvailable();
  });
}

},{"../3p/3p":1}],52:[function(require,module,exports){
exports.__esModule = true;
exports.dotandads = dotandads;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function dotandads(global, data) {
  global.data = data;
  _p3p.writeScript(global, 'https://amp.ad.dotandad.com/dotandadsAmp.js');
}

},{"../3p/3p":1}],53:[function(require,module,exports){
exports.__esModule = true;
exports.eas = eas;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function eas(global, data) {
  _p3p.validateData(data, ['easDomain']);
  global.easAmpParams = data;
  _p3p.writeScript(global, 'https://amp.emediate.eu/amp.v0.js');
}

},{"../3p/3p":1}],54:[function(require,module,exports){
exports.__esModule = true;
exports.eplanning = eplanning;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function eplanning(global, data) {
  _p3p.validateData(data, ['epl_si', 'epl_isv', 'epl_sv', 'epl_sec', 'epl_kvs', 'epl_e']);
  // push the two object into the '_eplanning' global
  (global._eplanning = global._eplanning || []).push({
    sI: data.epl_si,
    isV: data.epl_isv,
    sV: data.epl_sv,
    sec: data.epl_sec,
    kVs: data.epl_kvs,
    e: data.epl_e
  });
  _p3p.loadScript(global, 'https://us.img.e-planning.net/layers/epl-amp.js');
}

},{"../3p/3p":1}],55:[function(require,module,exports){
exports.__esModule = true;
exports.ezoic = ezoic;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function ezoic(global, data) {
  // TODO: check mandatory fields
  _p3p.validateData(data, [], ['slot', 'targeting', 'extras']);
  _p3p.loadScript(global, 'https://g.ezoic.net/ezoic/ampad.js', function () {
    _p3p.loadScript(global, 'https://www.googletagservices.com/tag/js/gpt.js', function () {
      global.googletag.cmd.push(function () {
        new window.EzoicAmpAd(global, data).createAd();
      });
    });
  });
}

},{"../3p/3p":1}],56:[function(require,module,exports){
exports.__esModule = true;
exports.f1e = f1e;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function f1e(global, data) {
  _p3p.validateData(data, ['url', 'target'], []);
  global.f1eData = data;
  _p3p.writeScript(global, 'https://img.ak.impact-ad.jp/util/f1e_amp.min.js');
}

},{"../3p/3p":1}],57:[function(require,module,exports){
exports.__esModule = true;
exports.f1h = f1h;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function f1h(global, data) {
  _p3p.validateData(data, ['sectionId', 'slot']);

  var scriptUrl = data['debugsrc'] || 'https://img.ak.impact-ad.jp/fh/f1h_amp.js';

  global.f1hData = data;
  _p3p.loadScript(global, scriptUrl);
}

},{"../3p/3p":1}],58:[function(require,module,exports){
exports.__esModule = true;
exports.felmat = felmat;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function felmat(global, data) {
  _p3p.validateData(data, ['host', 'fmt', 'fmk', 'fmp']);
  global.fmParam = data;
  _p3p.writeScript(global, 'https://t.' + encodeURIComponent(data.host) + '/js/fmamp.js');
}

},{"../3p/3p":1}],59:[function(require,module,exports){
exports.__esModule = true;
exports.flite = flite;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function flite(global, data) {
  // TODO: check mandatory fields
  _p3p.validateData(data, [], ['guid', 'mixins']);
  var guid = data.guid,
      o = global,
      e = encodeURIComponent,
      x = 0;
  var r = '',
      dep = '';
  o.FLITE = o.FLITE || {};
  o.FLITE.config = o.FLITE.config || {};
  o.FLITE.config[guid] = o.FLITE.config[guid] || {};
  o.FLITE.config[guid].cb = Math.random();
  o.FLITE.config[guid].ts = +Number(new Date());
  r = global.context.location.href;
  var m = r.match(new RegExp('[A-Za-z]+:[/][/][A-Za-z0-9.-]+'));
  dep = data.mixins ? '&dep=' + data.mixins : '';
  var url = ['https://r.flite.com/syndication/uscript.js?i=', e(guid), '&v=3', dep, '&x=us', x, '&cb=', o.FLITE.config[guid].cb, '&d=', e(m && m[0] || r), '&tz=', new Date().getTimezoneOffset()].join('');
  _p3p.loadScript(o, url);
}

},{"../3p/3p":1}],60:[function(require,module,exports){
exports.__esModule = true;
exports.fluct = fluct;
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

var _p3p = require('../3p/3p');

/* global adingoFluct: false */

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function fluct(global, data) {
  _p3p.validateData(data, ['g', 'u']);
  _p3p.writeScript(global, 'https://cdn-fluct.sh.adingo.jp/f.js?G=' + encodeURIComponent(data['g']), function () {
    adingoFluct.showAd(data['u']);
  });
}

},{"../3p/3p":1}],61:[function(require,module,exports){
exports.__esModule = true;
exports.fusion = fusion;
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

var _p3p = require('../3p/3p');

function queryParametersToObject(input) {
  if (!input) {
    return undefined;
  }
  return input.split('&').filter(function (_) {
    return _;
  }).reduce(function (obj, val) {
    var _Object$assign;

    var kv = val.split('=');
    return Object.assign(obj, (_Object$assign = {}, _Object$assign[kv[0]] = kv[1] || true, _Object$assign));
  }, {});
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function fusion(global, data) {
  _p3p.validateData(data, [], ['mediaZone', 'layout', 'adServer', 'space', 'parameters']);

  var container = global.document.getElementById('c');
  var ad = global.document.createElement('div');
  ad.setAttribute('data-fusion-space', data.space);
  container.appendChild(ad);
  var parameters = queryParametersToObject(data.parameters);

  _p3p.writeScript(global, 'https://assets.adtomafusion.net/fusion/latest/fusion-amp.min.js', function () {
    global.Fusion.apply(container, global.Fusion.loadAds(data, parameters));

    global.Fusion.on.warning.run(function (ev) {
      if (ev.msg === 'Space not present in response.') {
        global.context.noContentAvailable();
      }
    });
  });
}

},{"../3p/3p":1}],62:[function(require,module,exports){
exports.__esModule = true;
exports.genieessp = genieessp;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function genieessp(global, data) {
  _p3p.validateData(data, ['vid', 'zid']);

  global.data = data;
  _p3p.writeScript(global, 'https://js.gsspcln.jp/l/amp.js');
}

},{"../3p/3p":1}],63:[function(require,module,exports){
exports.__esModule = true;
exports.gmossp = gmossp;
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

var _p3p = require('../3p/3p');

var gmosspFields = ['width', 'height', 'id'];

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function gmossp(global, data) {
  _p3p.validateData(data, gmosspFields, []);

  global.gmosspParam = data;
  _p3p.writeScript(global, 'https://cdn.gmossp-sp.jp/ads/amp.js');
}

},{"../3p/3p":1}],64:[function(require,module,exports){
exports.__esModule = true;
exports.adsense = adsense;
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

var _p3p = require('../../3p/3p');

var _srcStyle = require('../../src/style');

/**
 * Make an adsense iframe.
 * @param {!Window} global
 * @param {!Object} data
 */

function adsense(global, data) {
  // TODO: check mandatory fields
  _p3p.validateData(data, [], ['adClient', 'adSlot', 'adHost', 'adtest', 'tagOrigin', 'experimentId', 'ampSlotIndex']);

  if (global.context.clientId) {
    // Read by GPT for GA/GPT integration.
    global.gaGlobal = {
      cid: global.context.clientId,
      hid: global.context.pageViewId
    };
  }
  var s = global.document.createElement('script');
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
  global.document.body.appendChild(s);

  var i = global.document.createElement('ins');
  i.setAttribute('data-ad-client', data['adClient']);
  if (data['adSlot']) {
    i.setAttribute('data-ad-slot', data['adSlot']);
  }
  if (data['adHost']) {
    i.setAttribute('data-ad-host', data['adHost']);
  }
  if (data['adtest'] != null) {
    i.setAttribute('data-adtest', data['adtest']);
  }
  if (data['tagOrigin']) {
    i.setAttribute('data-tag-origin', data['tagOrigin']);
  }
  i.setAttribute('data-page-url', global.context.canonicalUrl);
  i.setAttribute('class', 'adsbygoogle');
  _srcStyle.setStyles(i, {
    display: 'inline-block',
    width: '100%',
    height: '100%'
  });
  var initializer = {};
  if (data['experimentId']) {
    var experimentIdList = data['experimentId'].split(',');
    if (experimentIdList) {
      initializer['params'] = {
        'google_ad_modifications': {
          'eids': experimentIdList
        }
      };
    }
  }
  global.document.getElementById('c').appendChild(i);
  (global.adsbygoogle = global.adsbygoogle || []).push(initializer);
}

},{"../../3p/3p":1,"../../src/style":148}],65:[function(require,module,exports){
exports.__esModule = true;
exports.makeCorrelator = makeCorrelator;
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
 * @param {(string|undefined)} clientId
 * @param {string} pageViewId
 * @return {number}
 */

function makeCorrelator(clientId, pageViewId) {
  var pageViewIdNumeric = Number(pageViewId || 0);
  if (clientId) {
    return pageViewIdNumeric + clientId.replace(/\D/g, '') % 1e6 * 1e6;
  } else {
    // In this case, pageViewIdNumeric is only 4 digits => too low entropy
    // to be useful as a page correlator.  So synthesize one from scratch.
    // 4503599627370496 == 2^52.  The guaranteed range of JS Number is at least
    // 2^53 - 1.
    return Math.floor(4503599627370496 * Math.random());
  }
}

},{}],66:[function(require,module,exports){
exports.__esModule = true;
exports.csa = csa;
exports.resizeSuccessHandler = resizeSuccessHandler;
exports.resizeDeniedHandler = resizeDeniedHandler;
exports.callbackWithNoBackfill = callbackWithNoBackfill;
exports.callbackWithBackfill = callbackWithBackfill;
exports.resizeIframe = resizeIframe;
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

var _p3p = require('../../3p/3p');

var _srcJsonJs = require('../../src/json.js');

var _srcStyle = require('../../src/style');

// Keep track of current height of AMP iframe
var currentAmpHeight = null;

// Height of overflow element
var overflowHeight = 40;

/**
 * Enum for different AdSense Products
 * @enum {number}
 * @visibleForTesting
 */
var AD_TYPE = {
  /** Value if we can't determine which product to request */
  UNSUPPORTED: 0,
  /** AdSense for Search */
  AFS: 1,
  /** AdSense for Shopping */
  AFSH: 2,
  /** AdSense for Shopping, backfilled with AdSense for Search */
  AFSH_BACKFILL: 3
};

exports.AD_TYPE = AD_TYPE;
/**
 * Request Custom Search Ads (Adsense for Search or AdSense for Shopping).
 * @param {!Window} global The window object of the iframe
 * @param {!Object} data
 */

function csa(global, data) {
  // Get parent width in case we want to override
  var width = global.document.body. /*OK*/clientWidth;

  _p3p.validateData(data, [], ['afshPageOptions', 'afshAdblockOptions', 'afsPageOptions', 'afsAdblockOptions', 'ampSlotIndex']);

  // Add the ad container to the document
  var containerDiv = global.document.createElement('div');
  var containerId = 'csacontainer';
  containerDiv.id = containerId;
  global.document.getElementById('c').appendChild(containerDiv);

  var pageOptions = { source: 'amp', referer: global.context.referrer };
  var adblockOptions = { container: containerId };

  // Parse all the options
  var afshPage = Object.assign(Object(_srcJsonJs.tryParseJson(data['afshPageOptions'])), pageOptions);
  var afsPage = Object.assign(Object(_srcJsonJs.tryParseJson(data['afsPageOptions'])), pageOptions);
  var afshAd = Object.assign(Object(_srcJsonJs.tryParseJson(data['afshAdblockOptions'])), adblockOptions);
  var afsAd = Object.assign(Object(_srcJsonJs.tryParseJson(data['afsAdblockOptions'])), adblockOptions);

  // Special case for AFSh when "auto" is the requested width
  if (afshAd['width'] == 'auto') {
    afshAd['width'] = width;
  }

  // Event listener needed for iOS9 bug
  global.addEventListener('orientationchange', orientationChangeHandler.bind(null, global, containerDiv));

  // Register resize callbacks
  global.context.onResizeSuccess(resizeSuccessHandler.bind(null, global, containerDiv));
  global.context.onResizeDenied(resizeDeniedHandler.bind(null, global, containerDiv));

  // Only call for ads once the script has loaded
  _p3p.loadScript(global, 'https://www.google.com/adsense/search/ads.js', requestCsaAds.bind(null, global, data, afsPage, afsAd, afshPage, afshAd));
}

/**
 * Resize the AMP iframe if the CSA container changes in size upon rotation.
 * This is needed for an iOS bug found in versions 10.0.1 and below that
 * doesn't properly reflow the iframe upon orientation change.
 * @param {!Window} global The window object of the iframe
 * @param {!Element} containerDiv The CSA container
 */
function orientationChangeHandler(global, containerDiv) {
  // Save the height of the container before the event listener triggers
  var oldHeight = _srcStyle.getStyle(containerDiv, 'height');
  global.setTimeout(function () {
    // Force DOM reflow and repaint
    /*eslint-disable no-unused-vars*/
    var ignore = global.document.body. /*OK*/offsetHeight;
    /*eslint-enable no-unused-vars*/
    // Capture new height
    var newHeight = _srcStyle.getStyle(containerDiv, 'height');
    // In older versions of iOS, this height will be different because the
    // container height is resized.
    // In Chrome and iOS 10.0.2 the height is the same because
    // the container isn't resized.
    if (oldHeight != newHeight && newHeight != currentAmpHeight) {
      // style.height returns "60px" (for example), so turn this into an int
      newHeight = parseInt(newHeight, 10);
      // Also update the onclick function to resize to the right height.
      var overflow = global.document.getElementById('overflow');
      if (overflow) {
        overflow.onclick = global.context.requestResize.bind(null, undefined, newHeight);
      }
      // Resize the container to the correct height
      global.context.requestResize(undefined, newHeight);
    }
  }, 250); /* 250 is time in ms to wait before executing orientation */
}

/**
 * Hanlder for when a resize request succeeds
 * Hide the overflow and resize the container
 * @param {!Window} global The window object of the iframe
 * @param {!Element} container The CSA container
 * @param {!number} requestedHeight The height of the resize request
 * @visibleForTesting
 */

function resizeSuccessHandler(global, container, requestedHeight) {
  currentAmpHeight = requestedHeight;
  var overflow = global.document.getElementById('overflow');
  if (overflow) {
    _srcStyle.setStyle(overflow, 'display', 'none');
    resizeCsa(container, requestedHeight);
  }
}

/**
 * Hanlder for When a resize request is denied
 * If the container is larger than the AMP container and an overflow already
 * exists, show the overflow and resize the container to fit inside the AMP
 * container.  If an overflow doesn't exist, create one.
 * @param {!Window} global The window object of the iframe
 * @param {!Element} container The CSA container
 * @param {!number} requestedHeight The height of the resize request
 * @visibleForTesting
 */

function resizeDeniedHandler(global, container, requestedHeight) {
  var overflow = global.document.getElementById('overflow');
  var containerHeight = parseInt(_srcStyle.getStyle(container, 'height'), 10);
  if (containerHeight > currentAmpHeight) {
    if (overflow) {
      _srcStyle.setStyle(overflow, 'display', '');
      resizeCsa(container, currentAmpHeight - overflowHeight);
    } else {
      createOverflow(global, container, requestedHeight);
    }
  }
}

/**
 * Make a request for either AFS or AFSh
 * @param {!Window} global The window object of the iframe
 * @param {!Object} data The data passed in by the partner
 * @param {!Object} afsP The parsed AFS page options object
 * @param {!Object} afsA The parsed AFS adblock options object
 * @param {!Object} afshP The parsed AFSh page options object
 * @param {!Object} afshA The parsed AFSh adblock options object
 */
function requestCsaAds(global, data, afsP, afsA, afshP, afshA) {
  var type = getAdType(data);
  var callback = callbackWithNoBackfill.bind(null, global);
  var callbackBackfill = callbackWithBackfill.bind(null, global, afsP, afsA);

  switch (type) {
    case AD_TYPE.AFS:
      /** Do not backfill, request AFS */
      afsA['adLoadedCallback'] = callback;
      global._googCsa('ads', afsP, afsA);
      break;
    case AD_TYPE.AFSH:
      /** Do not backfill, request AFSh */
      afshA['adLoadedCallback'] = callback;
      global._googCsa('plas', afshP, afshA);
      break;
    case AD_TYPE.AFSH_BACKFILL:
      /** Backfill with AFS, request AFSh */
      afshA['adLoadedCallback'] = callbackBackfill;
      global._googCsa('plas', afshP, afshA);
      break;
  }
}

/**
 * Helper function to determine which product to request
 * @param {!Object} data The data passed in by the partner
 * @return {!number} Enum of ad type
 */
function getAdType(data) {
  if (data['afsPageOptions'] != null && data['afshPageOptions'] == null) {
    return AD_TYPE.AFS;
  }
  if (data['afsPageOptions'] == null && data['afshPageOptions'] != null) {
    return AD_TYPE.AFSH;
  }
  if (data['afsPageOptions'] != null && data['afshPageOptions'] != null) {
    return AD_TYPE.AFSH_BACKFILL;
  } else {
    return AD_TYPE.UNSUPPORTED;
  }
}

/**
 * The adsLoadedCallback for requests without a backfill.  If ads were returned,
 * resize the iframe.  If ads weren't returned, tell AMP we don't have ads.
 * @param {!Window} global The window object of the iframe
 * @param {!string} containerName The name of the CSA container
 * @param {!boolean} hasAd Whether or not CSA returned an ad
 * @visibleForTesting
 */

function callbackWithNoBackfill(global, containerName, hasAd) {
  if (hasAd) {
    resizeIframe(global, containerName);
  } else {
    global.context.noContentAvailable();
  }
}

/**
 * The adsLoadedCallback for requests with a backfill.  If ads were returned,
 * resize the iframe.  If ads weren't returned, backfill the ads.
 * @param {!Window} global The window object of the iframe
 * @param {!Object} page The parsed AFS page options to backfill the unit with
 * @param {!Object} ad The parsed AFS page options to backfill the unit with
 * @param {!string} containerName The name of the CSA container
 * @param {!boolean} hasAd Whether or not CSA returned an ad
 * @visibleForTesting
*/

function callbackWithBackfill(global, page, ad, containerName, hasAd) {
  if (hasAd) {
    resizeIframe(global, containerName);
  } else {
    ad['adLoadedCallback'] = callbackWithNoBackfill.bind(null, global);
    global['_googCsa']('ads', page, ad);
  }
}

/**
 * CSA callback function to resize the iframe when ads were returned
 * @param {!string} containerName Name of the container ('csacontainer')
 * @visibleForTesting
 */

function resizeIframe(global, containerName) {
  // Get actual height of container
  var container = global.document.getElementById(containerName);
  var height = container. /*OK*/offsetHeight;
  // Set initial AMP height
  currentAmpHeight = global.context.initialIntersection.boundingClientRect.height;

  // If the height of the container is larger than the height of the
  // initially requested AMP tag, add the overflow element
  if (height > currentAmpHeight) {
    createOverflow(global, container, height);
  }
  // Attempt to resize to actual CSA container height
  global.context.requestResize(undefined, height);
}

/**
 * Helper function to create an overflow element
 * @param {!Window} global The window object of the iframe
 * @param {!Element} container HTML element of the CSA container
 * @param {!number} height The full height the CSA container should be when the
 * overflow element is clicked.
 */
function createOverflow(global, container, height) {
  var overflow = getOverflowElement(global);
  // When overflow is clicked, resize to full height
  overflow.onclick = global.context.requestResize.bind(null, undefined, height);
  global.document.getElementById('c').appendChild(overflow);
  // Resize the CSA container to not conflict with overflow
  resizeCsa(container, currentAmpHeight - overflowHeight);
}

/**
 * Helper function to create the base overflow element
 * @param {!Window} global The window object of the iframe
 * @return {!Element}
 */
function getOverflowElement(global) {
  var overflow = global.document.createElement('div');
  overflow.id = 'overflow';
  _srcStyle.setStyles(overflow, {
    position: 'absolute',
    height: overflowHeight + 'px',
    width: '100%'
  });
  overflow.appendChild(getOverflowLine(global));
  overflow.appendChild(getOverflowChevron(global));
  return overflow;
}

/**
 * Helper function to create a line element for the overflow element
 * @param {!Window} global The window object of the iframe
 * @return {!Element}
 */
function getOverflowLine(global) {
  var line = global.document.createElement('div');
  _srcStyle.setStyles(line, {
    background: 'rgba(0,0,0,.16)',
    height: '1px'
  });
  return line;
}

/**
 * Helper function to create a chevron element for the overflow element
 * @param {!Window} global The window object of the iframe
 * @return {!Element}
 */
function getOverflowChevron(global) {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="36px" ' + 'height="36px" viewBox="0 0 48 48" fill="#757575"><path d="M14.83' + ' 16.42L24 25.59l9.17-9.17L36 19.25l-12 12-12-12z"/>' + '<path d="M0-.75h48v48H0z" fill="none"/> </svg>';

  var chevron = global.document.createElement('div');
  _srcStyle.setStyles(chevron, {
    width: '36px',
    height: '36px',
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'block'
  });
  chevron. /*OK*/innerHTML = svg;
  return chevron;
}

/**
 * Helper function to resize the height of a CSA container and its child iframe
 * @param {!Element} container HTML element of the CSA container
 * @param {!number} height Height to resize, in pixels
 */
function resizeCsa(container, height) {
  var iframe = container.firstElementChild;
  if (iframe) {
    _srcStyle.setStyles(iframe, {
      height: height + 'px',
      width: '100%'
    });
  }
  _srcStyle.setStyle(container, 'height', height + 'px');
}

},{"../../3p/3p":1,"../../src/json.js":140,"../../src/style":148}],67:[function(require,module,exports){
(function (global){
exports.__esModule = true;
exports.doubleclick = doubleclick;
exports.selectGptExperiment = selectGptExperiment;
exports.writeAdScript = writeAdScript;
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

var _correlator = require('./correlator');

var _p3p = require('../../3p/3p');

var _srcLog = require('../../src/log');

var _srcStyle = require('../../src/style');

var _utils = require('./utils');

/**
 * @enum {number}
 * @private
 */
var GladeExperiment = {
  NO_EXPERIMENT: 0,
  GLADE_CONTROL: 1,
  GLADE_EXPERIMENT: 2,
  GLADE_OPT_OUT: 3
};

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function doubleclick(global, data) {
  // TODO: check mandatory fields
  _p3p.validateData(data, [], ['slot', 'targeting', 'categoryExclusions', 'tagForChildDirectedTreatment', 'cookieOptions', 'overrideWidth', 'overrideHeight', 'loadingStrategy', 'consentNotificationId', 'useSameDomainRenderingUntilDeprecated', 'experimentId', 'multiSize', 'multiSizeValidation', 'ampSlotIndex']);

  if (global.context.clientId) {
    // Read by GPT/Glade for GA/Doubleclick integration.
    global.gaGlobal = {
      cid: global.context.clientId,
      hid: global.context.pageViewId
    };
  }

  centerAd();

  var gptFilename = selectGptExperiment(data);

  writeAdScript(global, data, gptFilename);
}

/**
 * @param {!Window} global
 * @param {!Object} data
 * @param {!GladeExperiment} gladeExperiment
 * @param {!string} url
 */
function doubleClickWithGpt(global, data, gladeExperiment, url) {
  var dimensions = [[parseInt(data.overrideWidth || data.width, 10), parseInt(data.overrideHeight || data.height, 10)]];

  // Handle multi-size data parsing, validation, and inclusion into dimensions.
  var multiSizeDataStr = data.multiSize || null;
  if (multiSizeDataStr) {
    var primarySize = dimensions[0];
    var primaryWidth = primarySize[0];
    var primaryHeight = primarySize[1];

    _utils.getMultiSizeDimensions(multiSizeDataStr, primaryWidth, primaryHeight, (data.multiSizeValidation || 'true') == 'true', dimensions);
  }

  _p3p.loadScript(global, url, function () {
    global.googletag.cmd.push(function () {
      var googletag = global.googletag;
      var pubads = googletag.pubads();
      var slot = googletag.defineSlot(data.slot, dimensions, 'c').addService(pubads);

      if (gladeExperiment === GladeExperiment.GLADE_CONTROL) {
        pubads.markAsGladeControl();
      } else if (gladeExperiment === GladeExperiment.GLADE_OPT_OUT) {
        pubads.markAsGladeOptOut();
      }

      if (data['experimentId']) {
        var experimentIdList = data['experimentId'].split(',');
        pubads.forceExperiment = pubads.forceExperiment || function () {};
        experimentIdList && experimentIdList.forEach(function (eid) {
          return pubads.forceExperiment(eid);
        });
      }

      pubads.markAsAmp();
      pubads.set('page_url', global.context.canonicalUrl);
      pubads.setCorrelator(Number(getCorrelator(global)));
      googletag.enableServices();

      if (data.categoryExclusions) {
        if (Array.isArray(data.categoryExclusions)) {
          for (var i = 0; i < data.categoryExclusions.length; i++) {
            slot.setCategoryExclusion(data.categoryExclusions[i]);
          }
        } else {
          slot.setCategoryExclusion(data.categoryExclusions);
        }
      }

      if (data.cookieOptions) {
        pubads.setCookieOptions(data.cookieOptions);
      }

      if (data.tagForChildDirectedTreatment != undefined) {
        pubads.setTagForChildDirectedTreatment(data.tagForChildDirectedTreatment);
      }

      if (data.targeting) {
        for (var key in data.targeting) {
          slot.setTargeting(key, data.targeting[key]);
        }
      }

      pubads.addEventListener('slotRenderEnded', function (event) {
        var primaryInvSize = dimensions[0];
        var pWidth = primaryInvSize[0];
        var pHeight = primaryInvSize[1];
        var returnedSize = event.size;
        var rWidth = returnedSize ? returnedSize[0] : null;
        var rHeight = returnedSize ? returnedSize[1] : null;

        var creativeId = event.creativeId || '_backfill_';

        // If the creative is empty, or either dimension of the returned size
        // is larger than its counterpart in the primary size, then we don't
        // want to render the creative.
        if (event.isEmpty || returnedSize && (rWidth > pWidth || rHeight > pHeight)) {
          global.context.noContentAvailable();
          creativeId = '_empty_';
        } else {
          // We only want to call renderStart with a specific size if the
          // returned creative size matches one of the multi-size sizes.
          var newSize = undefined;
          for (var i = 1; i < dimensions.length; i++) {
            // dimensions[0] is the primary or overridden size.
            if (dimensions[i][0] == rWidth && dimensions[i][1] == rHeight) {
              newSize = {
                width: rWidth,
                height: rHeight
              };
              break;
            }
          }
          global.context.renderStart(newSize);
        }
        global.context.reportRenderedEntityIdentifier('dfp-' + creativeId);
      });

      // Exported for testing.
      global.document.getElementById('c')['slot'] = slot;
      googletag.display('c');
    });
  });
}

/**
 * @param {!Window} global
 * @param {!Object} data
 * @param {!GladeExperiment} gladeExperiment
 */
function doubleClickWithGlade(global, data, gladeExperiment) {
  var requestHeight = parseInt(data.overrideHeight || data.height, 10);
  var requestWidth = parseInt(data.overrideWidth || data.width, 10);

  var jsonParameters = {};
  if (data.categoryExclusions) {
    jsonParameters.categoryExclusions = data.categoryExclusions;
  }
  if (data.cookieOptions) {
    jsonParameters.cookieOptOut = data.cookieOptions;
  }
  if (data.tagForChildDirectedTreatment != undefined) {
    jsonParameters.tagForChildDirectedTreatment = data.tagForChildDirectedTreatment;
  }
  if (data.targeting) {
    jsonParameters.targeting = data.targeting;
  }
  if (gladeExperiment === GladeExperiment.GLADE_EXPERIMENT) {
    jsonParameters.gladeEids = '108809102';
  }
  var expIds = data['experimentId'];
  if (expIds) {
    jsonParameters.gladeEids = jsonParameters.gladeEids ? jsonParameters.gladeEids + ',' + expIds : expIds;
  }

  var slot = global.document.getElementById('c');
  slot.setAttribute('data-glade', '');
  slot.setAttribute('data-amp-ad', '');
  slot.setAttribute('data-ad-unit-path', data.slot);
  if (Object.keys(jsonParameters).length > 0) {
    slot.setAttribute('data-json', JSON.stringify(jsonParameters));
  }
  slot.setAttribute('data-page-url', global.context.canonicalUrl);

  // Center the ad in the container.
  slot.setAttribute('height', requestHeight);
  slot.setAttribute('width', requestWidth);

  slot.addEventListener('gladeAdFetched', function (event) {
    if (event.detail.empty) {
      global.context.noContentAvailable();
    }
    global.context.renderStart();
  });

  window.glade = { correlator: getCorrelator(global) };
  _p3p.loadScript(global, 'https://securepubads.g.doubleclick.net/static/glade.js');
}

/**
 * @param {!Window} global
 * @return {number}
 */
function getCorrelator(global) {
  return _correlator.makeCorrelator(global.context.clientId, global.context.pageViewId);
}

function centerAd() {
  _srcStyle.setStyles(_srcLog.dev().assertElement(global.document.getElementById('c')), {
    top: '50%',
    left: '50%',
    bottom: '',
    right: '',
    transform: 'translate(-50%, -50%)'
  });
}

/**
 * @param {!Object} data
 * @return {!string}
 */

function selectGptExperiment(data) {
  var fileExperimentConfig = {
    21060540: 'gpt_sf_a.js',
    21060541: 'gpt_sf_b.js'
  };
  // Note that reduce will return the first item that matches but it is
  // expected that only one of the experiment ids will be present.
  var expFilename = undefined;
  (data['experimentId'] || '').split(',').forEach(function (val) {
    return expFilename = expFilename || fileExperimentConfig[val];
  });
  return expFilename;
}

/**
 * @param {!Window} global
 * @param {!Object} data
 * @param {!string} gptFilename
 */

function writeAdScript(global, data, gptFilename) {
  var url = 'https://www.googletagservices.com/tag/js/' + (gptFilename || 'gpt.js');
  if (gptFilename || data.useSameDomainRenderingUntilDeprecated != undefined || data.multiSize) {
    doubleClickWithGpt(global, data, GladeExperiment.GLADE_OPT_OUT, url);
  } else {
    var experimentFraction = 0.1;
    var dice = global.Math.random();
    var href = global.context.location.href;
    if ((href.indexOf('google_glade=0') > 0 || dice < experimentFraction) && href.indexOf('google_glade=1') < 0) {
      doubleClickWithGpt(global, data, GladeExperiment.GLADE_CONTROL, url);
    } else {
      var exp = dice < 2 * experimentFraction ? GladeExperiment.GLADE_EXPERIMENT : GladeExperiment.NO_EXPERIMENT;
      doubleClickWithGlade(global, data, exp);
    }
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../3p/3p":1,"../../src/log":141,"../../src/style":148,"./correlator":65,"./utils":69}],68:[function(require,module,exports){
exports.__esModule = true;
exports.imaVideo = imaVideo;
exports.onClick = onClick;
exports.playAds = playAds;
exports.onContentEnded = onContentEnded;
exports.onAdsManagerLoaded = onAdsManagerLoaded;
exports.onAdsLoaderError = onAdsLoaderError;
exports.onAdError = onAdError;
exports.onContentPauseRequested = onContentPauseRequested;
exports.onContentResumeRequested = onContentResumeRequested;
exports.updateUi = updateUi;
exports.formatTime = formatTime;
exports.zeroPad = zeroPad;
exports.onPlayPauseClick = onPlayPauseClick;
exports.playVideo = playVideo;
exports.pauseVideo = pauseVideo;
exports.showControls = showControls;
exports.hideControls = hideControls;
exports.getPropertiesForTesting = getPropertiesForTesting;
exports.setBigPlayDivForTesting = setBigPlayDivForTesting;
exports.setAdDisplayContainerForTesting = setAdDisplayContainerForTesting;
exports.setVideoWidthAndHeightForTesting = setVideoWidthAndHeightForTesting;
exports.setAdRequestFailedForTesting = setAdRequestFailedForTesting;
exports.setAdsLoaderForTesting = setAdsLoaderForTesting;
exports.setMuteAdsManagerOnLoadedForTesting = setMuteAdsManagerOnLoadedForTesting;
exports.setAdsManagerForTesting = setAdsManagerForTesting;
exports.setAdsManagerDimensionsOnLoadForTesting = setAdsManagerDimensionsOnLoadForTesting;
exports.setContentCompleteForTesting = setContentCompleteForTesting;
exports.setVideoPlayerForTesting = setVideoPlayerForTesting;
exports.setPlayerStateForTesting = setPlayerStateForTesting;
exports.setHideControlsTimeoutForTesting = setHideControlsTimeoutForTesting;
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

var _srcTypes = require('../../src/types');

var _p3p = require('../../3p/3p');

var _srcStyle = require('../../src/style');

var _srcJson = require('../../src/json');

/**
 * Possible player states.
 * @enum {number}
 * @private
 */
var PlayerStates = {
  PLAYING: 1,
  PAUSED: 2
};

// Character used for play icon.
var playChar = '\u25b6\ufe0e';

// Character used for pause icons.
var pauseChars = '\u258c\ufe0e\u258c\ufe0e';

// Character used for seek dot on progress bar.
var seekDot = '\u25cf\ufe0e';

// Characters used for fullscreen icon.
var fullscreenChars = '\u25ad\ufe0e';

// Div wrapping our entire DOM.
var wrapperDiv = undefined;

// Div containing big play button. Rendered before player starts.
var bigPlayDiv = undefined;

// Div contianing play button. Double-nested for alignment.
var playButtonDiv = undefined;

// Node containing play button characters.
var bigPlayButtonNode = undefined;

// Div containing player controls.
var controlsDiv = undefined;

// Div containing play or pause button.
var playPauseDiv = undefined;

// Node contianing play or pause characters.
var playPauseNode = undefined;

// Div containing player time.
var timeDiv = undefined;

// Node containing the player time text.
var timeNode = undefined;

// Wrapper for progress bar DOM elements.
var progressBarWrapperDiv = undefined;

// Line for progress bar.
var progressLine = undefined;

// Line for total time in progress bar.
var totalTimeLine = undefined;

// Div containing the marker for the progress.
var progressMarkerDiv = undefined;

// Div for fullscreen icon.
var fullscreenDiv = undefined;

// Div for ad container.
var adContainerDiv = undefined;

// Div for content player.
var contentDiv = undefined;

// Content player.
var videoPlayer = undefined;

// Event indicating user interaction.
var interactEvent = undefined;

// Event for mouse down.
var mouseDownEvent = undefined;

// Event for mouse move.
var mouseMoveEvent = undefined;

// Event for mouse up.
var mouseUpEvent = undefined;

// Percent of the way through the video the user has seeked. Used for seek
// events.
var seekPercent = undefined;

// Flag tracking whether or not content has played to completion.
var contentComplete = undefined;

// Flag tracking if an ad request has failed.
var adRequestFailed = undefined;

// IMA SDK AdDisplayContainer object.
var adDisplayContainer = undefined;

// IMA SDK AdsLoader object.
var adsLoader = undefined;

// IMA SDK AdsManager object;
var adsManager = undefined;

// Timer for UI updates.
var uiTicker = undefined;

// Tracks the current state of the player.
var playerState = undefined;

// Flag for whether or not we are currently in fullscreen mode.
var fullscreen = undefined;

// Width the player should be in fullscreen mode.
var fullscreenWidth = undefined;

// Height the player should be in fullscreen mode.
var fullscreenHeight = undefined;

// Flag tracking if ads are currently active.
var adsActive = undefined;

// Flag tracking if playback has started.
var playbackStarted = undefined;

// Timer used to hide controls after user action.
var hideControlsTimeout = undefined;

// Flag tracking if we need to mute the ads manager once it loads. Used for
// autoplay.
var muteAdsManagerOnLoaded = undefined;

// Flag tracking if we are in native fullscreen mode. Used for iPhone.
var nativeFullscreen = undefined;

// Used if the adsManager needs to be resized on load.
var adsManagerWidthOnLoad = undefined,
    adsManagerHeightOnLoad = undefined;

// Initial video dimensions.
var videoWidth = undefined,
    videoHeight = undefined;

/**
 * Loads the IMA SDK library.
 */
function getIma(global, cb) {
  _p3p.loadScript(global, 'https://imasdk.googleapis.com/js/sdkloader/ima3.js', cb);
  //loadScript(global, 'https://storage.googleapis.com/gvabox/sbusolits/h5/debug/ima3.js', cb);
}

/**
 * The business.
 */

function imaVideo(global, data) {

  videoWidth = global. /*OK*/innerWidth;
  videoHeight = global. /*OK*/innerHeight;

  // Wraps *everything*.
  wrapperDiv = global.document.createElement('div');
  wrapperDiv.id = 'ima-wrapper';
  _srcStyle.setStyle(wrapperDiv, 'width', videoWidth + 'px');
  _srcStyle.setStyle(wrapperDiv, 'height', videoHeight + 'px');
  _srcStyle.setStyle(wrapperDiv, 'background-color', 'black');

  // Wraps the big play button we show before video start.
  bigPlayDiv = global.document.createElement('div');
  bigPlayDiv.id = 'ima-big-play';
  _srcStyle.setStyle(bigPlayDiv, 'position', 'relative');
  _srcStyle.setStyle(bigPlayDiv, 'width', videoWidth + 'px');
  _srcStyle.setStyle(bigPlayDiv, 'height', videoHeight + 'px');
  _srcStyle.setStyle(bigPlayDiv, 'display', 'table-cell');
  _srcStyle.setStyle(bigPlayDiv, 'vertical-align', 'middle');
  _srcStyle.setStyle(bigPlayDiv, 'text-align', 'center');
  _srcStyle.setStyle(bigPlayDiv, 'cursor', 'pointer');
  // Inner div so we can v and h align.
  playButtonDiv = global.document.createElement('div');
  playButtonDiv.id = 'ima-play-button';
  _srcStyle.setStyle(playButtonDiv, 'font-size', '10em');
  _srcStyle.setStyle(playButtonDiv, 'color', 'white');
  _srcStyle.setStyle(playButtonDiv, 'display', 'inline-block');
  _srcStyle.setStyle(playButtonDiv, 'line-height', '0.5');
  // Play button text node.
  bigPlayButtonNode = global.document.createTextNode(playChar);
  playButtonDiv.appendChild(bigPlayButtonNode);
  bigPlayDiv.appendChild(playButtonDiv);

  // Video controls.
  controlsDiv = global.document.createElement('div');
  controlsDiv.id = 'ima-controls';
  _srcStyle.setStyle(controlsDiv, 'position', 'absolute');
  _srcStyle.setStyle(controlsDiv, 'bottom', '0px');
  _srcStyle.setStyle(controlsDiv, 'width', '100%');
  _srcStyle.setStyle(controlsDiv, 'height', '30px');
  _srcStyle.setStyle(controlsDiv, 'background-color', '#EEEEEE');
  _srcStyle.setStyle(controlsDiv, 'color', '#333333');
  _srcStyle.setStyle(controlsDiv, 'display', 'none');
  _srcStyle.setStyle(controlsDiv, '-webkit-touch-callout', 'none');
  _srcStyle.setStyle(controlsDiv, '-webkit-user-select', 'none');
  _srcStyle.setStyle(controlsDiv, '-khtml-user-select', 'none');
  _srcStyle.setStyle(controlsDiv, '-moz-user-select', 'none');
  _srcStyle.setStyle(controlsDiv, '-ms-user-select', 'none');
  _srcStyle.setStyle(controlsDiv, 'user-select', 'none');
  // Play button
  playPauseDiv = global.document.createElement('div');
  playPauseDiv.id = 'ima-play-pause';
  _srcStyle.setStyle(playPauseDiv, 'width', '30px');
  _srcStyle.setStyle(playPauseDiv, 'height', '30px');
  _srcStyle.setStyle(playPauseDiv, 'margin-left', '10px');
  _srcStyle.setStyle(playPauseDiv, 'font-size', '1.25em');
  _srcStyle.setStyle(playPauseDiv, 'float', 'left');
  _srcStyle.setStyle(playPauseDiv, 'cursor', 'pointer');
  playPauseNode = global.document.createTextNode(playChar);
  playPauseDiv.appendChild(playPauseNode);
  controlsDiv.appendChild(playPauseDiv);
  // Current time and duration.
  timeDiv = global.document.createElement('div');
  timeDiv.id = 'ima-time';
  _srcStyle.setStyle(timeDiv, 'width', '120px');
  _srcStyle.setStyle(timeDiv, 'height', '30px');
  _srcStyle.setStyle(timeDiv, 'line-height', '30px');
  _srcStyle.setStyle(timeDiv, 'float', 'left');
  _srcStyle.setStyle(timeDiv, 'text-align', 'center');
  timeNode = global.document.createTextNode('00:00 / 00:00');
  timeDiv.appendChild(timeNode);
  controlsDiv.appendChild(timeDiv);
  // Progress bar.
  progressBarWrapperDiv = global.document.createElement('div');
  progressBarWrapperDiv.id = 'ima-progress-wrapper';
  _srcStyle.setStyle(progressBarWrapperDiv, 'height', '30px');
  _srcStyle.setStyle(progressBarWrapperDiv, 'position', 'absolute');
  _srcStyle.setStyle(progressBarWrapperDiv, 'left', '160px');
  _srcStyle.setStyle(progressBarWrapperDiv, 'right', '50px');
  progressLine = global.document.createElement('div');
  progressLine.id = 'progress-line';
  _srcStyle.setStyle(progressLine, 'background-color', '#00BBFF');
  _srcStyle.setStyle(progressLine, 'height', '2px');
  _srcStyle.setStyle(progressLine, 'margin-top', '14px');
  _srcStyle.setStyle(progressLine, 'width', '0%');
  _srcStyle.setStyle(progressLine, 'float', 'left');
  totalTimeLine = global.document.createElement('div');
  totalTimeLine.id = 'total-time-line';
  _srcStyle.setStyle(totalTimeLine, 'background-color', '#333333');
  _srcStyle.setStyle(totalTimeLine, 'height', '2px');
  _srcStyle.setStyle(totalTimeLine, 'width', '100%');
  _srcStyle.setStyle(totalTimeLine, 'margin-top', '14px');
  progressMarkerDiv = global.document.createElement('div');
  progressMarkerDiv.id = 'ima-progress-marker';
  _srcStyle.setStyle(progressMarkerDiv, 'color', '#00BBFF');
  _srcStyle.setStyle(progressMarkerDiv, 'height', '30px');
  _srcStyle.setStyle(progressMarkerDiv, 'position', 'absolute');
  _srcStyle.setStyle(progressMarkerDiv, 'font-size', '2em');
  _srcStyle.setStyle(progressMarkerDiv, 'margin-top', '-5px');
  _srcStyle.setStyle(progressMarkerDiv, 'left', '-1%');
  _srcStyle.setStyle(progressMarkerDiv, 'cursor', 'default');
  progressMarkerDiv.appendChild(global.document.createTextNode(seekDot));
  progressBarWrapperDiv.appendChild(progressLine);
  progressBarWrapperDiv.appendChild(progressMarkerDiv);
  progressBarWrapperDiv.appendChild(totalTimeLine);
  controlsDiv.appendChild(progressBarWrapperDiv);
  // Fullscreen button
  fullscreenDiv = global.document.createElement('div');
  fullscreenDiv.id = 'ima-fullscreen';
  _srcStyle.setStyle(fullscreenDiv, 'position', 'absolute');
  _srcStyle.setStyle(fullscreenDiv, 'bottom', '0px');
  _srcStyle.setStyle(fullscreenDiv, 'right', '10px');
  _srcStyle.setStyle(fullscreenDiv, 'width', '30px');
  _srcStyle.setStyle(fullscreenDiv, 'height', '30px');
  _srcStyle.setStyle(fullscreenDiv, 'font-size', '1.25em');
  _srcStyle.setStyle(fullscreenDiv, 'cursor', 'pointer');
  _srcStyle.setStyle(fullscreenDiv, 'text-align', 'center');
  _srcStyle.setStyle(fullscreenDiv, 'font-weight', 'bold');
  _srcStyle.setStyle(fullscreenDiv, 'line-height', '1.4em');
  fullscreenDiv.appendChild(global.document.createTextNode(fullscreenChars));
  controlsDiv.appendChild(fullscreenDiv);

  // Ad container.
  adContainerDiv = global.document.createElement('div');
  adContainerDiv.id = 'ima-ad-container';
  _srcStyle.setStyle(adContainerDiv, 'position', 'absolute');
  _srcStyle.setStyle(adContainerDiv, 'top', '0px');
  _srcStyle.setStyle(adContainerDiv, 'left', '0px');
  _srcStyle.setStyle(adContainerDiv, 'width', '100%');
  _srcStyle.setStyle(adContainerDiv, 'height', '100%');

  // Wraps our content video.
  contentDiv = global.document.createElement('div');
  contentDiv.id = 'ima-content';
  _srcStyle.setStyle(contentDiv, 'position', 'absolute');
  _srcStyle.setStyle(contentDiv, 'top', '0px');
  _srcStyle.setStyle(contentDiv, 'left', '0px');
  _srcStyle.setStyle(contentDiv, 'width', '100%');
  _srcStyle.setStyle(contentDiv, 'height', '100%');
  // The video player
  videoPlayer = global.document.createElement('video');
  videoPlayer.id = 'ima-content-player';
  _srcStyle.setStyle(videoPlayer, 'width', '100%');
  _srcStyle.setStyle(videoPlayer, 'height', '100%');
  _srcStyle.setStyle(videoPlayer, 'background-color', 'black');
  videoPlayer.setAttribute('poster', data.poster);
  videoPlayer.setAttribute('playsinline', true);
  if (data.src) {
    var sourceElement = document.createElement('source');
    sourceElement.setAttribute('src', data.src);
    videoPlayer.appendChild(sourceElement);
  }
  if (data.childElements) {
    var children = JSON.parse(data.childElements);
    children.forEach(function (child) {
      videoPlayer.appendChild(htmlToElement(child));
    });
  }

  contentDiv.appendChild(videoPlayer);
  wrapperDiv.appendChild(contentDiv);
  wrapperDiv.appendChild(adContainerDiv);
  wrapperDiv.appendChild(controlsDiv);
  wrapperDiv.appendChild(bigPlayDiv);
  global.document.getElementById('c').appendChild(wrapperDiv);

  window.addEventListener('message', onMessage.bind(null, global));

  /**
   * Set-up code that can't run until the IMA lib loads.
   */
  getIma(global, function () {
    // This is the first place where we have access to any IMA objects.
    contentComplete = false;
    adsActive = false;
    playbackStarted = false;
    nativeFullscreen = false;

    interactEvent = 'click';
    mouseDownEvent = 'mousedown';
    mouseMoveEvent = 'mousemove';
    mouseUpEvent = 'mouseup';
    if (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/Android/i)) {
      interactEvent = 'touchend';
      mouseDownEvent = 'touchstart';
      mouseMoveEvent = 'touchmove';
      mouseUpEvent = 'touchend';
    }
    bigPlayDiv.addEventListener(interactEvent, onClick.bind(null, global));
    playPauseDiv.addEventListener(interactEvent, onPlayPauseClick);
    progressBarWrapperDiv.addEventListener(mouseDownEvent, onProgressClick);
    fullscreenDiv.addEventListener(interactEvent, onFullscreenClick.bind(null, global));

    var fullScreenEvents = ['fullscreenchange', 'mozfullscreenchange', 'webkitfullscreenchange'];
    fullScreenEvents.forEach(function (fsEvent) {
      global.document.addEventListener(fsEvent, onFullscreenChange.bind(null, global), false);
    });

    adDisplayContainer = new global.google.ima.AdDisplayContainer(adContainerDiv, videoPlayer);

    adsLoader = new global.google.ima.AdsLoader(adDisplayContainer);
    adsLoader.getSettings().setPlayerType('amp-ima');
    adsLoader.getSettings().setPlayerVersion('0.1');
    adsLoader.addEventListener(global.google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, onAdsManagerLoaded.bind(null, global), false);
    adsLoader.addEventListener(global.google.ima.AdErrorEvent.Type.AD_ERROR, onAdsLoaderError, false);

    videoPlayer.addEventListener('ended', onContentEnded);

    var adsRequest = new global.google.ima.AdsRequest();
    adsRequest.adTagUrl = data.tag;
    adsRequest.linearAdSlotWidth = videoWidth;
    adsRequest.linearAdSlotHeight = videoHeight;
    adsRequest.nonLinearAdSlotWidth = videoWidth;
    adsRequest.nonLinearAdSlotHeight = videoHeight / 3;

    adRequestFailed = false;
    adsLoader.requestAds(adsRequest);
  });
}

function htmlToElement(html) {
  var template = document.createElement('template');
  template. /*OK*/innerHTML = html;
  return template.content.firstChild;
}

/**
 * Triggered when the user clicks on the big play button div.
 *
 * @visibleForTesting
 */

function onClick(global) {
  playbackStarted = true;
  uiTicker = setInterval(uiTickerClick, 500);
  bigPlayDiv.removeEventListener(interactEvent, onClick);
  _srcStyle.setStyle(bigPlayDiv, 'display', 'none');
  adDisplayContainer.initialize();
  videoPlayer.load();
  playAds(global);
}

/**
 * Starts ad playback. If the ad request has not yte resolved, calls itself
 * again after 250ms.
 *
 * @visibleForTesting
 */

function playAds(global) {
  if (adsManager) {
    // Ad request resolved.
    try {
      adsManager.init(videoWidth, videoHeight, global.google.ima.ViewMode.NORMAL);
      window.parent. /*OK*/postMessage({ event: VideoEvents.PLAY }, '*');
      adsManager.start();
    } catch (adError) {
      window.parent. /*OK*/postMessage({ event: VideoEvents.PLAY }, '*');
      playVideo();
    }
  } else if (!adRequestFailed) {
    // Ad request did not yet resolve but also did not yet fail.
    setTimeout(playAds.bind(null, global), 250);
  } else {
    // Ad request failed.
    window.parent. /*OK*/postMessage({ event: VideoEvents.PLAY }, '*');
    playVideo();
  }
}

/**
 * Called when the content completes.
 *
 * @visibleForTesting
 */

function onContentEnded() {
  contentComplete = true;
  adsLoader.contentComplete();
}

/**
 * Called when the IMA SDK has an AdsManager ready for us.
 *
 * @visibleForTesting
 */

function onAdsManagerLoaded(global, adsManagerLoadedEvent) {
  var adsRenderingSettings = new global.google.ima.AdsRenderingSettings();
  adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
  adsRenderingSettings.uiElements = [global.google.ima.UiElements.AD_ATTRIBUTION, global.google.ima.UiElements.COUNTDOWN];
  adsManager = adsManagerLoadedEvent.getAdsManager(videoPlayer, adsRenderingSettings);
  adsManager.addEventListener(global.google.ima.AdErrorEvent.Type.AD_ERROR, onAdError);
  adsManager.addEventListener(global.google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, onContentPauseRequested.bind(null, global));
  adsManager.addEventListener(global.google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, onContentResumeRequested);
  if (muteAdsManagerOnLoaded) {
    adsManager.setVolume(0);
  }
  window.parent. /*OK*/postMessage({ event: VideoEvents.LOAD }, '*');
}

/**
 * Called when we encounter an error trying to load ads.
 *
 * @visibleForTesting
 */

function onAdsLoaderError() {
  adRequestFailed = true;
  playVideo();
}

/**
 * Called when we encounter an error trying to play ads.
 *
 * @visibleForTesting
 */

function onAdError() {
  if (adsManager) {
    adsManager.destroy();
  }
  playVideo();
}

/**
 * Called by the IMA SDK. Pauses the content and readies the player for ads.
 *
 * @visibleForTesting
 */

function onContentPauseRequested(global) {
  if (adsManagerWidthOnLoad) {
    adsManager.resize(adsManagerWidthOnLoad, adsManagerHeightOnLoad, global.google.ima.ViewMode.NORMAL);
    adsManagerWidthOnLoad = null;
    adsManagerHeightOnLoad = null;
  }
  adsActive = true;
  videoPlayer.removeEventListener(interactEvent, showControls);
  _srcStyle.setStyle(adContainerDiv, 'display', 'block');
  videoPlayer.removeEventListener('ended', onContentEnded);
  hideControls();
  videoPlayer.pause();
}

/**
 * Called by the IMA SDK. Resumes content after an ad break.
 *
 * @visibleForTesting
 */

function onContentResumeRequested() {
  adsActive = false;
  videoPlayer.addEventListener(interactEvent, showControls);
  if (!contentComplete) {
    // CONTENT_RESUME will fire after post-rolls as well, and we don't want to
    // resume content in that case.
    videoPlayer.addEventListener('ended', onContentEnded);
    playVideo();
  }
}

/**
 * Called when our ui timer goes off. Updates the player UI.
 */
function uiTickerClick() {
  updateUi(videoPlayer.currentTime, videoPlayer.duration);
}

/**
 * Updates the video player UI.
 *
 * @visibleForTesting
 */

function updateUi(currentTime, duration) {
  timeNode.textContent = formatTime(currentTime) + ' / ' + formatTime(duration);
  var progressPercent = Math.floor(currentTime / duration * 100);
  _srcStyle.setStyle(progressLine, 'width', progressPercent + '%');
  _srcStyle.setStyle(progressMarkerDiv, 'left', progressPercent - 1 + '%');
}

/**
 * Formats an int in seconds into a string of the format X:XX:XX. Omits the
 * hour if the content is less than one hour.
 *
 * @visibleForTesting
 */

function formatTime(time) {
  if (isNaN(time)) {
    return '00:00';
  }
  var timeString = '';
  var hours = Math.floor(time / 3600);
  if (hours > 0) {
    timeString += hours + ':';
  }
  var minutes = Math.floor(time % 3600 / 60);
  timeString += zeroPad(minutes) + ':';
  var seconds = Math.floor(time - (hours * 3600 + minutes * 60));
  timeString += zeroPad(seconds);
  return timeString;
}

/**
 * Zero-pads the provided int and returns a string of length 2.
 *
 * @visibleForTesting
 */

function zeroPad(input) {
  input = String(input);
  return input.length == 1 ? '0' + input : input;
}

/**
 * Detects clicks on the progress bar.
 */
function onProgressClick(event) {
  // Call this logic once to make sure we still seek if the user just clicks
  // instead of clicking and dragging.
  clearInterval(hideControlsTimeout);
  onProgressMove(event);
  clearInterval(uiTicker);
  document.addEventListener(mouseMoveEvent, onProgressMove);
  document.addEventListener(mouseUpEvent, onProgressClickEnd);
}

/**
 * Detects the end of interaction on the progress bar.
 */
function onProgressClickEnd() {
  document.removeEventListener(mouseMoveEvent, onProgressMove);
  document.removeEventListener(mouseUpEvent, onProgressClickEnd);
  uiTicker = setInterval(uiTickerClick, 500);
  videoPlayer.currentTime = videoPlayer.duration * seekPercent;
  // Reset hide controls timeout.
  showControls();
}

/**
 * Detects when the user clicks and drags on the progress bar.
 */
function onProgressMove(event) {
  var progressWrapperPosition = getPagePosition(progressBarWrapperDiv);
  var progressListStart = progressWrapperPosition.x;
  var progressListWidth = progressBarWrapperDiv. /*OK*/offsetWidth;

  // Handle Android Chrome touch events.
  var eventX = event.clientX || event.touches[0].pageX;

  seekPercent = (eventX - progressListStart) / progressListWidth;
  if (seekPercent < 0) {
    seekPercent = 0;
  } else if (seekPercent > 1) {
    seekPercent = 1;
  }
  updateUi(videoPlayer.duration * seekPercent, videoPlayer.duration);
}

/**
 * Returns the x,y coordinates of the given element relative to the window.
 */
function getPagePosition(el) {
  var lx = undefined,
      ly = undefined;
  for (lx = 0, ly = 0; el != null; lx += el. /*OK*/offsetLeft, ly += el. /*OK*/offsetTop, el = el. /*OK*/offsetParent) {};
  return { x: lx, y: ly };
}

/**
 * Called when the user clicks on the play / pause button.
 *
 * @visibleForTesting
 */

function onPlayPauseClick() {
  if (playerState == PlayerStates.PLAYING) {
    pauseVideo(null);
  } else {
    playVideo();
  }
}

/**
 * Plays the content video.
 *
 * @visibleForTesting
 */

function playVideo() {
  _srcStyle.setStyle(adContainerDiv, 'display', 'none');
  playerState = PlayerStates.PLAYING;
  // Kick off the hide controls timer.
  showControls();
  _srcStyle.setStyle(playPauseDiv, 'line-height', '1.4em');
  playPauseNode.textContent = pauseChars;
  window.parent. /*OK*/postMessage({ event: VideoEvents.PLAY }, '*');
  videoPlayer.play();
}

/**
 * Pauses the video player.
 *
 * @visibleForTesting
 */

function pauseVideo(event) {
  videoPlayer.pause();
  playerState = PlayerStates.PAUSED;
  // Show controls and keep them there because we're paused.
  clearInterval(hideControlsTimeout);
  if (!adsActive) {
    showControls();
  }
  playPauseNode.textContent = playChar;
  _srcStyle.setStyle(playPauseDiv, 'line-height', '');;
  window.parent. /*OK*/postMessage({ event: VideoEvents.PAUSE }, '*');
  if (event && event.type == 'webkitendfullscreen') {
    // Video was paused because we exited fullscreen.
    videoPlayer.removeEventListener('webkitendfullscreen', pauseVideo);
  }
}

/**
 * Called when the user clicks on the fullscreen button. Makes the video player
 * fullscreen
 */
function onFullscreenClick(global) {
  if (fullscreen) {
    // The video is currently in fullscreen mode
    var cancelFullscreen = global.document.exitFullscreen || global.document.exitFullScreen || global.document.webkitCancelFullScreen || global.document.mozCancelFullScreen;
    if (cancelFullscreen) {
      cancelFullscreen.call(document);
    }
  } else {
    // Try to enter fullscreen mode in the browser
    var requestFullscreen = global.document.documentElement.requestFullscreen || global.document.documentElement.webkitRequestFullscreen || global.document.documentElement.mozRequestFullscreen || global.document.documentElement.requestFullScreen || global.document.documentElement.webkitRequestFullScreen || global.document.documentElement.mozRequestFullScreen;
    if (requestFullscreen) {
      fullscreenWidth = window.screen.width;
      fullscreenHeight = window.screen.height;
      requestFullscreen.call(global.document.documentElement);
    } else {
      // Figure out how to make iPhone fullscren work here - I've got nothing.
      videoPlayer.webkitEnterFullscreen();
      // Pause the video when we leave fullscreen. iPhone does this
      // automatically, but we still use pauseVideo as an event handler to
      // sync the UI.
      videoPlayer.addEventListener('webkitendfullscreen', pauseVideo);
      nativeFullscreen = true;
      onFullscreenChange(global);
    }
  }
}

/**
 * Called when the fullscreen mode of the browser or content player changes.
 */
function onFullscreenChange(global) {
  if (fullscreen) {
    // Resize the ad container
    adsManager.resize(videoWidth, videoHeight, global.google.ima.ViewMode.NORMAL);
    adsManagerWidthOnLoad = null;
    adsManagerHeightOnLoad = null;
    // Return the video to its original size and position
    _srcStyle.setStyle(wrapperDiv, 'width', videoWidth + 'px');
    _srcStyle.setStyle(wrapperDiv, 'height', videoHeight + 'px');
    fullscreen = false;
  } else {
    // The user just entered fullscreen
    if (!nativeFullscreen) {
      // Resize the ad container
      adsManager.resize(fullscreenWidth, fullscreenHeight, global.google.ima.ViewMode.FULLSCREEN);
      adsManagerWidthOnLoad = null;
      adsManagerHeightOnLoad = null;
      // Make the video take up the entire screen
      _srcStyle.setStyle(wrapperDiv, 'width', fullscreenWidth + 'px');
      _srcStyle.setStyle(wrapperDiv, 'height', fullscreenHeight + 'px');
      hideControls();
    }
    fullscreen = true;
  }
}

/**
 * Show video controls and reset hide controls timeout.
 *
 * @visibleForTesting
 */

function showControls() {
  _srcStyle.setStyle(controlsDiv, 'display', 'block');
  // Hide controls after 3 seconds
  if (playerState == PlayerStates.PLAYING) {
    // Reset hide controls timer.
    clearInterval(hideControlsTimeout);
    hideControlsTimeout = setTimeout(hideControls, 3000);
  }
}

/**
 * Hide video controls.
 *
 * @visibleForTesting
 */

function hideControls() {
  _srcStyle.setStyle(controlsDiv, 'display', 'none');
}

/**
 * Handles messages from the top window.
 */
function onMessage(global, event) {
  var msg = _srcTypes.isObject(event.data) ? event.data : _srcJson.tryParseJson(event.data);
  if (msg === undefined) {
    return; // We only process valid JSON.
  }
  if (msg.event && msg.func) {
    switch (msg.func) {
      case 'playVideo':
        if (adsActive) {
          adsManager.resume();
          window.parent. /*OK*/postMessage({ event: VideoEvents.PLAY }, '*');
        } else if (playbackStarted) {
          playVideo();
        } else {
          // Auto-play support
          onClick(global);
        }
        break;
      case 'pauseVideo':
        if (adsActive) {
          adsManager.pause();
          window.parent. /*OK*/postMessage({ event: VideoEvents.PAUSE }, '*');
        } else if (playbackStarted) {
          pauseVideo(null);
        }
        break;
      case 'mute':
        videoPlayer.volume = 0;
        videoPlayer.muted = true;
        if (adsManager) {
          adsManager.setVolume(0);
        } else {
          muteAdsManagerOnLoaded = true;
        }
        window.parent. /*OK*/postMessage({ event: VideoEvents.MUTED }, '*');
        break;
      case 'unMute':
        videoPlayer.volume = 1;
        videoPlayer.muted = false;
        if (adsManager) {
          adsManager.setVolume(1);
        } else {
          muteAdsManagerOnLoaded = false;
        }
        window.parent. /*OK*/postMessage({ event: VideoEvents.UNMUTED }, '*');
        break;
      case 'resize':
        if (msg.args && msg.args.width && msg.args.height) {
          _srcStyle.setStyle(wrapperDiv, 'width', msg.args.width + 'px');
          _srcStyle.setStyle(wrapperDiv, 'height', msg.args.height + 'px');
          _srcStyle.setStyle(bigPlayDiv, 'width', msg.args.width + 'px');
          _srcStyle.setStyle(bigPlayDiv, 'height', msg.args.height + 'px');
          if (adsActive) {
            adsManager.resize(msg.args.width, msg.args.height, global.google.ima.ViewMode.NORMAL);
          } else {
            adsManagerWidthOnLoad = msg.args.width;
            adsManagerHeightOnLoad = msg.args.height;
          }
        }
        break;
    }
  }
}

/**
 * Returns the properties we need to access for testing.
 *
 * @visibleForTesting
 */

function getPropertiesForTesting() {
  return { adContainerDiv: adContainerDiv, adRequestFailed: adRequestFailed, adsActive: adsActive, adsManagerWidthOnLoad: adsManagerWidthOnLoad,
    adsManagerHeightOnLoad: adsManagerHeightOnLoad, contentComplete: contentComplete, controlsDiv: controlsDiv, hideControlsTimeout: hideControlsTimeout,
    interactEvent: interactEvent, pauseChars: pauseChars, playbackStarted: playbackStarted, playChar: playChar, playerState: playerState,
    PlayerStates: PlayerStates, playPauseDiv: playPauseDiv, playPauseNode: playPauseNode, progressLine: progressLine,
    progressMarkerDiv: progressMarkerDiv, timeNode: timeNode, uiTicker: uiTicker, videoPlayer: videoPlayer };
}

/**
 * Sets the big play button div.
 *
 * @visibleForTesting
 */

function setBigPlayDivForTesting(div) {
  bigPlayDiv = div;
}

/**
 * Sets the ad display container.
 *
 * @visibleForTesting
 */

function setAdDisplayContainerForTesting(adc) {
  adDisplayContainer = adc;
}

/**
 * Sets the video width and height.
 *
 * @visibleForTesting
 */

function setVideoWidthAndHeightForTesting(width, height) {
  videoWidth = width;
  videoHeight = height;
}

/**
 * Sets the ad request failed flag.
 *
 * @visibleForTesting
 */

function setAdRequestFailedForTesting(newValue) {
  adRequestFailed = newValue;
}

/**
 * Sets the ads loader.
 *
 * @visibleForTesting
 */

function setAdsLoaderForTesting(newAdsLoader) {
  adsLoader = newAdsLoader;
}

/**
 * Sets the flag to mute the ads manager when it loads.
 *
 * @visibleForTesting
 */

function setMuteAdsManagerOnLoadedForTesting(shouldMute) {
  muteAdsManagerOnLoaded = shouldMute;
}

/**
 * Sets the ads manager.
 *
 * @visibleForTesting
 */

function setAdsManagerForTesting(newAdsManager) {
  adsManager = newAdsManager;
}

/**
 * Sets the ads manager dimensions on load.
 *
 * @visibleForTesting
 */

function setAdsManagerDimensionsOnLoadForTesting(width, height) {
  adsManagerWidthOnLoad = width;
  adsManagerHeightOnLoad = height;
}

/**
 * Sets the content complete flag.
 *
 * @visibleForTesting
 */

function setContentCompleteForTesting(newContentComplete) {
  contentComplete = newContentComplete;
}

/**
 * Sets the video player.
 *
 * @visibleForTesting
 */

function setVideoPlayerForTesting(newPlayer) {
  videoPlayer = newPlayer;
}

/**
 * Sets the player state.
 *
 * @visibleForTesting
 */

function setPlayerStateForTesting(newState) {
  playerState = newState;
}

/**
 * Sets the hideControlsTimeout
 *
 * @visibleForTesting
 */

function setHideControlsTimeoutForTesting(newTimeout) {
  hideControlsTimeout = newTimeout;
}

/**
 * Events
 *
 * Copied from src/video-interface.js.
 *
 * @constant {!Object<string, string>}
 */
var VideoEvents = {
  /**
   * load
   *
   * Fired when the video player is loaded and calls to methods such as `play()`
   * are allowed.
   *
   * @event load
   */
  LOAD: 'load',

  /**
   * play
   *
   * Fired when the video plays.
   *
   * @event play
   */
  PLAY: 'play',

  /**
   * pause
   *
   * Fired when the video pauses.
   *
   * @event pause
   */
  PAUSE: 'pause',

  /**
   * muted
   *
   * Fired when the video is muted.
   *
   * @event play
   */
  MUTED: 'muted',

  /**
   * unmuted
   *
   * Fired when the video is unmuted.
   *
   * @event pause
   */
  UNMUTED: 'unmuted',

  /**
   * amp:video:visibility
   *
   * Fired when the video's visibility changes. Normally fired
   * from `viewportCallback`.
   *
   * @event amp:video:visibility
   * @property {boolean} visible Whether the video player is visible or not.
   */
  VISIBILITY: 'amp:video:visibility',

  /**
   * reload
   *
   * Fired when the video's src changes.
   *
   * @event reload
   */
  RELOAD: 'reloaded'
};

},{"../../3p/3p":1,"../../src/json":140,"../../src/style":148,"../../src/types":149}],69:[function(require,module,exports){
exports.__esModule = true;
exports.getMultiSizeDimensions = getMultiSizeDimensions;
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

var _srcLog = require('../../src/log');

/**
 * Given the amp-ad data attribute containing the multi-size dimensions, and a
 * set of primary dimensions, this function will return all valid multi-size
 * [width, height] pairs in an array.
 *
 * @param {string} multiSizeDataStr The amp-ad data attribute containing the
 *   multi-size dimensions.
 * @param {number} primaryWidth The primary width of the ad slot.
 * @param {number} primaryHeight The primary height of the ad slot.
 * @param {!Array<Array<number>>=} opt_dimensions An array into which to put
 *   the multi-size dimensions.
 * @param {boolean} multiSizeValidation A flag that if set to true will enforce
 *   the rule that ensures multi-size dimensions are no less than 2/3rds of
 *   their primary dimension's counterpart.
 * @return {!Array<Array<number>>} An array of dimensions.
 */

function getMultiSizeDimensions(multiSizeDataStr, primaryWidth, primaryHeight, multiSizeValidation, opt_dimensions) {

  var dimensions = opt_dimensions || [];
  var arrayOfSizeStrs = multiSizeDataStr.split(',');

  arrayOfSizeStrs.forEach(function (sizeStr) {

    var size = sizeStr.split('x');

    // Make sure that each size is specified in the form val1xval2.
    if (size.length != 2) {
      _srcLog.user().error('AMP-AD', 'Invalid multi-size data format \'' + sizeStr + '\'.');
      return;
    }

    var width = Number(size[0]);
    var height = Number(size[1]);

    // Make sure that both dimensions given are numbers.
    if (!validateDimensions(width, height, function (w) {
      return isNaN(w);
    }, function (h) {
      return isNaN(h);
    }, function (_ref) {
      var badDim = _ref.badDim;
      var badVal = _ref.badVal;
      return 'Invalid ' + badDim + ' of ' + badVal + ' given for secondary size.';
    })) {
      return;
    }

    // Check that secondary size is not larger than primary size.
    if (!validateDimensions(width, height, function (w) {
      return w > primaryWidth;
    }, function (h) {
      return h > primaryHeight;
    }, function (_ref2) {
      var badDim = _ref2.badDim;
      var badVal = _ref2.badVal;
      return 'Secondary ' + badDim + ' ' + badVal + ' ' + ('can\'t be larger than the primary ' + badDim + '.');
    })) {
      return;
    }

    // Check that if multi-size-validation is on, that the secondary sizes
    // are at least minRatio of the primary size.
    if (multiSizeValidation) {
      var _ret = (function () {
        // The minimum ratio of each secondary dimension to its corresponding
        // primary dimension.
        var minRatio = 2 / 3;
        var minWidth = minRatio * primaryWidth;
        var minHeight = minRatio * primaryHeight;
        if (!validateDimensions(width, height, function (w) {
          return w < minWidth;
        }, function (h) {
          return h < minHeight;
        }, function (_ref3) {
          var badDim = _ref3.badDim;
          var badVal = _ref3.badVal;
          return 'Secondary ' + badDim + ' ' + badVal + ' is ' + ('smaller than 2/3rds of the primary ' + badDim + '.');
        })) {
          return {
            v: undefined
          };
        }
      })();

      if (typeof _ret === 'object') return _ret.v;
    }

    // Passed all checks! Push additional size to dimensions.
    dimensions.push([width, height]);
  });

  return dimensions;
}

/**
 * A helper function for determining whether a given width or height violates
 * some condition.
 *
 * Checks the width and height against their corresponding conditions. If
 * either of the conditions fail, the errorBuilder function will be called with
 * the appropriate arguments, its result will be logged to user().error, and
 * validateDimensions will return false. Otherwise, validateDimensions will
 * only return true.
 *
 * @param {(number|string)} width
 * @param {(number|string)} height
 * @param {!function((number|string)): boolean} widthCond
 * @param {!function((number|string)): boolean} heightCond
 * @param {!function(!{badDim: string, badVal: (string|number)}): string}
 *    errorBuilder A function that will produce an informative error message.
 * @return {boolean}
 */
function validateDimensions(width, height, widthCond, heightCond, errorBuilder) {
  var badParams = null;
  if (widthCond(width) && heightCond(height)) {
    badParams = {
      badDim: 'width and height',
      badVal: width + 'x' + height
    };
  } else if (widthCond(width)) {
    badParams = {
      badDim: 'width',
      badVal: width
    };
  } else if (heightCond(height)) {
    badParams = {
      badDim: 'height',
      badVal: height
    };
  }
  if (badParams) {
    _srcLog.user().error('AMP-AD', errorBuilder(badParams));
    return false;
  }
  return true;
}

},{"../../src/log":141}],70:[function(require,module,exports){
exports.__esModule = true;
exports.gumgum = gumgum;
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

var _p3p = require('../3p/3p');

var _srcStyle = require('../src/style');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function gumgum(global, data) {
  _p3p.validateData(data, ['zone', 'slot']);

  var win = window,
      ctx = win.context,
      dom = global.document.getElementById('c'),
      ampWidth = parseInt(data.width || '0', 10),
      ampHeight = parseInt(data.height || '0', 10),
      ggevents = global.ggevents || [];

  var max = Math.max,
      slotId = parseInt(data.slot, 10),
      onLoad = function (type) {
    return function (evt) {
      var ad = Object.assign({ width: 0, height: 0 }, evt.ad || {}),
          identifier = ['GUMGUM', type, evt.id].join('_');
      ctx.reportRenderedEntityIdentifier(identifier);
      ctx.renderStart({
        width: max(ampWidth, ad.width),
        height: max(ampHeight, ad.height)
      });
    };
  },
      noFill = function () {
    ctx.noContentAvailable();
  };

  // Ads logic starts
  global.ggv2id = data.zone;
  global.ggevents = ggevents;
  global.sourceUrl = context.sourceUrl;
  global.sourceReferrer = context.referrer;

  if (slotId) {
    // Slot Ad
    var ins = global.document.createElement('div');
    _srcStyle.setStyles(ins, {
      display: 'block',
      width: '100%',
      height: '100%'
    });
    ins.setAttribute('data-gg-slot', slotId);
    dom.appendChild(ins);
    // Events
    ggevents.push({
      'slot.nofill': noFill,
      'slot.close': noFill,
      'slot.load': onLoad('SLOT')
    });
    // Main script
    _p3p.loadScript(global, 'https://g2.gumgum.com/javascripts/ad.js');
  } else {
    // No valid configuration
    ctx.noContentAvailable();
  }
}

},{"../3p/3p":1,"../src/style":148}],71:[function(require,module,exports){
exports.__esModule = true;
exports.holder = holder;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function holder(global, data) {
  _p3p.validateData(data, ['block'], []);
  var wcl = global.context.location;
  var n = navigator.userAgent;
  var l = '&r' + Math.round(Math.random() * 10000000) + '&h' + wcl.href;
  if (!(n.indexOf('Safari') != -1 && n.indexOf('Chrome') == -1)) {
    l += '&c1';
  }
  data.queue = l;
  _p3p.writeScript(global, 'https://i.holder.com.ua/js2/holder/ajax/ampv1.js');
}

},{"../3p/3p":1}],72:[function(require,module,exports){
exports.__esModule = true;
exports.ibillboard = ibillboard;
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

var _p3p = require('../3p/3p');

var validHosts = ['https://go.eu.bbelements.com', 'https://go.idnes.bbelements.com', 'https://go.goldbachpoland.bbelements.com', 'https://go.pol.bbelements.com', 'https://go.idmnet.bbelements.com'];

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function ibillboard(global, data) {

  _p3p.validateData(data, ['src']);
  var src = data.src;
  _p3p.validateSrcPrefix(validHosts, src);

  _p3p.writeScript(global, src);
}

},{"../3p/3p":1}],73:[function(require,module,exports){
exports.__esModule = true;
exports.imedia = imedia;
/**
 * Copyright 2017 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function imedia(global, data) {
  _p3p.validateData(data, ['id', 'positions']);
  var positions = JSON.parse(data.positions);
  var mW = context.isMaster ? global : context.master;

  // create parent element
  var parentElement = document.createElement('div');
  parentElement.id = data.id;
  global.document.getElementById('c').appendChild(parentElement);

  // array of all ad elements and matching contexts through all iframes
  if (!mW.inPagePositions) {
    mW.inPagePositions = [];
  }
  mW.inPagePositions.push({ parentElement: parentElement, context: global.context });

  _p3p.computeInMasterFrame(global, 'imedia-load', function (done) {
    _p3p.loadScript(global, 'https://i.imedia.cz/js/im3.js', function () {
      if (global.im != null) {
        mW.im = global.im;
        mW.im.conf.referer = context.location.href;

        // send request to get all ads
        mW.im.getAds(positions, { AMPcallback: function (ads) {
            mW.ads = ads;
            done(null);
          } });
      }
    });
  }, function () {
    mW.inPagePositions = mW.inPagePositions.filter(function (inPagePostion) {
      var used = true;
      positions.filter(function (position, index) {

        // match right element and zone to write advert from adserver
        if (inPagePostion.parentElement.id == position.id) {
          used = false;
          position.id = inPagePostion.parentElement; // right element "c" to position obj.
          if (mW.im.writeAd) {
            mW.im.writeAd(mW.ads[index], position);

            // inform AMP runtime when the ad starts rendering
            if (mW.ads[index].impress) {
              inPagePostion.context.renderStart();
            } else {
              inPagePostion.context.noContentAvailable();
            }
          }
          return false;
        }
      });
      return used; // remove (filter) element filled with add
    });
  });
}

;

},{"../3p/3p":1}],74:[function(require,module,exports){
exports.__esModule = true;
exports.imobile = imobile;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function imobile(global, data) {
  global.imobileParam = data;
  _p3p.writeScript(global, 'https://spamp.i-mobile.co.jp/script/amp.js');
}

},{"../3p/3p":1}],75:[function(require,module,exports){
exports.__esModule = true;
exports.improvedigital = improvedigital;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function improvedigital(global, data) {
  _p3p.validateData(data, ['placement'], ['width', 'height', 'optin', 'keyvalue']);

  var url = 'https://ad.360yield.com' + '/adj?' + 'p=' + encodeURIComponent(data.placement) + '&w=' + encodeURIComponent(data.width) + '&h=' + encodeURIComponent(data.height) + '&optin=' + encodeURIComponent(data.optin) + '&tz=' + new Date().getTimezoneOffset();

  var value = data.keyvalue;
  var newData = '';
  var amps = '&';
  var validKey = 0;

  if (value && value.length > 0) {
    var keys = value.split('&');
    for (var i = 0; i < keys.length; i++) {
      if (!keys[i]) {
        continue;
      }
      var segment = keys[i].split('=');
      var segment1 = segment[1] ? encodeURIComponent(segment[1]) : '';
      if (validKey > 0) {
        newData += amps;
      }
      validKey++;
      newData += segment[0] + '=' + segment1;
    }
  }
  if (newData) {
    url += '&' + newData;
  }
  _p3p.writeScript(global, url);
}

},{"../3p/3p":1}],76:[function(require,module,exports){
exports.__esModule = true;
exports.inmobi = inmobi;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function inmobi(global, data) {
  _p3p.validateData(data, ['siteid', 'slotid'], []);

  var inmobiConf = {
    siteid: data.siteid,
    slot: data.slotid,
    manual: true,
    onError: function (code) {
      if (code == 'nfr') {
        global.context.noContentAvailable();
        document.getElementById('my-ad-slot').style. /*OK*/display = 'none';
      }
    },
    onSuccess: function () {
      global.context.renderStart();
    }
  };

  _p3p.writeScript(global, 'https://cf.cdn.inmobi.com/ad/inmobi.secure.js', function () {
    global.document.write('<div id=\'my-ad-slot\'></div>');
    global._inmobi.getNewAd(document.getElementById('my-ad-slot'), inmobiConf);
  });
}

},{"../3p/3p":1}],77:[function(require,module,exports){
exports.__esModule = true;
exports.ix = ix;
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

var _p3p = require('../3p/3p');

var _adsGoogleDoubleclick = require('../ads/google/doubleclick');

var DEFAULT_TIMEOUT = 500; // ms
var EVENT_SUCCESS = 0;
var EVENT_TIMEOUT = 1;
var EVENT_ERROR = 2;
var EVENT_BADTAG = 3;

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function ix(global, data) {
  if (!('slot' in data)) {
    global.CasaleArgs = data;
    _p3p.writeScript(global, 'https://js-sec.indexww.com/indexJTag.js');
  } else {
    var _ret = (function () {
      //DFP ad request call

      var start = Date.now();
      var calledDoubleclick = false;
      data.ixTimeout = isNaN(data.ixTimeout) ? DEFAULT_TIMEOUT : data.ixTimeout;
      var timer = setTimeout(function () {
        callDoubleclick(EVENT_TIMEOUT);
      }, data.ixTimeout);

      var callDoubleclick = function (code) {
        if (calledDoubleclick) {
          return;
        }
        calledDoubleclick = true;
        clearTimeout(timer);
        reportStats(data.ixId, data.ixSlot, data.slot, start, code);
        prepareData(data);
        _adsGoogleDoubleclick.doubleclick(global, data);
      };

      if (typeof data.ixId === 'undefined' || isNaN(data.ixId)) {
        callDoubleclick(EVENT_BADTAG);
        return {
          v: undefined
        };
      }

      global.IndexArgs = {
        ampCallback: callDoubleclick,
        ampSuccess: EVENT_SUCCESS,
        ampError: EVENT_ERROR
      };

      _p3p.loadScript(global, 'https://js-sec.indexww.com/apl/amp.js', undefined, function () {
        callDoubleclick(EVENT_ERROR);
      });
    })();

    if (typeof _ret === 'object') return _ret.v;
  }
}

function prepareData(data) {
  for (var attr in data) {
    if (data.hasOwnProperty(attr) && /^ix[A-Z]/.test(attr)) {
      delete data[attr];
    }
  }
  data.targeting = data.targeting || {};
  data.targeting['IX_AMP'] = '1';
}

function reportStats(siteID, slotID, dfpSlot, start, code) {
  try {
    if (code == EVENT_BADTAG) {
      return;
    }
    var xhttp = new XMLHttpRequest();
    xhttp.withCredentials = true;

    var deltat = Date.now() - start;
    var ts = start / 1000 >> 0;
    var ets = Date.now() / 1000 >> 0;
    var url = 'https://as-sec.casalemedia.com/headerstats?s=' + siteID;
    if (typeof window.context.location.href !== 'undefined') {
      url += '&u=' + encodeURIComponent(window.context.location.href);
    }
    var stats = '{"p":"display","d":"mobile","t":' + ts + ',';
    stats += '"sl":[{"s": "' + slotID + '",';
    stats += '"t":' + ets + ',';
    stats += '"e": [{';
    if (code == EVENT_SUCCESS) {
      stats += '"n":"amp-s",';
    } else if (code == EVENT_TIMEOUT) {
      stats += '"n":"amp-t",';
    } else {
      stats += '"n":"amp-e",';
    }
    stats += '"v":"' + deltat + '",';
    stats += '"b": "INDX","x": "' + dfpSlot.substring(0, 64) + '"}]}]}';

    xhttp.open('POST', url, true);
    xhttp.setRequestHeader('Content-Type', 'application/json');
    xhttp.send(stats);
  } catch (e) {};
}

},{"../3p/3p":1,"../ads/google/doubleclick":67}],78:[function(require,module,exports){
exports.__esModule = true;
exports.kargo = kargo;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function kargo(global, data) {
  /*eslint "google-camelcase/google-camelcase": 0*/

  _p3p.validateData(data, ['site', 'slot'], ['options']);

  // Kargo AdTag url
  var kargoScriptUrl = 'https://storage.cloud.kargo.com/ad/network/tag/v3/' + data.site + '.js';

  // parse extra ad call options (optional)
  var options = {};
  if (data.options != null) {
    try {
      options = JSON.parse(data.options);
    } catch (e) {}
  }

  // Add window source reference to ad options
  options.source_window = global;

  _p3p.computeInMasterFrame(global, 'kargo-load', function (done) {
    var _this = this;

    // load AdTag in Master window
    _p3p.loadScript(this, kargoScriptUrl, function () {
      var success = false;
      if (_this.Kargo != null && _this.Kargo.loaded) {
        success = true;
      }

      done(success);
    });
  }, function (success) {
    if (success) {
      var w = options.source_window;

      // Add reference to Kargo api to this window if it's not the Master window
      if (!w.context.isMaster) {
        w.Kargo = w.context.master.Kargo;
      }

      w.Kargo.getAd(data.slot, options);
    } else {
      throw new Error('Kargo AdTag failed to load');
    }
  });
}

},{"../3p/3p":1}],79:[function(require,module,exports){
exports.__esModule = true;
exports.kiosked = kiosked;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function kiosked(global, data) {
  var scriptId = undefined;
  _p3p.validateData(data, ['scriptid'], []);
  if (data.hasOwnProperty('scriptid')) {
    scriptId = data['scriptid'];
  }
  window.addEventListener('kioskedAdRender', function () {
    global.context.renderStart();
  }, false);

  window.addEventListener('kioskedAdNoFill', function () {
    global.context.noContentAvailable();
  }, false);

  _p3p.writeScript(global, 'https://scripts.kiosked.com/loader/kiosked-ad.js?staticTagId=' + scriptId);
}

},{"../3p/3p":1}],80:[function(require,module,exports){
exports.__esModule = true;
exports.kixer = kixer;
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

var _p3p = require('../3p/3p');

/* global
__kxamp: false,
__kx_ad_slots: false,
__kx_ad_start: false,
__kx_viewability: false,
*/

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function kixer(global, data) {
  /*eslint "google-camelcase/google-camelcase": 0*/

  _p3p.validateData(data, ['adslot'], []);

  var inView = false;
  var viewed = false;
  var viewTimer = null;

  var d = global.document.createElement('div');
  d.id = '__kx_ad_' + data.adslot;
  global.document.getElementById('c').appendChild(d);

  var kxload = function () {
    d.removeEventListener('load', kxload, false);
    if (d.childNodes.length > 0) {
      global.context.renderStart();
    } else {
      global.context.noContentAvailable();
    }
  };
  d.addEventListener('load', kxload, false); // Listen for the kixer load event

  var kxviewCheck = function (intersectionEntry) {
    inView = intersectionEntry.intersectionRatio > 0.5; // Half of the unit is in the viewport
    if (inView) {
      if (!viewed && viewTimer == null) {
        // If the ad hasn't been viewed and the timer is not set
        viewTimer = setTimeout(kxviewFire, 900); // Set a Timeout to check the ad in 900ms and fire the view
      }
    } else {
        if (viewTimer) {
          // If the Timeout is set
          clearTimeout(viewTimer); // Clear the Timeout
          viewTimer = null;
        }
      }
  };

  var kxviewFire = function () {
    if (inView) {
      // if the ad is still in the viewport
      if (typeof __kx_viewability.process_locked === 'function') {
        viewed = true;
        __kx_viewability.process_locked(data.adslot); // Fire kixer view
      }
    }
  };

  global.context.observeIntersection(function (changes) {
    changes.forEach(function (c) {
      kxviewCheck(c);
    });
  });

  _p3p.loadScript(global, 'https://cdn.kixer.com/ad/load.js', function () {
    __kxamp[data.adslot] = 1;
    __kx_ad_slots.push(data.adslot);
    __kx_ad_start();
  });
}

},{"../3p/3p":1}],81:[function(require,module,exports){
exports.__esModule = true;
exports.ligatus = ligatus;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function ligatus(global, data) {
  var src = data.src;
  _p3p.validateSrcPrefix('https://a-ssl.ligatus.com/', src);
  _p3p.writeScript(global, src);
}

},{"../3p/3p":1}],82:[function(require,module,exports){
exports.__esModule = true;
exports.loka = loka;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function loka(global, data) {
  _p3p.validateData(data, ['unitParams'], []);

  global.lokaParams = data;

  var container = global.document.querySelector('#c');
  container.addEventListener('lokaUnitLoaded', function (e) {
    if (e.detail.isReady) {
      global.context.renderStart();
    } else {
      global.context.noContentAvailable();
    }
  });

  _p3p.loadScript(global, 'https://loka-cdn.akamaized.net/scene/amp.js');
}

},{"../3p/3p":1}],83:[function(require,module,exports){
exports.__esModule = true;
exports.mads = mads;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function mads(global, data) {
  _p3p.validateData(data, ['adrequest'], []);

  _p3p.writeScript(global, 'https://eu2.madsone.com/js/tags.js', function () {
    window.MADSAdrequest.adrequest(JSON.parse(data.adrequest));
  });
}

},{"../3p/3p":1}],84:[function(require,module,exports){
exports.__esModule = true;
exports.mantisDisplay = mantisDisplay;
exports.mantisRecommend = mantisRecommend;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function mantisDisplay(global, data) {
  _p3p.validateData(data, ['property', 'zone'], []);

  global.mantis = global.mantis || [];
  global.mantis.push(['display', 'load', {
    property: data['property']
  }]);

  var d = global.document.createElement('div');
  d.setAttribute('data-mantis-zone', data['zone']);
  global.document.getElementById('c').appendChild(d);

  _p3p.loadScript(global, 'https://assets.mantisadnetwork.com/mantodea.min.js');
}

function mantisRecommend(global, data) {
  _p3p.validateData(data, ['property'], ['css']);

  global.mantis = global.mantis || [];
  global.mantis.push(['recommend', 'load', {
    property: data['property'],
    render: 'recommended',
    css: data['css']
  }]);

  var d = global.document.createElement('div');
  d.setAttribute('id', 'recommended');
  global.document.getElementById('c').appendChild(d);

  _p3p.loadScript(global, 'https://assets.mantisadnetwork.com/recommend.min.js');
}

},{"../3p/3p":1}],85:[function(require,module,exports){
exports.__esModule = true;
exports.mediaimpact = mediaimpact;
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

var _p3p = require('../3p/3p');

/* global asmi: true */

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function mediaimpact(global, data) {
  global.fif = false;
  /* eslint google-camelcase/google-camelcase: 0 */
  global.sas_loadHandler = function (f) {
    if (f.hasAd) {
      f.crea1 || (f.crea1 = {
        width: 300,
        height: 250
      });
      global.context.renderStart({
        width: f.crea1.width,
        height: f.crea1.height
      });
    } else {
      global.context.noContentAvailable();
    }
  };
  window.addEventListener('load', function () {
    asmi.sas.call(data.site + '/(' + data.page + ')', data.format, data.target + ';googleAMP=1;', '', 'sas_' + data.slot.replace('sas_', ''), 1);
  }, false);
  /* global asmiSetup: true */
  /* eslint no-unused-vars: 0 */
  asmiSetup = {
    view: 'm',
    async: true
  };
  _p3p.loadScript(global, 'https://ec-ns.sascdn.com/diff/251/pages/amp_default.js', function () {
    if (!document.getElementById('sas_' + data.slot.replace('sas_', ''))) {
      var adContainer = global.document.createElement('div');
      adContainer.id = 'sas_' + data.slot.replace('sas_', '');
      global.document.body.appendChild(adContainer);
    }
  });
}

},{"../3p/3p":1}],86:[function(require,module,exports){
exports.__esModule = true;
exports.medianet = medianet;
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

var _p3p = require('../3p/3p');

var _srcUrl = require('../src/url');

var _adsGoogleDoubleclick = require('../ads/google/doubleclick');

var mandatoryParams = ['tagtype', 'cid'],
    optionalParams = ['timeout', 'crid', 'misc', 'slot', 'targeting', 'categoryExclusions', 'tagForChildDirectedTreatment', 'cookieOptions', 'overrideWidth', 'overrideHeight', 'loadingStrategy', 'consentNotificationId', 'useSameDomainRenderingUntilDeprecated', 'experimentId', 'multiSize', 'multiSizeValidation'],
    dfpParams = ['slot', 'targeting', 'categoryExclusions', 'tagForChildDirectedTreatment', 'cookieOptions', 'overrideWidth', 'overrideHeight', 'loadingStrategy', 'consentNotificationId', 'useSameDomainRenderingUntilDeprecated', 'experimentId', 'multiSize', 'multiSizeValidation'],
    dfpDefaultTimeout = 1000;

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function medianet(global, data) {
  _p3p.validateData(data, mandatoryParams, optionalParams);

  var publisherUrl = global.context.canonicalUrl || _srcUrl.getSourceUrl(global.context.location.href),
      referrerUrl = global.context.referrer;

  if (data.tagtype === 'headerbidder') {
    //parameter tagtype is used to identify the product the publisher is using. Going ahead we plan to support more product types.
    loadHBTag(global, data, publisherUrl, referrerUrl);
  } else if (data.tagtype === 'cm' && data.crid) {
    loadCMTag(global, data, publisherUrl, referrerUrl);
  } else {
    global.context.noContentAvailable();
  }
}

/**
 * @param {!Window} global
 * @param {!Object} data
 * @param {!string} publisherUrl
 * @param {?string} referrerUrl
 */
function loadCMTag(global, data, publisherUrl, referrerUrl) {
  /*eslint "google-camelcase/google-camelcase": 0*/
  function setMacro(type) {
    if (!type) {
      return;
    }
    var name = 'medianet_' + type;
    if (data.hasOwnProperty(type)) {
      global[name] = data[type];
    }
  }

  function setAdditionalData() {
    data.requrl = publisherUrl || '';
    data.refurl = referrerUrl || '';
    data.versionId = '211213';

    setMacro('width');
    setMacro('height');
    setMacro('crid');
    setMacro('requrl');
    setMacro('refurl');
    setMacro('versionId');
    setMacro('misc');
  }

  function setCallbacks() {
    global._mNAmp = {
      renderStartCb: function (opt_data) {
        global.context.renderStart(opt_data);
      },
      reportRenderedEntityIdentifierCb: function (ampId) {
        global.context.reportRenderedEntityIdentifier(ampId);
      },
      noContentAvailableCb: function () {
        global.context.noContentAvailable();
      }
    };
  }

  function loadScript() {
    var url = 'https://contextual.media.net/ampnmedianet.js?';
    url += 'cid=' + encodeURIComponent(data.cid);
    url += '&https=1';
    url += '&requrl=' + encodeURIComponent(data.requrl);
    url += '&refurl=' + encodeURIComponent(data.refurl);
    _p3p.writeScript(global, url);
  }

  function init() {
    setAdditionalData();
    setCallbacks();
    loadScript();
  }

  init();
}

/**
 * @param {!Window} global
 * @param {!Object} data
 * @param {!string} publisherUrl
 * @param {?string} referrerUrl
 */
function loadHBTag(global, data, publisherUrl, referrerUrl) {
  function deleteUnexpectedDoubleclickParams() {
    var allParams = mandatoryParams.concat(optionalParams);
    var currentParam = '';
    for (var i = 0; i < allParams.length; i++) {
      currentParam = allParams[i];
      if (dfpParams.indexOf(currentParam) === -1 && data[currentParam]) {
        delete data[currentParam];
      }
    }
  }

  var isDoubleClickCalled = false;

  function loadDFP() {
    if (isDoubleClickCalled) {
      return;
    }
    isDoubleClickCalled = true;

    global.advBidxc = global.context.master.advBidxc;
    if (global.advBidxc && typeof global.advBidxc.renderAmpAd === 'function') {
      global.addEventListener('message', function (event) {
        global.advBidxc.renderAmpAd(event, global);
      });
    }

    data.targeting = data.targeting || {};

    if (global.advBidxc && typeof global.advBidxc.setAmpTargeting === 'function') {
      global.advBidxc.setAmpTargeting(global, data);
    }
    deleteUnexpectedDoubleclickParams();
    _adsGoogleDoubleclick.doubleclick(global, data);
  }

  function mnetHBHandle() {
    global.advBidxc = global.context.master.advBidxc;
    if (global.advBidxc && typeof global.advBidxc.registerAmpSlot === 'function') {
      global.advBidxc.registerAmpSlot({
        cb: loadDFP,
        data: data,
        winObj: global
      });
    }
  }

  global.setTimeout(function () {
    loadDFP();
  }, data.timeout || dfpDefaultTimeout);

  _p3p.computeInMasterFrame(global, 'medianet-hb-load', function (done) {
    /*eslint "google-camelcase/google-camelcase": 0*/
    global.advBidxc_requrl = publisherUrl;
    global.advBidxc_refurl = referrerUrl;
    global.advBidxc = {
      registerAmpSlot: function () {},
      setAmpTargeting: function () {},
      renderAmpAd: function () {}
    };
    _p3p.writeScript(global, 'https://contextual.media.net/bidexchange.js?https=1&amp=1&cid=' + encodeURIComponent(data.cid), function () {
      done(null);
    });
  }, mnetHBHandle);
}

},{"../3p/3p":1,"../ads/google/doubleclick":67,"../src/url":151}],87:[function(require,module,exports){
exports.__esModule = true;
exports.mediavine = mediavine;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function mediavine(global, data) {
  _p3p.validateData(data, ['site'], ['sizes']);
  _p3p.loadScript(global, 'https://scripts.mediavine.com/amp/' + encodeURIComponent(data.site) + '.js');
}

},{"../3p/3p":1}],88:[function(require,module,exports){
exports.__esModule = true;
exports.meg = meg;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function meg(global, data) {
  _p3p.validateData(data, ['code']);
  var code = data.code;
  var lang = global.encodeURIComponent(global.navigator.language);
  var ref = global.encodeURIComponent(global.context.referrer);
  var params = ['lang=' + lang, 'ref=' + ref].join('&');
  var url = 'https://apps.meg.com/embedjs/' + code + '?' + params;
  global._megAdsLoaderCallbacks = {
    onSuccess: function () {
      global.context.renderStart();
    },
    onError: function () {
      global.context.noContentAvailable();
    }
  };
  _p3p.loadScript(global, url, function () {
    // Meg has been loaded
  }, function () {
    // Cannot load meg embed.js
    global.context.noContentAvailable();
  });
}

},{"../3p/3p":1}],89:[function(require,module,exports){
exports.__esModule = true;
exports.microad = microad;
/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _p3p = require('../3p/3p');

/* global MicroAd: false */

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function microad(global, data) {
  // TODO: check mandatory fields
  _p3p.validateData(data, [], ['spot', 'url', 'referrer', 'ifa', 'appid', 'geo']);

  global.document.getElementById('c').setAttribute('id', data.spot);
  _p3p.loadScript(global, 'https://j.microad.net/js/camp.js', function () {
    MicroAd.Compass.showAd(data);
  });
}

},{"../3p/3p":1}],90:[function(require,module,exports){
exports.__esModule = true;
exports.mixpo = mixpo;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function mixpo(global, data) {
  _p3p.validateData(data, ['guid', 'subdomain']);

  var g = global,
      cdnSubdomain = data.subdomain == 'www' ? 'cdn' : data.subdomain + '-cdn',
      url = data.loader || 'https://' + cdnSubdomain + '.mixpo.com/js/loader.js';

  g.mixpoAd = {
    amp: true,
    noflash: true,
    width: data.width,
    height: data.height,
    guid: data.guid,
    subdomain: data.subdomain,
    embedv: data.embedv,
    clicktag: data.clicktag,
    customTarget: data.customtarget,
    dynClickthrough: data.dynclickthrough,
    viewTracking: data.viewtracking,
    customCSS: data.customcss,
    local: data.local,
    enableMRAID: data.enablemraid,
    jsPlayer: data.jsplayer
  };

  _p3p.writeScript(g, url);
}

},{"../3p/3p":1}],91:[function(require,module,exports){
exports.__esModule = true;
exports.mywidget = mywidget;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function mywidget(global, data) {
  _p3p.validateData(data, ['cid']);

  var isReady = false;

  /**
   * `data.height` can be not a number (`undefined`, if attribute is not set,
   * for example), that's why condition is not `data.height < 0`
   */
  if (!(data.height >= 0)) {
    return;
  }

  global.myWidget = {
    params: {
      cid: data.cid,
      container: 'c'
    },

    renderStart: global.context.renderStart,
    noContentAvailable: global.context.noContentAvailable,

    /**
     * @param {{firstIntersectionCallback:function()}} opts
     */
    ready: function (opts) {
      // Make sure ready() is called only once.
      if (isReady) {
        return;
      } else {
        isReady = true;
      }

      if (!opts || !opts.firstIntersectionCallback) {
        return;
      }

      /**
       * Widget want to be informed, when it gets into viewport, so we start
       * to listen when it happens for the first time.
       */
      var unlisten = global.context.observeIntersection(function (changes) {
        changes.forEach(function (c) {
          if (c.intersectionRect.height) {
            opts.firstIntersectionCallback();
            unlisten();
          }
        });
      });
    }
  };

  // load the myWidget initializer asynchronously
  _p3p.loadScript(global, 'https://likemore-go.imgsmail.ru/widget.amp.js', function () {}, global.context.noContentAvailable);
}

},{"../3p/3p":1}],92:[function(require,module,exports){
exports.__esModule = true;
exports.nativo = nativo;
/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS-IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _p3p = require('../3p/3p');

function nativo(global, data) {
  var ntvAd = undefined;
  (function (ntvAd, global, data) {
    global.history.replaceState(null, null, location.pathname + location.hash.replace(/({).*(})/, ''));
    // Private
    var delayedAdLoad = false;
    var percentageOfadViewed = undefined;
    var loc = global.context.location;
    function isValidDelayTime(delay) {
      return typeof delay != 'undefined' && !isNaN(delay) && parseInt(delay, 10) >= 0;
    }
    function isDelayedTimeStart(data) {
      return isValidDelayTime(data.delayByTime) && 'delay' in data && !('delayByView' in data);
    }
    function isDelayedViewStart(data) {
      return isValidDelayTime(data.delayByTime) && 'delayByView' in data;
    }
    function loadAdWhenViewed() {
      var g = global;
      global.context.observeIntersection(function (positions) {
        var coordinates = getLastPositionCoordinates(positions);
        if (typeof coordinates.rootBounds != 'undefined' && coordinates.intersectionRect.top == coordinates.rootBounds.top + coordinates.boundingClientRect.y) {
          if (isDelayedViewStart(data) && !delayedAdLoad) {
            g.PostRelease.Start();
            delayedAdLoad = true;
          }
        }
      });
    }
    function loadAdWhenTimedout() {
      var g = global;
      setTimeout(function () {
        g.PostRelease.Start();
        delayedAdLoad = true;
      }, parseInt(data.delayByTime, 10));
    }
    function getLastPositionCoordinates(positions) {
      return positions[positions.length - 1];
    }
    function setPercentageOfadViewed(percentage) {
      percentageOfadViewed = percentage;
    }
    // Used to track ad during scrolling event and trigger checkIsAdVisible method on PostRelease instance
    function viewabilityConfiguration(positions) {
      var coordinates = getLastPositionCoordinates(positions);
      setPercentageOfadViewed(coordinates.intersectionRect.height * 100 / coordinates.boundingClientRect.height / 100);
      global.PostRelease.checkIsAdVisible();
    }
    // Public
    ntvAd.getPercentageOfadViewed = function () {
      return percentageOfadViewed;
    };
    ntvAd.getScriptURL = function () {
      return 'https://s.ntv.io/serve/load.js';
    };
    // Configuration setup is based on the parameters/attributes associated with the amp-ad node
    ntvAd.setupAd = function () {
      global._prx = [['cfg.Amp']];
      global._prx.push(['cfg.RequestUrl', data['requestUrl'] || loc.href]);
      for (var key in data) {
        switch (key) {
          case 'premium':
            global._prx.push(['cfg.SetUserPremium']);break;
          case 'debug':
            global._prx.push(['cfg.Debug']);break;
          case 'delay':
            if (isValidDelayTime(data.delayByTime)) {
              global._prx.push(['cfg.SetNoAutoStart']);
            }break;
        }
      }
    };
    // Used to Delay Start and Initalize Tracking. This is a callback AMP will use once script is loaded
    ntvAd.Start = function () {
      if (isDelayedTimeStart(data)) {
        loadAdWhenTimedout();
      } else if (isDelayedViewStart(data)) {
        loadAdWhenViewed();
      }
      global.PostRelease.checkAmpViewability = function () {
        return ntvAd.getPercentageOfadViewed();
      };
      // ADD TRACKING HANDLER TO OBSERVER
      global.context.observeIntersection(viewabilityConfiguration);
    };
  })(ntvAd || (ntvAd = {}), global, data);
  // Setup Configurations
  ntvAd.setupAd();
  // Load Nativo Script
  _p3p.loadScript(global, ntvAd.getScriptURL(), ntvAd.Start);
}

},{"../3p/3p":1}],93:[function(require,module,exports){
exports.__esModule = true;
exports.navegg = navegg;
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

var _p3p = require('../3p/3p');

var _adsGoogleDoubleclick = require('../ads/google/doubleclick');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function navegg(global, data) {
  _p3p.validateData(data, ['acc']);
  var acc = data.acc;
  var seg = undefined,
      nvg = function () {};
  delete data.acc;
  nvg.prototype.getProfile = function () {};
  data.targeting = data.targeting || {};
  _p3p.loadScript(global, 'https://tag.navdmp.com/amp.1.0.0.min.js', function () {
    nvg = global['nvg' + acc] = new global['AMPNavegg']({
      acc: acc
    });
    nvg.getProfile(function (nvgTargeting) {
      for (seg in nvgTargeting) {
        data.targeting[seg] = nvgTargeting[seg];
      };
      _adsGoogleDoubleclick.doubleclick(global, data);
    });
  });
}

},{"../3p/3p":1,"../ads/google/doubleclick":67}],94:[function(require,module,exports){
exports.__esModule = true;
exports.nend = nend;
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

var _p3p = require('../3p/3p');

var nendFields = ['nend_params'];

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function nend(global, data) {
  _p3p.validateData(data, nendFields, []);

  global.nendParam = data;
  _p3p.writeScript(global, 'https://js1.nend.net/js/amp.js');
}

},{"../3p/3p":1}],95:[function(require,module,exports){
exports.__esModule = true;
exports.netletix = netletix;
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

var _p3p = require('../3p/3p');

var _srcStringJs = require('../src/string.js');

var _srcLogJs = require('../src/log.js');

var _srcUrlJs = require('../src/url.js');

var NX_URL_HOST = 'https://call.adadapter.netzathleten-media.de';
var NX_URL_PATHPREFIX = '/pb/';
var NX_URL_FULL = NX_URL_HOST + NX_URL_PATHPREFIX;
var DEFAULT_NX_KEY = 'default';
var DEFAULT_NX_UNIT = 'default';
var DEFAULT_NX_WIDTH = 'fluid';
var DEFAULT_NX_HEIGHT = 'fluid';
var DEFAULT_NX_V = '0002';
var DEFAULT_NX_SITE = 'none';

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function netletix(global, data) {
  /*eslint "google-camelcase/google-camelcase": 0*/
  global._netletix_amp = {
    allowed_data: ['nxasync', 'nxv', 'nxsite', 'nxid', 'nxscript'],
    mandatory_data: ['nxkey', 'nxunit', 'nxwidth', 'nxheight'],
    data: data
  };

  _p3p.validateData(data, global._netletix_amp.mandatory_data, global._netletix_amp.allowed_data);

  var nxh = data.nxheight || DEFAULT_NX_HEIGHT;
  var nxw = data.nxwidth || DEFAULT_NX_WIDTH;
  var url = _srcUrlJs.assertHttpsUrl(_srcUrlJs.addParamsToUrl(NX_URL_FULL + encodeURIComponent(data.nxkey || DEFAULT_NX_KEY), {
    unit: data.nxunit || DEFAULT_NX_UNIT,
    width: data.nxwidth || DEFAULT_NX_WIDTH,
    height: data.nxheight || DEFAULT_NX_HEIGHT,
    v: data.nxv || DEFAULT_NX_V,
    site: data.nxsite || DEFAULT_NX_SITE,
    ord: Math.round(Math.random() * 100000000)
  }), data.ampSlotIndex);

  window.addEventListener('message', function (event) {
    if (event.data.type && _srcStringJs.startsWith(_srcLogJs.dev().assertString(event.data.type), 'nx-')) {
      switch (event.data.type) {
        case 'nx-resize':
          var renderconfig = {
            'width': event.data.width,
            'height': event.data.height
          };
          global.context.renderStart(renderconfig);
          if (event.data.width && event.data.height && (event.data.width != nxw || event.data.height != nxh)) {
            global.context.requestResize(event.data.width, event.data.height);
          };
          break;
        case 'nx-empty':
          global.context.noContentAvailable();
          break;
        case 'nx-identifier':
          global.context.reportRenderedEntityIdentifier(event.data.identifier);
          break;
        default:
          break;
      }
    }
  });

  if (data.async && data.async.toLowerCase() === 'true') {
    _p3p.loadScript(global, url);
  } else {
    _p3p.writeScript(global, url);
  }
}

},{"../3p/3p":1,"../src/log.js":141,"../src/string.js":147,"../src/url.js":151}],96:[function(require,module,exports){
exports.__esModule = true;
exports.nokta = nokta;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function nokta(global, data) {
  _p3p.validateData(data, ['category', 'site', 'zone']);
  global.category = data.category;
  global.site = data.site;
  global.zone = data.zone;
  global.iwidth = data.width;
  global.iheight = data.height;
  _p3p.writeScript(global, 'https://static.virgul.com/theme/mockups/noktaamp/ampjs.js');
}

},{"../3p/3p":1}],97:[function(require,module,exports){
exports.__esModule = true;
exports.openadstream = openadstream;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function openadstream(global, data) {
  _p3p.validateData(data, ['adhost', 'sitepage', 'pos'], ['query']);

  var url = 'https://' + encodeURIComponent(data.adhost) + '/3/' + data.sitepage + '/1' + String(Math.random()).substring(2, 11) + '@' + data.pos;

  if (data.query) {
    url = url + '?' + data.query;
  }
  _p3p.writeScript(global, url);
}

},{"../3p/3p":1}],98:[function(require,module,exports){
exports.__esModule = true;
exports.openx = openx;
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

var _p3p = require('../3p/3p');

var _adsGoogleDoubleclick = require('../ads/google/doubleclick');

var _srcString = require('../src/string');

var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Sort of like Object.assign.
 * @param {!Object} target
 * @param {!Object} source
 * @return {!Object}
 */
function assign(target, source) {
  for (var prop in source) {
    if (hasOwnProperty.call(source, prop)) {
      target[prop] = source[prop];
    }
  }

  return target;
}

/* global OX: false */

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function openx(global, data) {
  var openxData = ['host', 'nc', 'auid', 'dfpSlot', 'dfp', 'openx'];
  var dfpData = assign({}, data); // Make a copy for dfp.

  // TODO: check mandatory fields
  _p3p.validateData(data, [], openxData);
  // Consolidate Doubleclick inputs for forwarding -
  // conversion rules are explained in openx.md.
  if (data.dfpSlot) {
    // Anything starting with 'dfp' gets promoted.
    openxData.forEach(function (openxKey) {
      if (openxKey in dfpData && openxKey !== 'dfp') {
        if (_srcString.startsWith(openxKey, 'dfp')) {
          // Remove 'dfp' prefix, lowercase the first letter.
          var fixKey = openxKey.substring(3);
          fixKey = fixKey.substring(0, 1).toLowerCase() + fixKey.substring(1);
          dfpData[fixKey] = data[openxKey];
        }
        delete dfpData[openxKey];
      }
    });

    // Promote the whole 'dfp' object.
    if ('dfp' in data) {
      assign(dfpData, dfpData.dfp);
      delete dfpData['dfp'];
    }
  }

  // Decide how to render.
  if (data.host) {
    var jssdk = 'https://' + data.host + '/mw/1.0/jstag';

    if (data.nc && data.dfpSlot) {
      jssdk += '?nc=' + encodeURIComponent(data.nc);
      if (data.auid) {
        advanceImplementation(global, jssdk, dfpData, data);
      } else {
        standardImplementation(global, jssdk, dfpData);
      }
    } else if (data.auid) {
      // Just show an ad.
      global.OX_cmds = [function () {
        var oxRequest = OX();
        var oxAnchor = global.document.createElement('div');
        global.document.body.appendChild(oxAnchor);
        /*eslint "google-camelcase/google-camelcase": 0*/
        OX._requestArgs['bc'] = 'amp';
        oxRequest.addAdUnit(data.auid);
        oxRequest.setAdSizes([data.width + 'x' + data.height]);
        if (data.openx && data.openx.customVars) {
          setCustomVars(oxRequest, filterCustomVar(data.openx.customVars));
        }
        oxRequest.getOrCreateAdUnit(data.auid).set('anchor', oxAnchor);
        global.context.renderStart();
        oxRequest.load();
      }];
      _p3p.loadScript(global, jssdk);
    }
  } else if (data.dfpSlot) {
    // Fall back to a DFP ad.
    _adsGoogleDoubleclick.doubleclick(global, dfpData);
  }
}

function standardImplementation(global, jssdk, dfpData) {
  _p3p.writeScript(global, jssdk, function () {
    /*eslint "google-camelcase/google-camelcase": 0*/
    _adsGoogleDoubleclick.doubleclick(global, dfpData);
  });
}

function advanceImplementation(global, jssdk, dfpData, data) {
  var size = [data.width + 'x' + data.height];
  var customVars = {};
  if (data.openx && data.openx.customVars) {
    customVars = filterCustomVar(data.openx.customVars);
  }
  global.OX_bidder_options = {
    bidderType: 'hb_amp',
    callback: function () {
      var priceMap = global.oxhbjs && global.oxhbjs.getPriceMap();
      var slot = priceMap && priceMap['c'];
      var targeting = slot ? slot.size + '_' + slot.price + ',hb-bid-' + slot.bid_id : 'none_t';
      dfpData.targeting = dfpData.targeting || {};
      assign(dfpData.targeting, { oxb: targeting });
      _adsGoogleDoubleclick.doubleclick(global, dfpData);
    }
  };
  global.OX_bidder_ads = [[data.dfpSlot, size, 'c', customVars]];
  _p3p.loadScript(global, jssdk);
}

function setCustomVars(oxRequest, customVars) {
  var customVarKeys = Object.keys(customVars);
  customVarKeys.forEach(function (customVarKey) {
    var customVarValue = customVars[customVarKey];
    if (Array.isArray(customVarValue)) {
      customVarValue.forEach(function (value) {
        oxRequest.addVariable(customVarKey, value);
      });
    } else {
      oxRequest.addVariable(customVarKey, customVarValue);
    }
  });
}

function filterCustomVar(customVars) {
  var filterPattern = /^[A-Za-z0-9._]{1,20}$/;
  var filteredKeys = Object.keys(customVars).filter(function (key) {
    return filterPattern.test(key);
  });
  var filteredCustomVar = {};
  filteredKeys.forEach(function (key) {
    filteredCustomVar[key.toLowerCase()] = customVars[key];
  });
  return filteredCustomVar;
}

},{"../3p/3p":1,"../ads/google/doubleclick":67,"../src/string":147}],99:[function(require,module,exports){
exports.__esModule = true;
exports.outbrain = outbrain;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function outbrain(global, data) {

  // ensure we have valid widgetIds value
  _p3p.validateData(data, ['widgetids']);

  global._outbrain = global._outbrain || {
    viewId: global.context.pageViewId,
    widgetIds: data['widgetids'],
    htmlURL: data['htmlurl'] || global.context.canonicalUrl,
    ampURL: data['ampurl'] || global.context.sourceUrl,
    fbk: data['fbk'] || '',
    testMode: data['testmode'] || 'false',
    styleFile: data['stylefile'] || '',
    referrer: data['referrer'] || global.context.referrer
  };

  // load the Outbrain AMP JS file
  _p3p.loadScript(global, 'https://widgets.outbrain.com/widgetAMP/outbrainAMP.min.js');
}

},{"../3p/3p":1}],100:[function(require,module,exports){
exports.__esModule = true;
exports.plista = plista;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function plista(global, data) {
  // TODO: check mandatory fields
  _p3p.validateData(data, [], ['publickey', 'widgetname', 'urlprefix', 'item', 'geo', 'categories', 'countrycode']);
  var div = global.document.createElement('div');
  div.setAttribute('data-display', 'plista_widget_' + data.widgetname);
  // container with id "c" is provided by amphtml
  global.document.getElementById('c').appendChild(div);
  window.PLISTA = {
    publickey: data.publickey,
    widgets: [{
      name: data.widgetname,
      pre: data.urlprefix
    }],
    item: data.item,
    geo: data.geo,
    categories: data.categories,
    noCache: true,
    useDocumentReady: false,
    dataMode: 'data-display'
  };

  // load the plista modules asynchronously
  _p3p.loadScript(global, 'https://static' + (data.countrycode ? '-' + encodeURIComponent(data.countrycode) : '') + '.plista.com/async.js');
}

},{"../3p/3p":1}],101:[function(require,module,exports){
exports.__esModule = true;
exports.polymorphicads = polymorphicads;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function polymorphicads(global, data) {
  _p3p.validateData(data, ['adunit', 'params']);
  global.polyParam = data;
  _p3p.writeScript(global, 'https://www.polymorphicads.jp/js/amp.js');
}

},{"../3p/3p":1}],102:[function(require,module,exports){
exports.__esModule = true;
exports.popin = popin;
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

var _p3p = require('../3p/3p');

/**
* @param {!Window} global
* @param {!Object} data
*/

function popin(global, data) {
  _p3p.validateData(data, ['mediaid']);

  var d = global.document.createElement('div');
  d.id = '_popIn_amp_recommend';
  global.document.getElementById('c').appendChild(d);

  var url = 'https://api.popin.cc/searchbox/' + encodeURIComponent(data['mediaid']) + '.js';

  _p3p.loadScript(global, url);
}

},{"../3p/3p":1}],103:[function(require,module,exports){
exports.__esModule = true;
exports.pubmatic = pubmatic;
/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _p3p = require('../3p/3p');

/* global PubMatic: false */

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function pubmatic(global, data) {
  _p3p.loadScript(global, 'https://ads.pubmatic.com/AdServer/js/amp.js', function () {
    data.kadpageurl = global.context.location.href;
    PubMatic.showAd(data);
  });
}

},{"../3p/3p":1}],104:[function(require,module,exports){
exports.__esModule = true;
exports.pubmine = pubmine;
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

var _p3p = require('../3p/3p');

var _srcUrl = require('../src/url');

var pubmineOptional = ['adsafe', 'section', 'wordads'],
    pubmineRequired = ['siteid'],
    pubmineURL = 'https://s.pubmine.com/head.js';

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function pubmine(global, data) {
  _p3p.validateData(data, pubmineRequired, pubmineOptional);

  global._ipw_custom = { // eslint-disable-line google-camelcase/google-camelcase
    adSafe: 'adsafe' in data ? data.adsafe : '0',
    amznPay: [],
    domain: _srcUrl.getSourceOrigin(global.context.location.href),
    pageURL: _srcUrl.getSourceUrl(global.context.location.href),
    wordAds: 'wordads' in data ? data.wordads : '0',
    renderStartCallback: function () {
      return global.context.renderStart();
    }
  };
  _p3p.writeScript(global, pubmineURL);

  var o = {
    sectionId: data['siteid'] + ('section' in data ? data.section : '1'),
    height: data.height,
    width: data.width
  },
      wr = global.document.write;

  wr.call(global.document, '<script type="text/javascript">\n      (function(g){g.__ATA.initAd(\n        {sectionId:' + o.sectionId + ', width:' + o.width + ', height:' + o.height + '});\n      })(window);\n    </script>');
}

},{"../3p/3p":1,"../src/url":151}],105:[function(require,module,exports){
exports.__esModule = true;
exports.pulsepoint = pulsepoint;
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

var _p3p = require('../3p/3p');

var _adsGoogleDoubleclick = require('../ads/google/doubleclick');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function pulsepoint(global, data) {
  // TODO: check mandatory fields
  _p3p.validateData(data, [], ['pid', 'tagid', 'tagtype', 'slot', 'timeout']);
  if (data.tagtype === 'hb') {
    headerBidding(global, data);
  } else {
    tag(global, data);
  }
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */
function tag(global, data) {
  _p3p.writeScript(global, 'https://tag.contextweb.com/getjs.aspx?action=VIEWAD' + '&cwpid=' + encodeURIComponent(data.pid) + '&cwtagid=' + encodeURIComponent(data.tagid) + '&cwadformat=' + encodeURIComponent(data.width + 'X' + data.height));
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */
function headerBidding(global, data) {
  _p3p.loadScript(global, 'https://ads.contextweb.com/ht.js', function () {
    var hbConfig = {
      timeout: data.timeout || 1000,
      slots: [{
        cp: data.pid,
        ct: data.tagid,
        cf: data.width + 'x' + data.height,
        placement: data.slot,
        elementId: 'c'
      }],
      done: function (targeting) {
        _adsGoogleDoubleclick.doubleclick(global, {
          width: data.width,
          height: data.height,
          slot: data.slot,
          targeting: targeting[data.slot]
        });
      }
    };
    new window.PulsePointHeaderTag(hbConfig).init();
  });
}

},{"../3p/3p":1,"../ads/google/doubleclick":67}],106:[function(require,module,exports){
exports.__esModule = true;
exports.purch = purch;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function purch(global, data) {
  _p3p.validateData(data, [], ['pid', 'divid']);
  global.data = data;

  var adsrc = 'https://ramp.purch.com/serve/creative_amp.js';
  _p3p.validateSrcPrefix('https:', adsrc);
  _p3p.writeScript(global, adsrc);
}

},{"../3p/3p":1}],107:[function(require,module,exports){
exports.__esModule = true;
exports.relap = relap;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function relap(global, data) {
  _p3p.validateData(data, [], ['token', 'url', 'anchorid']);

  window.relapV6WidgetReady = function () {
    window.context.renderStart();
  };

  window.relapV6WidgetNoSimilarPages = function () {
    window.context.noContentAvailable();
  };

  var url = 'https://relap.io/api/v6/head.js?token=' + encodeURIComponent(data['token']) + '&url=' + encodeURIComponent(data['url']);
  _p3p.loadScript(global, url);

  var anchorEl = global.document.createElement('div');
  anchorEl.id = data['anchorid'];
  global.document.getElementById('c').appendChild(anchorEl);
}

},{"../3p/3p":1}],108:[function(require,module,exports){
exports.__esModule = true;
exports.revcontent = revcontent;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function revcontent(global, data) {
  var endpoint = 'https://labs-cdn.revcontent.com/build/amphtml/revcontent.amp.min.js';
  var required = ['id', 'width', 'height', 'wrapper'];
  var optional = ['api', 'key', 'ssl', 'adxw', 'adxh', 'rows', 'cols', 'domain', 'source', 'testing', 'endpoint', 'publisher', 'branding', 'font', 'css', 'sizer', 'debug', 'ampcreative'];

  _p3p.validateData(data, required, optional);
  global.data = data;
  _p3p.writeScript(window, endpoint);
}

},{"../3p/3p":1}],109:[function(require,module,exports){
exports.__esModule = true;
exports.rubicon = rubicon;
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

var _p3p = require('../3p/3p');

var _srcUrl = require('../src/url');

var _adsGoogleDoubleclick = require('../ads/google/doubleclick');

/* global rubicontag: false */

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function rubicon(global, data) {
  // TODO: check mandatory fields
  _p3p.validateData(data, [], ['slot', 'targeting', 'categoryExclusions', 'tagForChildDirectedTreatment', 'cookieOptions', 'overrideWidth', 'overrideHeight', 'loadingStrategy', 'consentNotificationId', 'useSameDomainRenderingUntilDeprecated', 'account', 'site', 'zone', 'size', 'pos', 'kw', 'visitor', 'inventory', 'type', 'method', 'callback']);

  if (data.method === 'fastLane') {
    fastLane(global, data);
  } else {
    smartTag(global, data);
  }
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */
function fastLane(global, data) {
  var dimensions = [[parseInt(data.overrideWidth || data.width, 10), parseInt(data.overrideHeight || data.height, 10)]];

  function setFPD(type, data) {
    if (typeof data === 'object' && (type === 'V' || type === 'I')) {
      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          if (type === 'V') {
            rubicontag.setFPV(key, data[key]);
          }
          if (type === 'I') {
            rubicontag.setFPI(key, data[key]);
          }
        }
      }
    }
  }

  var gptran = false;
  function gptrun() {
    if (gptran) {
      return;
    }
    gptran = true;

    var ASTargeting = rubicontag.getSlot('c').getAdServerTargeting();
    var ptrn = /rpfl_\d+/i;
    for (var i = 0; i < ASTargeting.length; i++) {
      if (ptrn.test(ASTargeting[i].key)) {
        ASTargeting = ASTargeting[i].values;
      }
    }
    if (!data.targeting) {
      data.targeting = {};
    }
    data.targeting['rpfl_' + data.account] = ASTargeting;
    data.targeting['rpfl_elemid'] = 'c';

    if (data['method']) {
      delete data['method'];
    }
    if (data['account']) {
      delete data['account'];
    }
    if (data['pos']) {
      delete data['pos'];
    }
    if (data['kw']) {
      delete data['kw'];
    }
    if (data['visitor']) {
      delete data['visitor'];
    }
    if (data['inventory']) {
      delete data['inventory'];
    }
    _adsGoogleDoubleclick.doubleclick(global, data);
  }

  _p3p.loadScript(global, 'https://ads.rubiconproject.com/header/' + encodeURIComponent(data.account) + '.js', function () {
    global.rubicontag.cmd.push(function () {
      var rubicontag = global.rubicontag;
      var slot = rubicontag.defineSlot(data.slot, dimensions, 'c');

      if (data.pos) {
        slot.setPosition(data.pos);
      }
      if (data.kw) {
        rubicontag.addKW(data.kw);
      }
      if (data.visitor) {
        setFPD('V', data.visitor);
      }
      if (data.inventory) {
        setFPD('I', data.inventory);
      }
      rubicontag.setUrl(_srcUrl.getSourceUrl(context.location.href));
      rubicontag.setIntegration('amp');
      rubicontag.run(gptrun, 1000);
    });
  });
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */
function smartTag(global, data) {
  var pageURL = _srcUrl.getSourceUrl(context.location.href);
  /* eslint-disable */
  global.rp_account = data.account;
  global.rp_site = data.site;
  global.rp_zonesize = data.zone + '-' + data.size;
  global.rp_adtype = 'js';
  global.rp_page = pageURL;
  global.rp_kw = data.kw;
  global.rp_visitor = data.visitor;
  global.rp_inventory = data.inventory;
  global.rp_amp = 'st';
  global.rp_callback = data.callback;
  /* eslint-enable */
  _p3p.writeScript(global, 'https://ads.rubiconproject.com/ad/' + encodeURIComponent(data.account) + '.js');
}

},{"../3p/3p":1,"../ads/google/doubleclick":67,"../src/url":151}],110:[function(require,module,exports){
exports.__esModule = true;
exports.sharethrough = sharethrough;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function sharethrough(global, data) {
  _p3p.validateData(data, ['pkey'], []);
  global.pkey = data.pkey;
  _p3p.writeScript(global, 'https://native.sharethrough.com/iframe/amp.js');
}

},{"../3p/3p":1}],111:[function(require,module,exports){
exports.__esModule = true;
exports.sklik = sklik;
/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _p3p = require('../3p/3p');

/* global sklikProvider: false */

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function sklik(global, data) {
  _p3p.loadScript(global, 'https://c.imedia.cz/js/amp.js', function () {
    var parentId = 'sklik_parent';

    var parentElement = document.createElement('div');
    parentElement.id = parentId;
    window.document.body.appendChild(parentElement);

    data.elm = parentId;
    data.url = global.context.canonicalUrl;

    sklikProvider.show(data);
  });
}

},{"../3p/3p":1}],112:[function(require,module,exports){
exports.__esModule = true;
exports.slimcutmedia = slimcutmedia;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function slimcutmedia(global, data) {
  /*eslint "google-camelcase/google-camelcase": 0*/
  global._scm_amp = {
    allowed_data: ['pid', 'ffc'],
    mandatory_data: ['pid'],
    data: data
  };

  _p3p.validateData(data, global._scm_amp.mandatory_data, global._scm_amp.allowed_data);

  _p3p.loadScript(global, 'https://static.freeskreen.com/publisher/' + encodeURIComponent(data.pid) + '/freeskreen.min.js');
}

},{"../3p/3p":1}],113:[function(require,module,exports){
exports.__esModule = true;
exports.smartadserver = smartadserver;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function smartadserver(global, data) {
  // For more flexibility, we construct the call to SmartAdServer's URL in the external loader, based on the data received from the AMP tag.
  _p3p.loadScript(global, 'https://ec-ns.sascdn.com/diff/js/amp.v0.js', function () {
    global.sas.callAmpAd(data);
  });
}

},{"../3p/3p":1}],114:[function(require,module,exports){
exports.__esModule = true;
exports.smartclip = smartclip;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function smartclip(global, data) {
  /*eslint "google-camelcase/google-camelcase": 0*/
  global._smartclip_amp = {
    allowed_data: ['extra'],
    mandatory_data: ['plc', 'sz'],
    data: data
  };

  _p3p.validateData(data, global._smartclip_amp.mandatory_data, global._smartclip_amp.allowed_data);

  var rand = Math.round(Math.random() * 100000000);

  _p3p.loadScript(global, 'https://des.smartclip.net/ads?type=dyn&plc=' + encodeURIComponent(data.plc) + '&sz=' + encodeURIComponent(data.sz) + (data.extra ? '&' + encodeURI(data.extra) : '') + '&rnd=' + rand);
}

},{"../3p/3p":1}],115:[function(require,module,exports){
exports.__esModule = true;
exports.sortable = sortable;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function sortable(global, data) {
  _p3p.validateData(data, ['site', 'name'], ['responsive']);

  var slot = global.document.getElementById('c');
  var ad = global.document.createElement('div');
  var size = data.responsive === 'true' ? 'auto' : data.width + 'x' + data.height;
  ad.className = 'ad-tag';
  ad.setAttribute('data-ad-name', data.name);
  ad.setAttribute('data-ad-size', size);
  slot.appendChild(ad);
  _p3p.loadScript(global, 'https://tags-cdn.deployads.com/a/' + encodeURIComponent(data.site) + '.js');
}

},{"../3p/3p":1}],116:[function(require,module,exports){
exports.__esModule = true;
exports.sovrn = sovrn;
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
/*
*********
* Existing sovrn customers feel free to contact amp-implementations@sovrn.com for assistance with setting up your amp-ad tagid
* New customers please see www.sovrn.com to sign up and get started!
*********
*/

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function sovrn(global, data) {
  /*eslint "google-camelcase/google-camelcase": 0*/
  global.width = data.width;
  global.height = data.height;
  global.domain = data.domain;
  global.u = data.u;
  global.iid = data.iid;
  global.aid = data.aid;
  global.z = data.z;
  global.tf = data.tf;
  _p3p.writeScript(global, 'https://ap.lijit.com/www/sovrn_amp/sovrn_ads.js');
}

},{"../3p/3p":1}],117:[function(require,module,exports){
exports.__esModule = true;
exports.spotx = spotx;
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

var _p3p = require('../3p/3p');

var _srcString = require('../src/string');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function spotx(global, data) {
  // ensure we have valid channel id
  _p3p.validateData(data, ['spotx_channel_id', 'width', 'height']);

  // Because 3p's loadScript does not allow for data attributes,
  // we will write the JS tag ourselves.
  var script = global.document.createElement('script');

  data['spotx_content_width'] = data.spotx_content_width || data.width;
  data['spotx_content_height'] = data.spotx_content_height || data.height;
  data['spotx_content_page_url'] = global.context.location.href || global.context.sourceUrl;

  // Add data-* attribute for each data value passed in.
  for (var key in data) {
    if (data.hasOwnProperty(key) && _srcString.startsWith(key, 'spotx_')) {
      script.setAttribute('data-' + key, data[key]);
    }
  }

  global['spotx_ad_done_function'] = function (spotxAdFound) {
    if (!spotxAdFound) {
      global.context.noContentAvailable();
    }
  };

  // TODO(KenneyE): Implement AdLoaded callback in script to accurately trigger renderStart()
  script.onload = global.context.renderStart;

  script.src = '//js.spotx.tv/easi/v1/' + data['spotx_channel_id'] + '.js';
  global.document.body.appendChild(script);
}

},{"../3p/3p":1,"../src/string":147}],118:[function(require,module,exports){
exports.__esModule = true;
exports.sunmedia = sunmedia;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function sunmedia(global, data) {
  /*eslint "google-camelcase/google-camelcase": 0*/
  global._sunmedia_amp = {
    allowed_data: ['cskp', 'crst', 'cdb', 'cid'],
    mandatory_data: ['cid'],
    data: data
  };

  _p3p.validateData(data, global._sunmedia_amp.mandatory_data, global._sunmedia_amp.allowed_data);

  _p3p.loadScript(global, 'https://vod.addevweb.com/sunmedia/amp/ads/SMIntextAMP.js');
}

},{"../3p/3p":1}],119:[function(require,module,exports){
exports.__esModule = true;
exports.swoop = swoop;
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

var _p3p = require('../3p/3p');

function swoop(global, data) {
  // Required properties
  _p3p.validateData(data, ['layout', 'placement', 'publisher', 'slot']);

  _p3p.computeInMasterFrame(global, 'swoop-load', function (done) {
    global.swoopIabConfig = data;

    _p3p.loadScript(global, 'https://www.swoop-amp.com/amp.js', function () {
      return done(global.Swoop != null);
    });
  }, function (success) {
    if (success) {
      if (!global.context.isMaster) {
        global.context.master.Swoop.announcePlace(global, data);
      }
    } else {
      global.context.noContentAvailable();
      throw new Error('Swoop failed to load');
    }
  });
}

},{"../3p/3p":1}],120:[function(require,module,exports){
exports.__esModule = true;
exports.taboola = taboola;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function taboola(global, data) {
  // do not copy the following attributes from the 'data' object
  // to _tablloa global object
  var blackList = ['height', 'type', 'width', 'placement', 'mode'];

  // ensure we have vlid publisher, placement and mode
  // and exactly one page-type
  _p3p.validateData(data, ['publisher', 'placement', 'mode', ['article', 'video', 'photo', 'search', 'category', 'homepage', 'other']]);

  // setup default values for referrer and url
  var params = {
    referrer: data.referrer || global.context.referrer,
    url: data.url || global.context.canonicalUrl
  };

  // copy none blacklisted attribute to the 'params' map
  Object.keys(data).forEach(function (k) {
    if (blackList.indexOf(k) === -1) {
      params[k] = data[k];
    }
  });

  // push the two object into the '_taboola' global
  (global._taboola = global._taboola || []).push([{
    viewId: global.context.pageViewId,
    publisher: data.publisher,
    placement: data.placement,
    mode: data.mode,
    framework: 'amp',
    container: 'c'
  }, params, { flush: true }]);

  // install observation on entering/leaving the view
  global.context.observeIntersection(function (changes) {
    changes.forEach(function (c) {
      if (c.intersectionRect.height) {
        global._taboola.push({
          visible: true,
          rects: c,
          placement: data.placement
        });
      }
    });
  });

  // load the taboola loader asynchronously
  _p3p.loadScript(global, 'https://cdn.taboola.com/libtrc/' + encodeURIComponent(data.publisher) + '/loader.js');
}

},{"../3p/3p":1}],121:[function(require,module,exports){
exports.__esModule = true;
exports.teads = teads;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function teads(global, data) {
  /*eslint "google-camelcase/google-camelcase": 0*/
  global._teads_amp = {
    allowed_data: ['pid', 'tag'],
    mandatory_data: ['pid'],
    mandatory_tag_data: ['tta', 'ttp'],
    data: data
  };

  _p3p.validateData(data, global._teads_amp.mandatory_data, global._teads_amp.allowed_data);

  if (data.tag) {
    _p3p.validateData(data.tag, global._teads_amp.mandatory_tag_data);
    global._tta = data.tag.tta;
    global._ttp = data.tag.ttp;

    _p3p.loadScript(global, 'https://cdn.teads.tv/media/format/' + encodeURI(data.tag.js || 'v3/teads-format.min.js'));
  } else {
    _p3p.loadScript(global, 'https://a.teads.tv/page/' + encodeURIComponent(data.pid) + '/tag');
  }
}

},{"../3p/3p":1}],122:[function(require,module,exports){
exports.__esModule = true;
exports.triplelift = triplelift;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function triplelift(global, data) {
  var src = data.src;
  _p3p.validateSrcPrefix('https://ib.3lift.com/', src);
  _p3p.loadScript(global, src);
}

},{"../3p/3p":1}],123:[function(require,module,exports){
exports.__esModule = true;
exports.valuecommerce = valuecommerce;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function valuecommerce(global, data) {
  _p3p.validateData(data, ['pid'], ['sid', 'vcptn', 'om']);
  global.vcParam = data;
  _p3p.writeScript(global, 'https://amp.valuecommerce.com/amp_bridge.js');
}

},{"../3p/3p":1}],124:[function(require,module,exports){
exports.__esModule = true;
exports.webediads = webediads;
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

var _p3p = require('../3p/3p');

/**
 * Created by Webedia on 07/03/16 - last updated on 11/10/16
 * @param {!Window} global
 * @param {!Object} data
 */

function webediads(global, data) {
  _p3p.validateData(data, ['site', 'page', 'position'], ['query']);
  _p3p.loadScript(global, 'https://eu1.wbdds.com/amp.min.js', function () {
    global.wads.amp.init({
      'site': data.site,
      'page': data.page,
      'position': data.position,
      'query': data.query ? data.query : ''
    });
  });
}

},{"../3p/3p":1}],125:[function(require,module,exports){
exports.__esModule = true;
exports.weboramaDisplay = weboramaDisplay;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function weboramaDisplay(global, data) {
  var mandatoryFields = ['width', 'height', 'wbo_account_id', 'wbo_tracking_element_id', 'wbo_fullhost'];

  var optionalFields = ['wbo_bid_price', 'wbo_price_paid', 'wbo_random', 'wbo_debug', 'wbo_host', 'wbo_publisherclick',
  // 'wbo_clicktrackers',
  // 'wbo_imptrackers',
  // 'wbo_zindex',
  'wbo_customparameter', 'wbo_disable_unload_event', 'wbo_donottrack', 'wbo_script_variant', 'wbo_is_mobile', 'wbo_vars', 'wbo_weak_encoding'];

  _p3p.validateData(data, mandatoryFields, optionalFields);

  /*eslint "google-camelcase/google-camelcase": 0*/
  global.weborama_display_tag = {
    // Default settings to work with AMP
    forcesecure: true,
    bursttarget: 'self',
    burst: 'never',

    // Settings taken from component config
    width: data.width,
    height: data.height,
    account_id: data.wbo_account_id,
    customparameter: data.wbo_customparameter,
    tracking_element_id: data.wbo_tracking_element_id,
    host: data.wbo_host,
    fullhost: data.wbo_fullhost,
    bid_price: data.wbo_bid_price,
    price_paid: data.wbo_price_paid,
    random: data.wbo_random,
    debug: data.wbo_debug,
    publisherclick: data.wbo_publisherclick,
    // clicktrackers: data.wbo_clicktrackers,
    // imptrackers: data.wbo_imptrackers,
    // zindex: data.wbo_zindex, // This is actually quite useless for now, since we are launced in a non-friendly iframe.
    disable_unload_event: data.wbo_disable_unload_event,
    donottrack: data.wbo_donottrack,
    script_variant: data.wbo_script_variant,
    is_mobile: data.wbo_is_mobile,
    vars: data.wbo_vars,
    weak_encoding: data.wbo_weak_encoding
  };

  _p3p.writeScript(global, 'https://cstatic.weborama.fr/js/advertiserv2/adperf_launch_1.0.0_scrambled.js');
}

},{"../3p/3p":1}],126:[function(require,module,exports){
exports.__esModule = true;
exports.widespace = widespace;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function widespace(global, data) {

  var WS_AMP_CODE_VER = '1.0.0';

  _p3p.validateData(data, ['sid'], []);

  var url = 'https://engine.widespace.com/map/engine/dynamic?isamp=1' + '&ampver=' + WS_AMP_CODE_VER + '&sid=' + encodeURIComponent(data.sid);

  _p3p.writeScript(global, url);
}

},{"../3p/3p":1}],127:[function(require,module,exports){
exports.__esModule = true;
exports.xlift = xlift;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function xlift(global, data) {
  _p3p.validateData(data, ['mediaid']);

  global.xliftParams = data;
  var d = global.document.createElement('div');
  d.id = '_XL_recommend';
  global.document.getElementById('c').appendChild(d);

  d.addEventListener('SuccessLoadedXliftAd', function (e) {
    e.detail = e.detail || { adSizeInfo: {} };
    global.context.renderStart(e.detail.adSizeInfo);
  });
  d.addEventListener('FailureLoadedXliftAd', function () {
    global.context.noContentAvailable();
  });

  //assign XliftAmpHelper property to global(window)
  global.XliftAmpHelper = null;

  _p3p.loadScript(global, 'https://cdn.x-lift.jp/resources/common/xlift_amp.js', function () {
    if (!global.XliftAmpHelper) {
      global.context.noContentAvailable();
    } else {
      global.XliftAmpHelper.show();
    }
  }, function () {
    global.context.noContentAvailable();
  });
}

},{"../3p/3p":1}],128:[function(require,module,exports){
exports.__esModule = true;
exports.yahoo = yahoo;
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

var _p3p = require('../3p/3p');

/**
* @param {!Window} global
* @param {!Object} data
*/

function yahoo(global, data) {
  _p3p.validateData(data, ['sid', 'site', 'sa']);
  global.yadData = data;
  _p3p.writeScript(global, 'https://s.yimg.com/os/ampad/display.js');
}

},{"../3p/3p":1}],129:[function(require,module,exports){
exports.__esModule = true;
exports.yahoojp = yahoojp;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function yahoojp(global, data) {
  _p3p.validateData(data, ['yadsid'], []);
  global.yahoojpParam = data;
  _p3p.writeScript(global, 'https://s.yimg.jp/images/listing/tool/yads/ydn/amp/amp.js');
}

},{"../3p/3p":1}],130:[function(require,module,exports){
exports.__esModule = true;
exports.yandex = yandex;
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

var _p3p = require('../3p/3p');

var n = 'yandexContextAsyncCallbacks';
var renderTo = 'yandex_rtb';

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function yandex(global, data) {
  _p3p.validateData(data, ['blockId'], ['data', 'isAdfox']);

  addToQueue(global, data);
  _p3p.loadScript(global, 'https://yastatic.net/partner-code/loaders/context_amp.js');
}

/**
 * @param {!Window} global
 * @param {!Object} data
 */
function addToQueue(global, data) {
  global[n] = global[n] || [];
  global[n].push(function () {

    // Create container
    createContainer(global, renderTo);

    // Show Ad in container
    global.Ya.Context.AdvManager.render({
      blockId: data.blockId,
      statId: data.statId,
      renderTo: renderTo,
      data: data.data,
      async: true,
      onRender: function () {
        // Move adfox queue
        if (data.isAdfox && global.Ya.adfoxCode.onRender) {
          global.Ya.adfoxCode.onRender();
        }
      }
    }, function () {
      global.context.noContentAvailable();
    });
  });
}

/**
 * @param {!Window} global
 * @param {string} id
 */
function createContainer(global, id) {
  var d = global.document.createElement('div');
  d.id = id;
  global.document.getElementById('c').appendChild(d);
}

},{"../3p/3p":1}],131:[function(require,module,exports){
exports.__esModule = true;
exports.yieldbot = yieldbot;
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

var _p3p = require('../3p/3p');

var _adsGoogleDoubleclick = require('../ads/google/doubleclick');

var _srcLog = require('../src/log');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function yieldbot(global, data) {
  _p3p.validateData(data, ['psn', 'ybSlot', 'slot'], ['targeting', 'categoryExclusions', 'tagForChildDirectedTreatment', 'cookieOptions', 'overrideWidth', 'overrideHeight']);

  global.ybotq = global.ybotq || [];

  _p3p.loadScript(global, 'https://cdn.yldbt.com/js/yieldbot.intent.amp.js', function () {
    global.ybotq.push(function () {
      try {
        var dimensions = [[parseInt(data.overrideWidth || data.width, 10), parseInt(data.overrideHeight || data.height, 10)]];

        global.yieldbot.psn(data.psn);
        global.yieldbot.enableAsync();
        if (window.context.isMaster) {
          global.yieldbot.defineSlot(data.ybSlot, { sizes: dimensions });
          global.yieldbot.go();
        } else {
          var slots = {};
          slots[data.ybSlot] = dimensions;
          global.yieldbot.nextPageview(slots);
        }
      } catch (e) {
        _srcLog.rethrowAsync(e);
      }
    });

    global.ybotq.push(function () {
      try {
        var targeting = global.yieldbot.getSlotCriteria(data['ybSlot']);
        data['targeting'] = data['targeting'] || {};
        for (var key in targeting) {
          data.targeting[key] = targeting[key];
        }
      } catch (e) {
        _srcLog.rethrowAsync(e);
      }
      delete data['ybSlot'];
      delete data['psn'];
      _adsGoogleDoubleclick.doubleclick(global, data);
    });
  });
}

},{"../3p/3p":1,"../ads/google/doubleclick":67,"../src/log":141}],132:[function(require,module,exports){
exports.__esModule = true;
exports.yieldmo = yieldmo;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function yieldmo(global, data) {

  var ymElem = global.document.createElement('div');
  ymElem.id = 'ym_' + data.ymid;
  ymElem.className = 'ym';
  ymElem.dataset.ampEnabled = true;
  global.document.getElementById('c').appendChild(ymElem);

  var ymJs = 'https://static.yieldmo.com/ym.amp1.js';

  _p3p.loadScript(global, ymJs);
}

},{"../3p/3p":1}],133:[function(require,module,exports){
exports.__esModule = true;
exports.yieldone = yieldone;
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

var _p3p = require('../3p/3p');

/**
  * @param {!Window} global
  * @param {!Object} data
  */

function yieldone(global, data) {
  _p3p.validateData(data, ['pubid', 'pid', 'width', 'height'], []);

  global.yieldoneParam = data;
  _p3p.writeScript(global, 'https://img.ak.impact-ad.jp/ic/pone/commonjs/yone-amp.js');
}

},{"../3p/3p":1}],134:[function(require,module,exports){
exports.__esModule = true;
exports.zedo = zedo;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function zedo(global, data) {
  // check mandatory fields
  _p3p.validateData(data, ['superId', 'network', 'placementId', 'channel', 'publisher', 'dim'], ['charset', 'callback', 'renderer']);

  _p3p.loadScript(global, 'https://ss3.zedo.com/gecko/tag/Gecko.amp.min.js', function () {
    var ZGTag = global.ZGTag;
    var charset = data.charset || '';
    var callback = data.callback || function () {};
    var geckoTag = new ZGTag(data.superId, data.network, '', '', charset, callback);
    geckoTag.setAMP();
    // define placement
    var placement = geckoTag.addPlacement(data.placementId, data.channel, data.publisher, data.dim, data.width, data.height);
    if (data.renderer) {
      for (var key in data.renderer) {
        placement.includeRenderer(data.renderer[key].name, data.renderer[key].value);
      }
    } else {
      placement.includeRenderer('display', {});
    }
    //create a slot div to display ad
    var slot = global.document.createElement('div');
    slot.id = 'zdt_' + data.placementId;

    var divContainer = global.document.getElementById('c');
    if (divContainer) {
      divContainer.appendChild(slot);
    }

    // call load ads
    geckoTag.loadAds();

    // call div ready
    geckoTag.placementReady(data.placementId);
  });
}

},{"../3p/3p":1}],135:[function(require,module,exports){
exports.__esModule = true;
exports.zergnet = zergnet;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function zergnet(global, data) {
  _p3p.validateData(data, ['zergid'], []);
  global.zergnetWidgetId = data.zergid;
  _p3p.writeScript(global, 'https://www.zergnet.com/zerg-amp.js');
}

},{"../3p/3p":1}],136:[function(require,module,exports){
exports.__esModule = true;
exports.zucks = zucks;
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

var _p3p = require('../3p/3p');

/**
 * @param {!Window} global
 * @param {!Object} data
 */

function zucks(global, data) {
  _p3p.validateData(data, ['frameId']);
  _p3p.writeScript(global, 'https://j.zucks.net.zimg.jp/j?f=' + data['frameId']);
}

},{"../3p/3p":1}],137:[function(require,module,exports){
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

},{"./event-helper-listen":139,"./json":140,"./log":141,"./utils/object":152}],138:[function(require,module,exports){
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

/**
 * Allows for runtime configuration. Internally, the runtime should
 * use the src/config.js module for various constants. We can use the
 * AMP_CONFIG global to translate user-defined configurations to this
 * module.
 * @type {!Object<string, string>}
 */
var env = self.AMP_CONFIG || {};

var thirdPartyFrameRegex = typeof env['thirdPartyFrameRegex'] == 'string' ? new RegExp(env['thirdPartyFrameRegex']) : env['thirdPartyFrameRegex'];

var cdnProxyRegex = typeof env['cdnProxyRegex'] == 'string' ? new RegExp(env['cdnProxyRegex']) : env['cdnProxyRegex'];

/** @type {!Object<string, string|boolean|RegExp>} */
var urls = {
    thirdParty: env['thirdPartyUrl'] || 'https://3p.ampproject.net',
    thirdPartyFrameHost: env['thirdPartyFrameHost'] || 'ampproject.net',
    thirdPartyFrameRegex: thirdPartyFrameRegex || /^d-\d+\.ampproject\.net$/,
    cdn: env['cdnUrl'] || 'https://cdn.ampproject.org',
    cdnProxyRegex: cdnProxyRegex || /^https:\/\/([a-zA-Z0-9_-]+\.)?cdn\.ampproject\.org/,
    localhostRegex: /^https?:\/\/localhost(:\d+)?$/,
    errorReporting: env['errorReportingUrl'] || 'https://amp-error-reporting.appspot.com/r',
    localDev: env['localDev'] || false
};
exports.urls = urls;

},{}],139:[function(require,module,exports){
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

},{}],140:[function(require,module,exports){
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

},{"./types":149}],141:[function(require,module,exports){
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

},{"./mode":143,"./mode-object":142,"./types":149}],142:[function(require,module,exports){
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

},{"./mode":143}],143:[function(require,module,exports){
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

},{"./string":147,"./url-parse-query-string":150}],144:[function(require,module,exports){
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

},{}],145:[function(require,module,exports){
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

},{}],146:[function(require,module,exports){
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

},{}],147:[function(require,module,exports){
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

},{}],148:[function(require,module,exports){
exports.__esModule = true;
exports.camelCaseToTitleCase = camelCaseToTitleCase;
exports.getVendorJsPropertyName = getVendorJsPropertyName;
exports.setStyle = setStyle;
exports.getStyle = getStyle;
exports.setStyles = setStyles;
exports.toggle = toggle;
exports.px = px;
exports.translateX = translateX;
exports.translate = translate;
exports.scale = scale;
exports.removeAlphaFromColor = removeAlphaFromColor;
exports.computedStyle = computedStyle;
exports.resetStyles = resetStyles;
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

// Note: loaded by 3p system. Cannot rely on babel polyfills.

var _utilsObjectJs = require('./utils/object.js');

var _string = require('./string');

/** @type {Object<string, string>} */
var propertyNameCache = undefined;

/** @const {!Array<string>} */
var vendorPrefixes = ['Webkit', 'webkit', 'Moz', 'moz', 'ms', 'O', 'o'];

/**
 * @export
 * @param {string} camelCase camel cased string
 * @return {string} title cased string
 */

function camelCaseToTitleCase(camelCase) {
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

/**
 * Checks the style if a prefixed version of a property exists and returns
 * it or returns an empty string.
 * @private
 * @param {!Object} style
 * @param {string} titleCase the title case version of a css property name
 * @return {string} the prefixed property name or null.
 */
function getVendorJsPropertyName_(style, titleCase) {
  for (var i = 0; i < vendorPrefixes.length; i++) {
    var propertyName = vendorPrefixes[i] + titleCase;
    if (style[propertyName] !== undefined) {
      return propertyName;
    }
  }
  return '';
}

/**
 * Returns the possibly prefixed JavaScript property name of a style property
 * (ex. WebkitTransitionDuration) given a camelCase'd version of the property
 * (ex. transitionDuration).
 * @export
 * @param {!Object} style
 * @param {string} camelCase the camel cased version of a css property name
 * @param {boolean=} opt_bypassCache bypass the memoized cache of property
 *   mapping
 * @return {string}
 */

function getVendorJsPropertyName(style, camelCase, opt_bypassCache) {
  if (_string.startsWith(camelCase, '--')) {
    // CSS vars are returned as is.
    return camelCase;
  }
  if (!propertyNameCache) {
    propertyNameCache = _utilsObjectJs.map();
  }
  var propertyName = propertyNameCache[camelCase];
  if (!propertyName || opt_bypassCache) {
    propertyName = camelCase;
    if (style[camelCase] === undefined) {
      var titleCase = camelCaseToTitleCase(camelCase);
      var prefixedPropertyName = getVendorJsPropertyName_(style, titleCase);

      if (style[prefixedPropertyName] !== undefined) {
        propertyName = prefixedPropertyName;
      }
    }
    if (!opt_bypassCache) {
      propertyNameCache[camelCase] = propertyName;
    }
  }
  return propertyName;
}

/**
 * Sets the CSS style of the specified element with optional units, e.g. "px".
 * @param {Element} element
 * @param {string} property
 * @param {*} value
 * @param {string=} opt_units
 * @param {boolean=} opt_bypassCache
 */

function setStyle(element, property, value, opt_units, opt_bypassCache) {
  var propertyName = getVendorJsPropertyName(element.style, property, opt_bypassCache);
  if (propertyName) {
    element.style[propertyName] = opt_units ? value + opt_units : value;
  }
}

/**
 * Returns the value of the CSS style of the specified element.
 * @param {!Element} element
 * @param {string} property
 * @param {boolean=} opt_bypassCache
 * @return {*}
 */

function getStyle(element, property, opt_bypassCache) {
  var propertyName = getVendorJsPropertyName(element.style, property, opt_bypassCache);
  if (!propertyName) {
    return undefined;
  }
  return element.style[propertyName];
}

/**
 * Sets the CSS styles of the specified element. The styles
 * a specified as a map from CSS property names to their values.
 * @param {!Element} element
 * @param {!Object<string, *>} styles
 */

function setStyles(element, styles) {
  for (var k in styles) {
    setStyle(element, k, styles[k]);
  }
}

/**
 * Shows or hides the specified element.
 * @param {!Element} element
 * @param {boolean=} opt_display
 */

function toggle(element, opt_display) {
  if (opt_display === undefined) {
    opt_display = getStyle(element, 'display') == 'none';
  }
  setStyle(element, 'display', opt_display ? '' : 'none');
}

/**
 * Returns a pixel value.
 * @param {number} value
 * @return {string}
 */

function px(value) {
  return value + 'px';
}

/**
 * Returns a "translateX" for CSS "transform" property.
 * @param {number|string} value
 * @return {string}
 */

function translateX(value) {
  if (typeof value == 'string') {
    return 'translateX(' + value + ')';
  }
  return 'translateX(' + px(value) + ')';
}

/**
 * Returns a "translateX" for CSS "transform" property.
 * @param {number|string} x
 * @param {(number|string)=} opt_y
 * @return {string}
 */

function translate(x, opt_y) {
  if (typeof x == 'number') {
    x = px(x);
  }
  if (opt_y === undefined) {
    return 'translate(' + x + ')';
  }
  if (typeof opt_y == 'number') {
    opt_y = px(opt_y);
  }
  return 'translate(' + x + ',' + opt_y + ')';
}

/**
 * Returns a "scale" for CSS "transform" property.
 * @param {number|string} value
 * @return {string}
 */

function scale(value) {
  return 'scale(' + value + ')';
}

/**
 * Remove alpha value from a rgba color value.
 * Return the new color property with alpha equals if has the alpha value.
 * Caller needs to make sure the input color value is a valid rgba/rgb value
 * @param {string} rgbaColor
 * @return {string}
 */

function removeAlphaFromColor(rgbaColor) {
  return rgbaColor.replace(/\(([^,]+),([^,]+),([^,)]+),[^)]+\)/g, '($1,$2,$3, 1)');
}

/**
 * Gets the computed style of the element. The helper is necessary to enforce
 * the possible `null` value returned by a buggy Firefox.
 *
 * @param {!Window} win
 * @param {!Element} el
 * @return {!Object<string, string>}
 */

function computedStyle(win, el) {
  var style = /** @type {?CSSStyleDeclaration} */win.getComputedStyle(el);
  return (/** @type {!Object<string, string>} */style || _utilsObjectJs.map()
  );
}

/**
 * Resets styles that were set dynamically (i.e. inline)
 * @param {!Element} element
 * @param {!Array<string>} properties
 */

function resetStyles(element, properties) {
  var styleObj = {};
  properties.forEach(function (prop) {
    styleObj[prop] = null;
  });
  setStyles(element, styleObj);
}

},{"./string":147,"./utils/object.js":152}],149:[function(require,module,exports){
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

},{}],150:[function(require,module,exports){
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

},{}],151:[function(require,module,exports){
exports.__esModule = true;
exports.parseUrl = parseUrl;
exports.parseUrlWithA = parseUrlWithA;
exports.appendEncodedParamStringToUrl = appendEncodedParamStringToUrl;
exports.addParamToUrl = addParamToUrl;
exports.addParamsToUrl = addParamsToUrl;
exports.serializeQueryString = serializeQueryString;
exports.isSecureUrl = isSecureUrl;
exports.assertHttpsUrl = assertHttpsUrl;
exports.assertAbsoluteHttpOrHttpsUrl = assertAbsoluteHttpOrHttpsUrl;
exports.parseQueryString = parseQueryString;
exports.removeFragment = removeFragment;
exports.getFragment = getFragment;
exports.isProxyOrigin = isProxyOrigin;
exports.isLocalhostOrigin = isLocalhostOrigin;
exports.isProtocolValid = isProtocolValid;
exports.getSourceUrl = getSourceUrl;
exports.getSourceOrigin = getSourceOrigin;
exports.resolveRelativeUrl = resolveRelativeUrl;
exports.resolveRelativeUrlFallback_ = resolveRelativeUrlFallback_;
exports.getCorsUrl = getCorsUrl;
exports.checkCorsUrl = checkCorsUrl;
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

var _log = require('./log');

var _mode = require('./mode');

var _config = require('./config');

var _types = require('./types');

var _urlParseQueryString = require('./url-parse-query-string');

/**
 * Cached a-tag to avoid memory allocation during URL parsing.
 * @type {HTMLAnchorElement}
 */
var a = undefined;

/**
 * We cached all parsed URLs. As of now there are no use cases
 * of AMP docs that would ever parse an actual large number of URLs,
 * but we often parse the same one over and over again.
 * @type {Object<string, !Location>}
 */
var cache = undefined;

/** @private @const Matches amp_js_* paramters in query string. */
var AMP_JS_PARAMS_REGEX = /[?&]amp_js[^&]*/;

var INVALID_PROTOCOLS = [
/*eslint no-script-url: 0*/'javascript:',
/*eslint no-script-url: 0*/'data:',
/*eslint no-script-url: 0*/'vbscript:'];

/** @const {string} */
var SOURCE_ORIGIN_PARAM = '__amp_source_origin';

exports.SOURCE_ORIGIN_PARAM = SOURCE_ORIGIN_PARAM;
/**
 * Returns a Location-like object for the given URL. If it is relative,
 * the URL gets resolved.
 * Consider the returned object immutable. This is enforced during
 * testing by freezing the object.
 * @param {string} url
 * @param {boolean=} opt_nocache
 * @return {!Location}
 */

function parseUrl(url, opt_nocache) {
  if (!a) {
    exports.a = a = /** @type {!HTMLAnchorElement} */self.document.createElement('a');
    cache = self.UrlCache || (self.UrlCache = Object.create(null));
  }

  var fromCache = cache[url];
  if (fromCache) {
    return fromCache;
  }

  var info = parseUrlWithA(a, url);

  // Freeze during testing to avoid accidental mutation.
  var frozen = _mode.getMode().test && Object.freeze ? Object.freeze(info) : info;

  if (opt_nocache) {
    return frozen;
  }
  return cache[url] = frozen;
}

/**
 * Returns a Location-like object for the given URL. If it is relative,
 * the URL gets resolved.
 * @param {!HTMLAnchorElement} a
 * @param {string} url
 * @return {!Location}
 * @restricted
 */

function parseUrlWithA(a, url) {
  a.href = url;

  // IE11 doesn't provide full URL components when parsing relative URLs.
  // Assigning to itself again does the trick #3449.
  if (!a.protocol) {
    a.href = a.href;
  }

  var info = /** @type {!Location} */{
    href: a.href,
    protocol: a.protocol,
    host: a.host,
    hostname: a.hostname,
    port: a.port == '0' ? '' : a.port,
    pathname: a.pathname,
    search: a.search,
    hash: a.hash,
    origin: null };

  // Some IE11 specific polyfills.
  // 1) IE11 strips out the leading '/' in the pathname.
  // Set below.
  if (info.pathname[0] !== '/') {
    info.pathname = '/' + info.pathname;
  }

  // 2) For URLs with implicit ports, IE11 parses to default ports while
  // other browsers leave the port field empty.
  if (info.protocol == 'http:' && info.port == 80 || info.protocol == 'https:' && info.port == 443) {
    info.port = '';
    info.host = info.hostname;
  }

  // For data URI a.origin is equal to the string 'null' which is not useful.
  // We instead return the actual origin which is the full URL.
  if (a.origin && a.origin != 'null') {
    info.origin = a.origin;
  } else if (info.protocol == 'data:' || !info.host) {
    info.origin = info.href;
  } else {
    info.origin = info.protocol + '//' + info.host;
  }
  return info;
}

/**
 * Appends the string just before the fragment part (or optionally
 * to the front of the query string) of the URL.
 * @param {string} url
 * @param {string} paramString
 * @param {boolean=} opt_addToFront
 * @return {string}
 */

function appendEncodedParamStringToUrl(url, paramString, opt_addToFront) {
  if (!paramString) {
    return url;
  }
  var mainAndFragment = url.split('#', 2);
  var mainAndQuery = mainAndFragment[0].split('?', 2);

  var newUrl = mainAndQuery[0] + (mainAndQuery[1] ? opt_addToFront ? '?' + paramString + '&' + mainAndQuery[1] : '?' + mainAndQuery[1] + '&' + paramString : '?' + paramString);
  newUrl += mainAndFragment[1] ? '#' + mainAndFragment[1] : '';
  return newUrl;
}

/**
 * Appends a query string field and value to a url. `key` and `value`
 * will be ran through `encodeURIComponent` before appending.
 * @param {string} url
 * @param {string} key
 * @param {string} value
 * @param {boolean=} opt_addToFront
 * @return {string}
 */

function addParamToUrl(url, key, value, opt_addToFront) {
  var field = encodeURIComponent(key) + '=' + encodeURIComponent(value);
  return appendEncodedParamStringToUrl(url, field, opt_addToFront);
}

/**
 * Appends query string fields and values to a url. The `params` objects'
 * `key`s and `value`s will be transformed into query string keys/values.
 * @param {string} url
 * @param {!Object<string, string|!Array<string>>} params
 * @return {string}
 */

function addParamsToUrl(url, params) {
  return appendEncodedParamStringToUrl(url, serializeQueryString(params));
}

/**
 * Serializes the passed parameter map into a query string with both keys
 * and values encoded.
 * @param {!Object<string, string|!Array<string>>} params
 * @return {string}
 */

function serializeQueryString(params) {
  var s = [];
  for (var k in params) {
    var v = params[k];
    if (v == null) {
      continue;
    } else if (_types.isArray(v)) {
      for (var i = 0; i < v.length; i++) {
        var sv = /** @type {string} */v[i];
        s.push(encodeURIComponent(k) + '=' + encodeURIComponent(sv));
      }
    } else {
      var sv = /** @type {string} */v;
      s.push(encodeURIComponent(k) + '=' + encodeURIComponent(sv));
    }
  }
  return s.join('&');
}

/**
 * Returns `true` if the URL is secure: either HTTPS or localhost (for testing).
 * @param {string|!Location} url
 * @return {boolean}
 */

function isSecureUrl(url) {
  if (typeof url == 'string') {
    url = parseUrl(url);
  }
  return url.protocol == 'https:' || url.hostname == 'localhost' || _string.endsWith(url.hostname, '.localhost');
}

/**
 * Asserts that a given url is HTTPS or protocol relative. It's a user-level
 * assert.
 *
 * Provides an exception for localhost.
 *
 * @param {?string|undefined} urlString
 * @param {!Element|string} elementContext Element where the url was found.
 * @param {string=} sourceName Used for error messages.
 * @return {string}
 */

function assertHttpsUrl(urlString, elementContext) {
  var sourceName = arguments.length <= 2 || arguments[2] === undefined ? 'source' : arguments[2];

  _log.user().assert(urlString != null, '%s %s must be available', elementContext, sourceName);
  // (erwinm, #4560): type cast necessary until #4560 is fixed.
  var theUrlString = /** @type {string} */urlString;
  _log.user().assert(isSecureUrl(theUrlString) || /^(\/\/)/.test(theUrlString), '%s %s must start with ' + '"https://" or "//" or be relative and served from ' + 'either https or from localhost. Invalid value: %s', elementContext, sourceName, theUrlString);
  return theUrlString;
}

/**
 * Asserts that a given url is an absolute HTTP or HTTPS URL.
 * @param {string} urlString
 * @return {string}
 */

function assertAbsoluteHttpOrHttpsUrl(urlString) {
  _log.user().assert(/^https?\:/i.test(urlString), 'URL must start with "http://" or "https://". Invalid value: %s', urlString);
  return parseUrl(urlString).href;
}

/**
 * Parses the query string of an URL. This method returns a simple key/value
 * map. If there are duplicate keys the latest value is returned.
 *
 * This function is implemented in a separate file to avoid a circular
 * dependency.
 *
 * @param {string} queryString
 * @return {!JsonObject}
 */

function parseQueryString(queryString) {
  return _urlParseQueryString.parseQueryString_(queryString);
}

/**
 * Returns the URL without fragment. If URL doesn't contain fragment, the same
 * string is returned.
 * @param {string} url
 * @return {string}
 */

function removeFragment(url) {
  var index = url.indexOf('#');
  if (index == -1) {
    return url;
  }
  return url.substring(0, index);
}

/**
 * Returns the fragment from the URL. If the URL doesn't contain fragment,
 * the empty string is returned.
 * @param {string} url
 * @return {string}
 */

function getFragment(url) {
  var index = url.indexOf('#');
  if (index == -1) {
    return '';
  }
  return url.substring(index);
}

/**
 * Returns whether the URL has the origin of a proxy.
 * @param {string|!Location} url URL of an AMP document.
 * @return {boolean}
 */

function isProxyOrigin(url) {
  if (typeof url == 'string') {
    url = parseUrl(url);
  }
  return _config.urls.cdnProxyRegex.test(url.origin);
}

/**
 * Returns whether the URL origin is localhost.
 * @param {string|!Location} url URL of an AMP document.
 * @return {boolean}
 */

function isLocalhostOrigin(url) {
  if (typeof url == 'string') {
    url = parseUrl(url);
  }
  return _config.urls.localhostRegex.test(url.origin);
}

/**
 * Returns whether the URL has valid protocol.
 * Deep link protocol is valid, but not javascript etc.
 * @param {string|!Location} url
 * @return {boolean}
 */

function isProtocolValid(url) {
  if (!url) {
    return true;
  }
  if (typeof url == 'string') {
    url = parseUrl(url);
  }
  return !INVALID_PROTOCOLS.includes(url.protocol);
}

/**
 * Removes parameters that start with amp js parameter pattern and returns the new
 * search string.
 * @param {string} urlSearch
 * @return {string}
 */
function removeAmpJsParams(urlSearch) {
  if (!urlSearch || urlSearch == '?') {
    return '';
  }
  var search = urlSearch.replace(AMP_JS_PARAMS_REGEX, '').replace(/^[?&]/, ''); // Removes first ? or &.
  return search ? '?' + search : '';
}

/**
 * Returns the source URL of an AMP document for documents served
 * on a proxy origin or directly.
 * @param {string|!Location} url URL of an AMP document.
 * @return {string}
 */

function getSourceUrl(url) {
  if (typeof url == 'string') {
    url = parseUrl(url);
  }

  // Not a proxy URL - return the URL itself.
  if (!isProxyOrigin(url)) {
    return url.href;
  }

  // A proxy URL.
  // Example path that is being matched here.
  // https://cdn.ampproject.org/c/s/www.origin.com/foo/
  // The /s/ is optional and signals a secure origin.
  var path = url.pathname.split('/');
  var prefix = path[1];
  _log.user().assert(prefix == 'a' || prefix == 'c' || prefix == 'v', 'Unknown path prefix in url %s', url.href);
  var domainOrHttpsSignal = path[2];
  var origin = domainOrHttpsSignal == 's' ? 'https://' + decodeURIComponent(path[3]) : 'http://' + decodeURIComponent(domainOrHttpsSignal);
  // Sanity test that what we found looks like a domain.
  _log.user().assert(origin.indexOf('.') > 0, 'Expected a . in origin %s', origin);
  path.splice(1, domainOrHttpsSignal == 's' ? 3 : 2);
  return origin + path.join('/') + removeAmpJsParams(url.search) + (url.hash || '');
}

/**
 * Returns the source origin of an AMP document for documents served
 * on a proxy origin or directly.
 * @param {string|!Location} url URL of an AMP document.
 * @return {string} The source origin of the URL.
 */

function getSourceOrigin(url) {
  return parseUrl(getSourceUrl(url)).origin;
}

/**
 * Returns absolute URL resolved based on the relative URL and the base.
 * @param {string} relativeUrlString
 * @param {string|!Location} baseUrl
 * @return {string}
 */

function resolveRelativeUrl(relativeUrlString, baseUrl) {
  if (typeof baseUrl == 'string') {
    baseUrl = parseUrl(baseUrl);
  }
  if (typeof URL == 'function') {
    return new URL(relativeUrlString, baseUrl.href).toString();
  }
  return resolveRelativeUrlFallback_(relativeUrlString, baseUrl);
}

/**
 * Fallback for URL resolver when URL class is not available.
 * @param {string} relativeUrlString
 * @param {string|!Location} baseUrl
 * @return {string}
 * @private Visible for testing.
 */

function resolveRelativeUrlFallback_(relativeUrlString, baseUrl) {
  if (typeof baseUrl == 'string') {
    baseUrl = parseUrl(baseUrl);
  }
  relativeUrlString = relativeUrlString.replace(/\\/g, '/');
  var relativeUrl = parseUrl(relativeUrlString);

  // Absolute URL.
  if (_string.startsWith(relativeUrlString.toLowerCase(), relativeUrl.protocol)) {
    return relativeUrl.href;
  }

  // Protocol-relative URL.
  if (_string.startsWith(relativeUrlString, '//')) {
    return baseUrl.protocol + relativeUrlString;
  }

  // Absolute path.
  if (_string.startsWith(relativeUrlString, '/')) {
    return baseUrl.origin + relativeUrlString;
  }

  // Relative path.
  return baseUrl.origin + baseUrl.pathname.replace(/\/[^/]*$/, '/') + relativeUrlString;
}

/**
 * Add "__amp_source_origin" query parameter to the URL.
 * @param {!Window} win
 * @param {string} url
 * @return {string}
 */

function getCorsUrl(win, url) {
  checkCorsUrl(url);
  var sourceOrigin = getSourceOrigin(win.location.href);
  return addParamToUrl(url, SOURCE_ORIGIN_PARAM, sourceOrigin);
}

/**
 * Checks if the url have __amp_source_origin and throws if it does.
 * @param {string} url
 */

function checkCorsUrl(url) {
  var parsedUrl = parseUrl(url);
  var query = parseQueryString(parsedUrl.search);
  _log.user().assert(!(SOURCE_ORIGIN_PARAM in query), 'Source origin is not allowed in %s', url);
}

},{"./config":138,"./log":141,"./mode":143,"./string":147,"./types":149,"./url-parse-query-string":150}],152:[function(require,module,exports){
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

},{"../types":149}],153:[function(require,module,exports){
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

},{}]},{},[8])

//# sourceMappingURL=integration.js.map