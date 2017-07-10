(self.AMP=self.AMP||[]).push({n:"amp-form",v:"1499663230322",f:(function(AMP){(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
exports.__esModule = true;
var CSS = "form.amp-form-submit-error [submit-error],form.amp-form-submit-success [submit-success],form.amp-form-submitting [submitting]{display:block}.i-amphtml-validation-bubble{-webkit-transform:translate(-50%,-100%);transform:translate(-50%,-100%);background-color:#fff;box-shadow:0 5px 15px 0 rgba(0,0,0,.5);max-width:200px;position:absolute;display:none;box-sizing:border-box;padding:10px;border-radius:5px}.i-amphtml-validation-bubble:after{content:' ';position:absolute;bottom:-8px;left:30px;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid #fff}[visible-when-invalid]{display:none;color:red}[visible-when-invalid].visible{display:initial}\n/*# sourceURL=/extensions/amp-form/0.1/amp-form.css*/";
exports.CSS = CSS;

},{}],2:[function(require,module,exports){
exports.__esModule = true;
exports.checkUserValidityAfterInteraction_ = checkUserValidityAfterInteraction_;
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

var _srcActionTrust = require('../../../src/action-trust');

var _formProxy = require('./form-proxy');

var _srcAnalytics = require('../../../src/analytics');

var _srcEventHelper = require('../../../src/event-helper');

var _srcShadowEmbed = require('../../../src/shadow-embed');

var _srcDom = require('../../../src/dom');

var _srcForm = require('../../../src/form');

var _srcUrl = require('../../../src/url');

var _srcLog = require('../../../src/log');

var _srcMode = require('../../../src/mode');

var _srcServices = require('../../../src/services');

var _srcTypes = require('../../../src/types');

var _srcStyleInstaller = require('../../../src/style-installer');

var _buildAmpForm01Css = require('../../../build/amp-form-0.1.css');

var _formValidators = require('./form-validators');

var _formVerifiers = require('./form-verifiers');

var _srcUtilsObject = require('../../../src/utils/object');

/** @type {string} */
var TAG = 'amp-form';

/**
 * A list of external dependencies that can be included in forms.
 * @type {!Array<string>}
 */
var EXTERNAL_DEPS = ['amp-selector'];

/** @const @enum {string} */
var FormState_ = {
  INITIAL: 'initial',
  VERIFYING: 'verifying',
  SUBMITTING: 'submitting',
  SUBMIT_ERROR: 'submit-error',
  SUBMIT_SUCCESS: 'submit-success'
};

/** @const @enum {string} */
var UserValidityState = {
  NONE: 'none',
  USER_VALID: 'valid',
  USER_INVALID: 'invalid'
};

/** @private @const {string} */
var REDIRECT_TO_HEADER = 'AMP-Redirect-To';

var AmpForm = (function () {

  /**
   * Adds functionality to the passed form element and listens to submit event.
   * @param {!HTMLFormElement} element
   * @param {string} id
   */

  function AmpForm(element, id) {
    var _this = this;

    babelHelpers.classCallCheck(this, AmpForm);

    //TODO(dvoytenko, #7063): Remove the try catch.
    try {
      _formProxy.installFormProxy(element);
    } catch (e) {
      _srcLog.dev().error(TAG, 'form proxy failed to install', e);
    }

    _srcForm.setFormForElement(element, this);

    /** @private @const {string} */
    this.id_ = id;

    /** @const @private {!Window} */
    this.win_ = element.ownerDocument.defaultView;

    /** @const @private {!../../../src/service/timer-impl.Timer} */
    this.timer_ = _srcServices.timerFor(this.win_);

    /** @const @private {!../../../src/service/url-replacements-impl.UrlReplacements} */
    this.urlReplacement_ = _srcServices.urlReplacementsForDoc(element);

    /** @private {?Promise} */
    this.dependenciesPromise_ = null;

    /** @const @private {!HTMLFormElement} */
    this.form_ = element;

    /** @const @private {!../../../src/service/vsync-impl.Vsync} */
    this.vsync_ = _srcServices.vsyncFor(this.win_);

    /** @const @private {!../../../src/service/template-impl.Templates} */
    this.templates_ = _srcServices.templatesFor(this.win_);

    /** @const @private {!../../../src/service/xhr-impl.Xhr} */
    this.xhr_ = _srcServices.xhrFor(this.win_);

    /** @const @private {!../../../src/service/action-impl.ActionService} */
    this.actions_ = _srcServices.actionServiceForDoc(this.form_);

    /** @const @private {!../../../src/service/resources-impl.Resources} */
    this.resources_ = _srcServices.resourcesForDoc(this.form_);

    /** @const @private {string} */
    this.method_ = (this.form_.getAttribute('method') || 'GET').toUpperCase();

    /** @const @private {string} */
    this.target_ = this.form_.getAttribute('target');

    /** @const @private {?string} */
    this.xhrAction_ = this.getXhrUrl_('action-xhr');

    /** @const @private {?string} */
    this.xhrVerify_ = this.getXhrUrl_('verify-xhr');

    /**
     * Indicates that the action will submit to canonical or not.
     * @private {boolean|undefined}
     */
    this.isCanonicalAction_ = undefined;

    /** @const @private {boolean} */
    this.shouldValidate_ = !this.form_.hasAttribute('novalidate');
    // Need to disable browser validation in order to allow us to take full
    // control of this. This allows us to trigger validation APIs and reporting
    // when we need to.
    this.form_.setAttribute('novalidate', '');
    if (!this.shouldValidate_) {
      this.form_.setAttribute('amp-novalidate', '');
    }
    this.form_.classList.add('i-amphtml-form');

    var submitButtons = this.form_.querySelectorAll('[type="submit"]');
    /** @const @private {!Array<!Element>} */
    this.submitButtons_ = _srcTypes.toArray(submitButtons);

    /** @private {!FormState_} */
    this.state_ = FormState_.INITIAL;

    var inputs = this.form_.elements;
    for (var i = 0; i < inputs.length; i++) {
      var _name = inputs[i].name;
      _srcLog.user().assert(_name != _srcUrl.SOURCE_ORIGIN_PARAM && _name != _formVerifiers.FORM_VERIFY_PARAM, 'Illegal input name, %s found: %s', _name, inputs[i]);
    }

    /** @const @private {!./form-validators.FormValidator} */
    this.validator_ = _formValidators.getFormValidator(this.form_);

    /** @const @private {!./form-verifiers.FormVerifier} */
    this.verifier_ = _formVerifiers.getFormVerifier(this.form_, function () {
      return _this.handleXhrVerify_();
    });

    this.actions_.installActionHandler(this.form_, this.actionHandler_.bind(this), _srcActionTrust.ActionTrust.HIGH);
    this.installEventHandlers_();

    /** @private {?Promise} */
    this.xhrSubmitPromise_ = null;

    /** @private {?Promise} */
    this.renderTemplatePromise_ = null;
  }

  /**
   * Reports validity of the form passed through state object.
   * @param {!Object} state
   */

  /**
   * Gets and validates an attribute for form request URLs.
   * @param {string} attribute
   * @return {?string}
   * @private
   */

  AmpForm.prototype.getXhrUrl_ = function getXhrUrl_(attribute) {
    var url = this.form_.getAttribute(attribute);
    if (url) {
      _srcUrl.assertHttpsUrl(url, this.form_, attribute);
      _srcLog.user().assert(!_srcUrl.isProxyOrigin(url), 'form ' + attribute + ' should not be on AMP CDN: %s', this.form_);
    }
    return url;
  };

  /**
   * @param {!../../../src/service/action-impl.ActionInvocation} invocation
   * @private
   */

  AmpForm.prototype.actionHandler_ = function actionHandler_(invocation) {
    var _this2 = this;

    if (invocation.method == 'submit') {
      this.whenDependenciesReady_().then(function () {
        _this2.handleSubmitAction_(invocation);
      });
    }
  };

  /**
   * Returns a promise that will be resolved when all dependencies used inside the form
   * tag are loaded and built (e.g. amp-selector) or 2 seconds timeout - whichever is first.
   * @return {!Promise}
   * @private
   */

  AmpForm.prototype.whenDependenciesReady_ = function whenDependenciesReady_() {
    if (this.dependenciesPromise_) {
      return this.dependenciesPromise_;
    }
    var depElements = this.form_. /*OK*/querySelectorAll(EXTERNAL_DEPS.join(','));
    // Wait for an element to be built to make sure it is ready.
    var promises = _srcTypes.toArray(depElements).map(function (el) {
      return el.whenBuilt();
    });
    return this.dependenciesPromise_ = this.waitOnPromisesOrTimeout_(promises, 2000);
  };

  /** @private */

  AmpForm.prototype.installEventHandlers_ = function installEventHandlers_() {
    var _this3 = this;

    this.form_.addEventListener('submit', this.handleSubmitEvent_.bind(this), true);

    this.form_.addEventListener('blur', function (e) {
      checkUserValidityAfterInteraction_(_srcLog.dev().assertElement(e.target));
      _this3.validator_.onBlur(e);
    }, true);

    var afterVerifierCommit = function () {
      // Move from the VERIFYING state back to INITIAL
      if (_this3.state_ === FormState_.VERIFYING) {
        _this3.setState_(FormState_.INITIAL);
      }
    };
    this.form_.addEventListener('change', function (e) {
      _this3.verifier_.onCommit().then(function (updatedElements) {
        updatedElements.forEach(checkUserValidityAfterInteraction_);
        _this3.validator_.onBlur(e);
      }, function () {
        checkUserValidityAfterInteraction_(_srcLog.dev().assertElement(e.target));
      }).then(afterVerifierCommit, afterVerifierCommit);
    });

    this.form_.addEventListener('input', function (e) {
      checkUserValidityAfterInteraction_(_srcLog.dev().assertElement(e.target));
      _this3.validator_.onInput(e);
    });
  };

  /**
   * Triggers 'amp-form-submit' event in 'amp-analytics' and
   * generates variables for form fields to be accessible in analytics
   *
   * @private
   */

  AmpForm.prototype.triggerFormSubmitInAnalytics_ = function triggerFormSubmitInAnalytics_() {
    var formDataForAnalytics = {};
    var formObject = this.getFormAsObject_();

    for (var k in formObject) {
      if (Object.prototype.hasOwnProperty.call(formObject, k)) {
        formDataForAnalytics['formFields[' + k + ']'] = formObject[k].join(',');
      }
    }
    formDataForAnalytics['formId'] = this.form_.id;

    this.analyticsEvent_('amp-form-submit', formDataForAnalytics);
  };

  /**
   * Handles submissions through action service invocations.
   *   e.g. <img on=tap:form.submit>
   * @param {!../../../src/service/action-impl.ActionInvocation} invocation
   * @private
   */

  AmpForm.prototype.handleSubmitAction_ = function handleSubmitAction_(invocation) {
    if (this.state_ == FormState_.SUBMITTING || !this.checkValidity_()) {
      return;
    }
    // `submit` has the same trust level as the AMP Action that caused it.
    this.submit_(invocation.trust);
    if (this.method_ == 'GET' && !this.xhrAction_) {
      // Trigger the actual submit of GET non-XHR.
      this.form_.submit();
    }
  };

  /**
   * Note on stopImmediatePropagation usage here, it is important to emulate native
   * browser submit event blocking. Otherwise any other submit listeners would get the
   * event.
   *
   * For example, action service shouldn't trigger 'submit' event if form is actually
   * invalid. stopImmediatePropagation allows us to make sure we don't trigger it.
   *
   * This prevents the default submission event in any of following cases:
   *   - The form is still finishing a previous submission.
   *   - The form is invalid.
   *   - Handling an XHR submission.
   *   - It's a non-XHR POST submission (unsupported).
   *
   * @param {!Event} event
   * @private
   */

  AmpForm.prototype.handleSubmitEvent_ = function handleSubmitEvent_(event) {
    if (this.state_ == FormState_.SUBMITTING || !this.checkValidity_()) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    if (this.xhrAction_ || this.method_ == 'POST') {
      event.preventDefault();
    }
    // Submits caused by user input have high trust.
    this.submit_(_srcActionTrust.ActionTrust.HIGH);
  };

  /**
   * Helper method that actual handles the different cases (post, get, xhr...).
   * @param {ActionTrust} trust
   * @private
   */

  AmpForm.prototype.submit_ = function submit_(trust) {
    var varSubsFields = this.getVarSubsFields_();
    if (this.xhrAction_) {
      this.handleXhrSubmit_(varSubsFields, trust);
    } else if (this.method_ == 'POST') {
      this.handleNonXhrPost_();
    } else if (this.method_ == 'GET') {
      this.handleNonXhrGet_(varSubsFields);
    }
  };

  /**
   * Get form fields that require variable substitutions
   * @return {!IArrayLike<!HTMLInputElement>}
   * @private
   */

  AmpForm.prototype.getVarSubsFields_ = function getVarSubsFields_() {
    // Fields that support var substitutions.
    return this.form_.querySelectorAll('[type="hidden"][data-amp-replace]');
  };

  /**
   * Send the verify request and control the VERIFYING state.
   * @return {!Promise}
   * @private
   */

  AmpForm.prototype.handleXhrVerify_ = function handleXhrVerify_() {
    var _this4 = this;

    if (this.state_ === FormState_.SUBMITTING) {
      return Promise.resolve();
    }
    this.setState_(FormState_.VERIFYING);

    return this.doVarSubs_(this.getVarSubsFields_()).then(function () {
      return _this4.doVerifyXhr_();
    });
  };

  /**
   * @param {!IArrayLike<!HTMLInputElement>} varSubsFields
   * @param {ActionTrust} trust
   * @private
   */

  AmpForm.prototype.handleXhrSubmit_ = function handleXhrSubmit_(varSubsFields, trust) {
    var _this5 = this;

    this.setState_(FormState_.SUBMITTING);

    var p = this.doVarSubs_(varSubsFields).then(function () {
      _this5.triggerFormSubmitInAnalytics_();
      _this5.actions_.trigger(_this5.form_, 'submit', /* event */null, trust);
      // After variable substitution
      var values = _this5.getFormAsObject_();
      _this5.renderTemplate_(values);
    }).then(function () {
      return _this5.doActionXhr_();
    }).then(function (response) {
      return _this5.handleXhrSubmitSuccess_(response);
    }, function (error) {
      return _this5.handleXhrSubmitFailure_( /** @type {!Error} */error);
    });

    if (_srcMode.getMode().test) {
      this.xhrSubmitPromise_ = p;
    }
  };

  /**
   * Perform asynchronous variable substitution on the fields that require it.
   * @param {!IArrayLike<!HTMLInputElement>} varSubsFields
   * @return {!Promise}
   * @private
   */

  AmpForm.prototype.doVarSubs_ = function doVarSubs_(varSubsFields) {
    var varSubPromises = [];
    for (var i = 0; i < varSubsFields.length; i++) {
      varSubPromises.push(this.urlReplacement_.expandInputValueAsync(varSubsFields[i]));
    }
    return this.waitOnPromisesOrTimeout_(varSubPromises, 100);
  };

  /**
   * Send a request to the form's action endpoint.
   * @return {!Promise<!../../../src/service/xhr-impl.FetchResponse>}
   * @private
   */

  AmpForm.prototype.doActionXhr_ = function doActionXhr_() {
    return this.doXhr_(_srcLog.dev().assertString(this.xhrAction_), this.method_);
  };

  /**
   * Send a request to the form's verify endpoint.
   * @return {!Promise<!../../../src/service/xhr-impl.FetchResponse>}
   * @private
   */

  AmpForm.prototype.doVerifyXhr_ = function doVerifyXhr_() {
    var _doXhr_;

    return this.doXhr_(_srcLog.dev().assertString(this.xhrVerify_), this.method_, (_doXhr_ = {}, _doXhr_[_formVerifiers.FORM_VERIFY_PARAM] = true, _doXhr_));
  };

  /**
   * Send a request to a form endpoint.
   * @param {string} url
   * @param {string} method
   * @param {!Object<string, string>=} opt_extraFields
   * @return {!Promise<!../../../src/service/xhr-impl.FetchResponse>}
   * @private
   */

  AmpForm.prototype.doXhr_ = function doXhr_(url, method, opt_extraFields) {
    var xhrUrl = undefined,
        body = undefined;
    var isHeadOrGet = method == 'GET' || method == 'HEAD';

    if (isHeadOrGet) {
      var values = this.getFormAsObject_();
      if (opt_extraFields) {
        _srcUtilsObject.deepMerge(values, opt_extraFields);
      }
      xhrUrl = _srcUrl.addParamsToUrl(url, values);
    } else {
      xhrUrl = url;
      body = new FormData(this.form_);
      for (var key in opt_extraFields) {
        body.append(key, opt_extraFields[key]);
      }
    }

    return this.xhr_.fetch(xhrUrl, {
      body: body,
      method: method,
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });
  };

  /**
   * Transition the form to the submit success state.
   * @param {!../../../src/service/xhr-impl.FetchResponse} response
   * @return {!Promise}
   * @private visible for testing
   */

  AmpForm.prototype.handleXhrSubmitSuccess_ = function handleXhrSubmitSuccess_(response) {
    var _this6 = this;

    return response.json().then(function (json) {
      _this6.triggerAction_( /* success */true, json);
      _this6.analyticsEvent_('amp-form-submit-success');
      _this6.setState_(FormState_.SUBMIT_SUCCESS);
      _this6.renderTemplate_(json || {});
      _this6.maybeHandleRedirect_(response);
    }, function (error) {
      _srcLog.user().error(TAG, 'Failed to parse response JSON: ' + error);
    });
  };

  /**
   * Transition the form the the submit error state.
   * @param {!Error} error
   * @private
   */

  AmpForm.prototype.handleXhrSubmitFailure_ = function handleXhrSubmitFailure_(error) {
    var _this7 = this;

    var promise = undefined;
    if (error && error.response) {
      promise = error.response.json()['catch'](function () {
        return null;
      });
    } else {
      promise = Promise.resolve(null);
    }
    return promise.then(function (responseJson) {
      _this7.triggerAction_( /* success */false, responseJson);
      _this7.analyticsEvent_('amp-form-submit-error');
      _this7.setState_(FormState_.SUBMIT_ERROR);
      _this7.renderTemplate_(responseJson || {});
      _this7.maybeHandleRedirect_(error.response);
      _srcLog.user().error(TAG, 'Form submission failed: ' + error);
    });
  };

  /** @private */

  AmpForm.prototype.handleNonXhrPost_ = function handleNonXhrPost_() {
    // non-XHR POST requests are not supported.
    _srcLog.user().assert(false, 'Only XHR based (via action-xhr attribute) submissions are support ' + 'for POST requests. %s', this.form_);
  };

  /**
   * Executes variable substitutions on the passed fields.
   * @param {IArrayLike<!HTMLInputElement>} varSubsFields
   * @private
   */

  AmpForm.prototype.handleNonXhrGet_ = function handleNonXhrGet_(varSubsFields) {
    // Non-xhr GET requests replacement should happen synchronously.
    for (var i = 0; i < varSubsFields.length; i++) {
      this.urlReplacement_.expandInputValueSync(varSubsFields[i]);
    }
    this.triggerFormSubmitInAnalytics_();
  };

  /**
   * @private
   * @return {boolean} False if the form is invalid.
   */

  AmpForm.prototype.checkValidity_ = function checkValidity_() {
    if (_formValidators.isCheckValiditySupported(this.win_.document)) {
      // Validity checking should always occur, novalidate only circumvent
      // reporting and blocking submission on non-valid forms.
      var isValid = checkUserValidityOnSubmission(this.form_);
      if (this.shouldValidate_ && !isValid) {
        this.vsync_.run({
          measure: undefined,
          mutate: reportValidity
        }, {
          validator: this.validator_
        });
        return false;
      }
    }
    return true;
  };

  /**
   * Handles response redirect throught the AMP-Redirect-To response header.
   * @param {../../../src/service/xhr-impl.FetchResponse} response
   * @private
   */

  AmpForm.prototype.maybeHandleRedirect_ = function maybeHandleRedirect_(response) {
    if (!response || !response.headers) {
      return;
    }
    var redirectTo = response.headers.get(REDIRECT_TO_HEADER);
    if (redirectTo) {
      _srcLog.user().assert(this.target_ != '_blank', 'Redirecting to target=_blank using AMP-Redirect-To is currently ' + 'not supported, use target=_top instead. %s', this.form_);
      try {
        _srcUrl.assertAbsoluteHttpOrHttpsUrl(redirectTo);
        _srcUrl.assertHttpsUrl(redirectTo, 'AMP-Redirect-To', 'Url');
      } catch (e) {
        _srcLog.user().assert(false, 'The `AMP-Redirect-To` header value must be an ' + 'absolute URL starting with https://. Found %s', redirectTo);
      }
      this.win_.top.location.href = redirectTo;
    }
  };

  /**
   * Triggers either a submit-success or submit-error action with response data.
   * @param {boolean} success
   * @param {?JsonObject} json
   * @private
   */

  AmpForm.prototype.triggerAction_ = function triggerAction_(success, json) {
    var name = success ? FormState_.SUBMIT_SUCCESS : FormState_.SUBMIT_ERROR;
    var event = _srcEventHelper.createCustomEvent(this.win_, TAG + '.' + name, { response: json });
    this.actions_.trigger(this.form_, name, event, _srcActionTrust.ActionTrust.MEDIUM);
  };

  /**
   * Returns a race promise between resolving all promises or timing out.
   * @param {!Array<!Promise>} promises
   * @param {number} timeout
   * @return {!Promise}
   * @private
   */

  AmpForm.prototype.waitOnPromisesOrTimeout_ = function waitOnPromisesOrTimeout_(promises, timeout) {
    return Promise.race([Promise.all(promises), this.timer_.promise(timeout)]);
  };

  /**
   * @param {string} eventType
   * @param {!Object<string, string>=} opt_vars A map of vars and their values.
   * @private
   */

  AmpForm.prototype.analyticsEvent_ = function analyticsEvent_(eventType, opt_vars) {
    _srcAnalytics.triggerAnalyticsEvent(this.form_, eventType, opt_vars);
  };

  /**
   * Returns form data as an object.
   * @return {!JsonObject}
   * @private
   */

  AmpForm.prototype.getFormAsObject_ = function getFormAsObject_() {
    var data = /** @type {!JsonObject} */{};
    var inputs = this.form_.elements;
    var submittableTagsRegex = /^(?:input|select|textarea)$/i;
    var unsubmittableTypesRegex = /^(?:button|image|file|reset)$/i;
    var checkableType = /^(?:checkbox|radio)$/i;
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      if (!input.name || isDisabled_(input) || !submittableTagsRegex.test(input.tagName) || unsubmittableTypesRegex.test(input.type) || checkableType.test(input.type) && !input.checked) {
        continue;
      }

      if (data[input.name] === undefined) {
        data[input.name] = [];
      }
      data[input.name].push(input.value);
    }

    return data;
  };

  /**
   * Adds proper classes for the state passed.
   * @param {!FormState_} newState
   * @private
   */

  AmpForm.prototype.setState_ = function setState_(newState) {
    var previousState = this.state_;
    this.form_.classList.remove('amp-form-' + previousState);
    this.form_.classList.add('amp-form-' + newState);
    this.cleanupRenderedTemplate_(previousState);
    this.state_ = newState;
    this.submitButtons_.forEach(function (button) {
      if (newState == FormState_.SUBMITTING) {
        button.setAttribute('disabled', '');
      } else {
        button.removeAttribute('disabled');
      }
    });
  };

  /**
   * @param {!JsonObject} data
   * @private
   */

  AmpForm.prototype.renderTemplate_ = function renderTemplate_(data) {
    var _this8 = this;

    var container = this.form_. /*OK*/querySelector('[' + this.state_ + ']');
    var p = null;
    if (container) {
      (function () {
        var messageId = 'rendered-message-' + _this8.id_;
        container.setAttribute('role', 'alert');
        container.setAttribute('aria-labeledby', messageId);
        container.setAttribute('aria-live', 'assertive');

        if (_this8.templates_.hasTemplate(container)) {
          p = _this8.templates_.findAndRenderTemplate(container, data).then(function (rendered) {
            rendered.id = messageId;
            rendered.setAttribute('i-amphtml-rendered', '');
            container.appendChild(rendered);
            var templatedEvent = _srcEventHelper.createCustomEvent(_this8.win_, 'amp:template-rendered',
            /* detail */null, { bubbles: true });
            container.dispatchEvent(templatedEvent);
          });
        } else {
          // TODO(vializ): This is to let AMP know that the AMP elements inside
          // this container are now visible so they get scheduled for layout.
          // This will be unnecessary when the AMP Layers implementation is
          // complete. We call mutateElement here and not where the template is
          // made visible so that we don't do redundant layout work when a
          // template is rendered too.
          _this8.resources_.mutateElement(container, function () {});
          p = Promise.resolve();
        }
      })();
    }

    if (_srcMode.getMode().test) {
      this.renderTemplatePromise_ = p;
    }
  };

  /**
   * Removes the template for the passed state.
   * @param {!FormState_} state
   * @private
   */

  AmpForm.prototype.cleanupRenderedTemplate_ = function cleanupRenderedTemplate_(state) {
    var container = this.form_. /*OK*/querySelector('[' + state + ']');
    if (!container) {
      return;
    }
    var previousRender = _srcDom.childElementByAttr(container, 'i-amphtml-rendered');
    if (previousRender) {
      _srcDom.removeElement(previousRender);
    }
  };

  /**
   * Returns a promise that resolves when xhr submit finishes. The promise
   * will be null if xhr submit has not started.
   * @visibleForTesting
   */

  AmpForm.prototype.xhrSubmitPromiseForTesting = function xhrSubmitPromiseForTesting() {
    return this.xhrSubmitPromise_;
  };

  /**
   * Returns a promise that resolves when tempalte render finishes. The promise
   * will be null if the template render has not started.
   * @visibleForTesting
   */

  AmpForm.prototype.renderTemplatePromiseForTesting = function renderTemplatePromiseForTesting() {
    return this.renderTemplatePromise_;
  };

  return AmpForm;
})();

exports.AmpForm = AmpForm;
function reportValidity(state) {
  state.validator.report();
}

/**
 * Checks user validity for all inputs, fieldsets and the form.
 * @param {!HTMLFormElement} form
 * @return {boolean} Whether the form is currently valid or not.
 */
function checkUserValidityOnSubmission(form) {
  var elements = form.querySelectorAll('input,select,textarea,fieldset');
  _srcDom.iterateCursor(elements, function (element) {
    return checkUserValidity(element);
  });
  return checkUserValidity(form);
}

/**
 * Returns the user validity state of the element.
 * @param {!Element} element
 * @return {string}
 */
function getUserValidityStateFor(element) {
  if (element.classList.contains('user-valid')) {
    return UserValidityState.USER_VALID;
  } else if (element.classList.contains('user-invalid')) {
    return UserValidityState.USER_INVALID;
  }

  return UserValidityState.NONE;
}

/**
 * Updates class names on the element to reflect the active invalid types on it.
 *
 * @param {!Element} element
 */
function updateInvalidTypesClasses(element) {
  if (!element.validity) {
    return;
  }
  for (var validationType in element.validity) {
    element.classList.toggle(validationType, element.validity[validationType]);
  }
}

/**
 * Checks user validity which applies .user-valid and .user-invalid AFTER the user
 * interacts with the input by moving away from the input (blur) or by changing its
 * value (input).
 *
 * See :user-invalid spec for more details:
 *   https://drafts.csswg.org/selectors-4/#user-pseudos
 *
 * The specs are still not fully specified. The current solution tries to follow a common
 * sense approach for when to apply these classes. As the specs gets clearer, we should
 * strive to match it as much as possible.
 *
 * @param {!Element} element
 * @param {boolean=} propagate Whether to propagate the user validity to ancestors.
 * @return {boolean} Whether the element is valid or not.
 */
function checkUserValidity(element) {
  var propagate = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

  // TODO(mkhatib, #6930): Implement basic validation for custom inputs like
  // amp-selector.
  // If this is not a field type with checkValidity don't do anything.
  if (!element.checkValidity) {
    return true;
  }
  var shouldPropagate = false;
  var previousValidityState = getUserValidityStateFor(element);
  var isCurrentlyValid = element.checkValidity();
  if (previousValidityState != UserValidityState.USER_VALID && isCurrentlyValid) {
    element.classList.add('user-valid');
    element.classList.remove('user-invalid');
    // Don't propagate user-valid unless it was marked invalid before.
    shouldPropagate = previousValidityState == UserValidityState.USER_INVALID;
  } else if (previousValidityState != UserValidityState.USER_INVALID && !isCurrentlyValid) {
    element.classList.add('user-invalid');
    element.classList.remove('user-valid');
    // Always propagate an invalid state change. One invalid input field is
    // guaranteed to make the fieldset and form invalid as well.
    shouldPropagate = true;
  }
  updateInvalidTypesClasses(element);

  if (propagate && shouldPropagate) {
    // Propagate user validity to ancestor fieldsets.
    var ancestors = _srcDom.ancestorElementsByTag(element, 'fieldset');
    for (var i = 0; i < ancestors.length; i++) {
      checkUserValidity(ancestors[i]);
    }
    // Also update the form user validity.
    if (element.form) {
      checkUserValidity(element.form);
    }
  }

  return isCurrentlyValid;
}

/**
 * Responds to user interaction with an input by checking user validity of the input
 * and possibly its input-related ancestors (e.g. feildset, form).
 * @param {!Element} input
 * @private visible for testing.
 */

function checkUserValidityAfterInteraction_(input) {
  checkUserValidity(input, /* propagate */true);
}

/**
 * Checks if a field is disabled.
 * @param {!Element} element
 * @private
 */
function isDisabled_(element) {
  if (element.disabled) {
    return true;
  }

  var ancestors = _srcDom.ancestorElementsByTag(element, 'fieldset');
  for (var i = 0; i < ancestors.length; i++) {
    if (ancestors[i].disabled) {
      return true;
    }
  }
  return false;
}

/**
 * Bootstraps the amp-form elements
 */

var AmpFormService = (function () {
  /**
   * @param  {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
   */

  function AmpFormService(ampdoc) {
    var _this9 = this;

    babelHelpers.classCallCheck(this, AmpFormService);

    /** @const @private {!Promise} */
    this.whenInitialized_ = this.installStyles_(ampdoc).then(function () {
      return _this9.installHandlers_(ampdoc);
    });

    // Dispatch a test-only event for integration tests.
    if (_srcMode.getMode().test) {
      this.whenInitialized_.then(function () {
        var win = ampdoc.win;
        var event = _srcEventHelper.createCustomEvent(win, 'amp:form-service:initialize', null, { bubbles: true });
        win.dispatchEvent(event);
      });
    }
  }

  /**
   * Returns a promise that resolves when all form implementations (if any)
   * have been upgraded.
   * @return {!Promise}
   */

  AmpFormService.prototype.whenInitialized = function whenInitialized() {
    return this.whenInitialized_;
  };

  /**
   * Install the amp-form CSS
   * @param  {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
   * @return {!Promise}
   * @private
   */

  AmpFormService.prototype.installStyles_ = function installStyles_(ampdoc) {
    return new Promise(function (resolve) {
      if (ampdoc.isSingleDoc()) {
        var root = /** @type {!Document} */ampdoc.getRootNode();
        _srcStyleInstaller.installStyles(root, _buildAmpForm01Css.CSS, resolve);
      } else {
        var root = /** @type {!ShadowRoot} */ampdoc.getRootNode();
        _srcShadowEmbed.installStylesForShadowRoot(root, _buildAmpForm01Css.CSS);
        resolve();
      }
    });
  };

  /**
   * Install the event handlers
   * @param  {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
   * @return {!Promise}
   * @private
   */

  AmpFormService.prototype.installHandlers_ = function installHandlers_(ampdoc) {
    var _this10 = this;

    return ampdoc.whenReady().then(function () {
      _this10.installSubmissionHandlers_(ampdoc.getRootNode().querySelectorAll('form'));
      _this10.installGlobalEventListener_(ampdoc.getRootNode());
    });
  };

  /**
   * Install submission handler on all forms in the document.
   * @param {?IArrayLike<T>} forms
   * @previousValidityState
   * @template T
   * @private
   */

  AmpFormService.prototype.installSubmissionHandlers_ = function installSubmissionHandlers_(forms) {
    if (!forms) {
      return;
    }

    _srcDom.iterateCursor(forms, function (form, index) {
      var existingAmpForm = _srcForm.formOrNullForElement(form);
      if (!existingAmpForm) {
        new AmpForm(form, 'amp-form-' + index);
      }
    });
  };

  /**
   * Listen for DOM updated messages sent to the document.
   * @param {!Document|!ShadowRoot} doc
   * @private
   */

  AmpFormService.prototype.installGlobalEventListener_ = function installGlobalEventListener_(doc) {
    var _this11 = this;

    doc.addEventListener('amp:dom-update', function () {
      _this11.installSubmissionHandlers_(doc.querySelectorAll('form'));
    });
  };

  return AmpFormService;
})();

exports.AmpFormService = AmpFormService;

AMP.registerServiceForDoc(TAG, AmpFormService);

},{"../../../build/amp-form-0.1.css":1,"../../../src/action-trust":9,"../../../src/analytics":11,"../../../src/dom":14,"../../../src/event-helper":17,"../../../src/form":19,"../../../src/log":21,"../../../src/mode":23,"../../../src/services":35,"../../../src/shadow-embed":36,"../../../src/style-installer":38,"../../../src/types":40,"../../../src/url":42,"../../../src/utils/object":44,"./form-proxy":3,"./form-validators":4,"./form-verifiers":5}],3:[function(require,module,exports){
exports.__esModule = true;
exports.setBlacklistedPropertiesForTesting = setBlacklistedPropertiesForTesting;
exports.installFormProxy = installFormProxy;
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

var _srcLog = require('../../../src/log');

var _srcUrl = require('../../../src/url');

var _srcString = require('../../../src/string');

/**
 * Blacklisted properties. Used mainly fot testing.
 * @type {?Array<string>}
 */
var blacklistedProperties = null;

/**
 * @param {?Array<string>} properties
 * @visibleForTesting
 */

function setBlacklistedPropertiesForTesting(properties) {
  blacklistedProperties = properties;
}

/**
 * Creates a proxy object `form.$p` that proxies all of the methods and
 * properties to the original DOM APIs. This is to work around the problematic
 * forms feature where inputs mask DOM APIs.
 *
 * E.g. a `<input id="id">` will override `form.id` from the original DOM API.
 * Form proxy will give access to the original `id` value via `form.$p.id`.
 *
 * See https://medium.com/@dvoytenko/solving-conflicts-between-form-inputs-and-dom-api-535c45333ae4
 *
 * @param {!HTMLFormElement} form
 * @return {!Object}
 */

function installFormProxy(form) {
  var constr = getFormProxyConstr(form.ownerDocument.defaultView);
  var proxy = new constr(form);
  if (!('action' in proxy)) {
    setupLegacyProxy(form, proxy);
  }
  form['$p'] = proxy;
  return proxy;
}

/**
 * @param {!Window} win
 * @return {function(new:Object, !HTMLFormElement)}
 */
function getFormProxyConstr(win) {
  if (!win.FormProxy) {
    win.FormProxy = createFormProxyConstr(win);
  }
  return win.FormProxy;
}

/**
 * @param {!Window} win
 * @return {function(new:Object, !HTMLFormElement)}
 */
function createFormProxyConstr(win) {

  /**
   * @param {!HTMLFormElement} form
   * @constructor
   */
  function FormProxy(form) {
    /** @private @const {!HTMLFormElement} */
    this.form_ = form;
  }

  var FormProxyProto = FormProxy.prototype;

  // Hierarchy:
  //   Node  <==  Element <== HTMLElement <== HTMLFormElement
  //   EventTarget  <==  HTMLFormElement
  var inheritance = [win.HTMLFormElement, win.HTMLElement, win.Element, win.Node, win.EventTarget];
  inheritance.forEach(function (klass) {
    var prototype = klass && klass.prototype;

    var _loop = function (_name) {
      var property = win.Object.getOwnPropertyDescriptor(prototype, _name);
      if (!property ||
      // Exclude constants.
      _name.toUpperCase() == _name ||
      // Exclude on-events.
      _srcString.startsWith(_name, 'on') ||
      // Exclude properties that already been created.
      win.Object.prototype.hasOwnProperty.call(FormProxyProto, _name) ||
      // Exclude some properties. Currently only used for testing.
      blacklistedProperties && blacklistedProperties.indexOf(_name) != -1) {
        return 'continue';
      }
      if (typeof property.value == 'function') {
        (function () {
          // A method call. Call the original prototype method via `call`.
          var method = property.value;
          FormProxyProto[_name] = function () {
            return method.apply(this.form_, arguments);
          };
        })();
      } else {
        // A read/write property. Call the original prototype getter/setter.
        var spec = {};
        if (property.get) {
          spec.get = function () {
            return property.get.call(this.form_);
          };
        }
        if (property.set) {
          spec.set = function (value) {
            return property.set.call(this.form_, value);
          };
        }
        win.Object.defineProperty(FormProxyProto, _name, spec);
      }
    };

    for (var _name in prototype) {
      var _ret = _loop(_name);

      if (_ret === 'continue') continue;
    }
  });

  return FormProxy;
}

/**
 * This is a very heavy-handed way to support browsers that do not have
 * properties defined in the prototype chain. Specifically, this is necessary
 * for Chrome 45 and under.
 *
 * See https://developers.google.com/web/updates/2015/04/DOM-attributes-now-on-the-prototype-chain
 * for more info.
 *
 * @param {!HTMLFormElement} form
 * @param {!Object} proxy
 */
function setupLegacyProxy(form, proxy) {
  var win = form.ownerDocument.defaultView;
  var proto = win.HTMLFormElement.prototype.cloneNode.call(form, /* deep */false);

  var _loop2 = function (_name2) {
    if (_name2 in proxy ||
    // Exclude constants.
    _name2.toUpperCase() == _name2 ||
    // Exclude on-events.
    _srcString.startsWith(_name2, 'on')) {
      return 'continue';
    }
    var desc = LEGACY_PROPS[_name2];
    var current = form[_name2];
    if (desc) {
      if (desc.access == LegacyPropAccessType.READ_ONCE) {
        (function () {
          // A property such as `style`. The only way is to read this value
          // once and use it for all subsequent calls.
          var actual = undefined;
          if (current && current.nodeType) {
            // The overriding input, if present, has to be removed and re-added
            // (renaming does NOT work). Completely insane, I know.
            var element = _srcLog.dev().assertElement(current);
            var nextSibling = element.nextSibling;
            var _parent = element.parentNode;
            _parent.removeChild(element);
            try {
              actual = form[_name2];
            } finally {
              _parent.insertBefore(element, nextSibling);
            }
          } else {
            actual = current;
          }
          Object.defineProperty(proxy, _name2, {
            get: function () {
              return actual;
            }
          });
        })();
      } else if (desc.access == LegacyPropAccessType.ATTR) {
        (function () {
          // An attribute-based property. We can use DOM API to read and write
          // with a minimal type conversion.
          var attr = desc.attr || _name2;
          Object.defineProperty(proxy, _name2, {
            get: function () {
              var value = proxy.getAttribute(attr);
              if (value == null && desc.def !== undefined) {
                value = desc.def;
              } else if (desc.type == LegacyPropDataType.BOOL) {
                value = value === 'true';
              } else if (desc.type == LegacyPropDataType.TOGGLE) {
                value = value != null;
              } else if (desc.type == LegacyPropDataType.URL) {
                // URLs, e.g. in `action` attribute are resolved against the
                // document's base.
                value = _srcUrl.parseUrl( /** @type {string} */value || '').href;
              }
              return value;
            },
            set: function (value) {
              if (desc.type == LegacyPropDataType.TOGGLE) {
                if (value) {
                  value = '';
                } else {
                  value = null;
                }
              }
              if (value != null) {
                proxy.setAttribute(attr, value);
              } else {
                proxy.removeAttribute(attr);
              }
            }
          });
        })();
      } else {
        _srcLog.dev().assert(false, 'unknown property access type: %s', desc.access);
      }
    } else {
      // Not a known property - proxy directly.
      Object.defineProperty(proxy, _name2, {
        get: function () {
          return form[_name2];
        },
        set: function (value) {
          form[_name2] = value;
        }
      });
    }
  };

  for (var _name2 in proto) {
    var _ret3 = _loop2(_name2);

    if (_ret3 === 'continue') continue;
  }
}

/**
 * @enum {number}
 */
var LegacyPropAccessType = {
  ATTR: 1,
  READ_ONCE: 2
};

/**
 * @enum {number}
 */
var LegacyPropDataType = {
  URL: 1,
  BOOL: 2,
  TOGGLE: 3
};

/**
 * @const {!Object<string, {
 *   access: !LegacyPropAccessType,
 *   attr: (string|undefined),
 *   type: (LegacyPropDataType|undefined),
 *   def: *,
 * }>}
 */
var LEGACY_PROPS = {
  'acceptCharset': {
    access: LegacyPropAccessType.ATTR,
    attr: 'accept-charset'
  },
  'accessKey': {
    access: LegacyPropAccessType.ATTR,
    attr: 'accesskey'
  },
  'action': {
    access: LegacyPropAccessType.ATTR,
    type: LegacyPropDataType.URL
  },
  'attributes': {
    access: LegacyPropAccessType.READ_ONCE
  },
  'autocomplete': {
    access: LegacyPropAccessType.ATTR,
    def: 'on'
  },
  'children': {
    access: LegacyPropAccessType.READ_ONCE
  },
  'dataset': {
    access: LegacyPropAccessType.READ_ONCE
  },
  'dir': {
    access: LegacyPropAccessType.ATTR
  },
  'draggable': {
    access: LegacyPropAccessType.ATTR,
    type: LegacyPropDataType.BOOL,
    def: false
  },
  'elements': {
    access: LegacyPropAccessType.READ_ONCE
  },
  'encoding': {
    access: LegacyPropAccessType.READ_ONCE
  },
  'enctype': {
    access: LegacyPropAccessType.ATTR
  },
  'hidden': {
    access: LegacyPropAccessType.ATTR,
    type: LegacyPropDataType.TOGGLE,
    def: false
  },
  'id': {
    access: LegacyPropAccessType.ATTR,
    def: ''
  },
  'lang': {
    access: LegacyPropAccessType.ATTR
  },
  'localName': {
    access: LegacyPropAccessType.READ_ONCE
  },
  'method': {
    access: LegacyPropAccessType.ATTR,
    def: 'get'
  },
  'name': {
    access: LegacyPropAccessType.ATTR
  },
  'noValidate': {
    access: LegacyPropAccessType.ATTR,
    attr: 'novalidate',
    type: LegacyPropDataType.TOGGLE,
    def: false
  },
  'prefix': {
    access: LegacyPropAccessType.READ_ONCE
  },
  'spellcheck': {
    access: LegacyPropAccessType.ATTR
  },
  'style': {
    access: LegacyPropAccessType.READ_ONCE
  },
  'target': {
    access: LegacyPropAccessType.ATTR,
    def: ''
  },
  'title': {
    access: LegacyPropAccessType.ATTR
  },
  'translate': {
    access: LegacyPropAccessType.ATTR
  }
};

},{"../../../src/log":21,"../../../src/string":37,"../../../src/url":42}],4:[function(require,module,exports){
exports.__esModule = true;
exports.setReportValiditySupportedForTesting = setReportValiditySupportedForTesting;
exports.setCheckValiditySupportedForTesting = setCheckValiditySupportedForTesting;
exports.getFormValidator = getFormValidator;
exports.isCheckValiditySupported = isCheckValiditySupported;
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

var _srcLog = require('../../../src/log');

var _validationBubble = require('./validation-bubble');

var _srcAmpdoc = require('../../../src/ampdoc');

/** @type {boolean|undefined} */
var reportValiditySupported = undefined;

/** @type {boolean|undefined} */
var checkValiditySupported = undefined;

/** @type {number} */
var validationBubbleCount = 0;

/**
 * @param {boolean} isSupported
 * @private visible for testing.
 */

function setReportValiditySupportedForTesting(isSupported) {
  reportValiditySupported = isSupported;
}

/**
 * @param {boolean} isSupported
 * @private visible for testing.
 */

function setCheckValiditySupportedForTesting(isSupported) {
  checkValiditySupported = isSupported;
}

/** @const @enum {string} */
var CustomValidationTypes = {
  AsYouGo: 'as-you-go',
  ShowAllOnSubmit: 'show-all-on-submit',
  ShowFirstOnSubmit: 'show-first-on-submit'
};

/**
 * Form validator interface.
 * @abstract
 */

var FormValidator = (function () {

  /**
   * @param {!HTMLFormElement} form
   */

  function FormValidator(form) {
    babelHelpers.classCallCheck(this, FormValidator);

    /** @protected @const {!HTMLFormElement} */
    this.form = form;

    /** @protected @const {!../../../src/service/ampdoc-impl.AmpDoc} */
    this.ampdoc = _srcAmpdoc.getAmpDoc(form);

    /** @protected @const {!Document} */
    this.doc = /** @type {!Document} */form.ownerDocument;
  }

  /** @private visible for testing */

  /**
   * Called to report validation errors.
   */

  FormValidator.prototype.report = function report() {};

  /**
   * @param {!Event} unusedEvent
   */

  FormValidator.prototype.onBlur = function onBlur(unusedEvent) {};

  /**
   * @param {!Event} unusedEvent
   */

  FormValidator.prototype.onInput = function onInput(unusedEvent) {};

  return FormValidator;
})();

exports.FormValidator = FormValidator;

var DefaultValidator = (function (_FormValidator) {
  babelHelpers.inherits(DefaultValidator, _FormValidator);

  function DefaultValidator() {
    babelHelpers.classCallCheck(this, DefaultValidator);

    _FormValidator.apply(this, arguments);
  }

  /** @private visible for testing */

  /** @override */

  DefaultValidator.prototype.report = function report() {
    this.form.reportValidity();
  };

  return DefaultValidator;
})(FormValidator);

exports.DefaultValidator = DefaultValidator;

var PolyfillDefaultValidator = (function (_FormValidator2) {
  babelHelpers.inherits(PolyfillDefaultValidator, _FormValidator2);

  function PolyfillDefaultValidator(form) {
    babelHelpers.classCallCheck(this, PolyfillDefaultValidator);

    _FormValidator2.call(this, form);
    var bubbleId = 'i-amphtml-validation-bubble-' + validationBubbleCount++;
    /** @private @const {!./validation-bubble.ValidationBubble} */
    this.validationBubble_ = new _validationBubble.ValidationBubble(this.ampdoc, bubbleId);
  }

  /**
   * @abstract
   * @private visible for testing
   */

  /** @override */

  PolyfillDefaultValidator.prototype.report = function report() {
    var inputs = this.form.querySelectorAll('input,select,textarea');
    for (var i = 0; i < inputs.length; i++) {
      if (!inputs[i].checkValidity()) {
        inputs[i]. /*REVIEW*/focus();
        this.validationBubble_.show(inputs[i], inputs[i].validationMessage);
        break;
      }
    }
  };

  /** @override */

  PolyfillDefaultValidator.prototype.onBlur = function onBlur(unusedEvent) {
    this.validationBubble_.hide();
  };

  /** @override */

  PolyfillDefaultValidator.prototype.onInput = function onInput(event) {
    var input = _srcLog.dev().assertElement(event.target);
    if (!this.validationBubble_.isActiveOn(input)) {
      return;
    }

    if (input.checkValidity()) {
      input.removeAttribute('aria-invalid');
      this.validationBubble_.hide();
    } else {
      input.setAttribute('aria-invalid', 'true');
      this.validationBubble_.show(input, input.validationMessage);
    }
  };

  return PolyfillDefaultValidator;
})(FormValidator);

exports.PolyfillDefaultValidator = PolyfillDefaultValidator;

var AbstractCustomValidator = (function (_FormValidator3) {
  babelHelpers.inherits(AbstractCustomValidator, _FormValidator3);

  function AbstractCustomValidator(form) {
    babelHelpers.classCallCheck(this, AbstractCustomValidator);

    _FormValidator3.call(this, form);

    /** @private @const {!Object<string, ?Element>} */
    this.inputValidationsDict_ = {};

    /** @private @const {!Object<string, ?Element>} */
    this.inputVisibleValidationDict_ = {};
  }

  /** @private visible for testing */

  /**
   * @param {!Element} input
   */

  AbstractCustomValidator.prototype.reportInput = function reportInput(input) {
    var invalidType = getInvalidType(input);
    if (invalidType) {
      this.showValidationFor(input, invalidType);
    }
  };

  /**
   * Hides all validation messages.
   */

  AbstractCustomValidator.prototype.hideAllValidations = function hideAllValidations() {
    for (var id in this.inputVisibleValidationDict_) {
      var input = this.doc.getElementById(id);
      this.hideValidationFor(_srcLog.dev().assertElement(input));
    }
  };

  /**
   * @param {!Element} input
   * @param {!string} invalidType
   * @return {?Element}
   */

  AbstractCustomValidator.prototype.getValidationFor = function getValidationFor(input, invalidType) {
    if (!input.id) {
      return null;
    }
    var selector = '[visible-when-invalid=' + invalidType + ']' + ('[validation-for=' + input.id + ']');
    if (this.inputValidationsDict_[selector] === undefined) {
      this.inputValidationsDict_[selector] = this.doc.querySelector(selector);
    }
    return this.inputValidationsDict_[selector];
  };

  /**
   * @param {!Element} input
   * @param {string} invalidType
   */

  AbstractCustomValidator.prototype.showValidationFor = function showValidationFor(input, invalidType) {
    var validation = this.getValidationFor(input, invalidType);
    if (!validation) {
      return;
    }

    if (!validation.textContent.trim()) {
      validation.textContent = input.validationMessage;
    }

    input.setAttribute('aria-invalid', 'true');
    validation.classList.add('visible');
    this.inputVisibleValidationDict_[input.id] = validation;
  };

  /**
   * @param {!Element} input
   */

  AbstractCustomValidator.prototype.hideValidationFor = function hideValidationFor(input) {
    var visibleValidation = this.getVisibleValidationFor(input);
    if (!visibleValidation) {
      return;
    }
    input.removeAttribute('aria-invalid');
    visibleValidation.classList.remove('visible');
    delete this.inputVisibleValidationDict_[input.id];
  };

  /**
   * @param {!Element} input
   * @return {?Element}
   */

  AbstractCustomValidator.prototype.getVisibleValidationFor = function getVisibleValidationFor(input) {
    if (!input.id) {
      return null;
    }
    return this.inputVisibleValidationDict_[input.id];
  };

  /**
   * Whether an input should validate after an interaction.
   * @param {!Element} unusedInput
   * @return {boolean}
   */

  AbstractCustomValidator.prototype.shouldValidateOnInteraction = function shouldValidateOnInteraction(unusedInput) {
    throw Error('Not Implemented');
  };

  /**
   * @param {!Event} event
   */

  AbstractCustomValidator.prototype.onInteraction = function onInteraction(event) {
    var input = _srcLog.dev().assertElement(event.target);
    var shouldValidate = this.shouldValidateOnInteraction(input);
    this.hideValidationFor(input);
    if (shouldValidate && !input.checkValidity()) {
      this.reportInput(input);
    }
  };

  /** @override */

  AbstractCustomValidator.prototype.onBlur = function onBlur(event) {
    this.onInteraction(event);
  };

  /** @override */

  AbstractCustomValidator.prototype.onInput = function onInput(event) {
    this.onInteraction(event);
  };

  return AbstractCustomValidator;
})(FormValidator);

exports.AbstractCustomValidator = AbstractCustomValidator;

var ShowFirstOnSubmitValidator = (function (_AbstractCustomValidator) {
  babelHelpers.inherits(ShowFirstOnSubmitValidator, _AbstractCustomValidator);

  function ShowFirstOnSubmitValidator() {
    babelHelpers.classCallCheck(this, ShowFirstOnSubmitValidator);

    _AbstractCustomValidator.apply(this, arguments);
  }

  /** @private visible for testing */

  /** @override */

  ShowFirstOnSubmitValidator.prototype.report = function report() {
    this.hideAllValidations();
    var inputs = this.form.querySelectorAll('input,select,textarea');
    for (var i = 0; i < inputs.length; i++) {
      if (!inputs[i].checkValidity()) {
        this.reportInput(inputs[i]);
        inputs[i]. /*REVIEW*/focus();
        break;
      }
    }
  };

  /** @override */

  ShowFirstOnSubmitValidator.prototype.shouldValidateOnInteraction = function shouldValidateOnInteraction(input) {
    return !!this.getVisibleValidationFor(input);
  };

  return ShowFirstOnSubmitValidator;
})(AbstractCustomValidator);

exports.ShowFirstOnSubmitValidator = ShowFirstOnSubmitValidator;

var ShowAllOnSubmitValidator = (function (_AbstractCustomValidator2) {
  babelHelpers.inherits(ShowAllOnSubmitValidator, _AbstractCustomValidator2);

  function ShowAllOnSubmitValidator() {
    babelHelpers.classCallCheck(this, ShowAllOnSubmitValidator);

    _AbstractCustomValidator2.apply(this, arguments);
  }

  /** @private visible for testing */

  /** @override */

  ShowAllOnSubmitValidator.prototype.report = function report() {
    this.hideAllValidations();
    var firstInvalidInput = null;
    var inputs = this.form.querySelectorAll('input,select,textarea');
    for (var i = 0; i < inputs.length; i++) {
      if (!inputs[i].checkValidity()) {
        firstInvalidInput = firstInvalidInput || inputs[i];
        this.reportInput(inputs[i]);
      }
    }

    if (firstInvalidInput) {
      firstInvalidInput. /*REVIEW*/focus();
    }
  };

  /** @override */

  ShowAllOnSubmitValidator.prototype.shouldValidateOnInteraction = function shouldValidateOnInteraction(input) {
    return !!this.getVisibleValidationFor(input);
  };

  return ShowAllOnSubmitValidator;
})(AbstractCustomValidator);

exports.ShowAllOnSubmitValidator = ShowAllOnSubmitValidator;

var AsYouGoValidator = (function (_AbstractCustomValidator3) {
  babelHelpers.inherits(AsYouGoValidator, _AbstractCustomValidator3);

  function AsYouGoValidator() {
    babelHelpers.classCallCheck(this, AsYouGoValidator);

    _AbstractCustomValidator3.apply(this, arguments);
  }

  /**
   * Returns the form validator instance.
   *
   * @param {!HTMLFormElement} form
   * @return {!FormValidator}
   */

  /** @override */

  AsYouGoValidator.prototype.shouldValidateOnInteraction = function shouldValidateOnInteraction(unusedInput) {
    return true;
  };

  return AsYouGoValidator;
})(AbstractCustomValidator);

exports.AsYouGoValidator = AsYouGoValidator;

function getFormValidator(form) {
  var customValidation = form.getAttribute('custom-validation-reporting');
  switch (customValidation) {
    case CustomValidationTypes.AsYouGo:
      return new AsYouGoValidator(form);
    case CustomValidationTypes.ShowAllOnSubmit:
      return new ShowAllOnSubmitValidator(form);
    case CustomValidationTypes.ShowFirstOnSubmit:
      return new ShowFirstOnSubmitValidator(form);
  }

  if (isReportValiditySupported(form.ownerDocument)) {
    return new DefaultValidator(form);
  }

  return new PolyfillDefaultValidator(form);
}

/**
 * Returns whether reportValidity API is supported.
 * @param {?Document} doc
 * @return {boolean}
 */
function isReportValiditySupported(doc) {
  if (doc && reportValiditySupported === undefined) {
    reportValiditySupported = !!document.createElement('form').reportValidity;
  }
  return !!reportValiditySupported;
}

/**
 * Returns whether reportValidity API is supported.
 * @param {!Document} doc
 * @return {boolean}
 */

function isCheckValiditySupported(doc) {
  if (checkValiditySupported === undefined) {
    checkValiditySupported = !!doc.createElement('input').checkValidity;
  }
  return checkValiditySupported;
}

/**
 * Returns invalid error type on the input.
 * @param {!Element} input
 * @return {?string}
 */
function getInvalidType(input) {
  for (var invalidType in input.validity) {
    if (input.validity[invalidType]) {
      return invalidType;
    }
  }
  return null;
}

},{"../../../src/ampdoc":10,"../../../src/log":21,"./validation-bubble":6}],5:[function(require,module,exports){
exports.__esModule = true;
exports.getFormVerifier = getFormVerifier;
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

var _srcUtilsPromise = require('../../../src/utils/promise');

var _srcExperiments = require('../../../src/experiments');

var _srcDom = require('../../../src/dom');

var _srcLog = require('../../../src/log');

var FORM_VERIFY_EXPERIMENT = 'amp-form-verifiers';

exports.FORM_VERIFY_EXPERIMENT = FORM_VERIFY_EXPERIMENT;
var FORM_VERIFY_PARAM = '__amp_form_verify';

exports.FORM_VERIFY_PARAM = FORM_VERIFY_PARAM;
/**
 * @typedef {{
 *    name:string,
 *    message:string
 *  }}
 */
var VerificationErrorDef = undefined;

/**
 * Construct the correct form verifier based on whether
 * a config block is present.
 * @param {!HTMLFormElement} form
 * @param {function():Promise<!../../../src/service/xhr-impl.FetchResponse>} xhr
 */

function getFormVerifier(form, xhr) {
  var win = form.ownerDocument.defaultView;
  if (form.hasAttribute('verify-xhr')) {
    _srcLog.user().assert(_srcExperiments.isExperimentOn(win, FORM_VERIFY_EXPERIMENT), 'Enable "' + FORM_VERIFY_EXPERIMENT + '" experiment to use form verifiers');
    return new AsyncVerifier(form, xhr);
  } else {
    return new DefaultVerifier(form);
  }
}

/**
 * An interface for a form verifier. Implementations could check for duplicate
 * usernames on a remote server, check against an in-memory cache to verify
 * data in ways not possible with standard form validation, or check
 * values against sets of data too large to fit in browser memory
 * e.g. ensuring zip codes match with cities.
 * @visibleForTesting
 * @abstract
 */

var FormVerifier = (function () {
  /**
   * @param {!HTMLFormElement} form
   */

  function FormVerifier(form) {
    babelHelpers.classCallCheck(this, FormVerifier);

    /** @protected @const */
    this.form_ = form;
  }

  /**
   * A no-op verifier.
   * @visibleForTesting
   */

  /**
   * Called when the user has fully set a value to be verified,
   * e.g. the input's 'change' event
   * @return {!Promise<!Array<!Element>>}
   */

  FormVerifier.prototype.onCommit = function onCommit() {
    this.clearVerificationErrors_();
    if (this.isDirty_()) {
      return this.verify_();
    } else {
      return Promise.resolve([]);
    }
  };

  /**
   * Sends the verify request if any group is ready to verify.
   * @return {!Promise<!Array<!Element>>} The list of elements whose state
   *    must change
   * @protected
   */

  FormVerifier.prototype.verify_ = function verify_() {
    return Promise.resolve([]);
  };

  /**
   * Checks if the form has been changed from its initial state.
   * @return {boolean}
   * @private
   */

  FormVerifier.prototype.isDirty_ = function isDirty_() {
    var elements = this.form_.elements;
    for (var i = 0; i < elements.length; i++) {
      var field = elements[i];
      if (field.disabled) {
        continue;
      }
      switch (field.type) {
        case 'select-multiple':
        case 'select-one':
          var options = field.options;
          for (var j = 0; j < options.length; j++) {
            if (options[j].selected !== options[j].defaultSelected) {
              return true;
            }
          }
          break;
        case 'checkbox':
        case 'radio':
          if (field.checked !== field.defaultChecked) {
            return true;
          }
          break;
        default:
          if (field.value !== field.defaultValue) {
            return true;
          }
          break;
      }
    }
    return false;
  };

  /**
   * Removes all custom verification errors from the elements.
   * @private
   */

  FormVerifier.prototype.clearVerificationErrors_ = function clearVerificationErrors_() {
    var elements = this.form_.elements;
    if (elements) {
      _srcDom.iterateCursor(elements, function (e) {
        e.setCustomValidity('');
      });
    }
  };

  return FormVerifier;
})();

exports.FormVerifier = FormVerifier;

var DefaultVerifier = (function (_FormVerifier) {
  babelHelpers.inherits(DefaultVerifier, _FormVerifier);

  function DefaultVerifier() {
    babelHelpers.classCallCheck(this, DefaultVerifier);

    _FormVerifier.apply(this, arguments);
  }

  /**
   * A verifier that verifies values via an XHR
   * @visibleForTesting
   */
  return DefaultVerifier;
})(FormVerifier);

exports.DefaultVerifier = DefaultVerifier;

var AsyncVerifier = (function (_FormVerifier2) {
  babelHelpers.inherits(AsyncVerifier, _FormVerifier2);

  /**
   * @param {!HTMLFormElement} form
   * @param {function():Promise<!../../../src/service/xhr-impl.FetchResponse>} xhr
   */

  function AsyncVerifier(form, xhr) {
    babelHelpers.classCallCheck(this, AsyncVerifier);

    _FormVerifier2.call(this, form);

    /** @protected @const*/
    this.doXhr_ = xhr;

    /** @protected {?LastAddedResolver} */
    this.xhrResolver_ = null;

    /** @private {!Array<!VerificationErrorDef>} */
    this.previousErrors_ = [];
  }

  /**
   * @param {!Error} error
   * @return {!Promise<!Array<VerificationErrorDef>>}
   * @private
   */

  /** @override */

  AsyncVerifier.prototype.verify_ = function verify_() {
    var _this = this;

    var xhrConsumeErrors = this.doXhr_().then(function () {
      return [];
    }, function (error) {
      return getResponseErrorData_( /** @type {!Error} */error);
    });

    return this.addToResolver_(xhrConsumeErrors).then(function (errors) {
      return _this.applyErrors_(errors);
    });
  };

  /**
   * Prevent race conditions from XHRs that arrive out of order by resolving
   * only the most recently initiated XHR.
   * TODO(cvializ): Replace this when the Fetch API adds cancelable fetches.
   * @param {!Promise} promise
   * @return {!Promise} The resolver result promise
   */

  AsyncVerifier.prototype.addToResolver_ = function addToResolver_(promise) {
    var _this2 = this;

    if (!this.xhrResolver_) {
      this.xhrResolver_ = new _srcUtilsPromise.LastAddedResolver();
      var cleanup = function () {
        return _this2.xhrResolver_ = null;
      };
      this.xhrResolver_.then(cleanup, cleanup);
    }
    return this.xhrResolver_.add(promise);
  };

  /**
   * Set errors on elements that failed verification, and clear any
   * verification state for elements that passed verification.
   * @param {!Array<!VerificationErrorDef>} errors
   * @return {!Array<!Element>} Updated elements e.g. elements with new errors,
   *    and elements that previously had errors but were fixed. The form will
   *    update their user-valid/user-invalid state.
   * @private
   */

  AsyncVerifier.prototype.applyErrors_ = function applyErrors_(errors) {
    var _this3 = this;

    var errorElements = [];

    var previousErrors = this.previousErrors_;
    this.previousErrors_ = errors;

    // Set the error message on each element that caused an error.
    for (var i = 0; i < errors.length; i++) {
      var error = errors[i];
      var _name = _srcLog.user().assertString(error.name, 'Verification errors must have a name property');
      var message = _srcLog.user().assertString(error.message, 'Verification errors must have a message property');
      // If multiple elements share the same name, the first should be selected.
      // This matches the behavior of HTML5 validation, e.g. with radio buttons.
      var element = _srcLog.user().assertElement(this.form_. /*OK*/querySelector('[name="' + _name + '"]'), 'Verification error name property must match a field name');

      // Only put verification errors on elements that are client-side valid.
      // This prevents errors from appearing on elements that have not been
      // filled out yet.
      if (element.checkValidity()) {
        element.setCustomValidity(message);
        errorElements.push(element);
      }
    }

    // Create a list of form elements that had an error, but are now fixed.
    var isFixed = function (previousError) {
      return errors.every(function (error) {
        return previousError.name !== error.name;
      });
    };
    var fixedElements = previousErrors.filter(isFixed).map(function (e) {
      return _this3.form_. /*OK*/querySelector('[name="' + e.name + '"]');
    });

    return errorElements.concat(fixedElements);
  };

  return AsyncVerifier;
})(FormVerifier);

exports.AsyncVerifier = AsyncVerifier;
function getResponseErrorData_(error) {
  var response = error.response;

  if (!response) {
    return Promise.resolve([]);
  }

  return response.json().then(function (json) {
    return json.verifyErrors || [];
  }, function () {
    return [];
  });
}

},{"../../../src/dom":14,"../../../src/experiments":18,"../../../src/log":21,"../../../src/utils/promise":45}],6:[function(require,module,exports){
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

var _srcServices = require('../../../src/services');

var _srcStyle = require('../../../src/style');

var _srcDom = require('../../../src/dom');

/** @type {string} */
var OBJ_PROP = '__BUBBLE_OBJ';

var ValidationBubble = (function () {

  /**
   * Creates a bubble component to display messages in.
   * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
   * @param {string} id
   */

  function ValidationBubble(ampdoc, id) {
    babelHelpers.classCallCheck(this, ValidationBubble);

    /** @private @const {string} */
    this.id_ = id;

    /** @private @const {!../../../src/service/viewport-impl.Viewport} */
    this.viewport_ = _srcServices.viewportForDoc(ampdoc);

    /** @private @const {!../../../src/service/vsync-impl.Vsync} */
    this.vsync_ = _srcServices.vsyncFor(ampdoc.win);

    /** @private {?Element} */
    this.currentTargetElement_ = null;

    /** @private {string} */
    this.currentMessage_ = '';

    /** @private {boolean} */
    this.isVisible_ = false;

    /** @private @const {!Element} */
    this.bubbleElement_ = ampdoc.win.document.createElement('div');

    this.bubbleElement_.classList.add('i-amphtml-validation-bubble');
    this.bubbleElement_[OBJ_PROP] = this;
    ampdoc.getBody().appendChild(this.bubbleElement_);
  }

  /**
   * Hides the bubble element passed through state object.
   * @param {!Object} state
   * @private
   */

  /**
   * @return {boolean}
   */

  ValidationBubble.prototype.isActiveOn = function isActiveOn(element) {
    return this.isVisible_ && element == this.currentTargetElement_;
  };

  /**
   * Hides the bubble off screen.
   */

  ValidationBubble.prototype.hide = function hide() {
    if (!this.isVisible_) {
      return;
    }

    this.isVisible_ = false;
    this.currentTargetElement_ = null;
    this.currentMessage_ = '';

    this.vsync_.run({
      measure: undefined,
      mutate: hideBubble
    }, {
      bubbleElement: this.bubbleElement_
    });
  };

  /**
   * Shows the bubble targeted to an element with the passed message.
   * @param {!Element} targetElement
   * @param {string} message
   */

  ValidationBubble.prototype.show = function show(targetElement, message) {
    if (this.isActiveOn(targetElement) && message == this.currentMessage_) {
      return;
    }

    this.isVisible_ = true;
    this.currentTargetElement_ = targetElement;
    this.currentMessage_ = message;
    var state = {
      message: message,
      targetElement: targetElement,
      bubbleElement: this.bubbleElement_,
      viewport: this.viewport_,
      id: this.id_
    };
    this.vsync_.run({
      measure: measureTargetElement,
      mutate: showBubbleElement
    }, state);
  };

  return ValidationBubble;
})();

exports.ValidationBubble = ValidationBubble;
function hideBubble(state) {
  state.bubbleElement.removeAttribute('aria-alert');
  state.bubbleElement.removeAttribute('role');
  _srcDom.removeChildren(state.bubbleElement);
  _srcStyle.setStyles(state.bubbleElement, {
    display: 'none'
  });
}

/**
 * Measures the layout for the target element passed through state object.
 * @param {!Object} state
 * @private
 */
function measureTargetElement(state) {
  state.targetRect = state.viewport.getLayoutRect(state.targetElement);
}

/**
 * Updates text content, positions and displays the bubble.
 * @param {!Object} state
 * @private
 */
function showBubbleElement(state) {
  _srcDom.removeChildren(state.bubbleElement);
  var messageDiv = state.bubbleElement.ownerDocument.createElement('div');
  messageDiv.id = 'bubble-message-' + state.id;
  messageDiv.textContent = state.message;
  state.bubbleElement.setAttribute('aria-labeledby', messageDiv.id);
  state.bubbleElement.setAttribute('role', 'alert');
  state.bubbleElement.setAttribute('aria-live', 'assertive');
  state.bubbleElement.appendChild(messageDiv);
  _srcStyle.setStyles(state.bubbleElement, {
    display: 'block',
    top: state.targetRect.top - 10 + 'px',
    left: state.targetRect.left + state.targetRect.width / 2 + 'px'
  });
}

},{"../../../src/dom":14,"../../../src/services":35,"../../../src/style":39}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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
 * Trust level of an action.
 *
 * Corresponds to degree of user intent, i.e. events triggered with strong
 * user intent have high trust.
 *
 * @enum {number}
 */
var ActionTrust = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3
};
exports.ActionTrust = ActionTrust;

},{}],10:[function(require,module,exports){
exports.__esModule = true;
exports.ampdocServiceFor = ampdocServiceFor;
exports.getAmpDoc = getAmpDoc;
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
 * Returns the global instance of the `AmpDocService` service that can be
 * used to resolve an ampdoc for any node: either in the single-doc or
 * shadow-doc environment.
 * @param {!Window} window
 * @return {!./service/ampdoc-impl.AmpDocService}
 */

function ampdocServiceFor(window) {
  return (/** @type {!./service/ampdoc-impl.AmpDocService} */_service.getService(window, 'ampdoc')
  );
}

/**
 * Returns the ampdoc for the specified node..
 * @param {!Node} node
 * @return {!./service/ampdoc-impl.AmpDoc}
 */

function getAmpDoc(node) {
  var win = (node.ownerDocument || node).defaultView;
  return ampdocServiceFor(win).getAmpDoc(node);
}

},{"./service":33}],11:[function(require,module,exports){
exports.__esModule = true;
exports.analyticsForDoc = analyticsForDoc;
exports.analyticsForDocOrNull = analyticsForDocOrNull;
exports.triggerAnalyticsEvent = triggerAnalyticsEvent;
exports.insertAnalyticsElement = insertAnalyticsElement;
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

var _elementService = require('./element-service');

var _dom = require('./dom');

var _service = require('./service');

var _services = require('./services');

var _log = require('./log');

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @param {boolean=} loadAnalytics
 * @return {!Promise<!../extensions/amp-analytics/0.1/instrumentation.InstrumentationService>}
 */

function analyticsForDoc(nodeOrDoc) {
  var loadAnalytics = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

  if (loadAnalytics) {
    // Get Extensions service and force load analytics extension.
    var ampdoc = _service.getAmpdoc(nodeOrDoc);
    _services.extensionsFor(ampdoc.win). /*OK*/loadExtension('amp-analytics');
  }
  return (/** @type {!Promise<
           !../extensions/amp-analytics/0.1/instrumentation.InstrumentationService
         >} */_elementService.getElementServiceForDoc(nodeOrDoc, 'amp-analytics-instrumentation', 'amp-analytics')
  );
}

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!Promise<?../extensions/amp-analytics/0.1/instrumentation.InstrumentationService>}
 */

function analyticsForDocOrNull(nodeOrDoc) {
  return (/** @type {!Promise<
           ?../extensions/amp-analytics/0.1/instrumentation.InstrumentationService
         >} */_elementService.getElementServiceIfAvailableForDoc(nodeOrDoc, 'amp-analytics-instrumentation', 'amp-analytics')
  );
}

/**
 * Helper method to trigger analytics event if amp-analytics is available.
 * @param {!Element} target
 * @param {string} eventType
 * @param {!Object<string, string>=} opt_vars A map of vars and their values.
 */

function triggerAnalyticsEvent(target, eventType, opt_vars) {
  analyticsForDocOrNull(target).then(function (analytics) {
    if (!analytics) {
      return;
    }
    analytics.triggerEventForTarget(target, eventType, opt_vars);
  });
}

/**
 * Method to create scoped analytics element for any element.
 * @param {!Element} parentElement
 * @param {!JsonObject} config
 * @param {boolean=} loadAnalytics
 * @return {!Element} created analytics element
 */

function insertAnalyticsElement(parentElement, config) {
  var loadAnalytics = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

  var doc = /** @type {!Document} */parentElement.ownerDocument;
  var analyticsElem = _dom.createElementWithAttributes(doc, 'amp-analytics', {
    'sandbox': 'true',
    'trigger': 'immediate'
  });
  var scriptElem = _dom.createElementWithAttributes(doc, 'script', {
    'type': 'application/json'
  });
  scriptElem.textContent = JSON.stringify(config);
  analyticsElem.appendChild(scriptElem);
  analyticsElem.CONFIG = config;

  // Force load analytics extension if script not included in page.
  if (loadAnalytics) {
    // Get Extensions service and force load analytics extension.
    var extensions = _services.extensionsFor(parentElement.ownerDocument.defaultView);
    extensions. /*OK*/loadExtension('amp-analytics');
  } else {
    analyticsForDocOrNull(parentElement).then(function (analytics) {
      _log.dev().assert(analytics);
    });
  }
  parentElement.appendChild(analyticsElem);
  return analyticsElem;
}

},{"./dom":14,"./element-service":15,"./log":21,"./service":33,"./services":35}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{"./config":12,"./string":37,"./url":42}],14:[function(require,module,exports){
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

},{"../third_party/css-escape/css-escape":47,"./log":21,"./string":37}],15:[function(require,module,exports){
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

},{"./dom":14,"./log":21,"./service":33}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{"./event-helper-listen":16,"./log":21}],18:[function(require,module,exports){
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

},{"./cookies":13,"./json":20,"./log":21,"./service":33,"./url":42,"./utils/bytes":43}],19:[function(require,module,exports){
exports.__esModule = true;
exports.formOrNullForElement = formOrNullForElement;
exports.setFormForElement = setFormForElement;
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

/** @const {string} */
var FORM_PROP_ = '__AMP_FORM';

/**
 * @param {!Element} element
 * @return {../extensions/amp-form/0.1/amp-form.AmpForm}
 */

function formOrNullForElement(element) {
  return element[FORM_PROP_] || null;
}

/**
 * @param {!Element} element
 * @param {!../extensions/amp-form/0.1/amp-form.AmpForm} form
 */

function setFormForElement(element, form) {
  element[FORM_PROP_] = form;
}

},{}],20:[function(require,module,exports){
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

},{"./types":40}],21:[function(require,module,exports){
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

},{"./mode":23,"./mode-object":22,"./types":40}],22:[function(require,module,exports){
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

},{"./mode":23}],23:[function(require,module,exports){
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

},{"./string":37,"./url-parse-query-string":41}],24:[function(require,module,exports){
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

},{}],25:[function(require,module,exports){
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

},{"./mode":23,"./polyfills/array-includes":26,"./polyfills/document-contains":27,"./polyfills/domtokenlist-toggle":28,"./polyfills/math-sign":29,"./polyfills/object-assign":30,"./polyfills/promise":31,"document-register-element/build/document-register-element.node":7}],26:[function(require,module,exports){
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

},{}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
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

},{}],29:[function(require,module,exports){
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

},{}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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

},{"promise-pjs/promise":8}],32:[function(require,module,exports){
exports.__esModule = true;
exports.waitForServices = waitForServices;
exports.hasRenderDelayingServices = hasRenderDelayingServices;
exports.includedServices = includedServices;
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

var _service = require('./service');

var _services = require('./services');

/**
 * A map of services that delay rendering. The key is the name of the service
 * and the value is a DOM query which is used to check if the service is needed
 * in the current document.
 * Do not add a service unless absolutely necessary.
 *
 * \   \  /  \  /   / /   \     |   _  \     |  \ |  | |  | |  \ |  |  / _____|
 *  \   \/    \/   / /  ^  \    |  |_)  |    |   \|  | |  | |   \|  | |  |  __
 *   \            / /  /_\  \   |      /     |  . `  | |  | |  . `  | |  | |_ |
 *    \    /\    / /  _____  \  |  |\  \----.|  |\   | |  | |  |\   | |  |__| |
 *     \__/  \__/ /__/     \__\ | _| `._____||__| \__| |__| |__| \__|  \______|
 *
 * The equivalent of this list is used for server-side rendering (SSR) and any
 * changes made to it must be made in coordination with caches that implement
 * SSR. For more information on SSR see bit.ly/amp-ssr.
 *
 * @const {!Object<string, string>}
 */
var SERVICES = {
  'amp-dynamic-css-classes': '[custom-element=amp-dynamic-css-classes]',
  'variant': 'amp-experiment'
};

/**
 * Maximum milliseconds to wait for all extensions to load before erroring.
 * @const
 */
var LOAD_TIMEOUT = 3000;

/**
 * Detects any render delaying services that are required on the page,
 * and returns a promise with a timeout.
 * @param {!Window} win
 * @return {!Promise<!Array<*>>} resolves to an Array that has the same length as
 *     the detected render delaying services
 */

function waitForServices(win) {
  var promises = includedServices(win).map(function (service) {
    return _services.timerFor(win).timeoutPromise(LOAD_TIMEOUT, _service.getServicePromise(win, service), 'Render timeout waiting for service ' + service + ' to be ready.');
  });
  return Promise.all(promises);
}

/**
 * Returns true if the page has a render delaying service.
 * @param {!Window} win
 * @return {boolean}
 */

function hasRenderDelayingServices(win) {
  return includedServices(win).length > 0;
}

/**
 * Detects which, if any, render-delaying extensions are included on the page.
 * @param {!Window} win
 * @return {!Array<string>}
 */

function includedServices(win) {
  /** @const {!Document} */
  var doc = win.document;
  _log.dev().assert(doc.body);

  return Object.keys(SERVICES).filter(function (service) {
    return doc.querySelector(SERVICES[service]);
  });
}

},{"./log":21,"./service":33,"./services":35}],33:[function(require,module,exports){
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

},{"./log":21,"./polyfills":25}],34:[function(require,module,exports){
exports.__esModule = true;
exports.installDocumentStateService = installDocumentStateService;
exports.documentStateFor = documentStateFor;
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

var _observable = require('../observable');

var _style = require('../style');

var _dom = require('../dom');

var _service = require('../service');

/**
 */

var DocumentState = (function () {
  /**
   * @param {!Window} win
   */

  function DocumentState(win) {
    babelHelpers.classCallCheck(this, DocumentState);

    /** @const {!Window} */
    this.win = win;

    /** @private @const {!Document} */
    this.document_ = win.document;

    /** @private {string|null} */
    this.hiddenProp_ = _style.getVendorJsPropertyName(this.document_, 'hidden', true);
    if (this.document_[this.hiddenProp_] === undefined) {
      this.hiddenProp_ = null;
    }

    /** @private {string|null} */
    this.visibilityStateProp_ = _style.getVendorJsPropertyName(this.document_, 'visibilityState', true);
    if (this.document_[this.visibilityStateProp_] === undefined) {
      this.visibilityStateProp_ = null;
    }

    /** @private @const {!Observable} */
    this.visibilityObservable_ = new _observable.Observable();

    /** @private {string|null} */
    this.visibilityChangeEvent_ = null;
    if (this.hiddenProp_) {
      this.visibilityChangeEvent_ = 'visibilitychange';
      var vendorStop = this.hiddenProp_.indexOf('Hidden');
      if (vendorStop != -1) {
        this.visibilityChangeEvent_ = this.hiddenProp_.substring(0, vendorStop) + 'Visibilitychange';
      }
    }

    /** @private @const {!Function} */
    this.boundOnVisibilityChanged_ = this.onVisibilityChanged_.bind(this);
    if (this.visibilityChangeEvent_) {
      this.document_.addEventListener(this.visibilityChangeEvent_, this.boundOnVisibilityChanged_);
    }

    /** @private {?Observable} */
    this.bodyAvailableObservable_ = null;
  }

  /**
   * @param {!Window} window
   */

  /** @private */

  DocumentState.prototype.cleanup_ = function cleanup_() {
    if (this.visibilityChangeEvent_) {
      this.document_.removeEventListener(this.visibilityChangeEvent_, this.boundOnVisibilityChanged_);
    }
  };

  /**
   * Returns the value of "document.hidden" property. The reasons why it may
   * not be visible include document in a non-active tab or when the document
   * is being pre-rendered via link with rel="prerender".
   * @return {boolean}
   */

  DocumentState.prototype.isHidden = function isHidden() {
    if (!this.hiddenProp_) {
      return false;
    }
    return this.document_[this.hiddenProp_];
  };

  /**
   * Returns the value of "document.visibilityState" property. Possible values
   * are: 'hidden', 'visible', 'prerender', and 'unloaded'.
   * @return {string}
   */

  DocumentState.prototype.getVisibilityState = function getVisibilityState() {
    if (!this.visibilityStateProp_) {
      return this.isHidden() ? 'hidden' : 'visible';
    }
    return this.document_[this.visibilityStateProp_];
  };

  /**
   * @param {function()} handler
   * @return {!UnlistenDef}
   */

  DocumentState.prototype.onVisibilityChanged = function onVisibilityChanged(handler) {
    return this.visibilityObservable_.add(handler);
  };

  /** @private */

  DocumentState.prototype.onVisibilityChanged_ = function onVisibilityChanged_() {
    this.visibilityObservable_.fire();
  };

  /**
   * If body is already available, callback is called synchronously and null
   * is returned.
   * @param {function()} handler
   * @return {?UnlistenDef}
   */

  DocumentState.prototype.onBodyAvailable = function onBodyAvailable(handler) {
    var doc = this.document_;
    if (doc.body) {
      handler();
      return null;
    }
    if (!this.bodyAvailableObservable_) {
      this.bodyAvailableObservable_ = new _observable.Observable();
      _dom.waitForChild(doc.documentElement, function () {
        return !!doc.body;
      }, this.onBodyAvailable_.bind(this));
    }
    return this.bodyAvailableObservable_.add(handler);
  };

  /** @private */

  DocumentState.prototype.onBodyAvailable_ = function onBodyAvailable_() {
    this.bodyAvailableObservable_.fire();
    this.bodyAvailableObservable_.removeAll();
    this.bodyAvailableObservable_ = null;
  };

  return DocumentState;
})();

exports.DocumentState = DocumentState;

function installDocumentStateService(window) {
  _service.registerServiceBuilder(window, 'documentState', DocumentState);
}

/**
 * @param {!Window} window
 * @return {!DocumentState}
 */

function documentStateFor(window) {
  installDocumentStateService(window);
  return _service.getService(window, 'documentState');
}

},{"../dom":14,"../observable":24,"../service":33,"../style":39}],35:[function(require,module,exports){
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

},{"./element-service":15,"./service":33}],36:[function(require,module,exports){
exports.__esModule = true;
exports.createShadowRoot = createShadowRoot;
exports.isShadowRoot = isShadowRoot;
exports.getShadowRootNode = getShadowRootNode;
exports.createShadowEmbedRoot = createShadowEmbedRoot;
exports.importShadowBody = importShadowBody;
exports.installStylesForShadowRoot = installStylesForShadowRoot;
exports.copyRuntimeStylesToShadowRoot = copyRuntimeStylesToShadowRoot;
exports.transformShadowCss = transformShadowCss;
exports.scopeShadowCss = scopeShadowCss;
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

var _third_partyWebcomponentsjsShadowCSS = require('../third_party/webcomponentsjs/ShadowCSS');

var _ampdoc = require('./ampdoc');

var _log = require('./log');

var _dom = require('./dom');

var _services = require('./services');

var _styleInstaller = require('./style-installer');

var _webComponents = require('./web-components');

var _style = require('./style');

var _types = require('./types');

/**
 * Used for non-composed root-node search. See `getRootNode`.
 * @const {!GetRootNodeOptions}
 */
var UNCOMPOSED_SEARCH = { composed: false };

/** @const {!RegExp} */
var CSS_SELECTOR_BEG_REGEX = /[^\.\-\_0-9a-zA-Z]/;

/** @const {!RegExp} */
var CSS_SELECTOR_END_REGEX = /[^\-\_0-9a-zA-Z]/;

/**
 * Creates a shadow root for the specified host and returns it. Polyfills
 * shadow root creation if necessary.
 * @param {!Element} hostElement
 * @return {!ShadowRoot}
 */

function createShadowRoot(hostElement) {
  var existingRoot = hostElement.shadowRoot || hostElement.__AMP_SHADOW_ROOT;
  if (existingRoot) {
    existingRoot. /*OK*/innerHTML = '';
    return existingRoot;
  }

  // Native support.
  var shadowDomSupported = _webComponents.getShadowDomSupportedVersion();
  if (shadowDomSupported == _webComponents.ShadowDomVersion.V1) {
    return hostElement.attachShadow({ mode: 'open' });
  } else if (shadowDomSupported == _webComponents.ShadowDomVersion.V0) {
    return hostElement.createShadowRoot();
  }

  // Polyfill.
  return createShadowRootPolyfill(hostElement);
}

/**
 * Shadow root polyfill.
 * @param {!Element} hostElement
 * @return {!ShadowRoot}
 */
function createShadowRootPolyfill(hostElement) {
  var doc = hostElement.ownerDocument;
  /** @const {!Window} */
  var win = doc.defaultView;
  var shadowRoot = /** @type {!ShadowRoot} */
  // Cast to ShadowRoot even though it is an Element
  // TODO(@dvoytenko) Consider to switch to a type union instead.
  /** @type {?}  */doc.createElement('i-amphtml-shadow-root');
  shadowRoot.id = 'i-amphtml-sd-' + Math.floor(win.Math.random() * 10000);
  hostElement.appendChild(shadowRoot);
  hostElement.shadowRoot = hostElement.__AMP_SHADOW_ROOT = shadowRoot;

  // API: https://www.w3.org/TR/shadow-dom/#the-shadowroot-interface

  shadowRoot.host = hostElement;

  // `getElementById` is resolved via `querySelector('#id')`.
  shadowRoot.getElementById = function (id) {
    var escapedId = _dom.escapeCssSelectorIdent(win, id);
    return (/** @type {HTMLElement|null} */shadowRoot. /*OK*/querySelector('#' + escapedId)
    );
  };

  // The styleSheets property should have a list of local styles.
  Object.defineProperty(shadowRoot, 'styleSheets', {
    get: function () {
      if (!doc.styleSheets) {
        return [];
      }
      return _types.toArray(doc.styleSheets).filter(function (styleSheet) {
        return shadowRoot.contains(styleSheet.ownerNode);
      });
    }
  });

  return shadowRoot;
}

/**
 * Determines if value is actually a `ShadowRoot` node.
 * @param {*} value
 * @return {boolean}
 */

function isShadowRoot(value) {
  if (!value) {
    return false;
  }
  // Node.nodeType == DOCUMENT_FRAGMENT to speed up the tests. Unfortunately,
  // nodeType of DOCUMENT_FRAGMENT is used currently for ShadowRoot nodes.
  if (value.tagName == 'I-AMPHTML-SHADOW-ROOT') {
    return true;
  }
  return value.nodeType == /* DOCUMENT_FRAGMENT */11 && Object.prototype.toString.call(value) === '[object ShadowRoot]';
}

/**
 * Return shadow root for the specified node.
 * @param {!Node} node
 * @return {?ShadowRoot}
 */

function getShadowRootNode(node) {
  if (_webComponents.isShadowDomSupported() && Node.prototype.getRootNode) {
    return (/** @type {?ShadowRoot} */node.getRootNode(UNCOMPOSED_SEARCH)
    );
  }
  // Polyfill shadow root lookup.
  return (/** @type {?ShadowRoot} */_dom.closestNode(node, function (n) {
      return isShadowRoot(n);
    })
  );
}

/**
 * Creates a shadow root for an shadow embed.
 * @param {!Element} hostElement
 * @param {!Array<string>} extensionIds
 * @return {!ShadowRoot}
 */

function createShadowEmbedRoot(hostElement, extensionIds) {
  var shadowRoot = createShadowRoot(hostElement);
  shadowRoot.AMP = {};

  var win = hostElement.ownerDocument.defaultView;
  /** @const {!./service/extensions-impl.Extensions} */
  var extensions = _services.extensionsFor(win);
  var ampdocService = _ampdoc.ampdocServiceFor(win);
  var ampdoc = ampdocService.getAmpDoc(hostElement);

  // Instal runtime CSS.
  copyRuntimeStylesToShadowRoot(ampdoc, shadowRoot);

  // Install extensions.
  extensionIds.forEach(function (extensionId) {
    return extensions.loadExtension(extensionId);
  });

  // Apply extensions factories, such as CSS.
  extensions.installFactoriesInShadowRoot(shadowRoot, extensionIds);

  return shadowRoot;
}

/**
 * Imports a body into a shadow root with the workaround for a polyfill case.
 * @param {!ShadowRoot} shadowRoot
 * @param {!Element} body
 * @param {boolean} deep
 * @return {!Element}
 */

function importShadowBody(shadowRoot, body, deep) {
  var doc = shadowRoot.ownerDocument;
  var resultBody = undefined;
  if (_webComponents.isShadowDomSupported()) {
    resultBody = _log.dev().assertElement(doc.importNode(body, deep));
  } else {
    resultBody = doc.createElement('amp-body');
    _style.setStyle(resultBody, 'display', 'block');
    for (var i = 0; i < body.attributes.length; i++) {
      resultBody.setAttribute(body.attributes[0].name, body.attributes[0].value);
    }
    if (deep) {
      for (var n = body.firstChild; !!n; n = n.nextSibling) {
        resultBody.appendChild(doc.importNode(n, true));
      }
    }
  }
  _style.setStyle(resultBody, 'position', 'relative');
  shadowRoot.appendChild(resultBody);
  Object.defineProperty(shadowRoot, 'body', { value: resultBody });
  return resultBody;
}

/**
 * Adds the given css text to the given shadow root.
 *
 * The style tags will be at the beginning of the shadow root before all author
 * styles. One element can be the main runtime CSS. This is guaranteed
 * to always be the first stylesheet in the doc.
 *
 * @param {!ShadowRoot} shadowRoot
 * @param {string} cssText
 * @param {boolean=} opt_isRuntimeCss If true, this style tag will be inserted
 *     as the first element in head and all style elements will be positioned
 *     after.
 * @param {string=} opt_ext
 * @return {!Element}
 */

function installStylesForShadowRoot(shadowRoot, cssText, opt_isRuntimeCss, opt_ext) {
  return _styleInstaller.insertStyleElement(_log.dev().assert(shadowRoot.ownerDocument), shadowRoot, transformShadowCss(shadowRoot, cssText), opt_isRuntimeCss || false, opt_ext || null);
}

/*
 * Copies runtime styles from the ampdoc context into a shadow root.
 * @param {!./service/ampdoc-impl.AmpDoc} ampdoc
 * @param {!ShadowRoot} shadowRoot
 */

function copyRuntimeStylesToShadowRoot(ampdoc, shadowRoot) {
  var style = _log.dev().assert(ampdoc.getRootNode().querySelector('style[amp-runtime]'), 'Runtime style is not found in the ampdoc: %s', ampdoc.getRootNode());
  var cssText = style.textContent;
  installStylesForShadowRoot(shadowRoot, cssText, /* opt_isRuntimeCss */true);
}

/**
 * If necessary, transforms CSS to isolate AMP CSS within the shaodw root and
 * reduce the possibility of high-level conflicts.
 * @param {!ShadowRoot} shadowRoot
 * @param {string} css
 * @return {string}
 */

function transformShadowCss(shadowRoot, css) {
  if (_webComponents.isShadowDomSupported()) {
    return css;
  }
  return scopeShadowCss(shadowRoot, css);
}

/**
 * Transforms CSS to isolate AMP CSS within the shadow root and reduce the
 * possibility of high-level conflicts. There are two types of transformations:
 * 1. Root transformation: `body` -> `amp-body`, etc.
 * 2. Scoping: `a {}` -> `#i-amphtml-sd-123 a {}`.
 *
 * @param {!ShadowRoot} shadowRoot
 * @param {string} css
 * @return {string}
 * @visibleForTesting
 */

function scopeShadowCss(shadowRoot, css) {
  var id = _log.dev().assert(shadowRoot.id);
  var doc = shadowRoot.ownerDocument;
  var rules = null;
  // Try to use a separate document.
  try {
    rules = getStylesheetRules(doc.implementation.createHTMLDocument(''), css);
  } catch (e) {}
  // Ignore.

  // Try to use the current document.
  if (!rules) {
    try {
      rules = getStylesheetRules(doc, css);
    } catch (e) {
      // Ignore.
    }
  }

  // No rules could be parsed - return css as is.
  if (!rules) {
    return css;
  }

  // Patch selectors.
  // Invoke `ShadowCSS.scopeRules` via `call` because the way it uses `this`
  // internally conflicts with Closure compiler's advanced optimizations.
  var scopeRules = _third_partyWebcomponentsjsShadowCSS.ShadowCSS.scopeRules;
  return scopeRules.call(_third_partyWebcomponentsjsShadowCSS.ShadowCSS, rules, '#' + id, transformRootSelectors);
}

/**
 * Replaces top-level selectors such as `html` and `body` with their polyfill
 * counterparts: `amp-html` and `amp-body`.
 * @param {string} selector
 * @return {string}
 */
function transformRootSelectors(selector) {
  return selector.replace(/(html|body)/g, rootSelectorPrefixer);
}

/**
 * See `transformRootSelectors`.
 * @param {string} match
 * @param {string} name
 * @param {number} pos
 * @param {string} selector
 * @return {string}
 * @private
 */
function rootSelectorPrefixer(match, name, pos, selector) {
  var prev = selector.charAt(pos - 1);
  var next = selector.charAt(pos + match.length);
  if ((!prev || CSS_SELECTOR_BEG_REGEX.test(prev)) && (!next || CSS_SELECTOR_END_REGEX.test(next))) {
    return 'amp-' + match;
  }
  return match;
}

/**
 * @param {!Document} doc
 * @param {string} css
 * @return {?CSSRuleList}
 */
function getStylesheetRules(doc, css) {
  var style = doc.createElement('style');
  style. /*OK*/textContent = css;
  try {
    (doc.head || doc.documentElement).appendChild(style);
    if (style.sheet) {
      return style.sheet.cssRules;
    }
    return null;
  } finally {
    if (style.parentNode) {
      style.parentNode.removeChild(style);
    }
  }
}

/**
 * Takes as an input a text stream, parses it and incrementally reconstructs
 * it in the shadow root.
 *
 * See https://jakearchibald.com/2016/fun-hacks-faster-content/ for more
 * details.
 *
 * @implements {WritableStreamDefaultWriter}
 */

var ShadowDomWriter = (function () {
  /**
   * @param {!Window} win
   */

  function ShadowDomWriter(win) {
    babelHelpers.classCallCheck(this, ShadowDomWriter);

    /** @const @private {!Document} */
    this.parser_ = win.document.implementation.createHTMLDocument('');
    this.parser_.open();

    /** @const @private */
    this.vsync_ = _services.vsyncFor(win);

    /** @private @const */
    this.boundMerge_ = this.merge_.bind(this);

    /** @private {?function(!Document):!Element} */
    this.onBody_ = null;

    /** @private {?function()} */
    this.onBodyChunk_ = null;

    /** @private {?function()} */
    this.onEnd_ = null;

    /** @private {boolean} */
    this.mergeScheduled_ = false;

    /** @const @private {!Promise} */
    this.success_ = Promise.resolve();

    /** @private {boolean} */
    this.eof_ = false;

    /** @private {?Element} */
    this.targetBody_ = null;
  }

  /**
   * Sets the callback that will be called when body has been parsed.
   *
   * Unlike most of other nodes, `<body>` cannot be simply merged to support
   * SD polyfill where the use of `<body>` element is not possible. The
   * callback will be given the parsed document and it must return back
   * the reconstructed `<body>` node in the target DOM where all children
   * will be streamed into.
   *
   * @param {function(!Document):!Element} callback
   */

  ShadowDomWriter.prototype.onBody = function onBody(callback) {
    this.onBody_ = callback;
  };

  /**
   * Sets the callback that will be called when new nodes have been merged
   * into the target DOM.
   * @param {function()} callback
   */

  ShadowDomWriter.prototype.onBodyChunk = function onBodyChunk(callback) {
    this.onBodyChunk_ = callback;
  };

  /**
   * Sets the callback that will be called when the DOM has been fully
   * constructed.
   * @param {function()} callback
   */

  ShadowDomWriter.prototype.onEnd = function onEnd(callback) {
    this.onEnd_ = callback;
  };

  /** @override */

  ShadowDomWriter.prototype.write = function write(chunk) {
    if (this.eof_) {
      throw new Error('closed already');
    }
    if (chunk) {
      this.parser_.write( /** @type {string} */chunk);
    }
    this.schedule_();
    return this.success_;
  };

  /** @override */

  ShadowDomWriter.prototype.close = function close() {
    this.parser_.close();
    this.eof_ = true;
    this.schedule_();
    return this.success_;
  };

  /** @private */

  ShadowDomWriter.prototype.schedule_ = function schedule_() {
    _log.dev().assert(this.onBody_ && this.onBodyChunk_ && this.onEnd_);
    if (!this.mergeScheduled_) {
      this.mergeScheduled_ = true;
      this.vsync_.mutate(this.boundMerge_);
    }
  };

  /** @private */

  ShadowDomWriter.prototype.merge_ = function merge_() {
    this.mergeScheduled_ = false;

    // Body has been newly parsed.
    if (!this.targetBody_ && this.parser_.body) {
      this.targetBody_ = this.onBody_(this.parser_);
    }

    // Merge body children.
    if (this.targetBody_) {
      var inputBody = _log.dev().assert(this.parser_.body);
      var targetBody = _log.dev().assert(this.targetBody_);
      var transferCount = 0;
      while (inputBody.firstChild) {
        transferCount++;
        targetBody.appendChild(inputBody.firstChild);
      }
      if (transferCount > 0) {
        this.onBodyChunk_();
      }
    }

    // EOF.
    if (this.eof_) {
      this.onEnd_();
    }
  };

  return ShadowDomWriter;
})();

exports.ShadowDomWriter = ShadowDomWriter;

},{"../third_party/webcomponentsjs/ShadowCSS":48,"./ampdoc":10,"./dom":14,"./log":21,"./services":35,"./style":39,"./style-installer":38,"./types":40,"./web-components":46}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
exports.__esModule = true;
exports.installStyles = installStyles;
exports.insertStyleElement = insertStyleElement;
exports.makeBodyVisible = makeBodyVisible;
exports.bodyAlwaysVisible = bodyAlwaysVisible;
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

var _serviceDocumentState = require('./service/document-state');

var _services = require('./services');

var _style = require('./style');

var _renderDelayingServices = require('./render-delaying-services');

var bodyVisibleSentinel = '__AMP_BODY_VISIBLE';

/**
 * Adds the given css text to the given document.
 *
 * The style tags will be at the beginning of the head before all author
 * styles. One element can be the main runtime CSS. This is guaranteed
 * to always be the first stylesheet in the doc.
 *
 * @param {!Document} doc The document that should get the new styles.
 * @param {string} cssText
 * @param {function(!Element)} cb Called when the new styles are available.
 *     Not using a promise, because this is synchronous when possible.
 *     for better performance.
 * @param {boolean=} opt_isRuntimeCss If true, this style tag will be inserted
 *     as the first element in head and all style elements will be positioned
 *     after.
 * @param {string=} opt_ext
 * @return {!Element}
 */

function installStyles(doc, cssText, cb, opt_isRuntimeCss, opt_ext) {
  var style = insertStyleElement(doc, _log.dev().assertElement(doc.head), cssText, opt_isRuntimeCss || false, opt_ext || null);

  // Styles aren't always available synchronously. E.g. if there is a
  // pending style download, it will have to finish before the new
  // style is visible.
  // For this reason we poll until the style becomes available.
  // Sync case.
  if (styleLoaded(doc, style)) {
    cb(style);
    return style;
  }
  // Poll until styles are available.
  var interval = setInterval(function () {
    if (styleLoaded(doc, style)) {
      clearInterval(interval);
      cb(style);
    }
  }, 4);
  return style;
}

/**
 * Creates the properly configured style element.
 * @param {?Document} doc
 * @param {!Element|!ShadowRoot} cssRoot
 * @param {string} cssText
 * @param {boolean} isRuntimeCss
 * @param {?string} ext
 * @return {!Element}
 */

function insertStyleElement(doc, cssRoot, cssText, isRuntimeCss, ext) {
  // Check if it has already been created.
  if (isRuntimeCss && cssRoot.runtimeStyleElement) {
    return cssRoot.runtimeStyleElement;
  }

  // Check if the style has already been added by the server layout.
  if (cssRoot.parentElement && cssRoot.parentElement.hasAttribute('i-amphtml-layout') && (isRuntimeCss || ext && ext != 'amp-custom')) {
    var existing = isRuntimeCss ? cssRoot.querySelector('style[amp-runtime]') : cssRoot. /*OK*/querySelector('style[amp-extension=' + ext + ']');
    if (existing) {
      if (isRuntimeCss) {
        cssRoot.runtimeStyleElement = existing;
      }
      return existing;
    }
  }

  // Create the new style element and append to cssRoot.
  var style = doc.createElement('style');
  style. /*OK*/textContent = cssText;
  var afterElement = null;
  // Make sure that we place style tags after the main runtime CSS. Otherwise
  // the order is random.
  if (isRuntimeCss) {
    style.setAttribute('amp-runtime', '');
    cssRoot.runtimeStyleElement = style;
  } else if (ext == 'amp-custom') {
    style.setAttribute('amp-custom', '');
    afterElement = cssRoot.lastChild;
  } else {
    style.setAttribute('amp-extension', ext || '');
    afterElement = cssRoot.runtimeStyleElement;
  }
  insertAfterOrAtStart(cssRoot, style, afterElement);
  return style;
}

/**
 * Sets the document's body opacity to 1.
 * If the body is not yet available (because our script was loaded
 * synchronously), polls until it is.
 * @param {!Document} doc The document who's body we should make visible.
 * @param {boolean=} opt_waitForServices Whether the body visibility should
 *     be blocked on key services being loaded.
 */

function makeBodyVisible(doc, opt_waitForServices) {
  /** @const {!Window} */
  var win = doc.defaultView;
  if (win[bodyVisibleSentinel]) {
    return;
  }
  var set = function () {
    _style.setStyles(_log.dev().assertElement(doc.body), {
      opacity: 1,
      visibility: 'visible',
      animation: 'none'
    });
    renderStartedNoInline(doc);
  };
  try {
    _serviceDocumentState.documentStateFor(win).onBodyAvailable(function () {
      if (win[bodyVisibleSentinel]) {
        return;
      }
      win[bodyVisibleSentinel] = true;
      if (opt_waitForServices) {
        _renderDelayingServices.waitForServices(win)['catch'](function (reason) {
          _log.rethrowAsync(reason);
          return [];
        }).then(function (services) {
          set();
          if (services.length > 0) {
            _services.resourcesForDoc(doc). /*OK*/schedulePass(1, /* relayoutAll */true);
          }
          try {
            var perf = _services.performanceFor(win);
            perf.tick('mbv');
            perf.flush();
          } catch (e) {}
        });
      } else {
        set();
      }
    });
  } catch (e) {
    // If there was an error during the logic above (such as service not
    // yet installed, definitely try to make the body visible.
    set();
    // Avoid errors in the function to break execution flow as this is
    // often called as a last resort.
    _log.rethrowAsync(e);
  }
}

/**
 * @param {!Document} doc
 */
function renderStartedNoInline(doc) {
  try {
    _services.resourcesForDoc(doc).renderStarted();
  } catch (e) {
    // `makeBodyVisible` is called in the error-processing cycle and thus
    // could be triggered when runtime's initialization is incomplete which
    // would cause unrelated errors to be thrown here.
  }
}

/**
 * Indicates that the body is always visible. For instance, in case of PWA.
 * @param {!Window} win
 */

function bodyAlwaysVisible(win) {
  win[bodyVisibleSentinel] = true;
}

/**
 * Checks whether a style element was registered in the DOM.
 * @param {!Document} doc
 * @param {!Element} style
 * @return {boolean}
 */
function styleLoaded(doc, style) {
  var sheets = doc.styleSheets;
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    if (sheet.ownerNode == style) {
      return true;
    }
  }
  return false;
};

