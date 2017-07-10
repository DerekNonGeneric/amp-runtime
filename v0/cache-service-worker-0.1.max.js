(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
exports.__esModule = true;
exports.isCdnJsFile = isCdnJsFile;
exports.requestData = requestData;
exports.urlWithVersion = urlWithVersion;
exports.isBlacklisted = isBlacklisted;
exports.generateFallbackClientId = generateFallbackClientId;
exports.fetchAndCache = fetchAndCache;
exports.expired = expired;
exports.diversions = diversions;
exports.resetMemosForTesting = resetMemosForTesting;
exports.fetchJsFile = fetchJsFile;
exports.getCachedVersion = getCachedVersion;
exports.handleFetch = handleFetch;
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

require('../../third_party/babel/custom-babel-helpers');

var _config = require('../config');

/**
 * An AMP Release version, not to be confused with an RTV version
 * @typedef {string}
 */
var AmpVersion = undefined;

exports.AmpVersion = AmpVersion;
/**
 * An RTV version, not to be confused with an AMP Release version.
 * @typedef {string}
 */
var RtvVersion = undefined;

exports.RtvVersion = RtvVersion;
/**
 * An environment of the RTV version.
 * @typedef {string}
 */
var RtvEnvironment = undefined;

exports.RtvEnvironment = RtvEnvironment;
/** @const */
var TAG = 'cache-service-worker';

/**
 * A list of blacklisted AMP versions that must never be served from
 * cache. Versions may be blacklisted if they contain a significant
 * implementation bug.
 * @type {!Array<AmpVersion>}
 */
var BLACKLIST = self.AMP_CONFIG[TAG + '-blacklist'] || [];

/**
 * The SW's current version.
 * @const
 * @type {RtvVersion}
 */
var BASE_RTV_VERSION = self.AMP_CONFIG.v;

/**
 * The SW's current environment.
 * @const
 * @type {RtvEnvironment}
 */
var BASE_RTV_ENVIRONMENT = rtvEnvironment(BASE_RTV_VERSION);

/**
 * Our cache of CDN JS files.
 *
 * @type {!Cache}
 */
var cache = undefined;

/**
 * A mapping from a Client's (unique per tab _and_ refresh) ID to the AMP
 * release version we are serving it.
 *
 * @type {!Object<string, !Promise<!RtvVersion>>}
 */
var clientsVersion = Object.create(null);

/**
 * A mapping from a client's referrer into the time that referrer last made a
 * request. This is used as a fallback to a clientId for Foreign Fetch, since
 * it does not provide a unique clientId.
 *
 * This object will hopefully not grow too large. When the SW is terminated,
 * it'll use a brand new object on restart.
 *
 * @type {!Object<string, number>}
 */
var referrersLastRequestTime = Object.create(null);

/**
 * A mapping from a URL to a fetch request for that URL. This is used to batch
 * repeated requests into a single fetch. This batching is deleted after the
 * fetch completes.
 *
 * @type {!Object<string, !Promise<!Response>>}
 */
var fetchPromises = Object.create(null);

/**
 * A regex that matches every CDN JS URL we care to cache.
 * The "experiments" and "validator" JS is explicitly disallowed.
 *
 * The RTV will be the first capture group, if it is present.
 * The pathname will be the second capture group.
 *
 * Matched URLS include:
 *  - https://cdn.ampproject.org/v0.js
 *  - https://cdn.ampproject.org/v0/amp-comp.js
 *  - https://cdn.ampproject.org/rtv/123456789012345/v0.js
 *  - https://cdn.ampproject.org/rtv/123456789012345/v0/amp-comp.js
 *
 * Unmatched URLS include:
 *  - https://cdn.ampproject.org/v0/experiments.js
 *  - https://cdn.ampproject.org/v0/validator.js
 */
var CDN_JS_REGEX = new RegExp(
// Require the CDN URL origin at the beginning.
'^' + _config.urls.cdn.replace(/\./g, '\\.') +
// Allow, but don't require, RTV.
'(?:/rtv/(\\d{2}\\d{13,}))?' +
// Require text "/v0"
'(/v0' +
// Allow, but don't require, an extension under the v0 directory.
// We explicitly forbid the `experiments` and `validator` "extension".
'(?:/(?!experiments|validator).+)?' +
// Require text ".js" at the end.
'\\.js)$');

/**
 * Determines if a URL is a request to a CDN JS file.
 *
 * @param {string} url
 * @return {boolean}
 * @visibleForTesting
 */

function isCdnJsFile(url) {
  return CDN_JS_REGEX.test(url);
}

/**
 * Returns the environment of the RTV.
 * @param {!RtvVersion} rtv
 * @return {!RtvEnvironment}
 */
function rtvEnvironment(rtv) {
  return rtv.substr(0, 2);
}

/**
 * Extracts the data from the request URL.
 * @param {string} url
 * @return {{
 *   explicitRtv: !RtvVersion,
 *   pathname: string,
 *   rtv: !RtvVersion,
 * }|null}
 * @visibleForTesting
 */

function requestData(url) {
  var match = CDN_JS_REGEX.exec(url);
  if (!match) {
    return null;
  }
  var data = {
    explicitRtv: match[1] || '',
    pathname: match[2],
    rtv: match[1] || BASE_RTV_VERSION
  };
  return data;
}

/**
 * Returns the URL with the requested version changed to `version`.
 *
 * @param {string} url
 * @param {!RtvVersion} version
 * @return {string}
 * @visibleForTesting
 */

function urlWithVersion(url, version) {
  var data = requestData(url);
  if (!data) {
    return url;
  }
  var explicitRtv = data.explicitRtv;
  var pathname = data.pathname;

  if (explicitRtv) {
    return url.replace(explicitRtv, version);
  }
  return url.replace(pathname, '/rtv/' + version + pathname);
}

/**
 * Normalizes the request to a new RTV version. This handles changing the
 * request from one version to another, or rewriting an unversioned request to
 * a versioned.
 *
 * @param {!Request} request
 * @param {!RtvVersion} version
 * @return {!Request}
 */
function normalizedRequest(request, version) {
  var url = request.url;
  var data = requestData(url);
  if (data && data.explicitRtv === version) {
    return request;
  }

  return new Request(urlWithVersion(url, version), {
    // For Foreign Fetch, constructing a request using an origin that does
    // not match the SW's is mutinous.
    referer: _config.urls.cdn + '/sw.js',
    headers: request.headers,
    method: request.method,
    mode: request.mode,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    integrity: request.integrity
  });
}

/**
 * Determines if a AMP version is blacklisted.
 * @param {!RtvVersion} version
 * @return {boolean}
 * @visibleForTesting
 */

function isBlacklisted(version) {
  /**
   * Trim the RTV perfix.
   * @type {AmpVersion}
   */
  var ampVersion = version.substr(2);
  return BLACKLIST.indexOf(ampVersion) > -1;
}

/**
 * Generates a clientId for Foreign Fetchs, since one is not provided.
 *
 * The current strategy is to batch all requests from referrer that happen
 * within 60 seconds (of the first request) into one clientId.
 *
 * @param {string} referrer
 * @return {string}
 * @visibleForTesting
 */

function generateFallbackClientId(referrer) {
  var now = Date.now();
  var lastRequestTime = referrersLastRequestTime[referrer] || 0;

  // If last request was more than 60 seconds ago, we are now in a new
  // "clientId".
  if (lastRequestTime < now - 60 * 1000) {
    lastRequestTime = referrersLastRequestTime[referrer] = now;
  }

  return referrer + lastRequestTime;
}

/**
 * Fetches a URL, and stores it into the cache if the response is valid.
 * Repeated fetches of the same URL will be batched into a single request while
 * the first is still fetching.
 *
 * @param {!Cache} cache
 * @param {!Request} request
 * @return {!Promise<!Response>}
 * @visibleForTesting
 */

function fetchAndCache(cache, request) {
  var url = request.url;

  // Batch fetches. Mainly for the /diversions endpoint.
  if (fetchPromises[url]) {
    return fetchPromises[url].then(function () {
      return cache.match(request);
    });
  }

  return fetchPromises[url] = cache.match(request).then(function (response) {
    if (response && !expired(response)) {
      delete fetchPromises[url];
      return response;
    }

    return fetch(request).then(function (response) {
      delete fetchPromises[url];

      // Did we receive a invalid response?
      if (!response.ok) {
        throw new Error('fetching ' + url + ' failed with statusCode ' + (response.status + '.'));
      }

      // You must clone to prevent double reading the body.
      cache.put(request, response.clone());
      return response;
    }, function (err) {
      delete fetchPromises[url];
      throw err;
    });
  });
}

/**
 * Checks if a (valid) response has expired.
 *
 * @param {!Response} response
 * @return {boolean}
 * @visibleForTesting
 */

function expired(response) {
  var headers = response.headers;

  if (!headers.has('date') || !headers.has('cache-control')) {
    return true;
  }

  var maxAge = /max-age=(\d+)/i.exec(headers.get('cache-control'));
  var date = headers.get('date');
  var age = maxAge ? maxAge[1] * 1000 : -Infinity;
  return Date.now() >= Number(new Date(date)) + age;
}

/**
 * Returns the active percent diversions.
 *
 * @param {!Cache} cache
 * @return {!Promise<!Array<!RtvVersion>>}
 * @visibleForTesting
 */

function diversions(cache) {
  var request = new Request(_config.urls.cdn + '/diversions');

  return fetchAndCache(cache, request).then(function (response) {
    return response.json();
  }).then(function (diversions) {
    if (!Array.isArray(diversions)) {
      return null;
    }

    return diversions;
  }, function () {
    return null;
  });
}

/*
 * Resets clientsVersion, referrersLastRequestTime, and fetchPromises.
 * @visibleForTesting
 */

function resetMemosForTesting() {
  for (var key in clientsVersion) {
    delete clientsVersion[key];
  }
  for (var key in referrersLastRequestTime) {
    delete referrersLastRequestTime[key];
  }
  for (var key in fetchPromises) {
    delete fetchPromises[key];
  }
}

/**
 * A promise to open up our CDN JS cache, which will be resolved before any
 * requests are intercepted by the SW.
 *
 * @type {!Promise}
 */
var cachePromise = self.caches.open('cdn-js').then(function (result) {
  exports.cache = exports.cache = exports.cache = exports.cache = cache = result;
});

/**
 * Fetches the request, and stores it in the cache. Since we only store one
 * version of each file, we'll purge all older versions after we cache this.
 *
 * @param {!Cache} cache
 * @param {!Request} request
 * @param {!RtvVersion} requestVersion the version of the request
 * @param {string} requestPath the pathname of the request
 * @return {!Promise<!Response>}
 * @visibleForTesting
 */

function fetchJsFile(cache, request, requestVersion, requestPath) {
  // TODO(jridgewell): we should also fetch this requestVersion for all files
  // we know about.
  return fetchAndCache(cache, request).then(function (response) {
    // Fetch all diversions of this file.
    // This intentionally does not block the request resolution to speed
    // things up.
    diversions(cache).then(function (diversions) {
      // Prune old versions from the cache.
      // This also purges old diversions of other scripts, see `purge` for
      // detailed information.
      purge(cache, requestVersion, requestPath, diversions);

      if (!diversions) {
        return;
      }
      var p = new Promise(function (resolve) {
        // Delay initial diversions requests by 10 seconds.
        // This is because diversions are low priority compared to page
        // content.
        setTimeout(resolve, 10000);
      });

      var _loop = function (i) {
        p = p.then(function () {
          var diversionRequest = normalizedRequest(request, diversions[i]);
          return fetchAndCache(cache, diversionRequest);
        });
      };

      for (var i = 0; i < diversions.length; i++) {
        _loop(i);
      }
    });

    return response;
  });
}

/**
 * Purges our cache of old files.
 *
 * @param {!Cache} cache
 * @param {!RtvVersion} version
 * @param {string} pathname
 * @param {?Array<!RtvVersion>} diversions
 * @return {!Promise<undefined>}
 */
function purge(cache, version, pathname, diversions) {
  return cache.keys().then(function (requests) {
    var downloadedEnv = rtvEnvironment(version);

    for (var i = 0; i < requests.length; i++) {
      var request = requests[i];
      var url = request.url;
      var cachedData = requestData(url);
      if (!cachedData) {
        continue;
      }

      // We never delete files that match the version we just downloaded.
      if (version === cachedData.rtv) {
        continue;
      }

      var cachedEnv = rtvEnvironment(cachedData.rtv);
      var cachedIsProd = BASE_RTV_ENVIRONMENT === cachedEnv;

      if (cachedIsProd) {
        // We prune production environments based on the downloaded version.
        // But, if we downloaded a diversion, we have no information on what
        // the current production version is. So, don't delete the production
        // script.
        if (BASE_RTV_ENVIRONMENT !== downloadedEnv) {
          continue;
        }

        // We only purge the old version of the newly downloaded file.
        // This is because we might request this particular other script later
        // on in this request, and will purge it then.
        if (pathname !== cachedData.pathname) {
          continue;
        }
      } else {
        // We will only delete a diversion if we know for certain the versions
        // that are diversions.
        if (!diversions || diversions.includes(cachedData.rtv)) {
          continue;
        }
      }

      // At this point, we know the cached file is either:
      // - An old production env of the newly downloaded script.
      // - An old diversion.
      // Importantly, it CANNOT be one of the following:
      // - The same version as the newly fetched script (This is the current
      //   production version or a current diversion).
      // - Any production version when we downloaded a diversion.
      // - Any production version of any other script.
      // - A current diversion, or a suspected diversion.
      cache['delete'](request);
    }
  });
}

/**
 * Gets the version we want to serve for this client. We attempt to serve the
 * version with the most cached files, with a additional weight given to the
 * main binary and the first requested file.
 *
 * @param {!Cache} cache
 * @param {!RtvVersion} requestVersion
 * @param {string} requestPath
 * @return {!Promise<!RtvVersion>}
 * @visibleForTesting
 */

function getCachedVersion(cache, requestVersion, requestPath) {
  var requestEnv = rtvEnvironment(requestVersion);
  // If a request comes in for a version that does not match the SW's
  // environment (eg, a percent diversion when the SW is using the production
  // env), we must serve with the requested version.
  if (requestEnv !== BASE_RTV_ENVIRONMENT) {
    return Promise.resolve(requestVersion);
  }

  // TODO(jridgewell): Maybe we should add a very short delay (~5ms) to collect
  // several requests. Then, use all requests to determine what to serve.
  return cache.keys().then(function (requests) {
    var counts = {};
    var most = requestVersion;
    var mostCount = 0;

    // Generates a weighted maximum version, ie the version with the most
    // cached files. Given every file we've cached, determine what version
    // it is, and increment the number of files we have for that version.
    for (var i = 0; i < requests.length; i++) {
      var url = requests[i].url;
      var data = requestData(url);
      if (!data) {
        continue;
      }

      var pathname = data.pathname;
      var rtv = data.rtv;

      // We will not stale serve a version that does not match the request's
      // environment. This is so cached percent diversions will not be "stale"
      // served when requesting a production script.
      if (requestEnv !== rtvEnvironment(rtv)) {
        continue;
      }

      // We do not want to stale serve blacklisted files. If nothing else is
      // cached, we will end up serving whatever version is requested.
      if (isBlacklisted(rtv)) {
        continue;
      }

      var count = counts[rtv] || 0;

      // Incrementing the number of "files" that have this version with a
      // weight.
      // The main binary (arguably the most important file to cache) is given a
      // heavy weight, while the first requested file is given a slight weight.
      // Everything else increments normally.
      if (!pathname.includes('/', 1)) {
        // Main binary
        count += 5;
      } else if (requestPath === pathname) {
        // Give a little precedence to the requested file
        count += 2;
      } else {
        count++;
      }

      counts[rtv] = count;
      if (count > mostCount) {
        most = rtv;
        mostCount = count;
      }
    }

    return most;
  });
}

/**
 * Handles fetching the request from Cache, or fetching and caching from the
 * Cache CDN, if we care about the request.
 * My assumptions:
 *   - Doc requests one uniform AMP release version for all files, anything
 *     else is malarkey.
 *   - The requested version is always the newest AMP version.
 *
 * @param {!Request} request
 * @param {string|undefined} maybeClientId
 * @return {?Promise<!Response>}
 * @visibleForTesting
 */

function handleFetch(request, maybeClientId) {
  var url = request.url;
  // We only cache CDN JS files, and we need a clientId to do our magic.
  var data = requestData(url);

  if (!maybeClientId || !data) {
    return null;
  }

  // Closure Compiler!
  var clientId = /** @type {string} */maybeClientId;
  var pathname = data.pathname;
  var rtv = data.rtv;

  // Rewrite unversioned requests to the versioned RTV URL. This is a noop if
  // it's already versioned.
  request = normalizedRequest(request, rtv);

  // Wait for the cachePromise to resolve. This is necessary
  // since the SW thread may be killed and restarted at any time.
  return (/** @type {!Promise<!Response>} */cachePromise.then(function () {
      // If we already registered this client, we must always use the same
      // version.
      if (clientsVersion[clientId]) {
        return clientsVersion[clientId];
      }

      // If not, let's find the version to serve up.
      return clientsVersion[clientId] = getCachedVersion(cache, rtv, pathname);
    }).then(function (version) {
      var versionedRequest = normalizedRequest(request, version);

      return cache.match(versionedRequest).then(function (response) {
        // Cache hit!
        if (response) {
          // Now, was it because we served an old cached version or because
          // they requested this exact version; If we served an old version,
          // let's get the new one.
          if (version !== rtv && rtv == BASE_RTV_VERSION) {
            fetchJsFile(cache, request, rtv, pathname);
          }

          return response;
        }

        // If not, let's fetch and cache the request.
        return fetchJsFile(cache, versionedRequest, version, pathname);
      });
    })['catch'](function (err) {
      // Throw error out of band.
      Promise.reject(err);
      throw err;
    })
  );
}

self.addEventListener('install', function (install) {
  install.waitUntil(cachePromise);
  // Registers the SW for Foreign Fetch events, if they are supported.
  if (install.registerForeignFetch) {
    install.registerForeignFetch({
      scopes: [/** @type {!ServiceWorkerGlobalScope} */self.registration.scope],
      origins: ['*']
    });
  }
});

// Setup the Fetch listener, for when the client is on the CDN origin.
self.addEventListener('fetch', function (event) {
  var response = handleFetch(event.request, event.clientId);

  // We only get a response promise back if it's a request we care to cache.
  if (!response) {
    return;
  }

  event.respondWith(response);
});

// Setup the Foreign Fetch listener, for when the client is on a Publisher
// origin.
self.addEventListener('foreignfetch', function (event) {
  var response = handleFetch(event.request, event.clientId || generateFallbackClientId(event.request.referrer));

  // We only get a response promise back if it's a request we care to cache.
  if (!response) {
    return;
  }

  event.respondWith(response.then(function (resp) {
    // Foreign Fetch requires a { response: !Response } object.
    return {
      response: resp,
      // This allows CORS requests, if one were to come in.
      origin: event.origin
    };
  }));
});

},{"../../third_party/babel/custom-babel-helpers":3,"../config":1}],3:[function(require,module,exports){
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

//# sourceMappingURL=cache-service-worker-0.1.max.js.map