(self.AMP=self.AMP||[]).push({n:"amp-animation",v:"1499663230322",f:(function(AMP){(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

var _webAnimations = require('./web-animations');

var _scrollboundScene = require('./scrollbound-scene');

var _srcPass = require('../../../src/pass');

var _webAnimationTypes = require('./web-animation-types');

var _srcDom = require('../../../src/dom');

var _srcFriendlyIframeEmbed = require('../../../src/friendly-iframe-embed');

var _srcMode = require('../../../src/mode');

var _srcService = require('../../../src/service');

var _srcExperiments = require('../../../src/experiments');

var _webAnimationsJsWebAnimationsInstall = require('web-animations-js/web-animations.install');

var _srcEventHelper = require('../../../src/event-helper');

var _srcStyle = require('../../../src/style');

var _srcJson = require('../../../src/json');

var _srcLog = require('../../../src/log');

var _srcServices = require('../../../src/services');

var TAG = 'amp-animation';

var AmpAnimation = (function (_AMP$BaseElement) {
  babelHelpers.inherits(AmpAnimation, _AMP$BaseElement);

  /** @param {!AmpElement} element */

  function AmpAnimation(element) {
    babelHelpers.classCallCheck(this, AmpAnimation);

    _AMP$BaseElement.call(this, element);

    /** @private {boolean} */
    this.triggerOnVisibility_ = false;

    /** @private {boolean} */
    this.visible_ = false;

    /** @private {boolean} */
    this.triggered_ = false;

    /** @private {?../../../src/friendly-iframe-embed.FriendlyIframeEmbed} */
    this.embed_ = null;

    /** @private {?JsonObject} */
    this.configJson_ = null;

    /** @private {?./web-animations.WebAnimationRunner} */
    this.runner_ = null;

    /** @private {?Pass} */
    this.restartPass_ = null;
  }

  /** @override */

  AmpAnimation.prototype.buildCallback = function buildCallback() {
    var _this = this;

    _srcLog.user().assert(_srcExperiments.isExperimentOn(this.win, TAG), 'Experiment "' + TAG + '" is disabled.');

    // TODO(dvoytenko): Remove once we support direct parent visibility.
    _srcLog.user().assert(this.element.parentNode == this.element.ownerDocument.body, TAG + ' is only allowed as a direct child of <body> element.' + ' This restriction will be removed soon.');

    // Trigger.
    var trigger = this.element.getAttribute('trigger');
    if (trigger) {
      this.triggerOnVisibility_ = _srcLog.user().assert(trigger == 'visibility', 'Only allowed value for "trigger" is "visibility": %s', this.element);
    }

    // Parse config.
    var scriptElement = _srcLog.user().assert(_srcDom.childElementByTag(this.element, 'script'), '"<script type=application/json>" must be present');
    this.configJson_ = _srcJson.tryParseJson(scriptElement.textContent, function (error) {
      throw _srcLog.user().createError('failed to parse animation script', error);
    });

    if (this.triggerOnVisibility_) {
      // Make the element minimally displayed to make sure that `layoutCallback`
      // is called.
      this.mutateElement(function () {
        _srcStyle.setStyles(_this.element, {
          visibility: 'hidden',
          top: '0px',
          left: '0px',
          width: '1px',
          height: '1px',
          display: 'block',
          position: 'fixed'
        });
      });
    }

    // Restart with debounce.
    this.restartPass_ = new _srcPass.Pass(this.win, this.startOrResume_.bind(this),
    /* delay */50);

    // Visibility.
    var ampdoc = this.getAmpDoc();
    var frameElement = _srcService.getParentWindowFrameElement(this.element, ampdoc.win);
    var embed = frameElement ? _srcFriendlyIframeEmbed.getFriendlyIframeEmbedOptional(frameElement) : null;
    if (embed) {
      this.embed_ = embed;
      this.setVisible_(embed.isVisible());
      embed.onVisibilityChanged(function () {
        _this.setVisible_(embed.isVisible());
      });
      _srcEventHelper.listen(this.embed_.win, 'resize', function () {
        return _this.onResize_();
      });
    } else {
      (function () {
        var viewer = _srcServices.viewerForDoc(ampdoc);
        _this.setVisible_(viewer.isVisible());
        viewer.onVisibilityChanged(function () {
          _this.setVisible_(viewer.isVisible());
        });
        _this.getViewport().onChanged(function (e) {
          if (e.relayoutAll) {
            _this.onResize_();
          }
        });
      })();
    }

    // Actions.
    this.registerAction('start', this.startAction_.bind(this));
    this.registerAction('restart', this.restartAction_.bind(this));
    this.registerAction('pause', this.pauseAction_.bind(this));
    this.registerAction('resume', this.resumeAction_.bind(this));
    this.registerAction('togglePause', this.togglePauseAction_.bind(this));
    this.registerAction('seekTo', this.seekToAction_.bind(this));
    this.registerAction('reverse', this.reverseAction_.bind(this));
    this.registerAction('finish', this.finishAction_.bind(this));
    this.registerAction('cancel', this.cancelAction_.bind(this));
  };

  /**
   * Returns the animation spec.
   * @return {?JsonObject}
   */

  AmpAnimation.prototype.getAnimationSpec = function getAnimationSpec() {
    return (/** @type {?JsonObject} */this.configJson_
    );
  };

  /** @override */

  AmpAnimation.prototype.layoutCallback = function layoutCallback() {
    if (this.triggerOnVisibility_) {
      this.startAction_();
    }
    return Promise.resolve();
  };

  /** @override */

  AmpAnimation.prototype.pauseCallback = function pauseCallback() {
    this.setVisible_(false);
  };

  /** @override */

  AmpAnimation.prototype.activate = function activate(invocation) {
    this.startAction_(invocation);
  };

  /**
   * @param {?../../../src/service/action-impl.ActionInvocation=} opt_invocation
   * @private
   */

  AmpAnimation.prototype.startAction_ = function startAction_(opt_invocation) {
    // The animation has been triggered, but there's no guarantee that it
    // will actually be running.
    this.triggered_ = true;
    if (this.visible_) {
      this.startOrResume_(opt_invocation ? opt_invocation.args : null);
    }
  };

  /**
   * @param {!../../../src/service/action-impl.ActionInvocation} invocation
   * @private
   */

  AmpAnimation.prototype.restartAction_ = function restartAction_(invocation) {
    this.cancel_();
    // The animation has been triggered, but there's no guarantee that it
    // will actually be running.
    this.triggered_ = true;
    if (this.visible_) {
      this.startOrResume_(invocation.args);
    }
  };

  /** @private */

  AmpAnimation.prototype.pauseAction_ = function pauseAction_() {
    this.pause_();
  };

  /** @private */

  AmpAnimation.prototype.resumeAction_ = function resumeAction_() {
    if (this.runner_ && this.visible_ && this.triggered_) {
      this.runner_.resume();
    }
  };

  /** @private */

  AmpAnimation.prototype.togglePauseAction_ = function togglePauseAction_() {
    if (this.runner_ && this.visible_ && this.triggered_) {
      if (this.runner_.getPlayState() == _webAnimationTypes.WebAnimationPlayState.PAUSED) {
        this.startOrResume_();
      } else {
        this.pause_();
      }
    }
  };

  /**
   * @param {!../../../src/service/action-impl.ActionInvocation} invocation
   * @private
   */

  AmpAnimation.prototype.seekToAction_ = function seekToAction_(invocation) {
    if (this.runner_ && this.visible_ && this.triggered_) {
      var time = parseFloat(invocation.args && invocation.args['time']);
      if (time && isFinite(time)) {
        this.runner_.seekTo(time);
      }
    }
  };

  /** @private */

  AmpAnimation.prototype.reverseAction_ = function reverseAction_() {
    if (this.runner_ && this.visible_ && this.triggered_) {
      this.runner_.reverse();
    }
  };

  /** @private */

  AmpAnimation.prototype.finishAction_ = function finishAction_() {
    this.finish_();
  };

  /** @private */

  AmpAnimation.prototype.cancelAction_ = function cancelAction_() {
    this.cancel_();
  };

  /**
   * @param {boolean} visible
   * @private
   */

  AmpAnimation.prototype.setVisible_ = function setVisible_(visible) {
    if (this.visible_ != visible) {
      this.visible_ = visible;
      if (this.triggered_) {
        if (this.visible_) {
          this.startOrResume_();
        } else {
          this.pause_();
        }
      }
    }
  };

  /** @private */

  AmpAnimation.prototype.onResize_ = function onResize_() {
    // Store the previous `triggered` value since `cancel` may reset it.
    var triggered = this.triggered_;

    // Stop animation right away.
    if (this.runner_) {
      this.runner_.cancel();
      this.runner_ = null;
    }

    // Restart the animation, but debounce to avoid re-starting it multiple
    // times per restart.
    this.triggered_ = triggered;
    if (this.triggered_ && this.visible_) {
      this.restartPass_.schedule();
    }
  };

  /**
   * @param {?JsonObject=} opt_args
   * @return {?Promise}
   * @private
   */

  AmpAnimation.prototype.startOrResume_ = function startOrResume_(opt_args) {
    var _this2 = this;

    if (!this.triggered_ || !this.visible_) {
      return null;
    }

    if (this.runner_) {
      this.runner_.resume();
      return null;
    }

    return this.createRunner_(opt_args).then(function (runner) {
      _this2.runner_ = runner;
      _this2.runner_.onPlayStateChanged(_this2.playStateChanged_.bind(_this2));
      _this2.setupScrollboundAnimations_();
      _this2.runner_.start();
    });
  };

  /** @private */

  AmpAnimation.prototype.finish_ = function finish_() {
    this.triggered_ = false;
    if (this.runner_) {
      this.runner_.finish();
      this.runner_ = null;
    }
  };

  /** @private */

  AmpAnimation.prototype.cancel_ = function cancel_() {
    this.triggered_ = false;
    if (this.runner_) {
      this.runner_.cancel();
      this.runner_ = null;
    }
  };

  /**
   * @param {?JsonObject=} opt_args
   * @return {!Promise<!./web-animations.WebAnimationRunner>}
   * @private
   */

  AmpAnimation.prototype.createRunner_ = function createRunner_(opt_args) {
    var _this3 = this;

    // Force cast to `WebAnimationDef`. It will be validated during preparation
    // phase.
    var configJson = /** @type {!./web-animation-types.WebAnimationDef} */this.configJson_;
    var args = /** @type {?./web-animation-types.WebAnimationDef} */opt_args || null;

    // Ensure polyfill is installed.
    if (!this.win.Element.prototype.animate) {
      _webAnimationsJsWebAnimationsInstall.installWebAnimations(this.win);
    }

    var ampdoc = this.getAmpDoc();
    var readyPromise = this.embed_ ? this.embed_.whenReady() : ampdoc.whenReady();
    var hostWin = this.embed_ ? this.embed_.win : this.win;
    var baseUrl = this.embed_ ? this.embed_.getUrl() : ampdoc.getUrl();
    return readyPromise.then(function () {
      var builder = new _webAnimations.Builder(hostWin, _this3.getRootNode_(), baseUrl, _this3.getVsync(), _this3.element.getResources());
      return builder.createRunner(configJson, args);
    });
  };

  /**
   * @return {!Document|!ShadowRoot}
   * @private
   */

  AmpAnimation.prototype.getRootNode_ = function getRootNode_() {
    return this.embed_ ? this.embed_.win.document : this.getAmpDoc().getRootNode();
  };

  /** @private */

  AmpAnimation.prototype.pause_ = function pause_() {
    if (this.runner_) {
      this.runner_.pause();
    }
  };

  /**
   * @param {!WebAnimationPlayState} playState
   * @private
   */

  AmpAnimation.prototype.playStateChanged_ = function playStateChanged_(playState) {
    if (playState == _webAnimationTypes.WebAnimationPlayState.FINISHED) {
      this.finish_();
    }
  };

  /**
   * @private
   */

  AmpAnimation.prototype.setupScrollboundAnimations_ = function setupScrollboundAnimations_() {
    _srcLog.dev().assert(this.runner_);
    if (!this.runner_.hasScrollboundAnimations()) {
      return;
    }

    // TODO(aghassemi): Remove restriction when we fully support scenes through
    // scene-id attribute and/or allowing parent of `amp-animation` to be the
    // scene container.
    _srcLog.user().assert(this.embed_ || _srcMode.getMode().runtime == 'inabox', 'scroll-bound animations are only supported in embeds at the moment');

    var sceneElement = undefined;
    if (this.embed_) {
      sceneElement = this.embed_.iframe;
    } else {
      sceneElement = this.win.document.documentElement;
    }

    new _scrollboundScene.ScrollboundScene(this.getAmpDoc(), sceneElement, this.runner_.scrollTick.bind(this.runner_), /* onScroll */
    this.runner_.updateScrollDuration.bind(this.runner_) /* onDurationChanged */
    );
  };

  return AmpAnimation;
})(AMP.BaseElement);

exports.AmpAnimation = AmpAnimation;

AMP.extension(TAG, '0.1', function (AMP) {
  AMP.registerElement(TAG, AmpAnimation);
});

},{"../../../src/dom":18,"../../../src/event-helper":21,"../../../src/experiments":22,"../../../src/friendly-iframe-embed":23,"../../../src/json":25,"../../../src/log":27,"../../../src/mode":29,"../../../src/pass":31,"../../../src/service":39,"../../../src/services":41,"../../../src/style":43,"./scrollbound-scene":7,"./web-animation-types":8,"./web-animations":9,"web-animations-js/web-animations.install":12}],2:[function(require,module,exports){
exports.__esModule = true;
exports.isVarCss = isVarCss;
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

var FINAL_URL_RE = /^(data|https)\:/i;
var DEG_TO_RAD = 2 * Math.PI / 360;
var GRAD_TO_RAD = Math.PI / 200;
var VAR_CSS_RE = /(calc|var|url|rand|width|height)\(/i;
var INFINITY_RE = /^(infinity|infinite)$/i;

/**
 * Returns `true` if the CSS expression contains variable components. The CSS
 * parsing and evaluation is heavy, but used relatively rarely. This method
 * can be used to avoid heavy parse/evaluate tasks.
 * @param {string} css
 * @return {boolean}
 */

function isVarCss(css) {
  return VAR_CSS_RE.test(css);
}

/**
 * An interface that assists in CSS evaluation.
 * @interface
 */

var CssContext = (function () {
  function CssContext() {
    babelHelpers.classCallCheck(this, CssContext);
  }

  /**
   * A base class for all CSS node components defined in the
   * `css-expr-impl.jison`.
   * @abstract
   */

  /**
   * Returns a resolved URL. The result must be an allowed URL for execution,
   * with HTTPS restrictions.
   * @param {string} unusedUrl
   * @return {string}
   */

  CssContext.prototype.resolveUrl = function resolveUrl(unusedUrl) {};

  /**
   * Returns the value of a CSS variable or `null` if not available.
   * @param {string} unusedVarName
   * @return {?CssNode}
   */

  CssContext.prototype.getVar = function getVar(unusedVarName) {};

  /**
   * Returns the current font size.
   * @return {number}
   */

  CssContext.prototype.getCurrentFontSize = function getCurrentFontSize() {};

  /**
   * Returns the root font size.
   * @return {number}
   */

  CssContext.prototype.getRootFontSize = function getRootFontSize() {};

  /**
   * Returns the viewport size.
   * @return {!{width: number, height: number}}
   */

  CssContext.prototype.getViewportSize = function getViewportSize() {};

  /**
   * Returns the current element's size.
   * @return {!{width: number, height: number}}
   */

  CssContext.prototype.getCurrentElementSize = function getCurrentElementSize() {};

  /**
   * Returns the specified element's size.
   * @param {string} unusedSelector
   * @param {?string} unusedSelectionMethod
   * @return {!{width: number, height: number}}
   */

  CssContext.prototype.getElementSize = function getElementSize(unusedSelector, unusedSelectionMethod) {};

  /**
   * Returns the dimension: "w" for width or "h" for height.
   * @return {?string}
   */

  CssContext.prototype.getDimension = function getDimension() {};

  /**
   * Pushes the dimension: "w" for width or "h" for height.
   * @param {?string} unusedDim
   * @param {function():T} unusedCallback
   * @return {T}
   * @template T
   */

  CssContext.prototype.withDimension = function withDimension(unusedDim, unusedCallback) {};

  return CssContext;
})();

exports.CssContext = CssContext;

var CssNode = (function () {
  function CssNode() {
    babelHelpers.classCallCheck(this, CssNode);
  }

  /**
   * A CSS expression that's simply passed through from the original expression.
   * Used for `url()`, colors, etc.
   */

  /**
   * Returns a string CSS representation.
   * @return {string}
   * @abstract
   */

  CssNode.prototype.css = function css() {};

  /**
   * Resolves the value of all variable components. Only performs any work if
   * variable components exist. As an optimization, this node is returned
   * for a non-variable nodes (`isConst() == true`). Otherwise, `calc()` method
   * is used to calculate the new value.
   * @param {!CssContext} context
   * @return {?CssNode}
   * @final
   */

  CssNode.prototype.resolve = function resolve(context) {
    if (this.isConst()) {
      return this;
    }
    return this.calc(context);
  };

  /**
   * Whether the CSS node is a constant or includes variable components.
   * @return {boolean}
   * @protected
   */

  CssNode.prototype.isConst = function isConst() {
    return true;
  };

  /**
   * Calculates the value of all variable components.
   * @param {!CssContext} unusedContext
   * @return {?CssNode}
   * @protected
   */

  CssNode.prototype.calc = function calc(unusedContext) {
    return this;
  };

  return CssNode;
})();

exports.CssNode = CssNode;

var CssPassthroughNode = (function (_CssNode) {
  babelHelpers.inherits(CssPassthroughNode, _CssNode);

  /** @param {string} css */

  function CssPassthroughNode(css) {
    babelHelpers.classCallCheck(this, CssPassthroughNode);

    _CssNode.call(this);
    /** @const @private {string} */
    this.css_ = css;
  }

  /**
   * A concatenation of CSS expressions: `translateX(...) rotate(...)`,
   * `1s normal`, etc.
   */

  /** @override */

  CssPassthroughNode.prototype.css = function css() {
    return this.css_;
  };

  return CssPassthroughNode;
})(CssNode);

exports.CssPassthroughNode = CssPassthroughNode;

var CssConcatNode = (function (_CssNode2) {
  babelHelpers.inherits(CssConcatNode, _CssNode2);

  /** @param {!Array<!CssNode>=} opt_array */

  function CssConcatNode(opt_array) {
    babelHelpers.classCallCheck(this, CssConcatNode);

    _CssNode2.call(this);
    /** @private {!Array<!CssNode>} */
    this.array_ = opt_array || [];
  }

  /**
   * Verifies that URL is an HTTPS URL.
   */

  /**
   * Concatenates two sets of expressions.
   * @param {!CssNode} nodeOrSet
   * @param {!CssNode} otherNodeOrSet
   * @return {!CssConcatNode}
   */

  CssConcatNode.concat = function concat(nodeOrSet, otherNodeOrSet) {
    var set = undefined;
    if (nodeOrSet instanceof CssConcatNode) {
      set = nodeOrSet;
    } else {
      set = new CssConcatNode([nodeOrSet]);
    }
    if (otherNodeOrSet instanceof CssConcatNode) {
      set.array_ = set.array_.concat(otherNodeOrSet.array_);
    } else {
      set.array_.push(otherNodeOrSet);
    }
    return set;
  };

  /** @override */

  CssConcatNode.prototype.css = function css() {
    return this.array_.map(function (node) {
      return node.css();
    }).join(' ');
  };

  /** @override */

  CssConcatNode.prototype.isConst = function isConst() {
    return this.array_.reduce(function (acc, node) {
      return acc && node.isConst();
    }, true);
  };

  /** @override */

  CssConcatNode.prototype.calc = function calc(context) {
    var resolvedArray = [];
    for (var i = 0; i < this.array_.length; i++) {
      var resolved = this.array_[i].resolve(context);
      if (resolved) {
        resolvedArray.push(resolved);
      } else {
        // One element is null - the result is null.
        return null;
      }
    }
    return new CssConcatNode(resolvedArray);
  };

  return CssConcatNode;
})(CssNode);

exports.CssConcatNode = CssConcatNode;

var CssUrlNode = (function (_CssNode3) {
  babelHelpers.inherits(CssUrlNode, _CssNode3);

  /** @param {string} url */

  function CssUrlNode(url) {
    babelHelpers.classCallCheck(this, CssUrlNode);

    _CssNode3.call(this);
    /** @const @private {string} */
    this.url_ = url;
  }

  /**
   * @abstract
   */

  /** @override */

  CssUrlNode.prototype.css = function css() {
    if (!this.url_) {
      return '';
    }
    return 'url("' + this.url_ + '")';
  };

  /** @override */

  CssUrlNode.prototype.isConst = function isConst() {
    return !this.url_ || FINAL_URL_RE.test(this.url_);
  };

  /** @override */

  CssUrlNode.prototype.calc = function calc(context) {
    var url = context.resolveUrl(this.url_);
    // Return a passthrough CSS to avoid recursive `url()` evaluation.
    return new CssPassthroughNode('url("' + url + '")');
  };

  return CssUrlNode;
})(CssNode);

exports.CssUrlNode = CssUrlNode;

var CssNumericNode = (function (_CssNode4) {
  babelHelpers.inherits(CssNumericNode, _CssNode4);

  /**
   * @param {string} type
   * @param {number} num
   * @param {string} units
   */

  function CssNumericNode(type, num, units) {
    babelHelpers.classCallCheck(this, CssNumericNode);

    _CssNode4.call(this);
    /** @const @private {string} */
    this.type_ = type;
    /** @const @private {number} */
    this.num_ = num;
    /** @const @private {string} */
    this.units_ = units.toLowerCase();
  }

  /**
   * A CSS number: `100`, `1e2`, `1e-2`, `0.5`, etc.
   */

  /** @override */

  CssNumericNode.prototype.css = function css() {
    return '' + this.num_ + this.units_;
  };

  /**
   * @param {number} unusedNum
   * @return {!CssNumericNode}
   * @abstract
   */

  CssNumericNode.prototype.createSameUnits = function createSameUnits(unusedNum) {};

  /**
   * @param {!CssContext} unusedContext
   * @return {!CssNumericNode}
   */

  CssNumericNode.prototype.norm = function norm(unusedContext) {
    return this;
  };

  /**
   * @param {number} unusedPercent
   * @param {!CssContext} unusedContext
   * @return {!CssNumericNode}
   */

  CssNumericNode.prototype.calcPercent = function calcPercent(unusedPercent, unusedContext) {
    throw new Error('cannot calculate percent for ' + this.type_);
  };

  return CssNumericNode;
})(CssNode);

exports.CssNumericNode = CssNumericNode;

var CssNumberNode = (function (_CssNumericNode) {
  babelHelpers.inherits(CssNumberNode, _CssNumericNode);

  /** @param {number} num */

  function CssNumberNode(num) {
    babelHelpers.classCallCheck(this, CssNumberNode);

    _CssNumericNode.call(this, 'NUM', num, '');
  }

  /**
   * A CSS percent value: `100%`, `0.5%`, etc.
   */

  /** @override */

  CssNumberNode.prototype.createSameUnits = function createSameUnits(num) {
    return new CssNumberNode(num);
  };

  /**
   * Returns a numerical value of the node if possible. `Infinity` is one of
   * possible return values.
   * @param {!CssNode} node
   * @return {number|undefined}
   */

  CssNumberNode.num = function num(node) {
    if (node instanceof CssNumberNode) {
      return node.num_;
    }
    var css = node.css();
    if (INFINITY_RE.test(css)) {
      return Infinity;
    }
    return undefined;
  };

  return CssNumberNode;
})(CssNumericNode);

exports.CssNumberNode = CssNumberNode;

var CssPercentNode = (function (_CssNumericNode2) {
  babelHelpers.inherits(CssPercentNode, _CssNumericNode2);

  /** @param {number} num */

  function CssPercentNode(num) {
    babelHelpers.classCallCheck(this, CssPercentNode);

    _CssNumericNode2.call(this, 'PRC', num, '%');
  }

  /**
   * A CSS length value: `100px`, `80vw`, etc.
   */

  /** @override */

  CssPercentNode.prototype.createSameUnits = function createSameUnits(num) {
    return new CssPercentNode(num);
  };

  return CssPercentNode;
})(CssNumericNode);

exports.CssPercentNode = CssPercentNode;

var CssLengthNode = (function (_CssNumericNode3) {
  babelHelpers.inherits(CssLengthNode, _CssNumericNode3);

  /**
   * @param {number} num
   * @param {string} units
   */

  function CssLengthNode(num, units) {
    babelHelpers.classCallCheck(this, CssLengthNode);

    _CssNumericNode3.call(this, 'LEN', num, units);
  }

  /**
   * A CSS angle value: `45deg`, `0.5rad`, etc.
   */

  /** @override */

  CssLengthNode.prototype.createSameUnits = function createSameUnits(num) {
    return new CssLengthNode(num, this.units_);
  };

  /** @override */

  CssLengthNode.prototype.norm = function norm(context) {
    if (this.units_ == 'px') {
      return this;
    }

    // Font-based: em/rem.
    if (this.units_ == 'em' || this.units_ == 'rem') {
      var fontSize = this.units_ == 'em' ? context.getCurrentFontSize() : context.getRootFontSize();
      return new CssLengthNode(this.num_ * fontSize, 'px');
    }

    // Viewport based: vw, vh, vmin, vmax.
    if (this.units_ == 'vw' || this.units_ == 'vh' || this.units_ == 'vmin' || this.units_ == 'vmax') {
      var vp = context.getViewportSize();
      var vw = vp.width * this.num_ / 100;
      var vh = vp.height * this.num_ / 100;
      var num = 0;
      if (this.units_ == 'vw') {
        num = vw;
      } else if (this.units_ == 'vh') {
        num = vh;
      } else if (this.units_ == 'vmin') {
        num = Math.min(vw, vh);
      } else if (this.units_ == 'vmax') {
        num = Math.max(vw, vh);
      }
      return new CssLengthNode(num, 'px');
    }

    // Can't convert cm/in/etc to px at this time.
    throw unknownUnits(this.units_);
  };

  /** @override */

  CssLengthNode.prototype.calcPercent = function calcPercent(percent, context) {
    var dim = context.getDimension();
    var size = context.getCurrentElementSize();
    var side = getDimSide(dim, size);
    return new CssLengthNode(side * percent / 100, 'px');
  };

  return CssLengthNode;
})(CssNumericNode);

exports.CssLengthNode = CssLengthNode;

var CssAngleNode = (function (_CssNumericNode4) {
  babelHelpers.inherits(CssAngleNode, _CssNumericNode4);

  /**
   * @param {number} num
   * @param {string} units
   */

  function CssAngleNode(num, units) {
    babelHelpers.classCallCheck(this, CssAngleNode);

    _CssNumericNode4.call(this, 'ANG', num, units);
  }

  /**
   * A CSS time value: `1s`, `600ms`.
   */

  /** @override */

  CssAngleNode.prototype.createSameUnits = function createSameUnits(num) {
    return new CssAngleNode(num, this.units_);
  };

  /** @override */

  CssAngleNode.prototype.norm = function norm() {
    if (this.units_ == 'rad') {
      return this;
    }
    if (this.units_ == 'deg') {
      return new CssAngleNode(this.num_ * DEG_TO_RAD, 'rad');
    }
    if (this.units_ == 'grad') {
      return new CssAngleNode(this.num_ * GRAD_TO_RAD, 'rad');
    }
    throw unknownUnits(this.units_);
  };

  return CssAngleNode;
})(CssNumericNode);

exports.CssAngleNode = CssAngleNode;

var CssTimeNode = (function (_CssNumericNode5) {
  babelHelpers.inherits(CssTimeNode, _CssNumericNode5);

  /**
   * @param {number} num
   * @param {string} units
   */

  function CssTimeNode(num, units) {
    babelHelpers.classCallCheck(this, CssTimeNode);

    _CssNumericNode5.call(this, 'TME', num, units);
  }

  /**
   * A CSS generic function: `rgb(1, 1, 1)`, `translateX(300px)`, etc.
   */

  /** @override */

  CssTimeNode.prototype.createSameUnits = function createSameUnits(num) {
    return new CssTimeNode(num, this.units_);
  };

  /** @override */

  CssTimeNode.prototype.norm = function norm() {
    if (this.units_ == 'ms') {
      return this;
    }
    return new CssTimeNode(this.millis_(), 'ms');
  };

  /**
   * @return {number}
   * @private
   */

  CssTimeNode.prototype.millis_ = function millis_() {
    if (this.units_ == 'ms') {
      return this.num_;
    }
    if (this.units_ == 's') {
      return this.num_ * 1000;
    }
    throw unknownUnits(this.units_);
  };

  /**
   * @param {!CssNode} node
   * @return {number|undefined}
   */

  CssTimeNode.millis = function millis(node) {
    if (node instanceof CssTimeNode) {
      return node.millis_();
    }
    if (node instanceof CssNumberNode) {
      return node.num_;
    }
    return undefined;
  };

  return CssTimeNode;
})(CssNumericNode);

exports.CssTimeNode = CssTimeNode;

var CssFuncNode = (function (_CssNode5) {
  babelHelpers.inherits(CssFuncNode, _CssNode5);

  /**
   * @param {string} name
   * @param {!Array<!CssNode>} args
   * @param {?Array<string>=} opt_dimensions
   */

  function CssFuncNode(name, args, opt_dimensions) {
    babelHelpers.classCallCheck(this, CssFuncNode);

    _CssNode5.call(this);
    /** @const @private {string} */
    this.name_ = name.toLowerCase();
    /** @const @private {!Array<!CssNode>} */
    this.args_ = args;
    /** @const @private {?Array<string>} */
    this.dimensions_ = opt_dimensions || null;
  }

  /**
   * A CSS translate family of functions:
   * - `translate(x, y)`
   * - `translateX(x)`
   * - `translateY(y)`
   * - `translateZ(z)`
   * - `translate3d(x, y, z)`
   */

  /** @override */

  CssFuncNode.prototype.css = function css() {
    var args = this.args_.map(function (node) {
      return node.css();
    }).join(',');
    return this.name_ + '(' + args + ')';
  };

  /** @override */

  CssFuncNode.prototype.isConst = function isConst() {
    return this.args_.reduce(function (acc, node) {
      return acc && node.isConst();
    }, true);
  };

  /** @override */

  CssFuncNode.prototype.calc = function calc(context) {
    var _this = this;

    var resolvedArgs = [];

    var _loop = function (i) {
      var node = _this.args_[i];
      var resolved = undefined;
      if (_this.dimensions_ && i < _this.dimensions_.length) {
        resolved = context.withDimension(_this.dimensions_[i], function () {
          return node.resolve(context);
        });
      } else {
        resolved = node.resolve(context);
      }
      if (resolved) {
        resolvedArgs.push(resolved);
      } else {
        // One argument is null - the function's result is null.
        return {
          v: null
        };
      }
    };

    for (var i = 0; i < this.args_.length; i++) {
      var _ret = _loop(i);

      if (typeof _ret === 'object') return _ret.v;
    }
    return new CssFuncNode(this.name_, resolvedArgs);
  };

  return CssFuncNode;
})(CssNode);

exports.CssFuncNode = CssFuncNode;

var CssTranslateNode = (function (_CssFuncNode) {
  babelHelpers.inherits(CssTranslateNode, _CssFuncNode);

  /**
   * @param {string} suffix
   * @param {!Array<!CssNode>} args
   */

  function CssTranslateNode(suffix, args) {
    babelHelpers.classCallCheck(this, CssTranslateNode);

    _CssFuncNode.call(this, 'translate' + suffix.toUpperCase(), args, suffix == '' ? ['w', 'h'] : suffix == 'x' ? ['w'] : suffix == 'y' ? ['h'] : suffix == 'z' ? ['z'] : suffix == '3d' ? ['w', 'h', 'z'] : null);
    /** @const @private {string} */
    this.suffix_ = suffix;
  }

  /**
   * AMP-specific `width()` and `height()` functions.
   */
  return CssTranslateNode;
})(CssFuncNode);

exports.CssTranslateNode = CssTranslateNode;

var CssDimSizeNode = (function (_CssNode6) {
  babelHelpers.inherits(CssDimSizeNode, _CssNode6);

  /**
   * @param {string} dim
   * @param {?string=} opt_selector
   * @param {?string=} opt_selectionMethod Either `undefined` or "closest".
   */

  function CssDimSizeNode(dim, opt_selector, opt_selectionMethod) {
    babelHelpers.classCallCheck(this, CssDimSizeNode);

    _CssNode6.call(this);
    /** @const @private */
    this.dim_ = dim;
    /** @const @private */
    this.selector_ = opt_selector || null;
    /** @const @private */
    this.selectionMethod_ = opt_selectionMethod || null;
  }

  /**
   * AMP-specific `rand()` function. Has two forms:
   * - `rand()` - returns a random number value between 0 and 1.
   * - `rand(left, right)` - returns a random value between `left` and
   *   `right`. The `left` and `right` are any number-based values in this
   *   case, such as a length (`10px`), a time (`1s`), an angle (`1rad`), etc.
   *   The returned value is the same type - a length, time angle, etc. Thus,
   *   `rand(1s, 5s)` may return a value of `rand(2.1s)`.
   */

  /** @override */

  CssDimSizeNode.prototype.css = function css() {
    throw noCss();
  };

  /** @override */

  CssDimSizeNode.prototype.isConst = function isConst() {
    return false;
  };

  /** @override */

  CssDimSizeNode.prototype.calc = function calc(context) {
    var size = this.selector_ ? context.getElementSize(this.selector_, this.selectionMethod_) : context.getCurrentElementSize();
    return new CssLengthNode(getDimSide(this.dim_, size), 'px');
  };

  return CssDimSizeNode;
})(CssNode);

exports.CssDimSizeNode = CssDimSizeNode;

var CssRandNode = (function (_CssNode7) {
  babelHelpers.inherits(CssRandNode, _CssNode7);

  /**
   * @param {?CssNode=} left
   * @param {?CssNode=} right
   */

  function CssRandNode() {
    var left = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
    var right = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
    babelHelpers.classCallCheck(this, CssRandNode);

    _CssNode7.call(this);
    /** @const @private */
    this.left_ = left;
    /** @const @private */
    this.right_ = right;
  }

  /**
   * A CSS `var()` expression: `var(--name)`, `var(--name, 100px)`, etc.
   * See https://www.w3.org/TR/css-variables/.
   */

  /** @override */

  CssRandNode.prototype.css = function css() {
    throw noCss();
  };

  /** @override */

  CssRandNode.prototype.isConst = function isConst() {
    return false;
  };

  /** @override */

  CssRandNode.prototype.calc = function calc(context) {
    // No arguments: return a random node between 0 and 1.
    if (this.left_ == null || this.right_ == null) {
      return new CssNumberNode(Math.random());
    }

    // Arguments: do a min/max random math.
    var left = this.left_.resolve(context);
    var right = this.right_.resolve(context);
    if (left == null || right == null) {
      return null;
    }
    if (!(left instanceof CssNumericNode) || !(right instanceof CssNumericNode)) {
      throw new Error('left and right must be both numerical');
    }
    if (left.type_ != right.type_) {
      throw new Error('left and right must be the same type');
    }

    // Units are the same, the math is simple: numerals are summed. Otherwise,
    // the units neeed to be normalized first.
    if (left.units_ != right.units_) {
      left = left.norm(context);
      right = right.norm(context);
    }
    var min = Math.min(left.num_, right.num_);
    var max = Math.max(left.num_, right.num_);
    var rand = Math.random();
    // Formula: rand(A, B) = A * (1 - R) + B * R
    var num = min * (1 - rand) + max * rand;
    return left.createSameUnits(num);
  };

  return CssRandNode;
})(CssNode);

exports.CssRandNode = CssRandNode;

var CssVarNode = (function (_CssNode8) {
  babelHelpers.inherits(CssVarNode, _CssNode8);

  /**
   * @param {string} varName
   * @param {!CssNode=} opt_def
   */

  function CssVarNode(varName, opt_def) {
    babelHelpers.classCallCheck(this, CssVarNode);

    _CssNode8.call(this);
    /** @const @private {string} */
    this.varName_ = varName;
    /** @const @private {?CssNode} */
    this.def_ = opt_def || null;
  }

  /**
   * A CSS `calc()` expression: `calc(100px)`, `calc(80vw - 30em)`, etc.
   * See https://drafts.csswg.org/css-values-3/#calc-notation.
   */

  /** @override */

  CssVarNode.prototype.css = function css() {
    return 'var(' + this.varName_ + (this.def_ ? ',' + this.def_.css() : '') + ')';
  };

  /** @override */

  CssVarNode.prototype.isConst = function isConst() {
    return false;
  };

  /** @override */

  CssVarNode.prototype.calc = function calc(context) {
    var varNode = context.getVar(this.varName_);
    if (varNode) {
      return varNode.resolve(context);
    }
    if (this.def_) {
      return this.def_.resolve(context);
    }
    return null;
  };

  return CssVarNode;
})(CssNode);

exports.CssVarNode = CssVarNode;

var CssCalcNode = (function (_CssNode9) {
  babelHelpers.inherits(CssCalcNode, _CssNode9);

  /** @param {!CssNode} expr */

  function CssCalcNode(expr) {
    babelHelpers.classCallCheck(this, CssCalcNode);

    _CssNode9.call(this);
    /** @const @private {!CssNode} */
    this.expr_ = expr;
  }

  /**
   * A CSS `calc()` sum expression: `100px + 20em`, `80vw - 30em`, etc.
   */

  /** @override */

  CssCalcNode.prototype.css = function css() {
    return 'calc(' + this.expr_.css() + ')';
  };

  /** @override */

  CssCalcNode.prototype.isConst = function isConst() {
    return false;
  };

  /** @override */

  CssCalcNode.prototype.calc = function calc(context) {
    return this.expr_.resolve(context);
  };

  return CssCalcNode;
})(CssNode);

exports.CssCalcNode = CssCalcNode;

var CssCalcSumNode = (function (_CssNode10) {
  babelHelpers.inherits(CssCalcSumNode, _CssNode10);

  /**
   * @param {!CssNode} left
   * @param {!CssNode} right
   * @param {string} op Either "+" or "-".
   */

  function CssCalcSumNode(left, right, op) {
    babelHelpers.classCallCheck(this, CssCalcSumNode);

    _CssNode10.call(this);
    /** @const @private {!CssNode} */
    this.left_ = left;
    /** @const @private {!CssNode} */
    this.right_ = right;
    /** @const @private {string} */
    this.op_ = op;
  }

  /**
   * A CSS `calc()` product expression: `100px * 2`, `80vw / 2`, etc.
   */

  /** @override */

  CssCalcSumNode.prototype.css = function css() {
    return this.left_.css() + ' ' + this.op_ + ' ' + this.right_.css();
  };

  /** @override */

  CssCalcSumNode.prototype.isConst = function isConst() {
    return false;
  };

  /** @override */

  CssCalcSumNode.prototype.calc = function calc(context) {
    /*
     * From spec:
     * At + or -, check that both sides have the same type, or that one side is
     * a <number> and the other is an <integer>. If both sides are the same
     * type, resolve to that type. If one side is a <number> and the other is
     * an <integer>, resolve to <number>.
     */
    var left = this.left_.resolve(context);
    var right = this.right_.resolve(context);
    if (left == null || right == null) {
      return null;
    }
    if (!(left instanceof CssNumericNode) || !(right instanceof CssNumericNode)) {
      throw new Error('left and right must be both numerical');
    }
    if (left.type_ != right.type_) {
      // Percent values are special: they need to be resolved in the context
      // of the other dimension.
      if (left instanceof CssPercentNode) {
        left = right.calcPercent(left.num_, context);
      } else if (right instanceof CssPercentNode) {
        right = left.calcPercent(right.num_, context);
      } else {
        throw new Error('left and right must be the same type');
      }
    }

    // Units are the same, the math is simple: numerals are summed. Otherwise,
    // the units neeed to be normalized first.
    if (left.units_ != right.units_) {
      left = left.norm(context);
      right = right.norm(context);
    }
    var sign = this.op_ == '+' ? 1 : -1;
    return left.createSameUnits(left.num_ + sign * right.num_);
  };

  return CssCalcSumNode;
})(CssNode);

exports.CssCalcSumNode = CssCalcSumNode;

var CssCalcProductNode = (function (_CssNode11) {
  babelHelpers.inherits(CssCalcProductNode, _CssNode11);

  /**
   * @param {!CssNode} left
   * @param {!CssNode} right
   * @param {string} op Either "*" or "/".
   */

  function CssCalcProductNode(left, right, op) {
    babelHelpers.classCallCheck(this, CssCalcProductNode);

    _CssNode11.call(this);
    /** @const @private {!CssNode} */
    this.left_ = left;
    /** @const @private {!CssNode} */
    this.right_ = right;
    /** @const @private {string} */
    this.op_ = op;
  }

  /**
   * @param {string} units
   * @return {!Error}
   */

  /** @override */

  CssCalcProductNode.prototype.css = function css() {
    return this.left_.css() + ' ' + this.op_ + ' ' + this.right_.css();
  };

  /** @override */

  CssCalcProductNode.prototype.isConst = function isConst() {
    return false;
  };

  /** @override */

  CssCalcProductNode.prototype.calc = function calc(context) {
    var left = this.left_.resolve(context);
    var right = this.right_.resolve(context);
    if (left == null || right == null) {
      return null;
    }
    if (!(left instanceof CssNumericNode) || !(right instanceof CssNumericNode)) {
      throw new Error('left and right must be both numerical');
    }

    /*
     * From spec:
     * At *, check that at least one side is <number>. If both sides are
     * <integer>, resolve to <integer>. Otherwise, resolve to the type of the
     * other side.
     * At /, check that the right side is <number>. If the left side is
     * <integer>, resolve to <number>. Otherwise, resolve to the type of the
     * left side.
     */
    var base = undefined;
    var multi = undefined;
    if (this.op_ == '*') {
      if (left instanceof CssNumberNode) {
        multi = left.num_;
        base = right;
      } else {
        if (!(right instanceof CssNumberNode)) {
          throw new Error('one of sides in multiplication must be a number');
        }
        multi = right.num_;
        base = left;
      }
    } else {
      if (!(right instanceof CssNumberNode)) {
        throw new Error('denominator must be a number');
      }
      base = left;
      multi = 1 / right.num_;
    }

    var num = base.num_ * multi;
    if (!isFinite(num)) {
      return null;
    }
    return base.createSameUnits(num);
  };

  return CssCalcProductNode;
})(CssNode);

exports.CssCalcProductNode = CssCalcProductNode;
function unknownUnits(units) {
  return new Error('unknown units: ' + units);
}

/**
 * @return {!Error}
 */
function noCss() {
  return new Error('no css');
}

/**
 * @param {?string} dim
 * @param {!{width: number, height: number}} size
 * @return {number}
 */
function getDimSide(dim, size) {
  return dim == 'w' ? size.width : dim == 'h' ? size.height : 0;
}

},{}],3:[function(require,module,exports){
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

/** @fileoverview @suppress {checkTypes, suspiciousCode, uselessCode} */

var _cssExprAst = require('./css-expr-ast');

var ast = babelHelpers.interopRequireWildcard(_cssExprAst);

/* parser generated by jison 0.4.15 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var parser = (function () {
    var o = function (k, v, o, l) {
        for (o = o || {}, l = k.length; l--; o[k[l]] = v);return o;
    },
        $V0 = [1, 7],
        $V1 = [1, 8],
        $V2 = [1, 9],
        $V3 = [1, 14],
        $V4 = [1, 15],
        $V5 = [1, 22],
        $V6 = [1, 23],
        $V7 = [1, 24],
        $V8 = [1, 25],
        $V9 = [1, 26],
        $Va = [1, 27],
        $Vb = [1, 28],
        $Vc = [1, 29],
        $Vd = [1, 30],
        $Ve = [1, 31],
        $Vf = [1, 32],
        $Vg = [1, 33],
        $Vh = [1, 34],
        $Vi = [1, 35],
        $Vj = [1, 36],
        $Vk = [1, 37],
        $Vl = [1, 38],
        $Vm = [1, 39],
        $Vn = [1, 51],
        $Vo = [1, 40],
        $Vp = [1, 43],
        $Vq = [1, 44],
        $Vr = [1, 45],
        $Vs = [1, 46],
        $Vt = [1, 47],
        $Vu = [1, 48],
        $Vv = [1, 49],
        $Vw = [1, 50],
        $Vx = [1, 41],
        $Vy = [1, 42],
        $Vz = [5, 9, 10, 11, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 42, 46, 47, 48, 49, 50, 51, 52, 53, 55, 56, 58],
        $VA = [5, 9, 10, 11, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 42, 43, 45, 46, 47, 48, 49, 50, 51, 52, 53, 55, 56, 58, 61, 62, 63, 64],
        $VB = [1, 58],
        $VC = [1, 79],
        $VD = [1, 80],
        $VE = [1, 81],
        $VF = [1, 82],
        $VG = [43, 61, 62, 63, 64],
        $VH = [1, 85],
        $VI = [43, 45],
        $VJ = [43, 63, 64];
    var parser = { trace: function trace() {},
        yy: {},
        symbols_: { "error": 2, "result": 3, "value": 4, "EOF": 5, "literal_or_function": 6, "literal": 7, "function": 8, "STRING": 9, "NUMBER": 10, "PERCENTAGE": 11, "length": 12, "angle": 13, "time": 14, "url": 15, "HEXCOLOR": 16, "IDENT": 17, "LENGTH_PX": 18, "LENGTH_EM": 19, "LENGTH_REM": 20, "LENGTH_VH": 21, "LENGTH_VW": 22, "LENGTH_VMIN": 23, "LENGTH_VMAX": 24, "LENGTH_CM": 25, "LENGTH_MM": 26, "LENGTH_Q": 27, "LENGTH_IN": 28, "LENGTH_PC": 29, "LENGTH_PT": 30, "ANGLE_DEG": 31, "ANGLE_RAD": 32, "ANGLE_GRAD": 33, "TIME_MS": 34, "TIME_S": 35, "var_function": 36, "calc_function": 37, "translate_function": 38, "dim_function": 39, "rand_function": 40, "any_function": 41, "FUNCTION_START": 42, ")": 43, "args": 44, ",": 45, "URL_START": 46, "TRANSLATE_START": 47, "TRANSLATE_X_START": 48, "TRANSLATE_Y_START": 49, "TRANSLATE_Z_START": 50, "TRANSLATE_3D_START": 51, "WIDTH_START": 52, "HEIGHT_START": 53, "CLOSEST_START": 54, "RAND_START": 55, "VAR_START": 56, "VAR_NAME": 57, "CALC_START": 58, "calc_expr": 59, "(": 60, "*": 61, "/": 62, "+": 63, "-": 64, "$accept": 0, "$end": 1 },
        terminals_: { 2: "error", 5: "EOF", 9: "STRING", 10: "NUMBER", 11: "PERCENTAGE", 16: "HEXCOLOR", 17: "IDENT", 18: "LENGTH_PX", 19: "LENGTH_EM", 20: "LENGTH_REM", 21: "LENGTH_VH", 22: "LENGTH_VW", 23: "LENGTH_VMIN", 24: "LENGTH_VMAX", 25: "LENGTH_CM", 26: "LENGTH_MM", 27: "LENGTH_Q", 28: "LENGTH_IN", 29: "LENGTH_PC", 30: "LENGTH_PT", 31: "ANGLE_DEG", 32: "ANGLE_RAD", 33: "ANGLE_GRAD", 34: "TIME_MS", 35: "TIME_S", 42: "FUNCTION_START", 43: ")", 45: ",", 46: "URL_START", 47: "TRANSLATE_START", 48: "TRANSLATE_X_START", 49: "TRANSLATE_Y_START", 50: "TRANSLATE_Z_START", 51: "TRANSLATE_3D_START", 52: "WIDTH_START", 53: "HEIGHT_START", 54: "CLOSEST_START", 55: "RAND_START", 56: "VAR_START", 57: "VAR_NAME", 58: "CALC_START", 60: "(", 61: "*", 62: "/", 63: "+", 64: "-" },
        productions_: [0, [3, 2], [3, 1], [4, 1], [4, 2], [6, 1], [6, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [12, 1], [12, 1], [12, 1], [12, 1], [12, 1], [12, 1], [12, 1], [12, 1], [12, 1], [12, 1], [12, 1], [12, 1], [12, 1], [13, 1], [13, 1], [13, 1], [14, 1], [14, 1], [8, 1], [8, 1], [8, 1], [8, 1], [8, 1], [8, 1], [41, 2], [41, 3], [44, 1], [44, 3], [15, 3], [38, 3], [38, 3], [38, 3], [38, 3], [38, 3], [39, 2], [39, 2], [39, 3], [39, 3], [39, 5], [39, 5], [40, 2], [40, 5], [36, 3], [36, 5], [37, 3], [59, 1], [59, 3], [59, 3], [59, 3], [59, 3], [59, 3]],
        performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, /* action[1] */$$, /* vstack */_$ /* lstack */) {
            /* this == yyval */

            var $0 = $$.length - 1;
            switch (yystate) {
                case 1:
                    return $$[$0 - 1];
                    break;
                case 2:
                    return null;
                    break;
                case 3:case 5:case 6:case 10:case 11:case 12:case 13:case 34:case 35:case 36:case 37:case 38:case 39:case 61:
                    this.$ = $$[$0];
                    break;
                case 4:
                    this.$ = ast.CssConcatNode.concat($$[$0 - 1], $$[$0]);
                    break;
                case 7:case 14:case 15:
                    this.$ = new ast.CssPassthroughNode($$[$0]);
                    break;
                case 8:
                    this.$ = new ast.CssNumberNode(parseFloat($$[$0]));
                    break;
                case 9:
                    this.$ = new ast.CssPercentNode(parseFloat($$[$0]));
                    break;
                case 16:
                    this.$ = new ast.CssLengthNode(parseFloat($$[$0]), 'px');
                    break;
                case 17:
                    this.$ = new ast.CssLengthNode(parseFloat($$[$0]), 'em');
                    break;
                case 18:
                    this.$ = new ast.CssLengthNode(parseFloat($$[$0]), 'rem');
                    break;
                case 19:
                    this.$ = new ast.CssLengthNode(parseFloat($$[$0]), 'vh');
                    break;
                case 20:
                    this.$ = new ast.CssLengthNode(parseFloat($$[$0]), 'vw');
                    break;
                case 21:
                    this.$ = new ast.CssLengthNode(parseFloat($$[$0]), 'vmin');
                    break;
                case 22:
                    this.$ = new ast.CssLengthNode(parseFloat($$[$0]), 'vmax');
                    break;
                case 23:
                    this.$ = new ast.CssLengthNode(parseFloat($$[$0]), 'cm');
                    break;
                case 24:
                    this.$ = new ast.CssLengthNode(parseFloat($$[$0]), 'mm');
                    break;
                case 25:
                    this.$ = new ast.CssLengthNode(parseFloat($$[$0]), 'q');
                    break;
                case 26:
                    this.$ = new ast.CssLengthNode(parseFloat($$[$0]), 'in');
                    break;
                case 27:
                    this.$ = new ast.CssLengthNode(parseFloat($$[$0]), 'pc');
                    break;
                case 28:
                    this.$ = new ast.CssLengthNode(parseFloat($$[$0]), 'pt');
                    break;
                case 29:
                    this.$ = new ast.CssAngleNode(parseFloat($$[$0]), 'deg');
                    break;
                case 30:
                    this.$ = new ast.CssAngleNode(parseFloat($$[$0]), 'rad');
                    break;
                case 31:
                    this.$ = new ast.CssAngleNode(parseFloat($$[$0]), 'grad');
                    break;
                case 32:
                    this.$ = new ast.CssTimeNode(parseFloat($$[$0]), 'ms');
                    break;
                case 33:
                    this.$ = new ast.CssTimeNode(parseFloat($$[$0]), 's');
                    break;
                case 40:
                    this.$ = new ast.CssFuncNode($$[$0 - 1].slice(0, -1), []);
                    break;
                case 41:
                    this.$ = new ast.CssFuncNode($$[$0 - 2].slice(0, -1), $$[$0 - 1]);
                    break;
                case 42:
                    this.$ = [$$[$0]];
                    break;
                case 43:

                    var args = $$[$0 - 2];
                    args.push($$[$0]);
                    this.$ = args;

                    break;
                case 44:
                    this.$ = new ast.CssUrlNode($$[$0 - 1].slice(1, -1));
                    break;
                case 45:
                    this.$ = new ast.CssTranslateNode('', $$[$0 - 1]);
                    break;
                case 46:
                    this.$ = new ast.CssTranslateNode('x', $$[$0 - 1]);
                    break;
                case 47:
                    this.$ = new ast.CssTranslateNode('y', $$[$0 - 1]);
                    break;
                case 48:
                    this.$ = new ast.CssTranslateNode('z', $$[$0 - 1]);
                    break;
                case 49:
                    this.$ = new ast.CssTranslateNode('3d', $$[$0 - 1]);
                    break;
                case 50:
                    this.$ = new ast.CssDimSizeNode('w');
                    break;
                case 51:
                    this.$ = new ast.CssDimSizeNode('h');
                    break;
                case 52:
                    this.$ = new ast.CssDimSizeNode('w', $$[$0 - 1].slice(1, -1));
                    break;
                case 53:
                    this.$ = new ast.CssDimSizeNode('h', $$[$0 - 1].slice(1, -1));
                    break;
                case 54:
                    this.$ = new ast.CssDimSizeNode('w', $$[$0 - 2].slice(1, -1), 'closest');
                    break;
                case 55:
                    this.$ = new ast.CssDimSizeNode('h', $$[$0 - 2].slice(1, -1), 'closest');
                    break;
                case 56:
                    this.$ = new ast.CssRandNode();
                    break;
                case 57:
                    this.$ = new ast.CssRandNode($$[$0 - 3], $$[$0 - 1]);
                    break;
                case 58:
                    this.$ = new ast.CssVarNode($$[$0 - 1]);
                    break;
                case 59:
                    this.$ = new ast.CssVarNode($$[$0 - 3], $$[$0 - 1]);
                    break;
                case 60:
                    this.$ = new ast.CssCalcNode($$[$0 - 1]);
                    break;
                case 62:
                    this.$ = $$[$0 - 1];
                    break;
                case 63:
                    this.$ = new ast.CssCalcProductNode($$[$0 - 2], $$[$0], '*');
                    break;
                case 64:
                    this.$ = new ast.CssCalcProductNode($$[$0 - 2], $$[$0], '/');
                    break;
                case 65:
                    this.$ = new ast.CssCalcSumNode($$[$0 - 2], $$[$0], '+');
                    break;
                case 66:
                    this.$ = new ast.CssCalcSumNode($$[$0 - 2], $$[$0], '-');
                    break;
            }
        },
        table: [{ 3: 1, 4: 2, 5: [1, 3], 6: 4, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy }, { 1: [3] }, { 5: [1, 52], 6: 53, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy }, { 1: [2, 2] }, o($Vz, [2, 3]), o($VA, [2, 5]), o($VA, [2, 6]), o($VA, [2, 7]), o($VA, [2, 8]), o($VA, [2, 9]), o($VA, [2, 10]), o($VA, [2, 11]), o($VA, [2, 12]), o($VA, [2, 13]), o($VA, [2, 14]), o($VA, [2, 15]), o($VA, [2, 34]), o($VA, [2, 35]), o($VA, [2, 36]), o($VA, [2, 37]), o($VA, [2, 38]), o($VA, [2, 39]), o($VA, [2, 16]), o($VA, [2, 17]), o($VA, [2, 18]), o($VA, [2, 19]), o($VA, [2, 20]), o($VA, [2, 21]), o($VA, [2, 22]), o($VA, [2, 23]), o($VA, [2, 24]), o($VA, [2, 25]), o($VA, [2, 26]), o($VA, [2, 27]), o($VA, [2, 28]), o($VA, [2, 29]), o($VA, [2, 30]), o($VA, [2, 31]), o($VA, [2, 32]), o($VA, [2, 33]), { 9: [1, 54] }, { 57: [1, 55] }, { 6: 57, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy, 59: 56, 60: $VB }, { 6: 60, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 44: 59, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy }, { 6: 60, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 44: 61, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy }, { 6: 60, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 44: 62, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy }, { 6: 60, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 44: 63, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy }, { 6: 60, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 44: 64, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy }, { 9: [1, 66], 43: [1, 65], 54: [1, 67] }, { 9: [1, 69], 43: [1, 68], 54: [1, 70] }, { 6: 72, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 43: [1, 71], 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy }, { 6: 60, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 43: [1, 73], 44: 74, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy }, { 1: [2, 1] }, o($Vz, [2, 4]), { 43: [1, 75] }, { 43: [1, 76], 45: [1, 77] }, { 43: [1, 78], 61: $VC, 62: $VD, 63: $VE, 64: $VF }, o($VG, [2, 61]), { 6: 57, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy, 59: 83, 60: $VB }, { 43: [1, 84], 45: $VH }, o($VI, [2, 42]), { 43: [1, 86], 45: $VH }, { 43: [1, 87], 45: $VH }, { 43: [1, 88], 45: $VH }, { 43: [1, 89], 45: $VH }, o($VA, [2, 50]), { 43: [1, 90] }, { 9: [1, 91] }, o($VA, [2, 51]), { 43: [1, 92] }, { 9: [1, 93] }, o($VA, [2, 56]), { 45: [1, 94] }, o($VA, [2, 40]), { 43: [1, 95], 45: $VH }, o($VA, [2, 44]), o($VA, [2, 58]), { 6: 96, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy }, o($VA, [2, 60]), { 6: 57, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy, 59: 97, 60: $VB }, { 6: 57, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy, 59: 98, 60: $VB }, { 6: 57, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy, 59: 99, 60: $VB }, { 6: 57, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy, 59: 100, 60: $VB }, { 43: [1, 101], 61: $VC, 62: $VD, 63: $VE, 64: $VF }, o($VA, [2, 45]), { 6: 102, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy }, o($VA, [2, 46]), o($VA, [2, 47]), o($VA, [2, 48]), o($VA, [2, 49]), o($VA, [2, 52]), { 43: [1, 103] }, o($VA, [2, 53]), { 43: [1, 104] }, { 6: 105, 7: 5, 8: 6, 9: $V0, 10: $V1, 11: $V2, 12: 10, 13: 11, 14: 12, 15: 13, 16: $V3, 17: $V4, 18: $V5, 19: $V6, 20: $V7, 21: $V8, 22: $V9, 23: $Va, 24: $Vb, 25: $Vc, 26: $Vd, 27: $Ve, 28: $Vf, 29: $Vg, 30: $Vh, 31: $Vi, 32: $Vj, 33: $Vk, 34: $Vl, 35: $Vm, 36: 16, 37: 17, 38: 18, 39: 19, 40: 20, 41: 21, 42: $Vn, 46: $Vo, 47: $Vp, 48: $Vq, 49: $Vr, 50: $Vs, 51: $Vt, 52: $Vu, 53: $Vv, 55: $Vw, 56: $Vx, 58: $Vy }, o($VA, [2, 41]), { 43: [1, 106] }, o($VG, [2, 63]), o($VG, [2, 64]), o($VJ, [2, 65], { 61: $VC, 62: $VD }), o($VJ, [2, 66], { 61: $VC, 62: $VD }), o($VG, [2, 62]), o($VI, [2, 43]), { 43: [1, 107] }, { 43: [1, 108] }, { 43: [1, 109] }, o($VA, [2, 59]), o($VA, [2, 54]), o($VA, [2, 55]), o($VA, [2, 57])],
        defaultActions: { 3: [2, 2], 52: [2, 1] },
        parseError: function parseError(str, hash) {
            if (hash.recoverable) {
                this.trace(str);
            } else {
                throw new Error(str);
            }
        },
        parse: function parse(input) {
            var self = this,
                stack = [0],
                tstack = [],
                vstack = [null],
                lstack = [],
                table = this.table,
                yytext = '',
                yylineno = 0,
                yyleng = 0,
                recovering = 0,
                TERROR = 2,
                EOF = 1;
            var args = lstack.slice.call(arguments, 1);
            var lexer = Object.create(this.lexer);
            var sharedState = { yy: {} };
            for (var k in this.yy) {
                if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
                    sharedState.yy[k] = this.yy[k];
                }
            }
            lexer.setInput(input, sharedState.yy);
            sharedState.yy.lexer = lexer;
            sharedState.yy.parser = this;
            if (typeof lexer.yylloc == 'undefined') {
                lexer.yylloc = {};
            }
            var yyloc = lexer.yylloc;
            lstack.push(yyloc);
            var ranges = lexer.options && lexer.options.ranges;
            if (typeof sharedState.yy.parseError === 'function') {
                this.parseError = sharedState.yy.parseError;
            } else {
                this.parseError = Object.getPrototypeOf(this).parseError;
            }
            function popStack(n) {
                stack.length = stack.length - 2 * n;
                vstack.length = vstack.length - n;
                lstack.length = lstack.length - n;
            }
            _token_stack: function lex() {
                var token;
                token = lexer.lex() || EOF;
                if (typeof token !== 'number') {
                    token = self.symbols_[token] || token;
                }
                return token;
            }
            var symbol,
                preErrorSymbol,
                state,
                action,
                a,
                r,
                yyval = {},
                p,
                len,
                newState,
                expected;
            while (true) {
                state = stack[stack.length - 1];
                if (this.defaultActions[state]) {
                    action = this.defaultActions[state];
                } else {
                    if (symbol === null || typeof symbol == 'undefined') {
                        symbol = lex();
                    }
                    action = table[state] && table[state][symbol];
                }
                if (typeof action === 'undefined' || !action.length || !action[0]) {
                    var errStr = '';
                    expected = [];
                    for (p in table[state]) {
                        if (this.terminals_[p] && p > TERROR) {
                            expected.push('\'' + this.terminals_[p] + '\'');
                        }
                    }
                    if (lexer.showPosition) {
                        errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                    } else {
                        errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                    }
                    this.parseError(errStr, {
                        text: lexer.match,
                        token: this.terminals_[symbol] || symbol,
                        line: lexer.yylineno,
                        loc: yyloc,
                        expected: expected
                    });
                }
                if (action[0] instanceof Array && action.length > 1) {
                    throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
                }
                switch (action[0]) {
                    case 1:
                        stack.push(symbol);
                        vstack.push(lexer.yytext);
                        lstack.push(lexer.yylloc);
                        stack.push(action[1]);
                        symbol = null;
                        if (!preErrorSymbol) {
                            yyleng = lexer.yyleng;
                            yytext = lexer.yytext;
                            yylineno = lexer.yylineno;
                            yyloc = lexer.yylloc;
                            if (recovering > 0) {
                                recovering--;
                            }
                        } else {
                            symbol = preErrorSymbol;
                            preErrorSymbol = null;
                        }
                        break;
                    case 2:
                        len = this.productions_[action[1]][1];
                        yyval.$ = vstack[vstack.length - len];
                        yyval._$ = {
                            first_line: lstack[lstack.length - (len || 1)].first_line,
                            last_line: lstack[lstack.length - 1].last_line,
                            first_column: lstack[lstack.length - (len || 1)].first_column,
                            last_column: lstack[lstack.length - 1].last_column
                        };
                        if (ranges) {
                            yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                        }
                        r = this.performAction.apply(yyval, [yytext, yyleng, yylineno, sharedState.yy, action[1], vstack, lstack].concat(args));
                        if (typeof r !== 'undefined') {
                            return r;
                        }
                        if (len) {
                            stack = stack.slice(0, -1 * len * 2);
                            vstack = vstack.slice(0, -1 * len);
                            lstack = lstack.slice(0, -1 * len);
                        }
                        stack.push(this.productions_[action[1]][0]);
                        vstack.push(yyval.$);
                        lstack.push(yyval._$);
                        newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                        stack.push(newState);
                        break;
                    case 3:
                        return true;
                }
            }
            return true;
        } };
    /* generated by jison-lex 0.3.4 */
    var lexer = (function () {
        var lexer = {

            EOF: 1,

            parseError: function parseError(str, hash) {
                if (this.yy.parser) {
                    this.yy.parser.parseError(str, hash);
                } else {
                    throw new Error(str);
                }
            },

            // resets the lexer, sets new input
            setInput: function (input, yy) {
                this.yy = yy || this.yy || {};
                this._input = input;
                this._more = this._backtrack = this.done = false;
                this.yylineno = this.yyleng = 0;
                this.yytext = this.matched = this.match = '';
                this.conditionStack = ['INITIAL'];
                this.yylloc = {
                    first_line: 1,
                    first_column: 0,
                    last_line: 1,
                    last_column: 0
                };
                if (this.options.ranges) {
                    this.yylloc.range = [0, 0];
                }
                this.offset = 0;
                return this;
            },

            // consumes and returns one char from the input
            input: function () {
                var ch = this._input[0];
                this.yytext += ch;
                this.yyleng++;
                this.offset++;
                this.match += ch;
                this.matched += ch;
                var lines = ch.match(/(?:\r\n?|\n).*/g);
                if (lines) {
                    this.yylineno++;
                    this.yylloc.last_line++;
                } else {
                    this.yylloc.last_column++;
                }
                if (this.options.ranges) {
                    this.yylloc.range[1]++;
                }

                this._input = this._input.slice(1);
                return ch;
            },

            // unshifts one char (or a string) into the input
            unput: function (ch) {
                var len = ch.length;
                var lines = ch.split(/(?:\r\n?|\n)/g);

                this._input = ch + this._input;
                this.yytext = this.yytext.substr(0, this.yytext.length - len);
                //this.yyleng -= len;
                this.offset -= len;
                var oldLines = this.match.split(/(?:\r\n?|\n)/g);
                this.match = this.match.substr(0, this.match.length - 1);
                this.matched = this.matched.substr(0, this.matched.length - 1);

                if (lines.length - 1) {
                    this.yylineno -= lines.length - 1;
                }
                var r = this.yylloc.range;

                this.yylloc = {
                    first_line: this.yylloc.first_line,
                    last_line: this.yylineno + 1,
                    first_column: this.yylloc.first_column,
                    last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
                };

                if (this.options.ranges) {
                    this.yylloc.range = [r[0], r[0] + this.yyleng - len];
                }
                this.yyleng = this.yytext.length;
                return this;
            },

            // When called from action, caches matched text and appends it on next action
            more: function () {
                this._more = true;
                return this;
            },

            // When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
            reject: function () {
                if (this.options.backtrack_lexer) {
                    this._backtrack = true;
                } else {
                    return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                        text: "",
                        token: null,
                        line: this.yylineno
                    });
                }
                return this;
            },

            // retain first n characters of the match
            less: function (n) {
                this.unput(this.match.slice(n));
            },

            // displays already matched input, i.e. for error messages
            pastInput: function () {
                var past = this.matched.substr(0, this.matched.length - this.match.length);
                return (past.length > 20 ? '...' : '') + past.substr(-20).replace(/\n/g, "");
            },

            // displays upcoming input, i.e. for error messages
            upcomingInput: function () {
                var next = this.match;
                if (next.length < 20) {
                    next += this._input.substr(0, 20 - next.length);
                }
                return (next.substr(0, 20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
            },

            // displays the character position where the lexing error occurred, i.e. for error messages
            showPosition: function () {
                var pre = this.pastInput();
                var c = new Array(pre.length + 1).join("-");
                return pre + this.upcomingInput() + "\n" + c + "^";
            },

            // test the lexed token: return FALSE when not a match, otherwise return token
            test_match: function (match, indexed_rule) {
                var token, lines, backup;

                if (this.options.backtrack_lexer) {
                    // save context
                    backup = {
                        yylineno: this.yylineno,
                        yylloc: {
                            first_line: this.yylloc.first_line,
                            last_line: this.last_line,
                            first_column: this.yylloc.first_column,
                            last_column: this.yylloc.last_column
                        },
                        yytext: this.yytext,
                        match: this.match,
                        matches: this.matches,
                        matched: this.matched,
                        yyleng: this.yyleng,
                        offset: this.offset,
                        _more: this._more,
                        _input: this._input,
                        yy: this.yy,
                        conditionStack: this.conditionStack.slice(0),
                        done: this.done
                    };
                    if (this.options.ranges) {
                        backup.yylloc.range = this.yylloc.range.slice(0);
                    }
                }

                lines = match[0].match(/(?:\r\n?|\n).*/g);
                if (lines) {
                    this.yylineno += lines.length;
                }
                this.yylloc = {
                    first_line: this.yylloc.last_line,
                    last_line: this.yylineno + 1,
                    first_column: this.yylloc.last_column,
                    last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length
                };
                this.yytext += match[0];
                this.match += match[0];
                this.matches = match;
                this.yyleng = this.yytext.length;
                if (this.options.ranges) {
                    this.yylloc.range = [this.offset, this.offset += this.yyleng];
                }
                this._more = false;
                this._backtrack = false;
                this._input = this._input.slice(match[0].length);
                this.matched += match[0];
                token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
                if (this.done && this._input) {
                    this.done = false;
                }
                if (token) {
                    return token;
                } else if (this._backtrack) {
                    // recover context
                    for (var k in backup) {
                        this[k] = backup[k];
                    }
                    return false; // rule action called reject() implying the next rule should be tested instead.
                }
                return false;
            },

            // return next match in input
            next: function () {
                if (this.done) {
                    return this.EOF;
                }
                if (!this._input) {
                    this.done = true;
                }

                var token, match, tempMatch, index;
                if (!this._more) {
                    this.yytext = '';
                    this.match = '';
                }
                var rules = this._currentRules();
                for (var i = 0; i < rules.length; i++) {
                    tempMatch = this._input.match(this.rules[rules[i]]);
                    if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                        match = tempMatch;
                        index = i;
                        if (this.options.backtrack_lexer) {
                            token = this.test_match(tempMatch, rules[i]);
                            if (token !== false) {
                                return token;
                            } else if (this._backtrack) {
                                match = false;
                                continue; // rule action called reject() implying a rule MISmatch.
                            } else {
                                    // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                                    return false;
                                }
                        } else if (!this.options.flex) {
                            break;
                        }
                    }
                }
                if (match) {
                    token = this.test_match(match, rules[index]);
                    if (token !== false) {
                        return token;
                    }
                    // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                    return false;
                }
                if (this._input === "") {
                    return this.EOF;
                } else {
                    return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                        text: "",
                        token: null,
                        line: this.yylineno
                    });
                }
            },

            // return next match that has a token
            lex: function lex() {
                var r = this.next();
                if (r) {
                    return r;
                } else {
                    return this.lex();
                }
            },

            // activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
            begin: function begin(condition) {
                this.conditionStack.push(condition);
            },

            // pop the previously active lexer condition state off the condition stack
            popState: function popState() {
                var n = this.conditionStack.length - 1;
                if (n > 0) {
                    return this.conditionStack.pop();
                } else {
                    return this.conditionStack[0];
                }
            },

            // produce the lexer rule set which is active for the currently active lexer condition state
            _currentRules: function _currentRules() {
                if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
                    return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
                } else {
                    return this.conditions["INITIAL"].rules;
                }
            },

            // return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
            topState: function topState(n) {
                n = this.conditionStack.length - 1 - Math.abs(n || 0);
                if (n >= 0) {
                    return this.conditionStack[n];
                } else {
                    return "INITIAL";
                }
            },

            // alias for begin(condition)
            pushState: function pushState(condition) {
                this.begin(condition);
            },

            // return the number of states currently on the stack
            stateStackSize: function stateStackSize() {
                return this.conditionStack.length;
            },
            options: {},
            performAction: function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {
                var YYSTATE = YY_START;
                switch ($avoiding_name_collisions) {
                    case 0:
                        /* skip whitespace */
                        break;
                    case 1:
                        return 18;
                        break;
                    case 2:
                        return 19;
                        break;
                    case 3:
                        return 20;
                        break;
                    case 4:
                        return 21;
                        break;
                    case 5:
                        return 22;
                        break;
                    case 6:
                        return 23;
                        break;
                    case 7:
                        return 24;
                        break;
                    case 8:
                        return 25;
                        break;
                    case 9:
                        return 26;
                        break;
                    case 10:
                        return 27;
                        break;
                    case 11:
                        return 28;
                        break;
                    case 12:
                        return 29;
                        break;
                    case 13:
                        return 30;
                        break;
                    case 14:
                        return 31;
                        break;
                    case 15:
                        return 32;
                        break;
                    case 16:
                        return 33;
                        break;
                    case 17:
                        return 34;
                        break;
                    case 18:
                        return 35;
                        break;
                    case 19:
                        return 11;
                        break;
                    case 20:
                        return 10;
                        break;
                    case 21:
                        return 16;
                        break;
                    case 22:
                        return 46;
                        break;
                    case 23:
                        return 58;
                        break;
                    case 24:
                        return 56;
                        break;
                    case 25:
                        return 47;
                        break;
                    case 26:
                        return 48;
                        break;
                    case 27:
                        return 49;
                        break;
                    case 28:
                        return 50;
                        break;
                    case 29:
                        return 51;
                        break;
                    case 30:
                        return 55;
                        break;
                    case 31:
                        return 52;
                        break;
                    case 32:
                        return 53;
                        break;
                    case 33:
                        return 54;
                        break;
                    case 34:
                        return 42;
                        break;
                    case 35:
                        return 17;
                        break;
                    case 36:
                        return 57;
                        break;
                    case 37:
                        return 9;
                        break;
                    case 38:
                        return 63;
                        break;
                    case 39:
                        return 64;
                        break;
                    case 40:
                        return 61;
                        break;
                    case 41:
                        return 62;
                        break;
                    case 42:
                        return 60;
                        break;
                    case 43:
                        return 43;
                        break;
                    case 44:
                        return 45;
                        break;
                    case 45:
                        return 'INVALID';
                        break;
                    case 46:
                        return 5;
                        break;
                }
            },
            rules: [/^(?:\s+)/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Pp])([Xx]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Ee])([Mm]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Rr])([Ee])([Mm]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Vv])([Hh]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Vv])([Ww]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Vv])([Mm])([Ii])([Nn]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Vv])([Mm])([Aa])([Xx]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Cc])([Mm]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Mm])([Mm]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Qq]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Ii])([Nn]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Pp])([Cc]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Pp])([Tt]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Dd])([Ee])([Gg]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Rr])([Aa])([Dd]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Gg])([Rr])([Aa])([Dd]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Mm])([Ss]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)([Ss]))/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)%)/, /^(?:([+-]?[0-9]+(\.[0-9]+)?([eE][+\-]?[0-9]+)?|[+-]?\.[0-9]+([eE][+\-]?[0-9]+)?)\b)/, /^(?:#([a-fA-F0-9]+))/, /^(?:([Uu])([Rr])([Ll])\()/, /^(?:([Cc])([Aa])([Ll])([Cc])\()/, /^(?:([Vv])([Aa])([Rr])\()/, /^(?:([Tt])([Rr])([Aa])([Nn])([Ss])([Ll])([Aa])([Tt])([Ee])\()/, /^(?:([Tt])([Rr])([Aa])([Nn])([Ss])([Ll])([Aa])([Tt])([Ee])([Xx])\()/, /^(?:([Tt])([Rr])([Aa])([Nn])([Ss])([Ll])([Aa])([Tt])([Ee])([Yy])\()/, /^(?:([Tt])([Rr])([Aa])([Nn])([Ss])([Ll])([Aa])([Tt])([Ee])([Zz])\()/, /^(?:([Tt])([Rr])([Aa])([Nn])([Ss])([Ll])([Aa])([Tt])([Ee])3([Dd])\()/, /^(?:([Rr])([Aa])([Nn])([Dd])\()/, /^(?:([Ww])([Ii])([Dd])([Tt])([Hh])\()/, /^(?:([Hh])([Ee])([Ii])([Gg])([Hh])([Tt])\()/, /^(?:([Cc])([Ll])([Oo])([Ss])([Ee])([Ss])([Tt])\()/, /^(?:(-?[a-zA-Z_][\-a-zA-Z0-9_]*)\()/, /^(?:(-?[a-zA-Z_][\-a-zA-Z0-9_]*))/, /^(?:--(-?[a-zA-Z_][\-a-zA-Z0-9_]*))/, /^(?:('[^\']*'|"[^\"]*"))/, /^(?:\+)/, /^(?:-)/, /^(?:\*)/, /^(?:\/)/, /^(?:\()/, /^(?:\))/, /^(?:,)/, /^(?:.)/, /^(?:$)/],
            conditions: { "INITIAL": { "rules": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46], "inclusive": true } }
        };
        return lexer;
    })();
    parser.lexer = lexer;
    function Parser() {
        this.yy = {};
    }
    Parser.prototype = parser;parser.Parser = Parser;
    return new Parser();
})();