/**
 * Insert the element in the root after the element named after or
 * if that is null at the beginning.
 * @param {!Element|!ShadowRoot} root
 * @param {!Element} element
 * @param {?Element} after
 */
function insertAfterOrAtStart(root, element, after) {
  if (after) {
    if (after.nextSibling) {
      root.insertBefore(element, after.nextSibling);
    } else {
      root.appendChild(element);
    }
  } else {
    // Add at the start.
    root.insertBefore(element, root.firstChild);
  }
}

},{"./log":21,"./render-delaying-services":32,"./service/document-state":34,"./services":35,"./style":39}],39:[function(require,module,exports){
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

},{"./string":37,"./utils/object.js":44}],40:[function(require,module,exports){
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

},{}],41:[function(require,module,exports){
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

},{}],42:[function(require,module,exports){
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

},{"./config":12,"./log":21,"./mode":23,"./string":37,"./types":40,"./url-parse-query-string":41}],43:[function(require,module,exports){
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

},{"../log":21,"../types":40}],44:[function(require,module,exports){
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

},{"../types":40}],45:[function(require,module,exports){
exports.__esModule = true;
exports.some = some;
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
 * Returns a promise which resolves if a threshold amount of the given promises
 * resolve, and rejects otherwise.
 * @param {!Array<!Promise>} promises The array of promises to test.
 * @param {number} count The number of promises that must resolve for the
 *     returned promise to resolve.
 * @return {!Promise} A promise that resolves if any of the given promises
 *     resolve, and which rejects otherwise.
 */

function some(promises) {
  var count = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];

  return new Promise(function (resolve, reject) {
    count = Math.max(count, 0);
    var extra = promises.length - count;
    if (extra < 0) {
      reject(new Error('not enough promises to resolve'));
    }
    if (promises.length == 0) {
      resolve([]);
    }
    var values = [];
    var reasons = [];

    var onFulfilled = function (value) {
      if (values.length < count) {
        values.push(value);
      }
      if (values.length == count) {
        resolve(values);
      }
    };
    var onRejected = function (reason) {
      if (reasons.length <= extra) {
        reasons.push(reason);
      }
      if (reasons.length > extra) {
        reject(reasons);
      }
    };
    for (var i = 0; i < promises.length; i++) {
      Promise.resolve(promises[i]).then(onFulfilled, onRejected);
    }
  });
}

/**
 * Resolves with the result of the last promise added.
 * @implements {IThenable}
 */

var LastAddedResolver = (function () {
  /**
   * @param {!Array<!Promise>=} opt_promises
   */

  function LastAddedResolver(opt_promises) {
    babelHelpers.classCallCheck(this, LastAddedResolver);

    var resolve_ = undefined,
        reject_ = undefined;
    /** @private @const {!Promise} */
    this.promise_ = new Promise(function (resolve, reject) {
      resolve_ = resolve;
      reject_ = reject;
    });

    /** @private */
    this.resolve_ = resolve_;

    /** @private */
    this.reject_ = reject_;

    /** @private */
    this.count_ = 0;

    if (opt_promises) {
      for (var i = 0; i < opt_promises.length; i++) {
        this.add(opt_promises[i]);
      }
    }
  }

  /**
   * Add a promise to possibly be resolved.
   * @param {!Promise} promise
   * @return {!Promise}
   */

  LastAddedResolver.prototype.add = function add(promise) {
    var _this = this;

    var countAtAdd = ++this.count_;
    Promise.resolve(promise).then(function (result) {
      if (_this.count_ === countAtAdd) {
        _this.resolve_(result);
      }
    }, function (error) {
      // Don't follow behavior of Promise.all and Promise.race error so that
      // this will only reject when most recently added promise fails.
      if (_this.count_ === countAtAdd) {
        _this.reject_(error);
      }
    });
    return this.promise_;
  };

  /** @override */

  LastAddedResolver.prototype.then = function then(opt_resolve, opt_reject) {
    return this.promise_.then(opt_resolve, opt_reject);
  };

  return LastAddedResolver;
})();

exports.LastAddedResolver = LastAddedResolver;

},{}],46:[function(require,module,exports){
exports.__esModule = true;
exports.setShadowDomSupportedVersionForTesting = setShadowDomSupportedVersionForTesting;
exports.isShadowDomSupported = isShadowDomSupported;
exports.getShadowDomSupportedVersion = getShadowDomSupportedVersion;
exports.isNative = isNative;
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
 * Possible versions of Shadow DOM spec
 * @const
 * @enum {string}
 */
var ShadowDomVersion = {
  NONE: 'none',
  V0: 'v0',
  V1: 'v1'
};

exports.ShadowDomVersion = ShadowDomVersion;
/**
 * @type {ShadowDomVersion|undefined}
 * @visibleForTesting
 */
var shadowDomSupportedVersion = undefined;

/**
 * @param {ShadowDomVersion|undefined} val
 * @visibleForTesting
 */

function setShadowDomSupportedVersionForTesting(val) {
  shadowDomSupportedVersion = val;
}

/**
 * Returns `true` if the Shadow DOM is supported.
 * @return {boolean}
 */

function isShadowDomSupported() {
  return getShadowDomSupportedVersion() != ShadowDomVersion.NONE;
}

/**
 * Returns the supported version of Shadow DOM spec.
 * @param {Function=} opt_elementClass optional for testing
 * @return {ShadowDomVersion}
 */

function getShadowDomSupportedVersion(opt_elementClass) {
  if (shadowDomSupportedVersion === undefined) {

    //TODO: Remove native CE check once WebReflection/document-register-element#96 is fixed.
    if (!areNativeCustomElementsSupported()) {
      shadowDomSupportedVersion = ShadowDomVersion.NONE;
    } else {
      shadowDomSupportedVersion = getShadowDomVersion(opt_elementClass || Element);
    }
  }

  return shadowDomSupportedVersion;
}

function getShadowDomVersion(element) {
  if (!!element.prototype.attachShadow) {
    return ShadowDomVersion.V1;
  } else if (!!element.prototype.createShadowRoot) {
    return ShadowDomVersion.V0;
  }

  return ShadowDomVersion.NONE;
}

function areNativeCustomElementsSupported() {
  return isNative(self.document.registerElement) || isNative(self.Object.getOwnPropertyDescriptor(self, 'customElements').get);
}

/**
 * Returns `true` if the method is natively implemented by the browser
 * @visibleForTesting
 * @param {Function=} method
 * @return {boolean}
 */

function isNative(method) {
  return !!method && method.toString().indexOf('[native code]') !== -1;
}

},{}],47:[function(require,module,exports){
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

},{}],48:[function(require,module,exports){
exports.__esModule = true;
/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

/*
  This is a limited shim for ShadowDOM css styling.
  https://dvcs.w3.org/hg/webcomponents/raw-file/tip/spec/shadow/index.html#styles

  The intention here is to support only the styling features which can be
  relatively simply implemented. The goal is to allow users to avoid the
  most obvious pitfalls and do so without compromising performance significantly.
  For ShadowDOM styling that's not covered here, a set of best practices
  can be provided that should allow users to accomplish more complex styling.

  The following is a list of specific ShadowDOM styling features and a brief
  discussion of the approach used to shim.

  Shimmed features:

  * :host, :host-context: ShadowDOM allows styling of the shadowRoot's host
  element using the :host rule. To shim this feature, the :host styles are
  reformatted and prefixed with a given scope name and promoted to a
  document level stylesheet.
  For example, given a scope name of .foo, a rule like this:

    :host {
        background: red;
      }
    }

  becomes:

    .foo {
      background: red;
    }

  * encapsultion: Styles defined within ShadowDOM, apply only to
  dom inside the ShadowDOM. Polymer uses one of two techniques to imlement
  this feature.

  By default, rules are prefixed with the host element tag name
  as a descendant selector. This ensures styling does not leak out of the 'top'
  of the element's ShadowDOM. For example,

  div {
      font-weight: bold;
    }

  becomes:

  x-foo div {
      font-weight: bold;
    }

  becomes:


  Alternatively, if WebComponents.ShadowCSS.strictStyling is set to true then
  selectors are scoped by adding an attribute selector suffix to each
  simple selector that contains the host element tag name. Each element
  in the element's ShadowDOM template is also given the scope attribute.
  Thus, these rules match only elements that have the scope attribute.
  For example, given a scope name of x-foo, a rule like this:

    div {
      font-weight: bold;
    }

  becomes:

    div[x-foo] {
      font-weight: bold;
    }

  Note that elements that are dynamically added to a scope must have the scope
  selector added to them manually.

  * upper/lower bound encapsulation: Styles which are defined outside a
  shadowRoot should not cross the ShadowDOM boundary and should not apply
  inside a shadowRoot.

  This styling behavior is not emulated. Some possible ways to do this that
  were rejected due to complexity and/or performance concerns include: (1) reset
  every possible property for every possible selector for a given scope name;
  (2) re-implement css in javascript.

  As an alternative, users should make sure to use selectors
  specific to the scope in which they are working.

  * ::distributed: This behavior is not emulated. It's often not necessary
  to style the contents of a specific insertion point and instead, descendants
  of the host element can be styled selectively. Users can also create an
  extra node around an insertion point and style that node's contents
  via descendent selectors. For example, with a shadowRoot like this:

    <style>
      ::content(div) {
        background: red;
      }
    </style>
    <content></content>

  could become:

    <style>
      / *@polyfill .content-container div * /
      ::content(div) {
        background: red;
      }
    </style>
    <div class="content-container">
      <content></content>
    </div>

  Note the use of @polyfill in the comment above a ShadowDOM specific style
  declaration. This is a directive to the styling shim to use the selector
  in comments in lieu of the next selector when running under polyfill.
*/

var ShadowCSS = {
  strictStyling: false,
  // change a selector like 'div' to 'name div'
  /** @this {ShadowCSS} */
  scopeRules: function (cssRules, scopeSelector, opt_transformer) {
    var cssText = '';
    if (cssRules) {
      Array.prototype.forEach.call(cssRules, function (rule) {
        if (rule.selectorText && rule.style && rule.style.cssText !== undefined) {
          cssText += this.scopeSelector(rule.selectorText, scopeSelector, this.strictStyling, opt_transformer) + ' {\n\t';
          cssText += this.propertiesFromRule(rule) + '\n}\n\n';
        } else if (rule.type === CSSRule.MEDIA_RULE) {
          cssText += '@media ' + rule.media.mediaText + ' {\n';
          cssText += this.scopeRules(rule.cssRules, scopeSelector);
          cssText += '\n}\n\n';
        } else {
          // KEYFRAMES_RULE in IE throws when we query cssText
          // when it contains a -webkit- property.
          // if this happens, we fallback to constructing the rule
          // from the CSSRuleSet
          // https://connect.microsoft.com/IE/feedbackdetail/view/955703/accessing-csstext-of-a-keyframe-rule-that-contains-a-webkit-property-via-cssom-generates-exception
          try {
            if (rule.cssText) {
              cssText += rule.cssText + '\n\n';
            }
          } catch (x) {
            if (rule.type === CSSRule.KEYFRAMES_RULE && rule.cssRules) {
              cssText += this.ieSafeCssTextFromKeyFrameRule(rule);
            }
          }
        }
      }, this);
    }
    return cssText;
  },
  /** @this {ShadowCSS} */
  ieSafeCssTextFromKeyFrameRule: function (rule) {
    var cssText = '@keyframes ' + rule.name + ' {';
    Array.prototype.forEach.call(rule.cssRules, function (rule) {
      cssText += ' ' + rule.keyText + ' {' + rule.style.cssText + '}';
    });
    cssText += ' }';
    return cssText;
  },
  /** @this {ShadowCSS} */
  scopeSelector: function (selector, scopeSelector, strict, opt_transformer) {
    var r = [],
        parts = selector.split(',');
    parts.forEach(function (p) {
      p = p.trim();
      if (opt_transformer) {
        p = opt_transformer(p);
      }
      if (this.selectorNeedsScoping(p, scopeSelector)) {
        p = strict && !p.match(polyfillHostNoCombinator) ? this.applyStrictSelectorScope(p, scopeSelector) : this.applySelectorScope(p, scopeSelector);
      }
      r.push(p);
    }, this);
    return r.join(', ');
  },
  /** @this {ShadowCSS} */
  selectorNeedsScoping: function (selector, scopeSelector) {
    if (Array.isArray(scopeSelector)) {
      return true;
    }
    var re = this.makeScopeMatcher(scopeSelector);
    return !selector.match(re);
  },
  /** @this {ShadowCSS} */
  makeScopeMatcher: function (scopeSelector) {
    scopeSelector = scopeSelector.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
    return new RegExp('^(' + scopeSelector + ')' + selectorReSuffix, 'm');
  },
  /** @this {ShadowCSS} */
  applySelectorScope: function (selector, selectorScope) {
    return Array.isArray(selectorScope) ? this.applySelectorScopeList(selector, selectorScope) : this.applySimpleSelectorScope(selector, selectorScope);
  },
  // apply an array of selectors
  /** @this {ShadowCSS} */
  applySelectorScopeList: function (selector, scopeSelectorList) {
    var r = [];
    for (var i = 0, s; s = scopeSelectorList[i]; i++) {
      r.push(this.applySimpleSelectorScope(selector, s));
    }
    return r.join(', ');
  },
  // scope via name and [is=name]
  /** @this {ShadowCSS} */
  applySimpleSelectorScope: function (selector, scopeSelector) {
    if (selector.match(polyfillHostRe)) {
      selector = selector.replace(polyfillHostNoCombinator, scopeSelector);
      return selector.replace(polyfillHostRe, scopeSelector + ' ');
    } else {
      return scopeSelector + ' ' + selector;
    }
  },
  // return a selector with [name] suffix on each simple selector
  // e.g. .foo.bar > .zot becomes .foo[name].bar[name] > .zot[name]
  /** @this {ShadowCSS} */
  applyStrictSelectorScope: function (selector, scopeSelector) {
    scopeSelector = scopeSelector.replace(/\[is=([^\]]*)\]/g, '$1');
    var splits = [' ', '>', '+', '~'],
        scoped = selector,
        attrName = '[' + scopeSelector + ']';
    splits.forEach(function (sep) {
      var parts = scoped.split(sep);
      scoped = parts.map(function (p) {
        // remove :host since it should be unnecessary
        var t = p.trim().replace(polyfillHostRe, '');
        if (t && splits.indexOf(t) < 0 && t.indexOf(attrName) < 0) {
          p = t.replace(/([^:]*)(:*)(.*)/, '$1' + attrName + '$2$3');
        }
        return p;
      }).join(sep);
    });
    return scoped;
  },
  /** @this {ShadowCSS} */
  propertiesFromRule: function (rule) {
    var cssText = rule.style.cssText;
    // TODO(sorvell): Safari cssom incorrectly removes quotes from the content
    // property. (https://bugs.webkit.org/show_bug.cgi?id=118045)
    // don't replace attr rules
    if (rule.style.content && !rule.style.content.match(/['"]+|attr/)) {
      cssText = cssText.replace(/content:[^;]*;/g, 'content: \'' + rule.style.content + '\';');
    }
    // TODO(sorvell): we can workaround this issue here, but we need a list
    // of troublesome properties to fix https://github.com/Polymer/platform/issues/53
    //
    // inherit rules can be omitted from cssText
    // TODO(sorvell): remove when Blink bug is fixed:
    // https://code.google.com/p/chromium/issues/detail?id=358273
    var style = rule.style;
    for (var i in style) {
      if (style[i] === 'initial') {
        cssText += i + ': initial; ';
      }
    }
    return cssText;
  }
};

exports.ShadowCSS = ShadowCSS;
var selectorRe = /([^{]*)({[\s\S]*?})/gim,
    cssCommentRe = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//gim,

// TODO(sorvell): remove either content or comment
cssCommentNextSelectorRe = /\/\*\s*@polyfill ([^*]*\*+([^/*][^*]*\*+)*\/)([^{]*?){/gim,
    cssContentNextSelectorRe = /polyfill-next-selector[^}]*content\:[\s]*?['"](.*?)['"][;\s]*}([^{]*?){/gim,

// TODO(sorvell): remove either content or comment
cssCommentRuleRe = /\/\*\s@polyfill-rule([^*]*\*+([^/*][^*]*\*+)*)\//gim,
    cssContentRuleRe = /(polyfill-rule)[^}]*(content\:[\s]*['"](.*?)['"])[;\s]*[^}]*}/gim,

// TODO(sorvell): remove either content or comment
cssCommentUnscopedRuleRe = /\/\*\s@polyfill-unscoped-rule([^*]*\*+([^/*][^*]*\*+)*)\//gim,
    cssContentUnscopedRuleRe = /(polyfill-unscoped-rule)[^}]*(content\:[\s]*['"](.*?)['"])[;\s]*[^}]*}/gim,
    cssPseudoRe = /::(x-[^\s{,(]*)/gim,
    cssPartRe = /::part\(([^)]*)\)/gim,

// note: :host pre-processed to -shadowcsshost.
polyfillHost = '-shadowcsshost',

// note: :host-context pre-processed to -shadowcsshostcontext.
polyfillHostContext = '-shadowcsscontext',
    parenSuffix = ')(?:\\((' + '(?:\\([^)(]*\\)|[^)(]*)+?' + ')\\))?([^,{]*)';
var cssColonHostRe = new RegExp('(' + polyfillHost + parenSuffix, 'gim'),
    cssColonHostContextRe = new RegExp('(' + polyfillHostContext + parenSuffix, 'gim'),
    selectorReSuffix = '([>\\s~+\[.,{:][\\s\\S]*)?$',
    colonHostRe = /\:host/gim,
    colonHostContextRe = /\:host-context/gim,

/* host name without combinator */
polyfillHostNoCombinator = polyfillHost + '-no-combinator',
    polyfillHostRe = new RegExp(polyfillHost, 'gim'),
    polyfillHostContextRe = new RegExp(polyfillHostContext, 'gim'),
    shadowDOMSelectorsRe = [/>>>/g, /::shadow/g, /::content/g,
// Deprecated selectors
/\/deep\//g, // former >>>
/\/shadow\//g, // former ::shadow
/\/shadow-deep\//g, // former /deep/
/\^\^/g, // former /shadow/
/\^(?!=)/g // former /shadow-deep/
];

},{}]},{},[2])


})});
//# sourceMappingURL=amp-form-0.1.max.js.map