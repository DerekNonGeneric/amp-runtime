(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

if (isLongTaskApiSupported(self)) {
  detectLongTasks(self);
}

function detectLongTasks(win) {
  var observer = new win.PerformanceObserver(function (entryList) {
    var entries = entryList.getEntries();
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].entryType != 'longtask' || entries[i].name != 'cross-origin-descendant') {
        continue;
      }
      var attr = entries[i].attribution[0];
      if (!attr || !attr.containerSrc) {
        continue;
      }

      var duration = entries[i].duration;
      var culprit = attr.containerSrc;
      if (attr.containerName) {
        var match = attr.containerName.match(/"type":"([^\"]*)"/);
        if (match.length > 1) {
          culprit = '<amp-ad type="' + match[1] + '">';
        }
      }
      console. /*OK*/log('%c LONG TASK %c ' + duration + 'ms from ' + culprit, 'background: red; color: white', 'background: #fff; color: #000');
    }
  });
  observer.observe({ entryTypes: ['longtask'] });
}

function isLongTaskApiSupported(win) {
  return !!win.PerformanceObserver && !!win.TaskAttributionTiming && 'containerName' in win.TaskAttributionTiming.prototype;
}

},{}]},{},[1])

//# sourceMappingURL=examiner.max.js.map