(self.AMP=self.AMP||[]).push({n:"amp-analytics",v:"1499663230322",f:(function(AMP){(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
exports.__esModule = true;
exports.installActivityServiceForTesting = installActivityServiceForTesting;
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
 * @fileoverview Provides an ability to collect data about activities the user
 * has performed on the page.
 */

var _srcServices = require('../../../src/services');

var _srcEventHelper = require('../../../src/event-helper');

var _srcService = require('../../../src/service');

/**
 * The amount of time after an activity the user is considered engaged.
 * @private @const {number}
 */
var DEFAULT_ENGAGED_SECONDS = 5;

/**
 * @enum {string}
 */
var ActivityEventType = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

/**
 * @typedef {{
 *   type: string,
 *   time: number
 * }}
 */
var ActivityEventDef = undefined;

/**
 * Find the engaged time between the event and the time (exclusive of the time)
 * @param {ActivityEventDef} activityEvent
 * @param {number} time
 * @return {number}
 * @private
 */
function findEngagedTimeBetween(activityEvent, time) {
  var engagementBonus = 0;

  if (activityEvent.type === ActivityEventType.ACTIVE) {
    engagementBonus = DEFAULT_ENGAGED_SECONDS;
  }

  return Math.min(time - activityEvent.time, engagementBonus);
}

var ActivityHistory = (function () {
  function ActivityHistory() {
    babelHelpers.classCallCheck(this, ActivityHistory);

    /** @private {number} */
    this.totalEngagedTime_ = 0;

    /**
     * prevActivityEvent_ remains undefined until the first valid push call.
     * @private {ActivityEventDef|undefined}
     */
    this.prevActivityEvent_ = undefined;
  }

  /**
   * Array of event types which will be listened for on the document to indicate
   * activity. Other activities are also observed on the Viewer and Viewport
   * objects. See {@link setUpActivityListeners_} for listener implementation.
   * @private @const {Array<string>}
   */

  /**
   * Indicate that an activity took place at the given time.
   * @param {ActivityEventDef} activityEvent
   */

  ActivityHistory.prototype.push = function push(activityEvent) {
    if (!this.prevActivityEvent_) {
      this.prevActivityEvent_ = activityEvent;
    }

    if (this.prevActivityEvent_.time < activityEvent.time) {
      this.totalEngagedTime_ += findEngagedTimeBetween(this.prevActivityEvent_, activityEvent.time);
      this.prevActivityEvent_ = activityEvent;
    }
  };

  /**
   * Get the total engaged time up to the given time recorded in
   * ActivityHistory.
   * @param {number} time
   * @return {number}
   */

  ActivityHistory.prototype.getTotalEngagedTime = function getTotalEngagedTime(time) {
    var totalEngagedTime = 0;
    if (this.prevActivityEvent_ !== undefined) {
      totalEngagedTime = this.totalEngagedTime_ + findEngagedTimeBetween(this.prevActivityEvent_, time);
    }
    return totalEngagedTime;
  };

  return ActivityHistory;
})();

var ACTIVE_EVENT_TYPES = ['mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup'];

/**
 * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampDoc
 */

function installActivityServiceForTesting(ampDoc) {
  _srcService.registerServiceBuilderForDoc(ampDoc, 'activity', Activity);
}

var Activity = (function () {

  /**
   * Activity tracks basic user activity on the page.
   *  - Listeners are not registered on the activity event types until the
   *    Viewer's `whenFirstVisible` is resolved.
   *  - When the `whenFirstVisible` of Viewer is resolved, a first activity
   *    is recorded.
   *  - The first activity in any second causes all other activities to be
   *    ignored. This is similar to debounce functionality since some events
   *    (e.g. scroll) could occur in rapid succession.
   *  - In any one second period, active events or inactive events can override
   *    each other. Whichever type occured last has precedence.
   *  - Active events give a 5 second "bonus" to engaged time.
   *  - Inactive events cause an immediate stop to the engaged time bonus of
   *    any previous activity event.
   *  - At any point after instantiation, `getTotalEngagedTime` can be used
   *    to get the engage time up to the time the function is called. If
   *    `whenFirstVisible` has not yet resolved, engaged time is 0.
   * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
   */

  function Activity(ampdoc) {
    babelHelpers.classCallCheck(this, Activity);

    /** @const {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc */
    this.ampdoc = ampdoc;

    /** @private @const {function()} */
    this.boundStopIgnore_ = this.stopIgnore_.bind(this);

    /** @private @const {function()} */
    this.boundHandleActivity_ = this.handleActivity_.bind(this);

    /** @private @const {function()} */
    this.boundHandleInactive_ = this.handleInactive_.bind(this);

    /** @private @const {function()} */
    this.boundHandleVisibilityChange_ = this.handleVisibilityChange_.bind(this);

    /** @private {Array<!UnlistenDef>} */
    this.unlistenFuncs_ = [];

    /** @private {boolean} */
    this.ignoreActivity_ = false;

    /** @private {boolean} */
    this.ignoreInactive_ = false;

    /** @private @const {!ActivityHistory} */
    this.activityHistory_ = new ActivityHistory();

    /** @private @const {!../../../src/service/viewer-impl.Viewer} */
    this.viewer_ = _srcServices.viewerForDoc(this.ampdoc);

    /** @private @const {!../../../src/service/viewport-impl.Viewport} */
    this.viewport_ = _srcServices.viewportForDoc(this.ampdoc);

    this.viewer_.whenFirstVisible().then(this.start_.bind(this));
  }

  /** @private */

  Activity.prototype.start_ = function start_() {
    /** @private @const {number} */
    this.startTime_ = Date.now();
    // record an activity since this is when the page became visible
    this.handleActivity_();
    this.setUpActivityListeners_();
  };

  /** @private */

  Activity.prototype.getTimeSinceStart_ = function getTimeSinceStart_() {
    var timeSinceStart = Date.now() - this.startTime_;
    // Ensure that a negative time is never returned. This may cause loss of
    // data if there is a time change during the session but it will decrease
    // the likelyhood of errors in that situation.
    return timeSinceStart > 0 ? timeSinceStart : 0;
  };

  /**
   * Return to a state where neither activities or inactivity events are
   * ignored when that event type is fired.
   * @private
   */

  Activity.prototype.stopIgnore_ = function stopIgnore_() {
    this.ignoreActivity_ = false;
    this.ignoreInactive_ = false;
  };

  /** @private */

  Activity.prototype.setUpActivityListeners_ = function setUpActivityListeners_() {
    for (var i = 0; i < ACTIVE_EVENT_TYPES.length; i++) {
      this.unlistenFuncs_.push(_srcEventHelper.listen(this.ampdoc.getRootNode(), ACTIVE_EVENT_TYPES[i], this.boundHandleActivity_));
    }

    this.unlistenFuncs_.push(this.viewer_.onVisibilityChanged(this.boundHandleVisibilityChange_));

    // Viewport.onScroll does not return an unlisten function.
    // TODO(britice): If Viewport is updated to return an unlisten function,
    // update this to capture the unlisten function.
    this.viewport_.onScroll(this.boundHandleActivity_);
  };

  /** @private */

  Activity.prototype.handleActivity_ = function handleActivity_() {
    if (this.ignoreActivity_) {
      return;
    }
    this.ignoreActivity_ = true;
    this.ignoreInactive_ = false;

    this.handleActivityEvent_(ActivityEventType.ACTIVE);
  };

  /** @private */

  Activity.prototype.handleInactive_ = function handleInactive_() {
    if (this.ignoreInactive_) {
      return;
    }
    this.ignoreInactive_ = true;
    this.ignoreActivity_ = false;

    this.handleActivityEvent_(ActivityEventType.INACTIVE);
  };

  /**
   * @param {ActivityEventType} type
   * @private
   */

  Activity.prototype.handleActivityEvent_ = function handleActivityEvent_(type) {
    var timeSinceStart = this.getTimeSinceStart_();
    var secondKey = Math.floor(timeSinceStart / 1000);
    var timeToWait = 1000 - timeSinceStart % 1000;

    // stop ignoring activity at the start of the next activity bucket
    setTimeout(this.boundStopIgnore_, timeToWait);

    this.activityHistory_.push({
      type: type,
      time: secondKey
    });
  };

  /** @private */

  Activity.prototype.handleVisibilityChange_ = function handleVisibilityChange_() {
    if (this.viewer_.isVisible()) {
      this.handleActivity_();
    } else {
      this.handleInactive_();
    }
  };

  /**
   * Remove all listeners associated with this Activity instance.
   * @private
   */

  Activity.prototype.unlisten_ = function unlisten_() {
    for (var i = 0; i < this.unlistenFuncs_.length; i++) {
      var unlistenFunc = this.unlistenFuncs_[i];
      // TODO(britice): Due to eslint typechecking, this check may not be
      // necessary.
      if (typeof unlistenFunc === 'function') {
        unlistenFunc();
      }
    }
    this.unlistenFuncs_ = [];
  };

  /** @private */

  Activity.prototype.cleanup_ = function cleanup_() {
    this.unlisten_();
  };

  /**
   * Get total engaged time since the page became visible.
   * @return {number}
   */

  Activity.prototype.getTotalEngagedTime = function getTotalEngagedTime() {
    var secondsSinceStart = Math.floor(this.getTimeSinceStart_() / 1000);
    return this.activityHistory_.getTotalEngagedTime(secondsSinceStart);
  };

  return Activity;
})();

exports.Activity = Activity;
;

},{"../../../src/event-helper":25,"../../../src/service":44,"../../../src/services":45}],2:[function(require,module,exports){
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

var _srcDom = require('../../../src/dom');

var _srcUrl = require('../../../src/url');

var _srcLog = require('../../../src/log');

var _srcString = require('../../../src/string');

var _srcTypes = require('../../../src/types');

var _srcUtilsObject = require('../../../src/utils/object');

var _transport = require('./transport');

var _srcServices = require('../../../src/services');

var _srcCrypto = require('../../../src/crypto');

var _srcStyle = require('../../../src/style');

var _srcJson = require('../../../src/json');

var _activityImpl = require('./activity-impl');

var _cidImpl = require('./cid-impl');

var _instrumentation = require('./instrumentation');

var _variables = require('./variables');

var _vendors = require('./vendors');

var _sandboxVarsWhitelist = require('./sandbox-vars-whitelist');

// Register doc-service factory.
AMP.registerServiceForDoc('amp-analytics-instrumentation', _instrumentation.InstrumentationService);
AMP.registerServiceForDoc('activity', _activityImpl.Activity);
AMP.registerServiceForDoc('cid', _cidImpl.Cid);

_variables.installVariableService(AMP.win);

var MAX_REPLACES = 16; // The maximum number of entries in a extraUrlParamsReplaceMap

var WHITELIST_EVENT_IN_SANDBOX = [_instrumentation.AnalyticsEventType.VISIBLE, _instrumentation.AnalyticsEventType.HIDDEN];

var AmpAnalytics = (function (_AMP$BaseElement) {
  babelHelpers.inherits(AmpAnalytics, _AMP$BaseElement);

  /** @param {!AmpElement} element */

  function AmpAnalytics(element) {
    babelHelpers.classCallCheck(this, AmpAnalytics);

    _AMP$BaseElement.call(this, element);

    /**
     * @const {!JsonObject} Copied here for tests.
     * @private
     */
    this.predefinedConfig_ = _vendors.ANALYTICS_CONFIG;

    /** @private {!Promise} */
    this.consentPromise_ = Promise.resolve();

    /**
     * The html id of the `amp-user-notification` element.
     * @private {?string}
     */
    this.consentNotificationId_ = null;

    /**
     * @private {?string} Predefined type associated with the tag. If specified,
     * the config from the predefined type is merged with the inline config
     */
    this.type_ = null;

    /** @private {!boolean} */
    this.isSandbox_ = element.hasAttribute('sandbox');

    /**
     * @private {Object<string, string>} A map of request names to the request
     * format string used by the tag to send data
     */
    this.requests_ = {};

    /**
     * @private {JsonObject}
     */
    this.config_ = _srcUtilsObject.dict();

    /**
     * @private {JsonObject}
     */
    this.remoteConfig_ = _srcUtilsObject.dict();

    /** @private {?./instrumentation.InstrumentationService} */
    this.instrumentation_ = null;

    /** @private {?./instrumentation.AnalyticsGroup} */
    this.analyticsGroup_ = null;

    /** @private {!./variables.VariableService} */
    this.variableService_ = _variables.variableServiceFor(this.win);

    /** @private {!../../../src/service/crypto-impl.Crypto} */
    this.cryptoService_ = _srcCrypto.cryptoFor(this.win);

    /** @private {?Promise} */
    this.iniPromise_ = null;
  }

  /** @override */

  AmpAnalytics.prototype.getPriority = function getPriority() {
    // Loads after other content.
    return 1;
  };

  /** @override */

  AmpAnalytics.prototype.isAlwaysFixed = function isAlwaysFixed() {
    return true;
  };

  /** @override */

  AmpAnalytics.prototype.isLayoutSupported = function isLayoutSupported(unusedLayout) {
    return true;
  };

  /** @override */

  AmpAnalytics.prototype.buildCallback = function buildCallback() {
    var _this = this;

    this.element.setAttribute('aria-hidden', 'true');

    this.consentNotificationId_ = this.element.getAttribute('data-consent-notification-id');

    if (this.consentNotificationId_ != null) {
      this.consentPromise_ = _srcServices.userNotificationManagerFor(this.win).then(function (service) {
        return service.get(_this.consentNotificationId_);
      });
    }

    if (this.element.getAttribute('trigger') == 'immediate') {
      this.ensureInitialized_();
    }
  };

  /** @override */

  AmpAnalytics.prototype.layoutCallback = function layoutCallback() {
    // Now that we are rendered, stop rendering the element to reduce
    // resource consumption.
    return this.ensureInitialized_();
  };

  /** @override */

  AmpAnalytics.prototype.detachedCallback = function detachedCallback() {
    if (this.analyticsGroup_) {
      this.analyticsGroup_.dispose();
      this.analyticsGroup_ = null;
    }
  };

  /**
   * @return {!Promise}
   * @private
   */

  AmpAnalytics.prototype.ensureInitialized_ = function ensureInitialized_() {
    var _this2 = this;

    if (this.iniPromise_) {
      return this.iniPromise_;
    }
    _srcStyle.toggle(this.element, false);
    this.iniPromise_ = _srcServices.viewerForDoc(this.getAmpDoc()).whenFirstVisible()
    // Rudimentary "idle" signal.
    .then(function () {
      return _srcServices.timerFor(_this2.win).promise(1);
    }).then(function () {
      return _this2.consentPromise_;
    }).then(this.fetchRemoteConfig_.bind(this)).then(function () {
      return _instrumentation.instrumentationServicePromiseForDoc(_this2.getAmpDoc());
    }).then(function (instrumentation) {
      _this2.instrumentation_ = instrumentation;
    }).then(this.onFetchRemoteConfigSuccess_.bind(this));
    return this.iniPromise_;
  };

  /**
   * Handle successful fetching of (possibly) remote config.
   * @return {!Promise|undefined}
   * @private
   */

  AmpAnalytics.prototype.onFetchRemoteConfigSuccess_ = function onFetchRemoteConfigSuccess_() {
    var _this3 = this;

    this.config_ = this.mergeConfigs_();

    if (this.hasOptedOut_()) {
      // Nothing to do when the user has opted out.
      var TAG = this.getName_();
      _srcLog.user().fine(TAG, 'User has opted out. No hits will be sent.');
      return Promise.resolve();
    }

    this.generateRequests_();

    if (!this.config_['triggers']) {
      var TAG = this.getName_();
      _srcLog.user().error(TAG, 'No triggers were found in the ' + 'config. No analytics data will be sent.');
      return Promise.resolve();
    }

    this.processExtraUrlParams_(this.config_['extraUrlParams'], this.config_['extraUrlParamsReplaceMap']);

    this.analyticsGroup_ = this.instrumentation_.createAnalyticsGroup(this.element);

    var promises = [];
    // Trigger callback can be synchronous. Do the registration at the end.
    for (var k in this.config_['triggers']) {
      if (_srcUtilsObject.hasOwn(this.config_['triggers'], k)) {
        var _ret = (function () {
          var trigger = _this3.config_['triggers'][k];
          var expansionOptions = _this3.expansionOptions_({}, trigger, undefined, true);
          var TAG = _this3.getName_();
          if (!trigger) {
            _srcLog.user().error(TAG, 'Trigger should be an object: ', k);
            return 'continue';
          }
          if (!trigger['on'] || !trigger['request']) {
            _srcLog.user().error(TAG, '"on" and "request" ' + 'attributes are required for data to be collected.');
            return 'continue';
          }
          // Check for not supported trigger for sandboxed analytics
          if (_this3.isSandbox_) {
            var eventType = trigger['on'];
            if (_srcTypes.isEnumValue(_instrumentation.AnalyticsEventType, eventType) && !WHITELIST_EVENT_IN_SANDBOX.includes(eventType)) {
              _srcLog.user().error(TAG, eventType + 'is not supported for amp-analytics' + ' in scope');
              return 'continue';
            }
          }

          _this3.processExtraUrlParams_(trigger['extraUrlParams'], _this3.config_['extraUrlParamsReplaceMap']);
          promises.push(_this3.isSampledIn_(trigger).then(function (result) {
            if (!result) {
              return;
            }
            // replace selector and selectionMethod
            if (_this3.isSandbox_) {
              // Only support selection of parent element for analytics in scope
              trigger['selector'] = _this3.element.parentElement.tagName;
              trigger['selectionMethod'] = 'closest';
              _this3.addTriggerNoInline_(trigger);
            } else if (trigger['selector']) {
              // Expand the selector using variable expansion.
              return _this3.variableService_.expandTemplate(trigger['selector'], expansionOptions).then(function (selector) {
                trigger['selector'] = selector;
                _this3.addTriggerNoInline_(trigger);
              });
            } else {
              _this3.addTriggerNoInline_(trigger);
            }
          }));
        })();

        if (_ret === 'continue') continue;
      }
    }
    return Promise.all(promises);
  };

  /**
   * Calls `AnalyticsGroup.addTrigger` and reports any errors. "NoInline" is
   * to avoid inlining this method so that `try/catch` does it veto
   * optimizations.
   * @param {!JsonObject} config
   * @private
   */

  AmpAnalytics.prototype.addTriggerNoInline_ = function addTriggerNoInline_(config) {
    try {
      this.analyticsGroup_.addTrigger(config, this.handleEvent_.bind(this, config));
    } catch (e) {
      var TAG = this.getName_();
      var eventType = config['on'];
      _srcLog.rethrowAsync(TAG, 'Failed to process trigger "' + eventType + '"', e);
    }
  };

  /**
   * Replace the names of keys in params object with the values in replace map.
   *
   * @param {!Object<string, string>} params The params that need to be renamed.
   * @param {!Object<string, string>} replaceMap A map of pattern and replacement
   *    value.
   * @private
   */

  AmpAnalytics.prototype.processExtraUrlParams_ = function processExtraUrlParams_(params, replaceMap) {
    if (params && replaceMap) {
      // If the config includes a extraUrlParamsReplaceMap, apply it as a set
      // of params to String.replace to allow aliasing of the keys in
      // extraUrlParams.
      var count = 0;
      for (var replaceMapKey in replaceMap) {
        if (++count > MAX_REPLACES) {
          var TAG = this.getName_();
          _srcLog.user().error(TAG, 'More than ' + MAX_REPLACES + ' extraUrlParamsReplaceMap rules ' + 'aren\'t allowed; Skipping the rest');
          break;
        }

        for (var extraUrlParamsKey in params) {
          var newkey = extraUrlParamsKey.replace(replaceMapKey, replaceMap[replaceMapKey]);
          if (extraUrlParamsKey != newkey) {
            var value = params[extraUrlParamsKey];
            delete params[extraUrlParamsKey];
            params[newkey] = value;
          }
        }
      }
    }
  };

  /**
   * Returns a promise that resolves when remote config is ready (or
   * immediately if no remote config is specified.)
   * @private
   * @return {!Promise<undefined>}
   */

  AmpAnalytics.prototype.fetchRemoteConfig_ = function fetchRemoteConfig_() {
    var _this4 = this;

    var remoteConfigUrl = this.element.getAttribute('config');
    if (!remoteConfigUrl || this.isSandbox_) {
      return Promise.resolve();
    }
    _srcUrl.assertHttpsUrl(remoteConfigUrl, this.element);
    var TAG = this.getName_();
    _srcLog.dev().fine(TAG, 'Fetching remote config', remoteConfigUrl);
    var fetchConfig = {};
    if (this.element.hasAttribute('data-credentials')) {
      fetchConfig.credentials = this.element.getAttribute('data-credentials');
    }
    var ampdoc = this.getAmpDoc();
    return _srcServices.urlReplacementsForDoc(this.element).expandAsync(remoteConfigUrl).then(function (expandedUrl) {
      remoteConfigUrl = expandedUrl;
      return _srcServices.xhrFor(ampdoc.win).fetchJson(remoteConfigUrl, fetchConfig);
    }).then(function (res) {
      return res.json();
    }).then(function (jsonValue) {
      _this4.remoteConfig_ = jsonValue;
      _srcLog.dev().fine(TAG, 'Remote config loaded', remoteConfigUrl);
    }, function (err) {
      _srcLog.user().error(TAG, 'Error loading remote config: ', remoteConfigUrl, err);
    });
  };

  /**
   * Merges various sources of configs and stores them in a member variable.
   *
   * Order of precedence for configs from highest to lowest:
   * - Remote config: specified through an attribute of the tag.
   * - Inline config: specified insize the tag.
   * - Predefined config: Defined as part of the platform.
   * - Default config: Built-in config shared by all amp-analytics tags.
   *
   * @private
   * @return {!JsonObject}
   */

  AmpAnalytics.prototype.mergeConfigs_ = function mergeConfigs_() {
    var inlineConfig = this.getInlineConfigNoInline();
    // Initialize config with analytics related vars.
    var config = _srcUtilsObject.dict({
      'vars': {
        'requestCount': 0
      }
    });
    var defaultConfig = this.predefinedConfig_['default'] || {};

    var type = this.element.getAttribute('type');
    if (type == 'googleanalytics-alpha') {
      var TAG = this.getName_();
      _srcLog.user().warn(TAG, '"googleanalytics-alpha" configuration is not ' + 'planned to be supported long-term. Avoid use of this value for ' + 'amp-analytics config attribute unless you plan to migrate before ' + 'deprecation');
    }
    var typeConfig = this.predefinedConfig_[type] || {};

    this.mergeObjects_(defaultConfig, config);
    this.mergeObjects_(typeConfig, config, /* predefined */true);
    this.mergeObjects_(inlineConfig, config);
    this.mergeObjects_(this.remoteConfig_, config);
    return config;
  };

  /**
   * @private
   * @return {!JsonObject}
   */

  AmpAnalytics.prototype.getInlineConfigNoInline = function getInlineConfigNoInline() {
    if (this.element.CONFIG) {
      // If the analytics element is created by runtime, return cached config.
      return this.element.CONFIG;
    }
    var inlineConfig = {};
    var TAG = this.getName_();
    try {
      var children = this.element.children;
      if (children.length == 1) {
        var child = children[0];
        if (_srcDom.isJsonScriptTag(child)) {
          inlineConfig = _srcJson.parseJson(children[0].textContent);
        } else {
          _srcLog.user().error(TAG, 'The analytics config should ' + 'be put in a <script> tag with type="application/json"');
        }
      } else if (children.length > 1) {
        _srcLog.user().error(TAG, 'The tag should contain only one' + ' <script> child.');
      }
    } catch (er) {
      _srcLog.user().error(TAG, 'Analytics config could not be ' + 'parsed. Is it in a valid JSON format?', er);
    }
    return (/** @type {!JsonObject} */inlineConfig
    );
  };

  /**
   * @return {boolean} true if the user has opted out.
   */

  AmpAnalytics.prototype.hasOptedOut_ = function hasOptedOut_() {
    if (!this.config_['optout']) {
      return false;
    }

    var props = this.config_['optout'].split('.');
    var k = this.win;
    for (var i = 0; i < props.length; i++) {
      if (!k) {
        return false;
      }
      k = k[props[i]];
    }
    // The actual property being called is controlled by vendor configs only
    // that are approved in code reviews. User customization of the `optout`
    // property is not allowed.
    return k();
  };

  /**
   * Goes through all the requests in predefined vendor config and tag's config
   * and creates a map of request name to request template. These requests can
   * then be used while sending a request to a server.
   *
   * @private
   */

  AmpAnalytics.prototype.generateRequests_ = function generateRequests_() {
    var _this5 = this;

    var requests = {};
    if (!this.config_ || !this.config_['requests']) {
      var TAG = this.getName_();
      _srcLog.user().error(TAG, 'No request strings defined. Analytics ' + 'data will not be sent from this page.');
      return;
    }
    for (var k in this.config_['requests']) {
      if (_srcUtilsObject.hasOwn(this.config_['requests'], k)) {
        requests[k] = this.config_['requests'][k];
      }
    }
    this.requests_ = requests;

    // Expand any placeholders. For requests, we expand each string up to 5
    // times to support nested requests. Leave any unresolved placeholders.
    for (var k in this.requests_) {
      this.requests_[k] = _srcString.expandTemplate(this.requests_[k], function (key) {
        return _this5.requests_[key] || '${' + key + '}';
      }, 5);
    }
  };

  /**
   * Callback for events that are registered by the config's triggers. This
   * method generates requests and sends them out.
   *
   * @param {!JsonObject} trigger JSON config block that resulted in this event.
   * @param {!Object} event Object with details about the event.
   * @return {!Promise} The request that was sent out.
   * @private
   */

  AmpAnalytics.prototype.handleEvent_ = function handleEvent_(trigger, event) {
    var requests = _srcTypes.isArray(trigger['request']) ? trigger['request'] : [trigger['request']];

    var resultPromises = [];
    for (var r = 0; r < requests.length; r++) {
      var request = this.requests_[requests[r]];
      resultPromises.push(this.handleRequestForEvent_(request, trigger, event));
    }
    return Promise.all(resultPromises);
  };

  /**
   * Processes a request for an event callback and sends it out.
   *
   * @param {string} request The request to process.
   * @param {!JsonObject} trigger JSON config block that resulted in this event.
   * @param {!Object} event Object with details about the event.
   * @return {!Promise<string|undefined>} The request that was sent out.
   * @private
   */

  AmpAnalytics.prototype.handleRequestForEvent_ = function handleRequestForEvent_(request, trigger, event) {
    var _this6 = this;

    if (!this.element.ownerDocument.defaultView) {
      var TAG = this.getName_();
      _srcLog.dev().warn(TAG, 'request against destroyed embed: ', trigger['on']);
      return Promise.resolve();
    }

    if (!request) {
      var TAG = this.getName_();
      _srcLog.user().error(TAG, 'Ignoring event. Request string ' + 'not found: ', trigger['request']);
      return Promise.resolve();
    }

    return this.checkTriggerEnabled_(trigger, event).then(function (enabled) {
      if (!enabled) {
        return;
      }
      return _this6.expandAndSendRequest_(request, trigger, event);
    });
  };

  /**
   * @param {string} request The request to process.
   * @param {!JsonObject} trigger JSON config block that resulted in this event.
   * @param {!Object} event Object with details about the event.
   * @return {!Promise<string>} The request that was sent out.
   * @private
   */

  AmpAnalytics.prototype.expandAndSendRequest_ = function expandAndSendRequest_(request, trigger, event) {
    var _this7 = this;

    return this.expandExtraUrlParams_(trigger, event).then(function (params) {
      request = _this7.addParamsToUrl_(request, params);
      _this7.config_['vars']['requestCount']++;
      var expansionOptions = _this7.expansionOptions_(event, trigger);
      return _this7.variableService_.expandTemplate(request, expansionOptions);
    }).then(function (request) {
      var whiteList = _this7.isSandbox_ ? _sandboxVarsWhitelist.SANDBOX_AVAILABLE_VARS : undefined;
      // For consistency with amp-pixel we also expand any url
      // replacements.
      return _srcServices.urlReplacementsForDoc(_this7.element).expandAsync(request, undefined, whiteList);
    }).then(function (request) {
      _this7.sendRequest_(request, trigger);
      return request;
    });
  };

  /**
   * @param {!JsonObject} trigger JSON config block that resulted in this event.
   * @param {!Object} event Object with details about the event.
   * @return {!Promise<T>} Map of the resolved parameters.
   * @template T
   * @private
   */

  AmpAnalytics.prototype.expandExtraUrlParams_ = function expandExtraUrlParams_(trigger, event) {
    var _this8 = this;

    var requestPromises = [];
    var params = _srcUtilsObject.map();
    // Add any given extraUrlParams as query string param
    if (this.config_['extraUrlParams'] || trigger['extraUrlParams']) {
      var expansionOptions = this.expansionOptions_(event, trigger);
      Object.assign(params, this.config_['extraUrlParams'], trigger['extraUrlParams']);

      var _loop = function (k) {
        if (typeof params[k] == 'string') {
          requestPromises.push(_this8.variableService_.expandTemplate(params[k], expansionOptions).then(function (value) {
            params[k] = value;
          }));
        }
      };

      for (var k in params) {
        _loop(k);
      }
    }
    return Promise.all(requestPromises).then(function () {
      return params;
    });
  };

  /**
   * @param {!JsonObject} trigger The config to use to determine sampling.
   * @return {!Promise<boolean>} Whether the request should be sampled in or
   * not based on sampleSpec.
   * @private
   */

  AmpAnalytics.prototype.isSampledIn_ = function isSampledIn_(trigger) {
    var _this9 = this;

    /** @const {!JsonObject} */
    var spec = trigger['sampleSpec'];
    var resolve = Promise.resolve(true);
    var TAG = this.getName_();
    if (!spec) {
      return resolve;
    }
    var sampleOn = spec['sampleOn'];
    if (!sampleOn) {
      _srcLog.user().error(TAG, 'Invalid sampleOn value.');
      return resolve;
    }
    var threshold = parseFloat(spec['threshold']); // Threshold can be NaN.
    if (threshold >= 0 && threshold <= 100) {
      var expansionOptions = this.expansionOptions_({}, trigger);
      return this.expandTemplateWithUrlParams_(sampleOn, expansionOptions).then(function (key) {
        return _this9.cryptoService_.uniform(key);
      }).then(function (digest) {
        return digest * 100 < threshold;
      });
    }
    _srcLog.user(). /*OK*/error(TAG, 'Invalid threshold for sampling.');
    return resolve;
  };

  /**
   * Checks if request for a trigger is enabled.
   * @param {!JsonObject} trigger The config to use to determine if trigger is
   * enabled.
   * @param {!Object} event Object with details about the event.
   * @return {!Promise<boolean>} Whether trigger must be called.
   * @private
   */

  AmpAnalytics.prototype.checkTriggerEnabled_ = function checkTriggerEnabled_(trigger, event) {
    var expansionOptions = this.expansionOptions_(event, trigger);
    var enabledOnTagLevel = this.checkSpecEnabled_(this.config_['enabled'], expansionOptions);
    var enabledOnTriggerLevel = this.checkSpecEnabled_(trigger['enabled'], expansionOptions);

    return Promise.all([enabledOnTagLevel, enabledOnTriggerLevel]).then(function (enabled) {
      _srcLog.dev().assert(enabled.length === 2);
      return enabled[0] && enabled[1];
    });
  };

  /**
   * Checks result of 'enabled' spec evaluation. Returns false if spec is provided and value
   * resolves to a falsey value (empty string, 0, false, null, NaN or undefined).
   * @param {string} spec Expression that will be evaluated.
   * @param {!ExpansionOptions} expansionOptions Expansion options.
   * @return {!Promise<boolean>} False only if spec is provided and value is falsey.
   * @private
   */

  AmpAnalytics.prototype.checkSpecEnabled_ = function checkSpecEnabled_(spec, expansionOptions) {
    // Spec absence always resolves to true.
    if (spec === undefined) {
      return Promise.resolve(true);
    }

    return this.expandTemplateWithUrlParams_(spec, expansionOptions).then(function (val) {
      return val !== '' && val !== '0' && val !== 'false' && val !== 'null' && val !== 'NaN' && val !== 'undefined';
    });
  };

  /**
   * Expands spec using provided expansion options and applies url replacement if necessary.
   * @param {string} spec Expression that needs to be expanded.
   * @param {!ExpansionOptions} expansionOptions Expansion options.
   * @return {!Promise<string>} expanded spec.
   * @private
   */

  AmpAnalytics.prototype.expandTemplateWithUrlParams_ = function expandTemplateWithUrlParams_(spec, expansionOptions) {
    var _this10 = this;

    return this.variableService_.expandTemplate(spec, expansionOptions).then(function (key) {
      return _srcServices.urlReplacementsForDoc(_this10.element).expandUrlAsync(key);
    });
  };

  /**
   * Adds parameters to URL. Similar to the function defined in url.js but with
   * a different encoding method.
   * @param {string} request
   * @param {!Object<string, string>} params
   * @return {string}
   * @private
   */

  AmpAnalytics.prototype.addParamsToUrl_ = function addParamsToUrl_(request, params) {
    var s = [];
    for (var k in params) {
      var v = params[k];
      if (v == null) {
        continue;
      } else {
        var sv = this.variableService_.encodeVars(v, k);
        s.push(encodeURIComponent(k) + '=' + sv);
      }
    }

    var paramString = s.join('&');
    if (request.indexOf('${extraUrlParams}') >= 0) {
      return request.replace('${extraUrlParams}', paramString);
    } else {
      return _srcUrl.appendEncodedParamStringToUrl(request, paramString);
    }
  };

  /**
   * @param {string} request The full request string to send.
   * @param {!JsonObject} trigger
   * @private
   */

  AmpAnalytics.prototype.sendRequest_ = function sendRequest_(request, trigger) {
    if (!request) {
      var TAG = this.getName_();
      _srcLog.user().error(TAG, 'Request not sent. Contents empty.');
      return;
    }
    if (trigger['iframePing']) {
      _srcLog.user().assert(trigger['on'] == 'visible', 'iframePing is only available on page view requests.');
      _transport.sendRequestUsingIframe(this.win, request);
    } else {
      _transport.sendRequest(this.win, request, this.config_['transport'] || {});
    }
  };

  /**
   * @return {string} Returns a string to identify this tag. May not be unique
   * if the element id is not unique.
   * @private
   */

  AmpAnalytics.prototype.getName_ = function getName_() {
    return 'AmpAnalytics ' + (this.element.getAttribute('id') || '<unknown id>');
  };

  /**
   * Merges two objects. If the value is array or plain object, the values are
   * merged otherwise the value is overwritten.
   *
   * @param {Object|Array} from Object or array to merge from
   * @param {Object|Array} to Object or Array to merge into
   * @param {boolean=} opt_predefinedConfig
   * @private
   */

  AmpAnalytics.prototype.mergeObjects_ = function mergeObjects_(from, to, opt_predefinedConfig) {
    if (to === null || to === undefined) {
      to = {};
    }

    // Assert that optouts are allowed only in predefined configs.
    // The last expression adds an exception of known, safe optout function
    // that is already being used in the wild.
    _srcLog.user().assert(opt_predefinedConfig || !from || !from['optout'] || from['optout'] == '_gaUserPrefs.ioo', 'optout property is only available to vendor config.');

    for (var property in from) {
      _srcLog.user().assert(opt_predefinedConfig || property != 'iframePing', 'iframePing config is only available to vendor config.');
      // Only deal with own properties.
      if (_srcUtilsObject.hasOwn(from, property)) {
        if (_srcTypes.isArray(from[property])) {
          if (!_srcTypes.isArray(to[property])) {
            to[property] = [];
          }
          to[property] = this.mergeObjects_(from[property], to[property], opt_predefinedConfig);
        } else if (_srcTypes.isObject(from[property])) {
          if (!_srcTypes.isObject(to[property])) {
            to[property] = {};
          }
          to[property] = this.mergeObjects_(from[property], to[property], opt_predefinedConfig);
        } else {
          to[property] = from[property];
        }
      }
    }
    return to;
  };

  /**
   * @param {!Object<string, Object<string, string|Array<string>>>} source1
   * @param {!Object<string, Object<string, string|Array<string>>>} source2
   * @param {number=} opt_iterations
   * @param {boolean=} opt_noEncode
   * @return {!ExpansionOptions}
   */

  AmpAnalytics.prototype.expansionOptions_ = function expansionOptions_(source1, source2, opt_iterations, opt_noEncode) {
    var vars = _srcUtilsObject.map();
    this.mergeObjects_(this.config_['vars'], vars);
    this.mergeObjects_(source2['vars'], vars);
    this.mergeObjects_(source1['vars'], vars);
    return new _variables.ExpansionOptions(vars, opt_iterations, opt_noEncode);
  };

  return AmpAnalytics;
})(AMP.BaseElement);

exports.AmpAnalytics = AmpAnalytics;

AMP.registerElement('amp-analytics', AmpAnalytics);

},{"../../../src/crypto":20,"../../../src/dom":22,"../../../src/json":31,"../../../src/log":33,"../../../src/services":45,"../../../src/string":46,"../../../src/style":47,"../../../src/types":48,"../../../src/url":50,"../../../src/utils/object":53,"./activity-impl":1,"./cid-impl":4,"./instrumentation":6,"./sandbox-vars-whitelist":7,"./transport":8,"./variables":9,"./vendors":10}],3:[function(require,module,exports){
exports.__esModule = true;
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

var _visibilityManager = require('./visibility-manager');

var _srcDom = require('../../../src/dom');

var _srcLog = require('../../../src/log');

var _srcMode = require('../../../src/mode');

var _srcLayoutRect = require('../../../src/layout-rect');

var _srcUtilsObject = require('../../../src/utils/object');

var _srcServices = require('../../../src/services');

var _srcFriendlyIframeEmbed = require('../../../src/friendly-iframe-embed');

var TAG = 'amp-analytics';

/**
 * An analytics root. Analytics can be scoped to either ampdoc, embed or
 * an arbitrary AMP element.
 *
 * TODO(dvoytenko): consider moving this concept into core as `AmpRoot`
 * interface that will be implemented by `AmpDoc` and `FriendlyIframeEmbed`.
 *
 * @implements {../../../src/service.Disposable}
 * @abstract
 */

var AnalyticsRoot = (function () {
  /**
   * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
   * @param {?AnalyticsRoot} parent
   */

  function AnalyticsRoot(ampdoc, parent) {
    babelHelpers.classCallCheck(this, AnalyticsRoot);

    /** @const */
    this.ampdoc = ampdoc;

    /** @const */
    this.parent = parent;

    /** @const */
    this.trackers_ = _srcUtilsObject.map();

    /** @private {?./visibility-manager.VisibilityManager} */
    this.visibilityManager_ = null;
  }

  /**
   * The implementation of the analytics root for an ampdoc.
   */

  /** @override */

  AnalyticsRoot.prototype.dispose = function dispose() {
    for (var k in this.trackers_) {
      this.trackers_[k].dispose();
      delete this.trackers_[k];
    }
    if (this.visibilityManager_) {
      this.visibilityManager_.dispose();
    }
  };

  /**
   * Returns the type of the tracker.
   * @return {string}
   * @abstract
   */

  AnalyticsRoot.prototype.getType = function getType() {};

  /**
   * The root node the analytics is scoped to.
   *
   * @return {!Document|!ShadowRoot|!Element}
   * @abstract
   */

  AnalyticsRoot.prototype.getRoot = function getRoot() {};

  /**
   * The viewer of analytics root
   * @return {!../../../src/service/viewer-impl.Viewer}
   */

  AnalyticsRoot.prototype.getViewer = function getViewer() {
    return _srcServices.viewerForDoc(this.ampdoc);
  };

  /**
   * The root element within the analytics root.
   *
   * @return {!Element}
   */

  AnalyticsRoot.prototype.getRootElement = function getRootElement() {
    var root = this.getRoot();
    return _srcLog.dev().assertElement(root.documentElement || root.body || root);
  };

  /**
   * The host element of the analytics root.
   *
   * @return {?Element}
   * @abstract
   */

  AnalyticsRoot.prototype.getHostElement = function getHostElement() {};

  /**
   * The signals for the root.
   *
   * @return {!../../../src/utils/signals.Signals}
   * @abstract
   */

  AnalyticsRoot.prototype.signals = function signals() {};

  /**
   * Whether this analytics root contains the specified node.
   *
   * @param {!Node} node
   * @return {boolean}
   */

  AnalyticsRoot.prototype.contains = function contains(node) {
    return this.getRoot().contains(node);
  };

  /**
   * Returns the element with the specified ID in the scope of this root.
   *
   * @param {string} unusedId
   * @return {?Element}
   * @abstract
   */

  AnalyticsRoot.prototype.getElementById = function getElementById(unusedId) {};

  /**
   * Returns the tracker for the specified name and type. If the tracker
   * has not been requested before, it will be created.
   *
   * @param {string} name
   * @param {function(new:./events.EventTracker, !AnalyticsRoot)} klass
   * @return {!./events.EventTracker}
   */

  AnalyticsRoot.prototype.getTracker = function getTracker(name, klass) {
    var tracker = this.trackers_[name];
    if (!tracker) {
      tracker = new klass(this);
      this.trackers_[name] = tracker;
    }
    return tracker;
  };

  /**
   * Returns the tracker for the specified name or `null`.
   * @param {string} name
   * @return {?./events.EventTracker}
   */

  AnalyticsRoot.prototype.getTrackerOptional = function getTrackerOptional(name) {
    return this.trackers_[name] || null;
  };

  /**
   * Searches the element that matches the selector within the scope of the
   * analytics root in relationship to the specified context node.
   *
   * @param {!Element} context
   * @param {string} selector DOM query selector.
   * @param {?string=} selectionMethod Allowed values are `null`,
   *   `'closest'` and `'scope'`.
   * @return {!Promise<!Element>} Element corresponding to the selector.
   */

  AnalyticsRoot.prototype.getElement = function getElement(context, selector) {
    var _this = this;

    var selectionMethod = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

    // Special case selectors. The selection method is irrelavant.
    // And no need to wait for document ready.
    if (selector == ':root') {
      return Promise.resolve(this.getRootElement());
    }
    if (selector == ':host') {
      return new Promise(function (resolve) {
        resolve(_srcLog.user().assertElement(_this.getHostElement(), 'Element "' + selector + '" not found'));
      });
    }

    // Wait for document-ready to avoid false missed searches
    return this.ampdoc.whenReady().then(function () {
      var found = undefined;
      var result = null;
      // Query search based on the selection method.
      if (selectionMethod == 'scope') {
        found = _srcDom.scopedQuerySelector(context, selector);
      } else if (selectionMethod == 'closest') {
        found = _srcDom.closestBySelector(context, selector);
      } else {
        found = _this.getRoot().querySelector(selector);
      }
      // DOM search can "look" outside the boundaries of the root, thus make
      // sure the result is contained.
      if (found && _this.contains(found)) {
        result = found;
      }
      return _srcLog.user().assertElement(result, 'Element "' + selector + '" not found');
    });
  };

  /**
   * Searches the AMP element that matches the selector within the scope of the
   * analytics root in relationship to the specified context node.
   *
   * @param {!Element} context
   * @param {string} selector DOM query selector.
   * @param {?string=} selectionMethod Allowed values are `null`,
   *   `'closest'` and `'scope'`.
   * @return {!Promise<!AmpElement>} AMP element corresponding to the selector if found.
   */

  AnalyticsRoot.prototype.getAmpElement = function getAmpElement(context, selector, selectionMethod) {
    return this.getElement(context, selector, selectionMethod).then(function (element) {
      _srcLog.user().assert(element.classList.contains('i-amphtml-element'), 'Element "%s" is required to be an AMP element', selector);
      return element;
    });
  };

  /**
   * Creates listener-filter for DOM events to check against the specified
   * selector. If the node (or its ancestors) match the selector the listener
   * will be called.
   *
   * @param {function(!Element, !Event)} listener The first argument is the
   *   matched target node and the second is the original event.
   * @param {!Element} context
   * @param {string} selector DOM query selector.
   * @param {?string=} selectionMethod Allowed values are `null`,
   *   `'closest'` and `'scope'`.
   * @return {function(!Event)}
   */

  AnalyticsRoot.prototype.createSelectiveListener = function createSelectiveListener(listener, context, selector) {
    var _this2 = this;

    var selectionMethod = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

    return function (event) {
      if (selector == ':host') {
        // `:host` is not reachable via selective listener b/c event path
        // cannot be retargeted across the boundary of the embed.
        return;
      }

      // Navigate up the DOM tree to find the actual target.
      var rootElement = _this2.getRootElement();
      var isSelectAny = selector == '*';
      var isSelectRoot = selector == ':root';
      var target = event.target;
      while (target) {

        // Target must be contained by this root.
        if (!_this2.contains(target)) {
          break;
        }
        // `:scope` context must contain the target.
        if (selectionMethod == 'scope' && !isSelectRoot && !context.contains(target)) {
          break;
        }
        // `closest()` target must contain the conext.
        if (selectionMethod == 'closest' && !target.contains(context)) {
          // However, the search must continue!
          target = target.parentElement;
          continue;
        }

        // Check if the target matches the selector.
        if (isSelectAny || isSelectRoot && target == rootElement || matchesNoInline(target, selector)) {
          listener(target, event);
          // Don't fire the event multiple times even if the more than one
          // ancestor matches the selector.
          break;
        }

        target = target.parentElement;
      }
    };
  };

  /**
   * Returns the promise that will be resolved as soon as the elements within
   * the root have been loaded inside the first viewport of the root.
   * @return {!Promise}
   * @abstract
   */

  AnalyticsRoot.prototype.whenIniLoaded = function whenIniLoaded() {};

  /**
   * Returns the visibility root corresponding to this analytics root (ampdoc
   * or embed). The visibility root is created lazily as needed and takes
   * care of all visibility tracking functions.
   * @return {!./visibility-manager.VisibilityManager}
   */

  AnalyticsRoot.prototype.getVisibilityManager = function getVisibilityManager() {
    if (!this.visibilityManager_) {
      this.visibilityManager_ = this.createVisibilityManager();
    }
    return this.visibilityManager_;
  };

  /**
   * @return {!./visibility-manager.VisibilityManager}
   * @protected
   * @abstract
   */

  AnalyticsRoot.prototype.createVisibilityManager = function createVisibilityManager() {};

  return AnalyticsRoot;
})();

exports.AnalyticsRoot = AnalyticsRoot;

var AmpdocAnalyticsRoot = (function (_AnalyticsRoot) {
  babelHelpers.inherits(AmpdocAnalyticsRoot, _AnalyticsRoot);

  /**
   * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
   */

  function AmpdocAnalyticsRoot(ampdoc) {
    babelHelpers.classCallCheck(this, AmpdocAnalyticsRoot);

    _AnalyticsRoot.call(this, ampdoc, /* parent */null);
  }

  /**
   * The implementation of the analytics root for FIE.
   */

  /** @override */

  AmpdocAnalyticsRoot.prototype.getType = function getType() {
    return 'ampdoc';
  };

  /** @override */

  AmpdocAnalyticsRoot.prototype.getRoot = function getRoot() {
    return this.ampdoc.getRootNode();
  };

  /** @override */

  AmpdocAnalyticsRoot.prototype.getHostElement = function getHostElement() {
    // ampdoc is always the root of everything - no host.
    return null;
  };

  /** @override */

  AmpdocAnalyticsRoot.prototype.signals = function signals() {
    return this.ampdoc.signals();
  };

  /** @override */

  AmpdocAnalyticsRoot.prototype.getElementById = function getElementById(id) {
    return this.ampdoc.getElementById(id);
  };

  /** @override */

  AmpdocAnalyticsRoot.prototype.whenIniLoaded = function whenIniLoaded() {
    var viewport = _srcServices.viewportForDoc(this.ampdoc);
    var rect = undefined;
    if (_srcMode.getMode(this.ampdoc.win).runtime == 'inabox') {
      // TODO(dvoytenko, #7971): This is currently addresses incorrect position
      // calculations in a in-a-box viewport where all elements are offset
      // to the bottom of the embed. The current approach, even if fixed, still
      // creates a significant probability of risk condition.
      // Once address, we can simply switch to the 0/0 approach in the `else`
      // clause.
      rect = viewport.getLayoutRect(this.getRootElement());
    } else {
      var size = viewport.getSize();
      rect = _srcLayoutRect.layoutRectLtwh(0, 0, size.width, size.height);
    }
    return _srcFriendlyIframeEmbed.whenContentIniLoad(this.ampdoc, this.ampdoc.win, rect);
  };

  /** @override */

  AmpdocAnalyticsRoot.prototype.createVisibilityManager = function createVisibilityManager() {
    return new _visibilityManager.VisibilityManagerForDoc(this.ampdoc);
  };

  return AmpdocAnalyticsRoot;
})(AnalyticsRoot);

exports.AmpdocAnalyticsRoot = AmpdocAnalyticsRoot;

var EmbedAnalyticsRoot = (function (_AnalyticsRoot2) {
  babelHelpers.inherits(EmbedAnalyticsRoot, _AnalyticsRoot2);

  /**
   * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
   * @param {!../../../src/friendly-iframe-embed.FriendlyIframeEmbed} embed
   * @param {?AnalyticsRoot} parent
   */

  function EmbedAnalyticsRoot(ampdoc, embed, parent) {
    babelHelpers.classCallCheck(this, EmbedAnalyticsRoot);

    _AnalyticsRoot2.call(this, ampdoc, parent);
    /** @const */
    this.embed = embed;
  }

  /**
   * @param  {!Element} el
   * @param  {!string} selector
   * @return {boolean}
   */

  /** @override */

  EmbedAnalyticsRoot.prototype.getType = function getType() {
    return 'embed';
  };

  /** @override */

  EmbedAnalyticsRoot.prototype.getRoot = function getRoot() {
    return this.embed.win.document;
  };

  /** @override */

  EmbedAnalyticsRoot.prototype.getHostElement = function getHostElement() {
    return this.embed.iframe;
  };

  /** @override */

  EmbedAnalyticsRoot.prototype.signals = function signals() {
    return this.embed.signals();
  };

  /** @override */

  EmbedAnalyticsRoot.prototype.getElementById = function getElementById(id) {
    return this.embed.win.document.getElementById(id);
  };

  /** @override */

  EmbedAnalyticsRoot.prototype.whenIniLoaded = function whenIniLoaded() {
    return this.embed.whenIniLoaded();
  };

  /** @override */

  EmbedAnalyticsRoot.prototype.createVisibilityManager = function createVisibilityManager() {
    return new _visibilityManager.VisibilityManagerForEmbed(this.parent.getVisibilityManager(), this.embed);
  };

  return EmbedAnalyticsRoot;
})(AnalyticsRoot);

exports.EmbedAnalyticsRoot = EmbedAnalyticsRoot;
function matchesNoInline(el, selector) {
  try {
    return _srcDom.matches(el, selector);
  } catch (e) {
    _srcLog.user().error(TAG, 'Bad query selector.', selector, e);
    return false;
  }
}

},{"../../../src/dom":22,"../../../src/friendly-iframe-embed":27,"../../../src/layout-rect":32,"../../../src/log":33,"../../../src/mode":35,"../../../src/services":45,"../../../src/utils/object":53,"./visibility-manager":12}],4:[function(require,module,exports){
exports.__esModule = true;
exports.getProxySourceOrigin = getProxySourceOrigin;
exports.viewerBaseCid = viewerBaseCid;
exports.cidServiceForDocForTesting = cidServiceForDocForTesting;
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
 * @fileoverview Provides per AMP document source origin and use case
 * persistent client identifiers for use in analytics and similar use
 * cases.
 *
 * For details, see https://goo.gl/Mwaacs
 */

var _srcCookies = require('../../../src/cookies');

var _srcService = require('../../../src/service');

var _srcUrl = require('../../../src/url');

var _srcUtilsObject = require('../../../src/utils/object');

var _srcDom = require('../../../src/dom');

var _srcUtilsBytes = require('../../../src/utils/bytes');

var _srcServices = require('../../../src/services');

var _srcCrypto = require('../../../src/crypto');

var _srcJson = require('../../../src/json');

var _srcLog = require('../../../src/log');

var ONE_DAY_MILLIS = 24 * 3600 * 1000;

/**
 * We ignore base cids that are older than (roughly) one year.
 */
var BASE_CID_MAX_AGE_MILLIS = 365 * ONE_DAY_MILLIS;

var SCOPE_NAME_VALIDATOR = /^[a-zA-Z0-9-_.]+$/;

/**
 * A base cid string value and the time it was last read / stored.
 * @typedef {{time: time, cid: string}}
 */
var BaseCidInfoDef = undefined;

/**
 * The "get CID" parameters.
 * - createCookieIfNotPresent: Whether CID is allowed to create a cookie when.
 *   Default value is `false`.
 * @typedef {{
 *   scope: string,
 *   createCookieIfNotPresent: (boolean|undefined),
 *   cookieName: (string|undefined),
 * }}
 */
var GetCidDef = undefined;

var Cid = (function () {
  /** @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc */

  function Cid(ampdoc) {
    babelHelpers.classCallCheck(this, Cid);

    /** @const */
    this.ampdoc = ampdoc;

    /**
     * Cached base cid once read from storage to avoid repeated
     * reads.
     * @private {?Promise<string>}
     */
    this.baseCid_ = null;

    /**
     * Cache to store external cids. Scope is used as the key and cookie value
     * is the value.
     * @private {!Object<string, !Promise<string>>}
     */
    this.externalCidCache_ = Object.create(null);
  }

  /**
   * Returns the "external cid". This is a cid for a specific purpose
   * (Say Analytics provider X). It is unique per user, that purpose
   * and the AMP origin site.
   * @param {!Cid} cid
   * @param {!GetCidDef} getCidStruct
   * @param {!Promise} persistenceConsent
   * @return {!Promise<?string>}
   */

  /**
   * @param {!GetCidDef} getCidStruct an object provides CID scope name for
   *     proxy case and cookie name for non-proxy case.
   * @param {!Promise} consent Promise for when the user has given consent
   *     (if deemed necessary by the publisher) for use of the client
   *     identifier.
   * @param {!Promise=} opt_persistenceConsent Dedicated promise for when
   *     it is OK to persist a new tracking identifier. This could be
   *     supplied ONLY by the code that supplies the actual consent
   *     cookie.
   *     If this is given, the consent param should be a resolved promise
   *     because this call should be only made in order to get consent.
   *     The consent promise passed to other calls should then itself
   *     depend on the opt_persistenceConsent promise (and the actual
   *     consent, of course).
   * @return {!Promise<?string>} A client identifier that should be used
   *      within the current source origin and externalCidScope. Might be
   *      null if no identifier was found or could be made.
   *      This promise may take a long time to resolve if consent isn't
   *      given.
   */

  Cid.prototype.get = function get(getCidStruct, consent, opt_persistenceConsent) {
    var _this = this;

    _srcLog.user().assert(SCOPE_NAME_VALIDATOR.test(getCidStruct.scope) && SCOPE_NAME_VALIDATOR.test(getCidStruct.cookieName), 'The CID scope and cookie name must only use the characters ' + '[a-zA-Z0-9-_.]+\nInstead found: %s', getCidStruct.scope);
    return consent.then(function () {
      return _srcServices.viewerForDoc(_this.ampdoc).whenFirstVisible();
    }).then(function () {
      return getExternalCid(_this, getCidStruct, opt_persistenceConsent || consent);
    });
  };

  return Cid;
})();

exports.Cid = Cid;
function getExternalCid(cid, getCidStruct, persistenceConsent) {
  /** @const {!Location} */
  var url = _srcUrl.parseUrl(cid.ampdoc.win.location.href);
  if (!_srcUrl.isProxyOrigin(url)) {
    return getOrCreateCookie(cid, getCidStruct, persistenceConsent);
  }
  return getBaseCid(cid, persistenceConsent).then(function (baseCid) {
    return _srcCrypto.cryptoFor(cid.ampdoc.win).sha384Base64(baseCid + getProxySourceOrigin(url) + getCidStruct.scope);
  });
}

/**
 * Sets a new CID cookie for expire 1 year from now.
 * @param {!Window} win
 * @param {string} scope
 * @param {string} cookie
 */
function setCidCookie(win, scope, cookie) {
  var expiration = Date.now() + BASE_CID_MAX_AGE_MILLIS;
  _srcCookies.setCookie(win, scope, cookie, expiration, {
    highestAvailableDomain: true
  });
}

/**
 * If cookie exists it's returned immediately. Otherwise, if instructed, the
 * new cookie is created.
 *
 * @param {!Cid} cid
 * @param {!GetCidDef} getCidStruct
 * @param {!Promise} persistenceConsent
 * @return {!Promise<?string>}
 */
function getOrCreateCookie(cid, getCidStruct, persistenceConsent) {
  var win = cid.ampdoc.win;
  var scope = getCidStruct.scope;
  var cookieName = getCidStruct.cookieName || scope;
  var existingCookie = _srcCookies.getCookie(win, cookieName);

  if (!existingCookie && !getCidStruct.createCookieIfNotPresent) {
    return (/** @type {!Promise<?string>} */Promise.resolve(null)
    );
  }

  if (cid.externalCidCache_[scope]) {
    return (/** @type {!Promise<?string>} */cid.externalCidCache_[scope]
    );
  }

  if (existingCookie) {
    // If we created the cookie, update it's expiration time.
    if (/^amp-/.test(existingCookie)) {
      setCidCookie(win, cookieName, existingCookie);
    }
    return (/** @type {!Promise<?string>} */Promise.resolve(existingCookie)
    );
  }

  var newCookiePromise = _srcCrypto.cryptoFor(win).sha384Base64(getEntropy(win))
  // Create new cookie, always prefixed with "amp-", so that we can see from
  // the value whether we created it.
  .then(function (randomStr) {
    return 'amp-' + randomStr;
  });

  // Store it as a cookie based on the persistence consent.
  Promise.all([newCookiePromise, persistenceConsent]).then(function (results) {
    // The initial CID generation is inherently racy. First one that gets
    // consent wins.
    var newCookie = results[0];
    var relookup = _srcCookies.getCookie(win, cookieName);
    if (!relookup) {
      setCidCookie(win, cookieName, newCookie);
    }
  });
  return cid.externalCidCache_[scope] = newCookiePromise;
}

/**
 * Returns the source origin of an AMP document for documents served
 * on a proxy origin. Throws an error if the doc is not on a proxy origin.
 * @param {!Location} url URL of an AMP document.
 * @return {string} The source origin of the URL.
 * @visibleForTesting BUT if this is needed elsewhere it could be
 *     factored into its own package.
 */

function getProxySourceOrigin(url) {
  _srcLog.user().assert(_srcUrl.isProxyOrigin(url), 'Expected proxy origin %s', url.origin);
  return _srcUrl.getSourceOrigin(url);
}

/**
 * Returns the base cid for the current user(). This string must not
 * be exposed to users without hashing with the current source origin
 * and the externalCidScope.
 * On a proxy this value is the same for a user across all source
 * origins.
 * @param {!Cid} cid
 * @param {!Promise} persistenceConsent
 * @return {!Promise<string>}
 */
function getBaseCid(cid, persistenceConsent) {
  if (cid.baseCid_) {
    return cid.baseCid_;
  }
  var win = cid.ampdoc.win;

  return cid.baseCid_ = read(cid.ampdoc).then(function (stored) {
    var needsToStore = false;
    var baseCid = undefined;

    // See if we have a stored base cid and whether it is still valid
    // in terms of expiration.
    if (stored && !isExpired(stored)) {
      baseCid = Promise.resolve(stored.cid);
      if (shouldUpdateStoredTime(stored)) {
        needsToStore = true;
      }
    } else {
      // We need to make a new one.
      baseCid = _srcCrypto.cryptoFor(win).sha384Base64(getEntropy(win));
      needsToStore = true;
    }

    if (needsToStore) {
      baseCid.then(function (baseCid) {
        store(cid.ampdoc, persistenceConsent, baseCid);
      });
    }

    return baseCid;
  });
}

/**
 * Stores a new cidString in localStorage. Adds the current time to the
 * stored value.
 * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
 * @param {!Promise} persistenceConsent
 * @param {string} cidString Actual cid string to store.
 */
function store(ampdoc, persistenceConsent, cidString) {
  var win = ampdoc.win;
  // TODO(lannka, #4457): ideally, we should check if viewer has the capability
  // of CID storage, rather than if it is iframed.
  if (_srcDom.isIframed(win)) {
    // If we are being embedded, try to save the base cid to the viewer.
    viewerBaseCid(ampdoc, createCidData(cidString));
  } else {
    // To use local storage, we need user's consent.
    persistenceConsent.then(function () {
      try {
        win.localStorage.setItem('amp-cid', createCidData(cidString));
      } catch (ignore) {
        // Setting localStorage may fail. In practice we don't expect that to
        // happen a lot (since we don't go anywhere near the quota, but
        // in particular in Safari private browsing mode it always fails.
        // In that case we just don't store anything, which is just fine.
      }
    });
  }
}

/**
 * Get/set the Base CID from/to the viewer.
 * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
 * @param {string=} opt_data Stringified JSON object {cid, time}.
 * @return {!Promise<string|undefined>}
 */

function viewerBaseCid(ampdoc, opt_data) {
  var viewer = _srcServices.viewerForDoc(ampdoc);
  return viewer.isTrustedViewer().then(function (trusted) {
    if (!trusted) {
      return undefined;
    }
    var cidPromise = viewer.sendMessageAwaitResponse('cid', opt_data).then(function (data) {
      // TODO(dvoytenko, #9019): cleanup the legacy CID format.
      // For backward compatibility: #4029
      if (data && !_srcJson.tryParseJson(data)) {
        // TODO(dvoytenko, #9019): use this for reporting: dev().error('cid', 'invalid cid format');
        return JSON.stringify(_srcUtilsObject.dict({
          'time': Date.now(), // CID returned from old API is always fresh
          'cid': data
        }));
      }
      return data;
    });
    // Getting the CID may take some time (waits for JS file to
    // load, might hit GC), but we do not wait indefinitely. Typically
    // it should resolve in milli seconds.
    return _srcServices.timerFor(ampdoc.win).timeoutPromise(10000, cidPromise, 'base cid')['catch'](function (error) {
      _srcLog.rethrowAsync(error);
      return undefined;
    });
  });
}

/**
 * Creates a JSON object that contains the given CID and the current time as
 * a timestamp.
 * @param {string} cidString
 * @return {string}
 */
function createCidData(cidString) {
  return JSON.stringify(_srcUtilsObject.dict({
    'time': Date.now(),
    'cid': cidString
  }));
}

/**
 * Gets the persisted CID data as a promise. It tries to read from
 * localStorage first then from viewer if it is in embedded mode.
 * Returns null if none was found.
 * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
 * @return {!Promise<?BaseCidInfoDef>}
 */
function read(ampdoc) {
  var win = ampdoc.win;
  var data = undefined;
  try {
    data = win.localStorage.getItem('amp-cid');
  } catch (ignore) {
    // If reading from localStorage fails, we assume it is empty.
  }
  var dataPromise = Promise.resolve(data);
  if (!data && _srcDom.isIframed(win)) {
    // If we are being embedded, try to get the base cid from the viewer.
    dataPromise = viewerBaseCid(ampdoc);
  }
  return dataPromise.then(function (data) {
    if (!data) {
      return null;
    }
    var item = _srcJson.parseJson(data);
    return {
      time: item['time'],
      cid: item['cid']
    };
  });
}

/**
 * Whether the retrieved cid object is expired and should be ignored.
 * @param {!BaseCidInfoDef} storedCidInfo
 * @return {boolean}
 */
function isExpired(storedCidInfo) {
  var createdTime = storedCidInfo.time;
  var now = Date.now();
  return createdTime + BASE_CID_MAX_AGE_MILLIS < now;
}

/**
 * Whether we should write a new timestamp to the stored cid value.
 * We say yes if it is older than 1 day, so we only do this max once
 * per day to avoid writing to localStorage all the time.
 * @param {!BaseCidInfoDef} storedCidInfo
 * @return {boolean}
 */
function shouldUpdateStoredTime(storedCidInfo) {
  var createdTime = storedCidInfo.time;
  var now = Date.now();
  return createdTime + ONE_DAY_MILLIS < now;
}

/**
 * Returns an array with a total of 128 of random values based on the
 * `win.crypto.getRandomValues` API. If that is not available concatenates
 * a string of other values that might be hard to guess including
 * `Math.random` and the current time.
 * @param {!Window} win
 * @return {!Uint8Array|string} Entropy.
 */
function getEntropy(win) {
  // Use win.crypto.getRandomValues to get 128 bits of random value
  var uint8array = _srcUtilsBytes.getCryptoRandomBytesArray(win, 16); // 128 bit
  if (uint8array) {
    return uint8array;
  }

  // Support for legacy browsers.
  return String(win.location.href + Date.now() + win.Math.random() + win.screen.width + win.screen.height);
}

/**
 * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
 * @return {!Cid}
 * @private visible for testing
 */

function cidServiceForDocForTesting(ampdoc) {
  _srcService.registerServiceBuilderForDoc(ampdoc, 'cid', Cid);
  return _srcService.getServiceForDoc(ampdoc, 'cid');
}

},{"../../../src/cookies":19,"../../../src/crypto":20,"../../../src/dom":22,"../../../src/json":31,"../../../src/log":33,"../../../src/service":44,"../../../src/services":45,"../../../src/url":50,"../../../src/utils/bytes":52,"../../../src/utils/object":53}],5:[function(require,module,exports){
exports.__esModule = true;
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

var _srcCommonSignals = require('../../../src/common-signals');

var _srcObservable = require('../../../src/observable');

var _srcDom = require('../../../src/dom');

var _srcLog = require('../../../src/log');

var VARIABLE_DATA_ATTRIBUTE_KEY = /^vars(.+)/;
var NO_UNLISTEN = function () {};

/**
 * @interface
 */

var SignalTrackerDef = (function () {
  function SignalTrackerDef() {
    babelHelpers.classCallCheck(this, SignalTrackerDef);
  }

  /**
   * The analytics event.
   */

  /**
   * @param {string} unusedEventType
   * @return {!Promise}
   */

  SignalTrackerDef.prototype.getRootSignal = function getRootSignal(unusedEventType) {};

  /**
   * @param {string} unusedEventType
   * @param {!Element} unusedElement
   * @return {!Promise}
   */

  SignalTrackerDef.prototype.getElementSignal = function getElementSignal(unusedEventType, unusedElement) {};

  return SignalTrackerDef;
})();

var AnalyticsEvent =
/**
 * @param {!Element} target The most relevant target element.
 * @param {string} type The type of event.
 * @param {!Object<string, string>=} opt_vars A map of vars and their values.
 */
function AnalyticsEvent(target, type, opt_vars) {
  babelHelpers.classCallCheck(this, AnalyticsEvent);

  /** @const */
  this.target = target;
  /** @const */
  this.type = type;
  /** @const */
  this.vars = opt_vars || Object.create(null);
}

/**
 * The base class for all trackers. A tracker tracks all events of the same
 * type for a single analytics root.
 *
 * @implements {../../../src/service.Disposable}
 * @abstract
 * @visibleForTesting
 */
;

exports.AnalyticsEvent = AnalyticsEvent;

var EventTracker = (function () {
  /**
   * @param {!./analytics-root.AnalyticsRoot} root
   */

  function EventTracker(root) {
    babelHelpers.classCallCheck(this, EventTracker);

    /** @const */
    this.root = root;
  }

  /**
   * Tracks custom events.
   */

  /** @override @abstract */

  EventTracker.prototype.dispose = function dispose() {};

  /**
   * @param {!Element} unusedContext
   * @param {string} unusedEventType
   * @param {!JsonObject} unusedConfig
   * @param {function(!AnalyticsEvent)} unusedListener
   * @return {!UnlistenDef}
   * @abstract
   */

  EventTracker.prototype.add = function add(unusedContext, unusedEventType, unusedConfig, unusedListener) {};

  return EventTracker;
})();

exports.EventTracker = EventTracker;

var CustomEventTracker = (function (_EventTracker) {
  babelHelpers.inherits(CustomEventTracker, _EventTracker);

  /**
   * @param {!./analytics-root.AnalyticsRoot} root
   */

  function CustomEventTracker(root) {
    var _this = this;

    babelHelpers.classCallCheck(this, CustomEventTracker);

    _EventTracker.call(this, root);

    /** @const @private {!Object<string, !Observable<!AnalyticsEvent>>} */
    this.observers_ = {};

    /**
     * Early events have to be buffered because there's no way to predict
     * how fast all `amp-analytics` elements will be instrumented.
     * @private {!Object<string, !Array<!AnalyticsEvent>>|undefined}
     */
    this.buffer_ = {};

    // Stop buffering of custom events after 10 seconds. Assumption is that all
    // `amp-analytics` elements will have been instrumented by this time.
    setTimeout(function () {
      _this.buffer_ = undefined;
    }, 10000);
  }

  /**
   * Tracks click events.
   */

  /** @override */

  CustomEventTracker.prototype.dispose = function dispose() {
    this.buffer_ = undefined;
    for (var k in this.observers_) {
      this.observers_[k].removeAll();
    }
  };

  /** @override */

  CustomEventTracker.prototype.add = function add(context, eventType, config, listener) {
    // Push recent events if any.
    var buffer = this.buffer_ && this.buffer_[eventType];
    if (buffer) {
      setTimeout(function () {
        buffer.forEach(function (event) {
          listener(event);
        });
      }, 1);
    }
    var selector = config['selector'];
    if (!selector) {
      selector = ':root';
    }
    var selectionMethod = config['selectionMethod'] || null;

    var targetReady = this.root.getElement(context, selector, selectionMethod);

    var observers = this.observers_[eventType];
    if (!observers) {
      observers = new _srcObservable.Observable();
      this.observers_[eventType] = observers;
    }

    return this.observers_[eventType].add(function (event) {
      // Wait for target selected
      targetReady.then(function (target) {
        if (target.contains(event.target)) {
          listener(event);
        }
      });
    });
  };

  /**
   * Triggers a custom event for the associated root.
   * @param {!AnalyticsEvent} event
   */

  CustomEventTracker.prototype.trigger = function trigger(event) {
    // Buffer still exists - enqueue.
    if (this.buffer_) {
      var buffer = this.buffer_[event.type];
      if (!buffer) {
        buffer = [];
        this.buffer_[event.type] = buffer;
      }
      buffer.push(event);
    }

    // If listeners already present - trigger right away.
    var observers = this.observers_[event.type];
    if (observers) {
      observers.fire(event);
    }
  };

  return CustomEventTracker;
})(EventTracker);

exports.CustomEventTracker = CustomEventTracker;

var ClickEventTracker = (function (_EventTracker2) {
  babelHelpers.inherits(ClickEventTracker, _EventTracker2);

  /**
   * @param {!./analytics-root.AnalyticsRoot} root
   */

  function ClickEventTracker(root) {
    var _this2 = this;

    babelHelpers.classCallCheck(this, ClickEventTracker);

    _EventTracker2.call(this, root);

    /** @private {!Observable<!Event>} */
    this.clickObservable_ = new _srcObservable.Observable();

    /** @private @const */
    this.boundOnClick_ = function (e) {
      _this2.clickObservable_.fire(e);
    };
    this.root.getRoot().addEventListener('click', this.boundOnClick_);
  }

  /**
   * Tracks events based on signals.
   * @implements {SignalTrackerDef}
   */

  /** @override */

  ClickEventTracker.prototype.dispose = function dispose() {
    this.root.getRoot().removeEventListener('click', this.boundOnClick_);
    this.clickObservable_.removeAll();
  };

  /** @override */

  ClickEventTracker.prototype.add = function add(context, eventType, config, listener) {
    var selector = _srcLog.user().assert(config['selector'], 'Missing required selector on click trigger');
    var selectionMethod = config['selectionMethod'] || null;
    return this.clickObservable_.add(this.root.createSelectiveListener(this.handleClick_.bind(this, listener), context.parentElement || context, selector, selectionMethod));
  };

  /**
   * @param {function(!AnalyticsEvent)} listener
   * @param {!Element} target
   * @param {!Event} unusedEvent
   * @private
   */

  ClickEventTracker.prototype.handleClick_ = function handleClick_(listener, target, unusedEvent) {
    var params = _srcDom.getDataParamsFromAttributes(target,
    /* computeParamNameFunc */undefined, VARIABLE_DATA_ATTRIBUTE_KEY);
    listener(new AnalyticsEvent(target, 'click', params));
  };

  return ClickEventTracker;
})(EventTracker);

exports.ClickEventTracker = ClickEventTracker;

var SignalTracker = (function (_EventTracker3) {
  babelHelpers.inherits(SignalTracker, _EventTracker3);

  /**
   * @param {!./analytics-root.AnalyticsRoot} root
   */

  function SignalTracker(root) {
    babelHelpers.classCallCheck(this, SignalTracker);

    _EventTracker3.call(this, root);
  }

  /**
   * Tracks when the elements in the first viewport has been loaded - "ini-load".
   * @implements {SignalTrackerDef}
   */

  /** @override */

  SignalTracker.prototype.dispose = function dispose() {};

  /** @override */

  SignalTracker.prototype.add = function add(context, eventType, config, listener) {
    var _this3 = this;

    var target = undefined;
    var signalsPromise = undefined;
    var selector = config['selector'] || ':root';
    if (selector == ':root' || selector == ':host') {
      // Root selectors are delegated to analytics roots.
      target = this.root.getRootElement();
      signalsPromise = this.getRootSignal(eventType);
    } else {
      // Look for the AMP-element. Wait for DOM to be fully parsed to avoid
      // false missed searches.
      var selectionMethod = config['selectionMethod'];
      signalsPromise = this.root.getAmpElement(context.parentElement || context, selector, selectionMethod).then(function (element) {
        target = element;
        return _this3.getElementSignal(eventType, target);
      });
    }

    // Wait for the target and the event signal.
    signalsPromise.then(function () {
      listener(new AnalyticsEvent(target, eventType));
    });
    return NO_UNLISTEN;
  };

  /** @override */

  SignalTracker.prototype.getRootSignal = function getRootSignal(eventType) {
    return this.root.signals().whenSignal(eventType);
  };

  /** @override */

  SignalTracker.prototype.getElementSignal = function getElementSignal(eventType, element) {
    if (typeof element.signals != 'function') {
      return Promise.resolve();
    }
    return element.signals().whenSignal(eventType);
  };

  return SignalTracker;
})(EventTracker);

exports.SignalTracker = SignalTracker;

var IniLoadTracker = (function (_EventTracker4) {
  babelHelpers.inherits(IniLoadTracker, _EventTracker4);

  /**
   * @param {!./analytics-root.AnalyticsRoot} root
   */

  function IniLoadTracker(root) {
    babelHelpers.classCallCheck(this, IniLoadTracker);

    _EventTracker4.call(this, root);
  }

  /**
   * Tracks visibility events.
   */

  /** @override */

  IniLoadTracker.prototype.dispose = function dispose() {};

  /** @override */

  IniLoadTracker.prototype.add = function add(context, eventType, config, listener) {
    var _this4 = this;

    var target = undefined;
    var promise = undefined;
    var selector = config['selector'] || ':root';
    if (selector == ':root' || selector == ':host') {
      // Root selectors are delegated to analytics roots.
      target = this.root.getRootElement();
      promise = this.getRootSignal();
    } else {
      // An AMP-element. Wait for DOM to be fully parsed to avoid
      // false missed searches.
      var selectionMethod = config['selectionMethod'];
      promise = this.root.getAmpElement(context.parentElement || context, selector, selectionMethod).then(function (element) {
        target = element;
        return _this4.getElementSignal('ini-load', target);
      });
    }
    // Wait for the target and the event.
    promise.then(function () {
      listener(new AnalyticsEvent(target, eventType));
    });
    return NO_UNLISTEN;
  };

  /** @override */

  IniLoadTracker.prototype.getRootSignal = function getRootSignal() {
    return this.root.whenIniLoaded();
  };

  /** @override */

  IniLoadTracker.prototype.getElementSignal = function getElementSignal(unusedEventType, element) {
    if (typeof element.signals != 'function') {
      return Promise.resolve();
    }
    var signals = element.signals();
    return Promise.race([signals.whenSignal(_srcCommonSignals.CommonSignals.INI_LOAD), signals.whenSignal(_srcCommonSignals.CommonSignals.LOAD_END)]);
  };

  return IniLoadTracker;
})(EventTracker);

exports.IniLoadTracker = IniLoadTracker;

var VisibilityTracker = (function (_EventTracker5) {
  babelHelpers.inherits(VisibilityTracker, _EventTracker5);

  /**
   * @param {!./analytics-root.AnalyticsRoot} root
   */

  function VisibilityTracker(root) {
    babelHelpers.classCallCheck(this, VisibilityTracker);

    _EventTracker5.call(this, root);

    /** @private */
    this.waitForTrackers_ = {};
  }

  /** @const @private */

  /** @override */

  VisibilityTracker.prototype.dispose = function dispose() {};

  /** @override */

  VisibilityTracker.prototype.add = function add(context, eventType, config, listener) {
    var _this5 = this;

    var visibilitySpec = config['visibilitySpec'] || {};
    var selector = config['selector'] || visibilitySpec['selector'];
    var waitForSpec = visibilitySpec['waitFor'];
    var visibilityManager = this.root.getVisibilityManager();
    // special polyfill for eventType: 'hidden'
    var createReadyReportPromiseFunc = null;
    if (eventType == 'hidden-v3') {
      createReadyReportPromiseFunc = this.createReportReadyPromise_.bind(this);
    }

    // Root selectors are delegated to analytics roots.
    if (!selector || selector == ':root' || selector == ':host') {
      // When `selector` is specified, we always use "ini-load" signal as
      // a "ready" signal.
      return visibilityManager.listenRoot(visibilitySpec, this.getReadyPromise(waitForSpec, selector), createReadyReportPromiseFunc, this.onEvent_.bind(this, eventType, listener, this.root.getRootElement()));
    }

    // An AMP-element. Wait for DOM to be fully parsed to avoid
    // false missed searches.
    var selectionMethod = config['selectionMethod'] || visibilitySpec['selectionMethod'];
    var unlistenPromise = this.root.getAmpElement(context.parentElement || context, selector, selectionMethod).then(function (element) {
      return visibilityManager.listenElement(element, visibilitySpec, _this5.getReadyPromise(waitForSpec, selector, element), createReadyReportPromiseFunc, _this5.onEvent_.bind(_this5, eventType, listener, element));
    });
    return function () {
      unlistenPromise.then(function (unlisten) {
        unlisten();
      });
    };
  };

  /**
   * @return {!Promise}
   * @visibleForTesting
   */

  VisibilityTracker.prototype.createReportReadyPromise_ = function createReportReadyPromise_() {
    var viewer = this.root.getViewer();

    if (!viewer.isVisible()) {
      return Promise.resolve();
    }

    return new Promise(function (resolve) {
      viewer.onVisibilityChanged(function () {
        if (!viewer.isVisible()) {
          resolve();
        }
      });
    });
  };

  /**
   * @param {string|undefined} waitForSpec
   * @param {string|undefined} selector
   * @param {Element=} element
   * @return {?Promise}
   * @visibleForTesting
   */

  VisibilityTracker.prototype.getReadyPromise = function getReadyPromise(waitForSpec, selector, element) {
    if (!waitForSpec) {
      // Default case:
      if (!selector) {
        // waitFor nothing is selector is not defined
        waitForSpec = 'none';
      } else {
        // otherwise wait for ini-load by default
        waitForSpec = 'ini-load';
      }
    }

    _srcLog.user().assert(SUPPORT_WAITFOR_TRACKERS[waitForSpec] !== undefined, 'waitFor value %s not supported', waitForSpec);

    if (!SUPPORT_WAITFOR_TRACKERS[waitForSpec]) {
      // waitFor NONE, wait for nothing
      return null;
    }

    if (!this.waitForTrackers_[waitForSpec]) {
      this.waitForTrackers_[waitForSpec] = new SUPPORT_WAITFOR_TRACKERS[waitForSpec](this.root);
    }

    var waitForTracker = this.waitForTrackers_[waitForSpec];
    // Wait for root signal if there's no element selected.
    return element ? waitForTracker.getElementSignal(waitForSpec, element) : waitForTracker.getRootSignal(waitForSpec);
  };

  /**
   * @param {string} eventType
   * @param {function(!AnalyticsEvent)} listener
   * @param {!Element} target
   * @param {!Object<string, *>} state
   * @private
   */

  VisibilityTracker.prototype.onEvent_ = function onEvent_(eventType, listener, target, state) {
    var attr = _srcDom.getDataParamsFromAttributes(target,
    /* computeParamNameFunc */undefined, VARIABLE_DATA_ATTRIBUTE_KEY);
    for (var key in attr) {
      state[key] = attr[key];
    }
    listener(new AnalyticsEvent(target, eventType, state));
  };

  return VisibilityTracker;
})(EventTracker);

exports.VisibilityTracker = VisibilityTracker;
var SUPPORT_WAITFOR_TRACKERS = {
  'none': null,
  'ini-load': IniLoadTracker,
  'render-start': SignalTracker
};

},{"../../../src/common-signals":17,"../../../src/dom":22,"../../../src/log":33,"../../../src/observable":36}],6:[function(require,module,exports){
exports.__esModule = true;
exports.instrumentationServicePromiseForDoc = instrumentationServicePromiseForDoc;
exports.instrumentationServiceForDocForTesting = instrumentationServiceForDocForTesting;
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

var _analyticsRoot = require('./analytics-root');

var _events = require('./events');

var _srcObservable = require('../../../src/observable');

var _visibilityImpl = require('./visibility-impl');

var _srcLog = require('../../../src/log');

var _srcDom = require('../../../src/dom');

var _srcFriendlyIframeEmbed = require('../../../src/friendly-iframe-embed');

var _srcService = require('../../../src/service');

var _srcTypes = require('../../../src/types');

var _srcExperiments = require('../../../src/experiments');

var _srcServices = require('../../../src/services');

var MIN_TIMER_INTERVAL_SECONDS_ = 0.5;
var DEFAULT_MAX_TIMER_LENGTH_SECONDS_ = 7200;
var SCROLL_PRECISION_PERCENT = 5;
var VAR_H_SCROLL_BOUNDARY = 'horizontalScrollBoundary';
var VAR_V_SCROLL_BOUNDARY = 'verticalScrollBoundary';
var VARIABLE_DATA_ATTRIBUTE_KEY = /^vars(.+)/;
var PROP = '__AMP_AN_ROOT';

/**
 * Events that can result in analytics data to be sent.
 * @const
 * @enum {string}
 */
var AnalyticsEventType = {
  VISIBLE: 'visible',
  CLICK: 'click',
  TIMER: 'timer',
  SCROLL: 'scroll',
  HIDDEN: 'hidden'
};

exports.AnalyticsEventType = AnalyticsEventType;
var ALLOWED_FOR_ALL = ['ampdoc', 'embed'];

/**
 * Events that can result in analytics data to be sent.
 * @const {!Object<string, {
 *     name: string,
 *     allowedFor: !Array<string>,
 *     klass: function(new:./events.EventTracker)
 *   }>}
 */
var EVENT_TRACKERS = {
  'click': {
    name: 'click',
    allowedFor: ALLOWED_FOR_ALL,
    klass: _events.ClickEventTracker
  },
  'custom': {
    name: 'custom',
    allowedFor: ALLOWED_FOR_ALL,
    klass: _events.CustomEventTracker
  },
  'render-start': {
    name: 'render-start',
    allowedFor: ALLOWED_FOR_ALL,
    klass: _events.SignalTracker
  },
  'ini-load': {
    name: 'ini-load',
    allowedFor: ALLOWED_FOR_ALL,
    klass: _events.IniLoadTracker
  },
  'visible-v3': {
    name: 'visible-v3',
    allowedFor: ALLOWED_FOR_ALL,
    klass: _events.VisibilityTracker
  },
  'hidden-v3': {
    name: 'visible-v3', // Reuse tracker with visibility
    allowedFor: ALLOWED_FOR_ALL,
    klass: _events.VisibilityTracker
  }
};

/** @const {string} */
var TAG = 'Analytics.Instrumentation';

/**
 * Events that can result in analytics data to be sent.
 * @const {Array<AnalyticsEventType>}
 */
var ALLOWED_IN_EMBED = [AnalyticsEventType.VISIBLE, AnalyticsEventType.CLICK, AnalyticsEventType.TIMER, AnalyticsEventType.HIDDEN];

/**
 * @implements {../../../src/service.Disposable}
 * @private
 * @visibleForTesting
 */

var InstrumentationService = (function () {
  /**
   * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
   */

  function InstrumentationService(ampdoc) {
    babelHelpers.classCallCheck(this, InstrumentationService);

    /** @const */
    this.ampdoc = ampdoc;

    /** @const */
    this.ampdocRoot_ = new _analyticsRoot.AmpdocAnalyticsRoot(this.ampdoc);

    /** @const @private {!./visibility-impl.Visibility} */
    this.visibility_ = new _visibilityImpl.Visibility(this.ampdoc);

    /** @const {!../../../src/service/timer-impl.Timer} */
    this.timer_ = _srcServices.timerFor(this.ampdoc.win);

    /** @private @const {!../../../src/service/viewer-impl.Viewer} */
    this.viewer_ = _srcServices.viewerForDoc(this.ampdoc);

    /** @const {!../../../src/service/viewport-impl.Viewport} */
    this.viewport_ = _srcServices.viewportForDoc(this.ampdoc);

    /** @private {boolean} */
    this.scrollHandlerRegistered_ = false;

    /** @private {!Observable<
        !../../../src/service/viewport-impl.ViewportChangedEventDef>} */
    this.scrollObservable_ = new _srcObservable.Observable();
  }

  /**
   * Represents the group of analytics triggers for a single config. All triggers
   * are declared and released at the same time.
   *
   * @implements {../../../src/service.Disposable}
   */

  /** @override */

  InstrumentationService.prototype.dispose = function dispose() {
    this.ampdocRoot_.dispose();
  };

  /**
   * @param {!Node} context
   * @return {!./analytics-root.AnalyticsRoot}
   */

  InstrumentationService.prototype.getAnalyticsRoot = function getAnalyticsRoot(context) {
    return this.findRoot_(context);
  };

  /**
   * @param {!Element} analyticsElement
   * @return {!AnalyticsGroup}
   */

  InstrumentationService.prototype.createAnalyticsGroup = function createAnalyticsGroup(analyticsElement) {
    var root = this.findRoot_(analyticsElement);
    return new AnalyticsGroup(root, analyticsElement, this);
  };

  /**
   * Triggers the analytics event with the specified type.
   *
   * @param {!Element} target
   * @param {string} eventType
   * @param {!Object<string, string>=} opt_vars A map of vars and their values.
   */

  InstrumentationService.prototype.triggerEventForTarget = function triggerEventForTarget(target, eventType, opt_vars) {
    // TODO(dvoytenko): rename to `triggerEvent`.
    var event = new _events.AnalyticsEvent(target, eventType, opt_vars);
    var root = this.findRoot_(target);
    var tracker = /** @type {!CustomEventTracker} */root.getTracker('custom', _events.CustomEventTracker);
    tracker.trigger(event);
  };

  /**
   * @param {!Node} context
   * @return {!./analytics-root.AnalyticsRoot}
   */

  InstrumentationService.prototype.findRoot_ = function findRoot_(context) {
    var _this = this;

    // FIE
    var frame = _srcService.getParentWindowFrameElement(context, this.ampdoc.win);
    if (frame) {
      var embed = _srcFriendlyIframeEmbed.getFriendlyIframeEmbedOptional(frame);
      if (embed) {
        var _ret = (function () {
          var embedNotNull = embed;
          return {
            v: _this.getOrCreateRoot_(embed, function () {
              return new _analyticsRoot.EmbedAnalyticsRoot(_this.ampdoc, embedNotNull, _this.ampdocRoot_);
            })
          };
        })();

        if (typeof _ret === 'object') return _ret.v;
      }
    }

    // Ampdoc root
    return this.ampdocRoot_;
  };

  /**
   * @param {!Object} holder
   * @param {function():!./analytics-root.AnalyticsRoot} factory
   * @return {!./analytics-root.AnalyticsRoot}
   */

  InstrumentationService.prototype.getOrCreateRoot_ = function getOrCreateRoot_(holder, factory) {
    var root = /** @type {?./analytics-root.AnalyticsRoot} */holder[PROP];
    if (!root) {
      root = factory();
      holder[PROP] = root;
    }
    return root;
  };

  /**
   * @param {!JsonObject} config Configuration for instrumentation.
   * @param {function(!AnalyticsEvent)} listener The callback to call when the event
   *  occurs.
   * @param {!Element} analyticsElement The element associated with the
   *  config.
   * @private
   */

  InstrumentationService.prototype.addListenerDepr_ = function addListenerDepr_(config, listener, analyticsElement) {
    var eventType = config['on'];
    if (!this.isTriggerAllowed_(eventType, analyticsElement)) {
      _srcLog.user().error(TAG, 'Trigger type "' + eventType + '" is not ' + 'allowed in the embed.');
      return;
    }
    if (eventType === AnalyticsEventType.VISIBLE) {
      this.createVisibilityListener_(listener, config, AnalyticsEventType.VISIBLE, analyticsElement);
    } else if (eventType === AnalyticsEventType.SCROLL) {
      if (!config['scrollSpec']) {
        _srcLog.user().error(TAG, 'Missing scrollSpec on scroll trigger.');
        return;
      }
      this.registerScrollTrigger_(config['scrollSpec'], listener);

      // Trigger an event to fire events that might have already happened.
      var size = this.viewport_.getSize();
      this.onScroll_({
        top: this.viewport_.getScrollTop(),
        left: this.viewport_.getScrollLeft(),
        width: size.width,
        height: size.height,
        relayoutAll: false,
        velocity: 0 });
    } else // Hack for typing.
      if (eventType === AnalyticsEventType.TIMER) {
        if (this.isTimerSpecValid_(config['timerSpec'])) {
          this.createTimerListener_(listener, config['timerSpec']);
        }
      } else if (eventType === AnalyticsEventType.HIDDEN) {
        this.createVisibilityListener_(listener, config, AnalyticsEventType.HIDDEN, analyticsElement);
      }
  };

  /**
   * @param {string} type
   * @param {!Object<string, string>=} opt_vars
   * @return {!AnalyticsEvent}
   * @private
   */

  InstrumentationService.prototype.createEventDepr_ = function createEventDepr_(type, opt_vars) {
    // TODO(dvoytenko): Remove when Tracker migration is complete.
    return new _events.AnalyticsEvent(this.ampdocRoot_.getRootElement(), type, opt_vars);
  };

  /**
   * Creates listeners for visibility conditions or calls the callback if all
   * the conditions are met.
   * @param {function(!AnalyticsEvent)} callback The callback to call when the
   *   event occurs.
   * @param {!JsonObject} config Configuration for instrumentation.
   * @param {AnalyticsEventType} eventType Event type for which the callback is triggered.
   * @param {!Element} analyticsElement The element assoicated with the
   *   config.
   * @private
   */

  InstrumentationService.prototype.createVisibilityListener_ = function createVisibilityListener_(callback, config, eventType, analyticsElement) {
    var _this2 = this;

    _srcLog.dev().assert(eventType == AnalyticsEventType.VISIBLE || eventType == AnalyticsEventType.HIDDEN, 'createVisibilityListener should be called with visible or hidden ' + 'eventType');
    var shouldBeVisible = eventType == AnalyticsEventType.VISIBLE;
    /** @const {!JsonObject} */
    var spec = config['visibilitySpec'];
    if (spec) {
      if (!_visibilityImpl.isVisibilitySpecValid(config)) {
        return;
      }

      this.visibility_.listenOnce(spec, function (vars) {
        var el = _visibilityImpl.getElement(_this2.ampdoc, spec['selector'], analyticsElement, spec['selectionMethod']);
        if (el) {
          var attr = _srcDom.getDataParamsFromAttributes(el, undefined, VARIABLE_DATA_ATTRIBUTE_KEY);
          for (var key in attr) {
            vars[key] = attr[key];
          }
        }
        callback(_this2.createEventDepr_(eventType, vars));
      }, shouldBeVisible, analyticsElement);
    } else {
      if (this.viewer_.isVisible() == shouldBeVisible) {
        callback(this.createEventDepr_(eventType));
        config['called'] = true;
      } else {
        this.viewer_.onVisibilityChanged(function () {
          if (!config['called'] && _this2.viewer_.isVisible() == shouldBeVisible) {
            callback(_this2.createEventDepr_(eventType));
            config['called'] = true;
          }
        });
      }
    }
  };

  /**
   * @param {!../../../src/service/viewport-impl.ViewportChangedEventDef} e
   * @private
   */

  InstrumentationService.prototype.onScroll_ = function onScroll_(e) {
    this.scrollObservable_.fire(e);
  };

  /**
   * Register for a listener to be called when the boundaries specified in
   * config are reached.
   * @param {!JsonObject} config the config that specifies the boundaries.
   * @param {function(!AnalyticsEvent)} listener
   * @private
   */

  InstrumentationService.prototype.registerScrollTrigger_ = function registerScrollTrigger_(config, listener) {
    var _this3 = this;

    if (!Array.isArray(config['verticalBoundaries']) && !Array.isArray(config['horizontalBoundaries'])) {
      _srcLog.user().error(TAG, 'Boundaries are required for the scroll ' + 'trigger to work.');
      return;
    }

    // Ensure that the scroll events are being listened to.
    if (!this.scrollHandlerRegistered_) {
      this.scrollHandlerRegistered_ = true;
      this.viewport_.onChanged(this.onScroll_.bind(this));
    }

    /**
     * @param {!Object<number, boolean>} bounds.
     * @param {number} scrollPos Number representing the current scroll
     * @param {string} varName variable name to assign to the bound that
     * triggers the event
     * position.
     */
    var triggerScrollEvents = function (bounds, scrollPos, varName) {
      if (!scrollPos) {
        return;
      }
      // Goes through each of the boundaries and fires an event if it has not
      // been fired so far and it should be.
      for (var b in bounds) {
        if (!bounds.hasOwnProperty(b) || b > scrollPos || bounds[b]) {
          continue;
        }
        bounds[b] = true;
        var vars = Object.create(null);
        vars[varName] = b;
        listener(_this3.createEventDepr_(AnalyticsEventType.SCROLL, vars));
      }
    };

    var boundsV = this.normalizeBoundaries_(config['verticalBoundaries']);
    var boundsH = this.normalizeBoundaries_(config['horizontalBoundaries']);
    this.scrollObservable_.add(function (e) {
      // Calculates percentage scrolled by adding screen height/width to
      // top/left and dividing by the total scroll height/width.
      triggerScrollEvents(boundsV, (e.top + e.height) * 100 / _this3.viewport_.getScrollHeight(), VAR_V_SCROLL_BOUNDARY);
      triggerScrollEvents(boundsH, (e.left + e.width) * 100 / _this3.viewport_.getScrollWidth(), VAR_H_SCROLL_BOUNDARY);
    });
  };

  /**
   * Rounds the boundaries for scroll trigger to nearest
   * SCROLL_PRECISION_PERCENT and returns an object with normalized boundaries
   * as keys and false as values.
   *
   * @param {!Array<number>} bounds array of bounds.
   * @return {!Object<number,boolean>} Object with normalized bounds as keys
   * and false as value.
   * @private
   */

  InstrumentationService.prototype.normalizeBoundaries_ = function normalizeBoundaries_(bounds) {
    var result = {};
    if (!bounds || !Array.isArray(bounds)) {
      return result;
    }

    for (var b = 0; b < bounds.length; b++) {
      var bound = bounds[b];
      if (typeof bound !== 'number' || !isFinite(bound)) {
        _srcLog.user().error(TAG, 'Scroll trigger boundaries must be finite.');
        return result;
      }

      bound = Math.min(Math.round(bound / SCROLL_PRECISION_PERCENT) * SCROLL_PRECISION_PERCENT, 100);
      result[bound] = false;
    }
    return result;
  };

  /**
   * @param {JsonObject} timerSpec
   * @private
   */

  InstrumentationService.prototype.isTimerSpecValid_ = function isTimerSpecValid_(timerSpec) {
    if (!timerSpec || typeof timerSpec != 'object') {
      _srcLog.user().error(TAG, 'Bad timer specification');
      return false;
    } else if (!('interval' in timerSpec)) {
      _srcLog.user().error(TAG, 'Timer interval specification required');
      return false;
    } else if (typeof timerSpec['interval'] !== 'number' || timerSpec['interval'] < MIN_TIMER_INTERVAL_SECONDS_) {
      _srcLog.user().error(TAG, 'Bad timer interval specification');
      return false;
    } else if ('maxTimerLength' in timerSpec && (typeof timerSpec['maxTimerLength'] !== 'number' || timerSpec['maxTimerLength'] <= 0)) {
      _srcLog.user().error(TAG, 'Bad maxTimerLength specification');
      return false;
    } else {
      return true;
    }
  };

  /**
   * @param {!function(!AnalyticsEvent)} listener
   * @param {JsonObject} timerSpec
   * @private
   */

  InstrumentationService.prototype.createTimerListener_ = function createTimerListener_(listener, timerSpec) {
    var hasImmediate = ('immediate' in timerSpec);
    var callImmediate = hasImmediate ? Boolean(timerSpec['immediate']) : true;
    var intervalId = this.ampdoc.win.setInterval(listener.bind(null, this.createEventDepr_(AnalyticsEventType.TIMER)), timerSpec['interval'] * 1000);

    if (callImmediate) {
      listener(this.createEventDepr_(AnalyticsEventType.TIMER));
    }

    var maxTimerLength = timerSpec['maxTimerLength'] || DEFAULT_MAX_TIMER_LENGTH_SECONDS_;
    this.ampdoc.win.setTimeout(this.ampdoc.win.clearInterval.bind(this.ampdoc.win, intervalId), maxTimerLength * 1000);
  };

  /**
   * Checks to confirm that a given trigger type is allowed for the element.
   * Specifically, it confirms that if the element is in the embed, only a
   * subset of the trigger types are allowed.
   * @param  {!AnalyticsEventType} triggerType
   * @param  {!Element} element
   * @return {boolean} True if the trigger is allowed. False otherwise.
   */

  InstrumentationService.prototype.isTriggerAllowed_ = function isTriggerAllowed_(triggerType, element) {
    if (element.ownerDocument.defaultView != this.ampdoc.win) {
      return ALLOWED_IN_EMBED.includes(triggerType);
    }
    return true;
  };

  return InstrumentationService;
})();

exports.InstrumentationService = InstrumentationService;

var AnalyticsGroup = (function () {
  /**
   * @param {!./analytics-root.AnalyticsRoot} root
   * @param {!Element} analyticsElement
   * @param {!InstrumentationService} service
   */

  function AnalyticsGroup(root, analyticsElement, service) {
    babelHelpers.classCallCheck(this, AnalyticsGroup);

    // TODO(dvoytenko): remove `service` as soon as migration is complete.

    /** @const */
    this.root_ = root;
    /** @const */
    this.analyticsElement_ = analyticsElement;
    /** @const */
    this.service_ = service;

    /** @private @const {!Array<!UnlistenDef>} */
    this.listeners_ = [];

    // TODO(dvoytenko, #8121): Cleanup visibility-v3 experiment.
    /** @private @const {boolean} */
    this.visibilityV3_ = _srcExperiments.isExperimentOn(root.ampdoc.win, 'visibility-v3');
  }

  /**
   * It's important to resolve instrumentation asynchronously in elements that depends on
   * it in multi-doc scope. Otherwise an element life-cycle could resolve way before we
   * have the service available.
   *
   * @param {!Node|!../../../src/service/ampdoc-impl.AmpDoc} nodeOrDoc
   * @return {!Promise<InstrumentationService>}
   */

  /** @override */

  AnalyticsGroup.prototype.dispose = function dispose() {
    this.listeners_.forEach(function (listener) {
      listener();
    });
  };

  /**
   * Adds a trigger with the specified config and listener. The config must
   * contain `on` property specifying the type of the event.
   *
   * Triggers registered on a group are automatically released when the
   * group is disposed.
   *
   * @param {!JsonObject} config
   * @param {function(!AnalyticsEvent)} handler
   */

  AnalyticsGroup.prototype.addTrigger = function addTrigger(config, handler) {
    var eventType = _srcLog.dev().assertString(config['on']);
    // TODO(dvoytenko, #8121): Cleanup visibility-v3 experiment.
    if ((eventType == 'visible' || eventType == 'hidden') && this.visibilityV3_) {
      eventType += '-v3';
    }
    var trackerProfile = EVENT_TRACKERS[eventType];
    if (!trackerProfile && !_srcTypes.isEnumValue(AnalyticsEventType, eventType)) {
      trackerProfile = EVENT_TRACKERS['custom'];
    }
    if (trackerProfile) {
      _srcLog.user().assert(trackerProfile.allowedFor.indexOf(this.root_.getType()) != -1, 'Trigger type "%s" is not allowed in the %s', eventType, this.root_.getType());
      var tracker = this.root_.getTracker(trackerProfile.name, trackerProfile.klass);
      var unlisten = tracker.add(this.analyticsElement_, eventType, config, handler);
      this.listeners_.push(unlisten);
    } else {
      // TODO(dvoytenko): remove this use and `addListenerDepr_` once all
      // triggers have been migrated..
      this.service_.addListenerDepr_(config, handler, this.analyticsElement_);
    }
  };

  return AnalyticsGroup;
})();

exports.AnalyticsGroup = AnalyticsGroup;

function instrumentationServicePromiseForDoc(nodeOrDoc) {
  return (/** @type {!Promise<InstrumentationService>} */_srcService.getServicePromiseForDoc(nodeOrDoc, 'amp-analytics-instrumentation')
  );
}

/*
 * @param {!Node|!../../../src/service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!InstrumentationService}
 */

function instrumentationServiceForDocForTesting(nodeOrDoc) {
  _srcService.registerServiceBuilderForDoc(nodeOrDoc, 'amp-analytics-instrumentation', InstrumentationService);
  return _srcService.getServiceForDoc(nodeOrDoc, 'amp-analytics-instrumentation');
}

},{"../../../src/dom":22,"../../../src/experiments":26,"../../../src/friendly-iframe-embed":27,"../../../src/log":33,"../../../src/observable":36,"../../../src/service":44,"../../../src/services":45,"../../../src/types":48,"./analytics-root":3,"./events":5,"./visibility-impl":11}],7:[function(require,module,exports){
exports.__esModule = true;
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
 * Used for inserted scoped analytics element.
 * @const {!Object<string, boolean>}
 */
var SANDBOX_AVAILABLE_VARS = {
  'RANDOM': true,
  'CANONICAL_URL': true,
  'CANONICAL_HOST': true,
  'CANONICAL_HOSTNAME': true,
  'CANONICAL_PATH': true,
  'AMPDOC_URL': true,
  'AMPDOC_HOST': true,
  'AMPDOC_HOSTNAME': true,
  'SOURCE_URL': true,
  'SOURCE_HOST': true,
  'SOURCE_HOSTNAME': true,
  'SOURCE_PATH': true,
  'TIMESTAMP': true,
  'TIMEZONE': true,
  'VIEWPORT_HEIGHT': true,
  'VIEWPORT_WIDTH': true,
  'SCREEN_WIDTH': true,
  'SCREEN_HEIGHT': true,
  'AVAILABLE_SCREEN_HEIGHT': true,
  'AVAILABLE_SCREEN_WIDTH': true,
  'SCREEN_COLOR_DEPTH': true,
  'DOCUMENT_CHARSET': true,
  'BROWSER_LANGUAGE': true,
  'AMP_VERSION': true,
  'BACKGROUND_STATE': true
};
exports.SANDBOX_AVAILABLE_VARS = SANDBOX_AVAILABLE_VARS;

},{}],8:[function(require,module,exports){
exports.__esModule = true;
exports.sendRequest = sendRequest;
exports.sendRequestUsingIframe = sendRequestUsingIframe;
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

var _srcUrl = require('../../../src/url');

var _srcLog = require('../../../src/log');

var _srcEventHelper = require('../../../src/event-helper');

var _srcServices = require('../../../src/services');

var _srcDom = require('../../../src/dom');

var _srcStyle = require('../../../src/style');

/** @const {string} */
var TAG_ = 'amp-analytics.Transport';

/**
 * @param {!Window} win
 * @param {string} request
 * @param {!Object<string, string>} transportOptions
 */

function sendRequest(win, request, transportOptions) {
  _srcUrl.assertHttpsUrl(request, 'amp-analytics request');
  _srcUrl.checkCorsUrl(request);
  if (transportOptions['beacon'] && Transport.sendRequestUsingBeacon(win, request)) {
    return;
  }
  if (transportOptions['xhrpost'] && Transport.sendRequestUsingXhr(win, request)) {
    return;
  }
  if (transportOptions['image']) {
    Transport.sendRequestUsingImage(win, request);
    return;
  }
  _srcLog.user().warn(TAG_, 'Failed to send request', request, transportOptions);
}

/**
 * @visibleForTesting
 */

var Transport = (function () {
  function Transport() {
    babelHelpers.classCallCheck(this, Transport);
  }

  /**
   * Sends a ping request using an iframe, that is removed 5 seconds after
   * it is loaded.
   * This is not available as a standard transport, but rather used for
   * specific, whitelisted requests.
   * @param {!Window} win
   * @param {string} request The request URL.
   */

  /**
   * @param {!Window} unusedWin
   * @param {string} request
   */

  Transport.sendRequestUsingImage = function sendRequestUsingImage(unusedWin, request) {
    var image = new Image();
    image.src = request;
    image.width = 1;
    image.height = 1;
    _srcEventHelper.loadPromise(image).then(function () {
      _srcLog.dev().fine(TAG_, 'Sent image request', request);
    })['catch'](function () {
      _srcLog.user().warn(TAG_, 'Response unparseable or failed to send image ' + 'request', request);
    });
  };

  /**
   * @param {!Window} win
   * @param {string} request
   * @return {boolean} True if this browser supports navigator.sendBeacon.
   */

  Transport.sendRequestUsingBeacon = function sendRequestUsingBeacon(win, request) {
    if (!win.navigator.sendBeacon) {
      return false;
    }
    var result = win.navigator.sendBeacon(request, '');
    if (result) {
      _srcLog.dev().fine(TAG_, 'Sent beacon request', request);
    }
    return result;
  };

  /**
   * @param {!Window} win
   * @param {string} request
   * @return {boolean} True if this browser supports cross-domain XHR.
   */

  Transport.sendRequestUsingXhr = function sendRequestUsingXhr(win, request) {
    if (!win.XMLHttpRequest) {
      return false;
    }
    /** @const {XMLHttpRequest} */
    var xhr = new win.XMLHttpRequest();
    if (!('withCredentials' in xhr)) {
      return false; // Looks like XHR level 1 - CORS is not supported.
    }
    xhr.open('POST', request, true);
    xhr.withCredentials = true;

    // Prevent pre-flight HEAD request.
    xhr.setRequestHeader('Content-Type', 'text/plain');

    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        _srcLog.dev().fine(TAG_, 'Sent XHR request', request);
      }
    };

    xhr.send('');
    return true;
  };

  return Transport;
})();

exports.Transport = Transport;

function sendRequestUsingIframe(win, request) {
  _srcUrl.assertHttpsUrl(request, 'amp-analytics request');
  /** @const {!Element} */
  var iframe = win.document.createElement('iframe');
  _srcStyle.setStyle(iframe, 'display', 'none');
  iframe.onload = iframe.onerror = function () {
    _srcServices.timerFor(win).delay(function () {
      _srcDom.removeElement(iframe);
    }, 5000);
  };
  _srcLog.user().assert(_srcUrl.parseUrl(request).origin != _srcUrl.parseUrl(win.location.href).origin, 'Origin of iframe request must not be equal to the doc' + 'ument origin. See https://github.com/ampproject/' + 'amphtml/blob/master/spec/amp-iframe-origin-policy.md for details.');
  iframe.setAttribute('amp-analytics', '');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  iframe.src = request;
  win.document.body.appendChild(iframe);
  return iframe;
}

},{"../../../src/dom":22,"../../../src/event-helper":25,"../../../src/log":33,"../../../src/services":45,"../../../src/style":47,"../../../src/url":50}],9:[function(require,module,exports){
exports.__esModule = true;
exports.installVariableService = installVariableService;
exports.variableServiceFor = variableServiceFor;
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

var _srcExperiments = require('../../../src/experiments');

var _srcCrypto = require('../../../src/crypto');

var _srcLog = require('../../../src/log');

var _srcService = require('../../../src/service');

var _srcTypes = require('../../../src/types');

var _srcUtilsObject = require('../../../src/utils/object');

/** @const {string} */
var TAG = 'Analytics.Variables';

/** @const {RegExp} */
var VARIABLE_ARGS_REGEXP = /^(?:([^\s]*)(\([^)]*\))|[^]+)$/;

/** @typedef {{name: string, argList: string}} */
var FunctionNameArgsDef = undefined;

/**
 * @struct
 * @const
 */

var Filter =
/**
 * @param {function(...?):(string|!Promise<string>)} filter
 * @param {boolean=} opt_allowNull
 */
function Filter(filter, opt_allowNull) {
  babelHelpers.classCallCheck(this, Filter);

  /** @type {!function(...?):(string|!Promise<string>)} */
  this.filter = filter;

  /** @type{boolean} */
  this.allowNull = !!opt_allowNull;
}

/**
 * The structure that contains all details needed to expand a template
 * @struct
 * @const
 * @package For type.
 */
;

var ExpansionOptions =
/**
 * @param {!Object<string, *>} vars
 * @param {number=} opt_iterations
 * @param {boolean=} opt_noEncode
 */
function ExpansionOptions(vars, opt_iterations, opt_noEncode) {
  babelHelpers.classCallCheck(this, ExpansionOptions);

  /** @const {!Object<string, string|Array<string>>} */
  this.vars = vars;
  /** @const {number} */
  this.iterations = opt_iterations === undefined ? 2 : opt_iterations;
  /** @const {boolean} */
  this.noEncode = !!opt_noEncode;
}

/**
 * @param {string} str
 * @param {string} s
 * @param {string=} opt_l
 * @return {string}
 */
;

exports.ExpansionOptions = ExpansionOptions;
function substrFilter(str, s, opt_l) {
  var start = Number(s);
  var length = str.length;
  _srcLog.user().assert(_srcTypes.isFiniteNumber(start), 'Start index ' + start + 'in substr filter should be a number');
  if (opt_l) {
    length = Number(opt_l);
    _srcLog.user().assert(_srcTypes.isFiniteNumber(length), 'Length ' + length + ' in substr filter should be a number');
  }

  return str.substr(start, length);
}

/**
 * @param {string} value
 * @param {string} defaultValue
 * @return {string}
 */
function defaultFilter(value, defaultValue) {
  return value || _srcLog.user().assertString(defaultValue);
}

/**
 * Provides support for processing of advanced variable syntax like nested
 * expansions filters etc.
 */

var VariableService = (function () {
  /**
   * @param {!Window} window
   */

  function VariableService(window) {
    babelHelpers.classCallCheck(this, VariableService);

    /** @private {!Window} */
    this.win_ = window;

    /** @private {!Object<string, !Filter>} */
    this.filters_ = _srcUtilsObject.map();

    this.register_('default', new Filter(defaultFilter, /* allowNulls */true));
    this.register_('substr', new Filter(substrFilter));
    this.register_('trim', new Filter(function (value) {
      return value.trim();
    }));
    this.register_('json', new Filter(function (value) {
      return JSON.stringify(value);
    }));
    this.register_('toLowerCase', new Filter(function (value) {
      return value.toLowerCase();
    }));
    this.register_('toUpperCase', new Filter(function (value) {
      return value.toUpperCase();
    }));
    this.register_('not', new Filter(function (value) {
      return String(!value);
    }));
    this.register_('base64', new Filter(function (value) {
      return btoa(value);
    }));
    this.register_('hash', new Filter(this.hashFilter_.bind(this)));
    this.register_('if', new Filter(function (value, thenValue, elseValue) {
      return value ? thenValue : elseValue;
    }, true));
  }

  /**
   * @param {!Window} win
   */

  /**
   * @param {string} name
   * @param {!Filter} filter
   */

  VariableService.prototype.register_ = function register_(name, filter) {
    _srcLog.dev().assert(!this.filters_[name], 'Filter "' + name + '" already registered.');
    this.filters_[name] = filter;
  };

  /**
   * @param {string} filterStr
   * @return {?{filter: !Filter, args: !Array<string>}}
   */

  VariableService.prototype.parseFilter_ = function parseFilter_(filterStr) {
    if (!filterStr) {
      return null;
    }

    // The parsing for filters breaks when `:` is used as something other than
    // the argument separator. A full-fledged parser would be needed to fix
    // this.
    var tokens = filterStr.split(':');
    var fnName = tokens.shift();
    _srcLog.user().assert(fnName, 'Filter ' + name + ' is invalid.');
    var filter = _srcLog.user().assert(this.filters_[fnName], 'Unknown filter: ' + fnName);
    return { filter: filter, args: tokens };
  };

  /**
   * @param {string} value
   * @param {Array<string>} filters
   * @return {Promise<string>}
   */

  VariableService.prototype.applyFilters_ = function applyFilters_(value, filters) {
    var _this = this;

    if (!this.isFilterExperimentOn_()) {
      return Promise.resolve(value);
    }

    var result = Promise.resolve(value);

    var _loop = function (i) {
      var _parseFilter_ = _this.parseFilter_(filters[i].trim());

      var filter = _parseFilter_.filter;
      var args = _parseFilter_.args;

      if (filter) {
        result = result.then(function (value) {
          if (value != null || filter.allowNull) {
            args.unshift(value);
            return filter.filter.apply(null, args);
          }
          return null;
        });
      }
    };

    for (var i = 0; i < filters.length; i++) {
      _loop(i);
    }
    return result;
  };

  /**
   * @param {string} template The template to expand
   * @param {!ExpansionOptions} options configuration to use for expansion
   * @return {!Promise<!string>} The expanded string
   */

  VariableService.prototype.expandTemplate = function expandTemplate(template, options) {
    var _this2 = this;

    if (options.iterations < 0) {
      _srcLog.user().error(TAG, 'Maximum depth reached while expanding variables. ' + 'Please ensure that the variables are not recursive.');
      return Promise.resolve(template);
    }

    var replacementPromises = [];
    var replacement = template.replace(/\${([^}]*)}/g, function (match, key) {

      // Note: The parsing for variables breaks when `|` is used as
      // something other than the filter separator. A full-fledged parser would
      // be needed to fix this.
      var tokens = key.split('|');
      var initialValue = tokens.shift().trim();
      if (!initialValue) {
        return Promise.resolve('');
      }

      var _getNameArgs_ = _this2.getNameArgs_(initialValue);

      var name = _getNameArgs_.name;
      var argList = _getNameArgs_.argList;

      var raw = options.vars[name] != null ? options.vars[name] : '';

      var p = undefined;
      if (typeof raw == 'string') {
        // Expand string values further.
        p = _this2.expandTemplate(raw, new ExpansionOptions(options.vars, options.iterations - 1, options.noEncode));
      } else {
        // Values can also be arrays and objects. Don't expand them.
        p = Promise.resolve(raw);
      }

      p = p.then(function (expandedValue) {
        return(
          // First apply filters
          _this2.applyFilters_(expandedValue, tokens)
        );
      }).then(function (finalRawValue) {
        // Then encode the value
        var val = options.noEncode ? finalRawValue : _this2.encodeVars(finalRawValue, name);
        return val ? val + argList : val;
      }).then(function (encodedValue) {
        // Replace it in the string
        replacement = replacement.replace(match, encodedValue);
      });

      // Queue current replacement promise after the last replacement.
      replacementPromises.push(p);

      // Since the replacement will happen later, return the original template.
      return match;
    });

    // Once all the promises are complete, return the expanded value.
    return Promise.all(replacementPromises).then(function () {
      return replacement;
    });
  };

  /**
   * Returns an array containing two values: name and args parsed from the key.
   *
   * @param {string} key The key to be parsed.
   * @return {!FunctionNameArgsDef}
   * @private
   */

  VariableService.prototype.getNameArgs_ = function getNameArgs_(key) {
    if (!key) {
      return { name: '', argList: '' };
    }
    var match = key.match(VARIABLE_ARGS_REGEXP);
    _srcLog.user().assert(match, 'Variable with invalid format found: ' + key);
    return { name: match[1] || match[0], argList: match[2] || '' };
  };

  /**
   * @param {string|!Array<string>} raw The values to URI encode.
   * @param {string} unusedName Name of the variable.
   * @return {string} The encoded value.
   */

  VariableService.prototype.encodeVars = function encodeVars(raw, unusedName) {
    if (raw == null) {
      return '';
    }

    if (_srcTypes.isArray(raw)) {
      return raw.map(encodeURIComponent).join(',');
    }
    // Separate out names and arguments from the value and encode the value.

    var _getNameArgs_2 = this.getNameArgs_(String(raw));

    var name = _getNameArgs_2.name;
    var argList = _getNameArgs_2.argList;

    return encodeURIComponent(name) + argList;
  };

  /**
   * @param {string} value
   * @return {!Promise<string>}
   */

  VariableService.prototype.hashFilter_ = function hashFilter_(value) {
    return _srcCrypto.cryptoFor(this.win_).sha384Base64(value);
  };

  VariableService.prototype.isFilterExperimentOn_ = function isFilterExperimentOn_() {
    return _srcExperiments.isExperimentOn(this.win_, 'variable-filters');
  };

  return VariableService;
})();

exports.VariableService = VariableService;

function installVariableService(win) {
  _srcService.registerServiceBuilder(win, 'amp-analytics-variables', VariableService);
}

/**
 * @param {!Window} win
 * @return {!VariableService}
 */

function variableServiceFor(win) {
  return _srcService.getService(win, 'amp-analytics-variables');
}

},{"../../../src/crypto":20,"../../../src/experiments":26,"../../../src/log":33,"../../../src/service":44,"../../../src/types":48,"../../../src/utils/object":53}],10:[function(require,module,exports){
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
 * @const {!JsonObject}
 */
var ANALYTICS_CONFIG = /** @type {!JsonObject} */{

  // Default parent configuration applied to all amp-analytics tags.
  'default': {
    'transport': { 'beacon': true, 'xhrpost': true, 'image': true },
    'vars': {
      'accessReaderId': 'ACCESS_READER_ID',
      'adNavTiming': 'AD_NAV_TIMING', // only available in A4A embeds
      'adNavType': 'AD_NAV_TYPE', // only available in A4A embeds
      'adRedirectCount': 'AD_NAV_REDIRECT_COUNT', // only available in A4A
      'ampdocHost': 'AMPDOC_HOST',
      'ampdocHostname': 'AMPDOC_HOSTNAME',
      'ampdocUrl': 'AMPDOC_URL',
      'ampVersion': 'AMP_VERSION',
      'authdata': 'AUTHDATA',
      'availableScreenHeight': 'AVAILABLE_SCREEN_HEIGHT',
      'availableScreenWidth': 'AVAILABLE_SCREEN_WIDTH',
      'backgroundState': 'BACKGROUND_STATE',
      'browserLanguage': 'BROWSER_LANGUAGE',
      'canonicalHost': 'CANONICAL_HOST',
      'canonicalHostname': 'CANONICAL_HOSTNAME',
      'canonicalPath': 'CANONICAL_PATH',
      'canonicalUrl': 'CANONICAL_URL',
      'clientId': 'CLIENT_ID',
      'contentLoadTime': 'CONTENT_LOAD_TIME',
      'counter': 'COUNTER',
      'documentCharset': 'DOCUMENT_CHARSET',
      'documentReferrer': 'DOCUMENT_REFERRER',
      'domainLookupTime': 'DOMAIN_LOOKUP_TIME',
      'domInteractiveTime': 'DOM_INTERACTIVE_TIME',
      'navRedirectCount': 'NAV_REDIRECT_COUNT',
      'navTiming': 'NAV_TIMING',
      'navType': 'NAV_TYPE',
      'pageDownloadTime': 'PAGE_DOWNLOAD_TIME',
      'pageLoadTime': 'PAGE_LOAD_TIME',
      'pageViewId': 'PAGE_VIEW_ID',
      'queryParam': 'QUERY_PARAM',
      'random': 'RANDOM',
      'redirectTime': 'REDIRECT_TIME',
      'screenColorDepth': 'SCREEN_COLOR_DEPTH',
      'screenHeight': 'SCREEN_HEIGHT',
      'screenWidth': 'SCREEN_WIDTH',
      'scrollHeight': 'SCROLL_HEIGHT',
      'scrollLeft': 'SCROLL_LEFT',
      'scrollTop': 'SCROLL_TOP',
      'scrollWidth': 'SCROLL_WIDTH',
      'serverResponseTime': 'SERVER_RESPONSE_TIME',
      'sourceUrl': 'SOURCE_URL',
      'sourceHost': 'SOURCE_HOST',
      'sourceHostname': 'SOURCE_HOSTNAME',
      'sourcePath': 'SOURCE_PATH',
      'tcpConnectTime': 'TCP_CONNECT_TIME',
      'timestamp': 'TIMESTAMP',
      'timezone': 'TIMEZONE',
      'title': 'TITLE',
      'totalEngagedTime': 'TOTAL_ENGAGED_TIME',
      'viewer': 'VIEWER',
      'viewportHeight': 'VIEWPORT_HEIGHT',
      'viewportWidth': 'VIEWPORT_WIDTH'
    }
  },
  'acquialift': {
    'vars': {
      'decisionApiUrl': 'us-east-1-decisionapi.lift.acquia.com',
      'accountId': 'xxxxxxxx',
      'siteId': 'xxxxxxxx'
    },
    'transport': { 'beacon': true, 'xhrpost': true, 'image': false },
    'requests': {
      'base': 'https://${decisionApiUrl}/capture?account_id=${accountId}&site_id=${siteId}',
      'basicCapture': '${base}' + '&ident=${clientId(tc_ptid)}' + '&identsrc=amp' + '&es=Amp' + '&url=${canonicalUrl}' + '&rurl=${documentReferrer}' + '&cttl=${title}',
      'pageview': '${basicCapture}' + '&en=Content View',
      'click': '${basicCapture}' + '&en=Click-Through'
    },
    'triggers': {
      'defaultPageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    }
  },

  'afsanalytics': {
    'vars': {
      'server': 'www',
      'websiteid': 'xxxxxxxx',
      'event': 'click',
      'clicklabel': 'clicked from AMP page'
    },
    'transport': { 'beacon': false, 'xhrpost': false, 'image': true },
    'requests': {
      'host': '//${server}.afsanalytics.com',
      'base': '${host}/cgi_bin/',
      'pageview': '${base}connect.cgi?usr=${websiteid}Pauto' + '&js=1' + '&amp=1' + '&title=${title}' + '&url=${canonicalUrl}' + '&refer=${documentReferrer}' + '&resolution=${screenWidth}x${screenHeight}' + '&color=${screenColorDepth}' + '&Tips=${random}',
      'click': '${base}click.cgi?usr=${websiteid}' + '&event=${event}' + '&exit=${clicklabel}'
    },
    'triggers': {
      'defaultPageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    }
  },

  'atinternet': {
    'transport': { 'beacon': false, 'xhrpost': false, 'image': true },
    'requests': {
      'base': 'https://${log}${domain}/hit.xiti?s=${site}&ts=${timestamp}&r=${screenWidth}x${screenHeight}x${screenColorDepth}&re=${availableScreenWidth}x${availableScreenHeight}',
      'suffix': '&medium=amp&${extraUrlParams}&ref=${documentReferrer}',
      'pageview': '${base}&' + 'p=${title}&' + 's2=${level2}${suffix}',
      'click': '${base}&' + 'pclick=${title}&' + 's2click=${level2}&' + 'p=${label}&' + 's2=${level2Click}&' + 'type=click&click=${type}${suffix}'
    }
  },

  'baiduanalytics': {
    'requests': {
      'host': 'https://hm.baidu.com',
      'base': '${host}/hm.gif?' + 'si=${token}&nv=0&st=4&v=pixel-1.0&rnd=${timestamp}',
      'pageview': '${base}&et=0',
      'event': '${base}&ep=${category}*${action}*' + '${label}*${value}&et=4&api=8_0'
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'burt': {
    'vars': {
      'trackingKey': 'ignore',
      'category': '',
      'subCategory': ''
    },
    'requests': {
      'host': '//${trackingKey}.c.richmetrics.com/',
      'base': '${host}imglog?' + 'e=${trackingKey}&' + 'pi=${trackingKey}' + '|${pageViewId}' + '|${canonicalPath}' + '|${clientId(burt-amp-user-id)}&' + 'ui=${clientId(burt-amp-user-id)}&' + 'v=amp&' + 'ts=${timestamp}&' + 'sn=${requestCount}&',
      'pageview': '${base}' + 'type=page&' + 'ca=${category}&' + 'sc=${subCategory}&' + 'ln=${browserLanguage}&' + 'lr=${documentReferrer}&' + 'eu=${sourceUrl}&' + 'tz=${timezone}&' + 'pd=${scrollWidth}x${scrollHeight}&' + 'sd=${screenWidth}x${screenHeight}&' + 'wd=${availableScreenWidth}x${availableScreenHeight}&' + 'ws=${scrollLeft}x${scrollTop}',
      'pageping': '${base}' + 'type=pageping'
    },
    'triggers': {
      'pageview': {
        'on': 'visible',
        'request': 'pageview'
      },
      'pageping': {
        'on': 'timer',
        'timerSpec': {
          'interval': 15,
          'maxTimerLength': 1200
        },
        'request': 'pageping'
      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'chartbeat': {
    'requests': {
      'host': 'https://ping.chartbeat.net',
      'basePrefix': '/ping?h=${domain}&' + 'p=${canonicalPath}&' + 'u=${clientId(_cb)}&' + 'd=${canonicalHost}&' + 'g=${uid}&' + 'g0=${sections}&' + 'g1=${authors}&' + 'g2=${zone}&' + 'g3=${sponsorName}&' + 'g4=${contentType}&' + 'c=120&' + 'x=${scrollTop}&' + 'y=${scrollHeight}&' + 'j=${decayTime}&' + 'R=1&' + 'W=0&' + 'I=0&' + 'E=${totalEngagedTime}&' + 'r=${documentReferrer}&' + 't=${pageViewId}${clientId(_cb)}&' + 'b=${pageLoadTime}&' + 'i=${title}&' + 'T=${timestamp}&' + 'tz=${timezone}&' + 'C=2',
      'baseSuffix': '&_',
      'interval': '${host}${basePrefix}${baseSuffix}',
      'anchorClick': '${host}${basePrefix}${baseSuffix}'
    },
    'triggers': {
      'trackInterval': {
        'on': 'timer',
        'timerSpec': {
          'interval': 15,
          'maxTimerLength': 7200
        },
        'request': 'interval',
        'vars': {
          'decayTime': 30
        }
      },
      'trackAnchorClick': {
        'on': 'click',
        'selector': 'a',
        'request': 'anchorClick',
        'vars': {
          'decayTime': 30
        }
      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'clicky': {
    'vars': {
      'site_id': ''
    },
    'requests': {
      'base': 'https://in.getclicky.com/in.php?' + 'site_id=${site_id}',
      'baseSuffix': '&mime=${contentType}&' + 'x=${random}',
      'pageview': '${base}&' + 'res=${screenWidth}x${screenHeight}&' + 'lang=${browserLanguage}&' + 'secure=1&' + 'type=pageview&' + 'href=${canonicalPath}&' + 'title=${title}' + '${baseSuffix}',
      'interval': '${base}&' + 'type=ping' + '${baseSuffix}'
    },
    'triggers': {
      'defaultPageview': {
        'on': 'visible',
        'request': 'pageview'
      },
      'interval': {
        'on': 'timer',
        'timerSpec': {
          'interval': 60,
          'maxTimerLength': 600
        },
        'request': 'interval'
      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'colanalytics': {
    'requests': {
      'host': 'https://ase.clmbtech.com',
      'base': '${host}/message',
      'pageview': '${base}?cid=${id}' + '&val_101=${id}' + '&val_101=${canonicalPath}' + '&ch=${canonicalHost}' + '&uuid=${uid}' + '&au=${authors}' + '&zo=${zone}' + '&sn=${sponsorName}' + '&ct=${contentType}' + '&st=${scrollTop}' + '&sh=${scrollHeight}' + '&dct=${decayTime}' + '&tet=${totalEngagedTime}' + '&dr=${documentReferrer}' + '&plt=${pageLoadTime}' + '&val_108=${title}' + '&val_120=3'
    },
    'triggers': {
      'defaultPageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'comscore': {
    'vars': {
      'c2': '1000001'
    },
    'requests': {
      'host': 'https://sb.scorecardresearch.com',
      'base': '${host}/b?',
      'pageview': '${base}c1=2&c2=${c2}&rn=${random}&c8=${title}' + '&c7=${canonicalUrl}&c9=${documentReferrer}&cs_c7amp=${ampdocUrl}'
    },
    'triggers': {
      'defaultPageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'cxense': {
    'requests': {
      'host': 'https://scomcluster.cxense.com',
      'base': '${host}/Repo/rep.gif',
      'pageview': '${base}?ver=1&typ=pgv&sid=${siteId}&ckp=${clientId(cX_P)}&' + 'loc=${sourceUrl}&rnd=${random}&ref=${documentReferrer}&' + 'ltm=${timestamp}&wsz=${screenWidth}x${screenHeight}&' + 'bln=${browserLanguage}&chs=${documentCharset}&' + 'col=${screenColorDepth}&tzo=${timezone}&cp_cx_channel=amp'
    },
    'triggers': {
      'defaultPageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'dynatrace': {
    'requests': {
      'endpoint': '${protocol}://${tenant}.${environment}:${port}/ampbf',
      'pageview': '${endpoint}?type=js&' + 'flavor=amp&' + 'v=1&' + 'a=1%7C1%7C_load_%7C_load_%7C-%7C${navTiming(navigationStart)}%7C' + '${navTiming(domContentLoadedEventEnd)}%7C0%2C2%7C2%7C_onload_%7C' + '_load_%7C-%7C${navTiming(domContentLoadedEventStart)}%7C' + '${navTiming(domContentLoadedEventEnd)}%7C0&' + 'fId=${pageViewId}&' + 'vID=${clientId(rxVisitor)}&' + 'referer=${sourceUrl}&' + 'title=${title}&' + 'sw=${screenWidth}&' + 'sh=${screenHeight}&' + 'w=${viewportWidth}&' + 'h=${viewportHeight}&' + 'nt=a${navType}' + 'b${navTiming(navigationStart)}' + 'c${navTiming(navigationStart,redirectStart)}' + 'd${navTiming(navigationStart,redirectEnd)}' + 'e${navTiming(navigationStart,fetchStart)}' + 'f${navTiming(navigationStart,domainLookupStart)}' + 'g${navTiming(navigationStart,domainLookupEnd)}' + 'h${navTiming(navigationStart,connectStart)}' + 'i${navTiming(navigationStart,connectEnd)}' + 'j${navTiming(navigationStart,secureConnectionStart)}' + 'k${navTiming(navigationStart,requestStart)}' + 'l${navTiming(navigationStart,responseStart)}' + 'm${navTiming(navigationStart,responseEnd)}' + 'n${navTiming(navigationStart,domLoading)}' + 'o${navTiming(navigationStart,domInteractive)}' + 'p${navTiming(navigationStart,domContentLoadedEventStart)}' + 'q${navTiming(navigationStart,domContentLoadedEventEnd)}' + 'r${navTiming(navigationStart,domComplete)}' + 's${navTiming(navigationStart,loadEventStart)}' + 't${navTiming(navigationStart,loadEventEnd)}&' + 'app=${app}&' + 'time=${timestamp}'
    },
    'triggers': {
      'trackPageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    },
    'vars': {
      'app': 'ampapp',
      'protocol': 'https',
      'tenant': '',
      'environment': 'live.dynatrace.com',
      'port': '443'
    }
  },

  'euleriananalytics': {
    'vars': {
      'analyticsHost': '',
      'documentLocation': 'SOURCE_URL'
    },
    'requests': {
      'base': 'https://${analyticsHost}',
      'basePrefix': '-/${random}?' + 'euid-amp=${clientId(etuix)}&' + 'url=${documentLocation}&',
      'pageview': '${base}/col2/${basePrefix}' + 'rf=${documentReferrer}&' + 'sd=${screenWidth}x${screenHeight}&' + 'sd=${screenColorDepth}&' + 'elg=${browserLanguage}',
      'action': '${base}/action/${basePrefix}' + 'eact=${actionCode}&' + 'actr=${actionRef}',
      'user': '${base}/uparam/${basePrefix}' + 'euk${userParamKey}=${userParamVal}'
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'facebookpixel': {
    'vars': {
      'pixelId': 'PIXEL-ID'
    },
    'requests': {
      'host': 'https://www.facebook.com',
      'base': '${host}/tr?noscript=1',
      'pageview': '${base}&ev=PageView&' + 'id=${pixelId}',
      'event': '${base}&ev=${eventName}&' + 'id=${pixelId}' + '&cd[content_name]=${content_name}',
      'eventViewContent': '${base}&ev=ViewContent&' + 'id=${pixelId}' + '&cd[value]=${value}' + '&cd[currency]=${currency}' + '&cd[content_name]=${content_name}' + '&cd[content_type]=${content_type}' + '&cd[content_ids]=${content_ids}',
      'eventSearch': '${base}&ev=Search&' + 'id=${pixelId}' + '&cd[value]=${value}' + '&cd[currency]=${currency}' + '&cd[content_category]=${content_category}' + '&cd[content_ids]=${content_ids}' + '&cd[search_string]=${search_string}',
      'eventAddToCart': '${base}&ev=AddToCart&' + 'id=${pixelId}' + '&cd[value]=${value}' + '&cd[currency]=${currency}' + '&cd[content_name]=${content_name}' + '&cd[content_type]=${content_type}' + '&cd[content_ids]=${content_ids}',
      'eventAddToWishlist': '${base}&ev=AddToWishlist&' + 'id=${pixelId}' + '&cd[value]=${value}' + '&cd[currency]=${currency}' + '&cd[content_name]=${content_name}' + '&cd[content_category]=${content_category}' + '&cd[content_ids]=${content_ids}',
      'eventInitiateCheckout': '${base}&ev=InitiateCheckout&' + 'id=${pixelId}' + '&cd[value]=${value}' + '&cd[currency]=${currency}' + '&cd[content_name]=${content_name}' + '&cd[content_category]=${content_category}' + '&cd[num_items]=${num_items}' + '&cd[content_ids]=${content_ids}',
      'eventAddPaymentInfo': '${base}&ev=AddPaymentInfo&' + 'id=${pixelId}' + '&cd[value]=${value}' + '&cd[currency]=${currency}' + '&cd[content_category]=${content_category}' + '&cd[content_ids]=${content_ids}',
      'eventPurchase': '${base}&ev=Purchase&' + 'id=${pixelId}' + '&cd[value]=${value}' + '&cd[currency]=${currency}' + '&cd[content_name]=${content_name}' + '&cd[content_type]=${content_type}' + '&cd[content_ids]=${content_ids}' + '&cd[num_items]=${num_items}',
      'eventLead': '${base}&ev=Lead&' + 'id=${pixelId}' + '&cd[value]=${value}' + '&cd[currency]=${currency}' + '&cd[content_name]=${content_name}' + '&cd[content_category]=${content_category}',
      'eventCompleteRegistration': '${base}&ev=CompleteRegistration&' + 'id=${pixelId}' + '&cd[value]=${value}' + '&cd[currency]=${currency}' + '&cd[content_name]=${content_name}' + '&cd[status]=${status}'
    },
    'triggers': {
      'trackPageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    }
  },

  'gemius': {
    'requests': {
      'base': 'https://${prefix}.hit.gemius.pl/_${timestamp}/redot.gif?l=91&id=${identifier}&screen=${screenWidth}x${screenHeight}&window=${viewportWidth}x${viewportHeight}&fr=1&href=${sourceUrl}&ref=${documentReferrer}&extra=gemamp%3D1%7Campid%3D${clientId(gemius)}%7C${extraparams}',
      'pageview': '${base}&et=view&hsrc=1',
      'event': '${base}&et=action&hsrc=3'
    },
    'triggers': {
      'defaultPageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'googleadwords': {
    'requests': {
      'conversion_prefix': 'https://www.googleadservices.com/pagead/conversion/',
      'remarketing_prefix': 'https://googleads.g.doubleclick.net/pagead/viewthroughconversion/',
      'common_params': '${googleConversionId}/?' + 'cv=amp2&' + // Increment when making changes.
      'label=${googleConversionLabel}&' + 'random=${random}&' + 'url=${sourceUrl}&' + 'ref=${documentReferrer}&' + 'fst=${pageViewId}&' + 'num=${counter(googleadwords)}&' + 'fmt=3&' + 'async=1&' + 'u_h=${screenHeight}&u_w=${screenWidth}&' + 'u_ah=${availableScreenHeight}&u_aw=${availableScreenWidth}&' + 'u_cd=${screenColorDepth}&' + 'u_tz=${timezone}&' + 'tiba=${title}&' + 'guid=ON&script=0',
      'conversion_params': 'value=${googleConversionValue}&' + 'currency_code=${googleConversionCurrency}&' + 'bg=${googleConversionColor}&' + 'hl=${googleConversionLanguage}',
      'conversion': '${conversion_prefix}${common_params}&${conversion_params}',
      'remarketing': '${remarketing_prefix}${common_params}'
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  // Important: please keep this in sync with the following config
  // 'googleanalytics-alpha'.
  'googleanalytics': {
    'vars': {
      'eventValue': '0',
      'documentLocation': 'SOURCE_URL',
      'clientId': 'CLIENT_ID(AMP_ECID_GOOGLE,,_ga)',
      'dataSource': 'AMP',
      'anonymizeIP': 'aip'
    },
    'requests': {
      'host': 'https://www.google-analytics.com',
      'basePrefix': 'v=1&' + '_v=a1&' + 'ds=${dataSource}&' + '${anonymizeIP}&' + '_s=${requestCount}&' + 'dt=${title}&' + 'sr=${screenWidth}x${screenHeight}&' + '_utmht=${timestamp}&' + 'cid=${clientId}&' + 'tid=${account}&' + 'dl=${documentLocation}&' + 'dr=${documentReferrer}&' + 'sd=${screenColorDepth}&' + 'ul=${browserLanguage}&' + 'de=${documentCharset}',
      'baseSuffix': '&a=${pageViewId}&' + 'z=${random}',
      'pageview': '${host}/r/collect?${basePrefix}&' + 't=pageview&' + 'jid=${random}&' + '_r=1' + '${baseSuffix}',
      'event': '${host}/collect?${basePrefix}&' + 't=event&' + 'jid=&' + 'ec=${eventCategory}&' + 'ea=${eventAction}&' + 'el=${eventLabel}&' + 'ev=${eventValue}' + '${baseSuffix}',
      'social': '${host}/collect?${basePrefix}&' + 't=social&' + 'jid=&' + 'sa=${socialAction}&' + 'sn=${socialNetwork}&' + 'st=${socialTarget}' + '${baseSuffix}',
      'timing': '${host}/collect?${basePrefix}&' + 't=${timingRequestType}&' + 'jid=&' + 'plt=${pageLoadTime}&' + 'dns=${domainLookupTime}&' + 'tcp=${tcpConnectTime}&' + 'rrt=${redirectTime}&' + 'srt=${serverResponseTime}&' + 'pdt=${pageDownloadTime}&' + 'clt=${contentLoadTime}&' + 'dit=${domInteractiveTime}' + '${baseSuffix}'
    },
    'triggers': {
      'performanceTiming': {
        'on': 'visible',
        'request': 'timing',
        'sampleSpec': {
          'sampleOn': '${clientId}',
          'threshold': 1
        },
        'vars': {
          'timingRequestType': 'timing'
        }
      },
      'adwordsTiming': {
        'on': 'visible',
        'request': 'timing',
        'enabled': '${queryParam(gclid)}',
        'vars': {
          'timingRequestType': 'adtiming'
        }
      }
    },
    'extraUrlParamsReplaceMap': {
      'dimension': 'cd',
      'metric': 'cm'
    },
    'optout': '_gaUserPrefs.ioo'
  },

  // USE WITH CAUTION (unless told by Google Analytics representatives)
  // googleanalytics-alpha configuration is not planned to be supported
  // long-term. Avoid use of this value for amp-analytics config attribute
  // unless you plan to migrate before deprecation' #5761
  'googleanalytics-alpha': {
    'vars': {
      'eventValue': '0',
      'documentLocation': 'SOURCE_URL',
      'clientId': 'CLIENT_ID(AMP_ECID_GOOGLE,,_ga)',
      'dataSource': 'AMP',
      'anonymizeIP': 'aip'
    },
    'requests': {
      'host': 'https://www.google-analytics.com',
      'basePrefix': 'v=1&' + '_v=a1&' + 'ds=${dataSource}&' + '${anonymizeIP}&' + '_s=${requestCount}&' + 'dt=${title}&' + 'sr=${screenWidth}x${screenHeight}&' + '_utmht=${timestamp}&' + 'cid=${clientId}&' + 'tid=${account}&' + 'dl=${documentLocation}&' + 'dr=${documentReferrer}&' + 'sd=${screenColorDepth}&' + 'ul=${browserLanguage}&' + 'de=${documentCharset}',
      'baseSuffix': '&a=${pageViewId}&' + 'z=${random}',
      'pageview': '${host}/r/collect?${basePrefix}&' + 't=pageview&' + 'jid=${random}&' + '_r=1' + '${baseSuffix}',
      'event': '${host}/collect?${basePrefix}&' + 't=event&' + 'jid=&' + 'ec=${eventCategory}&' + 'ea=${eventAction}&' + 'el=${eventLabel}&' + 'ev=${eventValue}' + '${baseSuffix}',
      'social': '${host}/collect?${basePrefix}&' + 't=social&' + 'jid=&' + 'sa=${socialAction}&' + 'sn=${socialNetwork}&' + 'st=${socialTarget}' + '${baseSuffix}',
      'timing': '${host}/collect?${basePrefix}&' + 't=${timingRequestType}&' + 'jid=&' + 'plt=${pageLoadTime}&' + 'dns=${domainLookupTime}&' + 'tcp=${tcpConnectTime}&' + 'rrt=${redirectTime}&' + 'srt=${serverResponseTime}&' + 'pdt=${pageDownloadTime}&' + 'clt=${contentLoadTime}&' + 'dit=${domInteractiveTime}' + '${baseSuffix}'
    },
    'triggers': {
      'performanceTiming': {
        'on': 'visible',
        'request': 'timing',
        'sampleSpec': {
          'sampleOn': '${clientId}',
          'threshold': 1
        },
        'vars': {
          'timingRequestType': 'timing'
        }
      },
      'adwordsTiming': {
        'on': 'visible',
        'request': 'timing',
        'enabled': '${queryParam(gclid)}',
        'vars': {
          'timingRequestType': 'adtiming'
        }
      }
    },
    'extraUrlParamsReplaceMap': {
      'dimension': 'cd',
      'metric': 'cm'
    },
    'optout': '_gaUserPrefs.ioo'
  },

  'krux': {
    'requests': {
      'beaconHost': 'https://beacon.krxd.net',
      'timing': 't_navigation_type=0&' + 't_dns=${domainLookupTime}&' + 't_tcp=${tcpConnectTime}&' + 't_http_request=${serverResponseTime}&' + 't_http_response=${pageDownloadTime}&' + 't_content_ready=${contentLoadTime}&' + 't_window_load=${pageLoadTime}&' + 't_redirect=${redirectTime}',
      'common': 'source=amp&' + 'confid=${confid}&' + '_kpid=${pubid}&' + '_kcp_s=${site}&' + '_kcp_sc=${section}&' + '_kcp_ssc=${subsection}&' + '_kcp_d=${canonicalHost}&' + '_kpref_=${documentReferrer}&' + '_kua_kx_amp_client_id=${clientId(_kuid_)}&' + '_kua_kx_lang=${browserLanguage}&' + '_kua_kx_tech_browser_language=${browserLanguage}&' + '_kua_kx_tz=${timezone}',
      'pageview': '${beaconHost}/pixel.gif?${common}&${timing}',
      'event': '${beaconHost}/event.gif?${common}&${timing}&pageview=false'
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    },
    'extraUrlParamsReplaceMap': {
      'user.': '_kua_',
      'page.': '_kpa_'
    }
  },

  'lotame': {
    'requests': {
      'pageview': 'https://bcp.crwdcntrl.net/amp?c=${account}&pv=y'
    },
    'triggers': {
      'track pageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'mediametrie': {
    'requests': {
      'host': 'https://prof.estat.com/m/web',
      'pageview': '${host}/${serial}?' + 'c=${level1}' + '&dom=${ampdocUrl}' + '&enc=${documentCharset}' + '&l3=${level3}' + '&l4=${level4}' + '&n=${random}' + '&p=${level2}' + '&r=${documentReferrer}' + '&sch=${screenHeight}' + '&scw=${screenWidth}' + '&tn=amp' + '&v=1' + '&vh=${availableScreenHeight}' + '&vw=${availableScreenWidth}'
    },
    'triggers': {
      'trackPageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'metrika': {
    'transport': { 'beacon': true, 'xhrpost': true, 'image': false },
    'requests': {
      'pageview': '${_watch}?browser-info=${_brInfo}&${_siteInfo}&${_suffix}',
      'notBounce': '${_watch}?browser-info=ar%3A1%3Anb%3A1%3A${_brInfo}' + '&${_suffix}',
      'externalLink': '${_watch}?browser-info=ln%3A1%3A${_brInfo}&${_suffix}',
      'reachGoal': '${_watch}?browser-info=ar%3A1%3A${_brInfo}&${_siteInfo}' + '&${_goalSuffix}',
      '_domain': 'https://mc.yandex.ru',
      '_watch': '${_domain}/watch/${counterId}',
      '_suffix': 'page-url=${sourceUrl}&page-ref=${documentReferrer}',
      '_goalSuffix': 'page-url=goal%3A%2F%2F${sourceHost}%2F${goalId}' + '&page-ref=${sourceUrl}',
      '_techInfo': ['amp%3A1%3Az%3A${timezone}%3Ai%3A${timestamp}%3Arn%3A${random}', 'la%3A${browserLanguage}%3Aen%3A${documentCharset}', 'rqn%3A${requestCount}', 's%3A${screenWidth}x${screenHeight}x${screenColorDepth}', 'w%3A${availableScreenWidth}x${availableScreenHeight}', 'ds%3A${_timings}%3Auid%3A${clientId(_ym_uid)}%3Apvid%3A${pageViewId}'].join('%3A'),
      '_timings': ['${domainLookupTime}%2C${tcpConnectTime}', '${serverResponseTime}%2C${pageDownloadTime}', '${redirectTime}%2C${navTiming(redirectStart,redirectEnd)}', '${navRedirectCount}%2C${navTiming(domLoading,domInteractive)}', '${navTiming(domContentLoadedEventStart,domContentLoadedEventEnd)}', '${navTiming(navigationStart,domComplete)}', '${pageLoadTime}%2C${navTiming(loadEventStart,loadEventEnd)}', '${contentLoadTime}'].join('%2C'),
      '_brInfo': '${_techInfo}%3A${_title}',
      '_title': 't%3A${title}',
      '_siteInfo': 'site-info=${yaParams}'
    },
    'triggers': {
      'pageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    }
  },

  'mparticle': {
    'vars': {
      'eventType': 'Unknown',
      'debug': false,
      'amp_clientId': 'CLIENT_ID(mparticle_amp_id)'
    },
    'requests': {
      'host': 'https://pixels.mparticle.com',
      'endpointPath': '/v1/${apiKey}/Pixel',
      'baseParams': 'et=${eventType}&' + 'amp_id=${amp_clientId}&' + 'attrs_k=${eventAttributes_Keys}&' + 'attrs_v=${eventAttributes_Values}&' + 'ua_k=${userAttributes_Keys}&' + 'ua_v=${userAttributes_Values}&' + 'ui_t=${userIdentities_Types}&' + 'ui_v=${userIdentities_Values}&' + 'flags_k=${customFlags_Keys}&' + 'flags_v=${customFlags_Values}&' + 'ct=${timestamp}&' + 'dbg=${debug}&' + 'lc=${location}&' + 'av=${appVersion}',
      'pageview': '${host}${endpointPath}?' + 'dt=ScreenView&' + 'n=${canonicalPath}&' + 'hn=${ampdocUrl}&' + 'ttl=${title}&' + '${baseParams}',
      'event': '${host}${endpointPath}?' + 'dt=AppEvent&' + 'n=${eventName}&' + '${baseParams}'
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'nielsen': {
    'vars': {
      'sessionId': 'CLIENT_ID(imrworldwide)'
    },
    'requests': {
      'session': 'https://uaid-linkage.imrworldwide.com/cgi-bin/gn?prd=session&c13=asid,P${apid}&sessionId=${sessionId},&pingtype=4&enc=false&c61=createtm,${timestamp}&rnd=${random}',
      'cloudapi': 'https://cloudapi.imrworldwide.com/nmapi/v2/${apid}/${sessionId}/a?b=%7B%22devInfo%22%3A%7B%22devId%22%3A%22${sessionId}%22%2C%22apn%22%3A%22${apn}%22%2C%22apv%22%3A%22${apv}%22%2C%22apid%22%3A%22${apid}%22%7D%2C%22metadata%22%3A%7B%22static%22%3A%7B%22type%22%3A%22static%22%2C%22section%22%3A%22${section}%22%2C%22assetid%22%3A%22${pageViewId}%22%2C%22segA%22%3A%22${segA}%22%2C%22segB%22%3A%22${segB}%22%2C%22segC%22%3A%22${segC}%22%2C%22adModel%22%3A%220%22%2C%22dataSrc%22%3A%22cms%22%7D%2C%22content%22%3A%7B%7D%2C%22ad%22%3A%7B%7D%7D%2C%22event%22%3A%22playhead%22%2C%22position%22%3A%22${timestamp}%22%2C%22data%22%3A%7B%22hidden%22%3A%22${backgroundState}%22%2C%22blur%22%3A%22${backgroundState}%22%2C%22position%22%3A%22${timestamp}%22%7D%2C%22type%22%3A%22static%22%2C%22utc%22%3A%22${timestamp}%22%2C%22index%22%3A%22${requestCount}%22%7D'
    },
    'triggers': {
      'visible': {
        'on': 'visible',
        'request': ['session', 'cloudapi']
      },
      'hidden': {
        'on': 'hidden',
        'request': 'cloudapi'
      },
      'duration': {
        'on': 'timer',
        'timerSpec': {
          'interval': 10,
          'maxTimerLength': 86400,
          'immediate': false
        },
        'request': 'cloudapi'
      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'oewadirect': {
    'transport': { 'beacon': false, 'xhrpost': false, 'image': true },
    'requests': {
      'pageview': 'https://${s}.oewabox.at/j0=,,,r=${canonicalUrl};+,amp=1+cp=${cp}+ssl=1+hn=${canonicalHost};;;?lt=${pageViewId}&x=${screenWidth}x${screenHeight}x24&c=CLIENT_ID(oewa)'
    },
    'triggers': {
      'pageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    }
  },

  'oewa': {
    'transport': { 'beacon': false, 'xhrpost': false, 'image': true },
    'requests': {
      'pageview': '${url}?s=${s}' + '&amp=1' + '&cp=${cp}' + '&host=${canonicalHost}' + '&path=${canonicalPath}'
    },
    'triggers': {
      'pageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    }
  },
  'parsely': {
    'requests': {
      'host': 'https://srv.pixel.parsely.com',
      'basePrefix': '${host}/plogger/?' + 'rand=${timestamp}&' + 'idsite=${apikey}&' + 'url=${ampdocUrl}&' + 'urlref=${documentReferrer}&' + 'screen=${screenWidth}x${screenHeight}%7C' + '${availableScreenWidth}x${availableScreenHeight}%7C' + '${screenColorDepth}&' + 'title=${title}&' + 'date=${timestamp}&' + 'ampid=${clientId(_parsely_visitor)}',
      'pageview': '${basePrefix}&action=pageview'
    },
    'triggers': {
      'defaultPageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'piano': {
    'requests': {
      'host': 'https://api-v3.tinypass.com',
      'basePrefix': '/api/v3',
      'baseSuffix': '&pageview_id=${pageViewId}&rand=${random}&' + 'amp_client_id=${clientId}&aid=${aid}',
      'pageview': '${host}${basePrefix}/page/track?url=${canonicalUrl}&' + 'referer=${documentReferrer}&content_created=${contentCreated}&' + 'content_author=${contentAuthor}&content_section=${contentSection}&' + 'timezone_offset=${timezone}&tags=${tags}&amp_url=${ampdocUrl}&' + 'screen=${screenWidth}x${screenHeight}${baseSuffix}'
    }
  },

  'quantcast': {
    'vars': {
      'labels': ''
    },
    'requests': {
      'host': 'https://pixel.quantserve.com/pixel',
      'pageview': '${host};r=${random};a=${pcode};labels=${labels};' + 'fpan=;fpa=${clientId(__qca)};ns=0;ce=1;cm=;je=0;' + 'sr=${screenWidth}x${screenHeight}x${screenColorDepth};' + 'enc=n;et=${timestamp};ref=${documentReferrer};url=${canonicalUrl}'
    },
    'triggers': {
      'defaultPageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'adobeanalytics': {
    'transport': { 'xhrpost': false, 'beacon': false, 'image': true },
    'vars': {
      'pageName': 'TITLE',
      'host': '',
      'reportSuites': '',
      'linkType': 'o',
      'linkUrl': '',
      'linkName': ''
    },
    'requests': {
      'requestPath': '/b/ss/${reportSuites}/0/amp-1.0/s${random}',
      // vid starts with z to work around #2198
      'basePrefix': 'vid=z${clientId(adobe_amp_id)}' + '&ndh=0' + '&ce=${documentCharset}' + '&pageName=${pageName}' + '&g=${ampdocUrl}' + '&r=${documentReferrer}' + '&bh=${availableScreenHeight}' + '&bw=${availableScreenWidth}' + '&c=${screenColorDepth}' + '&j=amp' + '&s=${screenWidth}x${screenHeight}',
      'pageview': 'https://${host}${requestPath}?${basePrefix}',
      'click': 'https://${host}${requestPath}?${basePrefix}&pe=lnk_${linkType}&pev1=${linkUrl}&pev2=${linkName}'
    }
  },

  'adobeanalytics_nativeConfig': {
    'triggers': {
      'pageLoad': {
        'on': 'visible',
        'request': 'iframeMessage'
      }
    }
  },

  'infonline': {
    'vars': {
      'sv': 'ke',
      'ap': '1'
    },
    'transport': { 'beacon': false, 'xhrpost': false, 'image': true },
    'requests': {
      'pageview': '${url}?st=${st}' + '&sv=${sv}' + '&ap=${ap}' + '&co=${co}' + '&cp=${cp}' + '&host=${canonicalHost}' + '&path=${canonicalPath}'
    },
    'triggers': {
      'pageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    }
  },
  'simplereach': {
    'vars': {
      'pid': '',
      'published_at': '',
      'authors': [],
      'channels': [],
      'tags': []
    },
    'requests': {
      'host': 'https://edge.simplereach.com',
      'baseParams': 'amp=true' + '&pid=${pid}' + '&title=${title}' + '&url=${canonicalUrl}' + '&date=${published_at}' + '&authors=${authors}' + '&channels=${categories}' + '&tags=${tags}' + '&referrer=${documentReferrer}' + '&page_url=${sourceUrl}' + '&user_id=${clientId(sr_amp_id)}' + '&domain=${canonicalHost}',
      'visible': '${host}/n?${baseParams}',
      'timer': '${host}/t?${baseParams}' + '&t=5000' + '&e=5000'
    },
    'triggers': {
      'visible': {
        'on': 'visible',
        'request': 'visible'
      },
      'timer': {
        'on': 'timer',
        'timerSpec': {
          'interval': 5,
          'maxTimerLength': 1200
        },
        'request': 'timer'
      }
    }
  },

  'segment': {
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    },
    'vars': {
      'anonymousId': 'CLIENT_ID(segment_amp_id)'
    },
    'requests': {
      'host': 'https://api.segment.io/v1/pixel',
      'base': '?writeKey=${writeKey}' + '&context.library.name=amp' + '&anonymousId=${anonymousId}' + '&context.locale=${browserLanguage}' + '&context.page.path=${canonicalPath}' + '&context.page.url=${canonicalUrl}' + '&context.page.referrer=${documentReferrer}' + '&context.page.title=${title}' + '&context.screen.width=${screenWidth}' + '&context.screen.height=${screenHeight}',
      'page': '${host}/page${base}&name=${name}',
      'track': '${host}/track${base}&event=${event}'
    },
    'triggers': {
      'page': {
        'on': 'visible',
        'request': 'page'
      }
    }
  },

  'snowplow': {
    'vars': {
      'duid': 'CLIENT_ID(_sp_id)'
    },
    'requests': {
      'aaVersion': 'amp-0.2',
      'basePrefix': 'https://${collectorHost}/i?url=${canonicalUrl}&page=${title}&' + 'res=${screenWidth}x${screenHeight}&stm=${timestamp}&' + 'tz=${timezone}&aid=${appId}&p=web&tv=${aaVersion}&' + 'cd=${screenColorDepth}&cs=${documentCharset}&' + 'duid=${duid}&' + 'lang=${browserLanguage}&refr=${documentReferrer}&stm=${timezone}&' + 'vp=${viewportWidth}x${viewportHeight}',
      'pageView': '${basePrefix}&e=pv',
      'structEvent': '${basePrefix}&e=se&' + 'se_ca=${structEventCategory}&se_ac=${structEventAction}&' + 'se_la=${structEventLabel}&se_pr=${structEventProperty}&' + 'se_va=${structEventValue}'
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'webtrekk': {
    'requests': {
      'trackURL': 'https://${trackDomain}/${trackId}/wt',
      'parameterPrefix': '?p=432,${contentId},1,' + '${screenWidth}x${screenHeight},${screenColorDepth},1,' + '${timestamp},${documentReferrer},${viewportWidth}x' + '${viewportHeight},0&tz=${timezone}' + '&eid=${clientId(amp-wt3-eid)}&la=${browserLanguage}',
      'parameterSuffix': '&pu=${canonicalUrl}',
      'pageParameter': '&cp1=${pageParameter1}' + '&cp2=${pageParameter2}&cp3=${pageParameter3}' + '&cp4=${pageParameter4}&cp5=${pageParameter5}' + '&cp6=${pageParameter6}&cp7=${pageParameter7}' + '&cp8=${pageParameter8}&cp9=${pageParameter9}' + '&cp10=${pageParameter10}',
      'pageCategories': '&cg1=${pageCategory1}' + '&cg2=${pageCategory2}&cg3=${pageCategory3}' + '&cg4=${pageCategory4}&cg5=${pageCategory5}' + '&cg6=${pageCategory6}&cg7=${pageCategory7}' + '&cg8=${pageCategory8}&cg9=${pageCategory9}' + '&cg10=${pageCategory10}',
      'pageview': '${trackURL}${parameterPrefix}${pageParameter}' + '${pageCategories}${parameterSuffix}',
      'actionParameter': '&ck1=${actionParameter1}' + '&ck2=${actionParameter2}&ck3=${actionParameter3}' + '&ck4=${actionParameter4}&ck5=${actionParameter5}',
      'event': '${trackURL}${parameterPrefix}&ct=${actionName}' + '${actionParameter}${parameterSuffix}'
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },

  'mpulse': {
    'requests': {
      'onvisible': 'https://${beacon_url}?' + 'h.d=${h.d}' + '&h.key=${h.key}' + '&h.t=${h.t}' + '&h.cr=${h.cr}' + '&rt.start=navigation' + '&rt.si=${clientId(amp_mpulse)}' + '&rt.ss=${timestamp}' + '&rt.end=${timestamp}' + '&t_resp=${navTiming(navigationStart,responseStart)}' + '&t_page=${navTiming(responseStart,loadEventStart)}' + '&t_done=${navTiming(navigationStart,loadEventStart)}' + '&nt_nav_type=${navType}' + '&nt_red_cnt=${navRedirectCount}' + '&nt_nav_st=${navTiming(navigationStart)}' + '&nt_red_st=${navTiming(redirectStart)}' + '&nt_red_end=${navTiming(redirectEnd)}' + '&nt_fet_st=${navTiming(fetchStart)}' + '&nt_dns_st=${navTiming(domainLookupStart)}' + '&nt_dns_end=${navTiming(domainLookupEnd)}' + '&nt_con_st=${navTiming(connectStart)}' + '&nt_ssl_st=${navTiming(secureConnectionStart)}' + '&nt_con_end=${navTiming(connectEnd)}' + '&nt_req_st=${navTiming(requestStart)}' + '&nt_res_st=${navTiming(responseStart)}' + '&nt_unload_st=${navTiming(unloadEventStart)}' + '&nt_unload_end=${navTiming(unloadEventEnd)}' + '&nt_domloading=${navTiming(domLoading)}' + '&nt_res_end=${navTiming(responseEnd)}' + '&nt_domint=${navTiming(domInteractive)}' + '&nt_domcontloaded_st=${navTiming(domContentLoadedEventStart)}' + '&nt_domcontloaded_end=${navTiming(domContentLoadedEventEnd)}' + '&nt_domcomp=${navTiming(domComplete)}' + '&nt_load_st=${navTiming(loadEventStart)}' + '&nt_load_end=${navTiming(loadEventEnd)}' + '&v=1' + '&http.initiator=amp' + '&u=${sourceUrl}' + '&amp.u=${ampdocUrl}' + '&r2=${documentReferrer}' + '&scr.xy=${screenWidth}x${screenHeight}'
    },

    'triggers': {
      'onvisible': {
        'on': 'visible',
        'request': 'onvisible'
      }
    },

    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    },

    'extraUrlParamsReplaceMap': {
      'ab_test': 'h.ab',
      'page_group': 'h.pg',
      'custom_dimension.': 'cdim.',
      'custom_metric.': 'cmet.'
    }
  },

  'linkpulse': {
    'vars': {
      'id': '',
      'pageUrl': 'CANONICAL_URL',
      'title': 'TITLE',
      'section': '',
      'channel': 'amp',
      'type': '',
      'host': 'pp.lp4.io',
      'empty': ''
    },
    'requests': {
      'base': 'https://${host}',
      'pageview': '${base}/p?i=${id}' + '&r=${documentReferrer}' + '&p=${pageUrl}' + '&s=${section}' + '&t=${type}' + '&c=${channel}' + '&mt=${title}' + '&_t=amp' + '&_r=${random}',
      'pageload': '${base}/pl?i=${id}' + '&ct=${domInteractiveTime}' + '&rt=${pageDownloadTime}' + '&pt=${pageLoadTime}' + '&p=${pageUrl}' + '&c=${channel}' + '&t=${type}' + '&s=${section}' + '&_t=amp' + '&_r=${random}',
      'ping': '${base}/u?i=${id}' + '&u=${clientId(_lp4_u)}' + '&p=${pageUrl}' + '&uActive=true' + '&isPing=yes' + '&c=${channel}' + '&t=${type}' + '&s=${section}' + '&_t=amp' + '&_r=${random}'
    },
    'triggers': {
      'pageview': {
        'on': 'visible',
        'request': 'pageview'
      },
      'pageload': {
        'on': 'visible',
        'request': 'pageload'
      },
      'ping': {
        'on': 'timer',
        'timerSpec': {
          'interval': 30,
          'maxTimerLength': 7200
        },
        'request': 'ping'

      }
    },
    'transport': {
      'beacon': false,
      'xhrpost': false,
      'image': true
    }
  },
  'rakam': {
    'vars': {
      'deviceId': 'CLIENT_ID(rakam_device_id)'
    },
    'requests': {
      'base': '?api.api_key=${writeKey}' + '&prop._platform=amp' + '&prop._device_id=${deviceId}' + '&prop.locale=${browserLanguage}' + '&prop.path=${canonicalPath}' + '&prop.url=${canonicalUrl}' + '&prop.color_depth=${screenColorDepth}' + '&prop._referrer=${documentReferrer}' + '&prop.title=${title}' + '&prop.timezone=${timezone}' + '&prop._time=${timestamp}' + '&prop.resolution=${screenWidth} × ${screenHeight}',
      'pageview': 'https://${apiEndpoint}/event/pixel${base}&collection=${pageViewName}',
      'custom': 'https://${apiEndpoint}/event/pixel${base}&collection=${collection}'
    }
  },
  'ibeatanalytics': {
    'requests': {
      'host': 'https://ibeat.indiatimes.com',
      'base': 'https://ibeat.indiatimes.com/iBeat/pageTrendlogAmp.html',
      'pageview': '${base}?' + '&h=${h}' + '&d=${h}' + '&url=${url}' + '&k=${key}' + '&ts=${time}' + '&ch=${channel}' + '&sid=${uid}' + '&at=${agentType}' + '&ref=${documentReferrer}' + '&aid=${aid}' + '&loc=1' + '&ct=1' + '&cat=${cat}' + '&scat=${scat}' + '&ac=1' + '&tg=${tags}' + '&ctids=${catIds}' + '&pts=${pagePublishTime}' + '&auth=${author}' + '&pos=${position}' + '&iBeatField=${ibeatFields}' + '&cid=${clientId(MSCSAuthDetails)}'
    },
    'triggers': {
      'defaultPageview': {
        'on': 'visible',
        'request': 'pageview'
      }
    }
  }
};
exports.ANALYTICS_CONFIG = ANALYTICS_CONFIG;
ANALYTICS_CONFIG['infonline']['triggers']['pageview']['iframe' +
/* TEMPORARY EXCEPTION */'Ping'] = true;

ANALYTICS_CONFIG['adobeanalytics_nativeConfig']['triggers']['pageLoad']['iframe' +
/* TEMPORARY EXCEPTION */'Ping'] = true;

ANALYTICS_CONFIG['oewa']['triggers']['pageview']['iframe' +
/* TEMPORARY EXCEPTION */'Ping'] = true;

},{}],11:[function(require,module,exports){
exports.__esModule = true;
exports.isPositiveNumber_ = isPositiveNumber_;
exports.isValidPercentage_ = isValidPercentage_;
exports.isVisibilitySpecValid = isVisibilitySpecValid;
exports.getElement = getElement;
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

var _srcDom = require('../../../src/dom');

var _srcLog = require('../../../src/log');

var _srcUtilsObject = require('../../../src/utils/object');

var _srcServices = require('../../../src/services');

var _srcService = require('../../../src/service');

var _srcString = require('../../../src/string');

var _srcIntersectionObserverPolyfill = require('../../../src/intersection-observer-polyfill');

// Variables that are passed to the callback.
var MAX_CONTINUOUS_TIME = 'maxContinuousVisibleTime';
var TOTAL_VISIBLE_TIME = 'totalVisibleTime';
var FIRST_SEEN_TIME = 'firstSeenTime';
var LAST_SEEN_TIME = 'lastSeenTime';
var FIRST_VISIBLE_TIME = 'firstVisibleTime';
var LAST_VISIBLE_TIME = 'lastVisibleTime';
var MIN_VISIBLE = 'minVisiblePercentage';
var MAX_VISIBLE = 'maxVisiblePercentage';
var ELEMENT_X = 'elementX';
var ELEMENT_Y = 'elementY';
var ELEMENT_WIDTH = 'elementWidth';
var ELEMENT_HEIGHT = 'elementHeight';
var TOTAL_TIME = 'totalTime';
var LOAD_TIME_VISIBILITY = 'loadTimeVisibility';
var BACKGROUNDED = 'backgrounded';
var BACKGROUNDED_AT_START = 'backgroundedAtStart';

// Variables that are not exposed outside this class.
var CONTINUOUS_TIME = 'cT';
var LAST_UPDATE = 'lU';
var IN_VIEWPORT = 'iV';
var TIME_LOADED = 'tL';
var SCHEDULED_RUN_ID = 'schId';

// Keys used in VisibilitySpec
var CONTINUOUS_TIME_MAX = 'continuousTimeMax';
var CONTINUOUS_TIME_MIN = 'continuousTimeMin';
var TOTAL_TIME_MAX = 'totalTimeMax';
var TOTAL_TIME_MIN = 'totalTimeMin';
var VISIBLE_PERCENTAGE_MIN = 'visiblePercentageMin';
var VISIBLE_PERCENTAGE_MAX = 'visiblePercentageMax';

var TAG_ = 'Analytics.Visibility';

/**
 * Checks if the value is undefined or positive number like.
 * "", 1, 0, undefined, 100, 101 are positive. -1, NaN are not.
 *
 * Visible for testing.
 *
 * @param {number} num The number to verify.
 * @return {boolean}
 * @private
 */

function isPositiveNumber_(num) {
  return num === undefined || typeof num == 'number' && Math.sign(num) >= 0;
}

/**
 * Checks if the value is undefined or a number between 0 and 100.
 * "", 1, 0, undefined, 100 return true. -1, NaN and 101 return false.
 *
 * Visible for testing.
 *
 * @param {number} num The number to verify.
 * @return {boolean}
 */

function isValidPercentage_(num) {
  return num === undefined || typeof num == 'number' && Math.sign(num) >= 0 && num <= 100;
}

/**
 * Checks and outputs information about visibilitySpecValidation.
 * @param {!JsonObject} config Configuration for instrumentation.
 * @return {boolean} True if the spec is valid.
 * @private
 */

function isVisibilitySpecValid(config) {
  if (!config['visibilitySpec']) {
    return true;
  }

  var spec = config['visibilitySpec'];
  var selector = spec['selector'];
  if (!selector || !_srcString.startsWith(selector, '#') && !_srcString.startsWith(selector, 'amp-') && selector != ':root' && selector != ':host') {
    _srcLog.user().error(TAG_, 'Visibility spec requires an id selector, a tag ' + 'name starting with "amp-" or ":root"');
    return false;
  }

  var ctMax = spec[CONTINUOUS_TIME_MAX];
  var ctMin = spec[CONTINUOUS_TIME_MIN];
  var ttMax = spec[TOTAL_TIME_MAX];
  var ttMin = spec[TOTAL_TIME_MIN];

  if (!isPositiveNumber_(ctMin) || !isPositiveNumber_(ctMax) || !isPositiveNumber_(ttMin) || !isPositiveNumber_(ttMax)) {
    _srcLog.user().error(TAG_, 'Timing conditions should be positive integers when specified.');
    return false;
  }

  if (ctMax < ctMin || ttMax < ttMin) {
    _srcLog.user().warn('AMP-ANALYTICS', 'Max value in timing conditions should be ' + 'more than the min value.');
    return false;
  }

  if (!isValidPercentage_(spec[VISIBLE_PERCENTAGE_MAX]) || !isValidPercentage_(spec[VISIBLE_PERCENTAGE_MIN])) {
    _srcLog.user().error(TAG_, 'visiblePercentage conditions should be between 0 and 100.');
    return false;
  }

  if (spec[VISIBLE_PERCENTAGE_MAX] < spec[VISIBLE_PERCENTAGE_MIN]) {
    _srcLog.user().error(TAG_, 'visiblePercentageMax should be greater than ' + 'visiblePercentageMin');
    return false;
  }
  return true;
}

/**
 * Returns the element that matches the selector. If the selector is an
 * id, the element with that id is returned. If the selector is a tag name, an
 * ancestor of the analytics element with that tag name is returned.
 *
 * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc.
 * @param {string} selector The selector for the element to track.
 * @param {!Element} analyticsEl Element whose ancestors to search.
 * @param {!String} selectionMethod The method to use to find the element.
 * @return {?Element} Element corresponding to the selector if found.
 */

function getElement(ampdoc, selector, analyticsEl, selectionMethod) {
  if (!analyticsEl) {
    return null;
  }

  var foundEl = undefined;
  var friendlyFrame = _srcService.getParentWindowFrameElement(analyticsEl, ampdoc.win);
  // Special case for root selector.
  if (selector == ':host' || selector == ':root') {
    foundEl = friendlyFrame ? _srcDom.closestBySelector(friendlyFrame, '.i-amphtml-element') : null;
  } else if (selectionMethod == 'closest') {
    // Only tag names are supported currently.
    foundEl = _srcDom.closestByTag(analyticsEl, selector);
  } else if (selectionMethod == 'scope') {
    foundEl = _srcDom.scopedQuerySelector(_srcLog.dev().assertElement(analyticsEl.parentElement), selector);
  } else if (selector[0] == '#') {
    var containerDoc = friendlyFrame ? analyticsEl.ownerDocument : ampdoc;
    foundEl = containerDoc.getElementById(selector.slice(1));
  }

  if (foundEl) {
    // Restrict result to be contained by ampdoc.
    var isContainedInDoc = ampdoc.contains(friendlyFrame || foundEl);
    if (isContainedInDoc) {
      return foundEl;
    }
  }
  return null;
}

/**
 * @typedef {{
 *   state: !Object,
 *   config: !Object,
  *  callback: function(!Object),
  *  shouldBeVisible: boolean,
 * }}
 */
var VisibilityListenerDef = undefined;

/**
 * Allows tracking of AMP elements in the viewport.
 *
 * This class allows a caller to specify conditions to evaluate when an element
 * is in viewport and for how long. If the conditions are satisfied, a provided
 * callback is called.
 */

var Visibility = (function () {

  /** @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc */

  function Visibility(ampdoc) {
    babelHelpers.classCallCheck(this, Visibility);

    /** @const {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc */
    this.ampdoc = ampdoc;

    /**
     * key: resource id.
     * value: [VisibilityListenerDef]
     * @type {!Object<!Array<VisibilityListenerDef>>}
     * @private
     */
    this.listeners_ = Object.create(null);

    /** @const {!../../../src/service/timer-impl.Timer} */
    this.timer_ = _srcServices.timerFor(this.ampdoc.win);

    /** @private {Array<!../../../src/service/resource.Resource>} */
    this.resources_ = [];

    /** @private {boolean} */
    this.visibilityListenerRegistered_ = false;

    /** @private {!../../../src/service/resources-impl.Resources} */
    this.resourcesService_ = _srcServices.resourcesForDoc(this.ampdoc);

    /** @private {number} Amount of time to wait for next calculation. */
    this.timeToWait_ = Infinity;

    /** @private @const {!../../../src/service/viewer-impl.Viewer} */
    this.viewer_ = _srcServices.viewerForDoc(this.ampdoc);

    /** @private {boolean} */
    this.backgroundedAtStart_ = !this.viewer_.isVisible();

    /** @private {boolean} */
    this.backgrounded_ = this.backgroundedAtStart_;

    /** @private {!Object<number, number>} */
    this.lastVisiblePercent_ = _srcUtilsObject.map();

    /** @private {?IntersectionObserver|?IntersectionObserverPolyfill} */
    this.intersectionObserver_ = null;
  }

  /**
   * @param {!Object} config
   * @param {function(!Object)} callback
   * @param {boolean} shouldBeVisible True if the element should be visible
   *   when callback is called. False otherwise.
   * @param {!Element} analyticsElement The amp-analytics element that the
   *   config is associated with.
   */

  Visibility.prototype.listenOnce = function listenOnce(config, callback, shouldBeVisible, analyticsElement) {
    var _this = this;

    var selector = config['selector'];
    var element = _srcLog.user().assertElement(getElement(this.ampdoc, selector, _srcLog.dev().assertElement(analyticsElement), config['selectionMethod']), 'Element not found for visibilitySpec: ' + selector);

    var resource = this.resourcesService_.getResourceForElementOptional(element);

    _srcLog.user().assert(resource, 'Visibility tracking not supported on element: ', element);

    if (!this.intersectionObserver_) {
      var onIntersectionChanges = function (entries) {
        entries.forEach(function (change) {
          _this.onIntersectionChange_(change.target, change.intersectionRatio * 100,
          /* docVisible */true);
        });
      };

      if (_srcIntersectionObserverPolyfill.nativeIntersectionObserverSupported(this.ampdoc.win)) {
        this.intersectionObserver_ = new this.ampdoc.win.IntersectionObserver(onIntersectionChanges, { threshold: _srcIntersectionObserverPolyfill.DEFAULT_THRESHOLD });
      } else {
        (function () {
          _this.intersectionObserver_ = new _srcIntersectionObserverPolyfill.IntersectionObserverPolyfill(onIntersectionChanges, { threshold: _srcIntersectionObserverPolyfill.DEFAULT_THRESHOLD });
          //TODO: eventually this is go into the proposed layoutManager.
          var viewport = _srcServices.viewportForDoc(_this.ampdoc);
          var ticker = function () {
            _this.intersectionObserver_.tick(viewport.getRect());
          };
          viewport.onScroll(ticker);
          viewport.onChanged(ticker);
          // Tick in the next event loop. That's how native InOb works.
          setTimeout(ticker);
        })();
      }
    }

    resource.loadedOnce().then(function () {
      var resId = resource.getId();
      _this.listeners_[resId] = _this.listeners_[resId] || [];
      var state = {};
      state[TIME_LOADED] = _this.now_();
      _this.listeners_[resId].push({ config: config, callback: callback, state: state, shouldBeVisible: shouldBeVisible });
      _this.resources_.push(resource);
      _this.intersectionObserver_.observe(element);
    });

    if (!this.visibilityListenerRegistered_) {
      this.viewer_.onVisibilityChanged(function () {
        _this.onDocumentVisibilityChange_(_this.viewer_.isVisible());
      });
      this.visibilityListenerRegistered_ = true;
    }
  };

  /**
   * @param {!Element} target
   * @param {number} visible
   * @param {boolean} docVisible
   * @private
   **/

  Visibility.prototype.onIntersectionChange_ = function onIntersectionChange_(target, visible, docVisible) {
    var _this2 = this;

    var resource = this.resourcesService_.getResourceForElement(target);
    var listeners = this.listeners_[resource.getId()];
    if (docVisible) {
      this.lastVisiblePercent_[resource.getId()] = visible;
    } else {
      visible = 0;
    }

    var _loop = function (c) {
      var listener = listeners[c];
      var shouldBeVisible = !!listener.shouldBeVisible;
      var config = listener.config;
      var state = listener.state;

      // Update states and check if all conditions are satisfied
      var conditionsMet = _this2.updateCounters_(visible, listener, shouldBeVisible);

      // Hidden trigger
      if (!shouldBeVisible) {
        if (!docVisible && conditionsMet) {
          _this2.triggerCallback_(listeners, listener, resource.getLayoutBox());
        }
        // done for hidden trigger
        return 'continue';
      }

      // Visible trigger
      if (conditionsMet) {
        _this2.triggerCallback_(listeners, listener, resource.getLayoutBox());
      } else if (state[IN_VIEWPORT] && !state[SCHEDULED_RUN_ID]) {
        // There is unmet duration condition, schedule a check
        var timeToWait = _this2.computeTimeToWait_(state, config);
        if (timeToWait <= 0) {
          return 'continue';
        }
        state[SCHEDULED_RUN_ID] = _this2.timer_.delay(function () {
          _srcLog.dev().assert(state[IN_VIEWPORT], 'should have been in viewport');
          if (_this2.updateCounters_(_this2.lastVisiblePercent_[resource.getId()], listener, /* shouldBeVisible */true)) {
            _this2.triggerCallback_(listeners, listener, resource.getLayoutBox());
          }
        }, timeToWait);
      } else if (!state[IN_VIEWPORT] && state[SCHEDULED_RUN_ID]) {
        _this2.timer_.cancel(state[SCHEDULED_RUN_ID]);
        state[SCHEDULED_RUN_ID] = null;
      }
    };

    for (var c = listeners.length - 1; c >= 0; c--) {
      var _ret2 = _loop(c);

      if (_ret2 === 'continue') continue;
    }

    // Remove target that have no listeners.
    if (listeners.length == 0) {
      this.intersectionObserver_.unobserve(target);
    }
  };

  /**
   * @param {boolean} docVisible
   * @private
   */

  Visibility.prototype.onDocumentVisibilityChange_ = function onDocumentVisibilityChange_(docVisible) {
    if (!docVisible) {
      this.backgrounded_ = true;
    }
    for (var i = 0; i < this.resources_.length; i++) {
      var resource = this.resources_[i];
      if (!resource.hasLoadedOnce()) {
        continue;
      }
      this.onIntersectionChange_(resource.element, this.lastVisiblePercent_[resource.getId()] || 0, docVisible);
    }
  };

  /**
   * Updates counters for a given listener.
   * @param {number} visible Percentage of element visible in viewport.
   * @param {Object<string,Object>} listener The listener whose counters need
   *  updating.
   * @param {boolean} triggerType True if element should be visible.
   *  False otherwise.
   * @return {boolean} true if all visibility conditions are satisfied
   * @private
   */

  Visibility.prototype.updateCounters_ = function updateCounters_(visible, listener, triggerType) {
    var config = listener['config'];
    var state = listener['state'] || {};

    if (visible > 0) {
      var timeElapsed = this.now_() - state[TIME_LOADED];
      state[FIRST_SEEN_TIME] = state[FIRST_SEEN_TIME] || timeElapsed;
      state[LAST_SEEN_TIME] = timeElapsed;
      // Consider it as load time visibility if this happens within 300ms of
      // page load.
      if (state[LOAD_TIME_VISIBILITY] == undefined && timeElapsed < 300) {
        state[LOAD_TIME_VISIBILITY] = visible;
      }
    }

    var wasInViewport = state[IN_VIEWPORT];
    var timeSinceLastUpdate = this.now_() - state[LAST_UPDATE];
    state[IN_VIEWPORT] = this.isInViewport_(visible, config[VISIBLE_PERCENTAGE_MIN], config[VISIBLE_PERCENTAGE_MAX]);

    if (state[IN_VIEWPORT] && wasInViewport) {
      // Keep counting.
      this.setState_(state, visible, timeSinceLastUpdate);
    } else if (!state[IN_VIEWPORT] && wasInViewport) {
      // The resource went out of view. Do final calculations and reset state.
      _srcLog.dev().assert(state[LAST_UPDATE] > 0, 'lastUpdated time in weird state.');

      state[MAX_CONTINUOUS_TIME] = Math.max(state[MAX_CONTINUOUS_TIME], state[CONTINUOUS_TIME] + timeSinceLastUpdate);

      state[LAST_UPDATE] = -1;
      state[TOTAL_VISIBLE_TIME] += timeSinceLastUpdate;
      state[CONTINUOUS_TIME] = 0; // Clear only after max is calculated above.
      state[LAST_VISIBLE_TIME] = this.now_() - state[TIME_LOADED];
    } else if (state[IN_VIEWPORT] && !wasInViewport) {
      // The resource came into view. start counting.
      _srcLog.dev().assert(state[LAST_UPDATE] == undefined || state[LAST_UPDATE] == -1, 'lastUpdated time in weird state.');
      state[FIRST_VISIBLE_TIME] = state[FIRST_VISIBLE_TIME] || this.now_() - state[TIME_LOADED];
      this.setState_(state, visible, 0);
    }

    listener['state'] = state;

    return (triggerType && state[IN_VIEWPORT] || !triggerType) && (config[TOTAL_TIME_MIN] === undefined || state[TOTAL_VISIBLE_TIME] >= config[TOTAL_TIME_MIN]) && (config[TOTAL_TIME_MAX] === undefined || state[TOTAL_VISIBLE_TIME] <= config[TOTAL_TIME_MAX]) && (config[CONTINUOUS_TIME_MIN] === undefined || (state[MAX_CONTINUOUS_TIME] || 0) >= config[CONTINUOUS_TIME_MIN]) && (config[CONTINUOUS_TIME_MAX] === undefined || (state[MAX_CONTINUOUS_TIME] || 0) <= config[CONTINUOUS_TIME_MAX]);
  };

  /**
   * @param {!Object} state
   * @param {!Object} config
   * @return {number}
   * @private
   */

  Visibility.prototype.computeTimeToWait_ = function computeTimeToWait_(state, config) {
    var waitForContinuousTime = config[CONTINUOUS_TIME_MIN] > state[CONTINUOUS_TIME] ? config[CONTINUOUS_TIME_MIN] - state[CONTINUOUS_TIME] : 0;

    var waitForTotalTime = config[TOTAL_TIME_MIN] > state[TOTAL_VISIBLE_TIME] ? config[TOTAL_TIME_MIN] - state[TOTAL_VISIBLE_TIME] : 0;

    // Wait for minimum of (previous timeToWait, positive values of
    // waitForContinuousTime and waitForTotalTime).
    this.timeToWait_ = Math.min(this.timeToWait_, waitForContinuousTime || Infinity, waitForTotalTime || Infinity);

    // Return a max of wait time (used by V2)
    return Math.max(waitForContinuousTime, waitForTotalTime);
  };

  /**
   * For the purposes of these calculations, a resource is in viewport if the
   * visibility conditions are satisfied or they are not defined.
   * @param {number} visible Percentage of element visible
   * @param {number} min Lower bound of visibility condition. Not inclusive
   * @param {number} max Upper bound of visibility condition. Inclusive.
   * @return {boolean} true if the conditions are satisfied.
   * @private
   */

  Visibility.prototype.isInViewport_ = function isInViewport_(visible, min, max) {
    return !!(visible > (min || 0) && visible <= (max || 100));
  };

  /**
   * @param {!Object} s State of the listener
   * @param {number} visible Percentage of element visible
   * @param {number} sinceLast Milliseconds since last update
   * @private
   */

  Visibility.prototype.setState_ = function setState_(s, visible, sinceLast) {
    s[LAST_UPDATE] = this.now_();
    s[TOTAL_VISIBLE_TIME] = s[TOTAL_VISIBLE_TIME] !== undefined ? s[TOTAL_VISIBLE_TIME] + sinceLast : 0;
    s[CONTINUOUS_TIME] = s[CONTINUOUS_TIME] !== undefined ? s[CONTINUOUS_TIME] + sinceLast : 0;
    s[MAX_CONTINUOUS_TIME] = s[MAX_CONTINUOUS_TIME] !== undefined ? Math.max(s[MAX_CONTINUOUS_TIME], s[CONTINUOUS_TIME]) : 0;
    s[MIN_VISIBLE] = s[MIN_VISIBLE] ? Math.min(s[MIN_VISIBLE], visible) : visible;
    s[MAX_VISIBLE] = s[MAX_VISIBLE] ? Math.max(s[MAX_VISIBLE], visible) : visible;
    s[LAST_VISIBLE_TIME] = this.now_() - s[TIME_LOADED];
  };

  /**
   * Trigger listener callback.
   * @param {!Array<VisibilityListenerDef>} listeners
   * @param {!VisibilityListenerDef} listener
   * @param {!../../../src/layout-rect.LayoutRectDef} layoutBox The bounding rectangle
   *     for the element
   * @private
   */

  Visibility.prototype.triggerCallback_ = function triggerCallback_(listeners, listener, layoutBox) {
    var state = listener.state;
    if (state[SCHEDULED_RUN_ID]) {
      this.timer_.cancel(state[SCHEDULED_RUN_ID]);
      state[SCHEDULED_RUN_ID] = null;
    }
    this.prepareStateForCallback_(state, layoutBox);
    listener.callback(state);
    listeners.splice(listeners.indexOf(listener), 1);
  };

  /**
   * Sets variable values for callback. Cleans up existing values.
   * @param {Object<string, *>} state The state object to populate
   * @param {!../../../src/layout-rect.LayoutRectDef} layoutBox The bounding rectangle
   *     for the element
   * @private
   */

  Visibility.prototype.prepareStateForCallback_ = function prepareStateForCallback_(state, layoutBox) {
    state[ELEMENT_X] = layoutBox.left;
    state[ELEMENT_Y] = layoutBox.top;
    state[ELEMENT_WIDTH] = layoutBox.width;
    state[ELEMENT_HEIGHT] = layoutBox.height;
    state[TOTAL_TIME] = this.getTotalTime_() || '';

    state[LOAD_TIME_VISIBILITY] = state[LOAD_TIME_VISIBILITY] || 0;
    if (state[MIN_VISIBLE] !== undefined) {
      state[MIN_VISIBLE] = Math.round(_srcLog.dev().assertNumber(state[MIN_VISIBLE]) * 100) / 100;
    }
    if (state[MAX_VISIBLE] !== undefined) {
      state[MAX_VISIBLE] = Math.round(_srcLog.dev().assertNumber(state[MAX_VISIBLE]) * 100) / 100;
    }
    state[BACKGROUNDED] = this.backgrounded_ ? '1' : '0';
    state[BACKGROUNDED_AT_START] = this.backgroundedAtStart_ ? '1' : '0';

    // Remove the state that need not be public and call callback.
    delete state[CONTINUOUS_TIME];
    delete state[LAST_UPDATE];
    delete state[IN_VIEWPORT];
    delete state[TIME_LOADED];
    delete state[SCHEDULED_RUN_ID];

    for (var k in state) {
      if (state.hasOwnProperty(k)) {
        state[k] = String(state[k]);
      }
    }
  };

  Visibility.prototype.getTotalTime_ = function getTotalTime_() {
    var perf = this.ampdoc.win.performance;
    return perf && perf.timing && perf.timing.domInteractive ? this.now_() - perf.timing.domInteractive : null;
  };

  Visibility.prototype.now_ = function now_() {
    return this.ampdoc.win.Date.now();
  };

  return Visibility;
})();

exports.Visibility = Visibility;

},{"../../../src/dom":22,"../../../src/intersection-observer-polyfill":30,"../../../src/log":33,"../../../src/service":44,"../../../src/services":45,"../../../src/string":46,"../../../src/utils/object":53}],12:[function(require,module,exports){
exports.__esModule = true;
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

var _srcIntersectionObserverPolyfill = require('../../../src/intersection-observer-polyfill');

var _visibilityModel = require('./visibility-model');

var _srcLog = require('../../../src/log');

var _srcMode = require('../../../src/mode');

var _srcUtilsObject = require('../../../src/utils/object');

var _srcServices = require('../../../src/services');

var VISIBILITY_ID_PROP = '__AMP_VIS_ID';

/** @type {number} */
var visibilityIdCounter = 1;

/**
 * @param {!Element} element
 * @return {number}
 */
function getElementId(element) {
  var id = element[VISIBILITY_ID_PROP];
  if (!id) {
    id = ++visibilityIdCounter;
    element[VISIBILITY_ID_PROP] = id;
  }
  return id;
}

/**
 * A base class for `VisibilityManagerForDoc` and `VisibilityManagerForEmbed`.
 * The instance of this class corresponds 1:1 to `AnalyticsRoot`. It represents
 * a collection of all visibility triggers declared within the `AnalyticsRoot`.
 * @implements {../../../src/service.Disposable}
 * @abstract
 */

var VisibilityManager = (function () {
  /**
   * @param {?VisibilityManager} parent
   * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
   */

  function VisibilityManager(parent, ampdoc) {
    babelHelpers.classCallCheck(this, VisibilityManager);

    /** @const @protected */
    this.parent = parent;

    /** @const @protected */
    this.ampdoc = ampdoc;

    /** @const @private */
    this.resources_ = _srcServices.resourcesForDoc(ampdoc);

    /** @private {number} */
    this.rootVisibility_ = 0;

    /** @const @private {!Array<!VisibilityModel>}> */
    this.models_ = [];

    /** @private {?Array<!VisibilityManager>} */
    this.children_ = null;

    /** @const @private {!Array<!UnlistenDef>} */
    this.unsubscribe_ = [];

    if (this.parent) {
      this.parent.addChild_(this);
    }
  }

  /**
   * The implementation of `VisibilityManager` for an AMP document. Two
   * distinct modes are supported: the main AMP doc and a in-a-box doc.
   */

  /**
   * @param {!VisibilityManager} child
   * @private
   */

  VisibilityManager.prototype.addChild_ = function addChild_(child) {
    if (!this.children_) {
      this.children_ = [];
    }
    this.children_.push(child);
  };

  /**
   * @param {!VisibilityManager} child
   * @private
   */

  VisibilityManager.prototype.removeChild_ = function removeChild_(child) {
    if (this.children_) {
      var index = this.children_.indexOf(child);
      if (index != -1) {
        this.children_.splice(index, 1);
      }
    }
  };

  /** @override */

  VisibilityManager.prototype.dispose = function dispose() {
    // Give the chance for all events to complete.
    this.setRootVisibility(0);

    // Dispose all models.
    for (var i = this.models_.length - 1; i >= 0; i--) {
      this.models_[i].dispose();
    }

    // Unsubscribe everything else.
    this.unsubscribe_.forEach(function (unsubscribe) {
      unsubscribe();
    });
    this.unsubscribe_.length = 0;

    if (this.parent) {
      this.parent.removeChild_(this);
    }
    if (this.children_) {
      for (var i = 0; i < this.children_.length; i++) {
        this.children_[i].dispose();
      }
    }
  };

  /**
   * @param {!UnlistenDef} handler
   */

  VisibilityManager.prototype.unsubscribe = function unsubscribe(handler) {
    this.unsubscribe_.push(handler);
  };

  /**
   * The start time from which all visibility events and times are measured.
   * @return {number}
   * @abstract
   */

  VisibilityManager.prototype.getStartTime = function getStartTime() {};

  /**
   * Whether the visibility root is currently in the background.
   * @return {boolean}
   * @abstract
   */

  VisibilityManager.prototype.isBackgrounded = function isBackgrounded() {};

  /**
   * Whether the visibility root has been created in the background mode.
   * @return {boolean}
   * @abstract
   */

  VisibilityManager.prototype.isBackgroundedAtStart = function isBackgroundedAtStart() {};

  /**
   * @return {number}
   */

  VisibilityManager.prototype.getRootVisibility = function getRootVisibility() {
    if (!this.parent) {
      return this.rootVisibility_;
    }
    return this.parent.getRootVisibility() > 0 ? this.rootVisibility_ : 0;
  };

  /**
   * @param {number} visibility
   */

  VisibilityManager.prototype.setRootVisibility = function setRootVisibility(visibility) {
    this.rootVisibility_ = visibility;
    this.updateModels_();
    if (this.children_) {
      for (var i = 0; i < this.children_.length; i++) {
        this.children_[i].updateModels_();
      }
    }
  };

  /** @private */

  VisibilityManager.prototype.updateModels_ = function updateModels_() {
    for (var i = 0; i < this.models_.length; i++) {
      this.models_[i].update();
    }
  };

  /**
   * Listens to the visibility events on the root as the whole and the given
   * visibility spec. The visibility tracking can be deferred until
   * `readyPromise` is resolved, if specified.
   * @param {!Object<string, *>} spec
   * @param {?Promise} readyPromise
   * @param {?function():!Promise} createReportPromiseFunc
   * @param {function(!Object<string, *>)} callback
   * @return {!UnlistenDef}
   */

  VisibilityManager.prototype.listenRoot = function listenRoot(spec, readyPromise, createReportPromiseFunc, callback) {
    var model = new _visibilityModel.VisibilityModel(spec, this.getRootVisibility.bind(this));
    return this.listen_(model, spec, readyPromise, createReportPromiseFunc, callback);
  };

  /**
   * Listens to the visibility events for the specified element and the given
   * visibility spec. The visibility tracking can be deferred until
   * `readyPromise` is resolved, if specified.
   * @param {!Element} element
   * @param {!Object<string, *>} spec
   * @param {?Promise} readyPromise
   * @param {?function():!Promise} createReportPromiseFunc
   * @param {function(!Object<string, *>)} callback
   * @return {!UnlistenDef}
   */

  VisibilityManager.prototype.listenElement = function listenElement(element, spec, readyPromise, createReportPromiseFunc, callback) {
    var model = new _visibilityModel.VisibilityModel(spec, this.getElementVisibility.bind(this, element));
    return this.listen_(model, spec, readyPromise, createReportPromiseFunc, callback, element);
  };

  /**
   * @param {!VisibilityModel} model
   * @param {!Object<string, *>} spec
   * @param {?Promise} readyPromise
   * @param {?function():!Promise} createReportPromiseFunc
   * @param {function(!Object<string, *>)} callback
   * @param {!Element=} opt_element
   * @return {!UnlistenDef}
   * @private
   */

  VisibilityManager.prototype.listen_ = function listen_(model, spec, readyPromise, createReportPromiseFunc, callback, opt_element) {
    var _this = this;

    // Block visibility.
    if (readyPromise) {
      model.setReady(false);
      readyPromise.then(function () {
        model.setReady(true);
      });
    }

    if (createReportPromiseFunc) {
      model.setReportReady(createReportPromiseFunc);
    }

    // Process the event.
    model.onTriggerEvent(function () {
      var startTime = _this.getStartTime();
      var state = model.getState(startTime);
      model.dispose();

      // Additional doc-level state.
      state['backgrounded'] = _this.isBackgrounded() ? 1 : 0;
      state['backgroundedAtStart'] = _this.isBackgroundedAtStart() ? 1 : 0;
      state['totalTime'] = Date.now() - startTime;

      // Optionally, element-level state.
      var resource = opt_element ? _this.resources_.getResourceForElementOptional(opt_element) : null;
      if (resource) {
        var layoutBox = resource.getLayoutBox();
        Object.assign(state, {
          'elementX': layoutBox.left,
          'elementY': layoutBox.top,
          'elementWidth': layoutBox.width,
          'elementHeight': layoutBox.height
        });
      }

      callback(state);
    });

    this.models_.push(model);
    model.unsubscribe(function () {
      var index = _this.models_.indexOf(model);
      if (index != -1) {
        _this.models_.splice(index, 1);
      }
    });

    // Observe the element via InOb.
    if (opt_element) {
      // It's important that this happens after all the setup is done, b/c
      // intersection observer can fire immedidately. Per spec, this should
      // NOT happen. However, all of the existing InOb polyfills, as well as
      // some versions of native implementations, make this mistake.
      model.unsubscribe(this.observe(opt_element, function () {
        return model.update();
      }));
    }

    // Start update.
    model.update();
    return function () {
      model.dispose();
    };
  };

  /**
   * Observes the intersections of the specified element in the viewport.
   * @param {!Element} unusedElement
   * @param {function(number)} unusedListener
   * @return {!UnlistenDef}
   * @protected
   * @abstract
   */

  VisibilityManager.prototype.observe = function observe(unusedElement, unusedListener) {};

  /**
   * @param {!Element} unusedElement
   * @return {number}
   * @abstract
   */

  VisibilityManager.prototype.getElementVisibility = function getElementVisibility(unusedElement) {};

  return VisibilityManager;
})();

exports.VisibilityManager = VisibilityManager;

var VisibilityManagerForDoc = (function (_VisibilityManager) {
  babelHelpers.inherits(VisibilityManagerForDoc, _VisibilityManager);

  /**
   * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
   */

  function VisibilityManagerForDoc(ampdoc) {
    var _this2 = this;

    babelHelpers.classCallCheck(this, VisibilityManagerForDoc);

    _VisibilityManager.call(this, /* parent */null, ampdoc);

    /** @const @private */
    this.viewer_ = _srcServices.viewerForDoc(ampdoc);

    /** @const @private */
    this.viewport_ = _srcServices.viewportForDoc(ampdoc);

    /** @private {boolean} */
    this.backgrounded_ = !this.viewer_.isVisible();

    /** @const @private {boolean} */
    this.backgroundedAtStart_ = this.isBackgrounded();

    /**
     * @const
     * @private {!Object<number, {
     *   element: !Element,
     *   intersectionRatio: number,
     *   listeners: !Array<function(number)>
     * }>}
     */
    this.trackedElements_ = _srcUtilsObject.map();

    /** @private {?IntersectionObserver|?IntersectionObserverPolyfill} */
    this.intersectionObserver_ = null;

    if (_srcMode.getMode(this.ampdoc.win).runtime == 'inabox') {
      // In-a-box: visibility depends on the InOb.
      var root = this.ampdoc.getRootNode();
      var rootElement = _srcLog.dev().assertElement(root.documentElement || root.body || root);
      this.unsubscribe(this.observe(rootElement, this.setRootVisibility.bind(this)));
    } else {
      // Main document: visibility is based on the viewer.
      this.setRootVisibility(this.viewer_.isVisible() ? 1 : 0);
      this.unsubscribe(this.viewer_.onVisibilityChanged(function () {
        var isVisible = _this2.viewer_.isVisible();
        if (!isVisible) {
          _this2.backgrounded_ = true;
        }
        _this2.setRootVisibility(isVisible ? 1 : 0);
      }));
    }
  }

  /**
   * The implementation of `VisibilityManager` for a FIE embed. This visibility
   * root delegates most of tracking functions to its parent, the ampdoc root.
   */

  /** @override */

  VisibilityManagerForDoc.prototype.dispose = function dispose() {
    _VisibilityManager.prototype.dispose.call(this);
    if (this.intersectionObserver_) {
      this.intersectionObserver_.disconnect();
      this.intersectionObserver_ = null;
    }
  };

  /** @override */

  VisibilityManagerForDoc.prototype.getStartTime = function getStartTime() {
    return _srcLog.dev().assertNumber(this.viewer_.getFirstVisibleTime());
  };

  /** @override */

  VisibilityManagerForDoc.prototype.isBackgrounded = function isBackgrounded() {
    return this.backgrounded_;
  };

  /** @override */

  VisibilityManagerForDoc.prototype.isBackgroundedAtStart = function isBackgroundedAtStart() {
    return this.backgroundedAtStart_;
  };

  /** @override */

  VisibilityManagerForDoc.prototype.observe = function observe(element, listener) {
    var _this3 = this;

    this.polyfillAmpElementIfNeeded_(element);

    var id = getElementId(element);
    var trackedElement = this.trackedElements_[id];
    if (!trackedElement) {
      trackedElement = {
        element: element,
        intersectionRatio: 0,
        listeners: []
      };
      this.trackedElements_[id] = trackedElement;
    } else if (trackedElement.intersectionRatio > 0) {
      // This has already been tracked and the `intersectionRatio` is fresh.
      listener(trackedElement.intersectionRatio);
    }
    trackedElement.listeners.push(listener);
    this.getIntersectionObserver_().observe(element);
    return function () {
      var trackedElement = _this3.trackedElements_[id];
      if (trackedElement) {
        var index = trackedElement.listeners.indexOf(listener);
        if (index != -1) {
          trackedElement.listeners.splice(index, 1);
        }
        if (trackedElement.listeners.length == 0) {
          _this3.intersectionObserver_.unobserve(element);
          delete _this3.trackedElements_[id];
        }
      }
    };
  };

  /** @override */

  VisibilityManagerForDoc.prototype.getElementVisibility = function getElementVisibility(element) {
    if (this.getRootVisibility() == 0) {
      return 0;
    }
    var id = getElementId(element);
    var trackedElement = this.trackedElements_[id];
    return trackedElement && trackedElement.intersectionRatio || 0;
  };

  /**
   * @return {!IntersectionObserver|!IntersectionObserverPolyfill}
   * @private
   */

  VisibilityManagerForDoc.prototype.getIntersectionObserver_ = function getIntersectionObserver_() {
    if (!this.intersectionObserver_) {
      this.intersectionObserver_ = this.createIntersectionObserver_();
    }
    return this.intersectionObserver_;
  };

  /**
   * @return {!IntersectionObserver|!IntersectionObserverPolyfill}
   * @private
   */

  VisibilityManagerForDoc.prototype.createIntersectionObserver_ = function createIntersectionObserver_() {
    var _this4 = this;

    // Native.
    var win = this.ampdoc.win;
    if (_srcIntersectionObserverPolyfill.nativeIntersectionObserverSupported(win)) {
      return new win.IntersectionObserver(this.onIntersectionChanges_.bind(this), { threshold: _srcIntersectionObserverPolyfill.DEFAULT_THRESHOLD });
    }

    // Polyfill.
    var intersectionObserverPolyfill = new _srcIntersectionObserverPolyfill.IntersectionObserverPolyfill(this.onIntersectionChanges_.bind(this), { threshold: _srcIntersectionObserverPolyfill.DEFAULT_THRESHOLD });
    var ticker = function () {
      intersectionObserverPolyfill.tick(_this4.viewport_.getRect());
    };
    this.unsubscribe(this.viewport_.onScroll(ticker));
    this.unsubscribe(this.viewport_.onChanged(ticker));
    // Tick in the next event loop. That's how native InOb works.
    setTimeout(ticker);
    return intersectionObserverPolyfill;
  };

  /**
   * @param {!Element} element
   * @private
   */

  VisibilityManagerForDoc.prototype.polyfillAmpElementIfNeeded_ = function polyfillAmpElementIfNeeded_(element) {
    var _this5 = this;

    var win = this.ampdoc.win;
    if (_srcIntersectionObserverPolyfill.nativeIntersectionObserverSupported(win)) {
      return;
    }

    // InOb polyfill requires partial AmpElement implementation.
    if (typeof element.getLayoutBox == 'function') {
      return;
    }
    element.getLayoutBox = function () {
      return _this5.viewport_.getLayoutRect(element);
    };
    element.getOwner = function () {
      return null;
    };
  };

  /**
   * @param {!Array<!IntersectionObserverEntry>} entries
   * @private
   */

  VisibilityManagerForDoc.prototype.onIntersectionChanges_ = function onIntersectionChanges_(entries) {
    var _this6 = this;

    entries.forEach(function (change) {
      _this6.onIntersectionChange_(change.target, change.intersectionRatio);
    });
  };

  /**
   * @param {!Element} target
   * @param {number} intersectionRatio
   * @private
   */

  VisibilityManagerForDoc.prototype.onIntersectionChange_ = function onIntersectionChange_(target, intersectionRatio) {
    intersectionRatio = Math.min(Math.max(intersectionRatio, 0), 1);
    var id = getElementId(target);
    var trackedElement = this.trackedElements_[id];
    if (trackedElement) {
      trackedElement.intersectionRatio = intersectionRatio;
      for (var i = 0; i < trackedElement.listeners.length; i++) {
        trackedElement.listeners[i](intersectionRatio);
      }
    }
  };

  return VisibilityManagerForDoc;
})(VisibilityManager);

exports.VisibilityManagerForDoc = VisibilityManagerForDoc;

var VisibilityManagerForEmbed = (function (_VisibilityManager2) {
  babelHelpers.inherits(VisibilityManagerForEmbed, _VisibilityManager2);

  /**
   * @param {!VisibilityManager} parent
   * @param {!../../../src/friendly-iframe-embed.FriendlyIframeEmbed} embed
   */

  function VisibilityManagerForEmbed(parent, embed) {
    babelHelpers.classCallCheck(this, VisibilityManagerForEmbed);

    _VisibilityManager2.call(this, parent, parent.ampdoc);

    /** @const */
    this.embed = embed;

    /** @const @private {boolean} */
    this.backgroundedAtStart_ = this.parent.isBackgrounded();

    this.unsubscribe(this.parent.observe(_srcLog.dev().assertElement(embed.host), this.setRootVisibility.bind(this)));
  }

  /** @override */

  VisibilityManagerForEmbed.prototype.getStartTime = function getStartTime() {
    return this.embed.getStartTime();
  };

  /** @override */

  VisibilityManagerForEmbed.prototype.isBackgrounded = function isBackgrounded() {
    return this.parent.isBackgrounded();
  };

  /** @override */

  VisibilityManagerForEmbed.prototype.isBackgroundedAtStart = function isBackgroundedAtStart() {
    return this.backgroundedAtStart_;
  };

  /** @override */

  VisibilityManagerForEmbed.prototype.observe = function observe(element, listener) {
    return this.parent.observe(element, listener);
  };

  /** @override */

  VisibilityManagerForEmbed.prototype.getElementVisibility = function getElementVisibility(element) {
    if (this.getRootVisibility() == 0) {
      return 0;
    }
    return this.parent.getElementVisibility(element);
  };

  return VisibilityManagerForEmbed;
})(VisibilityManager);

exports.VisibilityManagerForEmbed = VisibilityManagerForEmbed;

},{"../../../src/intersection-observer-polyfill":30,"../../../src/log":33,"../../../src/mode":35,"../../../src/services":45,"../../../src/utils/object":53,"./visibility-model":13}],13:[function(require,module,exports){
exports.__esModule = true;
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

var _srcLog = require('../../../src/log');

/**
 * This class implements visibility calculations based on the
 * visibility ratio. It's used for documents, embeds and individual element.
 * @implements {../../../src/service.Disposable}
 */

var VisibilityModel = (function () {
  /**
   * @param {!Object<string, *>} spec
   * @param {function():number} calcVisibility
   */

  function VisibilityModel(spec, calcVisibility) {
    var _this = this;

    babelHelpers.classCallCheck(this, VisibilityModel);

    /** @const @private */
    this.calcVisibility_ = calcVisibility;

    /**
     * Spec parameters.
     * @private {{
     *   visiblePercentageMin: number,
     *   visiblePercentageMax: number,
     *   totalTimeMin: number,
     *   totalTimeMax: number,
     *   continuousTimeMin: number,
     *   continuousTimeMax: number,
     * }}
     */
    this.spec_ = {
      visiblePercentageMin: Number(spec['visiblePercentageMin']) / 100 || 0,
      visiblePercentageMax: Number(spec['visiblePercentageMax']) / 100 || 1,
      totalTimeMin: Number(spec['totalTimeMin']) || 0,
      totalTimeMax: Number(spec['totalTimeMax']) || Infinity,
      continuousTimeMin: Number(spec['continuousTimeMin']) || 0,
      continuousTimeMax: Number(spec['continuousTimeMax']) || Infinity
    };

    /** @private {?function()} */
    this.eventResolver_ = null;

    /** @const @private */
    this.eventPromise_ = new Promise(function (resolve) {
      _this.eventResolver_ = resolve;
    });

    /** @private {!Array<!UnlistenDef>} */
    this.unsubscribe_ = [];

    /** @const @private {time} */
    this.createdTime_ = Date.now();

    /** @private {boolean} */
    this.ready_ = true;

    /** @private {boolean} */
    this.reportReady_ = true;

    /** @private {?function():!Promise} */
    this.createReportReadyPromise_ = null;

    /** @private {?number} */
    this.scheduledRunId_ = null;

    /** @private {boolean} */
    this.matchesVisibility_ = false;

    /** @private {boolean} */
    this.everMatchedVisibility_ = false;

    /** @private {time} duration in milliseconds */
    this.continuousTime_ = 0;

    /** @private {time} duration in milliseconds */
    this.maxContinuousVisibleTime_ = 0;

    /** @private {time} duration in milliseconds */
    this.totalVisibleTime_ = 0;

    /** @private {time} milliseconds since epoch */
    this.firstSeenTime_ = 0;

    /** @private {time} milliseconds since epoch */
    this.lastSeenTime_ = 0;

    /** @private {time} milliseconds since epoch */
    this.firstVisibleTime_ = 0;

    /** @private {time} milliseconds since epoch */
    this.lastVisibleTime_ = 0;

    /** @private {time} percent value in a [0, 1] range */
    this.loadTimeVisibility_ = 0;

    /** @private {number} percent value in a [0, 1] range */
    this.minVisiblePercentage_ = 0;

    /** @private {number} percent value in a [0, 1] range */
    this.maxVisiblePercentage_ = 0;

    /** @private {time} milliseconds since epoch */
    this.lastVisibleUpdateTime_ = 0;
  }

  /**
   * Calculates the specified time based on the given `baseTime`.
   * @param {time} time
   * @param {time} baseTime
   * @return {time}
   */

  /** @override */

  VisibilityModel.prototype.dispose = function dispose() {
    if (this.scheduledRunId_) {
      clearTimeout(this.scheduledRunId_);
      this.scheduledRunId_ = null;
    }
    this.unsubscribe_.forEach(function (unsubscribe) {
      unsubscribe();
    });
    this.unsubscribe_.length = 0;
    this.eventResolver_ = null;
  };

  /**
   * Adds the unsubscribe handler that will be called when this visibility
   * model is destroyed.
   * @param {!UnlistenDef} handler
   */

  VisibilityModel.prototype.unsubscribe = function unsubscribe(handler) {
    this.unsubscribe_.push(handler);
  };

  /**
   * Adds the event handler that will be called when all visibility conditions
   * have been met.
   * @param {function()} handler
   */

  VisibilityModel.prototype.onTriggerEvent = function onTriggerEvent(handler) {
    this.eventPromise_.then(handler);
  };

  /**
   * Sets whether this object is ready. Ready means that visibility is
   * ready to be calculated, e.g. because an element has been
   * sufficiently rendered.
   * @param {boolean} ready
   */

  VisibilityModel.prototype.setReady = function setReady(ready) {
    this.ready_ = ready;
    this.update();
  };

  /**
   * Sets that the model needs to wait on extra report ready promise
   * after all visibility conditions have been met to call report handler
   * @param {!function():!Promise} callback
   */

  VisibilityModel.prototype.setReportReady = function setReportReady(callback) {
    this.reportReady_ = false;
    this.createReportReadyPromise_ = callback;
  };

  /**
   * @return {number}
   * @private
   */

  VisibilityModel.prototype.getVisibility_ = function getVisibility_() {
    return this.ready_ ? this.calcVisibility_() : 0;
  };

  /**
   * Runs the calculation cycle.
   */

  VisibilityModel.prototype.update = function update() {
    this.update_(this.getVisibility_());
  };

  /**
   * Returns the calculated state of visibility.
   * @param {time} startTime
   * @return {!Object<string, string|number>}
   */

  VisibilityModel.prototype.getState = function getState(startTime) {
    return {
      // Observed times, relative to the `startTime`.
      firstSeenTime: timeBase(this.firstSeenTime_, startTime),
      lastSeenTime: timeBase(this.lastSeenTime_, startTime),
      lastVisibleTime: timeBase(this.lastVisibleTime_, startTime),
      firstVisibleTime: timeBase(this.firstVisibleTime_, startTime),

      // Durations.
      maxContinuousVisibleTime: this.maxContinuousVisibleTime_,
      totalVisibleTime: this.totalVisibleTime_,

      // Visibility percents.
      loadTimeVisibility: this.loadTimeVisibility_ * 100 || 0,
      minVisiblePercentage: this.minVisiblePercentage_ * 100,
      maxVisiblePercentage: this.maxVisiblePercentage_ * 100
    };
  };

  /**
   * @param {number} visibility
   * @private
   */

  VisibilityModel.prototype.update_ = function update_(visibility) {
    var _this2 = this;

    if (!this.eventResolver_) {
      return;
    }
    // Update state and check if all conditions are satisfied
    var conditionsMet = this.updateCounters_(visibility);
    if (conditionsMet) {
      if (this.scheduledRunId_) {
        clearTimeout(this.scheduledRunId_);
        this.scheduledRunId_ = null;
      }
      if (this.reportReady_) {
        this.eventResolver_();
        this.eventResolver_ = null;
      } else if (this.createReportReadyPromise_) {
        // Report when report ready promise resolve
        var reportReadyPromise = this.createReportReadyPromise_();
        this.createReportReadyPromise_ = null;
        reportReadyPromise.then(function () {
          _this2.reportReady_ = true;
          // Need to update one more time in case time exceeds
          // maxContinuousVisibleTime.
          _this2.update();
        });
      }
    } else if (this.matchesVisibility_ && !this.scheduledRunId_) {
      // There is unmet duration condition, schedule a check
      var timeToWait = this.computeTimeToWait_();
      if (timeToWait > 0) {
        this.scheduledRunId_ = setTimeout(function () {
          _this2.scheduledRunId_ = null;
          _this2.update();
        }, timeToWait);
      }
    } else if (!this.matchesVisibility_ && this.scheduledRunId_) {
      clearTimeout(this.scheduledRunId_);
      this.scheduledRunId_ = null;
    }
  };

  /**
   * @param {number} visibility
   * @return {boolean} true
   * @private
   */

  VisibilityModel.prototype.updateCounters_ = function updateCounters_(visibility) {
    _srcLog.dev().assert(visibility >= 0 && visibility <= 1, 'invalid visibility value: %s', visibility);
    var now = Date.now();

    if (visibility > 0) {
      this.firstSeenTime_ = this.firstSeenTime_ || now;
      this.lastSeenTime_ = now;
      // Consider it as load time visibility if this happens within 300ms of
      // page load.
      if (!this.loadTimeVisibility_ && now - this.createdTime_ < 300) {
        this.loadTimeVisibility_ = visibility;
      }
    }

    var prevMatchesVisibility = this.matchesVisibility_;
    var timeSinceLastUpdate = this.lastVisibleUpdateTime_ ? now - this.lastVisibleUpdateTime_ : 0;
    this.matchesVisibility_ = visibility > this.spec_.visiblePercentageMin && visibility <= this.spec_.visiblePercentageMax;

    if (this.matchesVisibility_) {
      this.everMatchedVisibility_ = true;
      if (prevMatchesVisibility) {
        // Keep counting.
        this.totalVisibleTime_ += timeSinceLastUpdate;
        this.continuousTime_ += timeSinceLastUpdate;
        this.maxContinuousVisibleTime_ = Math.max(this.maxContinuousVisibleTime_, this.continuousTime_);
      } else {
        // The resource came into view: start counting.
        _srcLog.dev().assert(!this.lastVisibleUpdateTime_);
        this.firstVisibleTime_ = this.firstVisibleTime_ || now;
      }
      this.lastVisibleUpdateTime_ = now;
      this.minVisiblePercentage_ = this.minVisiblePercentage_ > 0 ? Math.min(this.minVisiblePercentage_, visibility) : visibility;
      this.maxVisiblePercentage_ = Math.max(this.maxVisiblePercentage_, visibility);
      this.lastVisibleTime_ = now;
    } else if (prevMatchesVisibility) {
      // The resource went out of view. Do final calculations and reset state.
      _srcLog.dev().assert(this.lastVisibleUpdateTime_ > 0);

      this.maxContinuousVisibleTime_ = Math.max(this.maxContinuousVisibleTime_, this.continuousTime_ + timeSinceLastUpdate);

      // Reset for next visibility event.
      this.lastVisibleUpdateTime_ = 0;
      this.totalVisibleTime_ += timeSinceLastUpdate;
      this.continuousTime_ = 0; // Clear only after max is calculated above.
      this.lastVisibleTime_ = now;
    }

    return this.everMatchedVisibility_ && this.totalVisibleTime_ >= this.spec_.totalTimeMin && this.totalVisibleTime_ <= this.spec_.totalTimeMax && this.maxContinuousVisibleTime_ >= this.spec_.continuousTimeMin && this.maxContinuousVisibleTime_ <= this.spec_.continuousTimeMax;
  };

  /**
   * Computes time, assuming the object is currently visible, that it'd take
   * it to match all timing requirements.
   * @return {time}
   * @private
   */

  VisibilityModel.prototype.computeTimeToWait_ = function computeTimeToWait_() {
    var waitForContinuousTime = Math.max(this.spec_.continuousTimeMin - this.continuousTime_, 0);
    var waitForTotalTime = Math.max(this.spec_.totalTimeMin - this.totalVisibleTime_, 0);
    var maxWaitTime = Math.max(waitForContinuousTime, waitForTotalTime);
    return Math.min(maxWaitTime, waitForContinuousTime || Infinity, waitForTotalTime || Infinity);
  };

  return VisibilityModel;
})();

exports.VisibilityModel = VisibilityModel;
function timeBase(time, baseTime) {
  return time >= baseTime ? time - baseTime : 0;
}

},{"../../../src/log":33}],14:[function(require,module,exports){
(function (global){
/*!

Copyright (C) 2014-2016 by Andrea Giammarchi - @WebReflection

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
// global window Object
// optional polyfill info
//    'auto' used by default, everything is feature detected
//    'force' use the polyfill even if not fully needed
function installCustomElements(window, polyfill) {'use strict';

  // DO NOT USE THIS FILE DIRECTLY, IT WON'T WORK
  // THIS IS A PROJECT BASED ON A BUILD SYSTEM
  // THIS FILE IS JUST WRAPPED UP RESULTING IN
  // build/document-register-element.node.js

  var
    document = window.document,
    Object = window.Object
  ;

  var htmlClass = (function (info) {
    // (C) Andrea Giammarchi - @WebReflection - MIT Style
    var
      catchClass = /^[A-Z]+[a-z]/,
      filterBy = function (re) {
        var arr = [], tag;
        for (tag in register) {
          if (re.test(tag)) arr.push(tag);
        }
        return arr;
      },
      add = function (Class, tag) {
        tag = tag.toLowerCase();
        if (!(tag in register)) {
          register[Class] = (register[Class] || []).concat(tag);
          register[tag] = (register[tag.toUpperCase()] = Class);
        }
      },
      register = (Object.create || Object)(null),
      htmlClass = {},
      i, section, tags, Class
    ;
    for (section in info) {
      for (Class in info[section]) {
        tags = info[section][Class];
        register[Class] = tags;
        for (i = 0; i < tags.length; i++) {
          register[tags[i].toLowerCase()] =
          register[tags[i].toUpperCase()] = Class;
        }
      }
    }
    htmlClass.get = function get(tagOrClass) {
      return typeof tagOrClass === 'string' ?
        (register[tagOrClass] || (catchClass.test(tagOrClass) ? [] : '')) :
        filterBy(tagOrClass);
    };
    htmlClass.set = function set(tag, Class) {
      return (catchClass.test(tag) ?
        add(tag, Class) :
        add(Class, tag)
      ), htmlClass;
    };
    return htmlClass;
  }({
    "collections": {
      "HTMLAllCollection": [
        "all"
      ],
      "HTMLCollection": [
        "forms"
      ],
      "HTMLFormControlsCollection": [
        "elements"
      ],
      "HTMLOptionsCollection": [
        "options"
      ]
    },
    "elements": {
      "Element": [
        "element"
      ],
      "HTMLAnchorElement": [
        "a"
      ],
      "HTMLAppletElement": [
        "applet"
      ],
      "HTMLAreaElement": [
        "area"
      ],
      "HTMLAttachmentElement": [
        "attachment"
      ],
      "HTMLAudioElement": [
        "audio"
      ],
      "HTMLBRElement": [
        "br"
      ],
      "HTMLBaseElement": [
        "base"
      ],
      "HTMLBodyElement": [
        "body"
      ],
      "HTMLButtonElement": [
        "button"
      ],
      "HTMLCanvasElement": [
        "canvas"
      ],
      "HTMLContentElement": [
        "content"
      ],
      "HTMLDListElement": [
        "dl"
      ],
      "HTMLDataElement": [
        "data"
      ],
      "HTMLDataListElement": [
        "datalist"
      ],
      "HTMLDetailsElement": [
        "details"
      ],
      "HTMLDialogElement": [
        "dialog"
      ],
      "HTMLDirectoryElement": [
        "dir"
      ],
      "HTMLDivElement": [
        "div"
      ],
      "HTMLDocument": [
        "document"
      ],
      "HTMLElement": [
        "element",
        "abbr",
        "address",
        "article",
        "aside",
        "b",
        "bdi",
        "bdo",
        "cite",
        "code",
        "command",
        "dd",
        "dfn",
        "dt",
        "em",
        "figcaption",
        "figure",
        "footer",
        "header",
        "i",
        "kbd",
        "mark",
        "nav",
        "noscript",
        "rp",
        "rt",
        "ruby",
        "s",
        "samp",
        "section",
        "small",
        "strong",
        "sub",
        "summary",
        "sup",
        "u",
        "var",
        "wbr"
      ],
      "HTMLEmbedElement": [
        "embed"
      ],
      "HTMLFieldSetElement": [
        "fieldset"
      ],
      "HTMLFontElement": [
        "font"
      ],
      "HTMLFormElement": [
        "form"
      ],
      "HTMLFrameElement": [
        "frame"
      ],
      "HTMLFrameSetElement": [
        "frameset"
      ],
      "HTMLHRElement": [
        "hr"
      ],
      "HTMLHeadElement": [
        "head"
      ],
      "HTMLHeadingElement": [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6"
      ],
      "HTMLHtmlElement": [
        "html"
      ],
      "HTMLIFrameElement": [
        "iframe"
      ],
      "HTMLImageElement": [
        "img"
      ],
      "HTMLInputElement": [
        "input"
      ],
      "HTMLKeygenElement": [
        "keygen"
      ],
      "HTMLLIElement": [
        "li"
      ],
      "HTMLLabelElement": [
        "label"
      ],
      "HTMLLegendElement": [
        "legend"
      ],
      "HTMLLinkElement": [
        "link"
      ],
      "HTMLMapElement": [
        "map"
      ],
      "HTMLMarqueeElement": [
        "marquee"
      ],
      "HTMLMediaElement": [
        "media"
      ],
      "HTMLMenuElement": [
        "menu"
      ],
      "HTMLMenuItemElement": [
        "menuitem"
      ],
      "HTMLMetaElement": [
        "meta"
      ],
      "HTMLMeterElement": [
        "meter"
      ],
      "HTMLModElement": [
        "del",
        "ins"
      ],
      "HTMLOListElement": [
        "ol"
      ],
      "HTMLObjectElement": [
        "object"
      ],
      "HTMLOptGroupElement": [
        "optgroup"
      ],
      "HTMLOptionElement": [
        "option"
      ],
      "HTMLOutputElement": [
        "output"
      ],
      "HTMLParagraphElement": [
        "p"
      ],
      "HTMLParamElement": [
        "param"
      ],
      "HTMLPictureElement": [
        "picture"
      ],
      "HTMLPreElement": [
        "pre"
      ],
      "HTMLProgressElement": [
        "progress"
      ],
      "HTMLQuoteElement": [
        "blockquote",
        "q",
        "quote"
      ],
      "HTMLScriptElement": [
        "script"
      ],
      "HTMLSelectElement": [
        "select"
      ],
      "HTMLShadowElement": [
        "shadow"
      ],
      "HTMLSlotElement": [
        "slot"
      ],
      "HTMLSourceElement": [
        "source"
      ],
      "HTMLSpanElement": [
        "span"
      ],
      "HTMLStyleElement": [
        "style"
      ],
      "HTMLTableCaptionElement": [
        "caption"
      ],
      "HTMLTableCellElement": [
        "td",
        "th"
      ],
      "HTMLTableColElement": [
        "col",
        "colgroup"
      ],
      "HTMLTableElement": [
        "table"
      ],
      "HTMLTableRowElement": [
        "tr"
      ],
      "HTMLTableSectionElement": [
        "thead",
        "tbody",
        "tfoot"
      ],
      "HTMLTemplateElement": [
        "template"
      ],
      "HTMLTextAreaElement": [
        "textarea"
      ],
      "HTMLTimeElement": [
        "time"
      ],
      "HTMLTitleElement": [
        "title"
      ],
      "HTMLTrackElement": [
        "track"
      ],
      "HTMLUListElement": [
        "ul"
      ],
      "HTMLUnknownElement": [
        "unknown",
        "vhgroupv",
        "vkeygen"
      ],
      "HTMLVideoElement": [
        "video"
      ]
    },
    "nodes": {
      "Attr": [
        "node"
      ],
      "Audio": [
        "audio"
      ],
      "CDATASection": [
        "node"
      ],
      "CharacterData": [
        "node"
      ],
      "Comment": [
        "#comment"
      ],
      "Document": [
        "#document"
      ],
      "DocumentFragment": [
        "#document-fragment"
      ],
      "DocumentType": [
        "node"
      ],
      "HTMLDocument": [
        "#document"
      ],
      "Image": [
        "img"
      ],
      "Option": [
        "option"
      ],
      "ProcessingInstruction": [
        "node"
      ],
      "ShadowRoot": [
        "#shadow-root"
      ],
      "Text": [
        "#text"
      ],
      "XMLDocument": [
        "xml"
      ]
    }
  }));
  
  
    
  // passed at runtime, configurable
  // via nodejs module
  if (!polyfill) polyfill = 'auto';
  
  var
    // V0 polyfill entry
    REGISTER_ELEMENT = 'registerElement',
  
    // IE < 11 only + old WebKit for attributes + feature detection
    EXPANDO_UID = '__' + REGISTER_ELEMENT + (window.Math.random() * 10e4 >> 0),
  
    // shortcuts and costants
    ADD_EVENT_LISTENER = 'addEventListener',
    ATTACHED = 'attached',
    CALLBACK = 'Callback',
    DETACHED = 'detached',
    EXTENDS = 'extends',
  
    ATTRIBUTE_CHANGED_CALLBACK = 'attributeChanged' + CALLBACK,
    ATTACHED_CALLBACK = ATTACHED + CALLBACK,
    CONNECTED_CALLBACK = 'connected' + CALLBACK,
    DISCONNECTED_CALLBACK = 'disconnected' + CALLBACK,
    CREATED_CALLBACK = 'created' + CALLBACK,
    DETACHED_CALLBACK = DETACHED + CALLBACK,
  
    ADDITION = 'ADDITION',
    MODIFICATION = 'MODIFICATION',
    REMOVAL = 'REMOVAL',
  
    DOM_ATTR_MODIFIED = 'DOMAttrModified',
    DOM_CONTENT_LOADED = 'DOMContentLoaded',
    DOM_SUBTREE_MODIFIED = 'DOMSubtreeModified',
  
    PREFIX_TAG = '<',
    PREFIX_IS = '=',
  
    // valid and invalid node names
    validName = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/,
    invalidNames = [
      'ANNOTATION-XML',
      'COLOR-PROFILE',
      'FONT-FACE',
      'FONT-FACE-SRC',
      'FONT-FACE-URI',
      'FONT-FACE-FORMAT',
      'FONT-FACE-NAME',
      'MISSING-GLYPH'
    ],
  
    // registered types and their prototypes
    types = [],
    protos = [],
  
    // to query subnodes
    query = '',
  
    // html shortcut used to feature detect
    documentElement = document.documentElement,
  
    // ES5 inline helpers || basic patches
    indexOf = types.indexOf || function (v) {
      for(var i = this.length; i-- && this[i] !== v;){}
      return i;
    },
  
    // other helpers / shortcuts
    OP = Object.prototype,
    hOP = OP.hasOwnProperty,
    iPO = OP.isPrototypeOf,
  
    defineProperty = Object.defineProperty,
    empty = [],
    gOPD = Object.getOwnPropertyDescriptor,
    gOPN = Object.getOwnPropertyNames,
    gPO = Object.getPrototypeOf,
    sPO = Object.setPrototypeOf,
  
    // jshint proto: true
    hasProto = !!Object.__proto__,
  
    // V1 helpers
    fixGetClass = false,
    DRECEV1 = '__dreCEv1',
    customElements = window.customElements,
    usableCustomElements = polyfill !== 'force' && !!(
      customElements &&
      customElements.define &&
      customElements.get &&
      customElements.whenDefined
    ),
    Dict = Object.create || Object,
    Map = window.Map || function Map() {
      var K = [], V = [], i;
      return {
        get: function (k) {
          return V[indexOf.call(K, k)];
        },
        set: function (k, v) {
          i = indexOf.call(K, k);
          if (i < 0) V[K.push(k) - 1] = v;
          else V[i] = v;
        }
      };
    },
    Promise = window.Promise || function (fn) {
      var
        notify = [],
        done = false,
        p = {
          'catch': function () {
            return p;
          },
          'then': function (cb) {
            notify.push(cb);
            if (done) setTimeout(resolve, 1);
            return p;
          }
        }
      ;
      function resolve(value) {
        done = true;
        while (notify.length) notify.shift()(value);
      }
      fn(resolve);
      return p;
    },
    justCreated = false,
    constructors = Dict(null),
    waitingList = Dict(null),
    nodeNames = new Map(),
    secondArgument = function (is) {
      return is.toLowerCase();
    },
  
    // used to create unique instances
    create = Object.create || function Bridge(proto) {
      // silly broken polyfill probably ever used but short enough to work
      return proto ? ((Bridge.prototype = proto), new Bridge()) : this;
    },
  
    // will set the prototype if possible
    // or copy over all properties
    setPrototype = sPO || (
      hasProto ?
        function (o, p) {
          o.__proto__ = p;
          return o;
        } : (
      (gOPN && gOPD) ?
        (function(){
          function setProperties(o, p) {
            for (var
              key,
              names = gOPN(p),
              i = 0, length = names.length;
              i < length; i++
            ) {
              key = names[i];
              if (!hOP.call(o, key)) {
                defineProperty(o, key, gOPD(p, key));
              }
            }
          }
          return function (o, p) {
            do {
              setProperties(o, p);
            } while ((p = gPO(p)) && !iPO.call(p, o));
            return o;
          };
        }()) :
        function (o, p) {
          for (var key in p) {
            o[key] = p[key];
          }
          return o;
        }
    )),
  
    // DOM shortcuts and helpers, if any
  
    MutationObserver = window.MutationObserver ||
                       window.WebKitMutationObserver,
  
    HTMLElementPrototype = (
      window.HTMLElement ||
      window.Element ||
      window.Node
    ).prototype,
  
    IE8 = !iPO.call(HTMLElementPrototype, documentElement),
  
    safeProperty = IE8 ? function (o, k, d) {
      o[k] = d.value;
      return o;
    } : defineProperty,
  
    isValidNode = IE8 ?
      function (node) {
        return node.nodeType === 1;
      } :
      function (node) {
        return iPO.call(HTMLElementPrototype, node);
      },
  
    targets = IE8 && [],
  
    attachShadow = HTMLElementPrototype.attachShadow,
    cloneNode = HTMLElementPrototype.cloneNode,
    dispatchEvent = HTMLElementPrototype.dispatchEvent,
    getAttribute = HTMLElementPrototype.getAttribute,
    hasAttribute = HTMLElementPrototype.hasAttribute,
    removeAttribute = HTMLElementPrototype.removeAttribute,
    setAttribute = HTMLElementPrototype.setAttribute,
  
    // replaced later on
    createElement = document.createElement,
    patchedCreateElement = createElement,
  
    // shared observer for all attributes
    attributesObserver = MutationObserver && {
      attributes: true,
      characterData: true,
      attributeOldValue: true
    },
  
    // useful to detect only if there's no MutationObserver
    DOMAttrModified = MutationObserver || function(e) {
      doesNotSupportDOMAttrModified = false;
      documentElement.removeEventListener(
        DOM_ATTR_MODIFIED,
        DOMAttrModified
      );
    },
  
    // will both be used to make DOMNodeInserted asynchronous
    asapQueue,
    asapTimer = 0,
  
    // internal flags
    V0 = REGISTER_ELEMENT in document,
    setListener = true,
    justSetup = false,
    doesNotSupportDOMAttrModified = true,
    dropDomContentLoaded = true,
  
    // needed for the innerHTML helper
    notFromInnerHTMLHelper = true,
  
    // optionally defined later on
    onSubtreeModified,
    callDOMAttrModified,
    getAttributesMirror,
    observer,
    observe,
  
    // based on setting prototype capability
    // will check proto or the expando attribute
    // in order to setup the node once
    patchIfNotAlready,
    patch
  ;
  
  // only if needed
  if (!V0) {
  
    if (sPO || hasProto) {
        patchIfNotAlready = function (node, proto) {
          if (!iPO.call(proto, node)) {
            setupNode(node, proto);
          }
        };
        patch = setupNode;
    } else {
        patchIfNotAlready = function (node, proto) {
          if (!node[EXPANDO_UID]) {
            node[EXPANDO_UID] = Object(true);
            setupNode(node, proto);
          }
        };
        patch = patchIfNotAlready;
    }
  
    if (IE8) {
      doesNotSupportDOMAttrModified = false;
      (function (){
        var
          descriptor = gOPD(HTMLElementPrototype, ADD_EVENT_LISTENER),
          addEventListener = descriptor.value,
          patchedRemoveAttribute = function (name) {
            var e = new CustomEvent(DOM_ATTR_MODIFIED, {bubbles: true});
            e.attrName = name;
            e.prevValue = getAttribute.call(this, name);
            e.newValue = null;
            e[REMOVAL] = e.attrChange = 2;
            removeAttribute.call(this, name);
            dispatchEvent.call(this, e);
          },
          patchedSetAttribute = function (name, value) {
            var
              had = hasAttribute.call(this, name),
              old = had && getAttribute.call(this, name),
              e = new CustomEvent(DOM_ATTR_MODIFIED, {bubbles: true})
            ;
            setAttribute.call(this, name, value);
            e.attrName = name;
            e.prevValue = had ? old : null;
            e.newValue = value;
            if (had) {
              e[MODIFICATION] = e.attrChange = 1;
            } else {
              e[ADDITION] = e.attrChange = 0;
            }
            dispatchEvent.call(this, e);
          },
          onPropertyChange = function (e) {
            // jshint eqnull:true
            var
              node = e.currentTarget,
              superSecret = node[EXPANDO_UID],
              propertyName = e.propertyName,
              event
            ;
            if (superSecret.hasOwnProperty(propertyName)) {
              superSecret = superSecret[propertyName];
              event = new CustomEvent(DOM_ATTR_MODIFIED, {bubbles: true});
              event.attrName = superSecret.name;
              event.prevValue = superSecret.value || null;
              event.newValue = (superSecret.value = node[propertyName] || null);
              if (event.prevValue == null) {
                event[ADDITION] = event.attrChange = 0;
              } else {
                event[MODIFICATION] = event.attrChange = 1;
              }
              dispatchEvent.call(node, event);
            }
          }
        ;
        descriptor.value = function (type, handler, capture) {
          if (
            type === DOM_ATTR_MODIFIED &&
            this[ATTRIBUTE_CHANGED_CALLBACK] &&
            this.setAttribute !== patchedSetAttribute
          ) {
            this[EXPANDO_UID] = {
              className: {
                name: 'class',
                value: this.className
              }
            };
            this.setAttribute = patchedSetAttribute;
            this.removeAttribute = patchedRemoveAttribute;
            addEventListener.call(this, 'propertychange', onPropertyChange);
          }
          addEventListener.call(this, type, handler, capture);
        };
        defineProperty(HTMLElementPrototype, ADD_EVENT_LISTENER, descriptor);
      }());
    } else if (!MutationObserver) {
      documentElement[ADD_EVENT_LISTENER](DOM_ATTR_MODIFIED, DOMAttrModified);
      documentElement.setAttribute(EXPANDO_UID, 1);
      documentElement.removeAttribute(EXPANDO_UID);
      if (doesNotSupportDOMAttrModified) {
        onSubtreeModified = function (e) {
          var
            node = this,
            oldAttributes,
            newAttributes,
            key
          ;
          if (node === e.target) {
            oldAttributes = node[EXPANDO_UID];
            node[EXPANDO_UID] = (newAttributes = getAttributesMirror(node));
            for (key in newAttributes) {
              if (!(key in oldAttributes)) {
                // attribute was added
                return callDOMAttrModified(
                  0,
                  node,
                  key,
                  oldAttributes[key],
                  newAttributes[key],
                  ADDITION
                );
              } else if (newAttributes[key] !== oldAttributes[key]) {
                // attribute was changed
                return callDOMAttrModified(
                  1,
                  node,
                  key,
                  oldAttributes[key],
                  newAttributes[key],
                  MODIFICATION
                );
              }
            }
            // checking if it has been removed
            for (key in oldAttributes) {
              if (!(key in newAttributes)) {
                // attribute removed
                return callDOMAttrModified(
                  2,
                  node,
                  key,
                  oldAttributes[key],
                  newAttributes[key],
                  REMOVAL
                );
              }
            }
          }
        };
        callDOMAttrModified = function (
          attrChange,
          currentTarget,
          attrName,
          prevValue,
          newValue,
          action
        ) {
          var e = {
            attrChange: attrChange,
            currentTarget: currentTarget,
            attrName: attrName,
            prevValue: prevValue,
            newValue: newValue
          };
          e[action] = attrChange;
          onDOMAttrModified(e);
        };
        getAttributesMirror = function (node) {
          for (var
            attr, name,
            result = {},
            attributes = node.attributes,
            i = 0, length = attributes.length;
            i < length; i++
          ) {
            attr = attributes[i];
            name = attr.name;
            if (name !== 'setAttribute') {
              result[name] = attr.value;
            }
          }
          return result;
        };
      }
    }
  
    // set as enumerable, writable and configurable
    document[REGISTER_ELEMENT] = function registerElement(type, options) {
      upperType = type.toUpperCase();
      if (setListener) {
        // only first time document.registerElement is used
        // we need to set this listener
        // setting it by default might slow down for no reason
        setListener = false;
        if (MutationObserver) {
          observer = (function(attached, detached){
            function checkEmAll(list, callback) {
              for (var i = 0, length = list.length; i < length; callback(list[i++])){}
            }
            return new MutationObserver(function (records) {
              for (var
                current, node, newValue,
                i = 0, length = records.length; i < length; i++
              ) {
                current = records[i];
                if (current.type === 'childList') {
                  checkEmAll(current.addedNodes, attached);
                  checkEmAll(current.removedNodes, detached);
                } else {
                  node = current.target;
                  if (notFromInnerHTMLHelper &&
                      node[ATTRIBUTE_CHANGED_CALLBACK] &&
                      current.attributeName !== 'style') {
                    newValue = getAttribute.call(node, current.attributeName);
                    if (newValue !== current.oldValue) {
                      node[ATTRIBUTE_CHANGED_CALLBACK](
                        current.attributeName,
                        current.oldValue,
                        newValue
                      );
                    }
                  }
                }
              }
            });
          }(executeAction(ATTACHED), executeAction(DETACHED)));
          observe = function (node) {
            observer.observe(
              node,
              {
                childList: true,
                subtree: true
              }
            );
            return node;
          };
          observe(document);
          if (attachShadow) {
            HTMLElementPrototype.attachShadow = function () {
              return observe(attachShadow.apply(this, arguments));
            };
          }
        } else {
          asapQueue = [];
          document[ADD_EVENT_LISTENER]('DOMNodeInserted', onDOMNode(ATTACHED));
          document[ADD_EVENT_LISTENER]('DOMNodeRemoved', onDOMNode(DETACHED));
        }
  
        document[ADD_EVENT_LISTENER](DOM_CONTENT_LOADED, onReadyStateChange);
        document[ADD_EVENT_LISTENER]('readystatechange', onReadyStateChange);
  
        HTMLElementPrototype.cloneNode = function (deep) {
          var
            node = cloneNode.call(this, !!deep),
            i = getTypeIndex(node)
          ;
          if (-1 < i) patch(node, protos[i]);
          if (deep && query.length) loopAndSetup(node.querySelectorAll(query));
          return node;
        };
      }
  
      if (justSetup) return (justSetup = false);
  
      if (-2 < (
        indexOf.call(types, PREFIX_IS + upperType) +
        indexOf.call(types, PREFIX_TAG + upperType)
      )) {
        throwTypeError(type);
      }
  
      if (!validName.test(upperType) || -1 < indexOf.call(invalidNames, upperType)) {
        throw new Error('The type ' + type + ' is invalid');
      }
  
      var
        constructor = function () {
          return extending ?
            document.createElement(nodeName, upperType) :
            document.createElement(nodeName);
        },
        opt = options || OP,
        extending = hOP.call(opt, EXTENDS),
        nodeName = extending ? options[EXTENDS].toUpperCase() : upperType,
        upperType,
        i
      ;
  
      if (extending && -1 < (
        indexOf.call(types, PREFIX_TAG + nodeName)
      )) {
        throwTypeError(nodeName);
      }
  
      i = types.push((extending ? PREFIX_IS : PREFIX_TAG) + upperType) - 1;
  
      query = query.concat(
        query.length ? ',' : '',
        extending ? nodeName + '[is="' + type.toLowerCase() + '"]' : nodeName
      );
  
      constructor.prototype = (
        protos[i] = hOP.call(opt, 'prototype') ?
          opt.prototype :
          create(HTMLElementPrototype)
      );
  
      if (query.length) loopAndVerify(
        document.querySelectorAll(query),
        ATTACHED
      );
  
      return constructor;
    };
  
    document.createElement = (patchedCreateElement = function (localName, typeExtension) {
      var
        is = getIs(typeExtension),
        node = is ?
          createElement.call(document, localName, secondArgument(is)) :
          createElement.call(document, localName),
        name = '' + localName,
        i = indexOf.call(
          types,
          (is ? PREFIX_IS : PREFIX_TAG) +
          (is || name).toUpperCase()
        ),
        setup = -1 < i
      ;
      if (is) {
        node.setAttribute('is', is = is.toLowerCase());
        if (setup) {
          setup = isInQSA(name.toUpperCase(), is);
        }
      }
      notFromInnerHTMLHelper = !document.createElement.innerHTMLHelper;
      if (setup) patch(node, protos[i]);
      return node;
    });
  
  }
  
  function ASAP() {
    var queue = asapQueue.splice(0, asapQueue.length);
    asapTimer = 0;
    while (queue.length) {
      queue.shift().call(
        null, queue.shift()
      );
    }
  }
  
  function loopAndVerify(list, action) {
    for (var i = 0, length = list.length; i < length; i++) {
      verifyAndSetupAndAction(list[i], action);
    }
  }
  
  function loopAndSetup(list) {
    for (var i = 0, length = list.length, node; i < length; i++) {
      node = list[i];
      patch(node, protos[getTypeIndex(node)]);
    }
  }
  
  function executeAction(action) {
    return function (node) {
      if (isValidNode(node)) {
        verifyAndSetupAndAction(node, action);
        if (query.length) loopAndVerify(
          node.querySelectorAll(query),
          action
        );
      }
    };
  }
  
  function getTypeIndex(target) {
    var
      is = getAttribute.call(target, 'is'),
      nodeName = target.nodeName.toUpperCase(),
      i = indexOf.call(
        types,
        is ?
            PREFIX_IS + is.toUpperCase() :
            PREFIX_TAG + nodeName
      )
    ;
    return is && -1 < i && !isInQSA(nodeName, is) ? -1 : i;
  }
  
  function isInQSA(name, type) {
    return -1 < query.indexOf(name + '[is="' + type + '"]');
  }
  
  function onDOMAttrModified(e) {
    var
      node = e.currentTarget,
      attrChange = e.attrChange,
      attrName = e.attrName,
      target = e.target,
      addition = e[ADDITION] || 2,
      removal = e[REMOVAL] || 3
    ;
    if (notFromInnerHTMLHelper &&
        (!target || target === node) &&
        node[ATTRIBUTE_CHANGED_CALLBACK] &&
        attrName !== 'style' && (
          e.prevValue !== e.newValue ||
          // IE9, IE10, and Opera 12 gotcha
          e.newValue === '' && (
            attrChange === addition ||
            attrChange === removal
          )
    )) {
      node[ATTRIBUTE_CHANGED_CALLBACK](
        attrName,
        attrChange === addition ? null : e.prevValue,
        attrChange === removal ? null : e.newValue
      );
    }
  }
  
  function onDOMNode(action) {
    var executor = executeAction(action);
    return function (e) {
      asapQueue.push(executor, e.target);
      if (asapTimer) clearTimeout(asapTimer);
      asapTimer = setTimeout(ASAP, 1);
    };
  }
  
  function onReadyStateChange(e) {
    if (dropDomContentLoaded) {
      dropDomContentLoaded = false;
      e.currentTarget.removeEventListener(DOM_CONTENT_LOADED, onReadyStateChange);
    }
    if (query.length) loopAndVerify(
      (e.target || document).querySelectorAll(query),
      e.detail === DETACHED ? DETACHED : ATTACHED
    );
    if (IE8) purge();
  }
  
  function patchedSetAttribute(name, value) {
    // jshint validthis:true
    var self = this;
    setAttribute.call(self, name, value);
    onSubtreeModified.call(self, {target: self});
  }
  
  function setupNode(node, proto) {
    setPrototype(node, proto);
    if (observer) {
      observer.observe(node, attributesObserver);
    } else {
      if (doesNotSupportDOMAttrModified) {
        node.setAttribute = patchedSetAttribute;
        node[EXPANDO_UID] = getAttributesMirror(node);
        node[ADD_EVENT_LISTENER](DOM_SUBTREE_MODIFIED, onSubtreeModified);
      }
      node[ADD_EVENT_LISTENER](DOM_ATTR_MODIFIED, onDOMAttrModified);
    }
    if (node[CREATED_CALLBACK] && notFromInnerHTMLHelper) {
      node.created = true;
      node[CREATED_CALLBACK]();
      node.created = false;
    }
  }
  
  function purge() {
    for (var
      node,
      i = 0,
      length = targets.length;
      i < length; i++
    ) {
      node = targets[i];
      if (!documentElement.contains(node)) {
        length--;
        targets.splice(i--, 1);
        verifyAndSetupAndAction(node, DETACHED);
      }
    }
  }
  
  function throwTypeError(type) {
    throw new Error('A ' + type + ' type is already registered');
  }
  
  function verifyAndSetupAndAction(node, action) {
    var
      fn,
      i = getTypeIndex(node)
    ;
    if (-1 < i) {
      patchIfNotAlready(node, protos[i]);
      i = 0;
      if (action === ATTACHED && !node[ATTACHED]) {
        node[DETACHED] = false;
        node[ATTACHED] = true;
        i = 1;
        if (IE8 && indexOf.call(targets, node) < 0) {
          targets.push(node);
        }
      } else if (action === DETACHED && !node[DETACHED]) {
        node[ATTACHED] = false;
        node[DETACHED] = true;
        i = 1;
      }
      if (i && (fn = node[action + CALLBACK])) fn.call(node);
    }
  }
  
  
  
  // V1 in da House!
  function CustomElementRegistry() {}
  
  CustomElementRegistry.prototype = {
    constructor: CustomElementRegistry,
    // a workaround for the stubborn WebKit
    define: usableCustomElements ?
      function (name, Class, options) {
        if (options) {
          CERDefine(name, Class, options);
        } else {
          var NAME = name.toUpperCase();
          constructors[NAME] = {
            constructor: Class,
            create: [NAME]
          };
          nodeNames.set(Class, NAME);
          customElements.define(name, Class);
        }
      } :
      CERDefine,
    get: usableCustomElements ?
      function (name) {
        return customElements.get(name) || get(name);
      } :
      get,
    whenDefined: usableCustomElements ?
      function (name) {
        return Promise.race([
          customElements.whenDefined(name),
          whenDefined(name)
        ]);
      } :
      whenDefined
  };
  
  function CERDefine(name, Class, options) {
    var
      is = options && options[EXTENDS] || '',
      CProto = Class.prototype,
      proto = create(CProto),
      attributes = Class.observedAttributes || empty,
      definition = {prototype: proto}
    ;
    // TODO: is this needed at all since it's inherited?
    // defineProperty(proto, 'constructor', {value: Class});
    safeProperty(proto, CREATED_CALLBACK, {
        value: function () {
          if (justCreated) justCreated = false;
          else if (!this[DRECEV1]) {
            this[DRECEV1] = true;
            new Class(this);
            if (CProto[CREATED_CALLBACK])
              CProto[CREATED_CALLBACK].call(this);
            var info = constructors[nodeNames.get(Class)];
            if (!usableCustomElements || info.create.length > 1) {
              notifyAttributes(this);
            }
          }
      }
    });
    safeProperty(proto, ATTRIBUTE_CHANGED_CALLBACK, {
      value: function (name) {
        if (-1 < indexOf.call(attributes, name))
          CProto[ATTRIBUTE_CHANGED_CALLBACK].apply(this, arguments);
      }
    });
    if (CProto[CONNECTED_CALLBACK]) {
      safeProperty(proto, ATTACHED_CALLBACK, {
        value: CProto[CONNECTED_CALLBACK]
      });
    }
    if (CProto[DISCONNECTED_CALLBACK]) {
      safeProperty(proto, DETACHED_CALLBACK, {
        value: CProto[DISCONNECTED_CALLBACK]
      });
    }
    if (is) definition[EXTENDS] = is;
    name = name.toUpperCase();
    constructors[name] = {
      constructor: Class,
      create: is ? [is, secondArgument(name)] : [name]
    };
    nodeNames.set(Class, name);
    document[REGISTER_ELEMENT](name.toLowerCase(), definition);
    whenDefined(name);
    waitingList[name].r();
  }
  
  function get(name) {
    var info = constructors[name.toUpperCase()];
    return info && info.constructor;
  }
  
  function getIs(options) {
    return typeof options === 'string' ?
        options : (options && options.is || '');
  }
  
  function notifyAttributes(self) {
    var
      callback = self[ATTRIBUTE_CHANGED_CALLBACK],
      attributes = callback ? self.attributes : empty,
      i = attributes.length,
      attribute
    ;
    while (i--) {
      attribute =  attributes[i]; // || attributes.item(i);
      callback.call(
        self,
        attribute.name || attribute.nodeName,
        null,
        attribute.value || attribute.nodeValue
      );
    }
  }
  
  function whenDefined(name) {
    name = name.toUpperCase();
    if (!(name in waitingList)) {
      waitingList[name] = {};
      waitingList[name].p = new Promise(function (resolve) {
        waitingList[name].r = resolve;
      });
    }
    return waitingList[name].p;
  }
  
  function polyfillV1() {
    if (customElements) delete window.customElements;
    defineProperty(window, 'customElements', {
      configurable: true,
      value: new CustomElementRegistry()
    });
    defineProperty(window, 'CustomElementRegistry', {
      configurable: true,
      value: CustomElementRegistry
    });
    for (var
      patchClass = function (name) {
        var Class = window[name];
        if (Class) {
          window[name] = function CustomElementsV1(self) {
            var info, isNative;
            if (!self) self = this;
            if (!self[DRECEV1]) {
              justCreated = true;
              info = constructors[nodeNames.get(self.constructor)];
              isNative = usableCustomElements && info.create.length === 1;
              self = isNative ?
                Reflect.construct(Class, empty, info.constructor) :
                document.createElement.apply(document, info.create);
              self[DRECEV1] = true;
              justCreated = false;
              if (!isNative) notifyAttributes(self);
            }
            return self;
          };
          window[name].prototype = Class.prototype;
          try {
            Class.prototype.constructor = window[name];
          } catch(WebKit) {
            fixGetClass = true;
            defineProperty(Class, DRECEV1, {value: window[name]});
          }
        }
      },
      Classes = htmlClass.get(/^HTML[A-Z]*[a-z]/),
      i = Classes.length;
      i--;
      patchClass(Classes[i])
    ) {}
    (document.createElement = function (name, options) {
      var is = getIs(options);
      return is ?
        patchedCreateElement.call(this, name, secondArgument(is)) :
        patchedCreateElement.call(this, name);
    });
    if (!V0) {
      justSetup = true;
      document[REGISTER_ELEMENT]('');
    }
  }
  
  // if customElements is not there at all
  if (!customElements || polyfill === 'force') polyfillV1();
  else {
    // if available test extends work as expected
    try {
      (function (DRE, options, name) {
        options[EXTENDS] = 'a';
        DRE.prototype = create(HTMLAnchorElement.prototype);
        DRE.prototype.constructor = DRE;
        window.customElements.define(name, DRE, options);
        if (
          getAttribute.call(document.createElement('a', {is: name}), 'is') !== name ||
          (usableCustomElements && getAttribute.call(new DRE(), 'is') !== name)
        ) {
          throw options;
        }
      }(
        function DRE() {
          return Reflect.construct(HTMLAnchorElement, [], DRE);
        },
        {},
        'document-register-element-a'
      ));
    } catch(o_O) {
      // or force the polyfill if not
      // and keep internal original reference
      polyfillV1();
    }
  }
  
  try {
    createElement.call(document, 'a', 'a');
  } catch(FireFox) {
    secondArgument = function (is) {
      return {is: is.toLowerCase()};
    };
  }
  
}

module.exports = installCustomElements;
installCustomElements(global);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],15:[function(require,module,exports){
'use strict';

/**
 * Constructs a ES6/Promises A+ Promise instance.
 *
 * @constructor
 * @param {function(function(*=), function (*=))} resolver
 */
function Promise(resolver) {
  if (!(this instanceof Promise)) {
    throw new TypeError('Constructor Promise requires `new`');
  }
  if (!isFunction(resolver)) {
    throw new TypeError('Must pass resolver function');
  }

  /**
   * @param {function(this:Promise,*=,function(*=),function(*=),Deferred):!Promise} state
   * @private
   */
  this._state = PendingPromise;

  /**
   * @type {*}
   * @private
   */
  this._value = [];

  /**
   * @type {boolean}
   * @private
   */
  this._isChainEnd = true;

  doResolve(
    this,
    adopter(this, FulfilledPromise),
    adopter(this, RejectedPromise),
    { then: resolver }
  );
}

/****************************
  Public Instance Methods
 ****************************/

/**
 * Creates a new promise instance that will receive the result of this promise
 * as inputs to the onFulfilled or onRejected callbacks.
 *
 * @param {function(*)} onFulfilled
 * @param {function(*)} onRejected
 */
Promise.prototype.then = function(onFulfilled, onRejected) {
  onFulfilled = isFunction(onFulfilled) ? onFulfilled : void 0;
  onRejected = isFunction(onRejected) ? onRejected : void 0;

  if (onFulfilled || onRejected) {
    this._isChainEnd = false;
  }

  return this._state(
    this._value,
    onFulfilled,
    onRejected
  );
};

/**
 * Creates a new promise that will handle the rejected state of this promise.
 *
 * @param {function(*)} onRejected
 * @returns {!Promise}
 */
Promise.prototype.catch = function(onRejected) {
  return this.then(void 0, onRejected);
};

/****************************
  Public Static Methods
 ****************************/

/**
 * Creates a fulfilled Promise of value. If value is itself a then-able,
 * resolves with the then-able's value.
 *
 * @this {!Promise}
 * @param {*=} value
 * @returns {!Promise}
 */
Promise.resolve = function(value) {
  var Constructor = this;
  var promise;

  if (isObject(value) && value instanceof this) {
    promise = value;
  } else {
    promise = new Constructor(function(resolve) {
      resolve(value);
    });
  }

  return /** @type {!Promise} */(promise);
};

/**
 * Creates a rejected Promise of reason.
 *
 * @this {!Promise}
 * @param {*=} reason
 * @returns {!Promise}
 */
Promise.reject = function(reason) {
  var Constructor = this;
  var promise = new Constructor(function(_, reject) {
    reject(reason);
  });

  return /** @type {!Promise} */(promise);
};

/**
 * Creates a Promise that will resolve with an array of the values of the
 * passed in promises. If any promise rejects, the returned promise will
 * reject.
 *
 * @this {!Promise}
 * @param {!Array<Promise|*>} promises
 * @returns {!Promise}
 */
Promise.all = function(promises) {
  var Constructor = this;
  var promise = new Constructor(function(resolve, reject) {
    var length = promises.length;
    var values = new Array(length);

    if (length === 0) {
      return resolve(values);
    }

    each(promises, function(promise, index) {
      Constructor.resolve(promise).then(function(value) {
        values[index] = value;
        if (--length === 0) {
          resolve(values);
        }
      }, reject);
    });
  });

  return /** @type {!Promise} */(promise);
};

/**
 * Creates a Promise that will resolve or reject based on the first
 * resolved or rejected promise.
 *
 * @this {!Promise}
 * @param {!Array<Promise|*>} promises
 * @returns {!Promise}
 */
Promise.race = function(promises) {
  var Constructor = this;
  var promise = new Constructor(function(resolve, reject) {
    for (var i = 0, l = promises.length; i < l; i++) {
      Constructor.resolve(promises[i]).then(resolve, reject);
    }
  });

  return /** @type {!Promise} */(promise);
};

/**
 * An internal use static function.
 */
Promise._overrideUnhandledExceptionHandler = function(handler) {
  onPossiblyUnhandledRejection = handler;
};

/****************************
  Private functions
 ****************************/

/**
 * The Fulfilled Promise state. Calls onFulfilled with the resolved value of
 * this promise, creating a new promise.
 *
 * If there is no onFulfilled, returns the current promise to avoid an promise
 * instance.
 *
 * @this {!Promise} The current promise
 * @param {*=} value The current promise's resolved value.
 * @param {function(*=)=} onFulfilled
 * @param {function(*=)=} unused
 * @param {Deferred} deferred A deferred object that holds a promise and its
 *     resolve and reject functions. It IS NOT passed when called from
 *     Promise#then to save an object instance (since we may return the current
 *     promise). It IS passed in when adopting the Fulfilled state from the
 *     Pending state.
 * @returns {!Promise}
 */
function FulfilledPromise(value, onFulfilled, unused, deferred) {
  if (!onFulfilled) { return this; }
  if (!deferred) {
    deferred = new Deferred(this.constructor);
  }
  defer(tryCatchDeferred(deferred, onFulfilled, value));
  return deferred.promise;
}

/**
 * The Rejected Promise state. Calls onRejected with the resolved value of
 * this promise, creating a new promise.
 *
 * If there is no onRejected, returns the current promise to avoid an promise
 * instance.
 *
 * @this {!Promise} The current promise
 * @param {*=} reason The current promise's rejection reason.
 * @param {function(*=)=} unused
 * @param {function(*=)=} onRejected
 * @param {Deferred} deferred A deferred object that holds a promise and its
 *     resolve and reject functions. It IS NOT passed when called from
 *     Promise#then to save an object instance (since we may return the current
 *     promise). It IS passed in when adopting the Rejected state from the
 *     Pending state.
 * @returns {!Promise}
 */
function RejectedPromise(reason, unused, onRejected, deferred) {
  if (!onRejected) { return this; }
  if (!deferred) {
    deferred = new Deferred(this.constructor);
  }
  defer(tryCatchDeferred(deferred, onRejected, reason));
  return deferred.promise;
}

/**
 * The Pending Promise state. Eventually calls onFulfilled once the promise has
 * resolved, or onRejected once the promise rejects.
 *
 * If there is no onFulfilled and no onRejected, returns the current promise to
 * avoid an promise instance.
 *
 * @this {!Promise} The current promise
 * @param {*=} queue The current promise's pending promises queue.
 * @param {function(*=)=} onFulfilled
 * @param {function(*=)=} onRejected
 * @param {Deferred} deferred A deferred object that holds a promise and its
 *     resolve and reject functions. It IS NOT passed when called from
 *     Promise#then to save an object instance (since we may return the current
 *     promise). It IS passed in when adopting the Pending state from the
 *     Pending state of another promise.
 * @returns {!Promise}
 */
function PendingPromise(queue, onFulfilled, onRejected, deferred) {
  if (!onFulfilled && !onRejected) { return this; }
  if (!deferred) {
    deferred = new Deferred(this.constructor);
  }
  queue.push({
    deferred: deferred,
    onFulfilled: onFulfilled || deferred.resolve,
    onRejected: onRejected || deferred.reject
  });
  return deferred.promise;
}

/**
 * Constructs a deferred instance that holds a promise and its resolve and
 * reject functions.
 *
 * @constructor
 */
function Deferred(Promise) {
  var deferred = this;
  /** @type {!Promise} */
  this.promise = new Promise(function(resolve, reject) {
    /** @type {function(*=)} */
    deferred.resolve = resolve;

    /** @type {function(*=)} */
    deferred.reject = reject;
  });
  return deferred;
}

/**
 * Transitions the state of promise to another state. This is only ever called
 * on with a promise that is currently in the Pending state.
 *
 * @param {!Promise} promise
 * @param {function(this:Promise,*=,function(*=),function(*=),Deferred):!Promise} state
 * @param {*=} value
 */
function adopt(promise, state, value) {
  var queue = promise._value;
  promise._state = state;
  promise._value = value;

  for (var i = 0; i < queue.length; i++) {
    var next = queue[i];
    promise._state(
      value,
      next.onFulfilled,
      next.onRejected,
      next.deferred
    );
  }

  // Determine if this rejected promise will be "handled".
  if (state === RejectedPromise && promise._isChainEnd) {
    setTimeout(function() {
      if (promise._isChainEnd) {
        onPossiblyUnhandledRejection(value, promise);
      }
    }, 0);
  }
}
/**
 * A partial application of adopt.
 *
 * @param {!Promise} promise
 * @param {function(this:Promise,*=,function(*=),function(*=),Deferred):!Promise} state
 * @returns {function(*=)}
 */
function adopter(promise, state) {
  return function(value) {
    adopt(promise, state, value);
  };
}

/**
 * A no-op function to prevent double resolving.
 */
function noop() {}

/**
 * Tests if fn is a Function
 *
 * @param {*} fn
 * @returns {boolean}
 */
function isFunction(fn) {
  return typeof fn === 'function';
}

/**
 * Tests if fn is an Object
 *
 * @param {*} obj
 * @returns {boolean}
 */
function isObject(obj) {
  return obj === Object(obj);
}

var onPossiblyUnhandledRejection = function(reason, promise) {
  throw reason;
}

/**
 * Iterates over each element of an array, calling the iterator with the
 * element and its index.
 *
 * @param {!Array} collection
 * @param {function(*=,number)} iterator
 */
function each(collection, iterator) {
  for (var i = 0; i < collection.length; i++) {
    iterator(collection[i], i);
  }
}

/**
 * Creates a function that will attempt to resolve the deferred with the return
 * of fn. If any error is raised, rejects instead.
 *
 * @param {!Deferred} deferred
 * @param {function(*=)} fn
 * @param {*} arg
 * @returns {function()}
 */
function tryCatchDeferred(deferred, fn, arg) {
  var promise = deferred.promise;
  var resolve = deferred.resolve;
  var reject = deferred.reject;
  return function() {
    try {
      var result = fn(arg);
      if (resolve === fn || reject === fn) {
        return;
      }
      doResolve(promise, resolve, reject, result, result);
    } catch (e) {
      reject(e);
    }
  };
}

/**
 * Queues and executes multiple deferred functions on another run loop.
 */
var defer = (function() {
  /**
   * Defers fn to another run loop.
   */
  var scheduleFlush;
  if (typeof window !== 'undefined' && window.postMessage) {
    window.addEventListener('message', flush);
    scheduleFlush = function() {
      window.postMessage('macro-task', '*');
    };
  } else {
    scheduleFlush = function() {
      setTimeout(flush, 0);
    };
  }

  var queue = new Array(16);
  var length = 0;

  function flush() {
    for (var i = 0; i < length; i++) {
      var fn = queue[i];
      queue[i] = null;
      fn();
    }
    length = 0;
  }

  /**
   * @param {function()} fn
   */
  function defer(fn) {
    if (length === 0) { scheduleFlush(); }
    queue[length++] = fn;
  };

  return defer;
})();

/**
 * The Promise resolution procedure.
 * https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
 *
 * @param {!Promise} promise
 * @param {function(*=)} resolve
 * @param {function(*=)} reject
 * @param {*} value
 * @param {*=} context
 */
function doResolve(promise, resolve, reject, value, context) {
  var _reject = reject;
  var then;
  var _resolve;
  try {
    if (value === promise) {
      throw new TypeError('Cannot fulfill promise with itself');
    }
    var isObj = isObject(value);
    if (isObj && value instanceof promise.constructor) {
      adopt(promise, value._state, value._value);
    } else if (isObj && (then = value.then) && isFunction(then)) {
      _resolve = function(value) {
        _resolve = _reject = noop;
        doResolve(promise, resolve, reject, value, value);
      };
      _reject = function(reason) {
        _resolve = _reject = noop;
        reject(reason);
      };
      then.call(
        context,
        function(value) { _resolve(value); },
        function(reason) { _reject(reason); }
      );
    } else {
      resolve(value);
    }
  } catch (e) {
    _reject(e);
  }
}

module.exports = Promise;

},{}],16:[function(require,module,exports){
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

},{"./event-helper-listen":24,"./json":31,"./log":33,"./utils/object":53}],17:[function(require,module,exports){
exports.__esModule = true;
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
 * Commonly used signals across different elements and documents.
 * @enum {string}
 */
var CommonSignals = {

  /**
   * The element has been built.
   */
  BUILT: 'built',

  /**
   * The initial contents of an element/document/embed have been loaded.
   */
  INI_LOAD: 'ini-load',

  /**
   * The element has been loaded.
   */
  LOAD_END: 'load-end',

  /**
   * The element has started loading.
   */
  LOAD_START: 'load-start',

  /**
   * Rendering has been confirmed to have been started.
   */
  RENDER_START: 'render-start'
};
exports.CommonSignals = CommonSignals;

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
exports.__esModule = true;
exports.getCookie = getCookie;
exports.setCookie = setCookie;
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

var _url = require('./url');

var _string = require('./string');

var _config = require('./config');

/**
 * Returns the value of the cookie. The cookie access is restricted and must
 * go through the privacy review. Before using this method please file a
 * GitHub issue with "Privacy Review" label.
 *
 * Returns the cookie's value or `null`.
 *
 * @param {!Window} win
 * @param {string} name
 * @return {?string}
 */

function getCookie(win, name) {
  var cookieString = tryGetDocumentCookieNoInline(win);
  if (!cookieString) {
    return null;
  }
  var cookies = cookieString.split(';');
  for (var i = 0; i < cookies.length; i++) {
    var cookie = cookies[i].trim();
    var eq = cookie.indexOf('=');
    if (eq == -1) {
      continue;
    }
    if (decodeURIComponent(cookie.substring(0, eq).trim()) == name) {
      return decodeURIComponent(cookie.substring(eq + 1).trim());
    }
  }
  return null;
}

/**
 * This method should not be inlined to prevent TryCatch deoptimization.
 * NoInline keyword at the end of function name also prevents Closure compiler
 * from inlining the function.
 * @private
 */
function tryGetDocumentCookieNoInline(win) {
  try {
    return win.document.cookie;
  } catch (e) {
    // Act as if no cookie is available. Exceptions can be thrown when
    // AMP docs are opened on origins that do not allow setting
    // cookies such as null origins.
  }
}

/**
 * Sets the value of the cookie. The cookie access is restricted and must
 * go through the privacy review. Before using this method please file a
 * GitHub issue with "Privacy Review" label.
 *
 * @param {!Window} win
 * @param {string} name
 * @param {string} value
 * @param {time} expirationTime
 * @param {{
 *   highestAvailableDomain:(boolean|undefined),
 *   domain:(string|undefined)
 * }=} opt_options
 *     - highestAvailableDomain: If true, set the cookie at the widest domain
 *       scope allowed by the browser. E.g. on example.com if we are currently
 *       on www.example.com.
 *     - domain: Explicit domain to set.
 *     - allowOnProxyOrigin: Allow setting a cookie on the AMP Cache.
 */

function setCookie(win, name, value, expirationTime, opt_options) {
  checkOriginForSettingCookie(win, opt_options, name);
  if (opt_options && opt_options.highestAvailableDomain) {
    var parts = win.location.hostname.split('.');
    var _domain = parts[parts.length - 1];
    for (var i = parts.length - 2; i >= 0; i--) {
      _domain = parts[i] + '.' + _domain;
      trySetCookie(win, name, value, expirationTime, _domain);
      if (getCookie(win, name) == value) {
        return;
      }
    }
  }
  var domain = undefined;
  if (opt_options && opt_options.domain) {
    domain = opt_options.domain;
  }
  trySetCookie(win, name, value, expirationTime, domain);
}

/**
 * Attempt to set a cookie with the given params.
 *
 * @param {!Window} win
 * @param {string} name
 * @param {string} value
 * @param {time} expirationTime
 * @param {string|undefined} domain
 */
function trySetCookie(win, name, value, expirationTime, domain) {
  // We do not allow setting cookies on the domain that contains both
  // the cdn. and www. hosts.
  if (domain == 'ampproject.org') {
    // Actively delete them.
    value = 'delete';
    expirationTime = 0;
  }
  var cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) + '; path=/' + (domain ? '; domain=' + domain : '') + '; expires=' + new Date(expirationTime).toUTCString();
  try {
    win.document.cookie = cookie;
  } catch (ignore) {
    // Do not throw if setting the cookie failed Exceptions can be thrown
    // when AMP docs are opened on origins that do not allow setting
    // cookies such as null origins.
  };
}

/**
 * Throws if a given cookie should not be set on the given origin.
 * This is a defense-in-depth. Callers should never run into this.
 *
 * @param {!Window} win
 * @param {!Object|undefined} options
 * @param {string} name For the error message.
 */
function checkOriginForSettingCookie(win, options, name) {
  if (options && options.allowOnProxyOrigin) {
    return;
  }
  if (_url.isProxyOrigin(win.location.href)) {
    throw new Error('Should never attempt to set cookie on proxy origin: ' + name);
  }

  var current = _url.parseUrl(win.location.href).hostname.toLowerCase();
  var proxy = _url.parseUrl(_config.urls.cdn).hostname.toLowerCase();
  if (current == proxy || _string.endsWith(current, '.' + proxy)) {
    throw new Error('Should never attempt to set cookie on proxy origin.' + ' (in depth check): ' + name);
  }
}

},{"./config":18,"./string":46,"./url":50}],20:[function(require,module,exports){
exports.__esModule = true;
exports.cryptoFor = cryptoFor;
exports.stringHash32 = stringHash32;
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

var _service = require('./service');

/**
 * @param {!Window} window
 * @return {!./service/crypto-impl.Crypto}
 */

function cryptoFor(window) {
  return (/** @type {!./service/crypto-impl.Crypto} */_service.getService(window, 'crypto')
  );
}

/**
 * Hash function djb2a
 * This is intended to be a simple, fast hashing function using minimal code.
 * It does *not* have good cryptographic properties.
 * @param {string} str
 * @return {string} 32-bit unsigned hash of the string
 */

function stringHash32(str) {
  var length = str.length;
  var hash = 5381;
  for (var i = 0; i < length; i++) {
    hash = hash * 33 ^ str.charCodeAt(i);
  }
  // Convert from 32-bit signed to unsigned.
  return String(hash >>> 0);
}

;

},{"./service":44}],21:[function(require,module,exports){
exports.__esModule = true;
exports.isDocumentReady = isDocumentReady;
exports.onDocumentReady = onDocumentReady;
exports.whenDocumentReady = whenDocumentReady;
exports.whenDocumentComplete = whenDocumentComplete;
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
 * Whether the document is ready.
 * @param {!Document} doc
 * @return {boolean}
 */

function isDocumentReady(doc) {
  return doc.readyState != 'loading' && doc.readyState != 'uninitialized';
}

/**
 * Whether the document has loaded all the css and sub-resources.
 * @param {!Document} doc
 * @return {boolean}
 */
function isDocumentComplete(doc) {
  return doc.readyState == 'complete';
}

/**
 * Calls the callback when document is ready.
 * @param {!Document} doc
 * @param {function(!Document)} callback
 */

function onDocumentReady(doc, callback) {
  onDocumentState(doc, isDocumentReady, callback);
}

/**
 * Calls the callback when document's state satisfies the stateFn.
 * @param {!Document} doc
 * @param {function(!Document):boolean} stateFn
 * @param {function(!Document)} callback
 */
function onDocumentState(doc, stateFn, callback) {
  var ready = stateFn(doc);
  if (ready) {
    callback(doc);
  } else {
    (function () {
      var readyListener = function () {
        if (stateFn(doc)) {
          if (!ready) {
            ready = true;
            callback(doc);
          }
          doc.removeEventListener('readystatechange', readyListener);
        }
      };
      doc.addEventListener('readystatechange', readyListener);
    })();
  }
}

/**
 * Returns a promise that is resolved when document is ready.
 * @param {!Document} doc
 * @return {!Promise<!Document>}
 */

function whenDocumentReady(doc) {
  return new Promise(function (resolve) {
    onDocumentReady(doc, resolve);
  });
}

/**
 * Returns a promise that is resolved when document is complete.
 * @param {!Document} doc
 * @return {!Promise<!Document>}
 */

function whenDocumentComplete(doc) {
  return new Promise(function (resolve) {
    onDocumentState(doc, isDocumentComplete, resolve);
  });
}

},{}],22:[function(require,module,exports){
exports.__esModule = true;
exports.waitForChild = waitForChild;
exports.waitForChildPromise = waitForChildPromise;
exports.waitForBody = waitForBody;
exports.waitForBodyPromise = waitForBodyPromise;
exports.removeElement = removeElement;
exports.removeChildren = removeChildren;
exports.copyChildren = copyChildren;
exports.addAttributesToElement = addAttributesToElement;
exports.createElementWithAttributes = createElementWithAttributes;
exports.isConnectedNode = isConnectedNode;
exports.rootNodeFor = rootNodeFor;
exports.closest = closest;
exports.closestNode = closestNode;
exports.closestByTag = closestByTag;
exports.closestBySelector = closestBySelector;
exports.matches = matches;
exports.elementByTag = elementByTag;
exports.childElement = childElement;
exports.childElements = childElements;
exports.lastChildElement = lastChildElement;
exports.childNodes = childNodes;
exports.setScopeSelectorSupportedForTesting = setScopeSelectorSupportedForTesting;
exports.childElementByAttr = childElementByAttr;
exports.lastChildElementByAttr = lastChildElementByAttr;
exports.childElementsByAttr = childElementsByAttr;
exports.childElementByTag = childElementByTag;
exports.childElementsByTag = childElementsByTag;
exports.scopedQuerySelector = scopedQuerySelector;
exports.scopedQuerySelectorAll = scopedQuerySelectorAll;
exports.getDataParamsFromAttributes = getDataParamsFromAttributes;
exports.hasNextNodeInDocumentOrder = hasNextNodeInDocumentOrder;
exports.ancestorElements = ancestorElements;
exports.ancestorElementsByTag = ancestorElementsByTag;
exports.iterateCursor = iterateCursor;
exports.openWindowDialog = openWindowDialog;
exports.isJsonScriptTag = isJsonScriptTag;
exports.escapeCssSelectorIdent = escapeCssSelectorIdent;
exports.escapeHtml = escapeHtml;
exports.tryFocus = tryFocus;
exports.isIframed = isIframed;
exports.isAmpElement = isAmpElement;
exports.whenUpgradedToCustomElement = whenUpgradedToCustomElement;
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

var _log = require('./log');

var _third_partyCssEscapeCssEscape = require('../third_party/css-escape/css-escape');

var _string = require('./string');

var HTML_ESCAPE_CHARS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;'
};
var HTML_ESCAPE_REGEX = /(&|<|>|"|'|`)/g;

/** @const {string} */
var UPGRADE_TO_CUSTOMELEMENT_PROMISE = '__AMP_UPG_PRM';

exports.UPGRADE_TO_CUSTOMELEMENT_PROMISE = UPGRADE_TO_CUSTOMELEMENT_PROMISE;
/** @const {string} */
var UPGRADE_TO_CUSTOMELEMENT_RESOLVER = '__AMP_UPG_RES';

exports.UPGRADE_TO_CUSTOMELEMENT_RESOLVER = UPGRADE_TO_CUSTOMELEMENT_RESOLVER;
/**
 * Waits until the child element is constructed. Once the child is found, the
 * callback is executed.
 * @param {!Element} parent
 * @param {function(!Element):boolean} checkFunc
 * @param {function()} callback
 */

function waitForChild(parent, checkFunc, callback) {
  if (checkFunc(parent)) {
    callback();
    return;
  }
  /** @const {!Window} */
  var win = parent.ownerDocument.defaultView;
  if (win.MutationObserver) {
    (function () {
      /** @const {MutationObserver} */
      var observer = new win.MutationObserver(function () {
        if (checkFunc(parent)) {
          observer.disconnect();
          callback();
        }
      });
      observer.observe(parent, { childList: true });
    })();
  } else {
    (function () {
      /** @const {number} */
      var interval = win.setInterval(function () {
        if (checkFunc(parent)) {
          win.clearInterval(interval);
          callback();
        }
      }, /* milliseconds */5);
    })();
  }
}

/**
 * Waits until the child element is constructed. Once the child is found, the
 * promise is resolved.
 * @param {!Element} parent
 * @param {function(!Element):boolean} checkFunc
 * @return {!Promise}
 */

function waitForChildPromise(parent, checkFunc) {
  return new Promise(function (resolve) {
    waitForChild(parent, checkFunc, resolve);
  });
}

/**
 * Waits for document's body to be available.
 * Will be deprecated soon; use {@link AmpDoc#whenBodyAvailable} or
 * @{link DocumentState#onBodyAvailable} instead.
 * @param {!Document} doc
 * @param {function()} callback
 */

function waitForBody(doc, callback) {
  waitForChild(doc.documentElement, function () {
    return !!doc.body;
  }, callback);
}

/**
 * Waits for document's body to be available.
 * @param {!Document} doc
 * @return {!Promise}
 */

function waitForBodyPromise(doc) {
  return new Promise(function (resolve) {
    waitForBody(doc, resolve);
  });
}

/**
 * Removes the element.
 * @param {!Element} element
 */

function removeElement(element) {
  if (element.parentElement) {
    element.parentElement.removeChild(element);
  }
}

/**
 * Removes all child nodes of the specified element.
 * @param {!Element} parent
 */

function removeChildren(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

/**
 * Copies all children nodes of element "from" to element "to". Child nodes
 * are deeply cloned. Notice, that this method should be used with care and
 * preferably on smaller subtrees.
 * @param {!Element} from
 * @param {!Element} to
 */

function copyChildren(from, to) {
  var frag = to.ownerDocument.createDocumentFragment();
  for (var n = from.firstChild; n; n = n.nextSibling) {
    frag.appendChild(n.cloneNode(true));
  }
  to.appendChild(frag);
}

/**
 * Add attributes to an element.
 * @param {!Element} element
 * @param {!Object<string, string>} attributes
 * @return {!Element} created element
 */

function addAttributesToElement(element, attributes) {
  for (var attr in attributes) {
    element.setAttribute(attr, attributes[attr]);
  }
  return element;
}

/**
 * Create a new element on document with specified tagName and attributes.
 * @param {!Document} doc
 * @param {string} tagName
 * @param {!Object<string, string>} attributes
 * @return {!Element} created element
 */

function createElementWithAttributes(doc, tagName, attributes) {
  var element = doc.createElement(tagName);
  return addAttributesToElement(element, attributes);
}

/**
 * Returns true if node is connected (attached).
 * @param {!Node} node
 * @return {boolean}
 * @see https://dom.spec.whatwg.org/#connected
 */

function isConnectedNode(node) {
  // "An element is connected if its shadow-including root is a document."
  var n = node;
  do {
    n = rootNodeFor(n);
    if (n.host) {
      n = n.host;
    } else {
      break;
    }
  } while (true);
  return n.nodeType === Node.DOCUMENT_NODE;
}

/**
 * Returns the root for a given node. Does not cross shadow DOM boundary.
 * @param {!Node} node
 * @return {!Node}
 */

function rootNodeFor(node) {
  if (Node.prototype.getRootNode) {
    // Type checker says `getRootNode` may return null.
    return node.getRootNode() || node;
  }
  var n = undefined;
  for (n = node; !!n.parentNode; n = n.parentNode) {}
  return n;
}

/**
 * Finds the closest element that satisfies the callback from this element
 * up the DOM subtree.
 * @param {!Element} element
 * @param {function(!Element):boolean} callback
 * @param {Element=} opt_stopAt optional elemnt to stop the search at.
 * @return {?Element}
 */

function closest(element, callback, opt_stopAt) {
  for (var el = element; el && el !== opt_stopAt; el = el.parentElement) {
    if (callback(el)) {
      return el;
    }
  }
  return null;
}

/**
 * Finds the closest node that satisfies the callback from this node
 * up the DOM subtree.
 * @param {!Node} node
 * @param {function(!Node):boolean} callback
 * @return {?Node}
 */

function closestNode(node, callback) {
  for (var n = node; n; n = n.parentNode) {
    if (callback(n)) {
      return n;
    }
  }
  return null;
}

/**
 * Finds the closest element with the specified name from this element
 * up the DOM subtree.
 * @param {!Element} element
 * @param {string} tagName
 * @return {?Element}
 */

function closestByTag(element, tagName) {
  if (element.closest) {
    return element.closest(tagName);
  }
  tagName = tagName.toUpperCase();
  return closest(element, function (el) {
    return el.tagName == tagName;
  });
}

/**
 * Finds the closest element with the specified selector from this element
 * @param {!Element} element
 * @param {string} selector
 * @return {?Element} closest ancestor if found.
 */

function closestBySelector(element, selector) {
  if (element.closest) {
    return element.closest(selector);
  }

  return closest(element, function (el) {
    return matches(el, selector);
  });
}

/**
 * Checks if the given element matches the selector
 * @param  {!Element} el The element to verify
 * @param  {!string} selector The selector to check against
 * @return {boolean} True if the element matched the selector. False otherwise.
 */

function matches(el, selector) {
  var matcher = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector || el.oMatchesSelector;
  if (matcher) {
    return matcher.call(el, selector);
  }
  return false; // IE8 always returns false.
}

/**
 * Finds the first descendant element with the specified name.
 * @param {!Element} element
 * @param {string} tagName
 * @return {?Element}
 */

function elementByTag(element, tagName) {
  var elements = element.getElementsByTagName(tagName);
  return elements[0] || null;
}

/**
 * Finds the first child element that satisfies the callback.
 * @param {!Element} parent
 * @param {function(!Element):boolean} callback
 * @return {?Element}
 */

function childElement(parent, callback) {
  for (var child = parent.firstElementChild; child; child = child.nextElementSibling) {
    if (callback(child)) {
      return child;
    }
  }
  return null;
}

/**
 * Finds all child elements that satisfy the callback.
 * @param {!Element} parent
 * @param {function(!Element):boolean} callback
 * @return {!Array<!Element>}
 */

function childElements(parent, callback) {
  var children = [];
  for (var child = parent.firstElementChild; child; child = child.nextElementSibling) {
    if (callback(child)) {
      children.push(child);
    }
  }
  return children;
}

/**
 * Finds the last child element that satisfies the callback.
 * @param {!Element} parent
 * @param {function(!Element):boolean} callback
 * @return {?Element}
 */

function lastChildElement(parent, callback) {
  for (var child = parent.lastElementChild; child; child = child.previousElementSibling) {
    if (callback(child)) {
      return child;
    }
  }
  return null;
}

/**
 * Finds all child nodes that satisfy the callback.
 * These nodes can include Text, Comment and other child nodes.
 * @param {!Node} parent
 * @param {function(!Node):boolean} callback
 * @return {!Array<!Node>}
 */

function childNodes(parent, callback) {
  var nodes = [];
  for (var child = parent.firstChild; child; child = child.nextSibling) {
    if (callback(child)) {
      nodes.push(child);
    }
  }
  return nodes;
}

/**
 * @type {boolean|undefined}
 * @visibleForTesting
 */
var scopeSelectorSupported = undefined;

/**
 * @param {boolean|undefined} val
 * @visibleForTesting
 */

function setScopeSelectorSupportedForTesting(val) {
  scopeSelectorSupported = val;
}

/**
 * @param {!Element} parent
 * @return {boolean}
 */
function isScopeSelectorSupported(parent) {
  try {
    parent.ownerDocument.querySelector(':scope');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Finds the first child element that has the specified attribute.
 * @param {!Element} parent
 * @param {string} attr
 * @return {?Element}
 */

function childElementByAttr(parent, attr) {
  return scopedQuerySelector(parent, '> [' + attr + ']');
}

/**
 * Finds the last child element that has the specified attribute.
 * @param {!Element} parent
 * @param {string} attr
 * @return {?Element}
 */

function lastChildElementByAttr(parent, attr) {
  return lastChildElement(parent, function (el) {
    return el.hasAttribute(attr);
  });
}

/**
 * Finds all child elements that has the specified attribute.
 * @param {!Element} parent
 * @param {string} attr
 * @return {!NodeList<!Element>}
 */

function childElementsByAttr(parent, attr) {
  return scopedQuerySelectorAll(parent, '> [' + attr + ']');
}

/**
 * Finds the first child element that has the specified tag name.
 * @param {!Element} parent
 * @param {string} tagName
 * @return {?Element}
 */

function childElementByTag(parent, tagName) {
  return scopedQuerySelector(parent, '> ' + tagName);
}

/**
 * Finds all child elements with the specified tag name.
 * @param {!Element} parent
 * @param {string} tagName
 * @return {!NodeList<!Element>}
 */

function childElementsByTag(parent, tagName) {
  return scopedQuerySelectorAll(parent, '> ' + tagName);
}

/**
 * Finds the first element that matches `selector`, scoped inside `root`.
 * Note: in IE, this causes a quick mutation of the element's class list.
 * @param {!Element} root
 * @param {string} selector
 * @return {?Element}
 */

function scopedQuerySelector(root, selector) {
  if (scopeSelectorSupported == null) {
    scopeSelectorSupported = isScopeSelectorSupported(root);
  }
  if (scopeSelectorSupported) {
    return root. /*OK*/querySelector(':scope ' + selector);
  }

  // Only IE.
  var unique = 'i-amphtml-scoped';
  root.classList.add(unique);
  var element = root. /*OK*/querySelector('.' + unique + ' ' + selector);
  root.classList.remove(unique);
  return element;
}

/**
 * Finds the every element that matches `selector`, scoped inside `root`.
 * Note: in IE, this causes a quick mutation of the element's class list.
 * @param {!Element} root
 * @param {string} selector
 * @return {!NodeList<!Element>}
 */

function scopedQuerySelectorAll(root, selector) {
  if (scopeSelectorSupported == null) {
    scopeSelectorSupported = isScopeSelectorSupported(root);
  }
  if (scopeSelectorSupported) {
    return root. /*OK*/querySelectorAll(':scope ' + selector);
  }

  // Only IE.
  var unique = 'i-amphtml-scoped';
  root.classList.add(unique);
  var elements = root. /*OK*/querySelectorAll('.' + unique + ' ' + selector);
  root.classList.remove(unique);
  return elements;
}

/**
 * Returns element data-param- attributes as url parameters key-value pairs.
 * e.g. data-param-some-attr=value -> {someAttr: value}.
 * @param {!Element} element
 * @param {function(string):string=} opt_computeParamNameFunc to compute the parameter
 *    name, get passed the camel-case parameter name.
 * @param {!RegExp=} opt_paramPattern Regex pattern to match data attributes.
 * @return {!Object<string, string>}
 */

function getDataParamsFromAttributes(element, opt_computeParamNameFunc, opt_paramPattern) {
  var computeParamNameFunc = opt_computeParamNameFunc || function (key) {
    return key;
  };
  var dataset = element.dataset;
  var params = Object.create(null);
  var paramPattern = opt_paramPattern ? opt_paramPattern : /^param(.+)/;
  for (var key in dataset) {
    var _matches = key.match(paramPattern);
    if (_matches) {
      var param = _matches[1][0].toLowerCase() + _matches[1].substr(1);
      params[computeParamNameFunc(param)] = dataset[key];
    }
  }
  return params;
}

/**
 * Whether the element have a next node in the document order.
 * This means either:
 *  a. The element itself has a nextSibling.
 *  b. Any of the element ancestors has a nextSibling.
 * @param {!Element} element
 * @param {?Node} opt_stopNode
 * @return {boolean}
 */

function hasNextNodeInDocumentOrder(element, opt_stopNode) {
  var currentElement = element;
  do {
    if (currentElement.nextSibling) {
      return true;
    }
  } while ((currentElement = currentElement.parentNode) && currentElement != opt_stopNode);
  return false;
}

/**
 * Finds all ancestor elements that satisfy predicate.
 * @param {!Element} child
 * @param {function(!Element):boolean} predicate
 * @return {!Array<!Element>}
 */

function ancestorElements(child, predicate) {
  var ancestors = [];
  for (var ancestor = child.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (predicate(ancestor)) {
      ancestors.push(ancestor);
    }
  }
  return ancestors;
}

/**
 * Finds all ancestor elements that has the specified tag name.
 * @param {!Element} child
 * @param {string} tagName
 * @return {!Array<!Element>}
 */

function ancestorElementsByTag(child, tagName) {
  tagName = tagName.toUpperCase();
  return ancestorElements(child, function (el) {
    return el.tagName == tagName;
  });
}

/**
 * Iterate over an array-like. Some collections like NodeList are
 * lazily evaluated in some browsers, and accessing `length` forces full
 * evaluation. We can improve performance by iterating until an element is
 * `undefined` to avoid checking the `length` property.
 * Test cases: https://jsperf.com/iterating-over-collections-of-elements
 * @param {!IArrayLike<T>} iterable
 * @param {!function(T, number)} cb
 * @template T
 */

function iterateCursor(iterable, cb) {
  for (var i = 0, value = undefined; (value = iterable[i]) !== undefined; i++) {
    cb(value, i);
  }
}

/**
 * This method wraps around window's open method. It first tries to execute
 * `open` call with the provided target and if it fails, it retries the call
 * with the `_top` target. This is necessary given that in some embedding
 * scenarios, such as iOS' WKWebView, navigation to `_blank` and other targets
 * is blocked by default.
 *
 * @param {!Window} win
 * @param {string} url
 * @param {string} target
 * @param {string=} opt_features
 * @return {?Window}
 */

function openWindowDialog(win, url, target, opt_features) {
  // Try first with the specified target. If we're inside the WKWebView or
  // a similar environments, this method is expected to fail by default for
  // all targets except `_top`.
  var res = undefined;
  try {
    res = win.open(url, target, opt_features);
  } catch (e) {
    _log.dev().error('DOM', 'Failed to open url on target: ', target, e);
  }

  // Then try with `_top` target.
  if (!res && target != '_top') {
    res = win.open(url, '_top');
  }
  return res;
}

/**
 * Whether the element is a script tag with application/json type.
 * @param {!Element} element
 * @return {boolean}
 */

function isJsonScriptTag(element) {
  return element.tagName == 'SCRIPT' && element.getAttribute('type').toUpperCase() == 'APPLICATION/JSON';
}

/**
 * Escapes an ident (ID or a class name) to be used as a CSS selector.
 *
 * See https://drafts.csswg.org/cssom/#serialize-an-identifier.
 *
 * @param {!Window} win
 * @param {string} ident
 * @return {string}
 */

function escapeCssSelectorIdent(win, ident) {
  if (win.CSS && win.CSS.escape) {
    return win.CSS.escape(ident);
  }
  // Polyfill.
  return _third_partyCssEscapeCssEscape.cssEscape(ident);
}

/**
 * Escapes `<`, `>` and other HTML charcaters with their escaped forms.
 * @param {string} text
 * @return {string}
 */

function escapeHtml(text) {
  if (!text) {
    return text;
  }
  return text.replace(HTML_ESCAPE_REGEX, escapeHtmlChar);
}

/**
 * @param {string} c
 * @return string
 */
function escapeHtmlChar(c) {
  return HTML_ESCAPE_CHARS[c];
}

/**
 * Tries to focus on the given element; fails silently if browser throws an
 * exception.
 * @param {!Element} element
 */

function tryFocus(element) {
  try {
    element. /*OK*/focus();
  } catch (e) {
    // IE <= 7 may throw exceptions when focusing on hidden items.
  }
}

/**
 * Whether the given window is in an iframe or not.
 * @param {!Window} win
 * @return {boolean}
 */

function isIframed(win) {
  return win.parent && win.parent != win;
}

/**
 * Determines if this element is an AMP element
 * @param {!Element} element
 * @return {boolean}
 */

function isAmpElement(element) {
  var tag = element.tagName;
  // Use prefix to recognize AMP element. This is necessary because stub
  // may not be attached yet.
  return _string.startsWith(tag, 'AMP-') &&
  // Some "amp-*" elements are not really AMP elements. :smh:
  !(tag == 'AMP-STICKY-AD-TOP-PADDING' || tag == 'AMP-BODY');
}

/**
 * Return a promise that resolve when an AMP element upgrade from HTMLElement
 * to CustomElement
 * @param {!Element} element
 * @return {!Promise<!Element>}
 */

function whenUpgradedToCustomElement(element) {
  _log.dev().assert(isAmpElement(element), 'element is not AmpElement');
  if (element.createdCallback) {
    // Element already is CustomElement;
    return Promise.resolve(element);
  }
  // If Element is still HTMLElement, wait for it to upgrade to customElement
  // Note: use pure string to avoid obfuscation between versions.
  if (!element[UPGRADE_TO_CUSTOMELEMENT_PROMISE]) {
    element[UPGRADE_TO_CUSTOMELEMENT_PROMISE] = new Promise(function (resolve) {
      element[UPGRADE_TO_CUSTOMELEMENT_RESOLVER] = resolve;
    });
  }

  return element[UPGRADE_TO_CUSTOMELEMENT_PROMISE];
}

},{"../third_party/css-escape/css-escape":55,"./log":33,"./string":46}],23:[function(require,module,exports){
exports.__esModule = true;
exports.getElementService = getElementService;
exports.getElementServiceIfAvailable = getElementServiceIfAvailable;
exports.getElementServiceForDoc = getElementServiceForDoc;
exports.getElementServiceIfAvailableForDoc = getElementServiceIfAvailableForDoc;
exports.getElementServiceForDocInEmbedScope = getElementServiceForDocInEmbedScope;
exports.getElementServiceIfAvailableForDocInEmbedScope = getElementServiceIfAvailableForDocInEmbedScope;
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

var _service = require('./service');

var _log = require('./log');

var _dom = require('./dom');

var dom = babelHelpers.interopRequireWildcard(_dom);

/**
 * Returns a promise for a service for the given id and window. Also expects
 * an element that has the actual implementation. The promise resolves when
 * the implementation loaded.
 * Users should typically wrap this as a special purpose function (e.g.
 * viewportForDoc(...)) for type safety and because the factory should not be
 * passed around.
 * @param {!Window} win
 * @param {string} id of the service.
 * @param {string} extension Name of the custom extension that provides the
 *     implementation of this service.
 * @param {boolean=} opt_element Whether this service is provided by an
 *     element, not the extension.
 * @return {!Promise<*>}
 */

function getElementService(win, id, extension, opt_element) {
  return getElementServiceIfAvailable(win, id, extension, opt_element).then(function (service) {
    return assertService(service, id, extension);
  });
}

/**
 * Same as getElementService but produces null if the given element is not
 * actually available on the current page.
 * @param {!Window} win
 * @param {string} id of the service.
 * @param {string} extension Name of the custom extension that provides the
 *     implementation of this service.
 * @param {boolean=} opt_element Whether this service is provided by an
 *     element, not the extension.
 * @return {!Promise<?Object>}
 */

function getElementServiceIfAvailable(win, id, extension, opt_element) {
  var s = _service.getServicePromiseOrNull(win, id);
  if (s) {
    return (/** @type {!Promise<?Object>} */s
    );
  }
  return elementServicePromiseOrNull(win, id, extension, opt_element);
}

/**
 * @param {!Window} win
 * @param {string} elementName Name of an extended custom element.
 * @return {boolean} Whether this element is scheduled to be loaded.
 */
function isElementScheduled(win, elementName) {
  // Set in custom-element.js
  if (!win.ampExtendedElements) {
    return false;
  }
  return !!win.ampExtendedElements[elementName];
}

/**
 * Returns a promise for a service for the given id and window. Also expects
 * an element that has the actual implementation. The promise resolves when
 * the implementation loaded.
 * Users should typically wrap this as a special purpose function (e.g.
 * viewportForDoc(...)) for type safety and because the factory should not be
 * passed around.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @param {string} id of the service.
 * @param {string} extension Name of the custom extension that provides the
 *     implementation of this service.
 * @param {boolean=} opt_element Whether this service is provided by an
 *     element, not the extension.
 * @return {!Promise<*>}
 */

function getElementServiceForDoc(nodeOrDoc, id, extension, opt_element) {
  return getElementServiceIfAvailableForDoc(nodeOrDoc, id, extension, opt_element).then(function (service) {
    return assertService(service, id, extension);
  });
}

/**
 * Same as getElementService but produces null if the given element is not
 * actually available on the current page.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @param {string} id of the service.
 * @param {string} extension Name of the custom extension that provides the
 *     implementation of this service.
 * @param {boolean=} opt_element Whether this service is provided by an
 *     element, not the extension.
 * @return {!Promise<?Object>}
 */

function getElementServiceIfAvailableForDoc(nodeOrDoc, id, extension, opt_element) {
  var ampdoc = _service.getAmpdoc(nodeOrDoc);
  var s = _service.getServicePromiseOrNullForDoc(nodeOrDoc, id);
  if (s) {
    return (/** @type {!Promise<?Object>} */s
    );
  }
  // Microtask is necessary to ensure that window.ampExtendedElements has been
  // initialized.
  return Promise.resolve().then(function () {
    if (!opt_element && isElementScheduled(ampdoc.win, extension)) {
      return _service.getServicePromiseForDoc(nodeOrDoc, id);
    }
    // Wait for HEAD to fully form before denying access to the service.
    return ampdoc.whenBodyAvailable().then(function () {
      // If this service is provided by an element, then we can't depend on the
      // service (they may not use the element).
      if (opt_element) {
        return _service.getServicePromiseOrNullForDoc(nodeOrDoc, id);
      } else if (isElementScheduled(ampdoc.win, extension)) {
        return _service.getServicePromiseForDoc(nodeOrDoc, id);
      }
      return null;
    });
  });
}

/**
 * Returns a promise for a service in the closest embed scope of `nodeOrDoc`.
 * If no embed-scope service is found, falls back to top-level service.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @param {string} id of the service.
 * @param {string} extension Name of the custom element that provides
 *     the implementation of this service.
 * @return {!Promise<!Object>}
 */

function getElementServiceForDocInEmbedScope(nodeOrDoc, id, extension) {
  return getElementServiceIfAvailableForDocInEmbedScope(nodeOrDoc, id, extension).then(function (service) {
    if (service) {
      return service;
    }
    // Fallback to ampdoc.
    return getElementServiceForDoc(nodeOrDoc, id, extension);
  });
}

/**
 * Same as `getElementServiceForDocInEmbedScope` but without top-level fallback.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @param {string} id of the service.
 * @param {string} extension Name of the custom element that provides
 *     the implementation of this service.
 * @return {!Promise<?Object>}
 */

function getElementServiceIfAvailableForDocInEmbedScope(nodeOrDoc, id, extension) {
  var s = _service.getExistingServiceForDocInEmbedScope(nodeOrDoc, id);
  if (s) {
    return (/** @type {!Promise<?Object>} */Promise.resolve(s)
    );
  }
  if (nodeOrDoc.nodeType) {
    var win = /** @type {!Document} */(nodeOrDoc.ownerDocument || nodeOrDoc).defaultView;
    return elementServicePromiseOrNull(win, id, extension);
  }
  return (/** @type {!Promise<?Object>} */Promise.resolve(null)
  );
}

/**
 * Throws user error if `service` is null.
 * @param {Object} service
 * @param {string} id
 * @param {string} extension
 * @return {!Object}
 * @private
 */
function assertService(service, id, extension) {
  return (/** @type {!Object} */_log.user().assert(service, 'Service %s was requested to be provided through %s, ' + 'but %s is not loaded in the current page. To fix this ' + 'problem load the JavaScript file for %s in this page.', id, extension, extension, extension)
  );
}

/**
 * Returns the promise for service with `id` on the given window if available.
 * Otherwise, resolves with null (service was not registered).
 * @param {!Window} win
 * @param {string} id
 * @param {string} extension
 * @param {boolean=} opt_element
 * @return {!Promise<Object>}
 * @private
 */
function elementServicePromiseOrNull(win, id, extension, opt_element) {
  // Microtask is necessary to ensure that window.ampExtendedElements has been
  // initialized.
  return Promise.resolve().then(function () {
    if (!opt_element && isElementScheduled(win, extension)) {
      return _service.getServicePromise(win, id);
    }
    // Wait for HEAD to fully form before denying access to the service.
    return dom.waitForBodyPromise(win.document).then(function () {
      // If this service is provided by an element, then we can't depend on the
      // service (they may not use the element).
      if (opt_element) {
        return _service.getServicePromiseOrNull(win, id);
      } else if (isElementScheduled(win, extension)) {
        return _service.getServicePromise(win, id);
      }
      return null;
    });
  });
}

},{"./dom":22,"./log":33,"./service":44}],24:[function(require,module,exports){
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

},{}],25:[function(require,module,exports){
exports.__esModule = true;
exports.createCustomEvent = createCustomEvent;
exports.listen = listen;
exports.listenOnce = listenOnce;
exports.listenOncePromise = listenOncePromise;
exports.isLoaded = isLoaded;
exports.loadPromise = loadPromise;
exports.isLoadErrorMessage = isLoadErrorMessage;
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

var _eventHelperListen = require('./event-helper-listen');

var _log = require('./log');

/** @const {string}  */
var LOAD_FAILURE_PREFIX = 'Failed to load:';

/**
 * Returns a CustomEvent with a given type and detail; supports fallback for IE.
 * @param {!Window} win
 * @param {string} type
 * @param {Object} detail
 * @param {EventInit=} opt_eventInit
 * @return {!Event}
 */

function createCustomEvent(win, type, detail, opt_eventInit) {
  var eventInit = /** @type {CustomEventInit} */{ detail: detail };
  Object.assign(eventInit, opt_eventInit);
  // win.CustomEvent is a function on Edge, Chrome, FF, Safari but
  // is an object on IE 11.
  if (typeof win.CustomEvent == 'function') {
    return new win.CustomEvent(type, eventInit);
  } else {
    // Deprecated fallback for IE.
    var e = win.document.createEvent('CustomEvent');
    e.initCustomEvent(type, !!eventInit.bubbles, !!eventInit.cancelable, detail);
    return e;
  }
}

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
 * Listens for the specified event on the element and removes the listener
 * as soon as event has been received.
 * @param {!EventTarget} element
 * @param {string} eventType
 * @param {function(!Event)} listener
 * @param {boolean=} opt_capture
 * @return {!UnlistenDef}
 */

function listenOnce(element, eventType, listener, opt_capture) {
  var localListener = listener;
  var unlisten = _eventHelperListen.internalListenImplementation(element, eventType, function (event) {
    try {
      localListener(event);
    } finally {
      // Ensure listener is GC'd
      localListener = null;
      unlisten();
    }
  }, opt_capture);
  return unlisten;
}

/**
 * Returns  a promise that will resolve as soon as the specified event has
 * fired on the element.
 * @param {!EventTarget} element
 * @param {string} eventType
 * @param {boolean=} opt_capture
 * @param {function(!UnlistenDef)=} opt_cancel An optional function that, when
 *     provided, will be called with the unlistener. This gives the caller
 *     access to the unlistener, so it may be called manually when necessary.
 * @return {!Promise<!Event>}
 */

function listenOncePromise(element, eventType, opt_capture, opt_cancel) {
  var unlisten = undefined;
  var eventPromise = new Promise(function (resolve) {
    unlisten = listenOnce(element, eventType, resolve, opt_capture);
  });
  eventPromise.then(unlisten, unlisten);
  if (opt_cancel) {
    opt_cancel(unlisten);
  }
  return eventPromise;
}

/**
 * Whether the specified element/window has been loaded already.
 * @param {!Element|!Window} eleOrWindow
 * @return {boolean}
 */

function isLoaded(eleOrWindow) {
  return !!(eleOrWindow.complete || eleOrWindow.readyState == 'complete'
  // If the passed in thing is a Window, infer loaded state from
  //
   || eleOrWindow.document && eleOrWindow.document.readyState == 'complete');
}

/**
 * Returns a promise that will resolve or fail based on the eleOrWindow's 'load'
 * and 'error' events. Optionally this method takes a timeout, which will reject
 * the promise if the resource has not loaded by then.
 * @param {T} eleOrWindow Supports both Elements and as a special case Windows.
 * @return {!Promise<T>}
 * @template T
 */

function loadPromise(eleOrWindow) {
  var unlistenLoad = undefined;
  var unlistenError = undefined;
  if (isLoaded(eleOrWindow)) {
    return Promise.resolve(eleOrWindow);
  }
  var loadingPromise = new Promise(function (resolve, reject) {
    // Listen once since IE 5/6/7 fire the onload event continuously for
    // animated GIFs.
    var tagName = eleOrWindow.tagName;
    if (tagName === 'AUDIO' || tagName === 'VIDEO') {
      unlistenLoad = listenOnce(eleOrWindow, 'loadstart', resolve);
    } else {
      unlistenLoad = listenOnce(eleOrWindow, 'load', resolve);
    }
    // For elements, unlisten on error (don't for Windows).
    if (tagName) {
      unlistenError = listenOnce(eleOrWindow, 'error', reject);
    }
  });

  return loadingPromise.then(function () {
    if (unlistenError) {
      unlistenError();
    }
    return eleOrWindow;
  }, function () {
    if (unlistenLoad) {
      unlistenLoad();
    }
    failedToLoad(eleOrWindow);
  });
}

/**
 * Emit error on load failure.
 * @param {!Element|!Window} eleOrWindow Supports both Elements and as a special
 *     case Windows.
 */
function failedToLoad(eleOrWindow) {
  // Report failed loads as user errors so that they automatically go
  // into the "document error" bucket.
  var target = eleOrWindow;
  if (target && target.src) {
    target = target.src;
  }
  throw _log.user().createError(LOAD_FAILURE_PREFIX, target);
}

/**
 * Returns true if this error message is was created for a load error.
 * @param {string} message An error message
 * @return {boolean}
 */

function isLoadErrorMessage(message) {
  return message.indexOf(LOAD_FAILURE_PREFIX) != -1;
}

},{"./event-helper-listen":24,"./log":33}],26:[function(require,module,exports){
exports.__esModule = true;
exports.isCanary = isCanary;
exports.enableExperimentsForOriginTrials = enableExperimentsForOriginTrials;
exports.isExperimentOnForOriginTrial = isExperimentOnForOriginTrial;
exports.isExperimentOn = isExperimentOn;
exports.toggleExperiment = toggleExperiment;
exports.experimentToggles = experimentToggles;
exports.experimentTogglesOrNull = experimentTogglesOrNull;
exports.getExperimentToglesFromCookieForTesting = getExperimentToglesFromCookieForTesting;
exports.resetExperimentTogglesForTesting = resetExperimentTogglesForTesting;
exports.randomlySelectUnsetExperiments = randomlySelectUnsetExperiments;
exports.getExperimentBranch = getExperimentBranch;
exports.forceExperimentBranch = forceExperimentBranch;
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
 * @fileoverview Experiments system allows a developer to opt-in to test
 * features that are not yet fully tested.
 *
 * Experiments page: https://cdn.ampproject.org/experiments.html *
 */

var _utilsBytes = require('./utils/bytes');

var _cookies = require('./cookies');

var _service = require('./service');

var _url = require('./url');

var _log = require('./log');

var _json = require('./json');

/** @const {string} */
var TAG = 'experiments';

/** @const {string} */
var COOKIE_NAME = 'AMP_EXP';

/** @const {number} */
var COOKIE_MAX_AGE_DAYS = 180; // 6 month

/** @const {time} */
var COOKIE_EXPIRATION_INTERVAL = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

/** @type {Object<string, boolean>} */
var toggles_ = null;

//TODO(kmh287, #8331) Uncomment and replace empty object literal with real
// experiment public key jwk.
/** @type {!Promise<undefined>} */
var originTrialsPromise = Promise.resolve();
// const originTrialsPromise = enableExperimentsForOriginTrials(self, {});

/**
 * @typedef {{
 *   isTrafficEligible: !function(!Window):boolean,
 *   branches: !Array<string>
 * }}
 */
var ExperimentInfo = undefined;

exports.ExperimentInfo = ExperimentInfo;
/**
 * Whether we are in canary.
 * @param {!Window} win
 * @return {boolean}
 */

function isCanary(win) {
  return !!(win.AMP_CONFIG && win.AMP_CONFIG.canary);
}

/**
 * Enable experiments detailed in an origin trials token iff the token is
 * valid. A token is invalid if *
 *   1. The token is malformed (e.g. non-existant version number)
 *   2. The token is not for this origin
 *   3. The experiments data was not signed with our private key
 * @param {!Window} win
 * @param {string} token
 * @param {!./service/crypto-impl.Crypto} crypto Crypto service
 * @param {!webCrypto.CryptoKey} key Public key used to verify the token's
 *    signature.
 * @return {!Promise<undefined>}
 */
function enableExperimentsFromToken(win, token, crypto, key) {
  if (!crypto.isPkcsAvailable()) {
    _log.user().warn(TAG, 'Crypto is unavailable');
    return Promise.resolve();
  }
  /**
   * token = encode64(version + length + config +
   *    sign(version + length + config, private_key))
   * version = 1 byte version of the token format (starting at 0x0)
   */
  var current = 0;
  var bytes = _utilsBytes.stringToBytes(atob(token));
  var version = bytes[current];
  if (version !== 0) {
    // Unrecognized version number
    return Promise.reject(new Error('Unrecognized experiments token version: ' + version));
  }
  current++;
  /**
   * Version 0:
   * length = 4 bytes representing number of bytes in config
   * config = string containing the experiment ID, origin URL, etc.
   */
  var bytesForConfigSize = 4;
  var configSize = _utilsBytes.bytesToUInt32(bytes.subarray(current, current + bytesForConfigSize));
  current += bytesForConfigSize;
  if (configSize > bytes.length - current) {
    return Promise.reject(new Error('Specified len extends past end of buffer'));
  }
  var configBytes = bytes.subarray(current, current + configSize);
  current += configSize;
  var signedBytes = bytes.subarray(0, current);
  var signatureBytes = bytes.subarray(current);

  return crypto.verifyPkcs(key, signatureBytes, signedBytes).then(function (verified) {
    if (!verified) {
      throw new Error('Failed to verify config signature');
    }
    var configStr = _utilsBytes.utf8DecodeSync(configBytes);
    var config = _json.parseJson(configStr);

    var approvedOrigin = _url.parseUrl(config['origin']).origin;
    var sourceOrigin = _url.getSourceOrigin(win.location);
    if (approvedOrigin !== sourceOrigin) {
      throw new Error('Config does not match current origin');
    }

    var experimentId = config['experiment'];
    var expiration = config['expiration'];
    var now = Date.now();
    if (expiration >= now) {
      toggleExperiment(win, experimentId,
      /* opt_on */true,
      /* opt_transientExperiment */true);
    } else {
      throw new Error('Experiment ' + experimentId + ' has expired');
    }
  });
}

/**
 * Scan the page for origin trial tokens. Enable experiments detailed in the
 * tokens iff the token is well-formed. A token
 * @param {!Window} win
  *@param {!Object} publicJwk Used for testing only.
 * @return {!Promise<undefined>}
 */

function enableExperimentsForOriginTrials(win, publicJwk) {
  var metas = win.document.head.querySelectorAll('meta[name="amp-experiment-token"]');
  if (metas.length == 0 || Object.keys(publicJwk).length == 0) {
    return Promise.resolve();
  }
  var crypto = undefined;
  return _service.getServicePromise(win, 'crypto').then(function (c) {
    crypto = /** @type {!./service/crypto-impl.Crypto} */c;
    return crypto.importPkcsKey(publicJwk);
  }).then(function (key) {
    var tokenPromises = [];
    for (var i = 0; i < metas.length; i++) {
      var meta = metas[i];
      var token = meta.getAttribute('content');
      if (token) {
        var tokenPromise = enableExperimentsFromToken(win, token, crypto, key)['catch'](function (err) {
          // Log message but do not prevent scans of other tokens.
          _log.user().warn(TAG, err);
        });
        tokenPromises.push(tokenPromise);
      } else {
        _log.user().warn(TAG, 'Unable to read experiments token');
      }
    }
    return Promise.all(tokenPromises);
  });
}

/**
 * Determines if the specified experiment is on or off for origin trials.
 * Callers should check if the experiment is already enabled before calling this
 * function.
 *
 * @param {!Window} win
 * @param {string} experimentId
 * @return {!Promise<boolean>}
 */

function isExperimentOnForOriginTrial(win, experimentId) {
  return originTrialsPromise.then(function () {
    return isExperimentOn(win, experimentId);
  });
}

/**
 * Whether the specified experiment is on or off.
 * @param {!Window} win
 * @param {string} experimentId
 * @return {boolean}
 */

function isExperimentOn(win, experimentId) {
  var toggles = experimentToggles(win);
  return !!toggles[experimentId];
}

/**
 * Toggles the experiment on or off. Returns the actual value of the experiment
 * after toggling is done.
 * @param {!Window} win
 * @param {string} experimentId
 * @param {boolean=} opt_on
 * @param {boolean=} opt_transientExperiment  Whether to toggle the
 *     experiment state "transiently" (i.e., for this page load only) or
 *     durably (by saving the experiment IDs to the cookie after toggling).
 *     Default: false (save durably).
 * @return {boolean} New state for experimentId.
 */

function toggleExperiment(win, experimentId, opt_on, opt_transientExperiment) {
  var currentlyOn = isExperimentOn(win, experimentId);
  var on = !!(opt_on !== undefined ? opt_on : !currentlyOn);
  if (on != currentlyOn) {
    var toggles = experimentToggles(win);
    toggles[experimentId] = on;

    if (!opt_transientExperiment) {
      var cookieToggles = getExperimentTogglesFromCookie(win);
      cookieToggles[experimentId] = on;
      saveExperimentTogglesToCookie(win, cookieToggles);
    }
  }
  return on;
}

/**
 * Calculate whether the experiment is on or off based off of the
 * cookieFlag or the global config frequency given.
 * @param {!Window} win
 * @return {!Object<string, boolean>}
 */

function experimentToggles(win) {
  if (toggles_) {
    return toggles_;
  }
  toggles_ = Object.create(null);

  // Read the default config of this build.
  if (win.AMP_CONFIG) {
    for (var experimentId in win.AMP_CONFIG) {
      var frequency = win.AMP_CONFIG[experimentId];
      if (typeof frequency === 'number' && frequency >= 0 && frequency <= 1) {
        toggles_[experimentId] = Math.random() < frequency;
      }
    }
  }

  // Read document level override from meta tag.
  if (win.AMP_CONFIG && Array.isArray(win.AMP_CONFIG['allow-doc-opt-in']) && win.AMP_CONFIG['allow-doc-opt-in'].length > 0) {
    var allowed = win.AMP_CONFIG['allow-doc-opt-in'];
    var meta = win.document.head.querySelector('meta[name="amp-experiments-opt-in"]');
    if (meta) {
      var optedInExperiments = meta.getAttribute('content').split(',');
      for (var i = 0; i < optedInExperiments.length; i++) {
        if (allowed.indexOf(optedInExperiments[i]) != -1) {
          toggles_[optedInExperiments[i]] = true;
        }
      }
    }
  }

  Object.assign(toggles_, getExperimentTogglesFromCookie(win));

  if (win.AMP_CONFIG && Array.isArray(win.AMP_CONFIG['allow-url-opt-in']) && win.AMP_CONFIG['allow-url-opt-in'].length > 0) {
    var allowed = win.AMP_CONFIG['allow-url-opt-in'];
    var hash = win.location.originalHash || win.location.hash;
    var params = _url.parseQueryString(hash);
    for (var i = 0; i < allowed.length; i++) {
      var param = params['e-' + allowed[i]];
      if (param == '1') {
        toggles_[allowed[i]] = true;
      }
      if (param == '0') {
        toggles_[allowed[i]] = false;
      }
    }
  }
  return toggles_;
}

/**
 * Returns the cached experiments toggles, or null if they have not been
 * computed yet.
 * @return {Object<string, boolean>}
 */

function experimentTogglesOrNull() {
  return toggles_;
}

/**
 * Returns a set of experiment IDs currently on.
 * @param {!Window} win
 * @return {!Object<string, boolean>}
 */
function getExperimentTogglesFromCookie(win) {
  var experimentCookie = _cookies.getCookie(win, COOKIE_NAME);
  var tokens = experimentCookie ? experimentCookie.split(/\s*,\s*/g) : [];

  var toggles = Object.create(null);
  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i].length == 0) {
      continue;
    }
    if (tokens[i][0] == '-') {
      toggles[tokens[i].substr(1)] = false;
    } else {
      toggles[tokens[i]] = true;
    }
  }

  return toggles;
}

/**
 * Saves a set of experiment IDs currently on.
 * @param {!Window} win
 * @param {!Object<string, boolean>} toggles
 */
function saveExperimentTogglesToCookie(win, toggles) {
  var experimentIds = [];
  for (var experiment in toggles) {
    experimentIds.push((toggles[experiment] === false ? '-' : '') + experiment);
  }

  _cookies.setCookie(win, COOKIE_NAME, experimentIds.join(','), Date.now() + COOKIE_EXPIRATION_INTERVAL, {
    // Set explicit domain, so the cookie gets send to sub domains.
    domain: win.location.hostname,
    allowOnProxyOrigin: true
  });
}

/**
 * See getExperimentTogglesFromCookie().
 * @param {!Window} win
 * @return {!Object<string, boolean>}
 * @visibleForTesting
 */

function getExperimentToglesFromCookieForTesting(win) {
  return getExperimentTogglesFromCookie(win);
}

/**
 * Resets the experimentsToggle cache for testing purposes.
 * @param {!Window} win
 * @visibleForTesting
 */

function resetExperimentTogglesForTesting(win) {
  _cookies.setCookie(win, COOKIE_NAME, '', 0, {
    domain: win.location.hostname
  });
  toggles_ = null;
}

/**
 * In some browser implementations of Math.random(), sequential calls of
 * Math.random() are correlated and can cause a bias.  In particular,
 * if the previous random() call was < 0.001 (as it will be if we select
 * into an experiment), the next value could be less than 0.5 more than
 * 50.7% of the time.  This provides an implementation that roots down into
 * the crypto API, when available, to produce less biased samples.
 *
 * @return {number} Pseudo-random floating-point value on the range [0, 1).
 */
function slowButAccuratePrng() {
  // TODO(tdrl): Implement.
  return Math.random();
}

/**
 * Container for alternate random number generator implementations.  This
 * allows us to set an "accurate" PRNG for branch selection, but to mock it
 * out easily in tests.
 *
 * @visibleForTesting
 * @const {!{accuratePrng: function():number}}
 */
var RANDOM_NUMBER_GENERATORS = {
  accuratePrng: slowButAccuratePrng
};

exports.RANDOM_NUMBER_GENERATORS = RANDOM_NUMBER_GENERATORS;
/**
 * Selects, uniformly at random, a single item from the array.
 * @param {!Array<string>} arr Object to select from.
 * @return {?string} Single item from arr or null if arr was empty.
 */
function selectRandomItem(arr) {
  var rn = RANDOM_NUMBER_GENERATORS.accuratePrng();
  return arr[Math.floor(rn * arr.length)] || null;
}

/**
 * Selects which page-level experiment branches are enabled. If a given
 * experiment name is already set (including to the null / no branches selected
 * state), this won't alter its state.
 *
 * Check whether a given experiment is set using isExperimentOn(win,
 * experimentName) and, if it is on, look for which branch is selected in
 * win.experimentBranches[experimentName].
 *
 * @param {!Window} win Window context on which to save experiment
 *     selection state.
 * @param {!Object<string, !ExperimentInfo>} experiments  Set of experiments to
 *     configure for this page load.
 * @visibleForTesting
 */

function randomlySelectUnsetExperiments(win, experiments) {
  win.experimentBranches = win.experimentBranches || {};
  for (var experimentName in experiments) {
    // Skip experimentName if it is not a key of experiments object or if it
    // has already been populated by some other property.
    if (!experiments.hasOwnProperty(experimentName) || win.experimentBranches.hasOwnProperty(experimentName)) {
      continue;
    }

    if (!experiments[experimentName].isTrafficEligible || !experiments[experimentName].isTrafficEligible(win)) {
      win.experimentBranches[experimentName] = null;
      continue;
    }

    // If we're in the experiment, but we haven't already forced a specific
    // experiment branch (e.g., via a test setup), then randomize the branch
    // choice.
    if (!win.experimentBranches[experimentName] && isExperimentOn(win, experimentName)) {
      var branches = experiments[experimentName].branches;
      win.experimentBranches[experimentName] = selectRandomItem(branches);
    }
  }
}

/**
 * Returns the experiment branch enabled for the given experiment ID.
 * For example, 'control' or 'experiment'.
 *
 * @param {!Window} win Window context to check for experiment state.
 * @param {!string} experimentName Name of the experiment to check.
 * @return {?string} Active experiment branch ID for experimentName (possibly
 *     null if experimentName has been tested but no branch was enabled).
 */

function getExperimentBranch(win, experimentName) {
  return win.experimentBranches[experimentName];
}

/**
 * Force enable (or disable) a specific branch of a given experiment name.
 * Disables the experiment name altogether if branchId is falseish.
 *
 * @param {!Window} win Window context to check for experiment state.
 * @param {!string} experimentName Name of the experiment to check.
 * @param {?string} branchId ID of branch to force or null to disable
 *     altogether.
 * @visibleForTesting
 */

function forceExperimentBranch(win, experimentName, branchId) {
  win.experimentBranches = win.experimentBranches || {};
  toggleExperiment(win, experimentName, !!branchId, true);
  win.experimentBranches[experimentName] = branchId;
}

},{"./cookies":19,"./json":31,"./log":33,"./service":44,"./url":50,"./utils/bytes":52}],27:[function(require,module,exports){
exports.__esModule = true;
exports.setSrcdocSupportedForTesting = setSrcdocSupportedForTesting;
exports.setFriendlyIframeEmbedVisible = setFriendlyIframeEmbedVisible;
exports.getFriendlyIframeEmbedOptional = getFriendlyIframeEmbedOptional;
exports.installFriendlyIframeEmbed = installFriendlyIframeEmbed;
exports.mergeHtmlForTesting = mergeHtmlForTesting;
exports.whenContentIniLoad = whenContentIniLoad;
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

var _commonSignals = require('./common-signals');

var _observable = require('./observable');

var _utilsSignals = require('./utils/signals');

var _log = require('./log');

var _service = require('./service');

var _dom = require('./dom');

var _services = require('./services');

var _fullOverlayFrameChildHelper = require('./full-overlay-frame-child-helper');

var _documentReady = require('./document-ready');

var _layoutRect = require('./layout-rect');

var _eventHelper = require('./event-helper');

var _style = require('./style');

/** @const {string} */
var EMBED_PROP = '__AMP_EMBED__';

/** @const {!Array<string>} */
var EXCLUDE_INI_LOAD = ['AMP-AD', 'AMP-ANALYTICS', 'AMP-PIXEL'];

/**
 * Parameters used to create the new "friendly iframe" embed.
 * - html: The complete content of an AMP embed, which is itself an AMP
 *   document. Can include whatever is normally allowed in an AMP document,
 *   except for AMP `<script>` declarations. Those should be passed as an
 *   array of `extensionIds`.
 * - extensionsIds: An optional array of AMP extension IDs used in this embed.
 * - fonts: An optional array of fonts used in this embed.
 *
 * @typedef {{
 *   host: (?AmpElement|undefined),
 *   url: string,
 *   html: string,
 *   extensionIds: (?Array<string>|undefined),
 *   fonts: (?Array<string>|undefined),
 * }}
 */
var FriendlyIframeSpec = undefined;

exports.FriendlyIframeSpec = FriendlyIframeSpec;
/**
 * @type {boolean|undefined}
 * @visiblefortesting
 */
var srcdocSupported = undefined;

/**
 * @param {boolean|undefined} val
 * @visiblefortesting
 */

function setSrcdocSupportedForTesting(val) {
  srcdocSupported = val;
}

/**
 * Returns `true` if the Friendly Iframes are supported.
 * @return {boolean}
 */
function isSrcdocSupported() {
  if (srcdocSupported === undefined) {
    srcdocSupported = 'srcdoc' in HTMLIFrameElement.prototype;
  }
  return srcdocSupported;
}

/**
 * Sets whether the embed is currently visible. The interpretation of visibility
 * is up to the embed parent. However, most of typical cases would rely on
 * whether the embed is currently in the viewport.
 * @param {!FriendlyIframeEmbed} embed
 * @param {boolean} visible
 * @restricted
 * TODO(dvoytenko): Re-evaluate and probably drop once layers are ready.
 */

function setFriendlyIframeEmbedVisible(embed, visible) {
  embed.setVisible_(visible);
}

/**
 * Returns the embed created using `installFriendlyIframeEmbed` or `null`.
 * @param {!HTMLIFrameElement} iframe
 * @return {?FriendlyIframeEmbed}
 */

function getFriendlyIframeEmbedOptional(iframe) {
  return (/** @type {?FriendlyIframeEmbed} */iframe[EMBED_PROP]
  );
}

/**
 * Creates the requested "friendly iframe" embed. Returns the promise that
 * will be resolved as soon as the embed is available. The actual
 * initialization of the embed will start as soon as the `iframe` is added
 * to the DOM.
 * @param {!HTMLIFrameElement} iframe
 * @param {!Element} container
 * @param {!FriendlyIframeSpec} spec
 * @param {function(!Window)=} opt_preinstallCallback
 * @return {!Promise<!FriendlyIframeEmbed>}
 */

function installFriendlyIframeEmbed(iframe, container, spec, opt_preinstallCallback) {
  /** @const {!Window} */
  var win = _service.getTopWindow(iframe.ownerDocument.defaultView);
  /** @const {!./service/extensions-impl.Extensions} */
  var extensions = _services.extensionsFor(win);

  _style.setStyle(iframe, 'visibility', 'hidden');
  iframe.setAttribute('referrerpolicy', 'unsafe-url');

  // Pre-load extensions.
  if (spec.extensionIds) {
    spec.extensionIds.forEach(function (extensionId) {
      return extensions.loadExtension(extensionId);
    });
  }

  var html = mergeHtml(spec);

  // Receive the signal when iframe is ready: it's document is formed.
  iframe.onload = function () {
    // Chrome does not reflect the iframe readystate.
    iframe.readyState = 'complete';
  };
  var loadedPromise = undefined;
  if (isSrcdocSupported()) {
    iframe.srcdoc = html;
    loadedPromise = _eventHelper.loadPromise(iframe);
    container.appendChild(iframe);
  } else {
    iframe.src = 'about:blank';
    container.appendChild(iframe);
    var childDoc = iframe.contentWindow.document;
    childDoc.open();
    childDoc.write(html);
    // With document.write, `iframe.onload` arrives almost immediately, thus
    // we need to wait for child's `window.onload`.
    loadedPromise = _eventHelper.loadPromise(iframe.contentWindow);
    childDoc.close();
  }

  // Wait for document ready signal.
  // This is complicated due to crbug.com/649201 on Chrome and a similar issue
  // on Safari where newly created document's `readyState` immediately equals
  // `complete`, even though the document itself is not yet available. There's
  // no other reliable signal for `readyState` in a child window and thus
  // we have to fallback to polling.
  var readyPromise = undefined;
  if (isIframeReady(iframe)) {
    readyPromise = Promise.resolve();
  } else {
    readyPromise = new Promise(function (resolve) {
      /** @const {number} */
      var interval = win.setInterval(function () {
        if (isIframeReady(iframe)) {
          resolve();
          win.clearInterval(interval);
        }
      }, /* milliseconds */5);

      // For safety, make sure we definitely stop polling when child doc is
      // loaded.
      loadedPromise['catch'](function (error) {
        _log.rethrowAsync(error);
      }).then(function () {
        resolve();
        win.clearInterval(interval);
      });
    });
  }

  return readyPromise.then(function () {
    var embed = new FriendlyIframeEmbed(iframe, spec, loadedPromise);
    iframe[EMBED_PROP] = embed;

    var childWin = /** @type {!Window} */iframe.contentWindow;
    // Add extensions.
    extensions.installExtensionsInChildWindow(childWin, spec.extensionIds || [], opt_preinstallCallback);
    // Ready to be shown.
    embed.startRender_();
    return embed;
  });
}

/**
 * Returns `true` when iframe is ready.
 * @param {!HTMLIFrameElement} iframe
 * @return {boolean}
 */
function isIframeReady(iframe) {
  // This is complicated due to crbug.com/649201 on Chrome and a similar issue
  // on Safari where newly created document's `readyState` immediately equals
  // `complete`, even though the document itself is not yet available. There's
  // no other reliable signal for `readyState` in a child window and thus
  // the best way to check is to see the contents of the body.
  var childDoc = iframe.contentWindow && iframe.contentWindow.document;
  return !!(childDoc && _documentReady.isDocumentReady(childDoc) && childDoc.body && childDoc.body.firstChild);
}

/**
 * Merges base and fonts into html document.
 * @param {!FriendlyIframeSpec} spec
 */
function mergeHtml(spec) {
  var originalHtml = spec.html;
  var originalHtmlUp = originalHtml.toUpperCase();

  // Find the insertion point.
  var ip = originalHtmlUp.indexOf('<HEAD');
  if (ip != -1) {
    ip = originalHtmlUp.indexOf('>', ip + 1) + 1;
  }
  if (ip == -1) {
    ip = originalHtmlUp.indexOf('<BODY');
  }
  if (ip == -1) {
    ip = originalHtmlUp.indexOf('<HTML');
    if (ip != -1) {
      ip = originalHtmlUp.indexOf('>', ip + 1) + 1;
    }
  }

  var result = [];

  // Preambule.
  if (ip > 0) {
    result.push(originalHtml.substring(0, ip));
  }

  // Add <BASE> tag.
  result.push('<base href="' + _dom.escapeHtml(spec.url) + '">');

  // Load fonts.
  if (spec.fonts) {
    spec.fonts.forEach(function (font) {
      result.push('<link href="' + _dom.escapeHtml(font) + '" rel="stylesheet" type="text/css">');
    });
  }

  // Postambule.
  if (ip > 0) {
    result.push(originalHtml.substring(ip));
  } else {
    result.push(originalHtml);
  }

  return result.join('');
}

/**
 * Exposes `mergeHtml` for testing purposes.
 * @param {!FriendlyIframeSpec} spec
 * @visibleForTesting
 */

function mergeHtmlForTesting(spec) {
  return mergeHtml(spec);
}

/**
 * A "friendly iframe" embed. This is the iframe that's fully accessible to
 * the AMP runtime. It's similar to Shadow DOM in many respects, but it also
 * provides iframe/viewport measurements and enables the use of `vh`, `vw` and
 * `@media` CSS.
 *
 * The friendly iframe is managed by the top-level AMP Runtime. When it's
 * destroyed, the `destroy` method must be called to free up the shared
 * resources.
 */

var FriendlyIframeEmbed = (function () {

  /**
   * @param {!HTMLIFrameElement} iframe
   * @param {!FriendlyIframeSpec} spec
   * @param {!Promise} loadedPromise
   */

  function FriendlyIframeEmbed(iframe, spec, loadedPromise) {
    babelHelpers.classCallCheck(this, FriendlyIframeEmbed);

    /** @const {!HTMLIFrameElement} */
    this.iframe = iframe;

    /** @const {!Window} */
    this.win = /** @type{!Window} */iframe.contentWindow;

    /** @const {!FriendlyIframeSpec} */
    this.spec = spec;

    /** @const {?AmpElement} */
    this.host = spec.host || null;

    /** @const @private {time} */
    this.startTime_ = Date.now();

    /**
     * Starts out as invisible. The interpretation of this flag is up to
     * the emded parent.
     * @private {boolean}
     */
    this.visible_ = false;

    /** @private {!Observable<boolean>} */
    this.visibilityObservable_ = new _observable.Observable();

    /** @private @const */
    this.signals_ = this.host ? this.host.signals() : new _utilsSignals.Signals();

    /** @private @const {!Promise} */
    this.winLoadedPromise_ = Promise.all([loadedPromise, this.whenReady()]);
  }

  /**
   * Returns the promise that will be resolved when all content elements
   * have been loaded in the initially visible set.
   * @param {!Node|!./service/ampdoc-impl.AmpDoc} context
   * @param {!Window} hostWin
   * @param {!./layout-rect.LayoutRectDef} rect
   * @return {!Promise}
   */

  /**
   * Ensures that all resources from this iframe have been released.
   */

  FriendlyIframeEmbed.prototype.destroy = function destroy() {
    _services.resourcesForDoc(this.iframe).removeForChildWindow(this.win);
    _service.disposeServicesForEmbed(this.win);
  };

  /**
   * @return {time}
   */

  FriendlyIframeEmbed.prototype.getStartTime = function getStartTime() {
    return this.startTime_;
  };

  /**
   * Returns the base URL for the embedded document.
   * @return {string}
   */

  FriendlyIframeEmbed.prototype.getUrl = function getUrl() {
    return this.spec.url;
  };

  /** @return {!Signals} */

  FriendlyIframeEmbed.prototype.signals = function signals() {
    return this.signals_;
  };

  /**
   * Returns a promise that will resolve when the embed document is ready.
   * Notice that this signal coincides with the embed's `render-start`.
   * @return {!Promise}
   */

  FriendlyIframeEmbed.prototype.whenReady = function whenReady() {
    return this.signals_.whenSignal(_commonSignals.CommonSignals.RENDER_START);
  };

  /**
   * Returns a promise that will resolve when the child window's `onload` event
   * has been emitted. In friendly iframes this typically only includes font
   * loading.
   * @return {!Promise}
   */

  FriendlyIframeEmbed.prototype.whenWindowLoaded = function whenWindowLoaded() {
    return this.winLoadedPromise_;
  };

  /**
   * Returns a promise that will resolve when the initial load  of the embed's
   * content has been completed.
   * @return {!Promise}
   */

  FriendlyIframeEmbed.prototype.whenIniLoaded = function whenIniLoaded() {
    return this.signals_.whenSignal(_commonSignals.CommonSignals.INI_LOAD);
  };

  /** @private */

  FriendlyIframeEmbed.prototype.startRender_ = function startRender_() {
    var _this = this;

    if (this.host) {
      this.host.renderStarted();
    } else {
      this.signals_.signal(_commonSignals.CommonSignals.RENDER_START);
    }
    _style.setStyle(this.iframe, 'visibility', '');
    if (this.win.document && this.win.document.body) {
      _style.setStyles(_log.dev().assertElement(this.win.document.body), {
        opacity: 1,
        visibility: 'visible',
        animation: 'none'
      });
    }

    // Initial load signal signal.
    var rect = undefined;
    if (this.host) {
      rect = this.host.getLayoutBox();
    } else {
      rect = _layoutRect.layoutRectLtwh(0, 0, this.win. /*OK*/innerWidth, this.win. /*OK*/innerHeight);
    }
    Promise.all([this.whenReady(), whenContentIniLoad(this.iframe, this.win, rect)]).then(function () {
      _this.signals_.signal(_commonSignals.CommonSignals.INI_LOAD);
    });
  };

  /**
   * Whether the embed is currently visible. The interpretation of visibility
   * is up to the embed parent. However, most of typical cases would rely on
   * whether the embed is currently in the viewport.
   * @return {boolean}
   * TODO(dvoytenko): Re-evaluate and probably drop once layers are ready.
   */

  FriendlyIframeEmbed.prototype.isVisible = function isVisible() {
    return this.visible_;
  };

  /**
   * See `isVisible` for more info.
   * @param {function(boolean)} handler
   * @return {!UnlistenDef}
   */

  FriendlyIframeEmbed.prototype.onVisibilityChanged = function onVisibilityChanged(handler) {
    return this.visibilityObservable_.add(handler);
  };

  /**
   * @param {boolean} visible
   * @private
   */

  FriendlyIframeEmbed.prototype.setVisible_ = function setVisible_(visible) {
    if (this.visible_ != visible) {
      this.visible_ = visible;
      this.visibilityObservable_.fire(this.visible_);
    }
  };

  /**
   * @return {!HTMLBodyElement}
   * @visibleForTesting
   */

  FriendlyIframeEmbed.prototype.getBodyElement = function getBodyElement() {
    return (/** @type {!HTMLBodyElement} */(this.iframe.contentDocument || this.iframe.contentWindow.document).body
    );
  };

  /**
   * @return {!./service/vsync-impl.Vsync}
   * @visibleForTesting
   */

  FriendlyIframeEmbed.prototype.getVsync = function getVsync() {
    return _services.vsyncFor(this.win);
  };

  /**
   * @return {!./service/resources-impl.Resources}
   * @visibleForTesting
   */

  FriendlyIframeEmbed.prototype.getResources = function getResources() {
    return _services.resourcesForDoc(this.iframe);
  };

  /**
   * Runs a measure/mutate cycle ensuring that the iframe change is propagated
   * to the resource manager.
   * @param {{measure: (Function|undefined), mutate: (Function|undefined)}} task
   * @param {!Object=} opt_state
   * @return {!Promise}
   * @private
   */

  FriendlyIframeEmbed.prototype.runVsyncOnIframe_ = function runVsyncOnIframe_(task, opt_state) {
    var _this2 = this;

    if (task.mutate && !task.measure) {
      return this.getResources().mutateElement(this.iframe, function () {
        task.mutate(opt_state);
      });
    }
    return new Promise(function (resolve) {
      _this2.getVsync().measure(function () {
        task.measure(opt_state);

        if (!task.mutate) {
          return resolve();
        }

        _this2.runVsyncOnIframe_({ mutate: task.mutate }, opt_state).then(resolve);
      });
    });
  };

  /**
   * @return {!Promise}
   */

  FriendlyIframeEmbed.prototype.enterFullOverlayMode = function enterFullOverlayMode() {
    var _this3 = this;

    var iframeBody = this.getBodyElement();
    var fixedContainer = this.getFixedContainer();

    return this.runVsyncOnIframe_({
      measure: function (state) {
        var iframeRect = _this3.iframe. /*OK*/getBoundingClientRect();

        var winWidth = _this3.win. /*OK*/innerWidth;
        var winHeight = _this3.win. /*OK*/innerHeight;

        state.fixedContainerStyle = {
          'position': 'absolute',
          'top': _style.px(iframeRect.top),
          'right': _style.px(winWidth - iframeRect.right),
          'left': _style.px(iframeRect.left),
          'bottom': _style.px(winHeight - iframeRect.bottom),
          'width': _style.px(iframeRect.width),
          'height': _style.px(iframeRect.height)
        };
      },
      mutate: function (state) {
        _style.setStyle(iframeBody, 'background', 'transparent');

        _style.setStyles(_this3.iframe, {
          'position': 'fixed',
          'left': 0,
          'right': 0,
          'top': 0,
          'bottom': 0,
          'width': '100vw',
          'height': '100vh'
        });

        _style.setStyles(fixedContainer, state.fixedContainerStyle);
      }
    }, {});
  };

  /**
   * @return {!Promise}
   */

  FriendlyIframeEmbed.prototype.leaveFullOverlayMode = function leaveFullOverlayMode() {
    var _this4 = this;

    var iframeBody = this.getBodyElement();
    var fixedContainer = this.getFixedContainer();

    return this.runVsyncOnIframe_({
      mutate: function () {
        _style.resetStyles(iframeBody, ['background']);

        _style.resetStyles(_this4.iframe, ['position', 'left', 'right', 'top', 'bottom', 'width', 'height']);

        _style.resetStyles(fixedContainer, ['position', 'top', 'right', 'left', 'bottom', 'width', 'height']);
      }
    });
  };

  /**
   * @return {!Element}
   * @visibleForTesting
   */

  FriendlyIframeEmbed.prototype.getFixedContainer = function getFixedContainer() {
    return _fullOverlayFrameChildHelper.getFixedContainer(this.getBodyElement());
  };

  return FriendlyIframeEmbed;
})();

exports.FriendlyIframeEmbed = FriendlyIframeEmbed;

function whenContentIniLoad(context, hostWin, rect) {
  return _services.resourcesForDoc(context).getResourcesInRect(hostWin, rect).then(function (resources) {
    var promises = [];
    resources.forEach(function (r) {
      if (!EXCLUDE_INI_LOAD.includes(r.element.tagName)) {
        promises.push(r.loadedOnce());
      }
    });
    return Promise.all(promises);
  });
}

},{"./common-signals":17,"./document-ready":21,"./dom":22,"./event-helper":25,"./full-overlay-frame-child-helper":28,"./layout-rect":32,"./log":33,"./observable":36,"./service":44,"./services":45,"./style":47,"./utils/signals":54}],28:[function(require,module,exports){
exports.__esModule = true;
exports.getFixedContainer = getFixedContainer;
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

var _dom = require('./dom');

var _log = require('./log');

/**
 * @param {!HTMLBodyElement} bodyElement
 * @return {!Element}
 */

function getFixedContainer(bodyElement) {
  return _log.dev().assertElement(_dom.childElementByTag(_log.dev().assertElement(bodyElement), 'amp-ad-banner'));
}

},{"./dom":22,"./log":33}],29:[function(require,module,exports){
exports.__esModule = true;
exports.listenFor = listenFor;
exports.listenForOncePromise = listenForOncePromise;
exports.postMessage = postMessage;
exports.postMessageToWindows = postMessageToWindows;
exports.parseIfNeeded = parseIfNeeded;
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

var _pFrameMessaging = require('./3p-frame-messaging');

var _log = require('./log');

var _utilsArray = require('./utils/array');

var _url = require('./url');

var _json = require('./json');

/**
 * Sentinel used to force unlistening after a iframe is detached.
 * @type {string}
 */
var UNLISTEN_SENTINEL = 'unlisten';

/**
 * @typedef {{
 *   frame: !Element,
 *   events: !Object<string, !Array<function(!Object)>>
 * }}
 */
var WindowEventsDef = undefined;

/**
 * Returns a mapping from a URL's origin to an array of windows and their listenFor listeners.
 * @param {!Window} parentWin the window that created the iframe
 * @param {boolean=} opt_create create the mapping if it does not exist
 * @return {?Object<string, !Array<!WindowEventsDef>>}
 */
function getListenFors(parentWin, opt_create) {
  var listeningFors = parentWin.listeningFors;

  if (!listeningFors && opt_create) {
    listeningFors = parentWin.listeningFors = Object.create(null);
  }
  return listeningFors || null;
}

/**
 * Returns an array of WindowEventsDef that have had any listenFor listeners registered for this sentinel.
 * @param {!Window} parentWin the window that created the iframe
 * @param {string} sentinel the sentinel of the message
 * @param {boolean=} opt_create create the array if it does not exist
 * @return {?Array<!WindowEventsDef>}
 */
function getListenForSentinel(parentWin, sentinel, opt_create) {
  var listeningFors = getListenFors(parentWin, opt_create);
  if (!listeningFors) {
    return listeningFors;
  }

  var listenSentinel = listeningFors[sentinel];
  if (!listenSentinel && opt_create) {
    listenSentinel = listeningFors[sentinel] = [];
  }
  return listenSentinel || null;
}

/**
 * Returns an mapping of event names to listenFor listeners.
 * @param {!Window} parentWin the window that created the iframe
 * @param {!Element} iframe the iframe element who's context will trigger the
 *     event
 * @param {boolean=} opt_is3P set to true if the iframe is 3p.
 * @return {?Object<string, !Array<function(!Object, !Window, string)>>}
 */
function getOrCreateListenForEvents(parentWin, iframe, opt_is3P) {
  var origin = _url.parseUrl(iframe.src).origin;
  var sentinel = getSentinel_(iframe, opt_is3P);
  var listenSentinel = getListenForSentinel(parentWin, sentinel, true);

  var windowEvents = undefined;
  for (var i = 0; i < listenSentinel.length; i++) {
    var we = listenSentinel[i];
    if (we.frame === iframe) {
      windowEvents = we;
      break;
    }
  }

  if (!windowEvents) {
    windowEvents = {
      frame: iframe,
      origin: origin,
      events: Object.create(null)
    };
    listenSentinel.push(windowEvents);
  }

  return windowEvents.events;
}

/**
 * Returns an mapping of event names to listenFor listeners.
 * @param {!Window} parentWin the window that created the iframe
 * @param {string} sentinel the sentinel of the message
 * @param {string} origin the source window's origin
 * @param {!Window} triggerWin the window that triggered the event
 * @return {?Object<string, !Array<function(!Object, !Window, string)>>}
 */
function getListenForEvents(parentWin, sentinel, origin, triggerWin) {
  var listenSentinel = getListenForSentinel(parentWin, sentinel);

  if (!listenSentinel) {
    return listenSentinel;
  }

  // Find the entry for the frame.
  // TODO(@nekodo): Add a WeakMap<Window, WindowEventsDef> cache to
  //     speed up this process.
  var windowEvents = undefined;
  for (var i = 0; i < listenSentinel.length; i++) {
    var we = listenSentinel[i];
    var contentWindow = we.frame.contentWindow;
    if (!contentWindow) {
      setTimeout(dropListenSentinel, 0, listenSentinel);
    } else if (sentinel === 'amp') {
      // A non-3P code path, origin must match.
      if (we.origin === origin && contentWindow == triggerWin) {
        windowEvents = we;
        break;
      }
    } else if (triggerWin == contentWindow || isDescendantWindow(contentWindow, triggerWin)) {
      // 3p code path, we may accept messages from nested frames.
      windowEvents = we;
      break;
    }
  }

  return windowEvents ? windowEvents.events : null;
}

/**
 * Checks whether one window is a descendant of another by climbing
 * the parent chain.
 * @param {!Window} ancestor potential ancestor window
 * @param {!Window} descendant potential descendant window
 * @return {boolean}
 */
function isDescendantWindow(ancestor, descendant) {
  for (var win = descendant; win && win != win.parent; win = win.parent) {
    if (win == ancestor) {
      return true;
    }
  }
  return false;
}

/**
 * Removes any listenFors registed on listenSentinel that do not have
 * a contentWindow (the frame was removed from the DOM tree).
 * @param {!Array<!WindowEventsDef>} listenSentinel
 */
function dropListenSentinel(listenSentinel) {
  var noopData = { sentinel: UNLISTEN_SENTINEL };

  for (var i = listenSentinel.length - 1; i >= 0; i--) {
    var windowEvents = listenSentinel[i];

    if (!windowEvents.frame.contentWindow) {
      listenSentinel.splice(i, 1);

      var events = windowEvents.events;
      for (var _name in events) {
        // Splice here, so that each unlisten does not shift the array
        events[_name].splice(0, Infinity).forEach(function (event) {
          event(noopData);
        });
      }
    }
  }
}

/**
 * Registers the global listenFor event listener if it has yet to be.
 * @param {!Window} parentWin
 */
function registerGlobalListenerIfNeeded(parentWin) {
  if (parentWin.listeningFors) {
    return;
  }
  var listenForListener = function (event) {
    if (!event.data) {
      return;
    }
    var data = parseIfNeeded(event.data);
    if (!data || !data.sentinel) {
      return;
    }

    var listenForEvents = getListenForEvents(parentWin, data.sentinel, event.origin, event.source);
    if (!listenForEvents) {
      return;
    }

    var listeners = listenForEvents[data.type];
    if (!listeners) {
      return;
    }

    // We slice to avoid issues with adding another listener or unlistening
    // during iteration. We could move to a Doubly Linked List with
    // backtracking, but that's overly complicated.
    listeners = listeners.slice();
    for (var i = 0; i < listeners.length; i++) {
      var listener = listeners[i];
      listener(data, event.source, event.origin);
    }
  };

  parentWin.addEventListener('message', listenForListener);
}

/**
 * Allows listening for message from the iframe. Returns an unlisten
 * function to remove the listener.
 *
 * @param {!Element} iframe.
 * @param {string} typeOfMessage.
 * @param {?function(!Object, !Window, string)} callback Called when a message of
 *     this type arrives for this iframe.
 * @param {boolean=} opt_is3P set to true if the iframe is 3p.
 * @param {boolean=} opt_includingNestedWindows set to true if a messages from
 *     nested frames should also be accepted.
 * @return {!UnlistenDef}
 */

function listenFor(iframe, typeOfMessage, callback, opt_is3P, opt_includingNestedWindows) {
  _log.dev().assert(iframe.src, 'only iframes with src supported');
  _log.dev().assert(!iframe.parentNode, 'cannot register events on an attached ' + 'iframe. It will cause hair-pulling bugs like #2942');
  _log.dev().assert(callback);
  var parentWin = iframe.ownerDocument.defaultView;

  registerGlobalListenerIfNeeded(parentWin);

  var listenForEvents = getOrCreateListenForEvents(parentWin, iframe, opt_is3P);

  var events = listenForEvents[typeOfMessage] || (listenForEvents[typeOfMessage] = []);

  var unlisten = undefined;
  var listener = function (data, source, origin) {
    // Exclude nested frames if necessary.
    // Note that the source was already verified to be either the contentWindow
    // of the iframe itself or a descendant window within it.
    if (!opt_includingNestedWindows && source != iframe.contentWindow) {
      return;
    }

    if (data.sentinel == UNLISTEN_SENTINEL) {
      unlisten();
      return;
    }
    callback(data, source, origin);
  };

  events.push(listener);

  return unlisten = function () {
    if (listener) {
      var index = events.indexOf(listener);
      if (index > -1) {
        events.splice(index, 1);
      }
      // Make sure references to the unlisten function do not keep
      // alive too much.
      listener = null;
      events = null;
      callback = null;
    }
  };
}

/**
 * Returns a promise that resolves when one of given messages has been observed
 * for the first time. And remove listener for all other messages.
 * @param {!Element} iframe
 * @param {string|!Array<string>} typeOfMessages
 * @param {boolean=} opt_is3P
 * @return {!Promise<!{data, source, origin}>}
 */

function listenForOncePromise(iframe, typeOfMessages, opt_is3P) {
  var unlistenList = [];
  if (typeof typeOfMessages == 'string') {
    typeOfMessages = [typeOfMessages];
  }
  return new Promise(function (resolve) {
    for (var i = 0; i < typeOfMessages.length; i++) {
      var message = typeOfMessages[i];
      var unlisten = listenFor(iframe, message, function (data, source, origin) {
        for (var _i = 0; _i < unlistenList.length; _i++) {
          unlistenList[_i]();
        }
        resolve({ data: data, source: source, origin: origin });
      }, opt_is3P);
      unlistenList.push(unlisten);
    }
  });
}

/**
 * Posts a message to the iframe.
 * @param {!Element} iframe The iframe.
 * @param {string} type Type of the message.
 * @param {!JsonObject} object Message payload.
 * @param {string} targetOrigin origin of the target.
 * @param {boolean=} opt_is3P set to true if the iframe is 3p.
 */

function postMessage(iframe, type, object, targetOrigin, opt_is3P) {
  postMessageToWindows(iframe, [{ win: iframe.contentWindow, origin: targetOrigin }], type, object, opt_is3P);
}

/**
 * Posts an identical message to multiple target windows with the same
 * sentinel.
 * The message is serialized only once.
 * @param {!Element} iframe The iframe.
 * @param {!Array<{win: !Window, origin: string}>} targets to send the message
 *     to, pairs of window and its origin.
 * @param {string} type Type of the message.
 * @param {!JsonObject} object Message payload.
 * @param {boolean=} opt_is3P set to true if the iframe is 3p.
 */

function postMessageToWindows(iframe, targets, type, object, opt_is3P) {
  if (!iframe.contentWindow) {
    return;
  }
  object['type'] = type;
  object['sentinel'] = getSentinel_(iframe, opt_is3P);
  var payload = object;
  if (opt_is3P) {
    // Serialize ourselves because that is much faster in Chrome.
    payload = 'amp-' + JSON.stringify(object);
  }
  for (var i = 0; i < targets.length; i++) {
    var target = targets[i];
    target.win. /*OK*/postMessage(payload, target.origin);
  }
}

/**
 * Gets the sentinel string.
 * @param {!Element} iframe The iframe.
 * @param {boolean=} opt_is3P set to true if the iframe is 3p.
 * @returns {string} Sentinel string.
 * @private
 */
function getSentinel_(iframe, opt_is3P) {
  return opt_is3P ? iframe.getAttribute('data-amp-3p-sentinel') : 'amp';
}

/**
 * JSON parses event.data if it needs to be
 * @param {*} data
 * @returns {?Object} object message
 * @private
 * @visibleForTesting
 */

function parseIfNeeded(data) {
  if (typeof data == 'string') {
    if (data.charAt(0) == '{') {
      data = _json.tryParseJson(data, function (e) {
        _log.dev().warn('IFRAME-HELPER', 'Postmessage could not be parsed. ' + 'Is it in a valid JSON format?', e);
      }) || null;
    } else if (_pFrameMessaging.isAmpMessage(data)) {
      data = _pFrameMessaging.deserializeMessage(data);
    } else {
      data = null;
    }
  }
  return (/** @type {?Object} */data
  );
}

/**
 * Manages a postMessage API for an iframe with a subscription message and
 * a way to broadcast messages to all subscribed windows, which
 * in turn must all be descendants of the contentWindow of the iframe.
 */

var SubscriptionApi = (function () {
  /**
   * @param {!Element} iframe The iframe.
   * @param {string} type Type of the subscription message.
   * @param {boolean} is3p set to true if the iframe is 3p.
   * @param {function(!Object, !Window, string)} requestCallback Callback
   *     invoked whenever a new window subscribes.
   */

  function SubscriptionApi(iframe, type, is3p, requestCallback) {
    var _this = this;

    babelHelpers.classCallCheck(this, SubscriptionApi);

    /** @private @const {!Element} */
    this.iframe_ = iframe;
    /** @private @const {boolean} */
    this.is3p_ = is3p;
    /** @private @const {!Array<{win: !Window, origin: string}>} */
    this.clientWindows_ = [];

    /** @private @const {!UnlistenDef} */
    this.unlisten_ = listenFor(this.iframe_, type, function (data, source, origin) {
      // This message might be from any window within the iframe, we need
      // to keep track of which windows want to be sent updates.
      if (!_this.clientWindows_.some(function (entry) {
        return entry.win == source;
      })) {
        _this.clientWindows_.push({ win: source, origin: origin });
      }
      requestCallback(data, source, origin);
    }, this.is3p_,
    // For 3P frames we also allow nested frames within them to subscribe..
    this.is3p_ /* opt_includingNestedWindows */);
  }

  /**
   * Sends a message to all subscribed windows.
   * @param {string} type Type of the message.
   * @param {!JsonObject} data Message payload.
   */

  SubscriptionApi.prototype.send = function send(type, data) {
    // Remove clients that have been removed from the DOM.
    _utilsArray.filterSplice(this.clientWindows_, function (client) {
      return !!client.win.parent;
    });
    postMessageToWindows(this.iframe_, this.clientWindows_, type, data, this.is3p_);
  };

  SubscriptionApi.prototype.destroy = function destroy() {
    this.unlisten_();
    this.clientWindows_.length = 0;
  };

  return SubscriptionApi;
})();

exports.SubscriptionApi = SubscriptionApi;

},{"./3p-frame-messaging":16,"./json":31,"./log":33,"./url":50,"./utils/array":51}],30:[function(require,module,exports){
exports.__esModule = true;
exports.getIntersectionChangeEntry = getIntersectionChangeEntry;
exports.nativeIntersectionObserverSupported = nativeIntersectionObserverSupported;
exports.getThresholdSlot = getThresholdSlot;
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

var _log = require('./log');

var _utilsObject = require('./utils/object');

var _layoutRect = require('./layout-rect');

var _iframeHelper = require('./iframe-helper');

/**
 * The structure that defines the rectangle used in intersection observers.
 *
 * @typedef {{
 *   top: number,
 *   bottom: number,
 *   left: number,
 *   right: number,
 *   width: number,
 *   height: number,
 *   x: number,
 *   y: number,
 * }}
 */
var DOMRect = undefined;

exports.DOMRect = DOMRect;
var DEFAULT_THRESHOLD = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1];

exports.DEFAULT_THRESHOLD = DEFAULT_THRESHOLD;
/** @typedef {{
 *    element: !Element,
 *    currentThresholdSlot: number,
 *  }}
 */
var ElementIntersectionStateDef = undefined;

/** @const @private */
var TAG = 'INTERSECTION-OBSERVER';

/** @const @private */
var INIT_TIME = Date.now();

/**
 * A function to get the element's current IntersectionObserverEntry
 * regardless of the intersetion ratio. Only available when element is not
 * nested in a container iframe.
 * TODO: support opt_iframe if there's valid use cases.
 * @param {!./layout-rect.LayoutRectDef} element element's rect
 * @param {?./layout-rect.LayoutRectDef} owner element's owner rect
 * @param {!./layout-rect.LayoutRectDef} hostViewport hostViewport's rect
 * @return {!IntersectionObserverEntry} A change entry.
 */

function getIntersectionChangeEntry(element, owner, hostViewport) {
  var intersection = _layoutRect.rectIntersection(element, owner, hostViewport) || _layoutRect.layoutRectLtwh(0, 0, 0, 0);
  var ratio = intersectionRatio(intersection, element);
  return calculateChangeEntry(element, hostViewport, intersection, ratio);
}

function nativeIntersectionObserverSupported(win) {
  return 'IntersectionObserver' in win && 'IntersectionObserverEntry' in win && 'intersectionRatio' in win.IntersectionObserverEntry.prototype;
}

/**
 * A class to help amp-iframe and amp-ad nested iframe listen to intersection
 * change.
 */

var IntersectionObserverApi = (function () {
  /**
   * @param {!AMP.BaseElement} baseElement
   * @param {!Element} iframe
   * @param {boolean=} opt_is3p
   */

  function IntersectionObserverApi(baseElement, iframe, opt_is3p) {
    var _this = this;

    babelHelpers.classCallCheck(this, IntersectionObserverApi);

    /** @private @const {!AMP.BaseElement} */
    this.baseElement_ = baseElement;

    /** @private {?IntersectionObserverPolyfill} */
    this.intersectionObserver_ = null;

    /** @private {!boolean} */
    this.shouldObserve_ = false;

    /** @private {!boolean} */
    this.isInViewport_ = false;

    /** @private {?function()} */
    this.unlistenOnDestroy_ = null;

    /** @private @const {!./service/viewport-impl.Viewport} */
    this.viewport_ = baseElement.getViewport();

    /** @private {?SubscriptionApi} */
    this.subscriptionApi_ = new _iframeHelper.SubscriptionApi(iframe, 'send-intersections', opt_is3p || false, function () {
      _this.startSendingIntersection_();
    });

    this.intersectionObserver_ = new IntersectionObserverPolyfill(function (entries) {
      // Remove target info from cross origin iframe.
      for (var i = 0; i < entries.length; i++) {
        delete entries[i]['target'];
      }
      _this.subscriptionApi_.send('intersection', _utilsObject.dict({ 'changes': entries }));
    }, { threshold: DEFAULT_THRESHOLD });
    this.intersectionObserver_.tick(this.viewport_.getRect());

    /** @const {function()} */
    this.fire = function () {
      if (!_this.shouldObserve_ || !_this.isInViewport_) {
        return;
      }
      _this.intersectionObserver_.tick(_this.viewport_.getRect());
    };
  }

  /**
   * The IntersectionObserverPolyfill class lets any element receive its
   * intersection data with the viewport. It acts like native browser supported
   * IntersectionObserver.
   * The IntersectionObserver receives a callback function and an optional option
   * as params. Whenever the element intersection ratio cross a threshold value,
   * IntersectionObserverPolyfill will call the provided callback function with
   * the change entry.
   * @visibleForTesting
   */

  /**
   * Function to start listening to viewport event. and observer intersection
   * change on the element.
   */

  IntersectionObserverApi.prototype.startSendingIntersection_ = function startSendingIntersection_() {
    var _this2 = this;

    this.shouldObserve_ = true;
    this.intersectionObserver_.observe(this.baseElement_.element);
    this.baseElement_.getVsync().measure(function () {
      _this2.isInViewport_ = _this2.baseElement_.isInViewport();
      _this2.fire();
    });

    var unlistenViewportScroll = this.viewport_.onScroll(this.fire);
    var unlistenViewportChange = this.viewport_.onChanged(this.fire);
    this.unlistenOnDestroy_ = function () {
      unlistenViewportScroll();
      unlistenViewportChange();
    };
  };

  /**
   * Enable to the PositionObserver to listen to viewport events
   * @param {!boolean} inViewport
   */

  IntersectionObserverApi.prototype.onViewportCallback = function onViewportCallback(inViewport) {
    this.isInViewport_ = inViewport;
  };

  /**
   * Clean all listenrs
   */

  IntersectionObserverApi.prototype.destroy = function destroy() {
    this.shouldObserve_ = false;
    this.intersectionObserver_ = null;
    if (this.unlistenOnDestroy_) {
      this.unlistenOnDestroy_();
      this.unlistenOnDestroy_ = null;
    }
    this.subscriptionApi_.destroy();
    this.subscriptionApi_ = null;
  };

  return IntersectionObserverApi;
})();

exports.IntersectionObserverApi = IntersectionObserverApi;

var IntersectionObserverPolyfill = (function () {
  /**
   * @param {!function(?Array<!IntersectionObserverEntry>)} callback.
   * @param {Object=} opt_option
   */

  function IntersectionObserverPolyfill(callback, opt_option) {
    babelHelpers.classCallCheck(this, IntersectionObserverPolyfill);

    /** @private @const {function(?Array<!IntersectionObserverEntry>)} */
    this.callback_ = callback;

    /**
     * A list of threshold, sorted in increasing numeric order
     * @private @const {!Array}
     */
    var threshold = opt_option && opt_option.threshold || [0];
    this.threshold_ = threshold.sort();
    _log.dev().assert(this.threshold_[0] >= 0 && this.threshold_[this.threshold_.length - 1] <= 1, 'Threshold should be in the range from "[0, 1]"');

    /** @private {?./layout-rect.LayoutRectDef} */
    this.lastViewportRect_ = null;

    /** @private {./layout-rect.LayoutRectDef|undefined} */
    this.lastIframeRect_ = undefined;

    /**
     * Store a list of observed elements and their current threshold slot which
     * their intersection ratio fills, range from [0, this.threshold_.length]
     * @private {Array<!ElementIntersectionStateDef>}
     */
    this.observeEntries_ = [];
  }

  /**
   * Transforms a LayoutRect into a DOMRect for use in intersection observers.
   * @param {!./layout-rect.LayoutRectDef} rect
   * @return {!DOMRect}
   */

  /**
   */

  IntersectionObserverPolyfill.prototype.disconnect = function disconnect() {
    this.observeEntries_.length = 0;
  };

  /**
   * Provide a way to observe the intersection change for a specific element
   * Please note IntersectionObserverPolyfill only support AMP element now
   * TODO: Support non AMP element
   * @param {!Element} element
   */

  IntersectionObserverPolyfill.prototype.observe = function observe(element) {
    // Check the element is an AMP element.
    _log.dev().assert(element.getLayoutBox);

    // If the element already exists in current observeEntries, do nothing
    for (var i = 0; i < this.observeEntries_.length; i++) {
      if (this.observeEntries_[i].element === element) {
        _log.dev().warn(TAG, 'should observe same element once');
        return;
      }
    }

    var newState = {
      element: element,
      currentThresholdSlot: 0
    };

    // Get the new observed element's first changeEntry based on last viewport
    if (this.lastViewportRect_) {
      var change = this.getValidIntersectionChangeEntry_(newState, this.lastViewportRect_, this.lastIframeRect_);
      if (change) {
        this.callback_([change]);
      }
    }

    // push new observed element
    this.observeEntries_.push(newState);
  };

  /**
   * Provide a way to unobserve intersection change for a specified element
   * @param {!Element} element
   */

  IntersectionObserverPolyfill.prototype.unobserve = function unobserve(element) {
    // find the unobserved element in observeEntries
    for (var i = 0; i < this.observeEntries_.length; i++) {
      if (this.observeEntries_[i].element === element) {
        this.observeEntries_.splice(i, 1);
        return;
      }
    }
    _log.dev().warn(TAG, 'unobserve non-observed element');
  };

  /**
   * Tick function that update the DOMRect of the root of observed elements.
   * Caller needs to make sure to pass in the correct container.
   * Note: the opt_iframe param is the iframe position relative to the host doc,
   * The iframe must be a non-scrollable iframe.
   * @param {!./layout-rect.LayoutRectDef} hostViewport.
   * @param {./layout-rect.LayoutRectDef=} opt_iframe
   */

  IntersectionObserverPolyfill.prototype.tick = function tick(hostViewport, opt_iframe) {

    if (opt_iframe) {
      // If element inside an iframe. Adjust origin to the iframe.left/top.
      hostViewport = _layoutRect.moveLayoutRect(hostViewport, -opt_iframe.left, -opt_iframe.top);
      opt_iframe = _layoutRect.moveLayoutRect(opt_iframe, -opt_iframe.left, -opt_iframe.top);
    }

    this.lastViewportRect_ = hostViewport;
    this.lastIframeRect_ = opt_iframe;

    var changes = [];

    for (var i = 0; i < this.observeEntries_.length; i++) {
      var change = this.getValidIntersectionChangeEntry_(this.observeEntries_[i], hostViewport, opt_iframe);
      if (change) {
        changes.push(change);
      }
    }

    if (changes.length) {
      this.callback_(changes);
    }
  };

  /**
   * Return a change entry for one element that should be compatible with
   * IntersectionObserverEntry if it's valid with current config.
   * When the new intersection ratio doesn't cross one of a threshold value,
   * the function will return null.
   *
   * @param {!ElementIntersectionStateDef} state
   * @param {!./layout-rect.LayoutRectDef} hostViewport hostViewport's rect
   * @param {./layout-rect.LayoutRectDef=} opt_iframe. iframe container rect
   * @return {?IntersectionObserverEntry} A valid change entry or null if ratio
   * @private
   */

  IntersectionObserverPolyfill.prototype.getValidIntersectionChangeEntry_ = function getValidIntersectionChangeEntry_(state, hostViewport, opt_iframe) {
    var element = state.element;

    // Normalize container LayoutRect to be relative to page
    var ownerRect = null;

    // If opt_iframe is provided, all LayoutRect has position relative to
    // the iframe.
    // If opt_iframe is not provided, all LayoutRect has position relative to
    // the host document.
    var elementRect = element.getLayoutBox();
    var owner = element.getOwner();
    ownerRect = owner && owner.getLayoutBox();

    // calculate intersectionRect. that the element intersects with hostViewport
    // and intersects with owner element and container iframe if exists.
    var intersectionRect = _layoutRect.rectIntersection(elementRect, ownerRect, hostViewport, opt_iframe) || _layoutRect.layoutRectLtwh(0, 0, 0, 0);
    // calculate ratio, call callback based on new ratio value.
    var ratio = intersectionRatio(intersectionRect, elementRect);
    var newThresholdSlot = getThresholdSlot(this.threshold_, ratio);

    if (newThresholdSlot == state.currentThresholdSlot) {
      return null;
    }
    state.currentThresholdSlot = newThresholdSlot;

    // To get same behavior as native IntersectionObserver set hostViewport null
    // if inside an iframe
    var changeEntry = calculateChangeEntry(elementRect, opt_iframe ? null : hostViewport, intersectionRect, ratio);
    changeEntry.target = element;
    return changeEntry;
  };

  return IntersectionObserverPolyfill;
})();

exports.IntersectionObserverPolyfill = IntersectionObserverPolyfill;
function DomRectFromLayoutRect(rect) {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
    right: rect.right,
    x: rect.left,
    y: rect.top
  };
}

/**
 * Returns the ratio of the smaller box's area to the larger box's area.
 * @param {!./layout-rect.LayoutRectDef} smaller
 * @param {!./layout-rect.LayoutRectDef} larger
 * @return {number}
 */
function intersectionRatio(smaller, larger) {
  return smaller.width * smaller.height / (larger.width * larger.height);
}

/**
 * Returns the slot number that the current ratio fills in.
 * @param {!Array} sortedThreshold valid sorted IoB threshold
 * @param {number} ratio Range from [0, 1]
 * @return {number} Range from [0, threshold.length]
 * @visibleForTesting
 */

function getThresholdSlot(sortedThreshold, ratio) {
  var startIdx = 0;
  var endIdx = sortedThreshold.length;
  // 0 is a special case that does not fit into [small, large) range
  if (ratio == 0) {
    return 0;
  }
  var mid = (startIdx + endIdx) / 2 | 0;
  while (startIdx < mid) {
    var midValue = sortedThreshold[mid];
    // In the range of [small, large)
    if (ratio < midValue) {
      endIdx = mid;
    } else {
      startIdx = mid;
    }
    mid = (startIdx + endIdx) / 2 | 0;
  }
  return endIdx;
}

/**
 * Helper function to calculate the IntersectionObserver change entry.
 * @param {!./layout-rect.LayoutRectDef} element element's rect
 * @param {?./layout-rect.LayoutRectDef} hostViewport hostViewport's rect
 * @param {!./layout-rect.LayoutRectDef} intersection
 * @param {number} ratio
 * @return {!IntersectionObserverEntry}}
 */
function calculateChangeEntry(element, hostViewport, intersection, ratio) {
  // If element not in an iframe.
  // adjust all LayoutRect to hostViewport Origin.
  var boundingClientRect = element;
  var rootBounds = hostViewport;
  // If no hostViewport is provided, element is inside an non-scrollable iframe.
  // Every Layoutrect has already adjust their origin according to iframe
  // rect origin. LayoutRect position is relative to iframe origin,
  // thus relative to iframe's viewport origin because the viewport is at the
  // iframe origin. No need to adjust position here.

  if (hostViewport) {
    // If element not in an iframe.
    // adjust all LayoutRect to hostViewport Origin.
    rootBounds = /** @type {!./layout-rect.LayoutRectDef} */rootBounds;
    intersection = _layoutRect.moveLayoutRect(intersection, -hostViewport.left, -hostViewport.top);
    // The element is relative to (0, 0), while the viewport moves. So, we must
    // adjust.
    boundingClientRect = _layoutRect.moveLayoutRect(boundingClientRect, -hostViewport.left, -hostViewport.top);
    // Now, move the viewport to (0, 0)
    rootBounds = _layoutRect.moveLayoutRect(rootBounds, -hostViewport.left, -hostViewport.top);
  }

  return (/** @type {!IntersectionObserverEntry} */{
      time: typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now() - INIT_TIME,
      rootBounds: rootBounds && DomRectFromLayoutRect(rootBounds),
      boundingClientRect: DomRectFromLayoutRect(boundingClientRect),
      intersectionRect: DomRectFromLayoutRect(intersection),
      intersectionRatio: ratio
    }
  );
}

},{"./iframe-helper":29,"./layout-rect":32,"./log":33,"./utils/object":53}],31:[function(require,module,exports){
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

},{"./types":48}],32:[function(require,module,exports){
exports.__esModule = true;
exports.layoutRectLtwh = layoutRectLtwh;
exports.layoutRectFromDomRect = layoutRectFromDomRect;
exports.layoutRectsOverlap = layoutRectsOverlap;
exports.rectIntersection = rectIntersection;
exports.expandLayoutRect = expandLayoutRect;
exports.moveLayoutRect = moveLayoutRect;
exports.areMarginsChanged = areMarginsChanged;
exports.layoutRectEquals = layoutRectEquals;
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
 * The structure that combines position and size for an element. The exact
 * interpretation of position and size depends on the use case.
 *
 * @typedef {{
 *   top: number,
 *   bottom: number,
 *   left: number,
 *   right: number,
 *   width: number,
 *   height: number
 * }}
 */
var LayoutRectDef = undefined;

exports.LayoutRectDef = LayoutRectDef;
/**
 * The structure that represents the margins of an Element.
 *
 * @typedef {{
 *   top: number,
 *   right: number,
 *   bottom: number,
 *   left: number
 * }}
 */
var LayoutMarginsDef = undefined;

exports.LayoutMarginsDef = LayoutMarginsDef;
/**
 * The structure that represents a requested change to the margins of an
 * Element. Any new values specified will replace existing ones (rather than
 * being additive).
 *
 * @typedef {{
 *   top: (number|undefined),
 *   right: (number|undefined),
 *   bottom: (number|undefined),
 *   left: (number|undefined)
 * }}
 */
var LayoutMarginsChangeDef = undefined;

exports.LayoutMarginsChangeDef = LayoutMarginsChangeDef;
/**
 * Creates a layout rect based on the left, top, width and height parameters
 * in that order.
 * @param {number} left
 * @param {number} top
 * @param {number} width
 * @param {number} height
 * @return {!LayoutRectDef}
 */

function layoutRectLtwh(left, top, width, height) {
  return {
    left: left,
    top: top,
    width: width,
    height: height,
    bottom: top + height,
    right: left + width
  };
}

/**
 * Creates a layout rect based on the DOMRect, e.g. obtained from calling
 * getBoundingClientRect.
 * @param {!ClientRect} rect
 * @return {!LayoutRectDef}
 */

function layoutRectFromDomRect(rect) {
  return layoutRectLtwh(Number(rect.left), Number(rect.top), Number(rect.width), Number(rect.height));
}

/**
 * Returns true if the specified two rects overlap by a single pixel.
 * @param {!LayoutRectDef} r1
 * @param {!LayoutRectDef} r2
 * @return {boolean}
 */

function layoutRectsOverlap(r1, r2) {
  return r1.top <= r2.bottom && r2.top <= r1.bottom && r1.left <= r2.right && r2.left <= r1.right;
}

/**
 * Returns the intersection between a, b or null if there is none.
 * @param {...?LayoutRectDef|undefined} var_args
 * @return {?LayoutRectDef}
 */

function rectIntersection(var_args) {
  var x0 = -Infinity;
  var x1 = Infinity;
  var y0 = -Infinity;
  var y1 = Infinity;
  for (var i = 0; i < arguments.length; i++) {
    var current = arguments[i];
    if (!current) {
      continue;
    }
    x0 = Math.max(x0, current.left);
    x1 = Math.min(x1, current.left + current.width);
    y0 = Math.max(y0, current.top);
    y1 = Math.min(y1, current.top + current.height);
    if (x1 < x0 || y1 < y0) {
      return null;
    }
  }
  if (x1 == Infinity) {
    return null;
  }
  return layoutRectLtwh(x0, y0, x1 - x0, y1 - y0);
}

/**
 * Expand the layout rect using multiples of width and height.
 * @param {!LayoutRectDef} rect Original rect.
 * @param {number} dw Expansion in width, specified as a multiple of width.
 * @param {number} dh Expansion in height, specified as a multiple of height.
 * @return {!LayoutRectDef}
 */

function expandLayoutRect(rect, dw, dh) {
  return {
    top: rect.top - rect.height * dh,
    bottom: rect.bottom + rect.height * dh,
    left: rect.left - rect.width * dw,
    right: rect.right + rect.width * dw,
    width: rect.width * (1 + dw * 2),
    height: rect.height * (1 + dh * 2)
  };
}

/**
 * Moves the layout rect using dx and dy.
 * @param {!LayoutRectDef} rect Original rect.
 * @param {number} dx Move horizontally with this value.
 * @param {number} dy Move vertically with this value.
 * @return {!LayoutRectDef}
 */

function moveLayoutRect(rect, dx, dy) {
  if (dx == 0 && dy == 0 || rect.width == 0 && rect.height == 0) {
    return rect;
  }
  return layoutRectLtwh(rect.left + dx, rect.top + dy, rect.width, rect.height);
}

/**
 * @param {!LayoutMarginsDef} margins
 * @param {!LayoutMarginsChangeDef} change
 * @return {boolean}
 */

function areMarginsChanged(margins, change) {
  return change.top !== undefined && change.top != margins.top || change.right !== undefined && change.right != margins.right || change.bottom !== undefined && change.bottom != margins.bottom || change.left !== undefined && change.left != margins.left;
}

/**
 * @param {?LayoutRectDef} r1
 * @param {?LayoutRectDef} r2
 * @return {boolean}
 */

function layoutRectEquals(r1, r2) {
  if (!r1 || !r2) {
    return false;
  }
  return r1.left == r2.left && r1.top == r2.top && r1.width == r2.width && r1.height == r2.height;
}

},{}],33:[function(require,module,exports){
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

},{"./mode":35,"./mode-object":34,"./types":48}],34:[function(require,module,exports){
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

},{"./mode":35}],35:[function(require,module,exports){
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

},{"./string":46,"./url-parse-query-string":49}],36:[function(require,module,exports){
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

},{}],37:[function(require,module,exports){
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

// Importing the document-register-element module has the side effect
// of installing the custom elements polyfill if necessary.

var _documentRegisterElementBuildDocumentRegisterElementNode = require('document-register-element/build/document-register-element.node');

var _documentRegisterElementBuildDocumentRegisterElementNode2 = babelHelpers.interopRequireDefault(_documentRegisterElementBuildDocumentRegisterElementNode);

var _polyfillsDomtokenlistToggle = require('./polyfills/domtokenlist-toggle');

var _polyfillsDocumentContains = require('./polyfills/document-contains');

var _polyfillsMathSign = require('./polyfills/math-sign');

var _polyfillsObjectAssign = require('./polyfills/object-assign');

var _polyfillsPromise = require('./polyfills/promise');

var _polyfillsArrayIncludes = require('./polyfills/array-includes');

var _mode = require('./mode');

/**
  Only install in closure binary and not in babel/browserify binary, since in
  the closure binary we strip out the `document-register-element` install side
  effect so we can tree shake the dependency correctly and we have to make
  sure to not `install` it during dev since the `install` is done as a side
  effect in importing the module.
*/
if (!_mode.getMode().localDev) {
  _documentRegisterElementBuildDocumentRegisterElementNode2['default'](self, 'auto');
}
_polyfillsDomtokenlistToggle.install(self);
_polyfillsMathSign.install(self);
_polyfillsObjectAssign.install(self);
_polyfillsPromise.install(self);
_polyfillsDocumentContains.install(self);
_polyfillsArrayIncludes.install(self);

},{"./mode":35,"./polyfills/array-includes":38,"./polyfills/document-contains":39,"./polyfills/domtokenlist-toggle":40,"./polyfills/math-sign":41,"./polyfills/object-assign":42,"./polyfills/promise":43,"document-register-element/build/document-register-element.node":14}],38:[function(require,module,exports){
exports.__esModule = true;
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
 * Returns true if the element is in the array and false otherwise.
 *
 * @param {*} value
 * @param {number=} opt_fromIndex
 * @return {boolean}
 * @this {Array}
 */
function includes(value, opt_fromIndex) {
  var fromIndex = opt_fromIndex || 0;
  var len = this.length;
  var i = fromIndex >= 0 ? fromIndex : Math.max(len + fromIndex, 0);
  for (; i < len; i++) {
    var other = this[i];
    // If value has been found OR (value is NaN AND other is NaN)
    /*eslint "no-self-compare": 0*/
    if (other === value || value !== value && other !== other) {
      return true;
    }
  }
  return false;
}

/**
* Sets the Array.contains polyfill if it does not exist.
* @param {!Window} win
*/

function install(win) {
  if (!win.Array.prototype.includes) {
    win.Object.defineProperty(Array.prototype, 'includes', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: includes
    });
  }
}

},{}],39:[function(require,module,exports){
exports.__esModule = true;
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
 * Polyfill for `document.contains()` method. Notice that according to spec
 * `document.contains` is inclusionary.
 * See https://developer.mozilla.org/en-US/docs/Web/API/Node/contains
 * @param {?Node} node
 * @return {boolean}
 * @this {Node}
 */
function documentContainsPolyfill(node) {
  // Per spec, "contains" method is inclusionary
  // i.e. `node.contains(node) == true`. However, we still need to test
  // equality to the document itself.
  return node == this || this.documentElement.contains(node);
}

/**
 * Polyfills `HTMLDocument.contains` API.
 * @param {!Window} win
 */

function install(win) {
  if (!win.HTMLDocument.prototype.contains) {
    win.Object.defineProperty(win.HTMLDocument.prototype, 'contains', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: documentContainsPolyfill
    });
  }
}

},{}],40:[function(require,module,exports){
exports.__esModule = true;
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
 * Polyfill for `DOMTokenList.prototype.toggle(token, opt_force)` method.
 * This is specially important because IE does not support `opt_force` attribute.
 * See https://goo.gl/hgKNYY for details.
 * @param {string} token
 * @param {boolean=} opt_force
 * @this {DOMTokenList}
 * @return {boolean}
 */
function domTokenListTogglePolyfill(token, opt_force) {
  var remove = opt_force === undefined ? this.contains(token) : !opt_force;
  if (remove) {
    this.remove(token);
    return false;
  } else {
    this.add(token);
    return true;
  }
}

/**
 * Polyfills `DOMTokenList.prototype.toggle` API in IE.
 * @param {!Window} win
 */

function install(win) {
  if (isIe(win) && win.DOMTokenList) {
    win.Object.defineProperty(win.DOMTokenList.prototype, 'toggle', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: domTokenListTogglePolyfill
    });
  }
}

/**
 * Whether the current browser is a IE browser.
 * @param {!Window} win
 * @return {boolean}
 */
function isIe(win) {
  return (/Trident|MSIE|IEMobile/i.test(win.navigator.userAgent)
  );
}

},{}],41:[function(require,module,exports){
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

},{}],42:[function(require,module,exports){
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

},{}],43:[function(require,module,exports){
exports.__esModule = true;
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

var _promisePjsPromise = require('promise-pjs/promise');

var Promise = babelHelpers.interopRequireWildcard(_promisePjsPromise);

/**
 * Sets the Promise polyfill if it does not exist.
 * @param {!Window} win
 */

function install(win) {
  if (!win.Promise) {
    win.Promise = /** @type {?} */Promise;
    // In babel the * export is an Object with a default property.
    // In closure compiler it is the Promise function itself.
    if (Promise['default']) {
      win.Promise = Promise['default'];
    }
    // We copy the individual static methods, because closure
    // compiler flattens the polyfill namespace.
    win.Promise.resolve = Promise.resolve;
    win.Promise.reject = Promise.reject;
    win.Promise.all = Promise.all;
    win.Promise.race = Promise.race;
  }
}

},{"promise-pjs/promise":15}],44:[function(require,module,exports){
exports.__esModule = true;
exports.getExistingServiceOrNull = getExistingServiceOrNull;
exports.getExistingServiceInEmbedScope = getExistingServiceInEmbedScope;
exports.getExistingServiceForDocInEmbedScope = getExistingServiceForDocInEmbedScope;
exports.installServiceInEmbedScope = installServiceInEmbedScope;
exports.getService = getService;
exports.registerServiceBuilder = registerServiceBuilder;
exports.registerServiceBuilderForDoc = registerServiceBuilderForDoc;
exports.getServicePromise = getServicePromise;
exports.getServicePromiseOrNull = getServicePromiseOrNull;
exports.getServiceForDoc = getServiceForDoc;
exports.getServicePromiseForDoc = getServicePromiseForDoc;
exports.getServicePromiseOrNullForDoc = getServicePromiseOrNullForDoc;
exports.setParentWindow = setParentWindow;
exports.getParentWindow = getParentWindow;
exports.getTopWindow = getTopWindow;
exports.getParentWindowFrameElement = getParentWindowFrameElement;
exports.getAmpdoc = getAmpdoc;
exports.isDisposable = isDisposable;
exports.assertDisposable = assertDisposable;
exports.disposeServicesForDoc = disposeServicesForDoc;
exports.disposeServicesForEmbed = disposeServicesForEmbed;
exports.isEmbeddable = isEmbeddable;
exports.adoptServiceForEmbed = adoptServiceForEmbed;
exports.adoptServiceForEmbedIfEmbeddable = adoptServiceForEmbedIfEmbeddable;
exports.resetServiceForTesting = resetServiceForTesting;
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

// Requires polyfills in immediate side effect.

require('./polyfills');

var _log = require('./log');

/**
 * Holds info about a service.
 * - obj: Actual service implementation when available.
 * - promise: Promise for the obj.
 * - resolve: Function to resolve the promise with the object.
 * - context: Argument for ctor, either a window or an ampdoc.
 * - ctor: Function that constructs and returns the service.
 * @typedef {{
 *   obj: (?Object),
 *   promise: (?Promise),
 *   resolve: (?function(!Object)),
 *   context: (?Window|?./service/ampdoc-impl.AmpDoc),
 *   ctor: (?function(new:Object, !Window)|
 *          ?function(new:Object, !./service/ampdoc-impl.AmpDoc)),
 * }}
 */
var ServiceHolderDef = undefined;

/**
 * This interface provides a `dispose` method that will be called by
 * runtime when a service needs to be disposed of.
 * @interface
 */

var Disposable = (function () {
  function Disposable() {
    babelHelpers.classCallCheck(this, Disposable);
  }

  /**
   * This interface provides a `adoptEmbedWindow` method that will be called by
   * runtime for a new embed window.
   * @interface
   */

  /**
   * Instructs the service to release any resources it might be holding. Can
   * be called only once in the lifecycle of a service.
   */

  Disposable.prototype.dispose = function dispose() {};

  return Disposable;
})();

exports.Disposable = Disposable;

var EmbeddableService = (function () {
  function EmbeddableService() {
    babelHelpers.classCallCheck(this, EmbeddableService);
  }

  /**
   * Returns a service or null with the given id.
   * @param {!Window} win
   * @param {string} id
   * @return {?Object} The service.
   */

  /**
   * Instructs the service to adopt the embed window and add any necessary
   * listeners and resources.
   * @param {!Window} unusedEmbedWin
   */

  EmbeddableService.prototype.adoptEmbedWindow = function adoptEmbedWindow(unusedEmbedWin) {};

  return EmbeddableService;
})();

exports.EmbeddableService = EmbeddableService;

function getExistingServiceOrNull(win, id) {
  win = getTopWindow(win);
  if (isServiceRegistered(win, id)) {
    return getServiceInternal(win, id);
  } else {
    return null;
  }
}

/**
 * Returns a service with the given id. Assumes that it has been registered
 * already.
 * @param {!Window} win
 * @param {string} id
 * @return {!Object} The service.
 */

function getExistingServiceInEmbedScope(win, id) {
  // First, try to resolve via local (embed) window.
  var local = getLocalExistingServiceForEmbedWinOrNull(win, id);
  if (local) {
    return local;
  }
  // Fallback to top-level window.
  return getService(win, id);
}

/**
 * Returns a service with the given id. Assumes that it has been constructed
 * already.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @param {string} id
 * @return {!Object} The service.
 */

function getExistingServiceForDocInEmbedScope(nodeOrDoc, id) {
  // First, try to resolve via local (embed) window.
  if (nodeOrDoc.nodeType) {
    // If a node is passed, try to resolve via this node.
    var win = /** @type {!Document} */(nodeOrDoc.ownerDocument || nodeOrDoc).defaultView;
    var local = getLocalExistingServiceForEmbedWinOrNull(win, id);
    if (local) {
      return local;
    }
  }
  // Fallback to ampdoc.
  return getServiceForDoc(nodeOrDoc, id);
}

/**
 * Installs a service override on amp-doc level.
 * @param {!Window} embedWin
 * @param {string} id
 * @param {!Object} service The service.
 */

function installServiceInEmbedScope(embedWin, id, service) {
  var topWin = getTopWindow(embedWin);
  _log.dev().assert(embedWin != topWin, 'Service override can only be installed in embed window: %s', id);
  _log.dev().assert(!getLocalExistingServiceForEmbedWinOrNull(embedWin, id), 'Service override has already been installed: %s', id);
  registerServiceInternal(embedWin, embedWin, id, function () {
    return service;
  });
  // Force service to build
  getServiceInternal(embedWin, id);
}

/**
 * @param {!Window} embedWin
 * @param {string} id
 * @return {?Object}
 */
function getLocalExistingServiceForEmbedWinOrNull(embedWin, id) {
  // Note that this method currently only resolves against the given window.
  // It does not try to go all the way up the parent window chain. We can change
  // this in the future, but for now this gives us a better performance.
  var topWin = getTopWindow(embedWin);
  if (embedWin != topWin && isServiceRegistered(embedWin, id)) {
    return getServiceInternal(embedWin, id);
  } else {
    return null;
  }
}

/**
 * Returns a service for the given id and window (a per-window singleton).
 * Users should typically wrap this as a special purpose function (e.g.
 * `vsyncFor(win)`) for type safety and because the factory should not be
 * passed around.
 * @param {!Window} win
 * @param {string} id of the service.
 * @template T
 * @return {T}
 */

function getService(win, id) {
  win = getTopWindow(win);
  return getServiceInternal(win, id);
}

/**
 * Registers a service given a class to be used as implementation.
 * @param {!Window} win
 * @param {string} id of the service.
 * @param {function(new:Object, !Window)} constructor
 * @param {boolean=} opt_instantiate Whether to immediately create the service
 */

function registerServiceBuilder(win, id, constructor, opt_instantiate) {
  win = getTopWindow(win);
  registerServiceInternal(win, win, id, constructor);
  if (opt_instantiate) {
    getServiceInternal(win, id);
  }
}

/**
 * Returns a service and registers it given a class to be used as
 * implementation.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @param {string} id of the service.
 * @param {function(new:Object, !./service/ampdoc-impl.AmpDoc)} constructor
 * @param {boolean=} opt_instantiate Whether to immediately create the service
 */

function registerServiceBuilderForDoc(nodeOrDoc, id, constructor, opt_instantiate) {
  var ampdoc = getAmpdoc(nodeOrDoc);
  var holder = getAmpdocServiceHolder(ampdoc);
  registerServiceInternal(holder, ampdoc, id, constructor);
  if (opt_instantiate) {
    getServiceInternal(holder, id);
  }
}

/**
 * Returns a promise for a service for the given id and window. Also expects
 * an element that has the actual implementation. The promise resolves when
 * the implementation loaded.
 * Users should typically wrap this as a special purpose function (e.g.
 * `vsyncFor(win)`) for type safety and because the factory should not be
 * passed around.
 * @param {!Window} win
 * @param {string} id of the service.
 * @return {!Promise<!Object>}
 */

function getServicePromise(win, id) {
  return getServicePromiseInternal(win, id);
}

/**
 * Like getServicePromise but returns null if the service was never registered.
 * @param {!Window} win
 * @param {string} id of the service.
 * @return {?Promise<!Object>}
 */

function getServicePromiseOrNull(win, id) {
  return getServicePromiseOrNullInternal(win, id);
}

/**
 * Returns a service for the given id and ampdoc (a per-ampdoc singleton).
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @param {string} id of the service.
 * @return {T}
 * @template T
 */

function getServiceForDoc(nodeOrDoc, id) {
  var ampdoc = getAmpdoc(nodeOrDoc);
  var holder = getAmpdocServiceHolder(ampdoc);
  return getServiceInternal(holder, id);
}

/**
 * Returns a promise for a service for the given id and ampdoc. Also expects
 * a service that has the actual implementation. The promise resolves when
 * the implementation loaded.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @param {string} id of the service.
 * @return {!Promise<!Object>}
 */

function getServicePromiseForDoc(nodeOrDoc, id) {
  return getServicePromiseInternal(getAmpdocServiceHolder(nodeOrDoc), id);
}

/**
 * Like getServicePromiseForDoc but returns null if the service was never
 * registered for this ampdoc.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @param {string} id of the service.
 * @return {?Promise<!Object>}
 */

function getServicePromiseOrNullForDoc(nodeOrDoc, id) {
  return getServicePromiseOrNullInternal(getAmpdocServiceHolder(nodeOrDoc), id);
}

/**
 * Set the parent and top windows on a child window (friendly iframe).
 * @param {!Window} win
 * @param {!Window} parentWin
 */

function setParentWindow(win, parentWin) {
  win.__AMP_PARENT = parentWin;
  win.__AMP_TOP = getTopWindow(parentWin);
}

/**
 * Returns the parent window for a child window (friendly iframe).
 * @param {!Window} win
 * @return {!Window}
 */

function getParentWindow(win) {
  return win.__AMP_PARENT || win;
}

/**
 * Returns the top window where AMP Runtime is installed for a child window
 * (friendly iframe).
 * @param {!Window} win
 * @return {!Window}
 */

function getTopWindow(win) {
  return win.__AMP_TOP || win;
}

/**
 * Returns the parent "friendly" iframe if the node belongs to a child window.
 * @param {!Node} node
 * @param {!Window} topWin
 * @return {?HTMLIFrameElement}
 */

function getParentWindowFrameElement(node, topWin) {
  var childWin = (node.ownerDocument || node).defaultView;
  if (childWin && childWin != topWin && getTopWindow(childWin) == topWin) {
    try {
      return (/** @type {?HTMLIFrameElement} */childWin.frameElement
      );
    } catch (e) {
      // Ignore the error.
    }
  }
  return null;
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!./service/ampdoc-impl.AmpDoc}
 */

function getAmpdoc(nodeOrDoc) {
  if (nodeOrDoc.nodeType) {
    var win = /** @type {!Document} */(nodeOrDoc.ownerDocument || nodeOrDoc).defaultView;
    return getAmpdocService(win).getAmpDoc( /** @type {!Node} */nodeOrDoc);
  }
  return (/** @type {!./service/ampdoc-impl.AmpDoc} */nodeOrDoc
  );
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!./service/ampdoc-impl.AmpDoc|!Window}
 */
function getAmpdocServiceHolder(nodeOrDoc) {
  var ampdoc = getAmpdoc(nodeOrDoc);
  return ampdoc.isSingleDoc() ? ampdoc.win : ampdoc;
}

/**
 * This is essentially a duplicate of `ampdoc.js`, but necessary to avoid
 * circular dependencies.
 * @param {!Window} win
 * @return {!./service/ampdoc-impl.AmpDocService}
 */
function getAmpdocService(win) {
  return (/** @type {!./service/ampdoc-impl.AmpDocService} */getService(win, 'ampdoc')
  );
}

/**
 * Get service `id` from `holder`. Assumes the service
 * has already been registered.
 * @param {!Object} holder Object holding the service instance.
 * @param {string} id of the service.
 * @return {Object}
 * @template T
 */
function getServiceInternal(holder, id) {
  _log.dev().assert(isServiceRegistered(holder, id), 'Expected service ' + id + ' to be registered');
  var services = getServices(holder);
  var s = services[id];
  if (!s.obj) {
    _log.dev().assert(s.ctor, 'Service ' + id + ' registered without ctor nor impl.');
    _log.dev().assert(s.context, 'Service ' + id + ' registered without context.');
    s.obj = new s.ctor(s.context);
    _log.dev().assert(s.obj, 'Service ' + id + ' constructed to null.');
    s.ctor = null;
    s.context = null;
    // The service may have been requested already, in which case we have a
    // pending promise we need to fulfill.
    if (s.resolve) {
      s.resolve(s.obj);
    }
  }
  return s.obj;
}

/**
 * @param {!Object} holder Object holding the service instance.
 * @param {!Window|!./service/ampdoc-impl.AmpDoc} context Win or AmpDoc.
 * @param {string} id of the service.
 * @param {?function(new:Object, !Window)|
 *         ?function(new:Object, !./service/ampdoc-impl.AmpDoc)}
 *     ctor Constructor function to new the service. Called with context.
 */
function registerServiceInternal(holder, context, id, ctor) {
  var services = getServices(holder);
  var s = services[id];

  if (!s) {
    s = services[id] = {
      obj: null,
      promise: null,
      resolve: null,
      context: null,
      ctor: null
    };
  }

  if (s.ctor || s.obj) {
    // Service already registered.
    return;
  }

  s.ctor = ctor;
  s.context = context;

  // The service may have been requested already, in which case there is a
  // pending promise that needs to fulfilled.
  if (s.resolve) {
    // getServiceInternal will resolve the promise.
    getServiceInternal(holder, id);
  }
}

/**
 * @param {!Object} holder
 * @param {string} id of the service.
 * @return {!Promise<!Object>}
 */
function getServicePromiseInternal(holder, id) {
  var cached = getServicePromiseOrNullInternal(holder, id);
  if (cached) {
    return cached;
  }
  // Service is not registered.

  // TODO(@cramforce): Add a check that if the element is eventually registered
  // that the service is actually provided and this promise resolves.
  var resolve = undefined;
  var promise = new Promise(function (r) {
    resolve = r;
  });
  var services = getServices(holder);
  services[id] = {
    obj: null,
    promise: promise,
    resolve: resolve,
    context: null,
    ctor: null
  };
  return promise;
}

/**
 * Returns a promise for service `id` if the service has been registered
 * on `holder`.
 * @param {!Object} holder
 * @param {string} id of the service.
 * @return {?Promise<!Object>}
 */
function getServicePromiseOrNullInternal(holder, id) {
  var services = getServices(holder);
  var s = services[id];
  if (s) {
    if (s.promise) {
      return s.promise;
    } else {
      // Instantiate service if not already instantiated.
      getServiceInternal(holder, id);
      return s.promise = Promise.resolve( /** @type {!Object} */s.obj);
    }
  }
  return null;
}

/**
 * Returns the object that holds the services registered in a holder.
 * @param {!Object} holder
 * @return {!Object<string,!ServiceHolderDef>}
 */
function getServices(holder) {
  var services = holder.services;
  if (!services) {
    services = holder.services = {};
  }
  return services;
}

/**
 * Whether the specified service implements `Disposable` interface.
 * @param {!Object} service
 * @return {boolean}
 */

function isDisposable(service) {
  return typeof service.dispose == 'function';
}

/**
 * Asserts that the specified service implements `Disposable` interface and
 * typecasts the instance to `Disposable`.
 * @param {!Object} service
 * @return {!Disposable}
 */

function assertDisposable(service) {
  _log.dev().assert(isDisposable(service), 'required to implement Disposable');
  return (/** @type {!Disposable} */service
  );
}

/**
 * Disposes all disposable (implements `Disposable` interface) services in
 * ampdoc scope.
 * @param {!./service/ampdoc-impl.AmpDoc} ampdoc
 */

function disposeServicesForDoc(ampdoc) {
  disposeServicesInternal(ampdoc);
}

/**
 * Disposes all disposable (implements `Disposable` interface) services in
 * embed scope.
 * @param {!Window} embedWin
 */

function disposeServicesForEmbed(embedWin) {
  disposeServicesInternal(embedWin);
}

/**
 * @param {!Object} holder Object holding the service instances.
 */
function disposeServicesInternal(holder) {
  // TODO(dvoytenko): Consider marking holder as destroyed for later-arriving
  // service to be canceled automatically.
  var services = getServices(holder);

  var _loop = function (id) {
    if (!Object.prototype.hasOwnProperty.call(services, id)) {
      return 'continue';
    }
    var serviceHolder = services[id];
    if (serviceHolder.obj) {
      disposeServiceInternal(id, serviceHolder.obj);
    } else if (serviceHolder.promise) {
      serviceHolder.promise.then(function (instance) {
        return disposeServiceInternal(id, instance);
      });
    }
  };

  for (var id in services) {
    var _ret = _loop(id);

    if (_ret === 'continue') continue;
  }
}

/**
 * @param {string} id
 * @param {!Object} service
 */
function disposeServiceInternal(id, service) {
  if (!isDisposable(service)) {
    return;
  }
  try {
    assertDisposable(service).dispose();
  } catch (e) {
    // Ensure that a failure to dispose a service does not disrupt other
    // services.
    _log.dev().error('SERVICE', 'failed to dispose service', id, e);
  }
}

/**
 * Whether the specified service implements `EmbeddableService` interface.
 * @param {!Object} service
 * @return {boolean}
 */

function isEmbeddable(service) {
  return typeof service.adoptEmbedWindow == 'function';
}

/**
 * Adopts an embeddable (implements `EmbeddableService` interface) service
 * in embed scope.
 * @param {!Window} embedWin
 * @param {string} serviceId
 */

function adoptServiceForEmbed(embedWin, serviceId) {
  var adopted = adoptServiceForEmbedIfEmbeddable(embedWin, serviceId);
  _log.dev().assert(adopted, serviceId + ' required to implement EmbeddableService.');
}

/**
 * Adopts an embeddable (implements `EmbeddableService` interface) service
 * in embed scope.
 * @param {!Window} embedWin
 * @param {string} serviceId
 * @return {boolean}
 */

function adoptServiceForEmbedIfEmbeddable(embedWin, serviceId) {
  var frameElement = /** @type {!Node} */_log.dev().assert(embedWin.frameElement, 'frameElement not found for embed');
  var service = getServiceForDoc(frameElement, serviceId);
  if (isEmbeddable(service)) {
    service.adoptEmbedWindow(embedWin);
    return true;
  }
  return false;
}

/**
 * Resets a single service, so it gets recreated on next getService invocation.
 * @param {!Object} holder
 * @param {string} id of the service.
 */

function resetServiceForTesting(holder, id) {
  if (holder.services) {
    holder.services[id] = null;
  }
}

/**
 * @param {!Object} holder Object holding the service instance.
 * @param {string} id of the service.
 * @return {boolean}
 */
function isServiceRegistered(holder, id) {
  var service = holder.services && holder.services[id];
  // All registered services must have an implementation or a constructor.
  return !!(service && (service.ctor || service.obj));
}

},{"./log":33,"./polyfills":37}],45:[function(require,module,exports){
exports.__esModule = true;
exports.accessServiceForDoc = accessServiceForDoc;
exports.accessServiceForDocOrNull = accessServiceForDocOrNull;
exports.actionServiceForDoc = actionServiceForDoc;
exports.activityForDoc = activityForDoc;
exports.batchedXhrFor = batchedXhrFor;
exports.bindForDoc = bindForDoc;
exports.cidForDoc = cidForDoc;
exports.cidForDocOrNull = cidForDocOrNull;
exports.documentInfoForDoc = documentInfoForDoc;
exports.extensionsFor = extensionsFor;
exports.historyForDoc = historyForDoc;
exports.inputFor = inputFor;
exports.parallaxForDoc = parallaxForDoc;
exports.performanceFor = performanceFor;
exports.performanceForOrNull = performanceForOrNull;
exports.platformFor = platformFor;
exports.resourcesForDoc = resourcesForDoc;
exports.shareTrackingForOrNull = shareTrackingForOrNull;
exports.storageForDoc = storageForDoc;
exports.templatesFor = templatesFor;
exports.timerFor = timerFor;
exports.urlReplacementsForDoc = urlReplacementsForDoc;
exports.userNotificationManagerFor = userNotificationManagerFor;
exports.variantForOrNull = variantForOrNull;
exports.videoManagerForDoc = videoManagerForDoc;
exports.viewerForDoc = viewerForDoc;
exports.viewerPromiseForDoc = viewerPromiseForDoc;
exports.vsyncFor = vsyncFor;
exports.viewportForDoc = viewportForDoc;
exports.xhrFor = xhrFor;
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

var _service = require('./service');

var _elementService = require('./element-service');

/**
 * Returns a promise for the Access service.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!Promise<!AccessService>}
 */

function accessServiceForDoc(nodeOrDoc) {
  return (/** @type {!Promise<!AccessService>} */_elementService.getElementServiceForDoc(nodeOrDoc, 'access', 'amp-access')
  );
}

/**
 * Returns a promise for the Access service or a promise for null if the service
 * is not available on the current page.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!Promise<?AccessService>}
 */

function accessServiceForDocOrNull(nodeOrDoc) {
  return (/** @type {!Promise<?AccessService>} */_elementService.getElementServiceIfAvailableForDoc(nodeOrDoc, 'access', 'amp-access')
  );
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!./service/action-impl.ActionService}
 */

function actionServiceForDoc(nodeOrDoc) {
  return (/** @type {!./service/action-impl.ActionService} */_service.getExistingServiceForDocInEmbedScope(nodeOrDoc, 'action')
  );
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!Promise<!Activity>}
 */

function activityForDoc(nodeOrDoc) {
  return (/** @type {!Promise<!Activity>} */_elementService.getElementServiceForDoc(nodeOrDoc, 'activity', 'amp-analytics')
  );
}

/**
 * @param {!Window} window
 * @return {!./service/batched-xhr-impl.BatchedXhr}
 */

function batchedXhrFor(window) {
  return (/** @type {!./service/batched-xhr-impl.BatchedXhr} */_service.getService(window, 'batched-xhr')
  );
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!Promise<!../extensions/amp-bind/0.1/bind-impl.Bind>}
 */

function bindForDoc(nodeOrDoc) {
  return (/** @type {!Promise<!../extensions/amp-bind/0.1/bind-impl.Bind>} */_elementService.getElementServiceForDocInEmbedScope(nodeOrDoc, 'bind', 'amp-bind')
  );
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!Promise<!../extensions/amp-analytics/0.1/cid-impl.Cid>}
 */

function cidForDoc(nodeOrDoc) {
  return (/** @type {!Promise<!../extensions/amp-analytics/0.1/cid-impl.Cid>} */ // eslint-disable-line max-len
    _elementService.getElementServiceForDoc(nodeOrDoc, 'cid', 'amp-analytics')
  );
}

/**
 * Returns a promise for the CID service or a promise for null if the service
 * is not available on the current page.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!Promise<?../extensions/amp-analytics/0.1/cid-impl.Cid>}
 */

function cidForDocOrNull(nodeOrDoc) {
  return (/** @type {!Promise<?../extensions/amp-analytics/0.1/cid-impl.Cid>} */ // eslint-disable-line max-len
    _elementService.getElementServiceIfAvailableForDoc(nodeOrDoc, 'cid', 'amp-analytics')
  );
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!./service/document-info-impl.DocumentInfoDef} Info about the doc
 */

function documentInfoForDoc(nodeOrDoc) {
  return (/** @type {!./service/document-info-impl.DocInfo} */_service.getServiceForDoc(nodeOrDoc, 'documentInfo').get()
  );
}

/**
 * @param {!Window} window
 * @return {!./service/extensions-impl.Extensions}
 */

function extensionsFor(window) {
  return (/** @type {!./service/extensions-impl.Extensions} */_service.getService(window, 'extensions')
  );
}

/**
 * Returns service implemented in service/history-impl.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!./service/history-impl.History}
 */

function historyForDoc(nodeOrDoc) {
  return (/** @type {!./service/history-impl.History} */_service.getServiceForDoc(nodeOrDoc, 'history')
  );
}

/**
 * @param {!Window} win
 * @return {!./input.Input}
 */

function inputFor(win) {
  return _service.getService(win, 'input');
}

;

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!./service/parallax-impl.ParallaxService}
 */

function parallaxForDoc(nodeOrDoc) {
  return (/** @type {!./service/parallax-impl.ParallaxService} */_service.getServiceForDoc(nodeOrDoc, 'amp-fx-parallax')
  );
}

/**
 * @param {!Window} window
 * @return {!./service/performance-impl.Performance}
 */

function performanceFor(window) {
  return (/** @type {!./service/performance-impl.Performance}*/_service.getService(window, 'performance')
  );
}

/**
 * @param {!Window} window
 * @return {!./service/performance-impl.Performance}
 */

function performanceForOrNull(window) {
  return (/** @type {!./service/performance-impl.Performance}*/_service.getExistingServiceOrNull(window, 'performance')
  );
}

/**
 * @param {!Window} window
 * @return {!./service/platform-impl.Platform}
 */

function platformFor(window) {
  return (/** @type {!./service/platform-impl.Platform} */_service.getService(window, 'platform')
  );
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!./service/resources-impl.Resources}
 */

function resourcesForDoc(nodeOrDoc) {
  return (/** @type {!./service/resources-impl.Resources} */_service.getServiceForDoc(nodeOrDoc, 'resources')
  );
}

/**
 * @param {!Window} win
 * @return {?Promise<?{incomingFragment: string, outgoingFragment: string}>}
 */

function shareTrackingForOrNull(win) {
  return (/** @type {
         !Promise<?{incomingFragment: string, outgoingFragment: string}>} */_elementService.getElementServiceIfAvailable(win, 'share-tracking', 'amp-share-tracking', true)
  );
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!Promise<!./service/storage-impl.Storage>}
 */

function storageForDoc(nodeOrDoc) {
  return (/** @type {!Promise<!./service/storage-impl.Storage>} */_service.getServicePromiseForDoc(nodeOrDoc, 'storage')
  );
}

/**
 * @param {!Window} window
 * @return {!./service/template-impl.Templates}
 */

function templatesFor(window) {
  return (/** @type {!./service/template-impl.Templates} */_service.getService(window, 'templates')
  );
}

/**
 * @param {!Window} window
 * @return {!./service/timer-impl.Timer}
 */

function timerFor(window) {
  return (/** @type {!./service/timer-impl.Timer} */_service.getService(window, 'timer')
  );
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!./service/url-replacements-impl.UrlReplacements}
 */

function urlReplacementsForDoc(nodeOrDoc) {
  return (/** @type {!./service/url-replacements-impl.UrlReplacements} */_service.getExistingServiceForDocInEmbedScope(nodeOrDoc, 'url-replace')
  );
}

/**
 * @param {!Window} window
 * @return {!Promise<!UserNotificationManager>}
 */

function userNotificationManagerFor(window) {
  return (/** @type {!Promise<!UserNotificationManager>} */_elementService.getElementService(window, 'userNotificationManager', 'amp-user-notification')
  );
}

/**
 * Returns a promise for the experiment variants or a promise for null if it is
 * not available on the current page.
 * @param {!Window} win
 * @return {!Promise<?Object<string>>}
 */

function variantForOrNull(win) {
  return (/** @type {!Promise<?Object<string>>} */_elementService.getElementServiceIfAvailable(win, 'variant', 'amp-experiment', true)
  );
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!./service/video-manager-impl.VideoManager}
 */

function videoManagerForDoc(nodeOrDoc) {
  return (/** @type {!./service/video-manager-impl.VideoManager} */_service.getServiceForDoc(nodeOrDoc, 'video-manager')
  );
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!./service/viewer-impl.Viewer}
 */

function viewerForDoc(nodeOrDoc) {
  return (/** @type {!./service/viewer-impl.Viewer} */_service.getServiceForDoc(nodeOrDoc, 'viewer')
  );
}

/**
 * Returns promise for the viewer. This is an unusual case and necessary only
 * for services that need reference to the viewer before it has been
 * initialized. Most of the code, however, just should use `viewerForDoc`.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!Promise<!./service/viewer-impl.Viewer>}
 */

function viewerPromiseForDoc(nodeOrDoc) {
  return (/** @type {!Promise<!./service/viewer-impl.Viewer>} */_service.getServicePromiseForDoc(nodeOrDoc, 'viewer')
  );
}

/**
 * @param {!Window} window
 * @return {!./service/vsync-impl.Vsync}
 */

function vsyncFor(window) {
  return (/** @type {!./service/vsync-impl.Vsync} */_service.getService(window, 'vsync')
  );
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!./service/viewport-impl.Viewport}
 */

function viewportForDoc(nodeOrDoc) {
  return (/** @type {!./service/viewport-impl.Viewport} */_service.getServiceForDoc(nodeOrDoc, 'viewport')
  );
}

/**
 * @param {!Window} window
 * @return {!./service/xhr-impl.Xhr}
 */

function xhrFor(window) {
  return (/** @type {!./service/xhr-impl.Xhr} */_service.getService(window, 'xhr')
  );
}

},{"./element-service":23,"./service":44}],46:[function(require,module,exports){
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

},{}],47:[function(require,module,exports){
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

},{"./string":46,"./utils/object.js":53}],48:[function(require,module,exports){
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

},{}],49:[function(require,module,exports){
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

},{}],50:[function(require,module,exports){
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

},{"./config":18,"./log":33,"./mode":35,"./string":46,"./types":48,"./url-parse-query-string":49}],51:[function(require,module,exports){
exports.__esModule = true;
exports.filterSplice = filterSplice;
exports.findIndex = findIndex;
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
 * A bit like Array#filter, but removes elements that filter false from the
 * array. Returns the filtered items.
 *
 * @param {!Array<T>} array
 * @param {function(T, number, !Array<T>):boolean} filter
 * @return {!Array<T>}
 * @template T
 */

function filterSplice(array, filter) {
  var splice = [];
  for (var i = 0; i < array.length; i++) {
    var item = array[i];
    if (!filter(item, i, array)) {
      splice.push(item);
      array.splice(i, 1);
      i--;
    }
  }
  return splice;
}

/**
 * Returns the index of the first element matching the predicate.
 * Like Array#findIndex.
 *
 * @param {!Array<T>} array
 * @param {function(T, number, !Array<T>):boolean} predicate
 * @return {number}
 * @template T
 */

function findIndex(array, predicate) {
  for (var i = 0; i < array.length; i++) {
    if (predicate(array[i], i, array)) {
      return i;
    }
  }
  return -1;
}

},{}],52:[function(require,module,exports){
exports.__esModule = true;
exports.utf8Decode = utf8Decode;
exports.utf8DecodeSync = utf8DecodeSync;
exports.utf8Encode = utf8Encode;
exports.utf8EncodeSync = utf8EncodeSync;
exports.stringToBytes = stringToBytes;
exports.bytesToString = bytesToString;
exports.bytesToUInt32 = bytesToUInt32;
exports.getCryptoRandomBytesArray = getCryptoRandomBytesArray;
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

var _log = require('../log');

var _types = require('../types');

/**
 * Interpret a byte array as a UTF-8 string.
 * @param {!BufferSource} bytes
 * @return {!Promise<string>}
 */

function utf8Decode(bytes) {
  if (typeof TextDecoder !== 'undefined') {
    return Promise.resolve(new TextDecoder('utf-8').decode(bytes));
  }
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onerror = function () {
      reject(reader.error);
    };
    reader.onloadend = function () {
      resolve(reader.result);
    };
    reader.readAsText(new Blob([bytes]));
  });
}

// TODO(aghassemi, #6139): Remove the async version of utf8 encoding and rename
// the sync versions to the canonical utf8Decode/utf8Encode.
/**
 * Interpret a byte array as a UTF-8 string.
 * @param {!BufferSource} bytes
 * @return {!string}
 */

function utf8DecodeSync(bytes) {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(bytes);
  }
  var asciiString = bytesToString(new Uint8Array(bytes.buffer || bytes));
  return decodeURIComponent(escape(asciiString));
}

/**
 * Turn a string into UTF-8 bytes.
 * @param {string} string
 * @return {!Promise<!Uint8Array>}
 */

function utf8Encode(string) {
  if (typeof TextEncoder !== 'undefined') {
    return Promise.resolve(new TextEncoder('utf-8').encode(string));
  }
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onerror = function () {
      reject(reader.error);
    };
    reader.onloadend = function () {
      // Because we used readAsArrayBuffer, we know the result must be an
      // ArrayBuffer.
      resolve(new Uint8Array( /** @type {ArrayBuffer} */reader.result));
    };
    reader.readAsArrayBuffer(new Blob([string]));
  });
}

/**
 * Turn a string into UTF-8 bytes.
 * @param {string} string
 * @return {!Uint8Array}
 */

function utf8EncodeSync(string) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder('utf-8').encode(string);
  }
  return stringToBytes(unescape(encodeURIComponent(string)));
}

/**
 * Converts a string which holds 8-bit code points, such as the result of atob,
 * into a Uint8Array with the corresponding bytes.
 * If you have a string of characters, you probably want to be using utf8Encode.
 * @param {string} str
 * @return {!Uint8Array}
 */

function stringToBytes(str) {
  var bytes = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) {
    var charCode = str.charCodeAt(i);
    _log.dev().assert(charCode <= 255, 'Characters must be in range [0,255]');
    bytes[i] = charCode;
  }
  return bytes;
}

;

/**
 * Converts a 8-bit bytes array into a string
 * @param {!Uint8Array} bytes
 * @return {string}
 */

function bytesToString(bytes) {
  return String.fromCharCode.apply(String, _types.toArray(bytes));
}

;

/**
 * Converts a 4-item byte array to an unsigned integer.
 * Assumes bytes are big endian.
 * @param {!Uint8Array} bytes
 * @return {number}
 */

function bytesToUInt32(bytes) {
  if (bytes.length != 4) {
    throw new Error('Received byte array with length != 4');
  }
  var val = (bytes[0] & 0xFF) << 24 | (bytes[1] & 0xFF) << 16 | (bytes[2] & 0xFF) << 8 | bytes[3] & 0xFF;
  // Convert to unsigned.
  return val >>> 0;
}

/**
 * Generate a random bytes array with specific length using
 * win.crypto.getRandomValues. Return null if it is not available.
 * @param {!number} length
 * @return {?Uint8Array}
 */

function getCryptoRandomBytesArray(win, length) {
  if (!win.crypto || !win.crypto.getRandomValues) {
    return null;
  }

  // Widely available in browsers we support:
  // http://caniuse.com/#search=getRandomValues
  var uint8array = new Uint8Array(length);
  win.crypto.getRandomValues(uint8array);
  return uint8array;
}

},{"../log":33,"../types":48}],53:[function(require,module,exports){
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

},{"../types":48}],54:[function(require,module,exports){
exports.__esModule = true;
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

var _object = require('./object');

/**
 * This object tracts signals and allows blocking until a signal has been
 * received.
 */

var Signals = (function () {
  function Signals() {
    babelHelpers.classCallCheck(this, Signals);

    /**
     * A mapping from a signal name to the signal response: either time or
     * an error.
     * @private @const {!Object<string, (time|!Error)>}
     */
    this.map_ = _object.map();

    /**
     * A mapping from a signal name to the signal promise, resolve and reject.
     * Only allocated when promise has been requested.
     * @private {?Object<string, {
     *   promise: !Promise,
     *   resolve: (function(time)|undefined),
     *   reject: (function(!Error)|undefined)
     * }>}
     */
    this.promiseMap_ = null;
  }

  /**
   * Returns the current known value of the signal. If signal is not yet
   * available, `null` is returned.
   * @param {string} name
   * @return {number|!Error|null}
   */

  Signals.prototype.get = function get(name) {
    return this.map_[name] || null;
  };

  /**
   * Returns the promise that's resolved when the signal is triggered. The
   * resolved value is the time of the signal.
   * @param {string} name
   * @return {!Promise<time>}
   */

  Signals.prototype.whenSignal = function whenSignal(name) {
    var promiseStruct = this.promiseMap_ && this.promiseMap_[name];
    if (!promiseStruct) {
      var result = this.map_[name];
      if (result != null) {
        // Immediately resolve signal.
        var promise = typeof result == 'number' ? Promise.resolve(result) : Promise.reject(result);
        promiseStruct = { promise: promise };
      } else {
        // Allocate the promise/resolver for when the signal arrives in the
        // future.
        var resolve = undefined,
            reject = undefined;
        var promise = new Promise(function (aResolve, aReject) {
          resolve = aResolve;
          reject = aReject;
        });
        promiseStruct = { promise: promise, resolve: resolve, reject: reject };
      }
      if (!this.promiseMap_) {
        this.promiseMap_ = _object.map();
      }
      this.promiseMap_[name] = promiseStruct;
    }
    return promiseStruct.promise;
  };

  /**
   * Triggers the signal with the specified name on the element. The time is
   * optional; if not provided, the current time is used. The associated
   * promise is resolved with the resulting time.
   * @param {string} name
   * @param {time=} opt_time
   */

  Signals.prototype.signal = function signal(name, opt_time) {
    if (this.map_[name] != null) {
      // Do not duplicate signals.
      return;
    }
    var time = opt_time || Date.now();
    this.map_[name] = time;
    var promiseStruct = this.promiseMap_ && this.promiseMap_[name];
    if (promiseStruct && promiseStruct.resolve) {
      promiseStruct.resolve(time);
      promiseStruct.resolve = undefined;
      promiseStruct.reject = undefined;
    }
  };

  /**
   * Rejects the signal. Indicates that the signal will never succeed. The
   * associated signal is rejected.
   * @param {string} name
   * @param {!Error} error
   */

  Signals.prototype.rejectSignal = function rejectSignal(name, error) {
    if (this.map_[name] != null) {
      // Do not duplicate signals.
      return;
    }
    this.map_[name] = error;
    var promiseStruct = this.promiseMap_ && this.promiseMap_[name];
    if (promiseStruct && promiseStruct.reject) {
      promiseStruct.reject(error);
      promiseStruct.resolve = undefined;
      promiseStruct.reject = undefined;
    }
  };

  /**
   * Resets all signals.
   * @param {string} name
   */

  Signals.prototype.reset = function reset(name) {
    if (this.map_[name]) {
      delete this.map_[name];
    }
    // Reset promise it has already been resolved.
    var promiseStruct = this.promiseMap_ && this.promiseMap_[name];
    if (promiseStruct && !promiseStruct.resolve) {
      delete this.promiseMap_[name];
    }
  };

  return Signals;
})();

exports.Signals = Signals;

},{"./object":53}],55:[function(require,module,exports){
exports.__esModule = true;
exports.cssEscape = cssEscape;
/*! https://mths.be/cssescape v1.5.1 by @mathias | MIT license */

/**
 * https://drafts.csswg.org/cssom/#serialize-an-identifier
 * @param {string} value
 * @return {string}
 */

function cssEscape(value) {
	if (arguments.length == 0) {
		throw new TypeError('`CSS.escape` requires an argument.');
	}
	var string = String(value);
	var length = string.length;
	var index = -1;
	var codeUnit;
	var result = '';
	var firstCodeUnit = string.charCodeAt(0);
	while (++index < length) {
		codeUnit = string.charCodeAt(index);
		// Note: there’s no need to special-case astral symbols, surrogate
		// pairs, or lone surrogates.

		// If the character is NULL (U+0000), then the REPLACEMENT CHARACTER
		// (U+FFFD).
		if (codeUnit == 0x0000) {
			result += '\uFFFD';
			continue;
		}

		if (
		// If the character is in the range [\1-\1F] (U+0001 to U+001F) or is
		// U+007F, […]
		codeUnit >= 0x0001 && codeUnit <= 0x001F || codeUnit == 0x007F ||
		// If the character is the first character and is in the range [0-9]
		// (U+0030 to U+0039), […]
		index == 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039 ||
		// If the character is the second character and is in the range [0-9]
		// (U+0030 to U+0039) and the first character is a `-` (U+002D), […]
		index == 1 && codeUnit >= 0x0030 && codeUnit <= 0x0039 && firstCodeUnit == 0x002D) {
			// https://drafts.csswg.org/cssom/#escape-a-character-as-code-point
			result += '\\' + codeUnit.toString(16) + ' ';
			continue;
		}

		if (
		// If the character is the first character and is a `-` (U+002D), and
		// there is no second character, […]
		index == 0 && length == 1 && codeUnit == 0x002D) {
			result += '\\' + string.charAt(index);
			continue;
		}

		// If the character is not handled by one of the above rules and is
		// greater than or equal to U+0080, is `-` (U+002D) or `_` (U+005F), or
		// is in one of the ranges [0-9] (U+0030 to U+0039), [A-Z] (U+0041 to
		// U+005A), or [a-z] (U+0061 to U+007A), […]
		if (codeUnit >= 0x0080 || codeUnit == 0x002D || codeUnit == 0x005F || codeUnit >= 0x0030 && codeUnit <= 0x0039 || codeUnit >= 0x0041 && codeUnit <= 0x005A || codeUnit >= 0x0061 && codeUnit <= 0x007A) {
			// the character itself
			result += string.charAt(index);
			continue;
		}

		// Otherwise, the escaped character.
		// https://drafts.csswg.org/cssom/#escape-a-character
		result += '\\' + string.charAt(index);
	}
	return result;
}

},{}]},{},[2])


})});
//# sourceMappingURL=amp-analytics-0.1.max.js.map