exports.parser = parser;

},{"./css-expr-ast":2}],4:[function(require,module,exports){
exports.__esModule = true;
exports.parseCss = parseCss;
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

var _cssExprImpl = require('./css-expr-impl');

/**
 * @param {string} cssString
 * @return {?./css-expr-ast.CssNode}
 */

function parseCss(cssString) {
  return _cssExprImpl.parser.parse(cssString);
}

},{"./css-expr-impl":3}],5:[function(require,module,exports){
exports.__esModule = true;
exports.extractKeyframes = extractKeyframes;
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

var _srcString = require('../../../src/string');

/**
 * Finds and extracts keyframes definition for Web Animations from CSS styles.
 * @param {!Document|!ShadowRoot} rootNode
 * @param {string} name
 * @return {?./web-animation-types.WebKeyframesDef}
 */

function extractKeyframes(rootNode, name) {
  var styleSheets = rootNode.styleSheets;
  if (!styleSheets) {
    return null;
  }
  var win = (rootNode.ownerDocument || rootNode).defaultView;
  // Go from the last to first since the last rule wins in CSS.
  for (var i = styleSheets.length - 1; i >= 0; i--) {
    var keyframes = scanStyle(win, /** @type {!CSSStyleSheet} */styleSheets[i], name);
    if (keyframes) {
      return keyframes;
    }
  }
  return null;
}

/**
 * @param {!Window} win
 * @param {!CSSStyleSheet} styleSheet
 * @param {string} name
 * @return {?./web-animation-types.WebKeyframesDef}
 */
function scanStyle(win, styleSheet, name) {
  // No rules, e.g. a font.
  if (!styleSheet.cssRules) {
    return null;
  }

  var styleNode = styleSheet.ownerNode;
  if (!styleNode) {
    return null;
  }
  // Exlcude AMP's own styles.
  if (!styleNode.hasAttribute('amp-custom') && !styleNode.hasAttribute('amp-keyframes')) {
    return null;
  }

  return scanRules(win, styleSheet.cssRules, name);
}

/**
 * @param {!Window} win
 * @param {!CSSRuleList} rules
 * @param {string} name
 * @return {?./web-animation-types.WebKeyframesDef}
 */
function scanRules(win, rules, name) {
  // Go backwards since in CSS the last one wins.
  for (var i = rules.length - 1; i >= 0; i--) {
    var rule = rules[i];
    if (rule.type == /* CSSKeyframesRule */7) {
      var keyframesRule = /** @type {!CSSKeyframesRule} */rule;
      if (rule.name == name && isEnabled(win, rule)) {
        return buildKeyframes(keyframesRule);
      }
    } else if (rule.type == /* CSSMediaRule */4) {
      // Go recursively inside. The media match will be checked only when
      // the corresponding @keyframes have been found.
      var found = scanRules(win, rule.cssRules, name);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * @param {!Window} win
 * @param {!CSSRule} rule
 * @return {boolean}
 */
function isEnabled(_x, _x2) {
  var _again = true;

  _function: while (_again) {
    var win = _x,
        rule = _x2;
    _again = false;

    // Try rule itself.
    if (rule.media && rule.media.mediaText) {
      var enabled = win.matchMedia(rule.media.mediaText).matches;
      if (!enabled) {
        return false;
      }
    }

    // Check the parents.
    if (rule.parentRule) {
      _x = win;
      _x2 = rule.parentRule;
      _again = true;
      enabled = undefined;
      continue _function;
    } else if (rule.parentStyleSheet && rule.parentStyleSheet.media && rule.parentStyleSheet.media.mediaText) {
      return win.matchMedia(rule.parentStyleSheet.media.mediaText).matches;
    }
    return true;
  }
}

/**
 * @param {!CSSKeyframesRule} keyframesRule
 * @return {!./web-animation-types.WebKeyframesDef}
 */
function buildKeyframes(keyframesRule) {
  var array = [];
  for (var i = 0; i < keyframesRule.cssRules.length; i++) {
    var keyframeRule = /** @type {!CSSKeyframeRule} */keyframesRule.cssRules[i];
    var keyframe = {};
    keyframe['offset'] = keyframeRule.keyText == 'from' ? 0 : keyframeRule.keyText == 'to' ? 1 : parseFloat(keyframeRule.keyText) / 100;
    var style = keyframeRule.style;
    for (var j = 0; j < style.length; j++) {
      var styleName = style[j];
      var propName = styleName;
      if (_srcString.endsWith(styleName, 'animation-timing-function')) {
        propName = 'easing';
      }
      keyframe[propName] = style[styleName];
    }
    array.push(keyframe);
  }
  return array;
}

},{"../../../src/string":42}],6:[function(require,module,exports){
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

var ScrollboundPlayer = (function () {

  /** @param {!./web-animations.InternalWebAnimationRequestDef} request */

  function ScrollboundPlayer(request) {
    babelHelpers.classCallCheck(this, ScrollboundPlayer);

    // TODO(aghassemi): Use {Animation} as typedef but looks like it is missing
    // currentTime in the extern.
    /** @private {?Object} */
    this.animation_ = null;

    /** @private {!./web-animations.InternalWebAnimationRequestDef} */
    this.request_ = request;

    /** @private {!boolean} */
    this.paused_ = false;

    // If no duration, wait until duration arrives via onScrollDurationChanged
    if (request.timing.duration == 0) {
      return;
    } else {
      this.createAnimation_();
    }
  }

  ScrollboundPlayer.prototype.onScrollDurationChanged = function onScrollDurationChanged() {
    var currentTime = 0;
    if (this.animation_) {
      currentTime = this.animation_.currentTime;
    }
    // we have to recreate the animation to change its duration
    this.createAnimation_();
    this.animation_.currentTime = currentTime;
  };

  ScrollboundPlayer.prototype.pause = function pause() {
    this.paused_ = true;
  };

  ScrollboundPlayer.prototype.play = function play() {
    this.paused_ = false;
  };

  ScrollboundPlayer.prototype.cancel = function cancel() {
    this.paused_ = true;
    this.animation_.cancel();
  };

  ScrollboundPlayer.prototype.tick = function tick(pos) {
    if (this.paused_ || !this.animation_) {
      return;
    }
    this.animation_.currentTime = pos;
  };

  ScrollboundPlayer.prototype.createAnimation_ = function createAnimation_() {
    this.animation_ = this.request_.target.animate(this.request_.keyframes, this.request_.timing);
    this.animation_.pause();
  };

  return ScrollboundPlayer;
})();

exports.ScrollboundPlayer = ScrollboundPlayer;

},{}],7:[function(require,module,exports){
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

var _srcServicePositionObserverImpl = require('../../../src/service/position-observer-impl');

var _srcService = require('../../../src/service');

var ScrollboundScene = (function () {

  /**
   * @param {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
   * @param {!Element} element
   * @param {!function(!number)} onScroll
   * @param {!Function} onDurationChanged
   */

  function ScrollboundScene(ampdoc, element, onScroll, onDurationChanged) {
    babelHelpers.classCallCheck(this, ScrollboundScene);

    /** @private {!Element} */
    this.element_ = element;

    /** @private {?number} */
    this.scrollDuration_ = null;

    /** @private {!function(!number)} */
    this.onScroll_ = onScroll;

    /** @private {!Function} */
    this.onDurationChanged_ = onDurationChanged;

    _srcServicePositionObserverImpl.installPositionObserverServiceForDoc(ampdoc);
    this.positionObserver_ = _srcService.getServiceForDoc(ampdoc, 'position-observer');

    _srcService.getServiceForDoc(ampdoc, 'position-observer').observe(this.element_, _srcServicePositionObserverImpl.PositionObserverFidelity.HIGH, this.onPositionChanged_.bind(this));
  }

  ScrollboundScene.prototype.onPositionChanged_ = function onPositionChanged_(newPos) {
    // Until we have visibility conditions exposed scroll duration is amount
    // from when element is fully visible until element is partially
    // invisible which is basically viewportHeight - elementHeight.

    var vpRect = newPos.viewportRect;
    var posRec = newPos.positionRect;

    // If no positionRect, it is fully outside of the viewport.
    if (!posRec) {
      return;
    }

    // Did scroll duration changed?
    var scrollDuration = vpRect.height - posRec.height;
    if (scrollDuration != this.scrollDuration_) {
      this.scrollDuration_ = scrollDuration;
      this.onDurationChanged_(scrollDuration);
    }

    // Is scene fully visible?
    var isFullyVisible = posRec.bottom <= vpRect.height && posRec.top >= 0;

    if (isFullyVisible) {
      this.onScroll_(vpRect.height - posRec.bottom);
    } else {
      // Send the final position
      if (posRec.bottom < vpRect.height) {
        this.onScroll_(scrollDuration);
      } else {
        this.onScroll_(0);
      }
    }
  };

  return ScrollboundScene;
})();

exports.ScrollboundScene = ScrollboundScene;

},{"../../../src/service":39,"../../../src/service/position-observer-impl":40}],8:[function(require,module,exports){
exports.__esModule = true;
exports.isWhitelistedProp = isWhitelistedProp;
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
 * @typedef {!WebMultiAnimationDef|!WebCompAnimationDef|!WebKeyframeAnimationDef}
 */
var WebAnimationDef = undefined;

exports.WebAnimationDef = WebAnimationDef;
/**
 * @mixes WebAnimationSelectorDef
 * @mixes WebAnimationTimingDef
 * @mixes WebAnimationVarsDef
 * @mixes WebAnimationConditionalDef
 * @typedef {{
 *   animations: !Array<!WebAnimationDef>,
 * }}
 */
var WebMultiAnimationDef = undefined;

exports.WebMultiAnimationDef = WebMultiAnimationDef;
/**
 * @mixes WebAnimationSelectorDef
 * @mixes WebAnimationTimingDef
 * @mixes WebAnimationVarsDef
 * @mixes WebAnimationConditionalDef
 * @typedef {{
 *   animation: string,
 * }}
 */
var WebCompAnimationDef = undefined;

exports.WebCompAnimationDef = WebCompAnimationDef;
/**
 * @mixes WebAnimationSelectorDef
 * @mixes WebAnimationTimingDef
 * @mixes WebAnimationVarsDef
 * @mixes WebAnimationConditionalDef
 * @typedef {{
 *   keyframes: (string|!WebKeyframesDef),
 * }}
 */
var WebKeyframeAnimationDef = undefined;

exports.WebKeyframeAnimationDef = WebKeyframeAnimationDef;
/**
 * @typedef {!Object<string, *>|!Array<!Object<string, *>>}
 */
var WebKeyframesDef = undefined;

exports.WebKeyframesDef = WebKeyframesDef;
/**
 * See https://developer.mozilla.org/en-US/docs/Web/API/AnimationEffectTimingProperties
 *
 * @mixin
 * @typedef {{
 *   duration: (time|undefined),
 *   delay: (time|undefined),
 *   endDelay: (time|undefined),
 *   iterations: (number|string|undefined),
 *   iterationStart: (number|undefined),
 *   easing: (string|undefined),
 *   direction: (!WebAnimationTimingDirection|undefined),
 *   fill: (!WebAnimationTimingFill|undefined),
 *   ticker: (string|undefined)
 * }}
 */
var WebAnimationTimingDef = undefined;

exports.WebAnimationTimingDef = WebAnimationTimingDef;
/**
 * Indicates an extension to a type that allows specifying vars. Vars are
 * specified as properties with the name in the format of `--varName`.
 *
 * @mixin
 * @typedef {Object}
 */
var WebAnimationVarsDef = undefined;

exports.WebAnimationVarsDef = WebAnimationVarsDef;
/**
 * Defines media parameters for an animation.
 *
 * @mixin
 * @typedef {{
 *   media: (string|undefined),
 * }}
 */
var WebAnimationConditionalDef = undefined;

exports.WebAnimationConditionalDef = WebAnimationConditionalDef;
/**
 * @typedef {{
 *   target: (!Element|undefined),
 *   selector: (string|undefined),
 *   subtargets: (!Array<!WebAnimationSubtargetDef>|undefined),
 * }}
 */
var WebAnimationSelectorDef = undefined;

exports.WebAnimationSelectorDef = WebAnimationSelectorDef;
/**
 * @mixes WebAnimationTimingDef
 * @mixes WebAnimationVarsDef
 * @typedef {{
 *   matcher: (function(!Element, number):boolean|undefined),
 *   index: (number|undefined),
 *   selector: (string|undefined),
 * }}
 */
var WebAnimationSubtargetDef = undefined;

exports.WebAnimationSubtargetDef = WebAnimationSubtargetDef;
/**
 * See https://developer.mozilla.org/en-US/docs/Web/API/Animation/playState
 * @enum {string}
 */
var WebAnimationPlayState = {
  IDLE: 'idle',
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished'
};

exports.WebAnimationPlayState = WebAnimationPlayState;
/**
 * See https://developer.mozilla.org/en-US/docs/Web/API/AnimationEffectTimingProperties/direction
 * @enum {string}
 */
var WebAnimationTimingDirection = {
  NORMAL: 'normal',
  REVERSE: 'reverse',
  ALTERNATE: 'alternate',
  ALTERNATE_REVERSE: 'alternate-reverse'
};

exports.WebAnimationTimingDirection = WebAnimationTimingDirection;
/**
 * See https://developer.mozilla.org/en-US/docs/Web/API/AnimationEffectTimingProperties/fill
 * @enum {string}
 */
var WebAnimationTimingFill = {
  NONE: 'none',
  FORWARDS: 'forwards',
  BACKWARDS: 'backwards',
  BOTH: 'both',
  AUTO: 'auto'
};

exports.WebAnimationTimingFill = WebAnimationTimingFill;
/** @const {!Object<string, boolean>} */
var WHITELISTED_RPOPS = {
  'opacity': true,
  'transform': true,
  'visibility': true,
  'offset-distance': true,
  'offsetDistance': true
};

/**
 * @param {string} prop
 * @return {boolean}
 */

function isWhitelistedProp(prop) {
  return WHITELISTED_RPOPS[prop] || false;
}

},{}],9:[function(require,module,exports){
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

var _cssExprAst = require('./css-expr-ast');

var _srcObservable = require('../../../src/observable');

var _scrollboundPlayer = require('./scrollbound-player');

var _srcUrl = require('../../../src/url');

var _srcDom = require('../../../src/dom');

var _srcLog = require('../../../src/log');

var _keyframesExtractor = require('./keyframes-extractor');

var _srcMode = require('../../../src/mode');

var _srcStyle = require('../../../src/style');

var _srcTypes = require('../../../src/types');

var _srcUtilsObject = require('../../../src/utils/object');

var _cssExpr = require('./css-expr');

var _webAnimationTypes = require('./web-animation-types');

var _srcString = require('../../../src/string');

/** @const {string} */
var TAG = 'amp-animation';
var TARGET_ANIM_ID = '__AMP_ANIM_ID';

/**
 * Auto-incrementing ID generator for internal animation uses.
 * See `TARGET_ANIM_ID`.
 * @type {number}
 */
var animIdCounter = 0;

/**
 * A struct for parameters for `Element.animate` call.
 * See https://developer.mozilla.org/en-US/docs/Web/API/Element/animate
 *
 * @typedef {{
 *   target: !Element,
 *   keyframes: !WebKeyframesDef,
 *   vars: ?Object<string, *>,
 *   timing: !WebAnimationTimingDef,
 * }}
 */
var InternalWebAnimationRequestDef = undefined;

exports.InternalWebAnimationRequestDef = InternalWebAnimationRequestDef;
/**
 * @private
 * @enum {string}
 */
var Tickers = {
  SCROLL: 'scroll',
  TIME: 'time'
};

/**
 * @const {!Object<string, boolean>}
 */
var SERVICE_PROPS = {
  'offset': true,
  'easing': true
};

/**
 */

var WebAnimationRunner = (function () {

  /**
   * @param {!Array<!InternalWebAnimationRequestDef>} requests
   */

  function WebAnimationRunner(requests) {
    babelHelpers.classCallCheck(this, WebAnimationRunner);

    /** @const @private */
    this.requests_ = requests;

    /** @private {?Array<!Animation>} */
    this.players_ = null;

    /** @private {number} */
    this.runningCount_ = 0;

    /** @private {!WebAnimationPlayState} */
    this.playState_ = _webAnimationTypes.WebAnimationPlayState.IDLE;

    /** @private {!Observable} */
    this.playStateChangedObservable_ = new _srcObservable.Observable();
  }

  /**
   * The scanner for the `WebAnimationDef` format. It calls the appropriate
   * callbacks based on the discovered animation types.
   * @abstract
   */

  /**
   * @return {!WebAnimationPlayState}
   */

  WebAnimationRunner.prototype.getPlayState = function getPlayState() {
    return this.playState_;
  };

  /**
   * @param {function(!WebAnimationPlayState)} handler
   * @return {!UnlistenDef}
   */

  WebAnimationRunner.prototype.onPlayStateChanged = function onPlayStateChanged(handler) {
    return this.playStateChangedObservable_.add(handler);
  };

  /**
   */

  WebAnimationRunner.prototype.start = function start() {
    var _this = this;

    _srcLog.dev().assert(!this.players_);
    this.setPlayState_(_webAnimationTypes.WebAnimationPlayState.RUNNING);
    this.players_ = this.requests_.map(function (request) {
      // Apply vars.
      if (request.vars) {
        for (var k in request.vars) {
          request.target.style.setProperty(k, String(request.vars[k]));
        }
      }

      // Create the player.
      var player = undefined;
      if (request.timing.ticker == Tickers.SCROLL) {
        player = new _scrollboundPlayer.ScrollboundPlayer(request);
      } else {
        player = request.target.animate(request.keyframes, request.timing);
      }
      return player;
    });
    this.runningCount_ = this.players_.length;
    this.players_.forEach(function (player) {
      player.onfinish = function () {
        _this.runningCount_--;
        if (_this.runningCount_ == 0) {
          _this.setPlayState_(_webAnimationTypes.WebAnimationPlayState.FINISHED);
        }
      };
    });
  };

  /**
   */

  WebAnimationRunner.prototype.pause = function pause() {
    _srcLog.dev().assert(this.players_);
    this.setPlayState_(_webAnimationTypes.WebAnimationPlayState.PAUSED);
    this.players_.forEach(function (player) {
      player.pause();
    });
  };

  /**
   */

  WebAnimationRunner.prototype.resume = function resume() {
    _srcLog.dev().assert(this.players_);
    if (this.playState_ == _webAnimationTypes.WebAnimationPlayState.RUNNING) {
      return;
    }
    this.setPlayState_(_webAnimationTypes.WebAnimationPlayState.RUNNING);
    this.players_.forEach(function (player) {
      player.play();
    });
  };

  /**
   */

  WebAnimationRunner.prototype.reverse = function reverse() {
    _srcLog.dev().assert(this.players_);
    this.players_.forEach(function (player) {
      player.reverse();
    });
  };

  /**
   * @param {time} time
   */

  WebAnimationRunner.prototype.seekTo = function seekTo(time) {
    _srcLog.dev().assert(this.players_);
    this.setPlayState_(_webAnimationTypes.WebAnimationPlayState.PAUSED);
    this.players_.forEach(function (player) {
      player.pause();
      if (player instanceof _scrollboundPlayer.ScrollboundPlayer) {
        player.tick(time);
      } else {
        player.currentTime = time;
      }
    });
  };

  /**
   */

  WebAnimationRunner.prototype.finish = function finish() {
    if (!this.players_) {
      return;
    }
    var players = this.players_;
    this.players_ = null;
    this.setPlayState_(_webAnimationTypes.WebAnimationPlayState.FINISHED);
    players.forEach(function (player) {
      player.finish();
    });
  };

  /**
   */

  WebAnimationRunner.prototype.cancel = function cancel() {
    if (!this.players_) {
      return;
    }
    this.setPlayState_(_webAnimationTypes.WebAnimationPlayState.IDLE);
    this.players_.forEach(function (player) {
      player.cancel();
    });
  };

  /**
   */

  WebAnimationRunner.prototype.scrollTick = function scrollTick(pos) {
    this.players_.forEach(function (player) {
      if (player instanceof _scrollboundPlayer.ScrollboundPlayer) {
        player.tick(pos);
      }
    });
  };

  /**
   */

  WebAnimationRunner.prototype.updateScrollDuration = function updateScrollDuration(newDuration) {
    this.requests_.forEach(function (request) {
      if (request.timing.ticker == Tickers.SCROLL) {
        request.timing.duration = newDuration;
      }
    });

    this.players_.forEach(function (player) {
      if (player instanceof _scrollboundPlayer.ScrollboundPlayer) {
        player.onScrollDurationChanged();
      }
    });
  };

  /**
   */

  WebAnimationRunner.prototype.hasScrollboundAnimations = function hasScrollboundAnimations() {
    for (var i = 0; i < this.requests_.length; i++) {
      if (this.requests_[i].timing.ticker == Tickers.SCROLL) {
        return true;
      }
    }

    return false;
  };

  /**
   * @param {!WebAnimationPlayState} playState
   * @private
   */

  WebAnimationRunner.prototype.setPlayState_ = function setPlayState_(playState) {
    if (this.playState_ != playState) {
      this.playState_ = playState;
      this.playStateChangedObservable_.fire(this.playState_);
    }
  };

  return WebAnimationRunner;
})();

exports.WebAnimationRunner = WebAnimationRunner;

var Scanner = (function () {
  function Scanner() {
    babelHelpers.classCallCheck(this, Scanner);
  }

  /**
   * Builds animation runners based on the provided spec.
   */

  /**
   * @param {!WebAnimationDef|!Array<!WebAnimationDef>} spec
   */

  Scanner.prototype.scan = function scan(spec) {
    var _this2 = this;

    if (_srcTypes.isArray(spec)) {
      spec.forEach(function (spec) {
        return _this2.scan(spec);
      });
      return;
    }

    // Check whether the animation is enabled.
    if (!this.isEnabled( /** @type {!WebAnimationDef} */spec)) {
      return;
    }

    // WebAnimationDef: (!WebMultiAnimationDef|!WebCompAnimationDef|!WebKeyframeAnimationDef)
    if (spec.animations) {
      this.onMultiAnimation( /** @type {!WebMultiAnimationDef} */spec);
    } else if (spec.animation) {
      this.onCompAnimation( /** @type {!WebCompAnimationDef} */spec);
    } else if (spec.keyframes) {
      this.onKeyframeAnimation( /** @type {!WebKeyframeAnimationDef} */spec);
    } else {
      this.onUnknownAnimation(spec);
    }
  };

  /**
   * Whether the animation spec is enabled.
   * @param {!WebAnimationDef} unusedSpec
   * @return {boolean}
   */

  Scanner.prototype.isEnabled = function isEnabled(unusedSpec) {
    return true;
  };

  /**
   * @param {!WebMultiAnimationDef} unusedSpec
   * @abstract
   */

  Scanner.prototype.onMultiAnimation = function onMultiAnimation(unusedSpec) {};

  /**
   * @param {!WebCompAnimationDef} unusedSpec
   * @abstract
   */

  Scanner.prototype.onCompAnimation = function onCompAnimation(unusedSpec) {};

  /**
   * @param {!WebKeyframeAnimationDef} unusedSpec
   * @abstract
   */

  Scanner.prototype.onKeyframeAnimation = function onKeyframeAnimation(unusedSpec) {};

  /** @param {!Object} unusedSpec */

  Scanner.prototype.onUnknownAnimation = function onUnknownAnimation(unusedSpec) {
    throw _srcLog.dev().createError('unknown animation type:' + ' must have "animations" or "keyframes" field');
  };

  return Scanner;
})();

var Builder = (function () {
  /**
   * @param {!Window} win
   * @param {!Document|!ShadowRoot} rootNode
   * @param {string} baseUrl
   * @param {!../../../src/service/vsync-impl.Vsync} vsync
   * @param {!../../../src/service/resources-impl.Resources} resources
   */

  function Builder(win, rootNode, baseUrl, vsync, resources) {
    babelHelpers.classCallCheck(this, Builder);

    /** @const @private */
    this.css_ = new CssContextImpl(win, rootNode, baseUrl);

    /** @const @private */
    this.vsync_ = vsync;

    /** @const @private */
    this.resources_ = resources;

    /** @const @private {!Array<!Element>} */
    this.targets_ = [];

    /** @const @private {!Array<!Promise>} */
    this.loaders_ = [];
  }

  /**
   * The scanner that evaluates all expressions and builds the final
   * `WebAnimationRunner` instance for the target animation. It must be
   * executed in the "measure" vsync phase.
   */

  /**
   * Creates the animation runner for the provided spec. Waits for all
   * necessary resources to be loaded before the runner is resolved.
   * @param {!WebAnimationDef|!Array<!WebAnimationDef>} spec
   * @param {?WebAnimationDef=} opt_args
   * @return {!Promise<!WebAnimationRunner>}
   */

  Builder.prototype.createRunner = function createRunner(spec, opt_args) {
    var _this3 = this;

    return this.resolveRequests([], spec, opt_args).then(function (requests) {
      if (_srcMode.getMode().localDev || _srcMode.getMode().development) {
        _srcLog.user().fine(TAG, 'Animation: ', requests);
      }
      return Promise.all(_this3.loaders_).then(function () {
        return new WebAnimationRunner(requests);
      });
    });
  };

  /**
   * @param {!Array<string>} path
   * @param {!WebAnimationDef|!Array<!WebAnimationDef>} spec
   * @param {?WebAnimationDef|undefined} args
   * @param {?Element} target
   * @param {?Object<string, *>} vars
   * @param {?WebAnimationTimingDef} timing
   * @return {!Promise<!Array<!InternalWebAnimationRequestDef>>}
   * @protected
   */

  Builder.prototype.resolveRequests = function resolveRequests(path, spec, args) {
    var target = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];
    var vars = arguments.length <= 4 || arguments[4] === undefined ? null : arguments[4];
    var timing = arguments.length <= 5 || arguments[5] === undefined ? null : arguments[5];

    var scanner = this.createScanner_(path, target, vars, timing);
    return this.vsync_.measurePromise(function () {
      return scanner.resolveRequests(spec, args);
    });
  };

  /**
   * @param {!Element} target
   * @protected
   */

  Builder.prototype.requireLayout = function requireLayout(target) {
    if (!this.targets_.includes(target)) {
      this.targets_.push(target);
      this.loaders_.push(this.resources_.requireLayout(target));
    }
  };

  /**
   * @param {!Array<string>} path
   * @param {?Element} target
   * @param {?Object<string, *>} vars
   * @param {?WebAnimationTimingDef} timing
   * @private
   */

  Builder.prototype.createScanner_ = function createScanner_(path, target, vars, timing) {
    return new MeasureScanner(this, this.css_, path, target, vars, timing);
  };

  return Builder;
})();

exports.Builder = Builder;

var MeasureScanner = (function (_Scanner) {
  babelHelpers.inherits(MeasureScanner, _Scanner);

  /**
   * @param {!Builder} builder
   * @param {!CssContextImpl} css
   * @param {!Array<string>} path
   * @param {?Element} target
   * @param {?Object<string, *>} vars
   * @param {?WebAnimationTimingDef} timing
   */

  function MeasureScanner(builder, css, path, target, vars, timing) {
    babelHelpers.classCallCheck(this, MeasureScanner);

    _Scanner.call(this);

    /** @const @private */
    this.builder_ = builder;

    /** @const @private */
    this.css_ = css;

    /** @const @private */
    this.path_ = path;

    /** @private {?Element} */
    this.target_ = target;

    /** @private {!Object<string, *>} */
    this.vars_ = vars || _srcUtilsObject.map();

    /** @private {!WebAnimationTimingDef} */
    this.timing_ = timing || {
      ticker: Tickers.TIME,
      duration: 0,
      delay: 0,
      endDelay: 0,
      iterations: 1,
      iterationStart: 0,
      easing: 'linear',
      direction: _webAnimationTypes.WebAnimationTimingDirection.NORMAL,
      fill: _webAnimationTypes.WebAnimationTimingFill.NONE
    };

    /** @private {!Array<!InternalWebAnimationRequestDef>} */
    this.requests_ = [];

    /**
     * Dependencies required to resolve all animation requests. In case of
     * composition, all requests can only be resolved asynchronously. This
     * dependencies are used to block `resolveRequests` to collect all
     * dependenices.
     * @const @private {!Array<!Promise>}
     */
    this.deps_ = [];
  }

  /**
   * @implements {./css-expr-ast.CssContext}
   */

  /**
   * This methods scans all animation declarations specified in `spec`
   * recursively to produce the animation requests. `opt_args` is an additional
   * spec that can be used to default timing and variables.
   * @param {!WebAnimationDef|!Array<!WebAnimationDef>} spec
   * @param {?WebAnimationDef=} opt_args
   * @return {!Promise<!Array<!InternalWebAnimationRequestDef>>}
   */

  MeasureScanner.prototype.resolveRequests = function resolveRequests(spec, opt_args) {
    var _this4 = this;

    if (opt_args) {
      this.with_(opt_args, function () {
        _this4.scan(spec);
      });
    } else {
      this.css_.withVars(this.vars_, function () {
        _this4.scan(spec);
      });
    }
    return Promise.all(this.deps_).then(function () {
      return _this4.requests_;
    });
  };

  /** @override */

  MeasureScanner.prototype.isEnabled = function isEnabled(spec) {
    if (spec.media) {
      return this.css_.matchMedia(spec.media);
    }
    return true;
  };

  /** @override */

  MeasureScanner.prototype.onMultiAnimation = function onMultiAnimation(spec) {
    var _this5 = this;

    this.with_(spec, function () {
      return _this5.scan(spec.animations);
    });
  };

  /** @override */

  MeasureScanner.prototype.onCompAnimation = function onCompAnimation(spec) {
    var _this6 = this;

    _srcLog.user().assert(this.path_.indexOf(spec.animation) == -1, 'Recursive animations are not allowed: "' + spec.animation + '"');
    var newPath = this.path_.concat(spec.animation);
    var animationElement = _srcLog.user().assertElement(this.css_.getElementById(spec.animation), 'Animation not found: "' + spec.animation + '"');
    // Currently, only `<amp-animation>` supplies animations. In the future
    // this could become an interface.
    _srcLog.user().assert(animationElement.tagName == 'AMP-ANIMATION', 'Element is not an animation: "' + spec.animation + '"');
    var otherSpecPromise = animationElement.getImpl().then(function (impl) {
      return impl.getAnimationSpec();
    });
    this.with_(spec, function () {
      var target = _this6.target_;
      var vars = _this6.vars_;
      var timing = _this6.timing_;
      var promise = otherSpecPromise.then(function (otherSpec) {
        if (!otherSpec) {
          return;
        }
        return _this6.builder_.resolveRequests(newPath, otherSpec, /* args */null, target, vars, timing);
      }).then(function (requests) {
        requests.forEach(function (request) {
          return _this6.requests_.push(request);
        });
      });
      _this6.deps_.push(promise);
    });
  };

  /** @override */

  MeasureScanner.prototype.onKeyframeAnimation = function onKeyframeAnimation(spec) {
    var _this7 = this;

    this.with_(spec, function () {
      var target = _srcLog.user().assertElement(_this7.target_, 'No target specified');
      var keyframes = _this7.createKeyframes_(target, spec);
      _this7.requests_.push({
        target: target,
        keyframes: keyframes,
        vars: _this7.vars_,
        timing: _this7.timing_
      });
    });
  };

  /**
   * @param {!Element} target
   * @param {!WebKeyframeAnimationDef} spec
   * @return {!WebKeyframesDef}
   * @private
   */

  MeasureScanner.prototype.createKeyframes_ = function createKeyframes_(target, spec) {
    var _this8 = this;

    var specKeyframes = spec.keyframes;
    if (typeof specKeyframes == 'string') {
      // Keyframes name to be extracted from `<style>`.
      var keyframes = _keyframesExtractor.extractKeyframes(this.css_.rootNode_, specKeyframes);
      _srcLog.user().assert(keyframes, 'Keyframes not found in stylesheet: "' + specKeyframes + '"');
      specKeyframes = keyframes;
    }

    if (_srcTypes.isObject(specKeyframes)) {
      // Property -> keyframes form.
      // The object is cloned, while properties are verified to be
      // whitelisted. Additionally, the `offset:0` frames are inserted
      // to polyfill partial keyframes per spec.
      // See https://github.com/w3c/web-animations/issues/187
      var object = /** {!Object<string, *>} */specKeyframes;
      /** @type {!WebKeyframesDef} */
      var keyframes = {};
      for (var prop in object) {
        this.validateProperty_(prop);
        var value = object[prop];
        var preparedValue = undefined;
        if (SERVICE_PROPS[prop]) {
          preparedValue = value;
        } else if (!_srcTypes.isArray(value) || value.length == 1) {
          // Missing "from" value. Measure and add.
          var fromValue = this.css_.measure(target, prop);
          var toValue = _srcTypes.isArray(value) ? value[0] : value;
          preparedValue = [fromValue, this.css_.resolveCss(toValue)];
        } else {
          preparedValue = value.map(function (v) {
            return _this8.css_.resolveCss(v);
          });
        }
        keyframes[prop] = preparedValue;
      }
      return keyframes;
    }

    if (_srcTypes.isArray(specKeyframes) && specKeyframes.length > 0) {
      // Keyframes -> property form.
      // The array is cloned, while properties are verified to be whitelisted.
      // Additionally, if the `offset:0` properties are inserted when absent
      // to polyfill partial keyframes per spec.
      // See https://github.com/w3c/web-animations/issues/187 and
      // https://github.com/web-animations/web-animations-js/issues/14
      var array = /** {!Array<!Object<string, *>>} */specKeyframes;
      /** @type {!WebKeyframesDef} */
      var keyframes = [];
      var addStartFrame = array.length == 1 || array[0].offset > 0;
      var startFrame = addStartFrame ? _srcUtilsObject.map() : this.css_.resolveCssMap(array[0]);
      keyframes.push(startFrame);
      var start = addStartFrame ? 0 : 1;
      for (var i = start; i < array.length; i++) {
        var frame = array[i];
        for (var prop in frame) {
          if (SERVICE_PROPS[prop]) {
            continue;
          }
          this.validateProperty_(prop);
          if (!startFrame[prop]) {
            // Missing "from" value. Measure and add to start frame.
            startFrame[prop] = this.css_.measure(target, prop);
          }
        }
        keyframes.push(this.css_.resolveCssMap(frame));
      }
      return keyframes;
    }

    // TODO(dvoytenko): support CSS keyframes per https://github.com/w3c/web-animations/issues/189
    // Unknown form of keyframes spec.
    throw _srcLog.user().createError('keyframes not found', specKeyframes);
  };

  /** @override */

  MeasureScanner.prototype.onUnknownAnimation = function onUnknownAnimation() {
    throw _srcLog.user().createError('unknown animation type:' + ' must have "animation", "animations" or "keyframes" field');
  };

  /**
   * @param {string} prop
   * @private
   */

  MeasureScanner.prototype.validateProperty_ = function validateProperty_(prop) {
    if (SERVICE_PROPS[prop]) {
      return;
    }
    _srcLog.user().assert(_webAnimationTypes.isWhitelistedProp(prop), 'Property is not whitelisted for animation: %s', prop);
  };

  /**
   * Resolves common parameters of an animation: target, timing and vars.
   * @param {!WebAnimationDef} spec
   * @param {function()} callback
   * @private
   */

  MeasureScanner.prototype.with_ = function with_(spec, callback) {
    var _this9 = this;

    // Save context.
    var prevTarget = this.target_;
    var prevVars = this.vars_;
    var prevTiming = this.timing_;

    // Push new context and perform calculations.
    var targets = spec.target || spec.selector ? this.resolveTargets_(spec) : [null];
    targets.forEach(function (target, index) {
      _this9.target_ = target || prevTarget;
      _this9.css_.withTarget(_this9.target_, function () {
        var subtargetSpec = _this9.target_ ? _this9.matchSubtargets_(_this9.target_, index, spec) : spec;
        _this9.vars_ = _this9.mergeVars_(subtargetSpec, prevVars);
        _this9.css_.withVars(_this9.vars_, function () {
          _this9.timing_ = _this9.mergeTiming_(subtargetSpec, prevTiming);
          callback();
        });
      });
    });

    // Restore context.
    this.target_ = prevTarget;
    this.vars_ = prevVars;
    this.timing_ = prevTiming;
  };

  /**
   * @param {!WebAnimationDef} spec
   * @return {!Array<!Element>}
   * @private
   */

  MeasureScanner.prototype.resolveTargets_ = function resolveTargets_(spec) {
    var _this10 = this;

    var targets = undefined;
    if (spec.selector) {
      _srcLog.user().assert(!spec.target, 'Both "selector" and "target" are not allowed');
      targets = this.css_.queryElements(spec.selector);
      if (targets.length == 0) {
        _srcLog.user().warn(TAG, 'Target not found: "' + spec.selector + '"');
      }
    } else if (spec.target) {
      if (typeof spec.target == 'string') {
        // TODO(dvoytenko, #9129): cleanup deprecated string targets.
        _srcLog.user().error(TAG, 'string targets are deprecated');
      }
      var target = _srcLog.user().assertElement(typeof spec.target == 'string' ? this.css_.getElementById(spec.target) : spec.target, 'Target not found: "' + spec.target + '"');
      targets = [target];
    } else if (this.target_) {
      targets = [this.target_];
    }
    targets.forEach(function (target) {
      return _this10.builder_.requireLayout(target);
    });
    return targets;
  };

  /**
   * @param {!Element} target
   * @param {number} index
   * @param {!WebAnimationSelectorDef} spec
   * @return {!WebAnimationSelectorDef}
   */

  MeasureScanner.prototype.matchSubtargets_ = function matchSubtargets_(target, index, spec) {
    var _this11 = this;

    if (!spec.subtargets || spec.subtargets.length == 0) {
      return spec;
    }
    var result = _srcUtilsObject.map(spec);
    spec.subtargets.forEach(function (subtargetSpec) {
      var matcher = _this11.getMatcher_(subtargetSpec);
      if (matcher(target, index)) {
        Object.assign(result, subtargetSpec);
      }
    });
    return result;
  };

  /**
   * @param {!WebAnimationSubtargetDef} spec
   * @return {function(!Element, number):boolean}
   */

  MeasureScanner.prototype.getMatcher_ = function getMatcher_(spec) {
    if (spec.matcher) {
      return spec.matcher;
    }
    _srcLog.user().assert((spec.index !== undefined || spec.selector !== undefined) && (spec.index === undefined || spec.selector === undefined), 'Only one "index" or "selector" must be specified');

    var matcher = undefined;
    if (spec.index !== undefined) {
      (function () {
        // Match by index, e.g. `index: 0`.
        var specIndex = Number(spec.index);
        matcher = function (target, index) {
          return index === specIndex;
        };
      })();
    } else {
      (function () {
        // Match by selector, e.g. `:nth-child(2n+1)`.
        var specSelector = /** @type {string} */spec.selector;
        matcher = function (target) {
          try {
            return _srcDom.matches(target, specSelector);
          } catch (e) {
            throw _srcLog.user().createError('Bad subtarget selector: "' + specSelector + '"', e);
          }
        };
      })();
    }
    return spec.matcher = matcher;
  };

  /**
   * Merges vars by defaulting values from the previous vars.
   * @param {!Object<string, *>} newVars
   * @param {!Object<string, *>} prevVars
   * @return {!Object<string, *>}
   * @private
   */

  MeasureScanner.prototype.mergeVars_ = function mergeVars_(newVars, prevVars) {
    var _this12 = this;

    // First combine all vars (previous and new) in one map. The new vars take
    // precedence. This is done so that the new vars can be resolved from both
    // the previous and new vars.
    var result = _srcUtilsObject.map(prevVars);
    for (var k in newVars) {
      if (_srcString.startsWith(k, '--')) {
        result[k] = newVars[k];
      }
    }
    this.css_.withVars(result, function () {
      for (var k in newVars) {
        if (_srcString.startsWith(k, '--')) {
          result[k] = _this12.css_.resolveCss(newVars[k]);
        }
      }
    });
    return result;
  };

  /**
   * Merges timing by defaulting values from the previous timing.
   * @param {!WebAnimationTimingDef} newTiming
   * @param {!WebAnimationTimingDef} prevTiming
   * @return {!WebAnimationTimingDef}
   * @private
   */

  MeasureScanner.prototype.mergeTiming_ = function mergeTiming_(newTiming, prevTiming) {
    // CSS time values in milliseconds.
    var duration = this.css_.resolveMillis(newTiming.duration, prevTiming.duration);
    var delay = this.css_.resolveMillis(newTiming.delay, prevTiming.delay);
    var endDelay = this.css_.resolveMillis(newTiming.endDelay, prevTiming.endDelay);

    // Numeric.
    var iterations = this.css_.resolveNumber(newTiming.iterations, _srcLog.dev().assertNumber(prevTiming.iterations));
    var iterationStart = this.css_.resolveNumber(newTiming.iterationStart, prevTiming.iterationStart);

    // Identifier CSS values.
    var easing = newTiming.easing != null ? this.css_.resolveCss(newTiming.easing) : prevTiming.easing;
    var direction = newTiming.direction != null ?
    /** @type {!WebAnimationTimingDirection} */
    this.css_.resolveCss(newTiming.direction) : prevTiming.direction;
    var fill = newTiming.fill != null ?
    /** @type {!WebAnimationTimingFill} */
    this.css_.resolveCss(newTiming.fill) : prevTiming.fill;

    // Other.
    var ticker = newTiming.ticker != null ? newTiming.ticker : prevTiming.ticker;

    // Validate.
    this.validateTime_(duration, newTiming.duration, 'duration');
    this.validateTime_(delay, newTiming.delay, 'delay', /* negative */true);
    this.validateTime_(endDelay, newTiming.endDelay, 'endDelay');
    _srcLog.user().assert(iterations != null && iterations >= 0, '"iterations" is invalid: %s', newTiming.iterations);
    _srcLog.user().assert(iterationStart != null && iterationStart >= 0 && isFinite(iterationStart), '"iterationStart" is invalid: %s', newTiming.iterationStart);
    _srcLog.user().assertEnumValue(_webAnimationTypes.WebAnimationTimingDirection,
    /** @type {string} */direction, 'direction');
    _srcLog.user().assertEnumValue(_webAnimationTypes.WebAnimationTimingFill,
    /** @type {string} */fill, 'fill');
    return {
      duration: duration,
      delay: delay,
      endDelay: endDelay,
      iterations: iterations,
      iterationStart: iterationStart,
      easing: easing,
      direction: direction,
      fill: fill,
      ticker: ticker
    };
  };

  /**
   * @param {number|undefined} value
   * @param {*} newValue
   * @param {string} field
   * @param {boolean=} opt_allowNegative
   * @private
   */

  MeasureScanner.prototype.validateTime_ = function validateTime_(value, newValue, field, opt_allowNegative) {
    // Ensure that positive or zero values are only allowed.
    _srcLog.user().assert(value != null && (value >= 0 || value < 0 && opt_allowNegative), '"%s" is invalid: %s', field, newValue);
    // Make sure that the values are in milliseconds: show a warning if
    // time is fractional.
    if (newValue != null && Math.floor(value) != value && value < 1) {
      _srcLog.user().warn(TAG, '"' + field + '" is fractional.' + ' Note that all times are in milliseconds.');
    }
  };

  return MeasureScanner;
})(Scanner);

exports.MeasureScanner = MeasureScanner;

var CssContextImpl = (function () {
  /**
   * @param {!Window} win
   * @param {!Document|!ShadowRoot} rootNode
   * @param {string} baseUrl
   */

  function CssContextImpl(win, rootNode, baseUrl) {
    babelHelpers.classCallCheck(this, CssContextImpl);

    /** @const @private */
    this.win_ = win;

    /** @const @private */
    this.rootNode_ = rootNode;

    /** @const @private */
    this.baseUrl_ = baseUrl;

    /** @private {!Object<string, !CSSStyleDeclaration>} */
    this.computedStyleCache_ = _srcUtilsObject.map();

    /** @private {!Object<string, ?./css-expr-ast.CssNode>} */
    this.parsedCssCache_ = _srcUtilsObject.map();

    /** @private {?Element} */
    this.currentTarget_ = null;

    /** @private {?Object<string, *>} */
    this.vars_ = null;

    /** @private {!Array<string>} */
    this.varPath_ = [];

    /** @private {?string} */
    this.dim_ = null;

    /** @private {?{width: number, height: number}} */
    this.viewportSize_ = null;
  }

  /**
   * @param {string} mediaQuery
   * @return {boolean}
   */

  CssContextImpl.prototype.matchMedia = function matchMedia(mediaQuery) {
    return this.win_.matchMedia(mediaQuery).matches;
  };

  /**
   * @param {string} id
   * @return {?Element}
   */

  CssContextImpl.prototype.getElementById = function getElementById(id) {
    return this.rootNode_.getElementById(id);
  };

  /**
   * @param {string} selector
   * @return {!Array<!Element>}
   */

  CssContextImpl.prototype.queryElements = function queryElements(selector) {
    try {
      return _srcTypes.toArray(this.rootNode_. /*OK*/querySelectorAll(selector));
    } catch (e) {
      throw _srcLog.user().createError('Bad query selector: "' + selector + '"', e);
    }
  };

  /**
   * @param {!Element} target
   * @param {string} prop
   * @return {string}
   */

  CssContextImpl.prototype.measure = function measure(target, prop) {
    // Get ID.
    var targetId = target[TARGET_ANIM_ID];
    if (!targetId) {
      targetId = String(++animIdCounter);
      target[TARGET_ANIM_ID] = targetId;
    }

    // Get and cache styles.
    var styles = this.computedStyleCache_[targetId];
    if (!styles) {
      styles = _srcStyle.computedStyle(this.win_, target);
      this.computedStyleCache_[targetId] =
      /** @type {!CSSStyleDeclaration} */styles;
    }

    // Resolve a var or a property.
    return _srcString.startsWith(prop, '--') ? styles.getPropertyValue(prop) : styles[_srcStyle.getVendorJsPropertyName(styles, _srcString.dashToCamelCase(prop))];
  };

  /**
   * @param {?Element} target
   * @param {function(?Element):T} callback
   * @return {T}
   * @template T
   * @protected
   */

  CssContextImpl.prototype.withTarget = function withTarget(target, callback) {
    var prev = this.currentTarget_;
    this.currentTarget_ = target;
    var result = callback(target);
    this.currentTarget_ = prev;
    return result;
  };

  /**
   * @param {?Object<string, *>} vars
   * @param {function():T} callback
   * @return {T}
   * @template T
   * @protected
   */

  CssContextImpl.prototype.withVars = function withVars(vars, callback) {
    var prev = this.vars_;
    this.vars_ = vars;
    var result = callback();
    this.vars_ = prev;
    return result;
  };

  /**
   * @param {*} input
   * @return {string}
   * @protected
   */

  CssContextImpl.prototype.resolveCss = function resolveCss(input) {
    if (input == null || input === '') {
      return '';
    }
    var inputCss = String(input);
    if (typeof input == 'number') {
      return inputCss;
    }
    // Test first if CSS contains any variable components. Otherwise, there's
    // no need to spend cycles to parse/evaluate.
    if (!_cssExprAst.isVarCss(inputCss)) {
      return inputCss;
    }
    var result = this.resolveAsNode_(inputCss);
    return result != null ? result.css() : '';
  };

  /**
   * @param {!Object<string, *>} input
   * @return {!Object<string, string|number>}
   */

  CssContextImpl.prototype.resolveCssMap = function resolveCssMap(input) {
    var result = _srcUtilsObject.map();
    for (var k in input) {
      if (k == 'offset') {
        result[k] = input[k];
      } else {
        result[k] = this.resolveCss(input[k]);
      }
    }
    return result;
  };

  /**
   * @param {*} input
   * @param {number|undefined} def
   * @return {number|undefined}
   */

  CssContextImpl.prototype.resolveMillis = function resolveMillis(input, def) {
    if (input != null && input !== '') {
      if (typeof input == 'number') {
        return input;
      }
      var node = this.resolveAsNode_(input);
      if (node) {
        return _cssExprAst.CssTimeNode.millis(node);
      }
    }
    return def;
  };

  /**
   * @param {*} input
   * @param {number|undefined} def
   * @return {number|undefined}
   */

  CssContextImpl.prototype.resolveNumber = function resolveNumber(input, def) {
    if (input != null && input !== '') {
      if (typeof input == 'number') {
        return input;
      }
      var node = this.resolveAsNode_(input);
      if (node) {
        return _cssExprAst.CssNumberNode.num(node);
      }
    }
    return def;
  };

  /**
   * @param {*} input
   * @return {?./css-expr-ast.CssNode}
   * @private
   */

  CssContextImpl.prototype.resolveAsNode_ = function resolveAsNode_(input) {
    if (input == null || input === '') {
      return null;
    }
    if (typeof input == 'number') {
      return new _cssExprAst.CssNumberNode(input);
    }
    // Check if the expression has already been parsed. Notice that the parsed
    // value could be `null`.
    var css = String(input);
    var node = this.parsedCssCache_[css];
    if (node === undefined) {
      node = _cssExpr.parseCss(css);
      this.parsedCssCache_[css] = node;
    }
    if (!node) {
      return null;
    }
    return node.resolve(this);
  };

  /**
   * @return {!Element}
   * @private
   */

  CssContextImpl.prototype.requireTarget_ = function requireTarget_() {
    return _srcLog.user().assertElement(this.currentTarget_, 'Only allowed when target is specified');
  };

  /** @override */

  CssContextImpl.prototype.getVar = function getVar(varName) {
    _srcLog.user().assert(this.varPath_.indexOf(varName) == -1, 'Recursive variable: "' + varName + '"');
    this.varPath_.push(varName);
    var rawValue = this.vars_ && this.vars_[varName] != undefined ? this.vars_[varName] : this.currentTarget_ ? this.measure(this.currentTarget_, varName) : null;
    if (rawValue == null || rawValue === '') {
      _srcLog.user().warn(TAG, 'Variable not found: "' + varName + '"');
    }
    var result = this.resolveAsNode_(rawValue);
    this.varPath_.pop();
    return result;
  };

  /** @override */

  CssContextImpl.prototype.withDimension = function withDimension(dim, callback) {
    var savedDim = this.dim_;
    this.dim_ = dim;
    var result = callback();
    this.dim_ = savedDim;
    return result;
  };

  /** @override */

  CssContextImpl.prototype.getDimension = function getDimension() {
    return this.dim_;
  };

  /** @override */

  CssContextImpl.prototype.getViewportSize = function getViewportSize() {
    if (!this.viewportSize_) {
      this.viewportSize_ = {
        width: this.win_. /*OK*/innerWidth,
        height: this.win_. /*OK*/innerHeight
      };
    }
    return this.viewportSize_;
  };

  /** @override */

  CssContextImpl.prototype.getCurrentFontSize = function getCurrentFontSize() {
    return this.getElementFontSize_(this.requireTarget_());
  };

  /** @override */

  CssContextImpl.prototype.getRootFontSize = function getRootFontSize() {
    return this.getElementFontSize_(this.win_.document.documentElement);
  };

  /**
   * @param {!Element} target
   * @return {number}
   * @private
   */

  CssContextImpl.prototype.getElementFontSize_ = function getElementFontSize_(target) {
    return parseFloat(this.measure(target, 'font-size'));
  };

  /** @override */

  CssContextImpl.prototype.getCurrentElementSize = function getCurrentElementSize() {
    return this.getElementSize_(this.requireTarget_());
  };

  /** @override */

  CssContextImpl.prototype.getElementSize = function getElementSize(selector, selectionMethod) {
    return this.getElementSize_(this.getElement_(selector, selectionMethod));
  };

  /**
   * @param {string} selector
   * @param {?string} selectionMethod
   * @return {!Element}
   * @private
   */

  CssContextImpl.prototype.getElement_ = function getElement_(selector, selectionMethod) {
    _srcLog.dev().assert(selectionMethod == null || selectionMethod == 'closest', 'Unknown selection method: %s', selectionMethod);
    var element = undefined;
    try {
      if (selectionMethod == 'closest') {
        element = _srcDom.closestBySelector(this.requireTarget_(), selector);
      } else {
        element = this.rootNode_. /*OK*/querySelector(selector);
      }
    } catch (e) {
      throw _srcLog.user().createError('Bad query selector: "' + selector + '"', e);
    }
    return _srcLog.user().assertElement(element, 'Element not found: ' + selector);
  };

  /**
   * @param {!Element} target
   * @return {!{width: number, height: number}}
   * @private
   */

  CssContextImpl.prototype.getElementSize_ = function getElementSize_(target) {
    return { width: target. /*OK*/offsetWidth, height: target. /*OK*/offsetHeight };
  };

  /** @override */

  CssContextImpl.prototype.resolveUrl = function resolveUrl(url) {
    var resolvedUrl = _srcUrl.resolveRelativeUrl(url, this.baseUrl_);
    return _srcUrl.assertHttpsUrl(resolvedUrl, this.currentTarget_ || '');
  };

  return CssContextImpl;
})();

},{"../../../src/dom":18,"../../../src/log":27,"../../../src/mode":29,"../../../src/observable":30,"../../../src/string":42,"../../../src/style":43,"../../../src/types":44,"../../../src/url":46,"../../../src/utils/object":48,"./css-expr":4,"./css-expr-ast":2,"./keyframes-extractor":5,"./scrollbound-player":6,"./web-animation-types":8}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
exports.installWebAnimations = function(window) {
var document = window.document;
// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//     See the License for the specific language governing permissions and
// limitations under the License.

!function(a,b){var c={},d={},e={},f=null;!function(a,b){function c(a){if("number"==typeof a)return a;var b={};for(var c in a)b[c]=a[c];return b}function d(){this._delay=0,this._endDelay=0,this._fill="none",this._iterationStart=0,this._iterations=1,this._duration=0,this._playbackRate=1,this._direction="normal",this._easing="linear",this._easingFunction=x}function e(){return a.isDeprecated("Invalid timing inputs","2016-03-02","TypeError exceptions will be thrown instead.",!0)}function f(b,c,e){var f=new d;return c&&(f.fill="both",f.duration="auto"),"number"!=typeof b||isNaN(b)?void 0!==b&&Object.getOwnPropertyNames(b).forEach(function(c){if("auto"!=b[c]){if(("number"==typeof f[c]||"duration"==c)&&("number"!=typeof b[c]||isNaN(b[c])))return;if("fill"==c&&v.indexOf(b[c])==-1)return;if("direction"==c&&w.indexOf(b[c])==-1)return;if("playbackRate"==c&&1!==b[c]&&a.isDeprecated("AnimationEffectTiming.playbackRate","2014-11-28","Use Animation.playbackRate instead."))return;f[c]=b[c]}}):f.duration=b,f}function g(a){return"number"==typeof a&&(a=isNaN(a)?{duration:0}:{duration:a}),a}function h(b,c){return b=a.numericTimingToObject(b),f(b,c)}function i(a,b,c,d){return a<0||a>1||c<0||c>1?x:function(e){function f(a,b,c){return 3*a*(1-c)*(1-c)*c+3*b*(1-c)*c*c+c*c*c}if(e<=0){var g=0;return a>0?g=b/a:!b&&c>0&&(g=d/c),g*e}if(e>=1){var h=0;return c<1?h=(d-1)/(c-1):1==c&&a<1&&(h=(b-1)/(a-1)),1+h*(e-1)}for(var i=0,j=1;i<j;){var k=(i+j)/2,l=f(a,c,k);if(Math.abs(e-l)<1e-5)return f(b,d,k);l<e?i=k:j=k}return f(b,d,k)}}function j(a,b){return function(c){if(c>=1)return 1;var d=1/a;return c+=b*d,c-c%d}}function k(a){C||(C=document.createElement("div").style),C.animationTimingFunction="",C.animationTimingFunction=a;var b=C.animationTimingFunction;if(""==b&&e())throw new TypeError(a+" is not a valid value for easing");return b}function l(a){if("linear"==a)return x;var b=E.exec(a);if(b)return i.apply(this,b.slice(1).map(Number));var c=F.exec(a);if(c)return j(Number(c[1]),{start:y,middle:z,end:A}[c[2]]);var d=B[a];return d?d:x}function m(a){return Math.abs(n(a)/a.playbackRate)}function n(a){return 0===a.duration||0===a.iterations?0:a.duration*a.iterations}function o(a,b,c){if(null==b)return G;var d=c.delay+a+c.endDelay;return b<Math.min(c.delay,d)?H:b>=Math.min(c.delay+a,d)?I:J}function p(a,b,c,d,e){switch(d){case H:return"backwards"==b||"both"==b?0:null;case J:return c-e;case I:return"forwards"==b||"both"==b?a:null;case G:return null}}function q(a,b,c,d,e){var f=e;return 0===a?b!==H&&(f+=c):f+=d/a,f}function r(a,b,c,d,e,f){var g=a===1/0?b%1:a%1;return 0!==g||c!==I||0===d||0===e&&0!==f||(g=1),g}function s(a,b,c,d){return a===I&&b===1/0?1/0:1===c?Math.floor(d)-1:Math.floor(d)}function t(a,b,c){var d=a;if("normal"!==a&&"reverse"!==a){var e=b;"alternate-reverse"===a&&(e+=1),d="normal",e!==1/0&&e%2!==0&&(d="reverse")}return"normal"===d?c:1-c}function u(a,b,c){var d=o(a,b,c),e=p(a,c.fill,b,d,c.delay);if(null===e)return null;var f=q(c.duration,d,c.iterations,e,c.iterationStart),g=r(f,c.iterationStart,d,c.iterations,e,c.duration),h=s(d,c.iterations,g,f),i=t(c.direction,h,g);return c._easingFunction(i)}var v="backwards|forwards|both|none".split("|"),w="reverse|alternate|alternate-reverse".split("|"),x=function(a){return a};d.prototype={_setMember:function(b,c){this["_"+b]=c,this._effect&&(this._effect._timingInput[b]=c,this._effect._timing=a.normalizeTimingInput(this._effect._timingInput),this._effect.activeDuration=a.calculateActiveDuration(this._effect._timing),this._effect._animation&&this._effect._animation._rebuildUnderlyingAnimation())},get playbackRate(){return this._playbackRate},set delay(a){this._setMember("delay",a)},get delay(){return this._delay},set endDelay(a){this._setMember("endDelay",a)},get endDelay(){return this._endDelay},set fill(a){this._setMember("fill",a)},get fill(){return this._fill},set iterationStart(a){if((isNaN(a)||a<0)&&e())throw new TypeError("iterationStart must be a non-negative number, received: "+timing.iterationStart);this._setMember("iterationStart",a)},get iterationStart(){return this._iterationStart},set duration(a){if("auto"!=a&&(isNaN(a)||a<0)&&e())throw new TypeError("duration must be non-negative or auto, received: "+a);this._setMember("duration",a)},get duration(){return this._duration},set direction(a){this._setMember("direction",a)},get direction(){return this._direction},set easing(a){this._easingFunction=l(k(a)),this._setMember("easing",a)},get easing(){return this._easing},set iterations(a){if((isNaN(a)||a<0)&&e())throw new TypeError("iterations must be non-negative, received: "+a);this._setMember("iterations",a)},get iterations(){return this._iterations}};var y=1,z=.5,A=0,B={ease:i(.25,.1,.25,1),"ease-in":i(.42,0,1,1),"ease-out":i(0,0,.58,1),"ease-in-out":i(.42,0,.58,1),"step-start":j(1,y),"step-middle":j(1,z),"step-end":j(1,A)},C=null,D="\\s*(-?\\d+\\.?\\d*|-?\\.\\d+)\\s*",E=new RegExp("cubic-bezier\\("+D+","+D+","+D+","+D+"\\)"),F=/steps\(\s*(\d+)\s*,\s*(start|middle|end)\s*\)/,G=0,H=1,I=2,J=3;a.cloneTimingInput=c,a.makeTiming=f,a.numericTimingToObject=g,a.normalizeTimingInput=h,a.calculateActiveDuration=m,a.calculateIterationProgress=u,a.calculatePhase=o,a.normalizeEasing=k,a.parseEasingFunction=l}(c,f),function(a,b){function c(a,b){return a in k?k[a][b]||b:b}function d(a){return"display"===a||0===a.lastIndexOf("animation",0)||0===a.lastIndexOf("transition",0)}function e(a,b,e){if(!d(a)){var f=h[a];if(f){i.style[a]=b;for(var g in f){var j=f[g],k=i.style[j];e[j]=c(j,k)}}else e[a]=c(a,b)}}function f(a){var b=[];for(var c in a)if(!(c in["easing","offset","composite"])){var d=a[c];Array.isArray(d)||(d=[d]);for(var e,f=d.length,g=0;g<f;g++)e={},"offset"in a?e.offset=a.offset:1==f?e.offset=1:e.offset=g/(f-1),"easing"in a&&(e.easing=a.easing),"composite"in a&&(e.composite=a.composite),e[c]=d[g],b.push(e)}return b.sort(function(a,b){return a.offset-b.offset}),b}function g(b){function c(){var a=d.length;null==d[a-1].offset&&(d[a-1].offset=1),a>1&&null==d[0].offset&&(d[0].offset=0);for(var b=0,c=d[0].offset,e=1;e<a;e++){var f=d[e].offset;if(null!=f){for(var g=1;g<e-b;g++)d[b+g].offset=c+(f-c)*g/(e-b);b=e,c=f}}}if(null==b)return[];window.Symbol&&Symbol.iterator&&Array.prototype.from&&b[Symbol.iterator]&&(b=Array.from(b)),Array.isArray(b)||(b=f(b));for(var d=b.map(function(b){var c={};for(var d in b){var f=b[d];if("offset"==d){if(null!=f){if(f=Number(f),!isFinite(f))throw new TypeError("Keyframe offsets must be numbers.");if(f<0||f>1)throw new TypeError("Keyframe offsets must be between 0 and 1.")}}else if("composite"==d){if("add"==f||"accumulate"==f)throw{type:DOMException.NOT_SUPPORTED_ERR,name:"NotSupportedError",message:"add compositing is not supported"};if("replace"!=f)throw new TypeError("Invalid composite mode "+f+".")}else f="easing"==d?a.normalizeEasing(f):""+f;e(d,f,c)}return void 0==c.offset&&(c.offset=null),void 0==c.easing&&(c.easing="linear"),c}),g=!0,h=-(1/0),i=0;i<d.length;i++){var j=d[i].offset;if(null!=j){if(j<h)throw new TypeError("Keyframes are not loosely sorted by offset. Sort or specify offsets.");h=j}else g=!1}return d=d.filter(function(a){return a.offset>=0&&a.offset<=1}),g||c(),d}var h={background:["backgroundImage","backgroundPosition","backgroundSize","backgroundRepeat","backgroundAttachment","backgroundOrigin","backgroundClip","backgroundColor"],border:["borderTopColor","borderTopStyle","borderTopWidth","borderRightColor","borderRightStyle","borderRightWidth","borderBottomColor","borderBottomStyle","borderBottomWidth","borderLeftColor","borderLeftStyle","borderLeftWidth"],borderBottom:["borderBottomWidth","borderBottomStyle","borderBottomColor"],borderColor:["borderTopColor","borderRightColor","borderBottomColor","borderLeftColor"],borderLeft:["borderLeftWidth","borderLeftStyle","borderLeftColor"],borderRadius:["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"],borderRight:["borderRightWidth","borderRightStyle","borderRightColor"],borderTop:["borderTopWidth","borderTopStyle","borderTopColor"],borderWidth:["borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth"],flex:["flexGrow","flexShrink","flexBasis"],font:["fontFamily","fontSize","fontStyle","fontVariant","fontWeight","lineHeight"],margin:["marginTop","marginRight","marginBottom","marginLeft"],outline:["outlineColor","outlineStyle","outlineWidth"],padding:["paddingTop","paddingRight","paddingBottom","paddingLeft"]},i=document.createElementNS("http://www.w3.org/1999/xhtml","div"),j={thin:"1px",medium:"3px",thick:"5px"},k={borderBottomWidth:j,borderLeftWidth:j,borderRightWidth:j,borderTopWidth:j,fontSize:{"xx-small":"60%","x-small":"75%",small:"89%",medium:"100%",large:"120%","x-large":"150%","xx-large":"200%"},fontWeight:{normal:"400",bold:"700"},outlineWidth:j,textShadow:{none:"0px 0px 0px transparent"},boxShadow:{none:"0px 0px 0px 0px transparent"}};a.convertToArrayForm=f,a.normalizeKeyframes=g}(c,f),function(a){var b={};a.isDeprecated=function(a,c,d,e){var f=e?"are":"is",g=new Date,h=new Date(c);return h.setMonth(h.getMonth()+3),!(g<h&&(a in b||console.warn("Web Animations: "+a+" "+f+" deprecated and will stop working on "+h.toDateString()+". "+d),b[a]=!0,1))},a.deprecated=function(b,c,d,e){var f=e?"are":"is";if(a.isDeprecated(b,c,d,e))throw new Error(b+" "+f+" no longer supported. "+d)}}(c),function(){if(document.documentElement.animate){var a=document.documentElement.animate([],0),b=!0;if(a&&(b=!1,"play|currentTime|pause|reverse|playbackRate|cancel|finish|startTime|playState".split("|").forEach(function(c){void 0===a[c]&&(b=!0)})),!b)return}!function(a,b,c){function d(a){for(var b={},c=0;c<a.length;c++)for(var d in a[c])if("offset"!=d&&"easing"!=d&&"composite"!=d){var e={offset:a[c].offset,easing:a[c].easing,value:a[c][d]};b[d]=b[d]||[],b[d].push(e)}for(var f in b){var g=b[f];if(0!=g[0].offset||1!=g[g.length-1].offset)throw{type:DOMException.NOT_SUPPORTED_ERR,name:"NotSupportedError",message:"Partial keyframes are not supported"}}return b}function e(c){var d=[];for(var e in c)for(var f=c[e],g=0;g<f.length-1;g++){var h=g,i=g+1,j=f[h].offset,k=f[i].offset,l=j,m=k;0==g&&(l=-(1/0),0==k&&(i=h)),g==f.length-2&&(m=1/0,1==j&&(h=i)),d.push({applyFrom:l,applyTo:m,startOffset:f[h].offset,endOffset:f[i].offset,easingFunction:a.parseEasingFunction(f[h].easing),property:e,interpolation:b.propertyInterpolation(e,f[h].value,f[i].value)})}return d.sort(function(a,b){return a.startOffset-b.startOffset}),d}b.convertEffectInput=function(c){var f=a.normalizeKeyframes(c),g=d(f),h=e(g);return function(a,c){if(null!=c)h.filter(function(a){return c>=a.applyFrom&&c<a.applyTo}).forEach(function(d){var e=c-d.startOffset,f=d.endOffset-d.startOffset,g=0==f?0:d.easingFunction(e/f);b.apply(a,d.property,d.interpolation(g))});else for(var d in g)"offset"!=d&&"easing"!=d&&"composite"!=d&&b.clear(a,d)}}}(c,d,f),function(a,b,c){function d(a){return a.replace(/-(.)/g,function(a,b){return b.toUpperCase()})}function e(a,b,c){h[c]=h[c]||[],h[c].push([a,b])}function f(a,b,c){for(var f=0;f<c.length;f++){var g=c[f];e(a,b,d(g))}}function g(c,e,f){var g=c;/-/.test(c)&&!a.isDeprecated("Hyphenated property names","2016-03-22","Use camelCase instead.",!0)&&(g=d(c)),"initial"!=e&&"initial"!=f||("initial"==e&&(e=i[g]),"initial"==f&&(f=i[g]));for(var j=e==f?[]:h[g],k=0;j&&k<j.length;k++){var l=j[k][0](e),m=j[k][0](f);if(void 0!==l&&void 0!==m){var n=j[k][1](l,m);if(n){var o=b.Interpolation.apply(null,n);return function(a){return 0==a?e:1==a?f:o(a)}}}}return b.Interpolation(!1,!0,function(a){return a?f:e})}var h={};b.addPropertiesHandler=f;var i={backgroundColor:"transparent",backgroundPosition:"0% 0%",borderBottomColor:"currentColor",borderBottomLeftRadius:"0px",borderBottomRightRadius:"0px",borderBottomWidth:"3px",borderLeftColor:"currentColor",borderLeftWidth:"3px",borderRightColor:"currentColor",borderRightWidth:"3px",borderSpacing:"2px",borderTopColor:"currentColor",borderTopLeftRadius:"0px",borderTopRightRadius:"0px",borderTopWidth:"3px",bottom:"auto",clip:"rect(0px, 0px, 0px, 0px)",color:"black",fontSize:"100%",fontWeight:"400",height:"auto",left:"auto",letterSpacing:"normal",lineHeight:"120%",marginBottom:"0px",marginLeft:"0px",marginRight:"0px",marginTop:"0px",maxHeight:"none",maxWidth:"none",minHeight:"0px",minWidth:"0px",opacity:"1.0",outlineColor:"invert",outlineOffset:"0px",outlineWidth:"3px",paddingBottom:"0px",paddingLeft:"0px",paddingRight:"0px",paddingTop:"0px",right:"auto",textIndent:"0px",textShadow:"0px 0px 0px transparent",top:"auto",transform:"",verticalAlign:"0px",visibility:"visible",width:"auto",wordSpacing:"normal",zIndex:"auto"};b.propertyInterpolation=g}(c,d,f),function(a,b,c){function d(b){var c=a.calculateActiveDuration(b),d=function(d){return a.calculateIterationProgress(c,d,b)};return d._totalDuration=b.delay+c+b.endDelay,d}b.KeyframeEffect=function(c,e,f,g){var h,i=d(a.normalizeTimingInput(f)),j=b.convertEffectInput(e),k=function(){j(c,h)};return k._update=function(a){return h=i(a),null!==h},k._clear=function(){j(c,null)},k._hasSameTarget=function(a){return c===a},k._target=c,k._totalDuration=i._totalDuration,k._id=g,k},b.NullEffect=function(a){var b=function(){a&&(a(),a=null)};return b._update=function(){return null},b._totalDuration=0,b._hasSameTarget=function(){return!1},b}}(c,d,f),function(a,b){function c(a,b,c){c.enumerable=!0,c.configurable=!0,Object.defineProperty(a,b,c)}function d(a){this._surrogateStyle=document.createElementNS("http://www.w3.org/1999/xhtml","div").style,this._style=a.style,this._length=0,this._isAnimatedProperty={};for(var b=0;b<this._style.length;b++){var c=this._style[b];this._surrogateStyle[c]=this._style[c]}this._updateIndices()}function e(a){if(!a._webAnimationsPatchedStyle){var b=new d(a);try{c(a,"style",{get:function(){return b}})}catch(b){a.style._set=function(b,c){a.style[b]=c},a.style._clear=function(b){a.style[b]=""}}a._webAnimationsPatchedStyle=a.style}}var f={cssText:1,length:1,parentRule:1},g={getPropertyCSSValue:1,getPropertyPriority:1,getPropertyValue:1,item:1,removeProperty:1,setProperty:1},h={removeProperty:1,setProperty:1};d.prototype={get cssText(){return this._surrogateStyle.cssText},set cssText(a){for(var b={},c=0;c<this._surrogateStyle.length;c++)b[this._surrogateStyle[c]]=!0;this._surrogateStyle.cssText=a,this._updateIndices();for(var c=0;c<this._surrogateStyle.length;c++)b[this._surrogateStyle[c]]=!0;for(var d in b)this._isAnimatedProperty[d]||this._style.setProperty(d,this._surrogateStyle.getPropertyValue(d))},get length(){return this._surrogateStyle.length},get parentRule(){return this._style.parentRule},_updateIndices:function(){for(;this._length<this._surrogateStyle.length;)Object.defineProperty(this,this._length,{configurable:!0,enumerable:!1,get:function(a){return function(){return this._surrogateStyle[a]}}(this._length)}),this._length++;for(;this._length>this._surrogateStyle.length;)this._length--,Object.defineProperty(this,this._length,{configurable:!0,enumerable:!1,value:void 0})},_set:function(a,b){this._style[a]=b,this._isAnimatedProperty[a]=!0},_clear:function(a){this._style[a]=this._surrogateStyle[a],delete this._isAnimatedProperty[a]}};for(var i in g)d.prototype[i]=function(a,b){return function(){var c=this._surrogateStyle[a].apply(this._surrogateStyle,arguments);return b&&(this._isAnimatedProperty[arguments[0]]||this._style[a].apply(this._style,arguments),this._updateIndices()),c}}(i,i in h);for(var j in document.documentElement.style)j in f||j in g||!function(a){c(d.prototype,a,{get:function(){return this._surrogateStyle[a]},set:function(b){this._surrogateStyle[a]=b,this._updateIndices(),this._isAnimatedProperty[a]||(this._style[a]=b)}})}(j);a.apply=function(b,c,d){e(b),b.style._set(a.propertyName(c),d)},a.clear=function(b,c){b._webAnimationsPatchedStyle&&b.style._clear(a.propertyName(c))}}(d,f),function(a){window.Element.prototype.animate=function(b,c){var d="";return c&&c.id&&(d=c.id),a.timeline._play(a.KeyframeEffect(this,b,c,d))}}(d),function(a,b){function c(a,b,d){if("number"==typeof a&&"number"==typeof b)return a*(1-d)+b*d;if("boolean"==typeof a&&"boolean"==typeof b)return d<.5?a:b;if(a.length==b.length){for(var e=[],f=0;f<a.length;f++)e.push(c(a[f],b[f],d));return e}throw"Mismatched interpolation arguments "+a+":"+b}a.Interpolation=function(a,b,d){return function(e){return d(c(a,b,e))}}}(d,f),function(a,b){function c(a,b,c){return Math.max(Math.min(a,c),b)}function d(b,d,e){var f=a.dot(b,d);f=c(f,-1,1);var g=[];if(1===f)g=b;else for(var h=Math.acos(f),i=1*Math.sin(e*h)/Math.sqrt(1-f*f),j=0;j<4;j++)g.push(b[j]*(Math.cos(e*h)-f*i)+d[j]*i);return g}var e=function(){function a(a,b){for(var c=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],d=0;d<4;d++)for(var e=0;e<4;e++)for(var f=0;f<4;f++)c[d][e]+=b[d][f]*a[f][e];return c}function b(a){return 0==a[0][2]&&0==a[0][3]&&0==a[1][2]&&0==a[1][3]&&0==a[2][0]&&0==a[2][1]&&1==a[2][2]&&0==a[2][3]&&0==a[3][2]&&1==a[3][3]}function c(c,d,e,f,g){for(var h=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],i=0;i<4;i++)h[i][3]=g[i];for(var i=0;i<3;i++)for(var j=0;j<3;j++)h[3][i]+=c[j]*h[j][i];var k=f[0],l=f[1],m=f[2],n=f[3],o=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];o[0][0]=1-2*(l*l+m*m),o[0][1]=2*(k*l-m*n),o[0][2]=2*(k*m+l*n),o[1][0]=2*(k*l+m*n),o[1][1]=1-2*(k*k+m*m),o[1][2]=2*(l*m-k*n),o[2][0]=2*(k*m-l*n),o[2][1]=2*(l*m+k*n),o[2][2]=1-2*(k*k+l*l),h=a(h,o);var p=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];e[2]&&(p[2][1]=e[2],h=a(h,p)),e[1]&&(p[2][1]=0,p[2][0]=e[0],h=a(h,p)),e[0]&&(p[2][0]=0,p[1][0]=e[0],h=a(h,p));for(var i=0;i<3;i++)for(var j=0;j<3;j++)h[i][j]*=d[i];return b(h)?[h[0][0],h[0][1],h[1][0],h[1][1],h[3][0],h[3][1]]:h[0].concat(h[1],h[2],h[3])}return c}();a.composeMatrix=e,a.quat=d}(d,f),function(a,b,c){a.sequenceNumber=0;var d=function(a,b,c){this.target=a,this.currentTime=b,this.timelineTime=c,this.type="finish",this.bubbles=!1,this.cancelable=!1,this.currentTarget=a,this.defaultPrevented=!1,this.eventPhase=Event.AT_TARGET,this.timeStamp=Date.now()};b.Animation=function(b){this.id="",b&&b._id&&(this.id=b._id),this._sequenceNumber=a.sequenceNumber++,this._currentTime=0,this._startTime=null,this._paused=!1,this._playbackRate=1,this._inTimeline=!0,this._finishedFlag=!0,this.onfinish=null,this._finishHandlers=[],this._effect=b,this._inEffect=this._effect._update(0),this._idle=!0,this._currentTimePending=!1},b.Animation.prototype={_ensureAlive:function(){this.playbackRate<0&&0===this.currentTime?this._inEffect=this._effect._update(-1):this._inEffect=this._effect._update(this.currentTime),this._inTimeline||!this._inEffect&&this._finishedFlag||(this._inTimeline=!0,b.timeline._animations.push(this))},_tickCurrentTime:function(a,b){a!=this._currentTime&&(this._currentTime=a,this._isFinished&&!b&&(this._currentTime=this._playbackRate>0?this._totalDuration:0),this._ensureAlive())},get currentTime(){return this._idle||this._currentTimePending?null:this._currentTime},set currentTime(a){a=+a,isNaN(a)||(b.restart(),this._paused||null==this._startTime||(this._startTime=this._timeline.currentTime-a/this._playbackRate),this._currentTimePending=!1,this._currentTime!=a&&(this._idle&&(this._idle=!1,this._paused=!0),this._tickCurrentTime(a,!0),b.applyDirtiedAnimation(this)))},get startTime(){return this._startTime},set startTime(a){a=+a,isNaN(a)||this._paused||this._idle||(this._startTime=a,this._tickCurrentTime((this._timeline.currentTime-this._startTime)*this.playbackRate),b.applyDirtiedAnimation(this))},get playbackRate(){return this._playbackRate},set playbackRate(a){if(a!=this._playbackRate){var c=this.currentTime;this._playbackRate=a,this._startTime=null,"paused"!=this.playState&&"idle"!=this.playState&&(this._finishedFlag=!1,this._idle=!1,this._ensureAlive(),b.applyDirtiedAnimation(this)),null!=c&&(this.currentTime=c)}},get _isFinished(){return!this._idle&&(this._playbackRate>0&&this._currentTime>=this._totalDuration||this._playbackRate<0&&this._currentTime<=0)},get _totalDuration(){return this._effect._totalDuration},get playState(){return this._idle?"idle":null==this._startTime&&!this._paused&&0!=this.playbackRate||this._currentTimePending?"pending":this._paused?"paused":this._isFinished?"finished":"running"},_rewind:function(){if(this._playbackRate>=0)this._currentTime=0;else{if(!(this._totalDuration<1/0))throw new DOMException("Unable to rewind negative playback rate animation with infinite duration","InvalidStateError");this._currentTime=this._totalDuration}},play:function(){this._paused=!1,(this._isFinished||this._idle)&&(this._rewind(),this._startTime=null),this._finishedFlag=!1,this._idle=!1,this._ensureAlive(),b.applyDirtiedAnimation(this)},pause:function(){this._isFinished||this._paused||this._idle?this._idle&&(this._rewind(),this._idle=!1):this._currentTimePending=!0,this._startTime=null,this._paused=!0},finish:function(){this._idle||(this.currentTime=this._playbackRate>0?this._totalDuration:0,this._startTime=this._totalDuration-this.currentTime,this._currentTimePending=!1,b.applyDirtiedAnimation(this))},cancel:function(){this._inEffect&&(this._inEffect=!1,this._idle=!0,this._paused=!1,this._isFinished=!0,this._finishedFlag=!0,this._currentTime=0,this._startTime=null,this._effect._update(null),b.applyDirtiedAnimation(this))},reverse:function(){this.playbackRate*=-1,this.play()},addEventListener:function(a,b){"function"==typeof b&&"finish"==a&&this._finishHandlers.push(b)},removeEventListener:function(a,b){if("finish"==a){var c=this._finishHandlers.indexOf(b);c>=0&&this._finishHandlers.splice(c,1)}},_fireEvents:function(a){if(this._isFinished){if(!this._finishedFlag){var b=new d(this,this._currentTime,a),c=this._finishHandlers.concat(this.onfinish?[this.onfinish]:[]);setTimeout(function(){c.forEach(function(a){a.call(b.target,b)})},0),this._finishedFlag=!0}}else this._finishedFlag=!1},_tick:function(a,b){this._idle||this._paused||(null==this._startTime?b&&(this.startTime=a-this._currentTime/this.playbackRate):this._isFinished||this._tickCurrentTime((a-this._startTime)*this.playbackRate)),b&&(this._currentTimePending=!1,this._fireEvents(a))},get _needsTick(){return this.playState in{pending:1,running:1}||!this._finishedFlag},_targetAnimations:function(){var a=this._effect._target;return a._activeAnimations||(a._activeAnimations=[]),a._activeAnimations},_markTarget:function(){var a=this._targetAnimations();a.indexOf(this)===-1&&a.push(this)},_unmarkTarget:function(){var a=this._targetAnimations(),b=a.indexOf(this);b!==-1&&a.splice(b,1)}}}(c,d,f),function(a,b,c){function d(a){var b=j;j=[],a<q.currentTime&&(a=q.currentTime),q._animations.sort(e),q._animations=h(a,!0,q._animations)[0],b.forEach(function(b){b[1](a)}),g(),l=void 0}function e(a,b){return a._sequenceNumber-b._sequenceNumber}function f(){this._animations=[],this.currentTime=window.performance&&performance.now?performance.now():0}function g(){o.forEach(function(a){a()}),o.length=0}function h(a,c,d){p=!0,n=!1;var e=b.timeline;e.currentTime=a,m=!1;var f=[],g=[],h=[],i=[];return d.forEach(function(b){b._tick(a,c),b._inEffect?(g.push(b._effect),b._markTarget()):(f.push(b._effect),b._unmarkTarget()),b._needsTick&&(m=!0);var d=b._inEffect||b._needsTick;b._inTimeline=d,d?h.push(b):i.push(b)}),o.push.apply(o,f),o.push.apply(o,g),m&&requestAnimationFrame(function(){}),p=!1,[h,i]}var i=window.requestAnimationFrame,j=[],k=0;window.requestAnimationFrame=function(a){var b=k++;return 0==j.length&&i(d),j.push([b,a]),b},window.cancelAnimationFrame=function(a){j.forEach(function(b){b[0]==a&&(b[1]=function(){})})},f.prototype={_play:function(c){c._timing=a.normalizeTimingInput(c.timing);var d=new b.Animation(c);return d._idle=!1,d._timeline=this,this._animations.push(d),b.restart(),b.applyDirtiedAnimation(d),d}};var l=void 0,m=!1,n=!1;b.restart=function(){return m||(m=!0,requestAnimationFrame(function(){}),n=!0),n},b.applyDirtiedAnimation=function(a){if(!p){a._markTarget();var c=a._targetAnimations();c.sort(e);var d=h(b.timeline.currentTime,!1,c.slice())[1];d.forEach(function(a){var b=q._animations.indexOf(a);b!==-1&&q._animations.splice(b,1)}),g()}};var o=[],p=!1,q=new f;b.timeline=q}(c,d,f),function(a,b){function c(a,b){for(var c=0,d=0;d<a.length;d++)c+=a[d]*b[d];return c}function d(a,b){return[a[0]*b[0]+a[4]*b[1]+a[8]*b[2]+a[12]*b[3],a[1]*b[0]+a[5]*b[1]+a[9]*b[2]+a[13]*b[3],a[2]*b[0]+a[6]*b[1]+a[10]*b[2]+a[14]*b[3],a[3]*b[0]+a[7]*b[1]+a[11]*b[2]+a[15]*b[3],a[0]*b[4]+a[4]*b[5]+a[8]*b[6]+a[12]*b[7],a[1]*b[4]+a[5]*b[5]+a[9]*b[6]+a[13]*b[7],a[2]*b[4]+a[6]*b[5]+a[10]*b[6]+a[14]*b[7],a[3]*b[4]+a[7]*b[5]+a[11]*b[6]+a[15]*b[7],a[0]*b[8]+a[4]*b[9]+a[8]*b[10]+a[12]*b[11],a[1]*b[8]+a[5]*b[9]+a[9]*b[10]+a[13]*b[11],a[2]*b[8]+a[6]*b[9]+a[10]*b[10]+a[14]*b[11],a[3]*b[8]+a[7]*b[9]+a[11]*b[10]+a[15]*b[11],a[0]*b[12]+a[4]*b[13]+a[8]*b[14]+a[12]*b[15],a[1]*b[12]+a[5]*b[13]+a[9]*b[14]+a[13]*b[15],a[2]*b[12]+a[6]*b[13]+a[10]*b[14]+a[14]*b[15],a[3]*b[12]+a[7]*b[13]+a[11]*b[14]+a[15]*b[15]]}function e(a){var b=a.rad||0,c=a.deg||0,d=a.grad||0,e=a.turn||0,f=(c/360+d/400+e)*(2*Math.PI)+b;return f}function f(a){switch(a.t){case"rotatex":var b=e(a.d[0]);return[1,0,0,0,0,Math.cos(b),Math.sin(b),0,0,-Math.sin(b),Math.cos(b),0,0,0,0,1];case"rotatey":var b=e(a.d[0]);return[Math.cos(b),0,-Math.sin(b),0,0,1,0,0,Math.sin(b),0,Math.cos(b),0,0,0,0,1];case"rotate":case"rotatez":var b=e(a.d[0]);return[Math.cos(b),Math.sin(b),0,0,-Math.sin(b),Math.cos(b),0,0,0,0,1,0,0,0,0,1];case"rotate3d":var c=a.d[0],d=a.d[1],f=a.d[2],b=e(a.d[3]),g=c*c+d*d+f*f;if(0===g)c=1,d=0,f=0;else if(1!==g){var h=Math.sqrt(g);c/=h,d/=h,f/=h}var i=Math.sin(b/2),j=i*Math.cos(b/2),k=i*i;return[1-2*(d*d+f*f)*k,2*(c*d*k+f*j),2*(c*f*k-d*j),0,2*(c*d*k-f*j),1-2*(c*c+f*f)*k,2*(d*f*k+c*j),0,2*(c*f*k+d*j),2*(d*f*k-c*j),1-2*(c*c+d*d)*k,0,0,0,0,1];case"scale":return[a.d[0],0,0,0,0,a.d[1],0,0,0,0,1,0,0,0,0,1];case"scalex":return[a.d[0],0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];case"scaley":return[1,0,0,0,0,a.d[0],0,0,0,0,1,0,0,0,0,1];case"scalez":return[1,0,0,0,0,1,0,0,0,0,a.d[0],0,0,0,0,1];case"scale3d":return[a.d[0],0,0,0,0,a.d[1],0,0,0,0,a.d[2],0,0,0,0,1];case"skew":var l=e(a.d[0]),m=e(a.d[1]);return[1,Math.tan(m),0,0,Math.tan(l),1,0,0,0,0,1,0,0,0,0,1];case"skewx":var b=e(a.d[0]);return[1,0,0,0,Math.tan(b),1,0,0,0,0,1,0,0,0,0,1];case"skewy":var b=e(a.d[0]);return[1,Math.tan(b),0,0,0,1,0,0,0,0,1,0,0,0,0,1];case"translate":var c=a.d[0].px||0,d=a.d[1].px||0;return[1,0,0,0,0,1,0,0,0,0,1,0,c,d,0,1];case"translatex":var c=a.d[0].px||0;return[1,0,0,0,0,1,0,0,0,0,1,0,c,0,0,1];case"translatey":var d=a.d[0].px||0;return[1,0,0,0,0,1,0,0,0,0,1,0,0,d,0,1];case"translatez":var f=a.d[0].px||0;return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,f,1];case"translate3d":var c=a.d[0].px||0,d=a.d[1].px||0,f=a.d[2].px||0;return[1,0,0,0,0,1,0,0,0,0,1,0,c,d,f,1];case"perspective":var n=a.d[0].px?-1/a.d[0].px:0;return[1,0,0,0,0,1,0,0,0,0,1,n,0,0,0,1];case"matrix":return[a.d[0],a.d[1],0,0,a.d[2],a.d[3],0,0,0,0,1,0,a.d[4],a.d[5],0,1];case"matrix3d":return a.d}}function g(a){return 0===a.length?[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]:a.map(f).reduce(d)}function h(a){return[i(g(a))]}var i=function(){function a(a){return a[0][0]*a[1][1]*a[2][2]+a[1][0]*a[2][1]*a[0][2]+a[2][0]*a[0][1]*a[1][2]-a[0][2]*a[1][1]*a[2][0]-a[1][2]*a[2][1]*a[0][0]-a[2][2]*a[0][1]*a[1][0]}function b(b){for(var c=1/a(b),d=b[0][0],e=b[0][1],f=b[0][2],g=b[1][0],h=b[1][1],i=b[1][2],j=b[2][0],k=b[2][1],l=b[2][2],m=[[(h*l-i*k)*c,(f*k-e*l)*c,(e*i-f*h)*c,0],[(i*j-g*l)*c,(d*l-f*j)*c,(f*g-d*i)*c,0],[(g*k-h*j)*c,(j*e-d*k)*c,(d*h-e*g)*c,0]],n=[],o=0;o<3;o++){for(var p=0,q=0;q<3;q++)p+=b[3][q]*m[q][o];n.push(p)}return n.push(1),m.push(n),m}function d(a){return[[a[0][0],a[1][0],a[2][0],a[3][0]],[a[0][1],a[1][1],a[2][1],a[3][1]],[a[0][2],a[1][2],a[2][2],a[3][2]],[a[0][3],a[1][3],a[2][3],a[3][3]]]}function e(a,b){for(var c=[],d=0;d<4;d++){for(var e=0,f=0;f<4;f++)e+=a[f]*b[f][d];c.push(e)}return c}function f(a){var b=g(a);return[a[0]/b,a[1]/b,a[2]/b]}function g(a){return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2])}function h(a,b,c,d){return[c*a[0]+d*b[0],c*a[1]+d*b[1],c*a[2]+d*b[2]]}function i(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}function j(j){var k=[j.slice(0,4),j.slice(4,8),j.slice(8,12),j.slice(12,16)];if(1!==k[3][3])return null;for(var l=[],m=0;m<4;m++)l.push(k[m].slice());for(var m=0;m<3;m++)l[m][3]=0;if(0===a(l))return!1;var n,o=[];if(k[0][3]||k[1][3]||k[2][3]){o.push(k[0][3]),o.push(k[1][3]),o.push(k[2][3]),o.push(k[3][3]);var p=b(l),q=d(p);n=e(o,q)}else n=[0,0,0,1];var r=k[3].slice(0,3),s=[];s.push(k[0].slice(0,3));var t=[];t.push(g(s[0])),s[0]=f(s[0]);var u=[];s.push(k[1].slice(0,3)),u.push(c(s[0],s[1])),s[1]=h(s[1],s[0],1,-u[0]),t.push(g(s[1])),s[1]=f(s[1]),u[0]/=t[1],s.push(k[2].slice(0,3)),u.push(c(s[0],s[2])),s[2]=h(s[2],s[0],1,-u[1]),u.push(c(s[1],s[2])),s[2]=h(s[2],s[1],1,-u[2]),t.push(g(s[2])),s[2]=f(s[2]),u[1]/=t[2],u[2]/=t[2];var v=i(s[1],s[2]);if(c(s[0],v)<0)for(var m=0;m<3;m++)t[m]*=-1,s[m][0]*=-1,s[m][1]*=-1,s[m][2]*=-1;var w,x,y=s[0][0]+s[1][1]+s[2][2]+1;return y>1e-4?(w=.5/Math.sqrt(y),x=[(s[2][1]-s[1][2])*w,(s[0][2]-s[2][0])*w,(s[1][0]-s[0][1])*w,.25/w]):s[0][0]>s[1][1]&&s[0][0]>s[2][2]?(w=2*Math.sqrt(1+s[0][0]-s[1][1]-s[2][2]),x=[.25*w,(s[0][1]+s[1][0])/w,(s[0][2]+s[2][0])/w,(s[2][1]-s[1][2])/w]):s[1][1]>s[2][2]?(w=2*Math.sqrt(1+s[1][1]-s[0][0]-s[2][2]),x=[(s[0][1]+s[1][0])/w,.25*w,(s[1][2]+s[2][1])/w,(s[0][2]-s[2][0])/w]):(w=2*Math.sqrt(1+s[2][2]-s[0][0]-s[1][1]),x=[(s[0][2]+s[2][0])/w,(s[1][2]+s[2][1])/w,.25*w,(s[1][0]-s[0][1])/w]),[r,t,u,x,n]}return j}();a.dot=c,a.makeMatrixDecomposition=h}(d,f),function(a){function b(a,b){var c=a.exec(b);if(c)return c=a.ignoreCase?c[0].toLowerCase():c[0],[c,b.substr(c.length)]}function c(a,b){b=b.replace(/^\s*/,"");var c=a(b);if(c)return[c[0],c[1].replace(/^\s*/,"")]}function d(a,d,e){a=c.bind(null,a);for(var f=[];;){var g=a(e);if(!g)return[f,e];if(f.push(g[0]),e=g[1],g=b(d,e),!g||""==g[1])return[f,e];e=g[1]}}function e(a,b){for(var c=0,d=0;d<b.length&&(!/\s|,/.test(b[d])||0!=c);d++)if("("==b[d])c++;else if(")"==b[d]&&(c--,0==c&&d++,c<=0))break;var e=a(b.substr(0,d));return void 0==e?void 0:[e,b.substr(d)]}function f(a,b){for(var c=a,d=b;c&&d;)c>d?c%=d:d%=c;return c=a*b/(c+d)}function g(a){return function(b){var c=a(b);return c&&(c[0]=void 0),c}}function h(a,b){return function(c){var d=a(c);return d?d:[b,c]}}function i(b,c){for(var d=[],e=0;e<b.length;e++){var f=a.consumeTrimmed(b[e],c);if(!f||""==f[0])return;void 0!==f[0]&&d.push(f[0]),c=f[1]}if(""==c)return d}function j(a,b,c,d,e){for(var g=[],h=[],i=[],j=f(d.length,e.length),k=0;k<j;k++){var l=b(d[k%d.length],e[k%e.length]);if(!l)return;g.push(l[0]),h.push(l[1]),i.push(l[2])}return[g,h,function(b){var d=b.map(function(a,b){return i[b](a)}).join(c);return a?a(d):d}]}function k(a,b,c){for(var d=[],e=[],f=[],g=0,h=0;h<c.length;h++)if("function"==typeof c[h]){var i=c[h](a[g],b[g++]);d.push(i[0]),e.push(i[1]),f.push(i[2])}else!function(a){d.push(!1),e.push(!1),f.push(function(){return c[a]})}(h);return[d,e,function(a){for(var b="",c=0;c<a.length;c++)b+=f[c](a[c]);return b}]}a.consumeToken=b,a.consumeTrimmed=c,a.consumeRepeated=d,a.consumeParenthesised=e,a.ignore=g,a.optional=h,a.consumeList=i,a.mergeNestedRepeated=j.bind(null,null),a.mergeWrappedNestedRepeated=j,a.mergeList=k}(d),function(a){function b(b){function c(b){var c=a.consumeToken(/^inset/i,b);if(c)return d.inset=!0,c;var c=a.consumeLengthOrPercent(b);if(c)return d.lengths.push(c[0]),c;var c=a.consumeColor(b);return c?(d.color=c[0],c):void 0}var d={inset:!1,lengths:[],color:null},e=a.consumeRepeated(c,/^/,b);if(e&&e[0].length)return[d,e[1]]}function c(c){var d=a.consumeRepeated(b,/^,/,c);if(d&&""==d[1])return d[0]}function d(b,c){for(;b.lengths.length<Math.max(b.lengths.length,c.lengths.length);)b.lengths.push({px:0});for(;c.lengths.length<Math.max(b.lengths.length,c.lengths.length);)c.lengths.push({px:0});if(b.inset==c.inset&&!!b.color==!!c.color){for(var d,e=[],f=[[],0],g=[[],0],h=0;h<b.lengths.length;h++){var i=a.mergeDimensions(b.lengths[h],c.lengths[h],2==h);f[0].push(i[0]),g[0].push(i[1]),e.push(i[2])}if(b.color&&c.color){var j=a.mergeColors(b.color,c.color);f[1]=j[0],g[1]=j[1],d=j[2];
}return[f,g,function(a){for(var c=b.inset?"inset ":" ",f=0;f<e.length;f++)c+=e[f](a[0][f])+" ";return d&&(c+=d(a[1])),c}]}}function e(b,c,d,e){function f(a){return{inset:a,color:[0,0,0,0],lengths:[{px:0},{px:0},{px:0},{px:0}]}}for(var g=[],h=[],i=0;i<d.length||i<e.length;i++){var j=d[i]||f(e[i].inset),k=e[i]||f(d[i].inset);g.push(j),h.push(k)}return a.mergeNestedRepeated(b,c,g,h)}var f=e.bind(null,d,", ");a.addPropertiesHandler(c,f,["box-shadow","text-shadow"])}(d),function(a,b){function c(a){return a.toFixed(3).replace(".000","")}function d(a,b,c){return Math.min(b,Math.max(a,c))}function e(a){if(/^\s*[-+]?(\d*\.)?\d+\s*$/.test(a))return Number(a)}function f(a,b){return[a,b,c]}function g(a,b){if(0!=a)return i(0,1/0)(a,b)}function h(a,b){return[a,b,function(a){return Math.round(d(1,1/0,a))}]}function i(a,b){return function(e,f){return[e,f,function(e){return c(d(a,b,e))}]}}function j(a,b){return[a,b,Math.round]}a.clamp=d,a.addPropertiesHandler(e,i(0,1/0),["border-image-width","line-height"]),a.addPropertiesHandler(e,i(0,1),["opacity","shape-image-threshold"]),a.addPropertiesHandler(e,g,["flex-grow","flex-shrink"]),a.addPropertiesHandler(e,h,["orphans","widows"]),a.addPropertiesHandler(e,j,["z-index"]),a.parseNumber=e,a.mergeNumbers=f,a.numberToString=c}(d,f),function(a,b){function c(a,b){if("visible"==a||"visible"==b)return[0,1,function(c){return c<=0?a:c>=1?b:"visible"}]}a.addPropertiesHandler(String,c,["visibility"])}(d),function(a,b){function c(a){a=a.trim(),f.fillStyle="#000",f.fillStyle=a;var b=f.fillStyle;if(f.fillStyle="#fff",f.fillStyle=a,b==f.fillStyle){f.fillRect(0,0,1,1);var c=f.getImageData(0,0,1,1).data;f.clearRect(0,0,1,1);var d=c[3]/255;return[c[0]*d,c[1]*d,c[2]*d,d]}}function d(b,c){return[b,c,function(b){function c(a){return Math.max(0,Math.min(255,a))}if(b[3])for(var d=0;d<3;d++)b[d]=Math.round(c(b[d]/b[3]));return b[3]=a.numberToString(a.clamp(0,1,b[3])),"rgba("+b.join(",")+")"}]}var e=document.createElementNS("http://www.w3.org/1999/xhtml","canvas");e.width=e.height=1;var f=e.getContext("2d");a.addPropertiesHandler(c,d,["background-color","border-bottom-color","border-left-color","border-right-color","border-top-color","color","outline-color","text-decoration-color"]),a.consumeColor=a.consumeParenthesised.bind(null,c),a.mergeColors=d}(d,f),function(a,b){function c(a,b){if(b=b.trim().toLowerCase(),"0"==b&&"px".search(a)>=0)return{px:0};if(/^[^(]*$|^calc/.test(b)){b=b.replace(/calc\(/g,"(");var c={};b=b.replace(a,function(a){return c[a]=null,"U"+a});for(var d="U("+a.source+")",e=b.replace(/[-+]?(\d*\.)?\d+/g,"N").replace(new RegExp("N"+d,"g"),"D").replace(/\s[+-]\s/g,"O").replace(/\s/g,""),f=[/N\*(D)/g,/(N|D)[*\/]N/g,/(N|D)O\1/g,/\((N|D)\)/g],g=0;g<f.length;)f[g].test(e)?(e=e.replace(f[g],"$1"),g=0):g++;if("D"==e){for(var h in c){var i=eval(b.replace(new RegExp("U"+h,"g"),"").replace(new RegExp(d,"g"),"*0"));if(!isFinite(i))return;c[h]=i}return c}}}function d(a,b){return e(a,b,!0)}function e(b,c,d){var e,f=[];for(e in b)f.push(e);for(e in c)f.indexOf(e)<0&&f.push(e);return b=f.map(function(a){return b[a]||0}),c=f.map(function(a){return c[a]||0}),[b,c,function(b){var c=b.map(function(c,e){return 1==b.length&&d&&(c=Math.max(c,0)),a.numberToString(c)+f[e]}).join(" + ");return b.length>1?"calc("+c+")":c}]}var f="px|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc",g=c.bind(null,new RegExp(f,"g")),h=c.bind(null,new RegExp(f+"|%","g")),i=c.bind(null,/deg|rad|grad|turn/g);a.parseLength=g,a.parseLengthOrPercent=h,a.consumeLengthOrPercent=a.consumeParenthesised.bind(null,h),a.parseAngle=i,a.mergeDimensions=e;var j=a.consumeParenthesised.bind(null,g),k=a.consumeRepeated.bind(void 0,j,/^/),l=a.consumeRepeated.bind(void 0,k,/^,/);a.consumeSizePairList=l;var m=function(a){var b=l(a);if(b&&""==b[1])return b[0]},n=a.mergeNestedRepeated.bind(void 0,d," "),o=a.mergeNestedRepeated.bind(void 0,n,",");a.mergeNonNegativeSizePair=n,a.addPropertiesHandler(m,o,["background-size"]),a.addPropertiesHandler(h,d,["border-bottom-width","border-image-width","border-left-width","border-right-width","border-top-width","flex-basis","font-size","height","line-height","max-height","max-width","outline-width","width"]),a.addPropertiesHandler(h,e,["border-bottom-left-radius","border-bottom-right-radius","border-top-left-radius","border-top-right-radius","bottom","left","letter-spacing","margin-bottom","margin-left","margin-right","margin-top","min-height","min-width","outline-offset","padding-bottom","padding-left","padding-right","padding-top","perspective","right","shape-margin","text-indent","top","vertical-align","word-spacing"])}(d,f),function(a,b){function c(b){return a.consumeLengthOrPercent(b)||a.consumeToken(/^auto/,b)}function d(b){var d=a.consumeList([a.ignore(a.consumeToken.bind(null,/^rect/)),a.ignore(a.consumeToken.bind(null,/^\(/)),a.consumeRepeated.bind(null,c,/^,/),a.ignore(a.consumeToken.bind(null,/^\)/))],b);if(d&&4==d[0].length)return d[0]}function e(b,c){return"auto"==b||"auto"==c?[!0,!1,function(d){var e=d?b:c;if("auto"==e)return"auto";var f=a.mergeDimensions(e,e);return f[2](f[0])}]:a.mergeDimensions(b,c)}function f(a){return"rect("+a+")"}var g=a.mergeWrappedNestedRepeated.bind(null,f,e,", ");a.parseBox=d,a.mergeBoxes=g,a.addPropertiesHandler(d,g,["clip"])}(d,f),function(a,b){function c(a){return function(b){var c=0;return a.map(function(a){return a===k?b[c++]:a})}}function d(a){return a}function e(b){if(b=b.toLowerCase().trim(),"none"==b)return[];for(var c,d=/\s*(\w+)\(([^)]*)\)/g,e=[],f=0;c=d.exec(b);){if(c.index!=f)return;f=c.index+c[0].length;var g=c[1],h=n[g];if(!h)return;var i=c[2].split(","),j=h[0];if(j.length<i.length)return;for(var k=[],o=0;o<j.length;o++){var p,q=i[o],r=j[o];if(p=q?{A:function(b){return"0"==b.trim()?m:a.parseAngle(b)},N:a.parseNumber,T:a.parseLengthOrPercent,L:a.parseLength}[r.toUpperCase()](q):{a:m,n:k[0],t:l}[r],void 0===p)return;k.push(p)}if(e.push({t:g,d:k}),d.lastIndex==b.length)return e}}function f(a){return a.toFixed(6).replace(".000000","")}function g(b,c){if(b.decompositionPair!==c){b.decompositionPair=c;var d=a.makeMatrixDecomposition(b)}if(c.decompositionPair!==b){c.decompositionPair=b;var e=a.makeMatrixDecomposition(c)}return null==d[0]||null==e[0]?[[!1],[!0],function(a){return a?c[0].d:b[0].d}]:(d[0].push(0),e[0].push(1),[d,e,function(b){var c=a.quat(d[0][3],e[0][3],b[5]),g=a.composeMatrix(b[0],b[1],b[2],c,b[4]),h=g.map(f).join(",");return h}])}function h(a){return a.replace(/[xy]/,"")}function i(a){return a.replace(/(x|y|z|3d)?$/,"3d")}function j(b,c){var d=a.makeMatrixDecomposition&&!0,e=!1;if(!b.length||!c.length){b.length||(e=!0,b=c,c=[]);for(var f=0;f<b.length;f++){var j=b[f].t,k=b[f].d,l="scale"==j.substr(0,5)?1:0;c.push({t:j,d:k.map(function(a){if("number"==typeof a)return l;var b={};for(var c in a)b[c]=l;return b})})}}var m=function(a,b){return"perspective"==a&&"perspective"==b||("matrix"==a||"matrix3d"==a)&&("matrix"==b||"matrix3d"==b)},o=[],p=[],q=[];if(b.length!=c.length){if(!d)return;var r=g(b,c);o=[r[0]],p=[r[1]],q=[["matrix",[r[2]]]]}else for(var f=0;f<b.length;f++){var j,s=b[f].t,t=c[f].t,u=b[f].d,v=c[f].d,w=n[s],x=n[t];if(m(s,t)){if(!d)return;var r=g([b[f]],[c[f]]);o.push(r[0]),p.push(r[1]),q.push(["matrix",[r[2]]])}else{if(s==t)j=s;else if(w[2]&&x[2]&&h(s)==h(t))j=h(s),u=w[2](u),v=x[2](v);else{if(!w[1]||!x[1]||i(s)!=i(t)){if(!d)return;var r=g(b,c);o=[r[0]],p=[r[1]],q=[["matrix",[r[2]]]];break}j=i(s),u=w[1](u),v=x[1](v)}for(var y=[],z=[],A=[],B=0;B<u.length;B++){var C="number"==typeof u[B]?a.mergeNumbers:a.mergeDimensions,r=C(u[B],v[B]);y[B]=r[0],z[B]=r[1],A.push(r[2])}o.push(y),p.push(z),q.push([j,A])}}if(e){var D=o;o=p,p=D}return[o,p,function(a){return a.map(function(a,b){var c=a.map(function(a,c){return q[b][1][c](a)}).join(",");return"matrix"==q[b][0]&&16==c.split(",").length&&(q[b][0]="matrix3d"),q[b][0]+"("+c+")"}).join(" ")}]}var k=null,l={px:0},m={deg:0},n={matrix:["NNNNNN",[k,k,0,0,k,k,0,0,0,0,1,0,k,k,0,1],d],matrix3d:["NNNNNNNNNNNNNNNN",d],rotate:["A"],rotatex:["A"],rotatey:["A"],rotatez:["A"],rotate3d:["NNNA"],perspective:["L"],scale:["Nn",c([k,k,1]),d],scalex:["N",c([k,1,1]),c([k,1])],scaley:["N",c([1,k,1]),c([1,k])],scalez:["N",c([1,1,k])],scale3d:["NNN",d],skew:["Aa",null,d],skewx:["A",null,c([k,m])],skewy:["A",null,c([m,k])],translate:["Tt",c([k,k,l]),d],translatex:["T",c([k,l,l]),c([k,l])],translatey:["T",c([l,k,l]),c([l,k])],translatez:["L",c([l,l,k])],translate3d:["TTL",d]};a.addPropertiesHandler(e,j,["transform"])}(d,f),function(a){function b(a){var b=Number(a);if(!(isNaN(b)||b<100||b>900||b%100!==0))return b}function c(b){return b=100*Math.round(b/100),b=a.clamp(100,900,b),400===b?"normal":700===b?"bold":String(b)}function d(a,b){return[a,b,c]}a.addPropertiesHandler(b,d,["font-weight"])}(d),function(a){function b(a){var b={};for(var c in a)b[c]=-a[c];return b}function c(b){return a.consumeToken(/^(left|center|right|top|bottom)\b/i,b)||a.consumeLengthOrPercent(b)}function d(b,d){var e=a.consumeRepeated(c,/^/,d);if(e&&""==e[1]){var f=e[0];if(f[0]=f[0]||"center",f[1]=f[1]||"center",3==b&&(f[2]=f[2]||{px:0}),f.length==b){if(/top|bottom/.test(f[0])||/left|right/.test(f[1])){var h=f[0];f[0]=f[1],f[1]=h}if(/left|right|center|Object/.test(f[0])&&/top|bottom|center|Object/.test(f[1]))return f.map(function(a){return"object"==typeof a?a:g[a]})}}}function e(d){var e=a.consumeRepeated(c,/^/,d);if(e){for(var f=e[0],h=[{"%":50},{"%":50}],i=0,j=!1,k=0;k<f.length;k++){var l=f[k];"string"==typeof l?(j=/bottom|right/.test(l),i={left:0,right:0,center:i,top:1,bottom:1}[l],h[i]=g[l],"center"==l&&i++):(j&&(l=b(l),l["%"]=(l["%"]||0)+100),h[i]=l,i++,j=!1)}return[h,e[1]]}}function f(b){var c=a.consumeRepeated(e,/^,/,b);if(c&&""==c[1])return c[0]}var g={left:{"%":0},center:{"%":50},right:{"%":100},top:{"%":0},bottom:{"%":100}},h=a.mergeNestedRepeated.bind(null,a.mergeDimensions," ");a.addPropertiesHandler(d.bind(null,3),h,["transform-origin"]),a.addPropertiesHandler(d.bind(null,2),h,["perspective-origin"]),a.consumePosition=e,a.mergeOffsetList=h;var i=a.mergeNestedRepeated.bind(null,h,", ");a.addPropertiesHandler(f,i,["background-position","object-position"])}(d),function(a){function b(b){var c=a.consumeToken(/^circle/,b);if(c&&c[0])return["circle"].concat(a.consumeList([a.ignore(a.consumeToken.bind(void 0,/^\(/)),d,a.ignore(a.consumeToken.bind(void 0,/^at/)),a.consumePosition,a.ignore(a.consumeToken.bind(void 0,/^\)/))],c[1]));var f=a.consumeToken(/^ellipse/,b);if(f&&f[0])return["ellipse"].concat(a.consumeList([a.ignore(a.consumeToken.bind(void 0,/^\(/)),e,a.ignore(a.consumeToken.bind(void 0,/^at/)),a.consumePosition,a.ignore(a.consumeToken.bind(void 0,/^\)/))],f[1]));var g=a.consumeToken(/^polygon/,b);return g&&g[0]?["polygon"].concat(a.consumeList([a.ignore(a.consumeToken.bind(void 0,/^\(/)),a.optional(a.consumeToken.bind(void 0,/^nonzero\s*,|^evenodd\s*,/),"nonzero,"),a.consumeSizePairList,a.ignore(a.consumeToken.bind(void 0,/^\)/))],g[1])):void 0}function c(b,c){if(b[0]===c[0])return"circle"==b[0]?a.mergeList(b.slice(1),c.slice(1),["circle(",a.mergeDimensions," at ",a.mergeOffsetList,")"]):"ellipse"==b[0]?a.mergeList(b.slice(1),c.slice(1),["ellipse(",a.mergeNonNegativeSizePair," at ",a.mergeOffsetList,")"]):"polygon"==b[0]&&b[1]==c[1]?a.mergeList(b.slice(2),c.slice(2),["polygon(",b[1],g,")"]):void 0}var d=a.consumeParenthesised.bind(null,a.parseLengthOrPercent),e=a.consumeRepeated.bind(void 0,d,/^/),f=a.mergeNestedRepeated.bind(void 0,a.mergeDimensions," "),g=a.mergeNestedRepeated.bind(void 0,f,",");a.addPropertiesHandler(b,c,["shape-outside"])}(d),function(a,b){function c(a,b){b.concat([a]).forEach(function(b){b in document.documentElement.style&&(d[a]=b)})}var d={};c("transform",["webkitTransform","msTransform"]),c("transformOrigin",["webkitTransformOrigin"]),c("perspective",["webkitPerspective"]),c("perspectiveOrigin",["webkitPerspectiveOrigin"]),a.propertyName=function(a){return d[a]||a}}(d,f)}(),!function(){if(void 0===document.createElement("div").animate([]).oncancel){var a;if(window.performance&&performance.now)var a=function(){return performance.now()};else var a=function(){return Date.now()};var b=function(a,b,c){this.target=a,this.currentTime=b,this.timelineTime=c,this.type="cancel",this.bubbles=!1,this.cancelable=!1,this.currentTarget=a,this.defaultPrevented=!1,this.eventPhase=Event.AT_TARGET,this.timeStamp=Date.now()},c=window.Element.prototype.animate;window.Element.prototype.animate=function(d,e){var f=c.call(this,d,e);f._cancelHandlers=[],f.oncancel=null;var g=f.cancel;f.cancel=function(){g.call(this);var c=new b(this,null,a()),d=this._cancelHandlers.concat(this.oncancel?[this.oncancel]:[]);setTimeout(function(){d.forEach(function(a){a.call(c.target,c)})},0)};var h=f.addEventListener;f.addEventListener=function(a,b){"function"==typeof b&&"cancel"==a?this._cancelHandlers.push(b):h.call(this,a,b)};var i=f.removeEventListener;return f.removeEventListener=function(a,b){if("cancel"==a){var c=this._cancelHandlers.indexOf(b);c>=0&&this._cancelHandlers.splice(c,1)}else i.call(this,a,b)},f}}}(),function(a){var b=document.documentElement,c=null,d=!1;try{var e=getComputedStyle(b).getPropertyValue("opacity"),f="0"==e?"1":"0";c=b.animate({opacity:[f,f]},{duration:1}),c.currentTime=0,d=getComputedStyle(b).getPropertyValue("opacity")==f}catch(a){}finally{c&&c.cancel()}if(!d){var g=window.Element.prototype.animate;window.Element.prototype.animate=function(b,c){return window.Symbol&&Symbol.iterator&&Array.prototype.from&&b[Symbol.iterator]&&(b=Array.from(b)),Array.isArray(b)||null===b||(b=a.convertToArrayForm(b)),g.call(this,b,c)}}}(c),b.true=a}({},function(){return this}());

}

},{}],13:[function(require,module,exports){
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

},{"./event-helper-listen":20,"./json":25,"./log":27,"./utils/object":48}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{"./config":15,"./string":42,"./url":46}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{"../third_party/css-escape/css-escape":50,"./log":27,"./string":42}],19:[function(require,module,exports){
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

},{"./dom":18,"./log":27,"./service":39}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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

},{"./event-helper-listen":20,"./log":27}],22:[function(require,module,exports){
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

},{"./cookies":16,"./json":25,"./log":27,"./service":39,"./url":46,"./utils/bytes":47}],23:[function(require,module,exports){
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

},{"./common-signals":14,"./document-ready":17,"./dom":18,"./event-helper":21,"./full-overlay-frame-child-helper":24,"./layout-rect":26,"./log":27,"./observable":30,"./service":39,"./services":41,"./style":43,"./utils/signals":49}],24:[function(require,module,exports){
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

},{"./dom":18,"./log":27}],25:[function(require,module,exports){
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

},{"./types":44}],26:[function(require,module,exports){
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

},{}],27:[function(require,module,exports){
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

},{"./mode":29,"./mode-object":28,"./types":44}],28:[function(require,module,exports){
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

},{"./mode":29}],29:[function(require,module,exports){
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

},{"./string":42,"./url-parse-query-string":45}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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

var _services = require('./services');

/**
 * Pass class helps to manage single-pass process. A pass is scheduled using
 * delay method. Only one pass can be pending at a time. If no pass is pending
 * the process is considered to be "idle".
 */

var Pass = (function () {

  /**
   * Creates a new Pass instance.
   * @param {!Window} win
   * @param {function()} handler Handler to be executed when pass is triggered.
   * @param {number=} opt_defaultDelay Default delay to be used when schedule
   *   is called without one.
   */

  function Pass(win, handler, opt_defaultDelay) {
    var _this = this;

    babelHelpers.classCallCheck(this, Pass);

    this.timer_ = _services.timerFor(win);

    /** @private @const {function()} */
    this.handler_ = handler;

    /** @private @const {number} */
    this.defaultDelay_ = opt_defaultDelay || 0;

    /** @private {number|string} */
    this.scheduled_ = -1;

    /** @private {number} */
    this.nextTime_ = 0;

    /** @private {boolean} */
    this.running_ = false;

    /** @private @const {!Function} */
    this.boundPass_ = function () {
      return _this.pass_();
    };
  }

  /**
   * Whether or not a pass is currently pending.
   * @return {boolean}
   */

  Pass.prototype.isPending = function isPending() {
    return this.scheduled_ != -1;
  };

  /**
   * Tries to schedule a new pass optionally with specified delay. If the new
   * requested pass is requested before the pending pass, the pending pass is
   * canceled. If the new pass is requested after the pending pass, the newly
   * requested pass is ignored.
   *
   * Returns {@code true} if the pass has been scheduled and {@code false} if
   * ignored.
   *
   * @param {number=} opt_delay Delay to schedule the pass. If not specified
   *   the default delay is used, falling back to 0.
   * @return {boolean}
   */

  Pass.prototype.schedule = function schedule(opt_delay) {
    var delay = opt_delay || this.defaultDelay_;
    if (this.running_ && delay < 10) {
      // If we get called recursively, wait at least 10ms for the next
      // execution.
      delay = 10;
    }

    var nextTime = Date.now() + delay;
    // Schedule anew if nothing is scheduled currently or if the new time is
    // sooner then previously requested.
    if (!this.isPending() || nextTime - this.nextTime_ < -10) {
      this.cancel();
      this.nextTime_ = nextTime;
      this.scheduled_ = this.timer_.delay(this.boundPass_, delay);

      return true;
    }

    return false;
  };

  Pass.prototype.pass_ = function pass_() {
    this.scheduled_ = -1;
    this.nextTime_ = 0;
    this.running_ = true;
    this.handler_();
    this.running_ = false;
  };

  /**
   * Cancels the pending pass if any.
   */

  Pass.prototype.cancel = function cancel() {
    if (this.isPending()) {
      this.timer_.cancel(this.scheduled_);
      this.scheduled_ = -1;
    }
  };

  return Pass;
})();

exports.Pass = Pass;

},{"./services":41}],32:[function(require,module,exports){
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

},{"./mode":29,"./polyfills/array-includes":33,"./polyfills/document-contains":34,"./polyfills/domtokenlist-toggle":35,"./polyfills/math-sign":36,"./polyfills/object-assign":37,"./polyfills/promise":38,"document-register-element/build/document-register-element.node":10}],33:[function(require,module,exports){
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

},{}],34:[function(require,module,exports){
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

},{}],35:[function(require,module,exports){
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

},{}],36:[function(require,module,exports){
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

},{}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
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

},{"promise-pjs/promise":11}],39:[function(require,module,exports){
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

},{"./log":27,"./polyfills":32}],40:[function(require,module,exports){
exports.__esModule = true;
exports.installPositionObserverServiceForDoc = installPositionObserverServiceForDoc;
/**
 * Copyright 2017 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use baseInstance file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _service = require('../service');

var _services = require('../services');

var _mode = require('../mode');

var _log = require('../log');

var _layoutRect = require('../layout-rect');

var _srcExperiments = require('../../src/experiments');

var _src3pFrameMessaging = require('../../src/3p-frame-messaging');

var _srcJsonJs = require('../../src/json.js');

/** @const @private */
var TAG = 'POSITION_OBSERVER';

/** @const */
var SEND_POSITIONS_HIGH_FIDELITY = 'send-positions-high-fidelity';

exports.SEND_POSITIONS_HIGH_FIDELITY = SEND_POSITIONS_HIGH_FIDELITY;
/** @const */
var POSITION_HIGH_FIDELITY = 'position-high-fidelity';

exports.POSITION_HIGH_FIDELITY = POSITION_HIGH_FIDELITY;
/**
 * The positionObserver returned position value which includes the position rect
 * relative to viewport. And viewport rect which always has top 0, left 0, and
 * viewport width and height.
 * @typedef {{
 *  positionRect: ?../layout-rect.LayoutRectDef,
 *  viewportRect: !../layout-rect.LayoutRectDef,
 * }}
 */
var PositionInViewportEntryDef = undefined;

exports.PositionInViewportEntryDef = PositionInViewportEntryDef;
/** @enum {number} */
var PositionObserverFidelity = {
  HIGH: 1,
  LOW: 0
};

exports.PositionObserverFidelity = PositionObserverFidelity;
/** @const @private */
var LOW_FIDELITY_FRAME_COUNT = 4;

var AbstractPositionObserver = (function () {

  /** @param {!./ampdoc-impl.AmpDoc} ampdoc */

  function AbstractPositionObserver(ampdoc) {
    babelHelpers.classCallCheck(this, AbstractPositionObserver);

    /** @const {!./ampdoc-impl.AmpDoc} */
    this.ampdoc_ = ampdoc;

    /** @private {!Array<!Object>} */
    this.entries_ = [];

    /** @private {!./vsync-impl.Vsync} */
    this.vsync_ = _services.vsyncFor(ampdoc.win);

    /** @private {!./viewport-impl.Viewport} */
    this.viewport_ = _services.viewportForDoc(ampdoc);
  }

  /** The implementation of the positionObserver for an ampdoc */

  /**
   * @param {!Element} element
   * @param {PositionObserverFidelity} fidelity
   * @param {function(PositionInViewportEntryDef)} handler
   */

  AbstractPositionObserver.prototype.observe = function observe(element, fidelity, handler) {
    var _this = this;

    // TODO(@zhouyx, #9208) make entry into a class
    var entry = {
      element: element,
      handler: handler,
      fidelity: fidelity,
      position: null,
      turn: fidelity == PositionObserverFidelity.LOW ? Math.floor(Math.random() * LOW_FIDELITY_FRAME_COUNT) : 0,
      trigger: function (position) {
        var prePos = entry.position;
        if (prePos && _layoutRect.layoutRectEquals(prePos.positionRect, position.positionRect) && _layoutRect.layoutRectEquals(prePos.viewportRect, position.viewportRect)) {
          // position doesn't change, do nothing.
          return;
        }
        if (_layoutRect.layoutRectsOverlap(position.positionRect, position.viewportRect)) {
          entry.position = position;
          // Only call handler if entry element overlap with viewport.
          try {
            entry.handler(position);
          } catch (err) {
            // TODO(@zhouyx, #9208) Throw error.
          }
        } else if (entry.position) {
            // Need to notify that element gets outside viewport
            // NOTE: This is required for inabox position observer.
            entry.position = null;
            position.positionRect = null;
            try {
              entry.handler(position);
            } catch (err) {
              // TODO(@zhouyx, #9208) Throw error.
            }
          }
      }
    };

    this.entries_.push(entry);

    if (this.entries_.length == 1) {
      this.startCallback();
    }

    this.vsync_.measure(function () {
      _this.updateEntryPosition(entry);
    });
  };

  /**
   * @param {!Element} element
   * @param {PositionObserverFidelity} fidelity
   */

  AbstractPositionObserver.prototype.changeFidelity = function changeFidelity(element, fidelity) {
    for (var i = 0; i < this.entries_.length; i++) {
      var entry = this.entries_[i];
      if (entry.element == element) {
        entry.fidelity = fidelity;
        if (fidelity == PositionObserverFidelity.HIGH) {
          entry.turn = 0;
        }
        return;
      }
    }
    _log.dev().error(TAG, 'cannot change fidelity on unobserved element');
  };

  /**
   * @param {!Element} element
   */

  AbstractPositionObserver.prototype.unobserve = function unobserve(element) {
    for (var i = 0; i < this.entries_.length; i++) {
      if (this.entries_[i].element == element) {
        this.entries_[i].handler = null;
        this.entries_.splice(i, 1);
        if (this.entries_.length == 0) {
          this.stopCallback();
        }
        return;
      }
    }
    _log.dev().error(TAG, 'cannot unobserve unobserved element');
  };

  /** @param {!Object} unusedEntry */

  AbstractPositionObserver.prototype.updateEntryPosition = function updateEntryPosition(unusedEntry) {};

  /**
   * Callback function that gets called when start to observe the first element.
   * Should be override by sub class.
   */

  AbstractPositionObserver.prototype.startCallback = function startCallback() {};

  /**
   * Callback function that gets called when unobserve last observed element.
   * Should be override by sub class.
   */

  AbstractPositionObserver.prototype.stopCallback = function stopCallback() {};

  return AbstractPositionObserver;
})();

var AmpDocPositionObserver = (function (_AbstractPositionObserver) {
  babelHelpers.inherits(AmpDocPositionObserver, _AbstractPositionObserver);

  /** @param {!./ampdoc-impl.AmpDoc} ampdoc */

  function AmpDocPositionObserver(ampdoc) {
    babelHelpers.classCallCheck(this, AmpDocPositionObserver);

    _AbstractPositionObserver.call(this, ampdoc);

    /** @private {boolean} */
    this.inScroll_ = false;

    /** @private {boolean} */
    this.measure_ = false;

    /** @private {number} */
    this.scrollTimer_ = Date.now();

    /** @private {Array<function()>} */
    this.unlisteners_ = [];
  }

  /** The implementation of the positionObserver for inabox */

  /* @override */

  AmpDocPositionObserver.prototype.startCallback = function startCallback() {
    var _this2 = this;

    // listen to viewport scroll event to help pass determine if need to
    var stopScroll = function () {
      var timeDiff = Date.now() - _this2.scrollTimer_;
      if (timeDiff < 500) {
        // viewport scroll in the last 500 ms, wait
        return;
      }
      // assume scroll stops, if no scroll event in the last 500,
      _this2.inScroll_ = false;
    };
    var timeout = null;
    this.unlisteners_.push(this.viewport_.onScroll(function () {
      _this2.inScroll_ = true;
      _this2.scrollTimer_ = Date.now();
      _this2.schedulePass_();
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(stopScroll.bind(_this2), 500);
    }));
    this.unlisteners_.push(this.viewport_.onChanged(function () {
      // TODO (@zhouyx, #9208): Consider doing this only when event.relayoutAll
      // is true.
      _this2.vsync_.measure(function () {
        _this2.pass_(true);
      });
    }));
  };

  /* @override */

  AmpDocPositionObserver.prototype.stopCallback = function stopCallback() {
    while (this.unlisteners_.length) {
      var unlisten = this.unlisteners_.pop();
      unlisten();
    }
  };

  /** @param {boolean=} recursive */

  AmpDocPositionObserver.prototype.schedulePass_ = function schedulePass_(recursive) {
    var _this3 = this;

    // TODO (@zhouyx, #9208): remove the duplicate recursive and this.measure_
    // P1: account for effective fidelity using this.effectiveFidelity
    // P2: do passes on onDomMutation (if available using MutationObserver
    // mostly for in-a-box host, since most DOM mutations are constraint to the
    // AMP elements).
    if (!recursive && this.measure_) {
      // call of schedulePass_ from viewport onScroll
      // Do nothing if currently measure with calling schedulePass recursively
      return;
    }
    this.measure_ = true;
    if (!this.inScroll_) {
      // not in scroll, do not need to measure
      this.measure_ = false;
      return;
    }
    this.vsync_.measure(function () {
      _this3.pass_();
      _this3.schedulePass_(true);
    });
  };

  /**
   * This should always be called in vsync.
   * @param {boolean=} force
   * @private
  */

  AmpDocPositionObserver.prototype.pass_ = function pass_(force) {
    for (var i = 0; i < this.entries_.length; i++) {
      var entry = this.entries_[i];
      if (!force && entry.turn != 0) {
        // Not ready for their turn yet.
        entry.turn--;
        continue;
      }
      // Reset entry.turn value.
      if (!force) {
        if (entry.fidelity == PositionObserverFidelity.LOW) {
          entry.turn = LOW_FIDELITY_FRAME_COUNT;
        }
      }

      this.updateEntryPosition(entry);
    }
  };

  /**
   * Should always be called in vsync.
   * @override
   */

  AmpDocPositionObserver.prototype.updateEntryPosition = function updateEntryPosition(entry) {
    // get layoutBoxes relative to doc.
    var elementBox = _layoutRect.layoutRectFromDomRect(entry.element. /*OK*/getBoundingClientRect());

    var viewportSize = this.viewport_.getSize();
    var viewportBox = _layoutRect.layoutRectLtwh(0, 0, viewportSize.width, viewportSize.height);

    // Return { positionRect: <LayoutRectDef>, viewportRect: <LayoutRectDef>}
    entry.trigger( /** @type {PositionInViewportEntryDef}*/{
      positionRect: elementBox,
      viewportRect: viewportBox
    });
  };

  return AmpDocPositionObserver;
})(AbstractPositionObserver);

exports.AmpDocPositionObserver = AmpDocPositionObserver;

var InaboxAmpDocPositionObserver = (function (_AbstractPositionObserver2) {
  babelHelpers.inherits(InaboxAmpDocPositionObserver, _AbstractPositionObserver2);

  /** @param {!./ampdoc-impl.AmpDoc} ampdoc */

  function InaboxAmpDocPositionObserver(ampdoc) {
    babelHelpers.classCallCheck(this, InaboxAmpDocPositionObserver);

    _AbstractPositionObserver2.call(this, ampdoc);

    /** @private {!AmpDocPositionObserver} */
    this.positionObserver_ = new AmpDocPositionObserver(ampdoc);

    // TODO(@zhouyx, #9208) support fidelity
    this.effectiveFidelity_ = PositionObserverFidelity.LOW;

    /** @private {?PositionInViewportEntryDef} */
    this.iframePosition_ = null;

    /** @private {?function()} */
    this.unlistenHost_ = null;
  }

  /**
   * @param {!./ampdoc-impl.AmpDoc} ampdoc
   */

  /** @override */

  InaboxAmpDocPositionObserver.prototype.observe = function observe(element, fidelity, handler) {
    _AbstractPositionObserver2.prototype.observe.call(this, element, fidelity, handler);
    this.positionObserver_.observe(element, fidelity, function (position) {
      element.inIframePositionRect = position.positionRect;
    });
  };

  /** @override */

  InaboxAmpDocPositionObserver.prototype.unobserve = function unobserve(element) {
    _AbstractPositionObserver2.prototype.unobserve.call(this, element);
    this.positionObserver_.unobserve(element);
  };

  /** @override */

  InaboxAmpDocPositionObserver.prototype.startCallback = function startCallback() {
    var _this4 = this;

    // TODO(@zhouyx, #9208) Remove all of them
    var object = {};
    var dataObject = _srcJsonJs.tryParseJson(this.ampdoc_.win.name);
    var sentinel = null;
    if (dataObject) {
      sentinel = dataObject['_context']['sentinel'];
    }
    var win = this.ampdoc_.win;
    object.type = SEND_POSITIONS_HIGH_FIDELITY;
    this.ampdoc_.win.parent. /*OK*/postMessage(_src3pFrameMessaging.serializeMessage(SEND_POSITIONS_HIGH_FIDELITY, sentinel), '*');

    this.ampdoc_.win.addEventListener('message', function (event) {
      // Cheap operations first, so we don't parse JSON unless we have to.
      if (event.source != win.parent || typeof event.data != 'string' || event.data.indexOf('amp-') != 0) {
        return;
      }
      // Parse JSON only once per message.
      var data = _srcJsonJs.parseJson(event.data.substr(4));
      if (data['sentinel'] != sentinel) {
        return;
      }

      if (data['type'] != POSITION_HIGH_FIDELITY) {
        return;
      }

      _this4.onMessageReceivedHandler_(
      /** @type {PositionInViewportEntryDef} */data);
    });
  };

  /** @override */

  InaboxAmpDocPositionObserver.prototype.stopCallback = function stopCallback() {
    if (this.unlistenHost_) {
      this.unlistenHost_();
      this.unlistenHost_ = null;
    }
  };

  /**
   * @param {!PositionInViewportEntryDef} iframePosition
   * @private
   */

  InaboxAmpDocPositionObserver.prototype.onMessageReceivedHandler_ = function onMessageReceivedHandler_(iframePosition) {
    var _this5 = this;

    // iframe position change. recalculate element position.
    // Cache iframe position for later usage.
    this.iframePosition_ = iframePosition;

    // do this in vsyn.measure
    this.vsync_.measure(function () {
      _this5.pass_();
    });
  };

  /** @private */

  InaboxAmpDocPositionObserver.prototype.pass_ = function pass_() {
    for (var i = 0; i < this.entries_.length; i++) {
      var entry = this.entries_[i];
      this.updateEntryPosition(entry);
    }
  };

  /** @override */

  InaboxAmpDocPositionObserver.prototype.updateEntryPosition = function updateEntryPosition(entry) {
    if (!this.iframePosition_ || !this.iframePosition_.positionRect) {
      // If not receive iframe position from host, or if iframe is outside vp
      return;
    }
    if (!entry.element.inIframePositionRect) {
      // Not receive element position in iframe from ampDocPositionObserver
      return;
    }
    var iframeBox = this.iframePosition_.positionRect;
    var viewportBox = this.iframePosition_.viewportRect;
    // Adjust element rect relative to viewportBox
    var elementBox = entry.element.inIframePositionRect;
    elementBox = _layoutRect.moveLayoutRect(elementBox, iframeBox.left, iframeBox.top);
    entry.trigger( /** @type {PositionInViewportEntryDef}*/{
      positionRect: elementBox,
      viewportRect: viewportBox
    });
  };

  return InaboxAmpDocPositionObserver;
})(AbstractPositionObserver);

exports.InaboxAmpDocPositionObserver = InaboxAmpDocPositionObserver;

function installPositionObserverServiceForDoc(ampdoc) {
  _log.dev().assert(_srcExperiments.isExperimentOn(ampdoc.win, 'amp-animation'), 'PositionObserver is experimental and used by amp-animation only for ' + 'now');
  _service.registerServiceBuilderForDoc(ampdoc, 'position-observer', function () {
    if (_mode.getMode(ampdoc.win).runtime == 'inabox') {
      return new InaboxAmpDocPositionObserver(ampdoc);
    } else {
      return new AmpDocPositionObserver(ampdoc);
    }
  });
}

},{"../../src/3p-frame-messaging":13,"../../src/experiments":22,"../../src/json.js":25,"../layout-rect":26,"../log":27,"../mode":29,"../service":39,"../services":41}],41:[function(require,module,exports){
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

},{"./element-service":19,"./service":39}],42:[function(require,module,exports){
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

},{}],43:[function(require,module,exports){
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

},{"./string":42,"./utils/object.js":48}],44:[function(require,module,exports){
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

},{}],45:[function(require,module,exports){
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

},{}],46:[function(require,module,exports){
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

},{"./config":15,"./log":27,"./mode":29,"./string":42,"./types":44,"./url-parse-query-string":45}],47:[function(require,module,exports){
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

},{"../log":27,"../types":44}],48:[function(require,module,exports){
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

},{"../types":44}],49:[function(require,module,exports){
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

},{"./object":48}],50:[function(require,module,exports){
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

},{}]},{},[1])


})});
//# sourceMappingURL=amp-animation-0.1.max.js.map