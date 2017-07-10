(self.AMP=self.AMP||[]).push({n:"amp-ad-network-doubleclick-impl",v:"1499663230322",f:(function(AMP){(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

var _extensionsAmpAdNetworkAdsenseImpl01AdsenseA4aConfig = require('../extensions/amp-ad-network-adsense-impl/0.1/adsense-a4a-config');

var _extensionsAmpAdNetworkDoubleclickImpl01DoubleclickA4aConfig = require('../extensions/amp-ad-network-doubleclick-impl/0.1/doubleclick-a4a-config');

var _extensionsAmpAdNetworkFakeImpl01FakeA4aConfig = require('../extensions/amp-ad-network-fake-impl/0.1/fake-a4a-config');

var _extensionsAmpAdNetworkTripleliftImpl01TripleliftA4aConfig = require('../extensions/amp-ad-network-triplelift-impl/0.1/triplelift-a4a-config');

var _extensionsAmpAdNetworkCloudflareImpl01CloudflareA4aConfig = require('../extensions/amp-ad-network-cloudflare-impl/0.1/cloudflare-a4a-config');

var _extensionsAmpAdNetworkGmosspImpl01GmosspA4aConfig = require('../extensions/amp-ad-network-gmossp-impl/0.1/gmossp-a4a-config');

var _srcMode = require('../src/mode');

var _srcUtilsObject = require('../src/utils/object');

/**
 * Registry for A4A (AMP Ads for AMPHTML pages) "is supported" predicates.
 * If an ad network, {@code ${NETWORK}}, is registered in this object, then the
 * {@code <amp-ad type="${NETWORK}">} implementation will look up its predicate
 * here. If there is a predicate and it and returns {@code true}, then
 * {@code amp-ad} will attempt to render the ad via the A4A pathway (fetch
 * ad creative via early XHR CORS request; verify that it is validated AMP;
 * and then render directly in the host page by splicing into the host DOM).
 * Otherwise, it will attempt to render the ad via the existing "3p iframe"
 * pathway (delay load into a cross-domain iframe).
 *
 * @type {!Object<!string, !function(!Window, !Element): boolean>}
 */
var a4aRegistry = _srcUtilsObject.map({
  'adsense': _extensionsAmpAdNetworkAdsenseImpl01AdsenseA4aConfig.adsenseIsA4AEnabled,
  'doubleclick': _extensionsAmpAdNetworkDoubleclickImpl01DoubleclickA4aConfig.doubleclickIsA4AEnabled,
  'triplelift': _extensionsAmpAdNetworkTripleliftImpl01TripleliftA4aConfig.tripleliftIsA4AEnabled,
  'cloudflare': _extensionsAmpAdNetworkCloudflareImpl01CloudflareA4aConfig.cloudflareIsA4AEnabled,
  'gmossp': _extensionsAmpAdNetworkGmosspImpl01GmosspA4aConfig.gmosspIsA4AEnabled
});

exports.a4aRegistry = a4aRegistry;
// Note: the 'fake' ad network implementation is only for local testing.
// Normally, ad networks should add their *IsA4AEnabled callback directly
// to the a4aRegistry, above.  Ad network implementations should NOT use
// getMode() in this file.  If they need to check getMode() state, they
// should do so inside their *IsA4AEnabled callback.
// TODO: Add new ad network implementation "is enabled" functions here.  Note:
// if you add a function here that requires a new "import", above, you'll
// probably also need to add a whitelist exception to
// build-system/dep-check-config.js in the "filesMatching: 'ads/**/*.js' rule.
if (_srcMode.getMode().localDev || _srcMode.getMode().test) {
  a4aRegistry['fake'] = _extensionsAmpAdNetworkFakeImpl01FakeA4aConfig.fakeIsA4AEnabled;
}

/**
 * An object mapping signing server names to their corresponding URLs.
 * @type {!Object<string, string>}
 */
var signingServerURLs = {
  'google': 'https://cdn.ampproject.org/amp-ad-verifying-keyset.json',
  'google-dev': 'https://cdn.ampproject.org/amp-ad-verifying-keyset-dev.json',
  'cloudflare': 'https://amp.cloudflare.com/amp-ad-verifying-keyset.json',
  'cloudflare-dev': 'https://amp.cloudflare.com/amp-ad-verifying-keyset-dev.json'
};
exports.signingServerURLs = signingServerURLs;

},{"../extensions/amp-ad-network-adsense-impl/0.1/adsense-a4a-config":15,"../extensions/amp-ad-network-cloudflare-impl/0.1/cloudflare-a4a-config":16,"../extensions/amp-ad-network-doubleclick-impl/0.1/doubleclick-a4a-config":18,"../extensions/amp-ad-network-fake-impl/0.1/fake-a4a-config":19,"../extensions/amp-ad-network-gmossp-impl/0.1/gmossp-a4a-config":20,"../extensions/amp-ad-network-triplelift-impl/0.1/triplelift-a4a-config":21,"../src/mode":51,"../src/utils/object":75}],2:[function(require,module,exports){
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
 * @typedef {{
 *   prefetch: (string|undefined),
 *   preconnect: (string|undefined),
 *   renderStartImplemented: (boolean|undefined),
 *   clientIdScope: (string|undefined),
 *   clientIdCookieName: (string|undefined),
 * }}
 */
var AdNetworkConfigDef = undefined;

/**
 * The config of each ad network.
 * Please keep the list alphabetic order.
 *
 * yourNetworkName: {  // This is the "type" attribute of <amp-ad>
 *
 *   // List of URLs for prefetch
 *   prefetch: string|array
 *
 *   // List of hosts for preconnect
 *   preconnect: string|array
 *
 *   // The scope used to provide CIDs to ads
 *   clientIdScope: string
 *
 *  // The cookie name to store the CID. In absence, `clientIdScope` is used.
 *   clientIdCookieName: string
 *
 *   // Whether render-start API has been implemented
 *   // We highly recommend all networks to implement the API,
 *   // see details in the README.md
 *   renderStartImplemented: boolean
 * }
 *
 * @const {!Object<string, !AdNetworkConfigDef>}}
 */
var adConfig = {
  _ping_: {
    renderStartImplemented: true
  },

  a8: {
    prefetch: 'https://statics.a8.net/amp/ad.js',
    renderStartImplemented: true
  },

  a9: {
    prefetch: 'https://c.amazon-adsystem.com/aax2/assoc.js'
  },

  accesstrade: {
    prefetch: 'https://h.accesstrade.net/js/amp/amp.js'
  },

  adblade: {
    prefetch: 'https://web.adblade.com/js/ads/async/show.js',
    preconnect: ['https://staticd.cdn.adblade.com', 'https://static.adblade.com'],
    renderStartImplemented: true
  },

  adbutler: {
    prefetch: 'https://servedbyadbutler.com/app.js'
  },

  adform: {},

  adfox: {
    prefetch: 'https://yastatic.net/pcode/adfox/loader.js',
    renderStartImplemented: true
  },

  adgeneration: {
    prefetch: 'https://i.socdm.com/sdk/js/adg-script-loader.js'
  },

  adhese: {
    renderStartImplemented: true
  },

  adition: {},

  adman: {},

  admanmedia: {
    renderStartImplemented: true
  },

  adreactor: {},

  adsense: {
    prefetch: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    preconnect: 'https://googleads.g.doubleclick.net',
    clientIdScope: 'AMP_ECID_GOOGLE',
    clientIdCookieName: '_ga'
  },

  adsnative: {
    prefetch: 'https://static.adsnative.com/static/js/render.v1.js',
    preconnect: 'https://api.adsnative.com'
  },

  adspeed: {
    preconnect: 'https://g.adspeed.net',
    renderStartImplemented: true
  },

  adspirit: {},

  adstir: {
    prefetch: 'https://js.ad-stir.com/js/adstir_async.js',
    preconnect: 'https://ad.ad-stir.com'
  },

  adtech: {
    prefetch: 'https://s.aolcdn.com/os/ads/adsWrapper3.js',
    preconnect: ['https://mads.at.atwola.com', 'https://aka-cdn.adtechus.com']
  },

  adthrive: {
    prefetch: ['https://www.googletagservices.com/tag/js/gpt.js'],
    preconnect: ['https://partner.googleadservices.com', 'https://securepubads.g.doubleclick.net', 'https://tpc.googlesyndication.com'],
    renderStartImplemented: true
  },

  aduptech: {
    prefetch: 'https://s.d.adup-tech.com/jsapi',
    preconnect: ['https://d.adup-tech.com', 'https://m.adup-tech.com'],
    renderStartImplemented: true
  },

  adverline: {
    prefetch: 'https://ads.adverline.com/richmedias/amp.js',
    preconnect: ['https://adnext.fr'],
    renderStartImplemented: true
  },

  adverticum: {},

  advertserve: {
    renderStartImplemented: true
  },

  affiliateb: {
    prefetch: 'https://track.affiliate-b.com/amp/a.js',
    renderStartImplemented: true
  },

  amoad: {
    prefetch: ['https://j.amoad.com/js/a.js', 'https://j.amoad.com/js/n.js'],
    preconnect: ['https://d.amoad.com', 'https://i.amoad.com', 'https://m.amoad.com', 'https://v.amoad.com']
  },

  appnexus: {
    prefetch: 'https://acdn.adnxs.com/ast/ast.js',
    preconnect: 'https://ib.adnxs.com'
  },

  atomx: {
    prefetch: 'https://s.ato.mx/p.js'
  },

  bidtellect: {},

  brainy: {},

  bringhub: {
    renderStartImplemented: true,
    preconnect: ['https://static.bh-cdn.com', 'https://core-api.bringhub.io']
  },

  caajainfeed: {
    prefetch: ['https://cdn.amanad.adtdp.com/sdk/ajaamp.js'],
    preconnect: ['https://ad.amanad.adtdp.com']
  },

  capirs: {
    renderStartImplemented: true
  },

  caprofitx: {
    prefetch: ['https://cdn.caprofitx.com/pfx.min.js', 'https://cdn.caprofitx.com/tags/amp/profitx_amp.js'],
    preconnect: 'https://ad.caprofitx.adtdp.com'
  },

  chargeads: {},

  colombia: {
    prefetch: 'https://static.clmbtech.com/ad/commons/js/colombia-amp.js'
  },

  contentad: {},

  criteo: {
    prefetch: 'https://static.criteo.net/js/ld/publishertag.js',
    preconnect: 'https://cas.criteo.com'
  },

  csa: {
    prefetch: 'https://www.google.com/adsense/search/ads.js'
  },

  distroscale: {
    preconnect: ['https://c.jsrdn.com', 'https://s.jsrdn.com', 'https://i.jsrdn.com'],
    renderStartImplemented: true
  },

  dotandads: {
    prefetch: 'https://amp.ad.dotandad.com/dotandadsAmp.js',
    preconnect: 'https://bal.ad.dotandad.com'
  },

  doubleclick: {
    prefetch: ['https://www.googletagservices.com/tag/js/gpt.js', 'https://securepubads.g.doubleclick.net/static/glade.js'],
    preconnect: ['https://partner.googleadservices.com', 'https://tpc.googlesyndication.com'],
    clientIdScope: 'AMP_ECID_GOOGLE',
    clientIdCookieName: '_ga',
    renderStartImplemented: true
  },

  eas: {
    prefetch: 'https://amp.emediate.eu/amp.v0.js',
    renderStartImplemented: true
  },

  eplanning: {
    prefetch: 'https://us.img.e-planning.net/layers/epl-amp.js'
  },

  ezoic: {
    prefetch: ['https://www.googletagservices.com/tag/js/gpt.js', 'https://g.ezoic.net/ezoic/ampad.js'],
    clientIdScope: 'AMP_ECID_EZOIC'
  },

  f1e: {
    prefetch: 'https://img.ak.impact-ad.jp/util/f1e_amp.min.js'
  },

  f1h: {
    preconnect: 'https://img.ak.impact-ad.jp',
    renderStartImplemented: true
  },

  fake: {},

  felmat: {
    prefetch: 'https://t.felmat.net/js/fmamp.js',
    renderStartImplemented: true
  },

  flite: {},

  fluct: {
    preconnect: ['https://cdn-fluct.sh.adingo.jp', 'https://s.sh.adingo.jp', 'https://i.adingo.jp']
  },

  fusion: {
    prefetch: 'https://assets.adtomafusion.net/fusion/latest/fusion-amp.min.js'
  },

  genieessp: {
    prefetch: 'https://js.gsspcln.jp/l/amp.js'
  },

  gmossp: {
    prefetch: 'https://cdn.gmossp-sp.jp/ads/amp.js'
  },

  gumgum: {
    prefetch: 'https://g2.gumgum.com/javascripts/ad.js',
    renderStartImplemented: true
  },

  holder: {
    prefetch: 'https://i.holder.com.ua/js2/holder/ajax/ampv1.js',
    preconnect: 'https://h.holder.com.ua',
    renderStartImplemented: true
  },

  ibillboard: {},

  imedia: {
    prefetch: 'https://i.imedia.cz/js/im3.js',
    renderStartImplemented: true
  },

  imobile: {
    prefetch: 'https://spamp.i-mobile.co.jp/script/amp.js',
    preconnect: 'https://spad.i-mobile.co.jp'
  },

  improvedigital: {},

  industrybrains: {
    prefetch: 'https://web.industrybrains.com/js/ads/async/show.js',
    preconnect: ['https://staticd.cdn.industrybrains.com', 'https://static.industrybrains.com'],
    renderStartImplemented: true
  },

  inmobi: {
    prefetch: 'https://cf.cdn.inmobi.com/ad/inmobi.secure.js',
    renderStartImplemented: true
  },

  ix: {
    prefetch: ['https://js-sec.indexww.com/apl/amp.js'],
    preconnect: 'https://as-sec.casalemedia.com',
    renderStartImplemented: true
  },

  kargo: {},

  kiosked: {
    renderStartImplemented: true
  },

  kixer: {
    prefetch: 'https://cdn.kixer.com/ad/load.js',
    renderStartImplemented: true
  },

  ligatus: {
    prefetch: 'https://ssl.ligatus.com/render/ligrend.js',
    renderStartImplemented: true
  },

  loka: {
    prefetch: 'https://loka-cdn.akamaized.net/scene/amp.js',
    preconnect: ['https://scene-front.lokaplatform.com', 'https://loka-materials.akamaized.net'],
    renderStartImplemented: true
  },

  mads: {
    prefetch: 'https://eu2.madsone.com/js/tags.js'
  },

  'mantis-display': {
    prefetch: 'https://assets.mantisadnetwork.com/mantodea.min.js',
    preconnect: ['https://mantodea.mantisadnetwork.com', 'https://res.cloudinary.com', 'https://resize.mantisadnetwork.com']
  },

  'mantis-recommend': {
    prefetch: 'https://assets.mantisadnetwork.com/recommend.min.js',
    preconnect: ['https://mantodea.mantisadnetwork.com', 'https://resize.mantisadnetwork.com']
  },

  mediaimpact: {
    prefetch: 'https://ec-ns.sascdn.com/diff/251/pages/amp_default.js',
    preconnect: ['https://ww251.smartadserver.com', 'https://static.sascdn.com/'],
    renderStartImplemented: true
  },

  medianet: {
    preconnect: 'https://contextual.media.net',
    renderStartImplemented: true
  },

  mediavine: {
    prefetch: 'https://www.googletagservices.com/tag/js/gpt.js',
    preconnect: ['https://partner.googleadservices.com', 'https://securepubads.g.doubleclick.net', 'https://tpc.googlesyndication.com'],
    renderStartImplemented: true
  },

  meg: {
    renderStartImplemented: true
  },

  microad: {
    prefetch: 'https://j.microad.net/js/camp.js',
    preconnect: ['https://s-rtb.send.microad.jp', 'https://s-rtb.send.microadinc.com', 'https://cache.send.microad.jp', 'https://cache.send.microadinc.com', 'https://deb.send.microad.jp']
  },

  mixpo: {
    prefetch: 'https://cdn.mixpo.com/js/loader.js',
    preconnect: ['https://player1.mixpo.com', 'https://player2.mixpo.com']
  },

  mywidget: {
    preconnect: 'https://likemore-fe.go.mail.ru',
    prefetch: 'https://likemore-go.imgsmail.ru/widget.amp.js',
    renderStartImplemented: true
  },

  nativo: {
    prefetch: 'https://s.ntv.io/serve/load.js'
  },

  navegg: {
    renderStartImplemented: true
  },

  nend: {
    prefetch: 'https://js1.nend.net/js/amp.js',
    preconnect: ['https://output.nend.net', 'https://img1.nend.net']
  },

  netletix: {
    preconnect: ['https://call.netzathleten-media.de'],
    renderStartImplemented: true
  },

  nokta: {
    prefetch: 'https://static.virgul.com/theme/mockups/noktaamp/ampjs.js',
    renderStartImplemented: true
  },

  openadstream: {},

  openx: {
    prefetch: 'https://www.googletagservices.com/tag/js/gpt.js',
    preconnect: ['https://partner.googleadservices.com', 'https://securepubads.g.doubleclick.net', 'https://tpc.googlesyndication.com'],
    renderStartImplemented: true
  },

  outbrain: {
    renderStartImplemented: true,
    prefetch: 'https://widgets.outbrain.com/widgetAMP/outbrainAMP.min.js',
    preconnect: ['https://odb.outbrain.com']
  },

  plista: {},

  polymorphicads: {
    prefetch: 'https://www.polymorphicads.jp/js/amp.js',
    preconnect: ['https://img.polymorphicads.jp', 'https://ad.polymorphicads.jp'],
    renderStartImplemented: true
  },

  popin: {
    renderStartImplemented: true
  },

  pubmatic: {
    prefetch: 'https://ads.pubmatic.com/AdServer/js/amp.js'
  },

  pubmine: {
    prefetch: ['https://s.pubmine.com/head.js', 'https://s.pubmine.com/showad.js'],
    preconnect: 'https://delivery.g.switchadhub.com',
    renderStartImplemented: true
  },

  pulsepoint: {
    prefetch: 'https://ads.contextweb.com/TagPublish/getjs.static.js',
    preconnect: 'https://tag.contextweb.com'
  },

  purch: {
    prefetch: 'https://ramp.purch.com/serve/creative_amp.js',
    renderStartImplemented: true
  },

  relap: {
    renderStartImplemented: true
  },

  revcontent: {
    prefetch: 'https://labs-cdn.revcontent.com/build/amphtml/revcontent.amp.min.js',
    preconnect: ['https://trends.revcontent.com', 'https://cdn.revcontent.com', 'https://img.revcontent.com'],
    renderStartImplemented: true
  },

  rubicon: {},

  sharethrough: {
    renderStartImplemented: true
  },

  sklik: {
    prefetch: 'https://c.imedia.cz/js/amp.js'
  },

  slimcutmedia: {
    preconnect: ['https://sb.freeskreen.com', 'https://static.freeskreen.com', 'https://video.freeskreen.com'],
    renderStartImplemented: true
  },

  smartadserver: {
    prefetch: 'https://ec-ns.sascdn.com/diff/js/amp.v0.js',
    preconnect: 'https://static.sascdn.com',
    renderStartImplemented: true
  },

  smartclip: {
    prefetch: 'https://cdn.smartclip.net/amp/amp.v0.js',
    preconnect: 'https://des.smartclip.net',
    renderStartImplemented: true
  },

  sortable: {
    prefetch: 'https://www.googletagservices.com/tag/js/gpt.js',
    preconnect: ['https://tags-cdn.deployads.com', 'https://partner.googleadservices.com', 'https://securepubads.g.doubleclick.net', 'https://tpc.googlesyndication.com'],
    renderStartImplemented: true
  },

  sovrn: {
    prefetch: 'https://ap.lijit.com/www/sovrn_amp/sovrn_ads.js'
  },

  spotx: {
    preconnect: 'https://js.spotx.tv',
    renderStartImplemented: true
  },

  sunmedia: {
    prefetch: 'https://vod.addevweb.com/sunmedia/amp/ads/sunmedia.js',
    preconnect: 'https://static.addevweb.com',
    renderStartImplemented: true
  },

  swoop: {
    prefetch: 'https://www.swoop-amp.com/amp.js',
    preconnect: ['https://www.swpsvc.com', 'https://client.swpcld.com'],
    renderStartImplemented: true
  },

  taboola: {},

  teads: {
    prefetch: 'https://cdn.teads.tv/media/format/v3/teads-format.min.js',
    preconnect: ['https://cdn2.teads.tv', 'https://a.teads.tv', 'https://t.teads.tv']
  },

  triplelift: {},

  valuecommerce: {
    prefetch: 'https://amp.valuecommerce.com/amp_bridge.js',
    preconnect: ['https://ad.jp.ap.valuecommerce.com'],
    renderStartImplemented: true
  },

  webediads: {
    prefetch: 'https://eu1.wbdds.com/amp.min.js',
    preconnect: ['https://goutee.top', 'https://mediaathay.org.uk'],
    renderStartImplemented: true
  },

  'weborama-display': {
    prefetch: ['https://cstatic.weborama.fr/js/advertiserv2/adperf_launch_1.0.0_scrambled.js', 'https://cstatic.weborama.fr/js/advertiserv2/adperf_core_1.0.0_scrambled.js']
  },

  widespace: {},

  xlift: {
    prefetch: 'https://cdn.x-lift.jp/resources/common/xlift_amp.js',
    renderStartImplemented: true
  },

  yahoo: {
    prefetch: 'https://s.yimg.com/os/ampad/display.js',
    preconnect: 'https://us.adserver.yahoo.com'
  },

  yahoojp: {
    prefetch: ['https://s.yimg.jp/images/listing/tool/yads/ydn/amp/amp.js', 'https://yads.c.yimg.jp/js/yads.js'],
    preconnect: 'https://yads.yahoo.co.jp'
  },

  yandex: {
    prefetch: 'https://yastatic.net/partner-code/loaders/context_amp.js',
    renderStartImplemented: true
  },

  yieldbot: {
    prefetch: ['https://cdn.yldbt.com/js/yieldbot.intent.amp.js', 'https://msg.yldbt.com/js/ybmsg.html'],
    preconnect: 'https://i.yldbt.com'
  },

  yieldmo: {
    prefetch: 'https://static.yieldmo.com/ym.amp1.js',
    preconnect: ['https://s.yieldmo.com', 'https://ads.yieldmo.com'],
    renderStartImplemented: true
  },

  yieldone: {
    prefetch: 'https://img.ak.impact-ad.jp/ic/pone/commonjs/yone-amp.js'
  },

  zedo: {
    prefetch: 'https://ss3.zedo.com/gecko/tag/Gecko.amp.min.js',
    renderStartImplemented: true
  },

  zergnet: {},

  zucks: {
    preconnect: ['https://j.zucks.net.zimg.jp', 'https://sh.zucks.net', 'https://k.zucks.net', 'https://static.zucks.net.zimg.jp']
  }

};
exports.adConfig = adConfig;

},{}],3:[function(require,module,exports){
exports.__esModule = true;
exports.installAlpClickHandler = installAlpClickHandler;
exports.handleClick = handleClick;
exports.warmupStatic = warmupStatic;
exports.warmupDynamic = warmupDynamic;
exports.getA2AAncestor = getA2AAncestor;
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

var _srcUrl = require('../../src/url');

var _srcDom = require('../../src/dom');

var _srcLog = require('../../src/log');

var _srcUtilsObject = require('../../src/utils/object');

var _srcConfig = require('../../src/config');

var _srcString = require('../../src/string');

/**
 * Install a click listener that transforms navigation to the AMP cache
 * to a form that directly navigates to the doc and transmits the original
 * URL as a click logging info passed via a fragment param.
 * Expects to find a URL starting with "https://cdn.ampproject.org/c/"
 * to be available via a param call "adurl" (or defined by the
 * `data-url-param-name` attribute on the a tag.
 * @param {!Window} win
 */

function installAlpClickHandler(win) {
  win.document.documentElement.addEventListener('click', handleClick);
  // Start loading destination doc when finger is down.
  // Needs experiment whether this is a good idea.
  win.document.documentElement.addEventListener('touchstart', warmupDynamic);
}

/**
 * Filter click event and then transform URL for direct AMP navigation
 * with impression logging.
 * @param {!Event} e
 * @param {function(string)=} opt_viewerNavigate
 * @visibleForTesting
 */

function handleClick(e, opt_viewerNavigate) {
  if (e.defaultPrevented) {
    return;
  }
  // Only handle simple clicks with the left mouse button/touch and without
  // modifier keys.
  if (e.buttons != 0 && e.buttons != 1) {
    return;
  }
  if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) {
    return;
  }

  var link = getLinkInfo(e);
  if (!link || !link.eventualUrl) {
    return;
  }
  if (e.isTrusted === false) {
    return;
  }

  // Tag the original href with &amp=1 and make it a fragment param with
  // name click.
  var fragment = 'click=' + encodeURIComponent(_srcUrl.addParamToUrl(link.a.href, 'amp', '1', /* opt_addToFront */true));
  var destination = link.eventualUrl;
  if (link.eventualUrl.indexOf('#') == -1) {
    destination += '#' + fragment;
  } else {
    destination += '&' + fragment;
  }
  var win = link.a.ownerDocument.defaultView;
  var ancestors = win.location.ancestorOrigins;
  if (ancestors && ancestors[ancestors.length - 1] == 'http://localhost:8000') {
    destination = destination.replace(_srcUrl.parseUrl(link.eventualUrl).host + '/c/', 'http://localhost:8000/max/');
  }
  e.preventDefault();
  if (opt_viewerNavigate) {
    // TODO: viewer navigate only support navigating top level window to
    // destination. should we try to open a new window here with target=_blank
    // here instead of using viewer navigation.
    opt_viewerNavigate(destination);
  } else {
    navigateTo(win, link.a, destination);
  }
}

/**
 * For an event, see if there is an anchor tag in the target
 * ancestor chain and if yes, check whether we can figure
 * out an AMP target URL.
 * @param {!Event} e
 * @return {{
 *   eventualUrl: (string|undefined),
 *   a: !Element
 * }|undefined} A URL on the AMP Cache.
 */
function getLinkInfo(e) {
  var a = _srcDom.closest(_srcLog.dev().assertElement(e.target), function (element) {
    return element.tagName == 'A' && element.href;
  });
  if (!a) {
    return;
  }
  return {
    eventualUrl: getEventualUrl(a),
    a: a
  };
}

/**
 * Given an anchor tag, figure out whether this goes to an AMP destination
 * via a redirect.
 * @param {!Element} a An anchor tag.
 * @return {string|undefined} A URL on the AMP Cache.
 */
function getEventualUrl(a) {
  var urlParamName = a.getAttribute('data-url-param-name') || 'adurl';
  var eventualUrl = _srcUrl.parseQueryString(a.search)[urlParamName];
  if (!eventualUrl) {
    return;
  }
  if (!_srcUrl.isProxyOrigin(eventualUrl) || !_srcString.startsWith(_srcUrl.parseUrl(eventualUrl).pathname, '/c/')) {
    return;
  }
  return eventualUrl;
}

/**
 * Navigate to the given URL. Infers the target from the given anchor
 * tag.
 * @param {!Window} win
 * @param {!Element} a Anchor element
 * @param {string} url
 */
function navigateTo(win, a, url) {
  var target = (a.target || '_top').toLowerCase();
  var a2aAncestor = getA2AAncestor(win);
  if (a2aAncestor) {
    a2aAncestor.win. /*OK*/postMessage('a2a;' + JSON.stringify(_srcUtilsObject.dict({
      'url': url
    })), a2aAncestor.origin);
    return;
  }
  _srcDom.openWindowDialog(win, url, target);
}

/**
 * Establishes a connection to the AMP Cache and makes sure
 * the AMP JS is cached.
 * @param {!Window} win
 */

function warmupStatic(win) {
  // Preconnect using an image, because that works on all browsers.
  // The image has a 1 minute cache time to avoid duplicate
  // preconnects.
  new win.Image().src = _srcConfig.urls.cdn + '/preconnect.gif';
  // Preload the primary AMP JS that is render blocking.
  var linkRel = /*OK*/document.createElement('link');
  linkRel.rel = 'preload';
  linkRel.setAttribute('as', 'script');
  linkRel.href = _srcConfig.urls.cdn + '/v0.js';
  getHeadOrFallback(win.document).appendChild(linkRel);
}

/**
 * For events (such as touch events) that point to an eligible URL, preload
 * that URL.
 * @param {!Event} e
 * @visibleForTesting
 */

function warmupDynamic(e) {
  var link = getLinkInfo(e);
  if (!link || !link.eventualUrl) {
    return;
  }
  // Preloading with empty as and newly specced value `fetch` meaning the same
  // thing. `document` would be the right value, but this is not yet supported
  // in browsers.
  var linkRel0 = /*OK*/document.createElement('link');
  linkRel0.rel = 'preload';
  linkRel0.href = link.eventualUrl;
  var linkRel1 = /*OK*/document.createElement('link');
  linkRel1.rel = 'preload';
  linkRel1.as = 'fetch';
  linkRel1.href = link.eventualUrl;
  var head = getHeadOrFallback(e.target.ownerDocument);
  head.appendChild(linkRel0);
  head.appendChild(linkRel1);
}

/**
 * Return <head> if present or just the document element.
 * @param {!Document} doc
 * @return {!Element}
 */
function getHeadOrFallback(doc) {
  return doc.head || doc.documentElement;
}

/**
 * Returns info about an ancestor that can perform A2A navigations
 * or null if none is present.
 * @param {!Window} win
 * @return {?{
 *   win: !Window,
 *   origin: string,
 * }}
 */

function getA2AAncestor(win) {
  if (!win.location.ancestorOrigins) {
    return null;
  }
  var origins = win.location.ancestorOrigins;
  // We expect top, amp cache, ad (can be nested).
  if (origins.length < 2) {
    return null;
  }
  var top = origins[origins.length - 1];
  // Not a security property. We just check whether the
  // viewer might support A2A. More domains can be added to whitelist
  // as needed.
  if (top.indexOf('.google.') == -1) {
    return null;
  }
  var amp = origins[origins.length - 2];
  if (!_srcUrl.isProxyOrigin(amp) && !_srcUrl.isLocalhostOrigin(amp)) {
    return null;
  }
  return {
    win: getNthParentWindow(win, origins.length - 1),
    origin: amp
  };
}

/**
 * Returns the Nth parent of the given window.
 * @param {!Window} win
 * @param {number} distance frames above us.
 */
function getNthParentWindow(win, distance) {
  var parent = win;
  for (var i = 0; i < distance; i++) {
    parent = parent.parent;
  }
  return parent;
}

},{"../../src/config":31,"../../src/dom":35,"../../src/log":49,"../../src/string":66,"../../src/url":71,"../../src/utils/object":75}],4:[function(require,module,exports){
exports.__esModule = true;
exports.getLifecycleReporter = getLifecycleReporter;
exports.googleLifecycleReporterFactory = googleLifecycleReporterFactory;
exports.setGoogleLifecycleVarsFromHeaders = setGoogleLifecycleVarsFromHeaders;
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

var _utils = require('./utils');

var _performance = require('./performance');

var _srcExperiments = require('../../../src/experiments');

var _trafficExperiments = require('./traffic-experiments');

var _extensionsAmpAdNetworkAdsenseImpl01AdsenseA4aConfig = require('../../../extensions/amp-ad-network-adsense-impl/0.1/adsense-a4a-config');

var _extensionsAmpAdNetworkDoubleclickImpl01DoubleclickA4aConfig = require('../../../extensions/amp-ad-network-doubleclick-impl/0.1/doubleclick-a4a-config');

// eslint-disable-line max-len

/**
 * An experiment config for controlling profiling.  Profiling has no branches:
 * it's either on or off for a given page.  The off state is controlled by the
 * general traffic-experiments mechanism and is configured via the
 * a4aProfilingRate property of the global config(s),
 * build-system/global-configs/{canary,prod}-config.js.  This object is just
 * necessary for the page-level-experiments.js API, which expects a branch list
 * for each experiment.  We assign all pages to the "control" branch
 * arbitrarily.
 *
 * @const {!Object<string,!../../../src/experiments.ExperimentInfo>}
 */
var PROFILING_BRANCHES = {
  a4aProfilingRate: {
    isTrafficEligible: function () {
      return true;
    },
    branches: ['unused', 'unused']
  }
};

exports.PROFILING_BRANCHES = PROFILING_BRANCHES;
/**
 * Set of namespaces that can be set for lifecycle reporters.
 *
 * @enum {string}
 */
var ReporterNamespace = {
  A4A: 'a4a',
  AMP: 'amp'
};

exports.ReporterNamespace = ReporterNamespace;
/**
 * Check whether the element is in an experiment branch that is eligible for
 * monitoring.
 *
 * @param {!AMP.BaseElement} ampElement
 * @param {!string} namespace
 * @returns {boolean}
 */
function isInReportableBranch(ampElement, namespace) {
  var _reportableA4AEids, _reportableControlEids;

  // Handle the possibility of multiple eids on the element.
  var eids = _trafficExperiments.parseExperimentIds(ampElement.element.getAttribute(_utils.EXPERIMENT_ATTRIBUTE));
  var reportableA4AEids = (_reportableA4AEids = {}, _reportableA4AEids[_extensionsAmpAdNetworkAdsenseImpl01AdsenseA4aConfig.ADSENSE_A4A_EXTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH.experiment] = 1, _reportableA4AEids[_extensionsAmpAdNetworkAdsenseImpl01AdsenseA4aConfig.ADSENSE_A4A_INTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH.experiment] = 1, _reportableA4AEids[_extensionsAmpAdNetworkAdsenseImpl01AdsenseA4aConfig.ADSENSE_A4A_EXTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH.experiment] = 1, _reportableA4AEids[_extensionsAmpAdNetworkAdsenseImpl01AdsenseA4aConfig.ADSENSE_A4A_INTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH.experiment] = 1, _reportableA4AEids[_extensionsAmpAdNetworkDoubleclickImpl01DoubleclickA4aConfig.DOUBLECLICK_A4A_EXTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH.experiment] = 1, _reportableA4AEids[_extensionsAmpAdNetworkDoubleclickImpl01DoubleclickA4aConfig.DOUBLECLICK_A4A_INTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH.experiment] = 1, _reportableA4AEids[_extensionsAmpAdNetworkDoubleclickImpl01DoubleclickA4aConfig.DOUBLECLICK_A4A_EXTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH.experiment] = 1, _reportableA4AEids[_extensionsAmpAdNetworkDoubleclickImpl01DoubleclickA4aConfig.DOUBLECLICK_A4A_INTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH.experiment] = 1, _reportableA4AEids);
  var reportableControlEids = (_reportableControlEids = {}, _reportableControlEids[_extensionsAmpAdNetworkAdsenseImpl01AdsenseA4aConfig.ADSENSE_A4A_EXTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH.control] = 1, _reportableControlEids[_extensionsAmpAdNetworkAdsenseImpl01AdsenseA4aConfig.ADSENSE_A4A_INTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH.control] = 1, _reportableControlEids[_extensionsAmpAdNetworkAdsenseImpl01AdsenseA4aConfig.ADSENSE_A4A_EXTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH.control] = 1, _reportableControlEids[_extensionsAmpAdNetworkAdsenseImpl01AdsenseA4aConfig.ADSENSE_A4A_INTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH.control] = 1, _reportableControlEids[_extensionsAmpAdNetworkDoubleclickImpl01DoubleclickA4aConfig.DOUBLECLICK_A4A_EXTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH.control] = 1, _reportableControlEids[_extensionsAmpAdNetworkDoubleclickImpl01DoubleclickA4aConfig.DOUBLECLICK_A4A_INTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH.control] = 1, _reportableControlEids[_extensionsAmpAdNetworkDoubleclickImpl01DoubleclickA4aConfig.DOUBLECLICK_A4A_EXTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH.control] = 1, _reportableControlEids[_extensionsAmpAdNetworkDoubleclickImpl01DoubleclickA4aConfig.DOUBLECLICK_A4A_INTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH.control] = 1, _reportableControlEids);
  switch (namespace) {
    case ReporterNamespace.A4A:
      return eids.some(function (x) {
        return x in reportableA4AEids;
      }) || _trafficExperiments.isInManualExperiment(ampElement.element);
    case ReporterNamespace.AMP:
      return eids.some(function (x) {
        return x in reportableControlEids;
      });
    default:
      return false;
  }
}

/**
 * @param {!AMP.BaseElement} ampElement The element on whose lifecycle this
 *    reporter will be reporting.
 * @param {string} namespace
 * @param {number|string} slotId A unique numeric identifier in the page for
 *    the given element's slot.
 * @return {!./performance.BaseLifecycleReporter}
 * @visibleForTesting
 */

function getLifecycleReporter(ampElement, namespace, slotId) {
  _srcExperiments.randomlySelectUnsetExperiments(ampElement.win, PROFILING_BRANCHES);
  if (_utils.isReportingEnabled(ampElement) && isInReportableBranch(ampElement, namespace)) {
    return new _performance.GoogleAdLifecycleReporter(ampElement.win, ampElement.element, namespace, Number(slotId));
  } else {
    return new _performance.BaseLifecycleReporter();
  }
}

/**
 * Creates or reinitializes a lifecycle reporter for Google ad network
 * implementations.  (I.e., 'type="doubleclick"' and 'type="adsense"'.)  For
 * non-Google networks, returns a BaseLifecycleReporter -- a stub reporter that
 * generates no outputs.
 *
 * @param {!../../../extensions/amp-a4a/0.1/amp-a4a.AmpA4A|!../../../extensions/amp-ad/0.1/amp-ad-3p-impl.AmpAd3PImpl} baseInstance
 * @param {string=} opt_namespace  CSI ping namespace.  For example, a key
 *   of #ReporterNamespace.
 * @return {!./performance.BaseLifecycleReporter}
 */

function googleLifecycleReporterFactory(baseInstance, opt_namespace) {
  var namespace = opt_namespace || ReporterNamespace.A4A;
  var reporter = getLifecycleReporter(baseInstance, namespace, baseInstance.element.getAttribute('data-amp-slot-index'));
  reporter.setPingParameters({
    's': 'AD_SLOT_NAMESPACE',
    'dt': 'NAV_TIMING(navigationStart)',
    'v': '2',
    'c': 'AD_PAGE_CORRELATOR',
    'rls': 'AMP_VERSION',
    'v_h': 'VIEWPORT_HEIGHT',
    's_t': 'SCROLL_TOP',
    'slotId': 'AD_SLOT_ID',
    'stageName': 'AD_SLOT_EVENT_NAME',
    'stageIdx': 'AD_SLOT_EVENT_ID',
    'met.AD_SLOT_NAMESPACE.AD_SLOT_ID': 'AD_SLOT_EVENT_NAME.AD_SLOT_TIME_TO_EVENT',
    'e.AD_SLOT_ID': baseInstance.element.getAttribute(_utils.EXPERIMENT_ATTRIBUTE),
    'adt.AD_SLOT_ID': baseInstance.element.getAttribute('type'),
    // Page-level visibility times: `firstVisibleTime.T,.lastVisibleTime.T`.
    'met.AD_SLOT_NAMESPACE': 'firstVisibleTime.AD_PAGE_FIRST_VISIBLE_TIME' + ',lastVisibleTime.AD_PAGE_LAST_VISIBLE_TIME'
  });
  return reporter;
}

/**
 * Sets reportable variables from ad response headers.
 *
 * @param {!../../../src/service/xhr-impl.FetchResponseHeaders} headers
 * @param {!./performance.GoogleAdLifecycleReporter} reporter
 */

function setGoogleLifecycleVarsFromHeaders(headers, reporter) {
  // This is duplicated from the amp-a4a.js implementation.  It needs to be
  // defined there because it's an implementation detail of that module, but
  // we want to report it to Google b/c we're interested in how rendering mode
  // affects Google ads.  However, we can't directly reference a variable
  // in extensions/ from here.
  var renderingMethodHeader = 'X-AmpAdRender';
  var renderingMethodKey = 'rm.AD_SLOT_ID';
  var qqidKey = 'qqid.AD_SLOT_ID';
  var pingParameters = new Object(null);
  pingParameters[qqidKey] = headers.get(_utils.QQID_HEADER);
  pingParameters[renderingMethodKey] = headers.get(renderingMethodHeader);
  reporter.setPingParameters(pingParameters);
}

},{"../../../extensions/amp-ad-network-adsense-impl/0.1/adsense-a4a-config":15,"../../../extensions/amp-ad-network-doubleclick-impl/0.1/doubleclick-a4a-config":18,"../../../src/experiments":40,"./performance":6,"./traffic-experiments":7,"./utils":9}],5:[function(require,module,exports){
exports.__esModule = true;
exports.lineDelimitedStreamer = lineDelimitedStreamer;
exports.metaJsonCreativeGrouper = metaJsonCreativeGrouper;
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

var _srcJson = require('../../../src/json');

/**
 * Handles an XHR response by calling lineCallback for each line delineation.
 * Uses streaming where possible otherwise falls back to text.
 * @param {!Window} win
 * @param {!../../../src/service/xhr-impl.FetchResponse} response
 * @param {!function(string, boolean)} lineCallback
 * @private
 */

function lineDelimitedStreamer(win, response, lineCallback) {
  var line = '';
  function streamer(text, done) {
    var regex = /([^\n]*)(\n)?/g;
    var match = undefined;
    while (match = regex.exec(text)) {
      line += match[1];
      if (match[2]) {
        lineCallback(line, done && regex.lastIndex === text.length);
        line = '';
      }
      if (regex.lastIndex === text.length) {
        break;
      }
    }
  }
  if (!response.body || !win.TextDecoder) {
    response.text().then(function (text) {
      return streamer(text, true);
    });
    return;
  }

  var decoder = new TextDecoder('utf-8');
  var reader = response.body.getReader();
  reader.read().then(function chunk(result) {
    if (result.value) {
      streamer(decoder.decode(
      /** @type {!ArrayBuffer} */result.value, { 'stream': true }), result.done);
    }
    if (!result.done) {
      // More chunks to read.
      reader.read().then(chunk);
    }
  });
}

/**
 * Given each line, groups such that the first is JSON parsed and second
 * html unescaped.
 * @param {!function(string, !Object<string, *>, boolean)} callback
 * @private
 */

function metaJsonCreativeGrouper(callback) {
  var first = undefined;
  return function (line, done) {
    if (first) {
      callback(unescapeLineDelimitedHtml_(line),
      /** @type {!Object<string, *>} */_srcJson.tryParseJson(first) || {}, done);
      first = null;
    } else {
      first = line;
    }
  };
}

/**
 * Unescapes characters that are escaped in line-delimited JSON-HTML.
 * @param {string} html An html snippet.
 * @return {string}
 * @private
 */
function unescapeLineDelimitedHtml_(html) {
  return html.replace(/\\(n|r|\\)/g, function (_, match) {
    return match == 'n' ? '\n' : match == 'r' ? '\r' : '\\';
  });
}

},{"../../../src/json":46}],6:[function(require,module,exports){
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

var _utils = require('./utils');

var _extensionsAmpA4a01AmpA4a = require('../../../extensions/amp-a4a/0.1/amp-a4a');

var _srcLog = require('../../../src/log');

var _srcUrl = require('../../../src/url');

var _srcServiceVariableSource = require('../../../src/service/variable-source');

var _srcServices = require('../../../src/services');

var _srcCommonSignals = require('../../../src/common-signals');

var _srcAnalytics = require('../../../src/analytics');

/**
 * This module provides a fairly crude form of performance monitoring (or
 * profiling) for A4A code.  It generates individual pings back to Google
 * servers at key points in the A4A lifecycle and at a few points in the 3p
 * amp-ad lifecycle, for baseline.
 *
 * This is intended to be a short-term solution, for a rough-and-ready form
 * of profiling.  In particular, it doesn't use high-resolution timers (when
 * they're available) and it doesn't queue pings for network efficiency.  A
 * better long-term solution is to integrate `src/performance.js` with
 * `amp-analytics`.  However, we need a short-term solution quickly.  This
 * module should go away once we have verified that A4A is performing as
 * desired.
 */

/**
 * A NOOP base class for the LifecycleReporter
 */

var BaseLifecycleReporter = (function () {
  function BaseLifecycleReporter() {
    babelHelpers.classCallCheck(this, BaseLifecycleReporter);

    /**
     * @type {!Object<string, string>}
     * @private
     */
    this.extraVariables_ = new Object(null);
  }

  /**
   * To be overridden.
   *
   * @param {!Element} unusedElement Amp ad element we are measuring.
   */

  BaseLifecycleReporter.prototype.addPingsForVisibility = function addPingsForVisibility(unusedElement) {};

  /**
   * A beacon function that will be called at various stages of the lifecycle.
   *
   * To be overriden by network specific implementations.
   *
   * @param {string} unusedName A descriptive name for the beacon signal.
   */

  BaseLifecycleReporter.prototype.sendPing = function sendPing(unusedName) {};

  /**
   * Set a URL parameter to be added to the ping data.  The parameter's value is
   * subject to URL replacement and both parameter name and value are URI
   * encoded before being written to the ping.  The entry is silently dropped
   * if either `parameter` or `value` is falsey, with the exception that the
   * `value` may be 0.
   *
   * @param {string} parameter
   * @param {string|number} value
   */

  BaseLifecycleReporter.prototype.setPingParameter = function setPingParameter(parameter, value) {
    if (parameter == null || parameter === '') {
      return;
    }
    if (value === null || value === undefined || value === '') {
      return;
    }
    this.extraVariables_[parameter] = String(value);
  };

  /**
   * Sets a (possibly empty) collection of URL parameter values by invoking
   * #setPingParameter on each key/value pair in the input collection.
   *
   * @param {!Object<string, string|number>} parametersToValues
   */

  BaseLifecycleReporter.prototype.setPingParameters = function setPingParameters(parametersToValues) {
    for (var variable in parametersToValues) {
      if (parametersToValues.hasOwnProperty(variable)) {
        this.setPingParameter(variable, parametersToValues[variable]);
      }
    }
  };

  /**
   * A function to reset the lifecycle reporter. Will be called immediately
   * after firing the last beacon signal in unlayoutCallback.  Clears all
   * variables that have been set via #setPingParameter.
   */

  BaseLifecycleReporter.prototype.reset = function reset() {
    this.extraVariables_ = new Object(null);
  };

  /**
   * Returns the initialization time of this reporter.
   * @return {number} The initialization time in ms.
   */

  BaseLifecycleReporter.prototype.getInitTime = function getInitTime() {};

  /**
   * Returns the time delta between initialization and now.
   * @return {number} The time delta in ms.
   */

  BaseLifecycleReporter.prototype.getDeltaTime = function getDeltaTime() {};

  return BaseLifecycleReporter;
})();

exports.BaseLifecycleReporter = BaseLifecycleReporter;

var GoogleAdLifecycleReporter = (function (_BaseLifecycleReporter) {
  babelHelpers.inherits(GoogleAdLifecycleReporter, _BaseLifecycleReporter);

  /**
   * @param {!Window} win  Parent window object.
   * @param {!Element} element  Parent element object.
   * @param {string} namespace  Namespace for page-level info.  (E.g.,
   *   'amp' vs 'a4a'.)
   * @param {number} slotId
   */

  function GoogleAdLifecycleReporter(win, element, namespace, slotId) {
    var _this = this;

    babelHelpers.classCallCheck(this, GoogleAdLifecycleReporter);

    _BaseLifecycleReporter.call(this);

    /** @private {!Window} @const */
    this.win_ = win;

    /** @private {!Element} @const */
    this.element_ = element;

    /** @private {string} @const */
    this.namespace_ = namespace;

    /** @private {number} @const */
    this.slotId_ = slotId;

    /** @private {number} @const */
    this.correlator_ = _utils.getCorrelator(win);

    /** @private {string} @const */
    this.slotName_ = this.namespace_ + '.' + this.slotId_;

    // Contortions to convince the type checker that we're type-safe.
    var initTime = undefined;
    var scratch = _srcServiceVariableSource.getTimingDataSync(win, 'navigationStart') || Date.now();
    if (typeof scratch == 'number') {
      initTime = scratch;
    } else {
      initTime = Number(scratch);
    }
    /** @private {time} @const */
    this.initTime_ = initTime;

    /** @const {!function():number} */
    this.getDeltaTime = win.performance && win.performance.now.bind(win.performance) || function () {
      return Date.now() - _this.initTime_;
    };

    /** (Not constant b/c this can be overridden for testing.) @private */
    this.pingbackAddress_ = 'https://csi.gstatic.com/csi';

    /**
     * @private {!../../../src/service/url-replacements-impl.UrlReplacements}
     * @const
     */
    this.urlReplacer_ = _srcServices.urlReplacementsForDoc(element);

    /** @const @private {!../../../src/service/viewer-impl.Viewer} */
    this.viewer_ = _srcServices.viewerForDoc(element);
  }

  /**
   * Sets the address to which pings will be sent, overriding
   * `PINGBACK_ADDRESS`.  Intended for testing.
   * @param {string} address
   * @visibleForTesting
   */

  GoogleAdLifecycleReporter.prototype.setPingAddress = function setPingAddress(address) {
    this.pingbackAddress_ = address;
  };

  /**
   * The special variable SLOT_ID will be substituted into either parameter
   * names or values with the ID of the ad slot on the page.
   *
   * @param {string} name  Stage name to ping out.  Should be one of the ones
   * from `LIFECYCLE_STAGES`.  If it's an unknown name, it will still be pinged,
   * but the stage ID will be set to `9999`.
   * @override
   */

  GoogleAdLifecycleReporter.prototype.sendPing = function sendPing(name) {
    var url = this.buildPingAddress_(name);
    if (url) {
      this.emitPing_(url);
    }
  };

  /**
   * @param {string} name  Metric name to send.
   * @returns {string}  URL to send metrics to.
   * @private
   */

  GoogleAdLifecycleReporter.prototype.buildPingAddress_ = function buildPingAddress_(name) {
    var stageId = _extensionsAmpA4a01AmpA4a.LIFECYCLE_STAGES[name] || 9999;
    var delta = Math.round(this.getDeltaTime());
    // Note: extraParams can end up empty if (a) this.extraVariables_ is empty
    // or (b) if all values are themselves empty or null.
    var extraParams = _srcUrl.serializeQueryString(this.extraVariables_);
    if (extraParams != '') {
      // Note: Using sync URL replacer here, rather than async, for a number
      // of reasons:
      //   - Don't want to block pings waiting for potentially delayed bits
      //     of information.
      //   - Don't (currently) need access to any properties that are
      //     available async only.
      //   - Don't want to pass through expandStringAsync if there are zero
      //     extra params, but async would force us to (or to maintain two
      //     code branches).
      // TODO(ampproject/a4a): Change to async if/when there's a need to
      // expand async-only parameters.  E.g., we'd like to have scroll_y
      // offset, but it's not currently available through url-replacement.
      // If it becomes available, it's likely to be an async parameter.
      extraParams = this.urlReplacer_. /*OK*/expandStringSync(extraParams, {
        AD_SLOT_NAMESPACE: this.namespace_,
        AD_SLOT_ID: this.slotId_,
        AD_SLOT_TIME_TO_EVENT: delta,
        AD_SLOT_EVENT_NAME: name,
        AD_SLOT_EVENT_ID: stageId,
        AD_PAGE_CORRELATOR: this.correlator_,
        AD_PAGE_VISIBLE: this.viewer_.isVisible() ? 1 : 0,
        AD_PAGE_FIRST_VISIBLE_TIME: Math.round(this.viewer_.getFirstVisibleTime() - this.initTime_),
        AD_PAGE_LAST_VISIBLE_TIME: Math.round(this.viewer_.getLastVisibleTime() - this.initTime_)
      });
    }
    return extraParams ? this.pingbackAddress_ + '?' + extraParams : '';
  };

  /**
   * Send ping by creating an img element and attaching to the DOM.
   * Separate function so that it can be stubbed out for testing.
   *
   * @param {string} url Address to ping.
   * @visibleForTesting
   */

  GoogleAdLifecycleReporter.prototype.emitPing_ = function emitPing_(url) {
    new Image().src = url;
    _srcLog.dev().info('PING', url);
  };

  /**
   * Returns the initialization time of this reporter.
   * @return {number} The initialization time in ms.
   */

  GoogleAdLifecycleReporter.prototype.getInitTime = function getInitTime() {
    return this.initTime_;
  };

  /**
   * Adds CSI pings for various visibility measurements on element.
   *
   * @param {!Element} element Amp ad element we are measuring.
   * @override
   */

  GoogleAdLifecycleReporter.prototype.addPingsForVisibility = function addPingsForVisibility(element) {
    var _this2 = this;

    _srcAnalytics.analyticsForDoc(element, true).then(function (analytics) {
      var signals = element.signals();
      var readyPromise = Promise.race([signals.whenSignal(_srcCommonSignals.CommonSignals.INI_LOAD), signals.whenSignal(_srcCommonSignals.CommonSignals.LOAD_END)]);
      var vis = analytics.getAnalyticsRoot(element).getVisibilityManager();
      // Can be any promise or `null`.
      // Element must be an AMP element at this time.
      // 50% vis w/o ini load
      vis.listenElement(element, { visiblePercentageMin: 50 }, null, null, function () {
        _this2.sendPing('visHalf');
      });
      // 50% vis w ini load
      vis.listenElement(element, { visiblePercentageMin: 50 }, readyPromise, null, function () {
        _this2.sendPing('visHalfIniLoad');
      });
      // first visible
      vis.listenElement(element, { visiblePercentageMin: 1 }, null, null, function () {
        _this2.sendPing('firstVisible');
      });

      // ini load
      readyPromise.then(function () {
        _this2.sendPing('iniLoad');
      });

      // first visible + ini-load
      vis.listenElement(element, { waitFor: 'ini-load' }, readyPromise, null, function () {
        _this2.sendPing('visIniLoad');
      });

      // 50% vis, ini-load and 1 sec
      vis.listenElement(element, { visiblePercentageMin: 1, waitFor: 'ini-load',
        totalTimeMin: 1000 }, readyPromise, null, function () {
        _this2.sendPing('visLoadAndOneSec');
      });
    });
  };

  return GoogleAdLifecycleReporter;
})(BaseLifecycleReporter);

exports.GoogleAdLifecycleReporter = GoogleAdLifecycleReporter;

},{"../../../extensions/amp-a4a/0.1/amp-a4a":13,"../../../src/analytics":28,"../../../src/common-signals":30,"../../../src/log":49,"../../../src/service/variable-source":64,"../../../src/services":65,"../../../src/url":71,"./utils":9}],7:[function(require,module,exports){
exports.__esModule = true;
exports.googleAdsIsA4AEnabled = googleAdsIsA4AEnabled;
exports.parseExperimentIds = parseExperimentIds;
exports.isInExperiment = isInExperiment;
exports.isInManualExperiment = isInManualExperiment;
exports.hasLaunched = hasLaunched;
exports.isExternallyTriggeredExperiment = isExternallyTriggeredExperiment;
exports.isInternallyTriggeredExperiment = isInternallyTriggeredExperiment;
exports.validateExperimentIds = validateExperimentIds;
exports.addExperimentIdToElement = addExperimentIdToElement;
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
 * Machinery for doing "traffic-level" experiments.  That is, rather than
 * a single user choosing to opt-in to an experimental version of a module,
 * this framework allows you to do randomized, controlled experiments on all
 * AMP page loads to, for example, test relative performance or look for
 * impacts on click-throughs.
 */

var _utils = require('./utils');

var _srcExperiments = require('../../../src/experiments');

var _srcLog = require('../../../src/log');

var _srcServices = require('../../../src/services');

var _srcUrl = require('../../../src/url');

/** @typedef {{
 *    control: string,
 *    experiment: string
 *  }} */
var A4aExperimentBranches = undefined;

exports.A4aExperimentBranches = A4aExperimentBranches;
/** @type {!string} @private */
var MANUAL_EXPERIMENT_ID = '117152632';

exports.MANUAL_EXPERIMENT_ID = MANUAL_EXPERIMENT_ID;
/** @type {!string} @private */
var EXTERNALLY_SELECTED_ID = '2088461';

/** @type {!string} @private */
var INTERNALLY_SELECTED_ID = '2088462';

/**
 * Check whether Google Ads supports the A4A rendering pathway for a given ad
 * Element on a given Window.  The tests we use are:
 *
 * - The page must have originated in the `cdn.ampproject.org` CDN _or_ we must
 *   be running in local dev mode.
 * - We must be selected in to an A4A traffic experiment and be selected into
 *   the "experiment" branch.
 *
 * If we're selected into the overall traffic experiment, this function will
 * also attach an experiment or control branch ID to the `Element` as
 * a side-effect.
 *
 * @param {!Window} win  Host window for the ad.
 * @param {!Element} element Ad tag Element.
 * @param {string} experimentName Overall name for the experiment.
 * @param {!A4aExperimentBranches} externalBranches experiment and control
 *   branch IDs to use when experiment is triggered externally (e.g., via Google
 *   Search results page).
 * @param {!A4aExperimentBranches} internalBranches experiment and control
 *   branch IDs to use when experiment is triggered internally (i.e., via
 *   client-side selection).
 * @param {!A4aExperimentBranches} delayedExternalBranches
 * @param {!A4aExperimentBranches=} opt_sfgInternalBranches
 * @return {boolean} Whether Google Ads should attempt to render via the A4A
 *   pathway.
 */

function googleAdsIsA4AEnabled(win, element, experimentName, externalBranches, internalBranches, delayedExternalBranches, opt_sfgInternalBranches) {
  if (!_utils.isGoogleAdsA4AValidEnvironment(win)) {
    // Serving location doesn't qualify for A4A treatment
    return false;
  }

  var isSetFromUrl = maybeSetExperimentFromUrl(win, element, experimentName, externalBranches.control, externalBranches.experiment, delayedExternalBranches.control, delayedExternalBranches.experiment, opt_sfgInternalBranches ? opt_sfgInternalBranches.control : null, opt_sfgInternalBranches ? opt_sfgInternalBranches.experiment : null, MANUAL_EXPERIMENT_ID);
  var experimentInfoMap = {};
  var branches = [internalBranches.control, internalBranches.experiment];
  experimentInfoMap[experimentName] = {
    isTrafficEligible: function () {
      return true;
    },
    branches: branches
  };
  // Note: Because the same experimentName is being used everywhere here,
  // randomlySelectUnsetExperiments won't add new IDs if
  // maybeSetExperimentFromUrl has already set something for this
  // experimentName.
  _srcExperiments.randomlySelectUnsetExperiments(win, experimentInfoMap);
  if (_srcExperiments.isExperimentOn(win, experimentName)) {
    // Page is selected into the overall traffic experiment.
    // In other words, if A4A has not yet launched serve A4A Fast Fetch,
    // else serve Delayed Fetch.
    var selectedBranch = _srcExperiments.getExperimentBranch(win, experimentName);
    if (selectedBranch) {
      addExperimentIdToElement(selectedBranch, element);
      var perf = _srcServices.performanceForOrNull(win);
      if (perf) {
        perf.addEnabledExperiment(experimentName + '-' + selectedBranch);
      }
    }
    // Detect how page was selected into the overall experimentName.
    if (isSetFromUrl) {
      addExperimentIdToElement(EXTERNALLY_SELECTED_ID, element);
    } else {
      // Must be internally selected.
      addExperimentIdToElement(INTERNALLY_SELECTED_ID, element);
    }
    // Detect whether page is on the "experiment" (i.e., use A4A rendering
    // pathway) branch of the overall traffic experiment or it's on the
    // "control" (i.e., use traditional, 3p iframe rendering pathway).
    var selected = selectedBranch == internalBranches.experiment || selectedBranch == externalBranches.experiment || selectedBranch == delayedExternalBranches.experiment || selectedBranch == MANUAL_EXPERIMENT_ID;
    // Not launched, control branch -> Delayed Fetch
    // Not launched, experimental branch -> Fast Fetch
    // Launched, control branch -> Fast Fetch
    // Launched, experimental branch -> Delayed Fetch (for holdback)
    return selected == !hasLaunched(win, element);
  } else {
    // Page is not selected into the overall traffic experiment.
    // In other words, if A4A has launched serve A4A Fast Fetch, else serve
    // Delayed Fetch.
    return hasLaunched(win, element);
  }
}

/**
 * Set experiment state from URL parameter, if present.  This looks for the
 * presence of a URL parameter of the form
 *   `exp=expt0:val0,expt1:val1,...,a4a:X,...,exptN:valN`
 * and interprets the X as one of the following:
 *   - `-1`: Manually-triggered experiment.  For testing only.  Sets
 *     `adtest=on` on the ad request, so that it will not bill or record
 *     user clicks as ad CTR.  Ad request will be accounted in a special
 *     'testing only' experiment statistic pool so that we can track usage
 *     of this feature.
 *   - `0`: Ad is explicitly opted out of the overall A4A-vs-3p iframe
 *     experiment.  Ad will serve into a 3p iframe, as traditional, but ad
 *     request and clicks will not be accounted in experiment statistics.
 *   - `1`: Ad is on the control branch of the overall A4A-vs-3p iframe
 *     experiment.  Ad will serve into a 3p iframe, and ad requests and
 *     clicks _will_ be accounted in experiment statistics.
 *   - `2`: Ad is on the experimental branch of the overall A4A-vs-3p iframe
 *     experiment.  Ad will render via the A4A path, including early ad
 *     request and (possibly) early rendering in shadow DOM or iframe.
 *
 * @param {!Window} win  Window.
 * @param {!Element} element Ad tag Element.
 * @param {!string} experimentName  Name of the overall experiment.
 * @param {!string} controlBranchId  Experiment ID string for control branch of
 *   the overall experiment.
 * @param {!string} treatmentBranchId  Experiment ID string for the 'treatment'
 *   branch of the overall experiment.
 * @param {!string} delayedTreatmentBrandId Experiment ID string for the
 *   'treatment' plus delayed request experiment.
 * @param {!string} manualId  ID of the manual experiment.
 * @return {boolean}  Whether the experiment state was set from a command-line
 *   parameter or not.
 */
function maybeSetExperimentFromUrl(win, element, experimentName, controlBranchId, treatmentBranchId, delayedControlId, delayedTreatmentBrandId, sfgControlId, sfgTreatmentId, manualId) {
  var expParam = _srcServices.viewerForDoc(element).getParam('exp') || _srcUrl.parseQueryString(win.location.search)['exp'];
  if (!expParam) {
    return false;
  }
  var match = /(^|,)(a4a:[^,]*)/.exec(expParam);
  var a4aParam = match && match[2];
  if (!a4aParam) {
    return false;
  }
  // In the future, we may want to specify multiple experiments in the a4a
  // arg.  For the moment, however, assume that it's just a single flag.
  var arg = a4aParam.split(':', 2)[1];
  var argMapping = {
    '-1': manualId,
    '0': null,
    '1': controlBranchId,
    '2': treatmentBranchId,
    '3': delayedControlId,
    '4': delayedTreatmentBrandId,
    '5': sfgControlId,
    '6': sfgTreatmentId
  };
  if (argMapping.hasOwnProperty(arg)) {
    _srcExperiments.forceExperimentBranch(win, experimentName, argMapping[arg]);
    return true;
  } else {
    _srcLog.dev().warn('A4A-CONFIG', 'Unknown a4a URL parameter: ', a4aParam, ' expected one of -1 (manual), 0 (not in experiment), 1 (control ' + 'branch), or 2 (a4a experiment branch)');
    return false;
  }
}

/**
 * Sets of experiment IDs can be attached to Elements via attributes.  In
 * that case, we encode them as a string containing a comma-separated list
 * of experiment IDs.  This parses a comma-separated list from a string into
 * a list of ID strings.  If the input string is empty or null, this returns
 * the empty list.  This does no validity checking on the ID formats -- for
 * that, use validateExperimentIds.
 *
 * @param {?string} idString  String to parse.
 * @returns {!Array<!string>}  List of experiment IDs (possibly empty).
 * @see validateExperimentIds
 */

function parseExperimentIds(idString) {
  if (idString) {
    return idString.split(',');
  }
  return [];
}

/**
 * Checks whether the given element is a member of the given experiment branch.
 * I.e., whether the element's data-experiment-id attribute contains the id
 * value (possibly because the host page URL contains a 'exp=a4a:X' parameter
 * and #maybeSetExperimentFromUrl has added the appropriate EID).
 *
 * @param element  {!Element}  Element to check for membership in a specific
 *   experiment.
 * @param id {?string} Experiment ID to check for on `element`.
 * @return {boolean}
 */

function isInExperiment(element, id) {
  return parseExperimentIds(element.getAttribute(_utils.EXPERIMENT_ATTRIBUTE)).some(function (x) {
    return x === id;
  });
}

/**
 * Checks whether the given element is a member of the 'manually triggered
 * "experiment" branch'.  I.e., whether the element's data-experiment-id
 * attribute contains the MANUAL_EXPERIMENT_ID value (hopefully because the
 * user has manually specified 'exp=a4a:-1' in the host page URL and
 * #maybeSetExperimentFromUrl has added it).
 *
 * @param {!Element} element  Element to check for manual experiment membership.
 * @returns {boolean}
 */

function isInManualExperiment(element) {
  return isInExperiment(element, MANUAL_EXPERIMENT_ID);
}

/**
 * Predicate to check whether A4A has launched yet or not.
 * If it has not yet launched, then the experimental branch serves A4A, and
 * control/filler do not. If it has not, then the filler and control branch do
 * serve A4A, and the experimental branch does not.
 *
 * @param {!Window} win  Host window for the ad.
 * @param {!Element} element  Element to check for pre-launch membership.
 * @returns {boolean}
 */

function hasLaunched(win, element) {
  switch (element.getAttribute('type')) {
    case 'adsense':
      return _srcExperiments.isExperimentOn(win, 'a4aFastFetchAdSenseLaunched');
    case 'doubleclick':
      return _srcExperiments.isExperimentOn(win, 'a4aFastFetchDoubleclickLaunched');
    default:
      return false;
  }
}

/**
 * Checks whether the given element is in any of the branches triggered by
 * the externally-provided experiment parameter (as decided by the
 * #maybeSetExperimentFromUrl function).
 *
 * @param {!Element} element
 * @return {boolean}
 */

function isExternallyTriggeredExperiment(element) {
  return isInExperiment(element, EXTERNALLY_SELECTED_ID);
}

/**
 * Checks whether the given element is in any of the branches triggered by
 * internal experiment selection (as set by
 * #randomlySelectUnsetExperiments).
 *
 * @param {!Element} element
 * @return {boolean}
 */

function isInternallyTriggeredExperiment(element) {
  return isInExperiment(element, INTERNALLY_SELECTED_ID);
}

/**
 * Checks that all string experiment IDs in a list are syntactically valid
 * (integer base 10).
 *
 * @param {!Array<!string>} idList  List of experiment IDs.  Can be empty.
 * @returns {boolean} Whether all list elements are valid experiment IDs.
 */

function validateExperimentIds(idList) {
  return idList.every(function (id) {
    return !isNaN(parseInt(id, 10));
  });
}

/**
 * Adds a single experimentID to an element iff it's a valid experiment ID.
 *
 * @param {!string} experimentId  ID to add to the element.
 * @param element Element to add the experiment ID to.
 */

function addExperimentIdToElement(experimentId, element) {
  var currentEids = element.getAttribute(_utils.EXPERIMENT_ATTRIBUTE);
  if (currentEids && validateExperimentIds(parseExperimentIds(currentEids))) {
    element.setAttribute(_utils.EXPERIMENT_ATTRIBUTE, _utils.mergeExperimentIds([experimentId], currentEids));
  } else {
    element.setAttribute(_utils.EXPERIMENT_ATTRIBUTE, experimentId);
  }
}

},{"../../../src/experiments":40,"../../../src/log":49,"../../../src/services":65,"../../../src/url":71,"./utils":9}],8:[function(require,module,exports){
exports.__esModule = true;
exports.buildUrl = buildUrl;
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

/** @typedef {{name: string, value: (string|number|null)}} */
var QueryParameterDef = undefined;

exports.QueryParameterDef = QueryParameterDef;
/**
 * Builds a URL from query parameters, truncating to a maximum length if
 * necessary.
 * @param {string} baseUrl scheme, domain, and path for the URL.
 * @param {!Object<string,!string|number|null>} queryParams query parameters for
 *     the URL.
 * @param {number} maxLength length to truncate the URL to if necessary.
 * @param {?QueryParameterDef=} opt_truncationQueryParam query parameter to
 *     append to the URL iff any query parameters were truncated.
 * @return {string} the fully constructed URL.
 */

function buildUrl(baseUrl, queryParams, maxLength, opt_truncationQueryParam) {
  var encodedParams = [];
  var encodedTruncationParam = opt_truncationQueryParam && !(opt_truncationQueryParam.value == null || opt_truncationQueryParam.value === '') ? encodeURIComponent(opt_truncationQueryParam.name) + '=' + encodeURIComponent(String(opt_truncationQueryParam.value)) : null;
  var capacity = maxLength - baseUrl.length;
  if (encodedTruncationParam) {
    capacity -= encodedTruncationParam.length + 1;
  }
  var keys = Object.keys(queryParams);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = queryParams[key];
    if (value == null || value === '') {
      continue;
    }
    var encodedNameAndSep = encodeURIComponent(key) + '=';
    var encodedValue = encodeURIComponent(String(value));
    var fullLength = encodedNameAndSep.length + encodedValue.length + 1;
    if (fullLength > capacity) {
      var truncatedValue = encodedValue.substr(0, capacity - encodedNameAndSep.length - 1)
      // Don't end with a partially truncated escape sequence
      .replace(/%\w?$/, '');
      if (truncatedValue) {
        encodedParams.push(encodedNameAndSep + truncatedValue);
      }
      if (encodedTruncationParam) {
        encodedParams.push(encodedTruncationParam);
      }
      break;
    }
    encodedParams.push(encodedNameAndSep + encodedValue);
    capacity -= fullLength;
  }
  if (!encodedParams.length) {
    return baseUrl;
  }
  return baseUrl + '?' + encodedParams.join('&');
}

},{}],9:[function(require,module,exports){
exports.__esModule = true;
exports.isGoogleAdsA4AValidEnvironment = isGoogleAdsA4AValidEnvironment;
exports.isReportingEnabled = isReportingEnabled;
exports.googleBlockParameters = googleBlockParameters;
exports.groupAmpAdsByType = groupAmpAdsByType;
exports.googlePageParameters = googlePageParameters;
exports.googleAdUrl = googleAdUrl;
exports.truncAndTimeUrl = truncAndTimeUrl;
exports.extractGoogleAdCreativeAndSignature = extractGoogleAdCreativeAndSignature;
exports.getCorrelator = getCorrelator;
exports.additionalDimensions = additionalDimensions;
exports.extractAmpAnalyticsConfig = extractAmpAnalyticsConfig;
exports.mergeExperimentIds = mergeExperimentIds;
exports.addCsiSignalsToAmpAnalyticsConfig = addCsiSignalsToAmpAnalyticsConfig;
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

var _urlBuilder = require('./url-builder');

var _correlator = require('../correlator');

var _srcExperiments = require('../../../src/experiments');

var _srcAdCid = require('../../../src/ad-cid');

var _srcServices = require('../../../src/services');

var _srcLog = require('../../../src/log');

var _srcUtilsObject = require('../../../src/utils/object');

var _srcMode = require('../../../src/mode');

var _srcUrl = require('../../../src/url');

var _srcJson = require('../../../src/json');

var _srcUtilsBase64 = require('../../../src/utils/base64');

var _srcUtilsDomFingerprint = require('../../../src/utils/dom-fingerprint');

/** @const {string} */
var AMP_SIGNATURE_HEADER = 'X-AmpAdSignature';

/** @const {string} */
var CREATIVE_SIZE_HEADER = 'X-CreativeSize';

/** @type {string}  */
var AMP_ANALYTICS_HEADER = 'X-AmpAnalytics';

/** @const {number} */
var MAX_URL_LENGTH = 4096;

/** @enum {string} */
var AmpAdImplementation = {
  AMP_AD_XHR_TO_IFRAME: '2',
  AMP_AD_XHR_TO_IFRAME_OR_AMP: '3'
};

/** @const {!Object} */
var ValidAdContainerTypes = {
  'AMP-CAROUSEL': 'ac',
  'AMP-FX-FLYING-CARPET': 'fc',
  'AMP-LIGHTBOX': 'lb',
  'AMP-STICKY-AD': 'sa'
};

exports.ValidAdContainerTypes = ValidAdContainerTypes;
/** @const {string} */
var QQID_HEADER = 'X-QQID';

exports.QQID_HEADER = QQID_HEADER;
/**
 * Element attribute that stores experiment IDs.
 *
 * Note: This attribute should be used only for tracking experimental
 * implementations of AMP tags, e.g., by AMPHTML implementors.  It should not be
 * added by a publisher page.
 *
 * @const {!string}
 * @visibleForTesting
 */
var EXPERIMENT_ATTRIBUTE = 'data-experiment-id';

exports.EXPERIMENT_ATTRIBUTE = EXPERIMENT_ATTRIBUTE;
/** @typedef {{urls: !Array<string>}}
 */
var AmpAnalyticsConfigDef = undefined;

exports.AmpAnalyticsConfigDef = AmpAnalyticsConfigDef;
/**
 * Check whether Google Ads supports the A4A rendering pathway is valid for the
 * environment by ensuring native crypto support and page originated in the
 * the {@code cdn.ampproject.org} CDN <em>or</em> we must be running in local
 * dev mode.
 *
 * @param {!Window} win  Host window for the ad.
 * @returns {boolean}  Whether Google Ads should attempt to render via the A4A
 *   pathway.
 */

function isGoogleAdsA4AValidEnvironment(win) {
  var supportsNativeCrypto = win.crypto && (win.crypto.subtle || win.crypto.webkitSubtle);
  // Note: Theoretically, isProxyOrigin is the right way to do this, b/c it
  // will be kept up to date with known proxies.  However, it doesn't seem to
  // be compatible with loading the example files from localhost.  To hack
  // around that, just say that we're A4A eligible if we're in local dev
  // mode, regardless of origin path.
  return supportsNativeCrypto && (_srcUrl.isProxyOrigin(win.location) || _srcMode.getMode().localDev || _srcMode.getMode().test);
}

/**
 * @param {!AMP.BaseElement} ampElement The element on whose lifecycle this
 *    reporter will be reporting.
 * @return {boolean} whether reporting is enabled for this element
 */

function isReportingEnabled(ampElement) {
  // Carve-outs: We only want to enable profiling pingbacks when:
  //   - The ad is from one of the Google networks (AdSense or Doubleclick).
  //   - The ad slot is in the A4A-vs-3p amp-ad control branch (either via
  //     internal, client-side selection or via external, Google Search
  //     selection).
  //   - We haven't turned off profiling via the rate controls in
  //     build-system/global-config/{canary,prod}-config.json
  // If any of those fail, we use the `BaseLifecycleReporter`, which is a
  // a no-op (sends no pings).
  var type = ampElement.element.getAttribute('type');
  var win = ampElement.win;
  var experimentName = 'a4aProfilingRate';
  // In local dev mode, neither the canary nor prod config files is available,
  // so manually set the profiling rate, for testing/dev.
  if (_srcMode.getMode().localDev) {
    _srcExperiments.toggleExperiment(win, experimentName, true, true);
  }
  return (type == 'doubleclick' || type == 'adsense') && _srcExperiments.isExperimentOn(win, experimentName);
}

/**
 * Has side-effect of incrementing ifi counter on window.
 * @param {!../../../extensions/amp-a4a/0.1/amp-a4a.AmpA4A} a4a
 * @param {!Array<string>=} opt_experimentIds Any experiments IDs (in addition
 *     to those specified on the ad element) that should be included in the
 *     request.
 * @return {!Object<string,null|number|string>} block level parameters
 */

function googleBlockParameters(a4a, opt_experimentIds) {
  var adElement = a4a.element;
  var win = a4a.win;
  win['ampAdGoogleIfiCounter'] = win['ampAdGoogleIfiCounter'] || 1;
  var slotRect = a4a.getPageLayoutBox();
  var iframeDepth = iframeNestingDepth(win);
  // Detect container types.
  var containerTypeSet = {};
  for (var el = adElement.parentElement, counter = 0; el && counter < 20; el = el.parentElement, counter++) {
    var tagName = el.tagName.toUpperCase();
    if (ValidAdContainerTypes[tagName]) {
      containerTypeSet[ValidAdContainerTypes[tagName]] = true;
    }
  }
  var pfx = containerTypeSet[ValidAdContainerTypes['AMP-FX-FLYING-CARPET']] || containerTypeSet[ValidAdContainerTypes['AMP-STICKY-AD']] ? '1' : '0';
  var eids = adElement.getAttribute('data-experiment-id');
  if (opt_experimentIds) {
    eids = mergeExperimentIds(opt_experimentIds, eids);
  }
  var containerTypeArray = Object.keys(containerTypeSet);
  return {
    'ifi': win['ampAdGoogleIfiCounter']++,
    'adf': _srcUtilsDomFingerprint.domFingerprint(adElement),
    'nhd': iframeDepth,
    'eid': eids,
    'adx': slotRect.left,
    'ady': slotRect.top,
    'oid': '2',
    pfx: pfx,
    'rc': a4a.fromResumeCallback ? 1 : null,
    'act': containerTypeArray.length ? containerTypeArray.join() : null
  };
}

/**
 * @param {!Window} win
 * @param {string} type matching typing attribute.
 * @param {!function(!Element):string} groupFn
 * @return {!Promise<!Object<string,!Array<!Promise<!../../../src/base-element.BaseElement>>>>}
 */

function groupAmpAdsByType(win, type, groupFn) {
  return _srcServices.resourcesForDoc(win.document).getMeasuredResources(win, function (r) {
    return r.element.tagName == 'AMP-AD' && r.element.getAttribute('type') == type;
  }).then(function (resources) {
    var result = {};
    resources.forEach(function (r) {
      var groupId = groupFn(r.element);
      (result[groupId] || (result[groupId] = [])).push(r.element.getImpl());
    });
    return result;
  });
}

/**
 * @param {!Window} win
 * @param {!Node|!../../../src/service/ampdoc-impl.AmpDoc} doc
 * @param {number} startTime
 * @param {string=} output default is 'html'
 * @return {!Promise<!Object<string,null|number|string>>}
 */

function googlePageParameters(win, doc, startTime) {
  var output = arguments.length <= 3 || arguments[3] === undefined ? 'html' : arguments[3];

  var referrerPromise = _srcServices.viewerForDoc(doc).getReferrerUrl();
  return _srcAdCid.getOrCreateAdCid(doc, 'AMP_ECID_GOOGLE', '_ga').then(function (clientId) {
    return referrerPromise.then(function (referrer) {
      var documentInfo = _srcServices.documentInfoForDoc(win.document);
      // Read by GPT for GA/GPT integration.
      win.gaGlobal = win.gaGlobal || { cid: clientId, hid: documentInfo.pageViewId };
      var screen = win.screen;
      var viewport = _srcServices.viewportForDoc(win.document);
      var viewportRect = viewport.getRect();
      var viewportSize = viewport.getSize();
      return {
        'is_amp': AmpAdImplementation.AMP_AD_XHR_TO_IFRAME_OR_AMP,
        'amp_v': '1499663230322',
        'd_imp': '1',
        'c': getCorrelator(win, clientId),
        'dt': startTime,
        output: output,
        'biw': viewportRect.width,
        'bih': viewportRect.height,
        'u_aw': screen ? screen.availWidth : null,
        'u_ah': screen ? screen.availHeight : null,
        'u_cd': screen ? screen.colorDepth : null,
        'u_w': screen ? screen.width : null,
        'u_h': screen ? screen.height : null,
        'u_tz': -new Date().getTimezoneOffset(),
        'u_his': getHistoryLength(win),
        'isw': win != win.top ? viewportSize.width : null,
        'ish': win != win.top ? viewportSize.height : null,
        'art': _srcExperiments.isCanary(win) ? '2' : null,
        'url': documentInfo.canonicalUrl,
        'top': win != win.top ? topWindowUrlOrDomain(win) : null,
        'loc': win.location.href == documentInfo.canonicalUrl ? null : win.location.href,
        'ref': referrer
      };
    });
  });
}

/**
 * @param {!../../../extensions/amp-a4a/0.1/amp-a4a.AmpA4A} a4a
 * @param {string} baseUrl
 * @param {number} startTime
 * @param {!Object<string,null|number|string>} parameters
 * @param {!Array<string>=} opt_experimentIds Any experiments IDs (in addition
 *     to those specified on the ad element) that should be included in the
 *     request.
 * @return {!Promise<string>}
 */

function googleAdUrl(a4a, baseUrl, startTime, parameters, opt_experimentIds) {
  // TODO: Maybe add checks in case these promises fail.
  var blockLevelParameters = googleBlockParameters(a4a, opt_experimentIds);
  return googlePageParameters(a4a.win, a4a.getAmpDoc(), startTime).then(function (pageLevelParameters) {
    Object.assign(parameters, blockLevelParameters, pageLevelParameters);
    return truncAndTimeUrl(baseUrl, parameters, startTime);
  });
}

/**
 * @param {string} baseUrl
 * @param {!Object<string,null|number|string>} parameters
 * @param {number} startTime
 * @return {string}
 */

function truncAndTimeUrl(baseUrl, parameters, startTime) {
  return _urlBuilder.buildUrl(baseUrl, parameters, MAX_URL_LENGTH - 10, { name: 'trunc', value: '1' }) + '&dtd=' + elapsedTimeWithCeiling(Date.now(), startTime);
}

/**
 * @param {!ArrayBuffer} creative
 * @param {!../../../src/service/xhr-impl.FetchResponseHeaders} responseHeaders
 * @return {!Promise<!../../../extensions/amp-a4a/0.1/amp-a4a.AdResponseDef>}
 */

function extractGoogleAdCreativeAndSignature(creative, responseHeaders) {
  var signature = null;
  var size = null;
  try {
    if (responseHeaders.has(AMP_SIGNATURE_HEADER)) {
      signature = _srcUtilsBase64.base64UrlDecodeToBytes(_srcLog.dev().assertString(responseHeaders.get(AMP_SIGNATURE_HEADER)));
    }
    if (responseHeaders.has(CREATIVE_SIZE_HEADER)) {
      var sizeHeader = responseHeaders.get(CREATIVE_SIZE_HEADER);
      _srcLog.dev().assert(new RegExp('[0-9]+x[0-9]+').test(sizeHeader));
      var sizeArr = sizeHeader.split('x').map(function (dim) {
        return Number(dim);
      });
      size = { width: sizeArr[0], height: sizeArr[1] };
    }
  } finally {
    return Promise.resolve( /** @type {
                            !../../../extensions/amp-a4a/0.1/amp-a4a.AdResponseDef} */{ creative: creative, signature: signature, size: size });
  }
}

/**
 * @param {!Window} win
 * @return {number}
 */
function iframeNestingDepth(win) {
  var w = win;
  var depth = 0;
  while (w != w.parent && depth < 100) {
    w = w.parent;
    depth++;
  }
  _srcLog.dev().assert(w == win.top);
  return depth;
}

/**
 * @param {!Window} win
 * @return {number}
 */
function getHistoryLength(win) {
  // We have seen cases where accessing history length causes errors.
  try {
    return win.history.length;
  } catch (e) {
    return 0;
  }
}

/**
 * @param {!Window} win
 * @return {?string}
 */
function topWindowUrlOrDomain(win) {
  var ancestorOrigins = win.location.ancestorOrigins;
  if (ancestorOrigins) {
    var origin = win.location.origin;
    var topOrigin = ancestorOrigins[ancestorOrigins.length - 1];
    if (origin == topOrigin) {
      return win.top.location.href;
    }
    var secondFromTop = secondWindowFromTop(win);
    if (secondFromTop == win || origin == ancestorOrigins[ancestorOrigins.length - 2]) {
      return secondFromTop. /*REVIEW*/document.referrer;
    }
    return topOrigin;
  } else {
    try {
      return win.top.location.href;
    } catch (e) {}
    var secondFromTop = secondWindowFromTop(win);
    try {
      return secondFromTop. /*REVIEW*/document.referrer;
    } catch (e) {}
    return null;
  }
}

/**
 * @param {!Window} win
 * @return {!Window}
 */
function secondWindowFromTop(win) {
  var secondFromTop = win;
  var depth = 0;
  while (secondFromTop.parent != secondFromTop.parent.parent && depth < 100) {
    secondFromTop = secondFromTop.parent;
    depth++;
  }
  _srcLog.dev().assert(secondFromTop.parent == win.top);
  return secondFromTop;
}

/**
 * @param {number} time
 * @param {number} start
 * @return {(number|string)}
 */
function elapsedTimeWithCeiling(time, start) {
  var duration = time - start;
  if (duration >= 1e6) {
    return 'M';
  } else if (duration >= 0) {
    return duration;
  }
  return '-M';
}

/**
 * @param {!Window} win
 * @param {string=} opt_cid
 * @return {number} The correlator.
 */

function getCorrelator(win, opt_cid) {
  if (!win.ampAdPageCorrelator) {
    win.ampAdPageCorrelator = _correlator.makeCorrelator(opt_cid, _srcServices.documentInfoForDoc(win.document).pageViewId);
  }
  return win.ampAdPageCorrelator;
}

/**
 * Collect additional dimensions for the brdim parameter.
 * @param {!Window} win The window for which we read the browser dimensions.
 * @param {{width: number, height: number}|null} viewportSize
 * @return {string}
 * @visibleForTesting
 */

function additionalDimensions(win, viewportSize) {
  // Some browsers throw errors on some of these.
  var screenX = undefined,
      screenY = undefined,
      outerWidth = undefined,
      outerHeight = undefined,
      innerWidth = undefined,
      innerHeight = undefined;
  try {
    screenX = win.screenX;
    screenY = win.screenY;
  } catch (e) {}
  try {
    outerWidth = win.outerWidth;
    outerHeight = win.outerHeight;
  } catch (e) {}
  try {
    innerWidth = viewportSize.width;
    innerHeight = viewportSize.height;
  } catch (e) {}
  return [win.screenLeft, win.screenTop, screenX, screenY, win.screen ? win.screen.availWidth : undefined, win.screen ? win.screen.availTop : undefined, outerWidth, outerHeight, innerWidth, innerHeight].join();
}

;

/**
 * Extracts configuration used to build amp-analytics element for active view.
 *
 * @param {!../../../extensions/amp-a4a/0.1/amp-a4a.AmpA4A} a4a
 * @param {!../../../src/service/xhr-impl.FetchResponseHeaders} responseHeaders
 *   XHR service FetchResponseHeaders object containing the response
 *   headers.
 * @return {?JsonObject} config or null if invalid/missing.
 */

function extractAmpAnalyticsConfig(a4a, responseHeaders) {
  if (!responseHeaders.has(AMP_ANALYTICS_HEADER)) {
    return null;
  }
  try {
    var analyticsConfig = _srcJson.parseJson(responseHeaders.get(AMP_ANALYTICS_HEADER));
    _srcLog.dev().assert(Array.isArray(analyticsConfig['url']));
    var urls = analyticsConfig['url'];
    if (!urls.length) {
      return null;
    }

    var config = /** @type {JsonObject}*/{
      'transport': { 'beacon': false, 'xhrpost': false },
      'triggers': {
        'continuousVisible': {
          'on': 'visible',
          'visibilitySpec': {
            'selector': 'amp-ad',
            'selectionMethod': 'closest',
            'visiblePercentageMin': 50,
            'continuousTimeMin': 1000
          }
        },
        'continuousVisibleIniLoad': {
          'on': 'ini-load',
          'selector': 'amp-ad',
          'selectionMethod': 'closest'
        },
        'continuousVisibleRenderStart': {
          'on': 'render-start',
          'selector': 'amp-ad',
          'selectionMethod': 'closest'
        }
      }
    };

    // Discover and build visibility endpoints.
    var requests = _srcUtilsObject.dict();
    for (var idx = 1; idx <= urls.length; idx++) {
      // TODO: Ensure url is valid and not freeform JS?
      requests['visibility' + idx] = '' + urls[idx - 1];
    }
    // Security review needed here.
    config['requests'] = requests;
    config['triggers']['continuousVisible']['request'] = Object.keys(requests);
    return config;
  } catch (err) {
    _srcLog.dev().error('AMP-A4A', 'Invalid analytics', err, responseHeaders.get(AMP_ANALYTICS_HEADER));
  }
  return null;
}

/**
 * Add new experiment IDs to a (possibly empty) existing set of experiment IDs.
 * The {@code currentIdString} may be {@code null} or {@code ''}, but if it is
 * populated, it must contain a comma-separated list of integer experiment IDs
 * (per {@code parseExperimentIds()}).  Returns the new set of IDs, encoded
 * as a comma-separated list.  Does not de-duplicate ID entries.
 *
 * @param {!Array<string>} newIds IDs to merge in. Should contain stringified
 *     integer (base 10) experiment IDs.
 * @param {?string} currentIdString  If present, a string containing a
 *   comma-separated list of integer experiment IDs.
 * @returns {string}  New experiment list string, including newId iff it is
 *   a valid (integer) experiment ID.
 * @see parseExperimentIds, validateExperimentIds
 */

function mergeExperimentIds(newIds, currentIdString) {
  var newIdString = newIds.filter(function (newId) {
    return Number(newId);
  }).join(',');
  currentIdString = currentIdString || '';
  return currentIdString + (currentIdString && newIdString ? ',' : '') + newIdString;
}

/**
 * Adds two CSI signals to the given amp-analytics configuration object, one
 * for render-start, and one for ini-load.
 *
 * @param {!Window} win
 * @param {!Element} element The ad slot.
 * @param {!JsonObject} config The original config object.
 * @param {?string} qqid
 * @param {boolean} isVerifiedAmpCreative
 * @param {number} deltaTime The time difference, in ms, between the lifecycle
 *   reporter's initialization and now.
 * @param {number} initTime The initialization time, in ms, of the lifecycle
 *   reporter.
 * @return {?JsonObject} config or null if invalid/missing.
 */

function addCsiSignalsToAmpAnalyticsConfig(win, element, config, qqid, isVerifiedAmpCreative, deltaTime, initTime) {
  // Add CSI pingbacks.
  var correlator = getCorrelator(win);
  var slotId = Number(element.getAttribute('data-amp-slot-index'));
  var eids = encodeURIComponent(element.getAttribute(EXPERIMENT_ATTRIBUTE));
  var adType = element.getAttribute('type');
  var baseCsiUrl = 'https://csi.gstatic.com/csi?s=a4a' + ('&c=' + correlator + '&slotId=' + slotId + '&qqid.' + slotId + '=' + qqid) + ('&dt=' + initTime) + (eids != 'null' ? '&e.' + slotId + '=' + eids : '') + ('&rls=1499663230322&adt.' + slotId + '=' + adType);
  deltaTime = Math.round(deltaTime);
  var isAmpSuffix = isVerifiedAmpCreative ? 'Friendly' : 'CrossDomain';
  config['requests']['iniLoadCsi'] = baseCsiUrl + ('&met.a4a.' + slotId + '=iniLoadCsi' + isAmpSuffix + '.' + deltaTime);
  config['requests']['renderStartCsi'] = baseCsiUrl + ('&met.a4a.' + slotId + '=renderStartCsi' + isAmpSuffix + '.' + deltaTime);
  config['triggers']['continuousVisibleIniLoad']['request'] = 'iniLoadCsi';
  config['triggers']['continuousVisibleRenderStart']['request'] = 'renderStartCsi';

  // Add CSI ping for visibility.
  config['requests']['visibilityCsi'] = baseCsiUrl + ('&met.a4a.' + slotId + '=visibilityCsi.' + deltaTime);
  config['triggers']['continuousVisible']['request'].push('visibilityCsi');
  return config;
}

},{"../../../src/ad-cid":26,"../../../src/experiments":40,"../../../src/json":46,"../../../src/log":49,"../../../src/mode":51,"../../../src/services":65,"../../../src/url":71,"../../../src/utils/base64":72,"../../../src/utils/dom-fingerprint":74,"../../../src/utils/object":75,"../correlator":10,"./url-builder":8}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{"../../src/log":49}],12:[function(require,module,exports){
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

var _srcServiceVariableSource = require('../../../src/service/variable-source');

var _srcLog = require('../../../src/log');

var WHITELISTED_VARIABLES = ['RANDOM', 'COUNTER', 'CANONICAL_URL', 'CANONICAL_HOST', 'CANONICAL_HOSTNAME', 'CANONICAL_PATH', 'DOCUMENT_REFERRER', 'TITLE', 'AMPDOC_URL', 'AMPDOC_HOST', 'AMPDOC_HOSTNAME', 'SOURCE_URL', 'SOURCE_HOST', 'SOURCE_HOSTNAME', 'SOURCE_PATH', 'PAGE_VIEW_ID', 'CLIENT_ID', 'VARIANT', 'VARIANTS', 'SHARE_TRACKING_INCOMING', 'SHARE_TRACKING_OUTGOING', 'TIMESTAMP', 'TIMEZONE', 'SCROLL_TOP', 'SCROLL_LEFT', 'SCROLL_HEIGHT', 'SCROLL_WIDTH', 'VIEWPORT_HEIGHT', 'VIEWPORT_WIDTH', 'SCREEN_WIDTH', 'SCREEN_HEIGHT', 'AVAILABLE_SCREEN_HEIGHT', 'AVAILABLE_SCREEN_WIDTH', 'SCREEN_COLOR_DEPTH', 'DOCUMENT_CHARSET', 'BROWSER_LANGUAGE', 'VIEWER', 'TOTAL_ENGAGED_TIME', 'AMP_VERSION'];

/** Provides A4A specific variable substitution. */

var A4AVariableSource = (function (_VariableSource) {
  babelHelpers.inherits(A4AVariableSource, _VariableSource);

  /**
   * @param  {!../../../src/service/ampdoc-impl.AmpDoc} ampdoc
   * @param  {!Window} embedWin
   */

  function A4AVariableSource(ampdoc, embedWin) {
    babelHelpers.classCallCheck(this, A4AVariableSource);

    _VariableSource.call(this);
    /** @private {VariableSource} global variable source for fallback. */
    this.globalVariableSource_ = _srcServices.urlReplacementsForDoc(ampdoc).getVariableSource();

    /** @private {!Window} */
    this.win_ = embedWin;
  }

  /** @override */

  A4AVariableSource.prototype.initialize = function initialize() {
    var _this = this;

    this.set('AD_NAV_TIMING', function (startAttribute, endAttribute) {
      _srcLog.user().assert(startAttribute, 'The first argument to AD_NAV_TIMING, the' + ' start attribute name, is required');
      return _srcServiceVariableSource.getTimingDataSync(_this.win_,
      /**@type {string}*/startAttribute,
      /**@type {string}*/endAttribute);
    }).setAsync('AD_NAV_TIMING', function (startAttribute, endAttribute) {
      _srcLog.user().assert(startAttribute, 'The first argument to AD_NAV_TIMING, the' + ' start attribute name, is required');
      return _srcServiceVariableSource.getTimingDataAsync(_this.win_,
      /**@type {string}*/startAttribute,
      /**@type {string}*/endAttribute);
    });

    this.set('AD_NAV_TYPE', function () {
      return _srcServiceVariableSource.getNavigationData(_this.win_, 'type');
    });

    this.set('AD_NAV_REDIRECT_COUNT', function () {
      return _srcServiceVariableSource.getNavigationData(_this.win_, 'redirectCount');
    });

    for (var v = 0; v < WHITELISTED_VARIABLES.length; v++) {
      var varName = WHITELISTED_VARIABLES[v];
      var resolvers = this.globalVariableSource_.get(varName);
      this.set(varName, resolvers.sync).setAsync(varName, resolvers.async);
    }
  };

  return A4AVariableSource;
})(_srcServiceVariableSource.VariableSource);

exports.A4AVariableSource = A4AVariableSource;

},{"../../../src/log":49,"../../../src/service/variable-source":64,"../../../src/services":65}],13:[function(require,module,exports){
exports.__esModule = true;
exports.protectFunctionWrapper = protectFunctionWrapper;
exports.assignAdUrlToError = assignAdUrlToError;
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

var _legacySignatureVerifier = require('./legacy-signature-verifier');

var _ampAd01ConcurrentLoad = require('../../amp-ad/0.1/concurrent-load');

var _ads_a4aConfig = require('../../../ads/_a4a-config');

var _srcDom = require('../../../src/dom');

var _srcError = require('../../../src/error');

var _srcAnchorClickInterceptor = require('../../../src/anchor-click-interceptor');

var _srcFriendlyIframeEmbed = require('../../../src/friendly-iframe-embed');

var _srcLayout = require('../../../src/layout');

var _srcAdHelper = require('../../../src/ad-helper');

var _srcLog = require('../../../src/log');

var _srcMode = require('../../../src/mode');

var _srcTypes = require('../../../src/types');

var _srcUtilsPromise = require('../../../src/utils/promise');

var _srcUtilsBytes = require('../../../src/utils/bytes');

var _srcServices = require('../../../src/services');

var _srcString = require('../../../src/string');

var _srcExperiments = require('../../../src/experiments');

var _srcStyle = require('../../../src/style');

var _srcUrl = require('../../../src/url');

var _srcJson = require('../../../src/json');

var _adsAlpHandler = require('../../../ads/alp/handler');

var _src3pFrame = require('../../../src/3p-frame');

var _srcServiceUrlReplacementsImpl = require('../../../src/service/url-replacements-impl');

var _a4aVariableSource = require('./a4a-variable-source');

// TODO(tdrl): Temporary.  Remove when we migrate to using amp-analytics.

var _srcServiceVariableSource = require('../../../src/service/variable-source');

var _srcIframeAttributes = require('../../../src/iframe-attributes');

var _adsGoogleA4aTrafficExperiments = require('../../../ads/google/a4a/traffic-experiments');

/** @type {string} */
var METADATA_STRING = '<script type="application/json" amp-ad-metadata>';

/** @type {string} */
var METADATA_STRING_NO_QUOTES = '<script type=application/json amp-ad-metadata>';

// TODO(tdrl): Temporary, while we're verifying whether SafeFrame is an
// acceptable solution to the 'Safari on iOS doesn't fetch iframe src from
// cache' issue.  See https://github.com/ampproject/amphtml/issues/5614
/** @type {string} */
var DEFAULT_SAFEFRAME_VERSION = '1-0-9';

exports.DEFAULT_SAFEFRAME_VERSION = DEFAULT_SAFEFRAME_VERSION;
/** @type {string} @visibleForTesting */
var RENDERING_TYPE_HEADER = 'X-AmpAdRender';

exports.RENDERING_TYPE_HEADER = RENDERING_TYPE_HEADER;
/** @type {string} @visibleForTesting */
var SAFEFRAME_VERSION_HEADER = 'X-AmpSafeFrameVersion';

exports.SAFEFRAME_VERSION_HEADER = SAFEFRAME_VERSION_HEADER;
/** @type {string} */
var TAG = 'amp-a4a';

/** @type {string} */
var NO_CONTENT_RESPONSE = 'NO-CONTENT-RESPONSE';

/** @enum {string} */
var XORIGIN_MODE = {
  CLIENT_CACHE: 'client_cache',
  SAFEFRAME: 'safeframe',
  NAMEFRAME: 'nameframe'
};

exports.XORIGIN_MODE = XORIGIN_MODE;
/** @type {!Object} @private */
var SHARED_IFRAME_PROPERTIES = {
  frameborder: '0',
  allowfullscreen: '',
  allowtransparency: '',
  scrolling: 'no',
  marginwidth: '0',
  marginheight: '0'
};

/** @typedef {{
 *    creative: ArrayBuffer,
 *    signature: ?Uint8Array,
 *    size: ?{width: number, height: number}
 *  }} */
var AdResponseDef = undefined;

exports.AdResponseDef = AdResponseDef;
/** @typedef {{
      minifiedCreative: string,
      customElementExtensions: !Array<string>,
      customStylesheets: !Array<{href: string}>
    }} */
var CreativeMetaDataDef = undefined;

/**
 * A set of public keys for a single AMP signing service.  A single service may
 * return more than one key if, e.g., they're rotating keys and they serve
 * the current and upcoming keys.  A CryptoKeysDef stores one or more
 * (promises to) keys, in the order given by the return value from the
 * signing service.
 *
 * @typedef {{serviceName: string, keys: !Array<!Promise<!PublicKeyInfoDef>>}}
 */
var CryptoKeysDef = undefined;

/**
 * The public keys for all signing services.  This is an array of promises,
 * one per signing service, in the order given by the array returned by
 * #getSigningServiceNames().  Each entry resolves to the keys returned by
 * that service, represented by a `CryptoKeysDef` object.
 *
 * @typedef {Array<!Promise<!CryptoKeysDef>>}
 */
var AllServicesCryptoKeysDef = undefined;

/** @private */
var LIFECYCLE_STAGES = {
  // Note: Use strings as values here, rather than numbers, so that "0" does
  // not test as `false` later.
  adSlotCleared: '-1',
  urlBuilt: '1',
  adRequestStart: '2',
  adRequestEnd: '3',
  extractCreativeAndSignature: '4',
  adResponseValidateStart: '5',
  renderFriendlyStart: '6', // TODO(dvoytenko): this signal and similar are actually "embed-create", not "render-start".
  renderCrossDomainStart: '7',
  renderFriendlyEnd: '8',
  renderCrossDomainEnd: '9',
  preAdThrottle: '10',
  renderSafeFrameStart: '11',
  throttled3p: '12',
  adResponseValidateEnd: '13',
  xDomIframeLoaded: '14',
  friendlyIframeLoaded: '15',
  adSlotCollapsed: '16',
  adSlotUnhidden: '17',
  layoutAdPromiseDelay: '18',
  signatureVerifySuccess: '19',
  networkError: '20',
  friendlyIframeIniLoad: '21',
  visHalf: '22',
  visHalfIniLoad: '23',
  firstVisible: '24',
  visLoadAndOneSec: '25',
  iniLoad: '26',
  resumeCallback: '27',
  visIniLoad: '29'
};

exports.LIFECYCLE_STAGES = LIFECYCLE_STAGES;
/**
 * Utility function that ensures any error thrown is handled by optional
 * onError handler (if none provided or handler throws, error is swallowed and
 * undefined is returned).
 * @param {!Function} fn to protect
 * @param {T=} inThis An optional object to use as the 'this' object
 *    when calling the function.  If not provided, undefined is bound as this
 *    when calling function.
 * @param {function(this:T, !Error, ...*):?=} onError function given error
 *    and arguments provided to function call.
 * @return {!Function} protected function
 * @template T
 * @visibleForTesting
 */

function protectFunctionWrapper(fn) {
  var inThis = arguments.length <= 1 || arguments[1] === undefined ? undefined : arguments[1];
  var onError = arguments.length <= 2 || arguments[2] === undefined ? undefined : arguments[2];

  return function () {
    for (var _len = arguments.length, fnArgs = Array(_len), _key = 0; _key < _len; _key++) {
      fnArgs[_key] = arguments[_key];
    }

    try {
      return fn.apply(inThis, fnArgs);
    } catch (err) {
      if (onError) {
        try {
          // Ideally we could use [err, ...var_args] but linter disallows
          // spread so instead using unshift :(
          fnArgs.unshift(err);
          return onError.apply(inThis, fnArgs);
        } catch (captureErr) {
          // swallow error if error handler throws.
        }
      }
      // In the event of no optional on error function or its execution throws,
      // return undefined.
      return undefined;
    }
  };
}

;

var AmpA4A = (function (_AMP$BaseElement) {
  babelHelpers.inherits(AmpA4A, _AMP$BaseElement);

  // TODO: Add more error handling throughout code.
  // TODO: Handle creatives that do not fill.

  /**
   * @param {!Element} element
   */

  function AmpA4A(element) {
    var _this = this;

    babelHelpers.classCallCheck(this, AmpA4A);

    _AMP$BaseElement.call(this, element);
    _srcLog.dev().assert(AMP.AmpAdUIHandler);
    _srcLog.dev().assert(AMP.AmpAdXOriginIframeHandler);

    /** @private {?Promise<?CreativeMetaDataDef>} */
    this.adPromise_ = null;

    /**
     * @private {number} unique ID of the currently executing promise to allow
     * for cancellation.
     */
    this.promiseId_ = 0;

    /** {?Object} */
    this.config = null;

    /** @private {?string} */
    this.adUrl_ = null;

    /** @private {?../../../src/friendly-iframe-embed.FriendlyIframeEmbed} */
    this.friendlyIframeEmbed_ = null;

    /** {?AMP.AmpAdUIHandler} */
    this.uiHandler = null;

    /** @private {?AMP.AmpAdXOriginIframeHandler} */
    this.xOriginIframeHandler_ = null;

    /** @const @private {!../../../src/service/vsync-impl.Vsync} */
    this.vsync_ = this.getVsync();

    /** @private {boolean} whether creative has been verified as AMP */
    this.isVerifiedAmpCreative_ = false;

    /** @private @const {!LegacySignatureVerifier} */
    this.signatureVerifier_ = new _legacySignatureVerifier.LegacySignatureVerifier(this.win);

    /** @private {?ArrayBuffer} */
    this.creativeBody_ = null;

    /**
     * Initialize this with the slot width/height attributes, and override
     * later with what the network implementation returns via
     * extractCreativeAndSignature. Note: Either value may be 'auto' (i.e.,
     * non-numeric).
     *
     * @private {?({width, height}|../../../src/layout-rect.LayoutRectDef)}
     */
    this.creativeSize_ = {
      width: this.element.getAttribute('width'),
      height: this.element.getAttribute('height')
    };

    /** @private {?../../../src/layout-rect.LayoutRectDef} */
    this.originalSlotSize_ = null;

    /**
     * Note(keithwrightbos) - ensure the default here is null so that ios
     * uses safeframe when response header is not specified.
     * @private {?XORIGIN_MODE}
     */
    this.experimentalNonAmpCreativeRenderMethod_ = _srcServices.platformFor(this.win).isIos() ? XORIGIN_MODE.SAFEFRAME : null;

    /**
     * Gets a notion of current time, in ms.  The value is not necessarily
     * absolute, so should be used only for computing deltas.  When available,
     * the performance system will be used; otherwise Date.now() will be
     * returned.
     *
     * @const {function():number}
     * @private
     */
    this.getNow_ = this.win.performance && this.win.performance.now ? this.win.performance.now.bind(this.win.performance) : Date.now;

    /**
     * Protected version of emitLifecycleEvent that ensures error does not
     * cause promise chain to reject.
     * @private {function(string, !Object=)}
     */
    this.protectedEmitLifecycleEvent_ = protectFunctionWrapper(this.emitLifecycleEvent, this, function (err, varArgs) {
      _srcLog.dev().error(TAG, _this.element.getAttribute('type'), 'Error on emitLifecycleEvent', err, varArgs);
    });

    /** @const {string} */
    this.sentinel = _src3pFrame.generateSentinel(window);

    /**
     * Used to indicate whether this slot should be collapsed or not. Marked
     * true if the ad response has status 204, is null, or has a null
     * arrayBuffer.
     * @private {boolean}
     */
    this.isCollapsed_ = false;

    /**
     * Frame in which the creative renders (friendly if validated AMP, xdomain
     * otherwise).
     * {?HTMLIframeElement}
     */
    this.iframe = null;

    /**
     * TODO(keithwrightbos) - remove once resume behavior is verified.
     * {boolean} whether most recent ad request was generated as part
     *    of resume callback.
     */
    this.fromResumeCallback = false;

    var type = (this.element.getAttribute('type') || 'notype').toLowerCase();
    /**
     * @private @const{boolean} whether request should only be sent when slot is
     *    within renderOutsideViewport distance.
     */
    this.delayRequestEnabled_ = type == 'adsense' && _adsGoogleA4aTrafficExperiments.isInExperiment(this.element, '117152655') || type == 'doubleclick' && _adsGoogleA4aTrafficExperiments.isInExperiment(this.element, '117152665');

    /** @private {string} */
    this.safeframeVersion_ = DEFAULT_SAFEFRAME_VERSION;
  }

  /**
   * Attachs query string portion of ad url to error.
   * @param {!Error} error
   * @param {string} adUrl
   */

  /** @override */

  AmpA4A.prototype.getPriority = function getPriority() {
    // Priority used for scheduling preload and layout callback.  Because
    // AMP creatives will be injected as part of the promise chain created
    // within onLayoutMeasure, this is only relevant to non-AMP creatives
    // therefore we want this to match the 3p priority.
    return 2;
  };

  /** @override */

  AmpA4A.prototype.isLayoutSupported = function isLayoutSupported(layout) {
    return _srcLayout.isLayoutSizeDefined(layout);
  };

  /** @override */

  AmpA4A.prototype.buildCallback = function buildCallback() {
    this.uiHandler = new AMP.AmpAdUIHandler(this);
    if (!this.win.ampA4aValidationKeys) {
      // Without the following variable assignment, there's no way to apply a
      // type annotation to a win-scoped variable, so the type checker doesn't
      // catch type errors here.  This no-op allows us to enforce some type
      // expectations.  The const assignment will hopefully be optimized
      // away by the compiler.  *fingers crossed*
      /** @type {!AllServicesCryptoKeysDef} */
      var forTypeSafety = this.getKeyInfoSets_();
      this.win.ampA4aValidationKeys = forTypeSafety;
    }
  };

  /** @override */

  AmpA4A.prototype.renderOutsideViewport = function renderOutsideViewport() {
    // Ensure non-verified AMP creatives are throttled.
    if (!this.isVerifiedAmpCreative_ && _ampAd01ConcurrentLoad.is3pThrottled(this.win)) {
      this.protectedEmitLifecycleEvent_('throttled3p');
      return false;
    }
    // Otherwise the ad is good to go.
    var elementCheck = _ampAd01ConcurrentLoad.getAmpAdRenderOutsideViewport(this.element);
    return elementCheck !== null ? elementCheck : _AMP$BaseElement.prototype.renderOutsideViewport.call(this);
  };

  /**
   * To be overridden by network specific implementation indicating if element
   * (and environment generally) are valid for sending XHR queries.
   * @return {boolean} whether element is valid and ad request should be
   *    sent.  If false, no ad request is sent and slot will be collapsed if
   *    possible.
   */

  AmpA4A.prototype.isValidElement = function isValidElement() {
    return true;
  };

  /**
   * Returns preconnect urls for A4A. Ad network should overwrite in their
   * Fast Fetch implementation and return an array of urls for the runtime to
   * preconnect to.
   * @return {!Array<string>}
   */

  AmpA4A.prototype.getPreconnectUrls = function getPreconnectUrls() {
    return [];
  };

  /**
   * Returns prefetch urls for A4A. Ad network should overwrite in their
   * Fast Fetch implementation and return an array of urls for the runtime to
   * prefetch.
   * @return {!Array<string>}
   */

  AmpA4A.prototype.getPrefetchUrls = function getPrefetchUrls() {
    return [];
  };

  /**
   * Returns true if this element was loaded from an amp-ad element.  For use by
   * network-specific implementations that don't want to allow themselves to be
   * embedded directly into a page.
   * @return {boolean}
   */

  AmpA4A.prototype.isAmpAdElement = function isAmpAdElement() {
    return this.element.tagName == 'AMP-AD' || this.element.tagName == 'AMP-EMBED';
  };

  /**
   * Prefetches and preconnects URLs related to the ad using adPreconnect
   * registration which assumes ad request domain used for 3p is applicable.
   * @param {boolean=} unusedOnLayout
   * @override
   */

  AmpA4A.prototype.preconnectCallback = function preconnectCallback(unusedOnLayout) {
    var _this2 = this;

    this.preconnect.preload(this.getSafeframePath_());
    this.preconnect.preload(_src3pFrame.getDefaultBootstrapBaseUrl(this.win, 'nameframe'));
    var preconnect = this.getPreconnectUrls();

    // NOTE(keithwrightbos): using onLayout to indicate if preconnect should be
    // given preferential treatment.  Currently this would be false when
    // relevant (i.e. want to preconnect on or before onLayoutMeasure) which
    // causes preconnect to delay for 1 sec (see custom-element#preconnect)
    // therefore hard coding to true.
    // NOTE(keithwrightbos): Does not take isValidElement into account so could
    // preconnect unnecessarily, however it is assumed that isValidElement
    // matches amp-ad loader predicate such that A4A impl does not load.
    if (preconnect) {
      preconnect.forEach(function (p) {
        _this2.preconnect.url(p, true);
      });
    }
  };

  /** @override */

  AmpA4A.prototype.resumeCallback = function resumeCallback() {
    // FIE that was not destroyed on unlayoutCallback does not require a new
    // ad request.
    if (this.friendlyIframeEmbed_) {
      return;
    }
    this.protectedEmitLifecycleEvent_('resumeCallback');
    this.fromResumeCallback = true;
    // If layout of page has not changed, onLayoutMeasure will not be called
    // so do so explicitly.
    var resource = this.getResource();
    if (resource.hasBeenMeasured() && !resource.isMeasureRequested()) {
      this.onLayoutMeasure();
    }
  };

  /**
   * @return {!../../../src/service/resource.Resource}
   * @visibileForTesting
   */

  AmpA4A.prototype.getResource = function getResource() {
    return this.element.getResources().getResourceForElement(this.element);
  };

  /**
   * @return {boolean} whether adPromise was initialized (indicator of
   *    element validity).
   * @protected
   */

  AmpA4A.prototype.hasAdPromise = function hasAdPromise() {
    return !!this.adPromise_;
  };

  /**
   * @return {boolean} whether environment/element should initialize ad request
   *    promise chain.
   * @private
   */

  AmpA4A.prototype.shouldInitializePromiseChain_ = function shouldInitializePromiseChain_() {
    if (!this.signatureVerifier_.isAvailable()) {
      return false;
    }
    var slotRect = this.getIntersectionElementLayoutBox();
    if (slotRect.height == 0 || slotRect.width == 0) {
      _srcLog.dev().fine(TAG, 'onLayoutMeasure canceled due height/width 0', this.element);
      return false;
    }
    if (!_srcAdHelper.isAdPositionAllowed(this.element, this.win)) {
      _srcLog.user().warn(TAG, '<' + this.element.tagName + '> is not allowed to be ' + ('placed in elements with position:fixed: ' + this.element));
      return false;
    }
    // OnLayoutMeasure can be called when page is in prerender so delay until
    // visible.  Assume that it is ok to call isValidElement as it should
    // only being looking at window, immutable properties (i.e. location) and
    // its element ancestry.
    if (!this.isValidElement()) {
      // TODO(kjwright): collapse?
      _srcLog.user().warn(TAG, this.element.getAttribute('type'), 'Amp ad element ignored as invalid', this.element);
      return false;
    }
    return true;
  };

  /** @override */

  AmpA4A.prototype.onLayoutMeasure = function onLayoutMeasure() {
    var _this3 = this;

    if (this.xOriginIframeHandler_) {
      this.xOriginIframeHandler_.onLayoutMeasure();
    }
    if (this.adPromise_ || !this.shouldInitializePromiseChain_()) {
      return;
    }
    // If in localDev `type=fake` Ad specifies `force3p`, it will be forced
    // to go via 3p.
    if (_srcMode.getMode().localDev && this.element.getAttribute('type') == 'fake' && this.element.getAttribute('force3p') == 'true') {
      this.adUrl_ = this.getAdUrl();
      this.adPromise_ = Promise.resolve();
      return;
    }

    // Increment unique promise ID so that if its value changes within the
    // promise chain due to cancel from unlayout, the promise will be rejected.
    ++this.promiseId_;

    // Shorthand for: reject promise if current promise chain is out of date.
    var checkStillCurrent = this.verifyStillCurrent();

    // Return value from this chain: True iff rendering was "successful"
    // (i.e., shouldn't try to render later via iframe); false iff should
    // try to render later in iframe.
    // Cases to handle in this chain:
    //   - Everything ok  => Render; return true
    //   - Empty network response returned => Don't render; return true
    //   - Can't parse creative out of response => Don't render; return false
    //   - Can parse, but creative is empty => Don't render; return true
    //   - Validation fails => return false
    //   - Rendering fails => return false
    //   - Chain cancelled => don't return; drop error
    //   - Uncaught error otherwise => don't return; percolate error up
    this.adPromise_ = _srcServices.viewerForDoc(this.getAmpDoc()).whenFirstVisible().then(function () {
      checkStillCurrent();
      // See if experiment that delays request until slot is within
      // renderOutsideViewport. Within render outside viewport will not
      // resolve if already within viewport thus the check for already
      // meeting the definition as opposed to waiting on the promise.
      if (_this3.delayRequestEnabled_ && !_this3.getResource().renderOutsideViewport()) {
        return _this3.getResource().whenWithinRenderOutsideViewport();
      }
    })
    // This block returns the ad URL, if one is available.
    /** @return {!Promise<?string>} */
    .then(function () {
      checkStillCurrent();
      if (_this3.delayRequestEnabled_) {
        _srcLog.dev().info(TAG, 'ad request being built');
      }
      return (/** @type {!Promise<?string>} */_this3.getAdUrl()
      );
    })
    // This block returns the (possibly empty) response to the XHR request.
    /** @return {!Promise<?Response>} */
    .then(function (adUrl) {
      checkStillCurrent();
      _this3.adUrl_ = adUrl;
      _this3.protectedEmitLifecycleEvent_('urlBuilt');
      return adUrl && _this3.sendXhrRequest(adUrl);
    })
    // The following block returns either the response (as a {bytes, headers}
    // object), or null if no response is available / response is empty.
    /** @return {?Promise<?{bytes: !ArrayBuffer, headers: !Headers}>} */
    .then(function (fetchResponse) {
      checkStillCurrent();
      _this3.protectedEmitLifecycleEvent_('adRequestEnd');
      // If the response is null, we want to return null so that
      // unlayoutCallback will attempt to render via x-domain iframe,
      // assuming ad url or creative exist.
      if (!fetchResponse) {
        return null;
      }
      // If the response has response code 204, or arrayBuffer is null,
      // collapse it.
      if (!fetchResponse.arrayBuffer || fetchResponse.status == 204) {
        _this3.forceCollapse();
        return Promise.reject(NO_CONTENT_RESPONSE);
      }
      // TODO(tdrl): Temporary, while we're verifying whether SafeFrame is
      // an acceptable solution to the 'Safari on iOS doesn't fetch
      // iframe src from cache' issue.  See
      // https://github.com/ampproject/amphtml/issues/5614
      var method = fetchResponse.headers.get(RENDERING_TYPE_HEADER) || _this3.experimentalNonAmpCreativeRenderMethod_;
      _this3.experimentalNonAmpCreativeRenderMethod_ = method;
      if (method && !_srcTypes.isEnumValue(XORIGIN_MODE, method)) {
        _srcLog.dev().error('AMP-A4A', 'cross-origin render mode header ' + method);
      }
      var safeframeVersionHeader = fetchResponse.headers.get(SAFEFRAME_VERSION_HEADER);
      if (/^[0-9-]+$/.test(safeframeVersionHeader) && safeframeVersionHeader != DEFAULT_SAFEFRAME_VERSION) {
        _this3.safeframeVersion_ = safeframeVersionHeader;
        _this3.preconnect.preload(_this3.getSafeframePath_());
      }
      // Note: Resolving a .then inside a .then because we need to capture
      // two fields of fetchResponse, one of which is, itself, a promise,
      // and one of which isn't.  If we just return
      // fetchResponse.arrayBuffer(), the next step in the chain will
      // resolve it to a concrete value, but we'll lose track of
      // fetchResponse.headers.
      return fetchResponse.arrayBuffer().then(function (bytes) {
        if (bytes.byteLength == 0) {
          // The server returned no content. Instead of displaying a blank
          // rectangle, we collapse the slot instead.
          _this3.forceCollapse();
          return Promise.reject(NO_CONTENT_RESPONSE);
        }
        return {
          bytes: bytes,
          headers: fetchResponse.headers
        };
      });
    })
    // This block returns the ad creative and signature, if available; null
    // otherwise.
    /**
     * @return {!Promise<?{AdResponseDef}>}
     */
    .then(function (responseParts) {
      checkStillCurrent();
      if (responseParts) {
        _this3.protectedEmitLifecycleEvent_('extractCreativeAndSignature');
      }
      return responseParts && _this3.extractCreativeAndSignature(responseParts.bytes, responseParts.headers);
    })
    // This block returns the ad creative if it exists and validates as AMP;
    // null otherwise.
    /** @return {!Promise<?ArrayBuffer>} */
    .then(function (creativeParts) {
      checkStillCurrent();
      // Keep a handle to the creative body so that we can render into
      // SafeFrame or NameFrame later, if necessary.  TODO(tdrl): Temporary,
      // while we
      // assess whether this is the right solution to the Safari+iOS iframe
      // src cache issue.  If we decide to keep a SafeFrame-like solution,
      // we should restructure the promise chain to pass this info along
      // more cleanly, without use of an object variable outside the chain.
      if (!creativeParts) {
        return Promise.resolve();
      }
      _this3.creativeSize_ = creativeParts.size || _this3.creativeSize_;
      if (_this3.experimentalNonAmpCreativeRenderMethod_ != XORIGIN_MODE.CLIENT_CACHE && creativeParts.creative) {
        _this3.creativeBody_ = creativeParts.creative;
      }
      if (!creativeParts.signature) {
        return Promise.resolve();
      }
      _this3.protectedEmitLifecycleEvent_('adResponseValidateStart');
      return _this3.verifyCreativeSignature_(creativeParts.creative, creativeParts.signature).then(function (creative) {
        if (creative) {
          return creative;
        }

        _srcLog.user().error(TAG, _this3.element.getAttribute('type'), 'Unable to validate AMP creative against key providers');
        // Attempt to re-fetch the keys in case our locally cached
        // batch has expired.
        _this3.win.ampA4aValidationKeys = _this3.getKeyInfoSets_();
        return _this3.verifyCreativeSignature_(creativeParts.creative, creativeParts.signature);
      });
    }).then(function (creative) {
      checkStillCurrent();
      // Need to know if creative was verified as part of render outside
      // viewport but cannot wait on promise.  Sadly, need a state a
      // variable.
      _this3.isVerifiedAmpCreative_ = !!creative;
      // TODO(levitzky) If creative comes back null, we should consider re-
      // fetching the signing server public keys and try the verification
      // step again.
      return creative && _srcUtilsBytes.utf8Decode(creative);
    })
    // This block returns CreativeMetaDataDef iff the creative was verified
    // as AMP and could be properly parsed for friendly iframe render.
    /** @return {?CreativeMetaDataDef} */
    .then(function (creativeDecoded) {
      checkStillCurrent();
      // Note: It's critical that #getAmpAdMetadata_ be called
      // on precisely the same creative that was validated
      // via #validateAdResponse_.  See GitHub issue
      // https://github.com/ampproject/amphtml/issues/4187
      var creativeMetaDataDef = undefined;
      if (!creativeDecoded || !(creativeMetaDataDef = _this3.getAmpAdMetadata_(creativeDecoded))) {
        return null;
      }
      // Update priority.
      _this3.updatePriority(0);
      // Load any extensions; do not wait on their promises as this
      // is just to prefetch.
      var extensions = _srcServices.extensionsFor(_this3.win);
      creativeMetaDataDef.customElementExtensions.forEach(function (extensionId) {
        return extensions.loadExtension(extensionId);
      });
      return creativeMetaDataDef;
    })['catch'](function (error) {
      if (error == NO_CONTENT_RESPONSE) {
        return {
          minifiedCreative: '',
          customElementExtensions: [],
          customStylesheets: []
        };
      }
      // If error in chain occurs, report it and return null so that
      // layoutCallback can render via cross domain iframe assuming ad
      // url or creative exist.
      _this3.promiseErrorHandler_(error);
      return null;
    });
  };

  /**
   * Attempts to validate the creative signature against every key currently in
   * our possession. This should never be called before at least one key fetch
   * attempt is made.
   *
   * @param {!ArrayBuffer} creative
   * @param {!Uint8Array} signature
   * @return {!Promise<!ArrayBuffer>} The creative.
   */

  AmpA4A.prototype.verifyCreativeSignature_ = function verifyCreativeSignature_(creative, signature) {
    var _this4 = this;

    if (_srcMode.getMode().localDev) {
      // localDev mode allows "FAKESIG" signature for the "fake" network.
      if (signature == 'FAKESIG' && this.element.getAttribute('type') == 'fake') {
        return Promise.resolve(creative);
      }
    }

    // For each signing service, we have exactly one Promise,
    // keyInfoSetPromise, that holds an Array of Promises of signing keys.
    // So long as any one of these signing services can verify the
    // signature, then the creative is valid AMP.
    /** @type {!AllServicesCryptoKeysDef} */
    var keyInfoSetPromises = this.win.ampA4aValidationKeys;
    // Track if verification found, as it will ensure that promises yet to
    // resolve will "cancel" as soon as possible saving unnecessary resource
    // allocation.
    var verified = false;
    return _srcUtilsPromise.some(keyInfoSetPromises.map(function (keyInfoSetPromise) {
      // Resolve Promise into an object containing a 'keys' field, which
      // is an Array of Promises of signing keys.  *whew*
      return keyInfoSetPromise.then(function (keyInfoSet) {
        // As long as any one individual key of a particular signing
        // service, keyInfoPromise, can verify the signature, then the
        // creative is valid AMP.
        if (verified) {
          return Promise.reject('noop');
        }
        return _srcUtilsPromise.some(keyInfoSet.keys.map(function (keyInfoPromise) {
          // Resolve Promise into signing key.
          return keyInfoPromise.then(function (keyInfo) {
            if (verified) {
              return Promise.reject('noop');
            }
            if (!keyInfo) {
              return Promise.reject('Promise resolved to null key.');
            }
            var signatureVerifyStartTime = _this4.getNow_();
            // If the key exists, try verifying with it.
            return _this4.signatureVerifier_.verifySignature(new Uint8Array(creative), signature, keyInfo).then(function (isValid) {
              if (isValid) {
                verified = true;
                _this4.protectedEmitLifecycleEvent_('signatureVerifySuccess', {
                  'met.delta.AD_SLOT_ID': Math.round(_this4.getNow_() - signatureVerifyStartTime),
                  'signingServiceName.AD_SLOT_ID': keyInfo.serviceName
                });
                return creative;
              }
              // Only report if signature is expected to match, given that
              // multiple key providers could have been specified.
              // Note: the 'keyInfo &&' check here is not strictly
              // necessary, because we checked that above.  But
              // Closure type compiler can't seem to recognize that, so
              // this guarantees it to the compiler.
              if (keyInfo && _legacySignatureVerifier.verifyHashVersion(signature, keyInfo)) {
                _srcLog.user().error(TAG, _this4.element.getAttribute('type'), 'Key failed to validate creative\'s signature', keyInfo.serviceName, keyInfo.cryptoKey);
              }
              // Reject to ensure the some operation waits for other
              // possible providers to properly verify and resolve.
              return Promise.reject(keyInfo.serviceName + ' key failed to verify');
            }, function (err) {
              _srcLog.dev().error(TAG, _this4.element.getAttribute('type'), keyInfo.serviceName, err, _this4.element);
            });
          });
        }))
        // some() returns an array of which we only need a single value.
        .then(function (returnedArray) {
          return returnedArray[0];
        }, function () {
          // Rejection occurs if all keys for this provider fail to validate.
          return Promise.reject('All keys for ' + keyInfoSet.serviceName + ' failed to verify');
        });
      });
    })).then(function (returnedArray) {
      _this4.protectedEmitLifecycleEvent_('adResponseValidateEnd');
      return returnedArray[0];
    }, function () {
      // rejection occurs if all providers fail to verify.
      _this4.protectedEmitLifecycleEvent_('adResponseValidateEnd');
      return Promise.reject('No validation service could verify this key');
    });
  };

  /**
   * Handles uncaught errors within promise flow.
   * @param {*} error
   * @param {boolean=} opt_ignoreStack
   * @private
   */

  AmpA4A.prototype.promiseErrorHandler_ = function promiseErrorHandler_(error, opt_ignoreStack) {
    if (_srcError.isCancellation(error)) {
      // Rethrow if cancellation.
      throw error;
    }

    if (error && error.message) {
      error = _srcLog.duplicateErrorIfNecessary( /** @type {!Error} */error);
    } else {
      error = new Error('unknown error ' + error);
    }
    if (opt_ignoreStack) {
      error.ignoreStack = opt_ignoreStack;
    }

    // Add `type` to the message. Ensure to preserve the original stack.
    var type = this.element.getAttribute('type') || 'notype';
    if (error.message.indexOf(TAG + ': ' + type + ':') != 0) {
      error.message = TAG + ': ' + type + ': ' + error.message;
    }

    // Additional arguments.
    assignAdUrlToError( /** @type {!Error} */error, this.adUrl_);

    if (_srcMode.getMode().development || _srcMode.getMode().localDev || _srcMode.getMode().log) {
      _srcLog.user().error(TAG, error);
    } else {
      _srcLog.user().warn(TAG, error);
      // Report with 1% sampling as an expected dev error.
      if (Math.random() < 0.01) {
        _srcLog.dev().expectedError(TAG, error);
      }
    }
  };

  /** @override */

  AmpA4A.prototype.layoutCallback = function layoutCallback() {
    var _this5 = this;

    // Promise may be null if element was determined to be invalid for A4A.
    if (!this.adPromise_) {
      if (this.shouldInitializePromiseChain_()) {
        _srcLog.dev().error(TAG, 'Null promise in layoutCallback');
      }
      return Promise.resolve();
    }
    // There's no real throttling with A4A, but this is the signal that is
    // most comparable with the layout callback for 3p ads.
    this.protectedEmitLifecycleEvent_('preAdThrottle');
    var layoutCallbackStart = this.getNow_();
    var checkStillCurrent = this.verifyStillCurrent();
    // Promise chain will have determined if creative is valid AMP.
    return this.adPromise_.then(function (creativeMetaData) {
      checkStillCurrent();
      var delta = _this5.getNow_() - layoutCallbackStart;
      _this5.protectedEmitLifecycleEvent_('layoutAdPromiseDelay', {
        layoutAdPromiseDelay: Math.round(delta),
        isAmpCreative: !!creativeMetaData
      });
      if (_this5.isCollapsed_) {
        return Promise.resolve();
      }
      // If this.iframe already exists, bail out here. This should only happen in
      // testing context, not in production.
      if (_this5.iframe) {
        _this5.protectedEmitLifecycleEvent_('iframeAlreadyExists');
        return Promise.resolve();
      }
      if (!creativeMetaData) {
        // Non-AMP creative case, will verify ad url existence.
        return _this5.renderNonAmpCreative_();
      }
      // Must be an AMP creative.
      return _this5.renderAmpCreative_(creativeMetaData)['catch'](function (err) {
        checkStillCurrent();
        // Failed to render via AMP creative path so fallback to non-AMP
        // rendering within cross domain iframe.
        _srcLog.user().error(TAG, _this5.element.getAttribute('type'), 'Error injecting creative in friendly frame', err);
        _this5.promiseErrorHandler_(err);
        return _this5.renderNonAmpCreative_();
      });
    })['catch'](function (error) {
      _this5.promiseErrorHandler_(error);
      throw _srcError.cancellation();
    });
  };

  /** @override **/

  AmpA4A.prototype.attemptChangeSize = function attemptChangeSize(newHeight, newWidth) {
    // Store original size of slot in order to allow re-expansion on
    // unlayoutCallback so that it is reverted to original size in case
    // of resumeCallback.
    this.originalSlotSize_ = this.originalSlotSize_ || this.getLayoutBox();
    return _AMP$BaseElement.prototype.attemptChangeSize.call(this, newHeight, newWidth)['catch'](function () {});
  };

  /** @override  */

  AmpA4A.prototype.unlayoutCallback = function unlayoutCallback() {
    var _this6 = this;

    if (this.friendlyIframeEmbed_) {
      return false;
    }
    // Increment promiseId to cause any pending promise to cancel.
    this.promiseId_++;
    this.protectedEmitLifecycleEvent_('adSlotCleared');
    this.uiHandler.applyUnlayoutUI();
    if (this.originalSlotSize_) {
      _AMP$BaseElement.prototype.attemptChangeSize.call(this, this.originalSlotSize_.height, this.originalSlotSize_.width).then(function () {
        _this6.originalSlotSize_ = null;
      })['catch'](function (err) {
        // TODO(keithwrightbos): if we are unable to revert size, on next
        // trigger of promise chain the ad request may fail due to invalid
        // slot size.  Determine how to handle this case.
        _srcLog.dev().warn(TAG, 'unable to revert to original size', err);
      });
    }

    this.isCollapsed_ = false;

    // Allow embed to release its resources.
    if (this.friendlyIframeEmbed_) {
      this.friendlyIframeEmbed_.destroy();
      this.friendlyIframeEmbed_ = null;
    }

    // Remove rendering frame, if it exists.
    if (this.iframe && this.iframe.parentElement) {
      this.iframe.parentElement.removeChild(this.iframe);
      this.iframe = null;
    }

    this.adPromise_ = null;
    this.adUrl_ = null;
    this.creativeBody_ = null;
    this.isVerifiedAmpCreative_ = false;
    this.fromResumeCallback = false;
    this.experimentalNonAmpCreativeRenderMethod_ = _srcServices.platformFor(this.win).isIos() ? XORIGIN_MODE.SAFEFRAME : null;
    if (this.xOriginIframeHandler_) {
      this.xOriginIframeHandler_.freeXOriginIframe();
      this.xOriginIframeHandler_ = null;
    }
    return true;
  };

  /** @override  */

  AmpA4A.prototype.viewportCallback = function viewportCallback(inViewport) {
    if (this.friendlyIframeEmbed_) {
      _srcFriendlyIframeEmbed.setFriendlyIframeEmbedVisible(this.friendlyIframeEmbed_, inViewport);
    }
    if (this.xOriginIframeHandler_) {
      this.xOriginIframeHandler_.viewportCallback(inViewport);
    }
  };

  /** @override */

  AmpA4A.prototype.createPlaceholderCallback = function createPlaceholderCallback() {
    return this.uiHandler.createPlaceholder();
  };

  /**
   * Gets the Ad URL to send an XHR Request to.  To be implemented
   * by network.
   * @return {!Promise<string>|string}
   */

  AmpA4A.prototype.getAdUrl = function getAdUrl() {
    throw new Error('getAdUrl not implemented!');
  };

  /**
   * Resets ad url state to null, used to prevent frame get fallback if error
   * is thrown after url construction but prior to layoutCallback.
   */

  AmpA4A.prototype.resetAdUrl = function resetAdUrl() {
    this.adUrl_ = null;
  };

  /**
   * @return {!function()} function that when called will verify if current
   *    ad retrieval is current (meaning unlayoutCallback was not executed).
   *    If not, will throw cancellation exception;
   * @throws {Error}
   */

  AmpA4A.prototype.verifyStillCurrent = function verifyStillCurrent() {
    var _this7 = this;

    var promiseId = this.promiseId_;
    return function () {
      if (promiseId != _this7.promiseId_) {
        throw _srcError.cancellation();
      }
    };
  };

  /**
   * Extracts creative and verification signature (if present) from
   * XHR response body and header.  To be implemented by network.
   *
   * In the returned value, the `creative` field should be an `ArrayBuffer`
   * containing the utf-8 encoded bytes of the creative itself, while the
   * `signature` field should be a `Uint8Array` containing the raw signature
   * bytes.  The `signature` field may be null if no signature was available
   * for this creative / the creative is not valid AMP.
   *
   * @param {!ArrayBuffer} unusedResponseArrayBuffer content as array buffer
   * @param {!../../../src/service/xhr-impl.FetchResponseHeaders} unusedResponseHeaders
   *   XHR service FetchResponseHeaders object containing the response
   *   headers.
   * @return {!Promise<!AdResponseDef>}
   */

  AmpA4A.prototype.extractCreativeAndSignature = function extractCreativeAndSignature(unusedResponseArrayBuffer, unusedResponseHeaders) {
    throw new Error('extractCreativeAndSignature not implemented!');
  };

  /**
   * Forces the UI Handler to collapse this slot.
   * @visibleForTesting
   */

  AmpA4A.prototype.forceCollapse = function forceCollapse() {
    _srcLog.dev().assert(this.uiHandler);
    // Store original size to allow for reverting on unlayoutCallback so that
    // subsequent pageview allows for ad request.
    this.originalSlotSize_ = this.originalSlotSize_ || this.getLayoutBox();
    this.uiHandler.applyNoContentUI();
    this.isCollapsed_ = true;
  };

  /**
   * Callback executed when creative has successfully rendered within the
   * publisher page but prior to load (or ini-load for friendly frame AMP
   * creative render).  To be overridden by network implementations as needed.
   *
   * @param {boolean} isVerifiedAmpCreative whether or not the creative was
   *    verified as AMP and therefore given preferential treatment.
   */

  AmpA4A.prototype.onCreativeRender = function onCreativeRender(isVerifiedAmpCreative) {
    if (isVerifiedAmpCreative) {
      this.protectedEmitLifecycleEvent_('renderFriendlyEnd');
    }
  };

  /**
   * @param {!Element} iframe that was just created.  To be overridden for
   * testing.
   * @visibleForTesting
   */

  AmpA4A.prototype.onCrossDomainIframeCreated = function onCrossDomainIframeCreated(iframe) {
    _srcLog.dev().info(TAG, this.element.getAttribute('type'), 'onCrossDomainIframeCreated ' + iframe);
  };

  /**
   * Send ad request, extract the creative and signature from the response.
   * @param {string} adUrl Request URL to send XHR to.
   * @return {!Promise<?../../../src/service/xhr-impl.FetchResponse>}
   * @protected
   */

  AmpA4A.prototype.sendXhrRequest = function sendXhrRequest(adUrl) {
    var _this8 = this;

    this.protectedEmitLifecycleEvent_('adRequestStart');
    var xhrInit = {
      mode: 'cors',
      method: 'GET',
      credentials: 'include'
    };
    return _srcServices.xhrFor(this.win).fetch(adUrl, xhrInit)['catch'](function (unusedReason) {
      // If an error occurs, let the ad be rendered via iframe after delay.
      // TODO(taymonbeal): Figure out a more sophisticated test for deciding
      // whether to retry with an iframe after an ad request failure or just
      // give up and render the fallback content (or collapse the ad slot).
      _this8.protectedEmitLifecycleEvent_('networkError');
      return null;
    });
  };

  /**
   * To be overridden by network specific implementation indicating which
   * signing service(s) is to be used.
   * @return {!Array<string>} A list of signing services.
   */

  AmpA4A.prototype.getSigningServiceNames = function getSigningServiceNames() {
    return _srcMode.getMode().localDev ? ['google', 'google-dev'] : ['google'];
  };

  /**
   * Retrieves all public keys, as specified in _a4a-config.js.
   * None of the (inner or outer) promises returned by this function can reject.
   *
   * @return {!AllServicesCryptoKeysDef}
   * @private
   */

  AmpA4A.prototype.getKeyInfoSets_ = function getKeyInfoSets_() {
    var _this9 = this;

    if (!this.signatureVerifier_.isAvailable()) {
      return [];
    }
    return this.getSigningServiceNames().map(function (serviceName) {
      _srcLog.dev().assert(_srcMode.getMode().localDev || !_srcString.endsWith(serviceName, '-dev'));
      var url = _ads_a4aConfig.signingServerURLs[serviceName];
      var currServiceName = serviceName;
      if (url) {
        // Delay request until document is not in a prerender state.
        return _srcServices.viewerForDoc(_this9.getAmpDoc()).whenFirstVisible().then(function () {
          return _srcServices.xhrFor(_this9.win).fetchJson(url, {
            mode: 'cors',
            method: 'GET',
            // Set ampCors false so that __amp_source_origin is not
            // included in XHR CORS request allowing for keyset to be cached
            // across pages.
            ampCors: false,
            credentials: 'omit'
          }).then(function (res) {
            return res.json();
          }).then(function (jwkSetObj) {
            var result = { serviceName: currServiceName };
            if (_srcTypes.isObject(jwkSetObj) && Array.isArray(jwkSetObj.keys) && jwkSetObj.keys.every(_srcTypes.isObject)) {
              result.keys = jwkSetObj.keys;
            } else {
              _srcLog.user().error(TAG, _this9.element.getAttribute('type'), 'Invalid response from signing server ' + currServiceName, _this9.element);
              result.keys = [];
            }
            return result;
          });
        }).then(function (jwkSet) {
          return {
            serviceName: jwkSet.serviceName,
            keys: jwkSet.keys.map(function (jwk) {
              return _this9.signatureVerifier_.importPublicKey(jwkSet.serviceName, jwk)['catch'](function (err) {
                _srcLog.user().error(TAG, _this9.element.getAttribute('type'), 'error importing keys for: ' + jwkSet.serviceName, err, _this9.element);
                return null;
              });
            })
          };
        })['catch'](function (err) {
          _srcLog.user().error(TAG, _this9.element.getAttribute('type'), err, _this9.element);
          // TODO(a4a-team): This is a failure in the initial attempt to get
          // the keys, probably b/c of a network condition.  We should
          // re-trigger key fetching later.
          return { serviceName: currServiceName, keys: [] };
        });
      } else {
        // The given serviceName does not have a corresponding URL in
        // _a4a-config.js.
        var reason = 'Signing service \'' + serviceName + '\' does not exist.';
        _srcLog.user().error(TAG, _this9.element.getAttribute('type'), reason, _this9.element);
        return Promise.resolve({ serviceName: currServiceName, keys: [] });
      }
    });
  };

  /**
   * Render non-AMP creative within cross domain iframe.
   * @return {Promise<boolean>} Whether the creative was successfully rendered.
   * @private
   */

  AmpA4A.prototype.renderNonAmpCreative_ = function renderNonAmpCreative_() {
    if (this.element.getAttribute('disable3pfallback') == 'true') {
      _srcLog.user().warn(TAG, this.element.getAttribute('type'), 'fallback to 3p disabled');
      return Promise.resolve(false);
    }
    this.promiseErrorHandler_(new Error('fallback to 3p'),
    /* ignoreStack */true);
    // Haven't rendered yet, so try rendering via one of our
    // cross-domain iframe solutions.
    var method = this.experimentalNonAmpCreativeRenderMethod_;
    var renderPromise = Promise.resolve(false);
    if ((method == XORIGIN_MODE.SAFEFRAME || method == XORIGIN_MODE.NAMEFRAME) && this.creativeBody_) {
      renderPromise = this.renderViaNameAttrOfXOriginIframe_(this.creativeBody_);
      this.creativeBody_ = null; // Free resources.
    } else if (this.adUrl_) {
        _srcUrl.assertHttpsUrl(this.adUrl_, this.element);
        renderPromise = this.renderViaCachedContentIframe_(this.adUrl_);
      } else {
        // Ad URL may not exist if buildAdUrl throws error or returns empty.
        // If error occurred, it would have already been reported but let's
        // report to user in case of empty.
        _srcLog.user().warn(TAG, this.element.getAttribute('type'), 'No creative or URL available -- A4A can\'t render any ad');
      }
    _ampAd01ConcurrentLoad.incrementLoadingAds(this.win, renderPromise);
    return renderPromise;
  };

  /**
   * Render a validated AMP creative directly in the parent page.
   * @param {!CreativeMetaDataDef} creativeMetaData Metadata required to render
   *     AMP creative.
   * @return {!Promise} Whether the creative was successfully rendered.
   * @private
   */

  AmpA4A.prototype.renderAmpCreative_ = function renderAmpCreative_(creativeMetaData) {
    var _this10 = this;

    _srcLog.dev().assert(creativeMetaData.minifiedCreative, 'missing minified creative');
    _srcLog.dev().assert(!!this.element.ownerDocument, 'missing owner document?!');
    this.protectedEmitLifecycleEvent_('renderFriendlyStart');
    // Create and setup friendly iframe.
    this.iframe = /** @type {!HTMLIFrameElement} */_srcDom.createElementWithAttributes(
    /** @type {!Document} */this.element.ownerDocument, 'iframe', {
      // NOTE: It is possible for either width or height to be 'auto',
      // a non-numeric value.
      height: this.creativeSize_.height,
      width: this.creativeSize_.width,
      frameborder: '0',
      allowfullscreen: '',
      allowtransparency: '',
      scrolling: 'no'
    });
    this.applyFillContent(this.iframe);
    var fontsArray = [];
    if (creativeMetaData.customStylesheets) {
      creativeMetaData.customStylesheets.forEach(function (s) {
        var href = s['href'];
        if (href) {
          fontsArray.push(href);
        }
      });
    }
    var checkStillCurrent = this.verifyStillCurrent();
    return _srcFriendlyIframeEmbed.installFriendlyIframeEmbed(this.iframe, this.element, {
      host: this.element,
      url: this.adUrl_,
      html: creativeMetaData.minifiedCreative,
      extensionIds: creativeMetaData.customElementExtensions || [],
      fonts: fontsArray
    }, function (embedWin) {
      _srcServiceUrlReplacementsImpl.installUrlReplacementsForEmbed(_this10.getAmpDoc(), embedWin, new _a4aVariableSource.A4AVariableSource(_this10.getAmpDoc(), embedWin));
    }).then(function (friendlyIframeEmbed) {
      checkStillCurrent();
      _this10.friendlyIframeEmbed_ = friendlyIframeEmbed;
      _srcFriendlyIframeEmbed.setFriendlyIframeEmbedVisible(friendlyIframeEmbed, _this10.isInViewport());
      // Ensure visibility hidden has been removed (set by boilerplate).
      var frameDoc = friendlyIframeEmbed.iframe.contentDocument || friendlyIframeEmbed.win.document;
      _srcStyle.setStyle(frameDoc.body, 'visibility', 'visible');
      // Capture phase click handlers on the ad.
      _srcAnchorClickInterceptor.installAnchorClickInterceptor(_this10.getAmpDoc(), friendlyIframeEmbed.win);
      // Bubble phase click handlers on the ad.
      _this10.registerAlpHandler_(friendlyIframeEmbed.win);
      // Capture timing info for friendly iframe load completion.
      _srcServiceVariableSource.getTimingDataAsync(friendlyIframeEmbed.win, 'navigationStart', 'loadEventEnd').then(function (delta) {
        checkStillCurrent();
        _this10.protectedEmitLifecycleEvent_('friendlyIframeLoaded', {
          'navStartToLoadEndDelta.AD_SLOT_ID': Math.round(delta)
        });
      })['catch'](function (err) {
        _srcLog.dev().error(TAG, _this10.element.getAttribute('type'), 'getTimingDataAsync for renderFriendlyEnd failed: ', err);
      });
      protectFunctionWrapper(_this10.onCreativeRender, _this10, function (err) {
        _srcLog.dev().error(TAG, _this10.element.getAttribute('type'), 'Error executing onCreativeRender', err);
      })(true);
      // It's enough to wait for "ini-load" signal because in a FIE case
      // we know that the embed no longer consumes significant resources
      // after the initial load.
      return friendlyIframeEmbed.whenIniLoaded();
    }).then(function () {
      checkStillCurrent();
      // Capture ini-load ping.
      _this10.protectedEmitLifecycleEvent_('friendlyIframeIniLoad');
    });
  };

  /**
   * Shared functionality for cross-domain iframe-based rendering methods.
   * @param {!Object<string, string>} attributes The attributes of the iframe.
   * @return {!Promise} awaiting load event for ad frame
   * @private
   */

  AmpA4A.prototype.iframeRenderHelper_ = function iframeRenderHelper_(attributes) {
    var _this11 = this;

    var mergedAttributes = Object.assign(attributes, {
      height: this.creativeSize_.height,
      width: this.creativeSize_.width
    });

    if (this.sentinel) {
      mergedAttributes['data-amp-3p-sentinel'] = this.sentinel;
    }
    this.iframe = _srcDom.createElementWithAttributes(
    /** @type {!Document} */this.element.ownerDocument, 'iframe', Object.assign(mergedAttributes, SHARED_IFRAME_PROPERTIES));
    // TODO(keithwrightbos): noContentCallback?
    this.xOriginIframeHandler_ = new AMP.AmpAdXOriginIframeHandler(this);
    // Iframe is appended to element as part of xorigin frame handler init.
    // Executive onCreativeRender after init to ensure it can get reference
    // to frame but prior to load to allow for earlier access.
    var frameLoadPromise = this.xOriginIframeHandler_.init(this.iframe, /* opt_isA4A */true);
    protectFunctionWrapper(this.onCreativeRender, this, function (err) {
      _srcLog.dev().error(TAG, _this11.element.getAttribute('type'), 'Error executing onCreativeRender', err);
    })(false);
    return frameLoadPromise;
  };

  /**
   * Creates iframe whose src matches that of the ad URL.  The response should
   * have been cached causing the browser to render without callout.  However,
   * it is possible for cache miss to occur which can be detected server-side
   * by missing ORIGIN header.
   *
   * Note: As of 2016-10-18, the fill-from-cache assumption appears to fail on
   * Safari-on-iOS, which issues a fresh network request, even though the
   * content is already in cache.
   *
   * @param {string} adUrl  Ad request URL, as sent to #sendXhrRequest (i.e.,
   *    before any modifications that XHR module does to it.)
   * @return {!Promise} awaiting ad completed insertion.
   * @private
   */

  AmpA4A.prototype.renderViaCachedContentIframe_ = function renderViaCachedContentIframe_(adUrl) {
    this.protectedEmitLifecycleEvent_('renderCrossDomainStart');
    return this.iframeRenderHelper_({
      src: _srcServices.xhrFor(this.win).getCorsUrl(this.win, adUrl),
      name: JSON.stringify(_srcIframeAttributes.getContextMetadata(this.win, this.element, this.sentinel))
    });
  };

  /**
   * Render the creative via some "cross domain iframe that accepts the creative
   * in the name attribute".  This could be SafeFrame or the AMP-native
   * NameFrame.
   *
   * @param {!ArrayBuffer} creativeBody
   * @return {!Promise} awaiting load event for ad frame
   * @private
   */

  AmpA4A.prototype.renderViaNameAttrOfXOriginIframe_ = function renderViaNameAttrOfXOriginIframe_(creativeBody) {
    var _this12 = this;

    var method = this.experimentalNonAmpCreativeRenderMethod_;
    _srcLog.dev().assert(method == XORIGIN_MODE.SAFEFRAME || method == XORIGIN_MODE.NAMEFRAME, 'Unrecognized A4A cross-domain rendering mode: %s', method);
    this.protectedEmitLifecycleEvent_('renderSafeFrameStart');
    var checkStillCurrent = this.verifyStillCurrent();
    return _srcUtilsBytes.utf8Decode(creativeBody).then(function (creative) {
      checkStillCurrent();
      var srcPath = undefined;
      var name = '';
      switch (method) {
        case XORIGIN_MODE.SAFEFRAME:
          srcPath = _this12.getSafeframePath_() + '?n=0';
          break;
        case XORIGIN_MODE.NAMEFRAME:
          srcPath = _src3pFrame.getDefaultBootstrapBaseUrl(_this12.win, 'nameframe');
          // Name will be set for real below in nameframe case.
          break;
        default:
          // Shouldn't be able to get here, but...  Because of the assert, above,
          // we can only get here in non-dev mode, so give user feedback.
          _srcLog.user().error('A4A', 'A4A received unrecognized cross-domain name' + ' attribute iframe rendering mode request: %s.  Unable to' + ' render a creative for' + ' slot %s.', method, _this12.element.getAttribute('id'));
          return Promise.reject('Unrecognized rendering mode request');
      }
      // TODO(bradfrizzell): change name of function and var
      var contextMetadata = _srcIframeAttributes.getContextMetadata(_this12.win, _this12.element, _this12.sentinel);
      // TODO(bradfrizzell) Clean up name assigning.
      if (method == XORIGIN_MODE.NAMEFRAME) {
        contextMetadata['creative'] = creative;
        name = JSON.stringify(contextMetadata);
      } else if (method == XORIGIN_MODE.SAFEFRAME) {
        contextMetadata = JSON.stringify(contextMetadata);
        name = _this12.safeframeVersion_ + ';' + creative.length + ';' + creative + ('' + contextMetadata);
      }
      return _this12.iframeRenderHelper_({ src: srcPath, name: name });
    });
  };

  /**
   *
   * Throws {@code SyntaxError} if the metadata block delimiters are missing
   * or corrupted or if the metadata content doesn't parse as JSON.
   * @param {string} creative from which CSS is extracted
   * @return {?CreativeMetaDataDef} Object result of parsing JSON data blob inside
   *     the metadata markers on the ad text, or null if no metadata markers are
   *     found.
   * @private
   * TODO(keithwrightbos@): report error cases
   */

  AmpA4A.prototype.getAmpAdMetadata_ = function getAmpAdMetadata_(creative) {
    var metadataString = METADATA_STRING;
    var metadataStart = creative.lastIndexOf(METADATA_STRING);
    if (metadataStart < 0) {
      metadataString = METADATA_STRING_NO_QUOTES;
      metadataStart = creative.lastIndexOf(METADATA_STRING_NO_QUOTES);
    }
    if (metadataStart < 0) {
      // Couldn't find a metadata blob.
      _srcLog.dev().warn(TAG, this.element.getAttribute('type'), 'Could not locate start index for amp meta data in: %s', creative);
      return null;
    }
    var metadataEnd = creative.lastIndexOf('</script>');
    if (metadataEnd < 0) {
      // Couldn't find a metadata blob.
      _srcLog.dev().warn(TAG, this.element.getAttribute('type'), 'Could not locate closing script tag for amp meta data in: %s', creative);
      return null;
    }
    try {
      var metaDataObj = _srcJson.parseJson(creative.slice(metadataStart + metadataString.length, metadataEnd));
      var ampRuntimeUtf16CharOffsets = metaDataObj['ampRuntimeUtf16CharOffsets'];
      if (!_srcTypes.isArray(ampRuntimeUtf16CharOffsets) || ampRuntimeUtf16CharOffsets.length != 2 || typeof ampRuntimeUtf16CharOffsets[0] !== 'number' || typeof ampRuntimeUtf16CharOffsets[1] !== 'number') {
        throw new Error('Invalid runtime offsets');
      }
      var metaData = {};
      if (metaDataObj['customElementExtensions']) {
        metaData.customElementExtensions = metaDataObj['customElementExtensions'];
        if (!_srcTypes.isArray(metaData.customElementExtensions)) {
          throw new Error('Invalid extensions', metaData.customElementExtensions);
        }
      } else {
        metaData.customElementExtensions = [];
      }
      if (metaDataObj['customStylesheets']) {
        (function () {
          // Expect array of objects with at least one key being 'href' whose
          // value is URL.
          metaData.customStylesheets = metaDataObj['customStylesheets'];
          var errorMsg = 'Invalid custom stylesheets';
          if (!_srcTypes.isArray(metaData.customStylesheets)) {
            throw new Error(errorMsg);
          }
          metaData.customStylesheets.forEach(function (stylesheet) {
            if (!_srcTypes.isObject(stylesheet) || !stylesheet['href'] || typeof stylesheet['href'] !== 'string' || !/^https:\/\//i.test(stylesheet['href'])) {
              throw new Error(errorMsg);
            }
          });
        })();
      }
      // TODO(keithwrightbos): OK to assume ampRuntimeUtf16CharOffsets is before
      // metadata as its in the head?
      metaData.minifiedCreative = creative.slice(0, ampRuntimeUtf16CharOffsets[0]) + creative.slice(ampRuntimeUtf16CharOffsets[1], metadataStart) + creative.slice(metadataEnd + '</script>'.length);
      return metaData;
    } catch (err) {
      _srcLog.dev().warn(TAG, this.element.getAttribute('type'), 'Invalid amp metadata: %s', creative.slice(metadataStart + METADATA_STRING.length, metadataEnd));
      return null;
    }
  };

  /**
   * Registers a click handler for "A2A" (AMP-to-AMP navigation where the AMP
   * viewer navigates to an AMP destination on our behalf.
   * @param {!Window} iframeWin
   */

  AmpA4A.prototype.registerAlpHandler_ = function registerAlpHandler_(iframeWin) {
    var _this13 = this;

    if (!_srcExperiments.isExperimentOn(this.win, 'alp-for-a4a')) {
      return;
    }
    iframeWin.document.documentElement.addEventListener('click', function (event) {
      _adsAlpHandler.handleClick(event, function (url) {
        _srcServices.viewerForDoc(_this13.getAmpDoc()).navigateTo(url, 'a4a');
      });
    });
  };

  /**
   * @return {string} full url to safeframe implementation.
   * @private
   */

  AmpA4A.prototype.getSafeframePath_ = function getSafeframePath_() {
    return 'https://tpc.googlesyndication.com/safeframe/' + (this.safeframeVersion_ + '/html/container.html');
  };

  /**
   * Receive collapse notifications and record lifecycle events for them.
   *
   * @param unusedElement {!AmpElement}
   * @override
   */

  AmpA4A.prototype.collapsedCallback = function collapsedCallback(unusedElement) {
    this.protectedEmitLifecycleEvent_('adSlotCollapsed');
  };

  /**
   * To be overriden by network specific implementation.
   * This function will be called for each lifecycle event as specified in the
   * LIFECYCLE_STAGES enum declaration.  It may additionally pass extra
   * variables of the form { name: val }.  It is up to the subclass what to
   * do with those variables.
   *
   * @param {string} unusedEventName
   * @param {!Object<string, string|number>=} opt_extraVariables
   */

  AmpA4A.prototype.emitLifecycleEvent = function emitLifecycleEvent(unusedEventName, opt_extraVariables) {};

  return AmpA4A;
})(AMP.BaseElement);

exports.AmpA4A = AmpA4A;

function assignAdUrlToError(error, adUrl) {
  if (!adUrl || error.args && error.args['au']) {
    return;
  }
  var adQueryIdx = adUrl.indexOf('?');
  if (adQueryIdx == -1) {
    return;
  }
  (error.args || (error.args = {}))['au'] = adUrl.substring(adQueryIdx + 1, adQueryIdx + 251);
}

;

},{"../../../ads/_a4a-config":1,"../../../ads/alp/handler":3,"../../../ads/google/a4a/traffic-experiments":7,"../../../src/3p-frame":25,"../../../src/ad-helper":27,"../../../src/anchor-click-interceptor":29,"../../../src/dom":35,"../../../src/error":37,"../../../src/experiments":40,"../../../src/friendly-iframe-embed":42,"../../../src/iframe-attributes":44,"../../../src/json":46,"../../../src/layout":48,"../../../src/log":49,"../../../src/mode":51,"../../../src/service/url-replacements-impl":63,"../../../src/service/variable-source":64,"../../../src/services":65,"../../../src/string":66,"../../../src/style":68,"../../../src/types":69,"../../../src/url":71,"../../../src/utils/bytes":73,"../../../src/utils/promise":76,"../../amp-ad/0.1/concurrent-load":22,"./a4a-variable-source":12,"./legacy-signature-verifier":14}],14:[function(require,module,exports){
exports.__esModule = true;
exports.verifyHashVersion = verifyHashVersion;
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

var _srcCrypto = require('../../../src/crypto');

var _srcUtilsBase64 = require('../../../src/utils/base64');

/**
 * An object holding the public key and its hash.
 *
 * @typedef {{
 *   serviceName: string,
 *   hash: !Uint8Array,
 *   cryptoKey: !webCrypto.CryptoKey
 * }}
 */
var PublicKeyInfoDef = undefined;

exports.PublicKeyInfoDef = PublicKeyInfoDef;
/** @const {number} */
var SIGNATURE_VERSION = 0x00;

var LegacySignatureVerifier = (function () {

  /** @param {!Window} win */

  function LegacySignatureVerifier(win) {
    babelHelpers.classCallCheck(this, LegacySignatureVerifier);

    /** @private @const {!../../../src/service/crypto-impl.Crypto} */
    this.crypto_ = _srcCrypto.cryptoFor(win);
  }

  /**
   * Verifies signature was signed with private key matching public key given.
   * Does not verify data actually matches signature (use verifySignature).
   * @param {!Uint8Array} signature the RSA signature.
   * @param {!PublicKeyInfoDef} publicKeyInfo the RSA public key.
   * @return {boolean} whether signature was generated using hash.
   */

  /**
   * Checks whether Web Cryptography is available in this context.
   *
   * @return {boolean}
   */

  LegacySignatureVerifier.prototype.isAvailable = function isAvailable() {
    return this.crypto_.isPkcsAvailable();
  };

  /**
   * Convert a JSON Web Key object to a browser-native cryptographic key and
   * compute a hash for it.  The caller must verify that Web Cryptography is
   * available using isPkcsAvailable before calling this function.
   *
   * @param {string} serviceName used to identify the signing service.
   * @param {!Object} jwk An object which is hopefully an RSA JSON Web Key.  The
   *     caller should verify that it is an object before calling this function.
   * @return {!Promise<!PublicKeyInfoDef>}
   */

  LegacySignatureVerifier.prototype.importPublicKey = function importPublicKey(serviceName, jwk) {
    var _this = this;

    return this.crypto_.importPkcsKey(jwk).then(function (cryptoKey) {
      // We do the importKey first to allow the browser to check for
      // an invalid key.  This last check is in case the key is valid
      // but a different kind.
      if (typeof jwk.n != 'string' || typeof jwk.e != 'string') {
        throw new Error('missing fields in JSON Web Key');
      }
      var mod = _srcUtilsBase64.base64UrlDecodeToBytes(jwk.n);
      var pubExp = _srcUtilsBase64.base64UrlDecodeToBytes(jwk.e);
      var lenMod = lenPrefix(mod);
      var lenPubExp = lenPrefix(pubExp);
      var data = new Uint8Array(lenMod.length + lenPubExp.length);
      data.set(lenMod);
      data.set(lenPubExp, lenMod.length);
      // The list of RSA public keys are not under attacker's
      // control, so a collision would not help.
      return _this.crypto_.sha1(data).then(function (digest) {
        return {
          serviceName: serviceName,
          cryptoKey: cryptoKey,
          // Hash is the first 4 bytes of the SHA-1 digest.
          hash: new Uint8Array(digest, 0, 4)
        };
      });
    });
  };

  /**
   * Verifies RSA signature corresponds to the data, given a public key.
   * @param {!Uint8Array} data the data that was signed.
   * @param {!Uint8Array} signature the RSA signature.
   * @param {!PublicKeyInfoDef} publicKeyInfo the RSA public key.
   * @return {!Promise<!boolean>} whether the signature is valid for
   *     the public key.
   */

  LegacySignatureVerifier.prototype.verifySignature = function verifySignature(data, signature, publicKeyInfo) {
    if (!verifyHashVersion(signature, publicKeyInfo)) {
      return Promise.resolve(false);
    }
    // Verify that the data matches the raw RSA signature, using the
    // public key.
    // Append the version number to the data.
    var signedData = new Uint8Array(data.length + 1);
    signedData.set(data);
    signedData[data.length] = SIGNATURE_VERSION;

    return (/** @type {!Promise<boolean>} */this.crypto_.verifyPkcs(publicKeyInfo.cryptoKey, signature.subarray(5), signedData)
    );
  };

  return LegacySignatureVerifier;
})();

exports.LegacySignatureVerifier = LegacySignatureVerifier;

function verifyHashVersion(signature, publicKeyInfo) {
  // The signature has the following format:
  // 1-byte version + 4-byte key hash + raw RSA signature where
  // the raw RSA signature is computed over (data || 1-byte version).
  // If the hash doesn't match, don't bother checking this key.
  return signature.length > 5 && signature[0] == SIGNATURE_VERSION && hashesEqual(signature, publicKeyInfo.hash);
}

/**
 * Appends 4-byte endian data's length to the data itself.
 * @param {!Uint8Array} data
 * @return {!Uint8Array} the prepended 4-byte endian data's length together with
 *     the data itself.
 */
function lenPrefix(data) {
  var res = new Uint8Array(4 + data.length);
  res[0] = data.length >> 24 & 0xff;
  res[1] = data.length >> 16 & 0xff;
  res[2] = data.length >> 8 & 0xff;
  res[3] = data.length & 0xff;
  res.set(data, 4);
  return res;
}

/**
 * Compare the hash field of the signature to keyHash.
 * Note that signature has a one-byte version, followed by 4-byte hash.
 * @param {?Uint8Array} signature
 * @param {?Uint8Array} keyHash
 * @return {boolean} signature[1..5] == keyHash
 */
function hashesEqual(signature, keyHash) {
  if (!signature || !keyHash) {
    return false;
  }
  for (var i = 0; i < 4; i++) {
    if (signature[i + 1] !== keyHash[i]) {
      return false;
    }
  }
  return true;
}

},{"../../../src/crypto":33,"../../../src/utils/base64":72}],15:[function(require,module,exports){
exports.__esModule = true;
exports.adsenseIsA4AEnabled = adsenseIsA4AEnabled;
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

// Because AdSense and DoubleClick are both operated by Google and their A4A
// implementations share some behavior in common, part of the logic for this
// implementation is located in the ads/google/a4a directory rather than here.
// Most other ad networks will want to put their A4A code entirely in the
// extensions/amp-ad-network-${NETWORK_NAME}-impl directory.

var _adsGoogleA4aTrafficExperiments = require('../../../ads/google/a4a/traffic-experiments');

var _srcExperiments = require('../../../src/experiments');

/** @const {!string}  @private */
var ADSENSE_A4A_EXPERIMENT_NAME = 'expAdsenseA4A';

// The following experiment IDs are used by Google-side servers to
// understand what experiment is running and what mode the A4A code is
// running in.  In this experiment phase, we're testing 8 different
// configurations, resulting from the Cartesian product of the following:
//   - Traditional 3p iframe ad rendering (control) vs A4A rendering
//     (experiment)
//   - Experiment triggered by an external page, such as the Google Search
//     page vs. triggered internally in the client code.
//   - Doubleclick vs Adsense
// The following two objects contain experiment IDs for the first two
// categories for Adsense ads.  They are attached to the ad request by
// ads/google/a4a/traffic-experiments.js#googleAdsIsA4AEnabled when it works
// out whether a given ad request is in the overall experiment and, if so,
// which branch it's on.

// We would prefer the following constants to remain private, but we need to
// refer to them directly in amp-ad-3p-impl.js and amp-a4a.js in order to check
// whether we're in the experiment or not, for the purposes of enabling
// debug traffic profiling.  Once we have debugged the a4a implementation and
// can disable profiling again, we can return these constants to being
// private to this file.
/**
 * const {!../../../ads/google/a4a/traffic-experiments.A4aExperimentBranches}
 */
var ADSENSE_A4A_EXTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH = {
  control: '117152652',
  experiment: '117152653'
};

exports.ADSENSE_A4A_EXTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH = ADSENSE_A4A_EXTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH;
var ADSENSE_A4A_EXTERNAL_DELAYED_EXPERIMENT_BRANCHES_PRE_LAUNCH = {
  control: '117152654',
  experiment: '117152655'
};

exports.ADSENSE_A4A_EXTERNAL_DELAYED_EXPERIMENT_BRANCHES_PRE_LAUNCH = ADSENSE_A4A_EXTERNAL_DELAYED_EXPERIMENT_BRANCHES_PRE_LAUNCH;
/**
 * const {!../../../ads/google/a4a/traffic-experiments.A4aExperimentBranches}
 */
var ADSENSE_A4A_EXTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH = {
  control: '2092617',
  experiment: '2092618'
};

exports.ADSENSE_A4A_EXTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH = ADSENSE_A4A_EXTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH;
/**
 * @const {!../../../ads/google/a4a/traffic-experiments.A4aExperimentBranches}
 */
var ADSENSE_A4A_INTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH = {
  control: '117152670',
  experiment: '117152671'
};

exports.ADSENSE_A4A_INTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH = ADSENSE_A4A_INTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH;
/**
 * @const {!../../../ads/google/a4a/traffic-experiments.A4aExperimentBranches}
 */
var ADSENSE_A4A_INTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH = {
  control: '2092615',
  experiment: '2092616'
};

exports.ADSENSE_A4A_INTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH = ADSENSE_A4A_INTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH;
/**
 * @param {!Window} win
 * @param {!Element} element
 * @returns {boolean}
 */

function adsenseIsA4AEnabled(win, element) {
  var externalBranches = undefined,
      internalBranches = undefined;
  if (_srcExperiments.isExperimentOn(win, 'a4aFastFetchAdSenseLaunched')) {
    externalBranches = ADSENSE_A4A_EXTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH;
    internalBranches = ADSENSE_A4A_INTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH;
  } else {
    externalBranches = ADSENSE_A4A_EXTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH;
    internalBranches = ADSENSE_A4A_INTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH;
  }

  return !!element.getAttribute('data-ad-client') && _adsGoogleA4aTrafficExperiments.googleAdsIsA4AEnabled(win, element, ADSENSE_A4A_EXPERIMENT_NAME, externalBranches, internalBranches, ADSENSE_A4A_EXTERNAL_DELAYED_EXPERIMENT_BRANCHES_PRE_LAUNCH);
}

},{"../../../ads/google/a4a/traffic-experiments":7,"../../../src/experiments":40}],16:[function(require,module,exports){
exports.__esModule = true;
exports.cloudflareIsA4AEnabled = cloudflareIsA4AEnabled;
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
 * Determines which tags desire A4A handling
 *
 * @returns {boolean}
 */

function cloudflareIsA4AEnabled() {
  // We assume fast fetch for all content, but this will gracefully degrade,
  // when non-a4a content is delivered
  return true;
}

},{}],17:[function(require,module,exports){
exports.__esModule = true;
exports.resetSraStateForTesting = resetSraStateForTesting;
exports.getNetworkId = getNetworkId;
exports.constructSRABlockParameters = constructSRABlockParameters;
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

// Because AdSense and DoubleClick are both operated by Google and their A4A
// implementations share some behavior in common, part of the logic for this
// implementation is located in the ads/google/a4a directory rather than here.
// Most other ad networks will want to put their A4A code entirely in the
// extensions/amp-ad-network-${NETWORK_NAME}-impl directory.

var _ampA4a01AmpA4a = require('../../amp-a4a/0.1/amp-a4a');

var _adsGoogleA4aTrafficExperiments = require('../../../ads/google/a4a/traffic-experiments');

var _adsGoogleA4aUtils = require('../../../ads/google/a4a/utils');

var _adsGoogleUtils = require('../../../ads/google/utils');

var _adsGoogleA4aGoogleDataReporter = require('../../../ads/google/a4a/google-data-reporter');

var _adsGoogleA4aLineDelimitedResponseHandler = require('../../../ads/google/a4a/line-delimited-response-handler');

var _srcCrypto = require('../../../src/crypto');

var _srcDom = require('../../../src/dom');

var _srcJson = require('../../../src/json');

var _srcLog = require('../../../src/log');

var _srcMode = require('../../../src/mode');

var _srcServices = require('../../../src/services');

var _srcExperiments = require('../../../src/experiments');

var _srcUtilsDomFingerprint = require('../../../src/utils/dom-fingerprint');

var _srcAnalytics = require('../../../src/analytics');

var _srcStyle = require('../../../src/style');

var _srcUtilsBytes = require('../../../src/utils/bytes');

var _srcError = require('../../../src/error');

/** @type {string} */
var TAG = 'amp-ad-network-doubleclick-impl';

/** @const {string} */
var DOUBLECLICK_BASE_URL = 'https://securepubads.g.doubleclick.net/gampad/ads';

/** @private @const {!Object<string,string>} */
var PAGE_LEVEL_PARAMS_ = {
  'gdfp_req': '1',
  'sfv': _ampA4a01AmpA4a.DEFAULT_SAFEFRAME_VERSION,
  'u_sd': window.devicePixelRatio
};

/**
 * @const {string}
 * @visibileForTesting
 */
var TFCD = 'tagForChildDirectedTreatment';

exports.TFCD = TFCD;
/** @private {?Promise} */
var sraRequests = null;

/**
 * Array of functions used to combine block level request parameters for SRA
 * request.
 * @private @const
 * {!Array<!function(!Array<AmpAdNetworkDoubleclickImpl>):?Object<string,string>}
 */
var BLOCK_SRA_COMBINERS_ = [function (instances) {
  var uniqueIuNames = {};
  var uniqueIuNamesCount = 0;
  var prevIusEncoded = [];
  instances.forEach(function (instance) {
    var iu = _srcLog.dev().assert(instance.element.getAttribute('data-slot'));
    var componentNames = (iu || '').split('/');
    var encodedNames = [];
    for (var i = 0; i < componentNames.length; i++) {
      if (componentNames[i] == '') {
        continue;
      }
      var index = uniqueIuNames[componentNames[i]];
      if (index == undefined) {
        uniqueIuNames[componentNames[i]] = index = uniqueIuNamesCount++;
      }
      encodedNames.push(index);
    }
    prevIusEncoded.push(encodedNames.join('/'));
  });
  return {
    'iu_parts': Object.keys(uniqueIuNames).join(),
    'enc_prev_ius': prevIusEncoded.join()
  };
},
// Although declared at a block-level, this is actually page level so
// return true if ANY indicate cookie opt out.
function (instances) {
  return getFirstInstanceValue_(instances, function (instance) {
    return instance.jsonTargeting_ && instance.jsonTargeting_['cookieOptOut'] ? { 'co': '1' } : null;
  });
}, function (instances) {
  return { 'adks': instances.map(function (instance) {
      return instance.adKey_;
    }).join() };
}, function (instances) {
  return { 'prev_iu_szs': instances.map(function (instance) {
      return instance.size_.width + 'x' + instance.size_.height;
    }).join() };
},
// Although declared at a block-level, this is actually page level so
// return true if ANY indicate TFCD.
function (instances) {
  return getFirstInstanceValue_(instances, function (instance) {
    return instance.jsonTargeting_ && instance.jsonTargeting_[TFCD] ? { 'tfcd': instance.jsonTargeting_[TFCD] } : null;
  });
},
// Although declared at a block-level, this is actually page level so
// return true if ANY indicate manual experiment.
function (instances) {
  return getFirstInstanceValue_(instances, function (instance) {
    return _adsGoogleA4aTrafficExperiments.isInManualExperiment(instance.element) ? { 'adtest': 'on' } : null;
  });
}, function (instances) {
  var scps = [];
  instances.forEach(function (instance) {
    if (!instance.jsonTargeting_) {
      return;
    }
    scps.push(serializeTargeting_(instance.jsonTargeting_['targeting'] || null, instance.jsonTargeting_['categoryExclusions'] || null));
  });
  return scps.length ? { 'prev_scp': scps.join('|') } : null;
}, function (instances) {
  var eids = {};
  instances.forEach(function (instance) {
    var currEids = instance.element.getAttribute('data-experiment-id');
    if (currEids) {
      currEids.split(',').forEach(function (eid) {
        return eids[eid] = 1;
      });
    }
  });
  return Object.keys(eids).length ? { 'eid': Object.keys(eids).join() } : null;
}];

var AmpAdNetworkDoubleclickImpl = (function (_AmpA4A) {
  babelHelpers.inherits(AmpAdNetworkDoubleclickImpl, _AmpA4A);

  /**
   * @param {!Element} element
   */

  function AmpAdNetworkDoubleclickImpl(element) {
    babelHelpers.classCallCheck(this, AmpAdNetworkDoubleclickImpl);

    _AmpA4A.call(this, element);

    /**
     * @type {!../../../ads/google/a4a/performance.GoogleAdLifecycleReporter}
     */
    this.lifecycleReporter_ = this.lifecycleReporter_ || this.initLifecycleReporter();

    /**
     * Config to generate amp-analytics element for active view reporting.
     * @type {?JsonObject}
     * @private
     */
    this.ampAnalyticsConfig_ = null;

    /** @private {!../../../src/service/extensions-impl.Extensions} */
    this.extensions_ = _srcServices.extensionsFor(this.win);

    /** @private {?string} */
    this.qqid_ = null;

    /** @private {?({width, height}|../../../src/layout-rect.LayoutRectDef)} */
    this.size_ = null;

    /** @private {?Element} */
    this.ampAnalyticsElement_ = null;

    /** @private {?Object<string,*>}*/
    this.jsonTargeting_ = null;

    /** @private {number} */
    this.adKey_ = 0;

    // TODO(keithwrightbos) - how can pub enable?
    /** @private @const {boolean} */
    this.useSra_ = _srcMode.getMode().localDev && /(\?|&)force_sra=true(&|$)/.test(this.win.location.search);

    var sraInitializer = this.initializeSraPromise_();
    /** @protected {?function(?../../../src/service/xhr-impl.FetchResponse)} */
    this.sraResponseResolver = sraInitializer.resolver;

    /** @protected {?function(*)} */
    this.sraResponseRejector = sraInitializer.rejector;

    /** @private {!Promise<?../../../src/service/xhr-impl.FetchResponse>} */
    this.sraResponsePromise_ = sraInitializer.promise;
  }

  /** @override */

  AmpAdNetworkDoubleclickImpl.prototype.isValidElement = function isValidElement() {
    return _adsGoogleA4aUtils.isGoogleAdsA4AValidEnvironment(this.win) && this.isAmpAdElement() &&
    // Ensure not within remote.html iframe.
    !document.querySelector('meta[name=amp-3p-iframe-src]');
  };

  /**
   * @return {!{
   *  resolver: ?function(?../../../src/service/xhr-impl.FetchResponse),
   *  rejector: ?function(*),
   *  promise: !Promise<?../../../src/service/xhr-impl.FetchResponse>,
   * }}
   * @private
   */

  AmpAdNetworkDoubleclickImpl.prototype.initializeSraPromise_ = function initializeSraPromise_() {
    var resolver = null;
    var rejector = null;
    var promise = new Promise(function (inResolver, inRejector) {
      resolver = inResolver;
      rejector = inRejector;
    });
    return { resolver: resolver, rejector: rejector, promise: promise };
  };

  /**
   * Constructs block-level url parameters with side effect of setting
   * size_, jsonTargeting_, and adKey_ fields.
   * @return {!Object<string,string|boolean|number>}
   */

  AmpAdNetworkDoubleclickImpl.prototype.getBlockParameters_ = function getBlockParameters_() {
    _srcLog.dev().assert(this.size_);
    _srcLog.dev().assert(this.jsonTargeting_);
    var sizeStr = this.size_.width + 'x' + this.size_.height;
    var tfcd = this.jsonTargeting_ && this.jsonTargeting_[TFCD];
    var multiSizeDataStr = this.element.getAttribute('data-multi-size');
    if (multiSizeDataStr) {
      var multiSizeValidation = this.element.getAttribute('data-multi-size-validation') || 'true';
      // The following call will check all specified multi-size dimensions,
      // verify that they meet all requirements, and then return all the valid
      // dimensions in an array.
      var dimensions = _adsGoogleUtils.getMultiSizeDimensions(multiSizeDataStr, Number(this.element.getAttribute('width')), Number(this.element.getAttribute('height')), multiSizeValidation == 'true');
      sizeStr += '|' + dimensions.map(function (dimension) {
        return dimension.join('x');
      }).join('|');
    }
    return Object.assign({
      'iu': this.element.getAttribute('data-slot'),
      'co': this.jsonTargeting_ && this.jsonTargeting_['cookieOptOut'] ? '1' : null,
      'adk': this.adKey_,
      'sz': sizeStr,
      'tfcd': tfcd == undefined ? null : tfcd,
      'adtest': _adsGoogleA4aTrafficExperiments.isInManualExperiment(this.element) ? 'on' : null,
      'scp': serializeTargeting_(this.jsonTargeting_ && this.jsonTargeting_['targeting'] || null, this.jsonTargeting_ && this.jsonTargeting_['categoryExclusions'] || null)
    }, _adsGoogleA4aUtils.googleBlockParameters(this));
  };

  /**
   * Populate's block-level state for ad URL construction.
   * @visibileForTesting
   */

  AmpAdNetworkDoubleclickImpl.prototype.populateAdUrlState = function populateAdUrlState() {
    var width = Number(this.element.getAttribute('width'));
    var height = Number(this.element.getAttribute('height'));
    // If dc-use-attr-for-format experiment is on, we want to make our attribute
    // check to be more strict.
    var useAttributesForSize = _srcExperiments.isExperimentOn(this.win, 'dc-use-attr-for-format') ? !isNaN(width) && width > 0 && !isNaN(height) && height > 0 : width && height;
    this.size_ = useAttributesForSize ? { width: width, height: height } : this.getIntersectionElementLayoutBox();
    this.jsonTargeting_ = _srcJson.tryParseJson(this.element.getAttribute('json')) || {};
    this.adKey_ = this.generateAdKey_(this.size_.width + 'x' + this.size_.height);
  };

  /** @override */

  AmpAdNetworkDoubleclickImpl.prototype.getAdUrl = function getAdUrl() {
    var _this = this;

    if (this.iframe) {
      _srcLog.dev().warn(TAG, 'Frame already exists, sra: ' + this.useSra_);
      return '';
    }
    // TODO(keithwrightbos): SRA blocks currently unnecessarily generate full
    // ad url.  This could be optimized however non-SRA ad url is required to
    // fallback to non-SRA if single block.
    this.populateAdUrlState();
    // TODO: Check for required and allowed parameters. Probably use
    // validateData, from 3p/3p/js, after noving it someplace common.
    var startTime = Date.now();
    return getPageLevelParameters_(this.win, this.getAmpDoc(), startTime).then(function (pageLevelParameters) {
      return _adsGoogleA4aUtils.googleAdUrl(_this, DOUBLECLICK_BASE_URL, startTime, Object.assign(_this.getBlockParameters_(), pageLevelParameters), ['108809080']);
    });
  };

  /** @override */

  AmpAdNetworkDoubleclickImpl.prototype.extractCreativeAndSignature = function extractCreativeAndSignature(responseText, responseHeaders) {
    var _this2 = this;

    _adsGoogleA4aGoogleDataReporter.setGoogleLifecycleVarsFromHeaders(responseHeaders, this.lifecycleReporter_);
    this.ampAnalyticsConfig_ = _adsGoogleA4aUtils.extractAmpAnalyticsConfig(this, responseHeaders);
    this.qqid_ = responseHeaders.get(_adsGoogleA4aUtils.QQID_HEADER);
    if (this.ampAnalyticsConfig_) {
      // Load amp-analytics extensions
      this.extensions_. /*OK*/loadExtension('amp-analytics');
    }
    var adResponsePromise = _adsGoogleA4aUtils.extractGoogleAdCreativeAndSignature(responseText, responseHeaders);
    return adResponsePromise.then(function (adResponse) {
      // If the server returned a size, use that, otherwise use the size that
      // we sent in the ad request.
      if (adResponse.size) {
        _this2.size_ = adResponse.size;
      } else {
        adResponse.size = _this2.size_;
      }
      _this2.handleResize_(adResponse.size.width, adResponse.size.height);
      return Promise.resolve(adResponse);
    });
  };

  /** @override */

  AmpAdNetworkDoubleclickImpl.prototype.emitLifecycleEvent = function emitLifecycleEvent(eventName, opt_extraVariables) {
    if (opt_extraVariables) {
      this.lifecycleReporter_.setPingParameters(opt_extraVariables);
    }
    this.lifecycleReporter_.sendPing(eventName);
  };

  /** @override */

  AmpAdNetworkDoubleclickImpl.prototype.unlayoutCallback = function unlayoutCallback() {
    _AmpA4A.prototype.unlayoutCallback.call(this);
    this.element.setAttribute('data-amp-slot-index', this.win.ampAdSlotIdCounter++);
    this.lifecycleReporter_ = this.initLifecycleReporter();
    if (this.ampAnalyticsElement_) {
      _srcDom.removeElement(this.ampAnalyticsElement_);
      this.ampAnalyticsElement_ = null;
    }
    this.ampAnalyticsConfig_ = null;
    this.jsonTargeting_ = null;
    // Reset SRA requests to allow for resumeCallback to re-fetch
    // ad requests.  Assumes that unlayoutCallback will be called for all slots
    // in rapid succession (meaning onLayoutMeasure initiated promise chain
    // will not be started until resumeCallback).
    sraRequests = null;
    var sraInitializer = this.initializeSraPromise_();
    this.sraResponseResolver = sraInitializer.resolver;
    this.sraResponseRejector = sraInitializer.rejector;
    this.sraResponsePromise_ = sraInitializer.promise;
    this.qqid_ = null;
  };

  /**
   * @return {!../../../ads/google/a4a/performance.BaseLifecycleReporter}
   */

  AmpAdNetworkDoubleclickImpl.prototype.initLifecycleReporter = function initLifecycleReporter() {
    return _adsGoogleA4aGoogleDataReporter.googleLifecycleReporterFactory(this);
  };

  /** @override */

  AmpAdNetworkDoubleclickImpl.prototype.onCreativeRender = function onCreativeRender(isVerifiedAmpCreative) {
    _AmpA4A.prototype.onCreativeRender.call(this, isVerifiedAmpCreative);
    if (this.ampAnalyticsConfig_) {
      _srcLog.dev().assert(!this.ampAnalyticsElement_);
      if (_adsGoogleA4aUtils.isReportingEnabled(this)) {
        _adsGoogleA4aUtils.addCsiSignalsToAmpAnalyticsConfig(this.win, this.element, this.ampAnalyticsConfig_, this.qqid_, isVerifiedAmpCreative, this.lifecycleReporter_.getDeltaTime(), this.lifecycleReporter_.getInitTime());
      }
      this.ampAnalyticsElement_ = _srcAnalytics.insertAnalyticsElement(this.element, this.ampAnalyticsConfig_, true);
    }

    this.lifecycleReporter_.addPingsForVisibility(this.element);

    _srcStyle.setStyles(_srcLog.dev().assertElement(this.iframe), {
      width: this.size_.width + 'px',
      height: this.size_.height + 'px'
    });
  };

  /**
   * @param {string} size
   * @return {string} The ad unit hash key string.
   * @private
   */

  AmpAdNetworkDoubleclickImpl.prototype.generateAdKey_ = function generateAdKey_(size) {
    var element = this.element;
    var domFingerprint = _srcUtilsDomFingerprint.domFingerprintPlain(element);
    var slot = element.getAttribute('data-slot') || '';
    var multiSize = element.getAttribute('data-multi-size') || '';
    var string = slot + ':' + size + ':' + multiSize + ':' + domFingerprint;
    return _srcCrypto.stringHash32(string);
  };

  /**
   * Attempts to resize the ad, if the returned size is smaller than the primary
   * dimensions.
   * @param {number} width
   * @param {number} height
   * @private
   */

  AmpAdNetworkDoubleclickImpl.prototype.handleResize_ = function handleResize_(width, height) {
    var pWidth = this.element.getAttribute('width');
    var pHeight = this.element.getAttribute('height');
    // We want to resize only if neither returned dimension is larger than its
    // primary counterpart, and if at least one of the returned dimensions
    // differ from its primary counterpart.
    if ((width != pWidth || height != pHeight) && width <= pWidth && height <= pHeight) {
      this.attemptChangeSize(height, width)['catch'](function () {});
    }
  };

  /** @override */

  AmpAdNetworkDoubleclickImpl.prototype.sendXhrRequest = function sendXhrRequest(adUrl) {
    var _this3 = this;

    if (!this.useSra_) {
      return _AmpA4A.prototype.sendXhrRequest.call(this, adUrl);
    }
    // Wait for SRA request which will call response promise when this block's
    // response has been returned.
    this.initiateSraRequests();
    // Null response indicates single slot should execute using non-SRA method.
    return this.sraResponsePromise_.then(function (response) {
      return response || _AmpA4A.prototype.sendXhrRequest.call(_this3, adUrl);
    });
  };

  /**
   * Groups slots by type and networkId from data-slot parameter.  Exposed for
   * ease of testing.
   * @return {!Promise<!Object<string,!Array<!Promise<!../../../src/base-element.BaseElement>>>>}
   * @visibileForTesting
   */

  AmpAdNetworkDoubleclickImpl.prototype.groupSlotsForSra = function groupSlotsForSra() {
    return _adsGoogleA4aUtils.groupAmpAdsByType(this.win, this.element.getAttribute('type'), getNetworkId);
  };

  /**
   * Executes SRA request via the following steps:
   * - create only one executor per page
   * - get all doubleclick amp-ad instances on the page
   * - group by networkID allowing for separate SRA requests
   * - for each grouping, construct SRA request
   * - handle chunks for streaming response for each block
   * @visibileForTesting
   */

  AmpAdNetworkDoubleclickImpl.prototype.initiateSraRequests = function initiateSraRequests() {
    var _this4 = this;

    if (sraRequests) {
      return;
    }
    // Use cancellation of the first slot's promiseId as indication of
    // unlayoutCallback execution.  Assume that if called for one slot, it will
    // be called for all and we should cancel SRA execution.
    var checkStillCurrent = this.verifyStillCurrent();
    sraRequests = this.groupSlotsForSra().then(function (groupIdToBlocksAry) {
      checkStillCurrent();
      Object.keys(groupIdToBlocksAry).forEach(function (networkId) {
        var blocks = _srcLog.dev().assert(groupIdToBlocksAry[networkId]);
        // TODO: filter blocks with SRA disabled?
        Promise.all(blocks).then(function (instances) {
          _srcLog.dev().assert(instances.length);
          checkStillCurrent();
          // Exclude any instances that do not have an adPromise_ as this
          // indicates they were invalid.
          var typeInstances =
          /** @type {!Array<!AmpAdNetworkDoubleclickImpl>}*/instances.filter(function (instance) {
            var isValid = instance.hasAdPromise();
            if (!isValid) {
              _srcLog.dev().info(TAG, 'Ignoring instance without ad promise as likely invalid', instance.element);
            }
            return isValid;
          });
          if (!typeInstances.length) {
            // Only contained invalid elements.
            return;
          }
          // Determine if more than one block for this element, if not do not
          // set sra request promise which results in sending as
          // non-SRA request (benefit is it allows direct cache method).
          if (typeInstances.length == 1) {
            _srcLog.dev().info(TAG, 'single block in network ' + networkId);
            typeInstances[0].sraResponseResolver(null);
            return;
          }
          // Construct and send SRA request.
          // Chunk hanlder called with metadata and creative for each slot
          // in order of URLs given.  Construct promise for each slot
          // such that its resolver will be called.
          var sraRequestAdUrlResolvers = typeInstances.map(function (instance) {
            return instance.sraResponseResolver;
          });
          var slotCallback = _adsGoogleA4aLineDelimitedResponseHandler.metaJsonCreativeGrouper(function (creative, headersObj, done) {
            checkStillCurrent();
            // Force safeframe rendering method.
            headersObj[_ampA4a01AmpA4a.RENDERING_TYPE_HEADER] = _ampA4a01AmpA4a.XORIGIN_MODE.SAFEFRAME;
            // Construct pseudo fetch response to be passed down the A4A
            // promise chain for this block.
            var headers =
            /** @type {?../../../src/service/xhr-impl.FetchResponseHeaders} */
            {
              get: function (name) {
                return headersObj[name];
              },
              has: function (name) {
                return !!headersObj[name];
              }
            };
            var fetchResponse =
            /** @type {?../../../src/service/xhr-impl.FetchResponse} */
            {
              headers: headers,
              arrayBuffer: function () {
                return _srcUtilsBytes.utf8Encode(creative);
              }
            };
            // Pop head off of the array of resolvers as the response
            // should match the order of blocks declared in the ad url.
            // This allows the block to start rendering while the SRA
            // response is streaming back to the client.
            _srcLog.dev().assert(sraRequestAdUrlResolvers.shift())(fetchResponse);
            // If done, expect array to be empty (ensures ad response
            // included data for all slots).
            if (done && sraRequestAdUrlResolvers.length) {
              _srcLog.dev().warn(TAG, 'Premature end of SRA response', sraRequestAdUrlResolvers.length, sraUrl);
            }
          });
          // TODO(keithwrightbos) - how do we handle per slot 204 response?
          var sraUrl = undefined;
          return constructSRARequest_(_this4.win, _this4.getAmpDoc(), typeInstances).then(function (sraUrlIn) {
            checkStillCurrent();
            sraUrl = sraUrlIn;
            return _srcServices.xhrFor(_this4.win).fetch(sraUrl, {
              mode: 'cors',
              method: 'GET',
              credentials: 'include'
            });
          }).then(function (response) {
            checkStillCurrent();
            return _adsGoogleA4aLineDelimitedResponseHandler.lineDelimitedStreamer(_this4.win, response, slotCallback);
          })['catch'](function (error) {
            _ampA4a01AmpA4a.assignAdUrlToError( /** @type {!Error} */error, sraUrl);
            var canceled = _srcError.isCancellation(error);
            if (!canceled) {
              _srcLog.user().error(TAG, 'SRA request failure', error);
            }
            // Collapse all slots on failure so long as they are not
            // cancellation.
            typeInstances.forEach(function (instance) {
              // Reset ad url to ensure layoutCallback does not fallback to
              // frame get which would lose SRA guarantees.
              // TODO(keithwrightbos): publisher should indicate if
              // explicit is required!
              instance.resetAdUrl();
              if (!canceled) {
                instance.attemptCollapse();
              }
              instance.sraResponseRejector(error);
            });
          });
        });
      });
    });
  };

  AmpAdNetworkDoubleclickImpl.prototype.getPreconnectUrls = function getPreconnectUrls() {
    return ['https://partner.googleadservices.com', 'https://tpc.googlesyndication.com'];
  };

  return AmpAdNetworkDoubleclickImpl;
})(_ampA4a01AmpA4a.AmpA4A);

exports.AmpAdNetworkDoubleclickImpl = AmpAdNetworkDoubleclickImpl;

AMP.registerElement('amp-ad-network-doubleclick-impl', AmpAdNetworkDoubleclickImpl);

/** @visibileForTesting */

function resetSraStateForTesting() {
  sraRequests = null;
}

/**
 * @param {!Element} element
 * @return {string} networkId from data-ad-slot attribute.
 * @visibileForTesting
 */

function getNetworkId(element) {
  var networkId = /^(?:\/)?(\d+)/.exec(_srcLog.dev().assertString(element.getAttribute('data-slot')));
  // TODO: guarantee data-ad-slot format as part of isValidElement?
  return networkId ? networkId[1] : '';
}

/**
 * @param {!Window} win
 * @param {!Node|!../../../src/service/ampdoc-impl.AmpDoc} doc
 * @param {!Array<!AmpAdNetworkDoubleclickImpl>} instances
 * @return {!Promise<string>} SRA request URL
 */
function constructSRARequest_(win, doc, instances) {
  var startTime = Date.now();
  return getPageLevelParameters_(win, doc, startTime, true).then(function (pageLevelParameters) {
    var blockParameters = constructSRABlockParameters(instances);
    return _adsGoogleA4aUtils.truncAndTimeUrl(DOUBLECLICK_BASE_URL, Object.assign(blockParameters, pageLevelParameters), startTime);
  });
}

/**
 * @param {!Array<!AmpAdNetworkDoubleclickImpl>} instances
 * @visibileForTesting
 */

function constructSRABlockParameters(instances) {
  var parameters = {};
  BLOCK_SRA_COMBINERS_.forEach(function (combiner) {
    return Object.assign(parameters, combiner(instances));
  });
  return parameters;
}

/**
 * @param {!Window} win
 * @param {!Node|!../../../src/service/ampdoc-impl.AmpDoc} doc
 * @param {number} startTime
 * @param {boolean=} isSra
 * @return {!Promise<!Object<string,string|number|boolean>>}
 */
function getPageLevelParameters_(win, doc, startTime, isSra) {
  return _adsGoogleA4aUtils.googlePageParameters(win, doc, startTime, 'ldjh').then(function (pageLevelParameters) {
    var parameters = Object.assign({}, PAGE_LEVEL_PARAMS_);
    parameters['impl'] = isSra ? 'fifs' : 'ifr';
    return Object.assign(parameters, pageLevelParameters);
  });
}

/**
 * @param {?Object<string, (!Array<string>|string)>} targeting
 * @param {?(!Array<string>|string)} categoryExclusions
 * @return {?string}
 * @private
 */
function serializeTargeting_(targeting, categoryExclusions) {
  var serialized = targeting ? Object.keys(targeting).map(function (key) {
    return serializeItem_(key, targeting[key]);
  }) : [];
  if (categoryExclusions) {
    serialized.push(serializeItem_('excl_cat', categoryExclusions));
  }
  return serialized.length ? serialized.join('&') : null;
}

/**
 * @param {string} key
 * @param {(!Array<string>|string)} value
 * @return {string}
 * @private
 */
function serializeItem_(key, value) {
  var serializedValue = (Array.isArray(value) ? value : [value]).map(encodeURIComponent).join();
  return encodeURIComponent(key) + '=' + serializedValue;
}

/**
 * @param {!Array<!AmpAdNetworkDoubleclickImpl>} instances
 * @param {!function(AmpAdNetworkDoubleclickImpl):?T} extractFn
 * @return {?T} value of first instance with non-null/undefined value or null
 *    if none can be found
 * @template T
 * @private
 */
function getFirstInstanceValue_(instances, extractFn) {
  for (var i = 0; i < instances.length; i++) {
    var val = extractFn(instances[i]);
    if (val) {
      return val;
    }
  }
  return null;
}

},{"../../../ads/google/a4a/google-data-reporter":4,"../../../ads/google/a4a/line-delimited-response-handler":5,"../../../ads/google/a4a/traffic-experiments":7,"../../../ads/google/a4a/utils":9,"../../../ads/google/utils":11,"../../../src/analytics":28,"../../../src/crypto":33,"../../../src/dom":35,"../../../src/error":37,"../../../src/experiments":40,"../../../src/json":46,"../../../src/log":49,"../../../src/mode":51,"../../../src/services":65,"../../../src/style":68,"../../../src/utils/bytes":73,"../../../src/utils/dom-fingerprint":74,"../../amp-a4a/0.1/amp-a4a":13}],18:[function(require,module,exports){
exports.__esModule = true;
exports.doubleclickIsA4AEnabled = doubleclickIsA4AEnabled;
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

// Because AdSense and DoubleClick are both operated by Google and their A4A
// implementations share some behavior in common, part of the logic for this
// implementation is located in the ads/google/a4a directory rather than here.
// Most other ad networks will want to put their A4A code entirely in the
// extensions/amp-ad-network-${NETWORK_NAME}-impl directory.

var _adsGoogleA4aTrafficExperiments = require('../../../ads/google/a4a/traffic-experiments');

var _adsGoogleA4aUtils = require('../../../ads/google/a4a/utils');

var _srcMode = require('../../../src/mode');

var _srcUrl = require('../../../src/url');

var _srcExperiments = require('../../../src/experiments');

/** @const {string} */
var DOUBLECLICK_A4A_EXPERIMENT_NAME = 'expDoubleclickA4A';

// The following experiment IDs are used by Google-side servers to
// understand what experiment is running and what mode the A4A code is
// running in.  In this experiment phase, we're testing 8 different
// configurations, resulting from the Cartesian product of the following:
//   - Traditional 3p iframe ad rendering (control) vs A4A rendering
//     (experiment)
//   - Experiment triggered by an external page, such as the Google Search
//     page vs. triggered internally in the client code.
//   - Doubleclick vs Adsense
// The following two objects contain experiment IDs for the first two
// categories for Doubleclick ads.  They are attached to the ad request by
// ads/google/a4a/traffic-experiments.js#googleAdsIsA4AEnabled when it works
// out whether a given ad request is in the overall experiment and, if so,
// which branch it's on.

// We would prefer the following constants to remain private, but we need to
// refer to them directly in amp-ad-3p-impl.js and amp-a4a.js in order to check
// whether we're in the experiment or not, for the purposes of enabling
// debug traffic profiling.  Once we have debugged the a4a implementation and
// can disable profiling again, we can return these constants to being
// private to this file.
/** @const {!../../../ads/google/a4a/traffic-experiments.A4aExperimentBranches} */
var DOUBLECLICK_A4A_EXTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH = {
  control: '117152662',
  experiment: '117152663'
};

exports.DOUBLECLICK_A4A_EXTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH = DOUBLECLICK_A4A_EXTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH;
var DOUBLECLICK_A4A_EXTERNAL_DELAYED_EXPERIMENT_BRANCHES_PRE_LAUNCH = {
  control: '117152664',
  experiment: '117152665'
};

exports.DOUBLECLICK_A4A_EXTERNAL_DELAYED_EXPERIMENT_BRANCHES_PRE_LAUNCH = DOUBLECLICK_A4A_EXTERNAL_DELAYED_EXPERIMENT_BRANCHES_PRE_LAUNCH;
/**
 * @const {!../../../ads/google/a4a/traffic-experiments.A4aExperimentBranches}
 */
var DOUBLECLICK_A4A_EXTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH = {
  control: '2092619',
  experiment: '2092620'
};

exports.DOUBLECLICK_A4A_EXTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH = DOUBLECLICK_A4A_EXTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH;
/**
 * @const {!../../../ads/google/a4a/traffic-experiments.A4aExperimentBranches}
 */
var DOUBLECLICK_A4A_INTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH = {
  control: '117152680',
  experiment: '117152681'
};

exports.DOUBLECLICK_A4A_INTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH = DOUBLECLICK_A4A_INTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH;
/**
 * @const {!../../../ads/google/a4a/traffic-experiments.A4aExperimentBranches}
 */
var DOUBLECLICK_A4A_INTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH = {
  control: '2092613',
  experiment: '2092614'
};

exports.DOUBLECLICK_A4A_INTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH = DOUBLECLICK_A4A_INTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH;
/**
 * @const {!../../../ads/google/a4a/traffic-experiments.A4aExperimentBranches}
 */
var DOUBLECLICK_A4A_BETA_BRANCHES = {
  control: '2077830',
  experiment: '2077831'
};

exports.DOUBLECLICK_A4A_BETA_BRANCHES = DOUBLECLICK_A4A_BETA_BRANCHES;
/**
 * @const {!../../../ads/google/a4a/traffic-experiments.A4aExperimentBranches}
 */
var DOUBLECLICK_SFG_INTERNAL_EXPERIMENT_BRANCHES = {
  control: '21060540',
  experiment: '21060541'
};

exports.DOUBLECLICK_SFG_INTERNAL_EXPERIMENT_BRANCHES = DOUBLECLICK_SFG_INTERNAL_EXPERIMENT_BRANCHES;
var BETA_ATTRIBUTE = 'data-use-beta-a4a-implementation';

exports.BETA_ATTRIBUTE = BETA_ATTRIBUTE;
/**
 * @param {!Window} win
 * @param {!Element} element
 * @returns {boolean}
 */

function doubleclickIsA4AEnabled(win, element) {
  if (element.hasAttribute('useSameDomainRenderingUntilDeprecated')) {
    return false;
  }
  var a4aRequested = element.hasAttribute(BETA_ATTRIBUTE);
  // Note: Under this logic, a4aRequested shortcuts googleAdsIsA4AEnabled and,
  // therefore, carves out of the experiment branches.  Any publisher using this
  // attribute will be excluded from the experiment altogether.
  // TODO(tdrl): The "is this site eligible" logic has gotten scattered around
  // and is now duplicated.  It should be cleaned up and factored into a single,
  // shared location.
  var externalBranches = undefined,
      internalBranches = undefined;
  if (_srcExperiments.isExperimentOn(win, 'a4aFastFetchDoubleclickLaunched')) {
    externalBranches = DOUBLECLICK_A4A_EXTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH;
    internalBranches = DOUBLECLICK_A4A_INTERNAL_EXPERIMENT_BRANCHES_POST_LAUNCH;
  } else {
    externalBranches = DOUBLECLICK_A4A_EXTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH;
    internalBranches = DOUBLECLICK_A4A_INTERNAL_EXPERIMENT_BRANCHES_PRE_LAUNCH;
  }
  var enableA4A = _adsGoogleA4aTrafficExperiments.googleAdsIsA4AEnabled(win, element, DOUBLECLICK_A4A_EXPERIMENT_NAME, externalBranches, internalBranches, DOUBLECLICK_A4A_EXTERNAL_DELAYED_EXPERIMENT_BRANCHES_PRE_LAUNCH, DOUBLECLICK_SFG_INTERNAL_EXPERIMENT_BRANCHES) || a4aRequested && (_srcUrl.isProxyOrigin(win.location) || _srcMode.getMode(win).localDev || _srcMode.getMode(win).test);
  if (enableA4A && a4aRequested && !_adsGoogleA4aTrafficExperiments.isInManualExperiment(element)) {
    element.setAttribute(_adsGoogleA4aUtils.EXPERIMENT_ATTRIBUTE, DOUBLECLICK_A4A_BETA_BRANCHES.experiment);
  }
  return enableA4A;
}

},{"../../../ads/google/a4a/traffic-experiments":7,"../../../ads/google/a4a/utils":9,"../../../src/experiments":40,"../../../src/mode":51,"../../../src/url":71}],19:[function(require,module,exports){
exports.__esModule = true;
exports.fakeIsA4AEnabled = fakeIsA4AEnabled;
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
 * Check whether the fake ad network wants to use A4A.  Returns true iff the
 * `data-use-a4a` attribute is set on the `amp-ad` element.
 *
 * **Note:** `data-use-a4a` is a special parameter available only for this
 * 'fake' network implementation.  It isn't present / used by A4A or other
 * ad networks in general.
 *
 * @param {!Window} win
 * @param {!Element} element
 * @returns {boolean}
 */

function fakeIsA4AEnabled(win, element) {
  var a4aRequested = element.getAttribute('data-use-a4a');
  return !!a4aRequested;
}

},{}],20:[function(require,module,exports){
exports.__esModule = true;
exports.gmosspIsA4AEnabled = gmosspIsA4AEnabled;
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

/** @const @private {string} */
var GMOSSP_SRC_PREFIX_ = 'https://sp.gmossp-sp.jp';

/**
 * @param {!Window} win
 * @param {!Element} element
 * @returns {boolean}
 */

function gmosspIsA4AEnabled(win, element) {
  var src = element.getAttribute('src');
  return !!element.getAttribute('data-use-a4a') && !!src && _srcString.startsWith(src, GMOSSP_SRC_PREFIX_);
}

},{"../../../src/string":66}],21:[function(require,module,exports){
exports.__esModule = true;
exports.tripleliftIsA4AEnabled = tripleliftIsA4AEnabled;
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

/** @const @private {string} */
var SRC_PREFIX_ = 'https://ib.3lift.com/';
/**
 * @param {!Window} win
 * @param {!Element} element
 * @returns {boolean}
 */

function tripleliftIsA4AEnabled(win, element) {
  var src = undefined;
  return !!element.getAttribute('data-use-a4a') && !!(src = element.getAttribute('src')) && src.indexOf(SRC_PREFIX_) == 0;
}

},{}],22:[function(require,module,exports){
exports.__esModule = true;
exports.is3pThrottled = is3pThrottled;
exports.getAmpAdRenderOutsideViewport = getAmpAdRenderOutsideViewport;
exports.incrementLoadingAds = incrementLoadingAds;
/* Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
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

var _srcLog = require('../../../src/log');

/**
 * Store loading ads info within window to ensure it can be properly stored
 * across separately compiled binaries that share load throttling.
 * @const ID of window variable used to track 3p ads waiting to load.
 */
var LOADING_ADS_WIN_ID_ = '3pla';

/**
 * @param {!Window} win
 * @return {boolean} Whether 3p is currently throttled.
 */

function is3pThrottled(win) {
  return !!win[LOADING_ADS_WIN_ID_];
}

/**
 * @param {!Element} element
 * @return {?number} number if explicit value should be used otherwise super
 *    default should be used.
 */

function getAmpAdRenderOutsideViewport(element) {
  var rawValue = element.getAttribute('data-loading-strategy');
  if (rawValue == null) {
    return null;
  }
  // Ad opts into lazier loading strategy where we only load ads that are
  // at closer given number of viewports away.
  if (rawValue == 'prefer-viewability-over-views' || rawValue == '') {
    return 1.25;
  }
  var errorMessage = 'Value of data-loading-strategy should be a float number in range ' + 'of [0, 3], but got ' + rawValue;
  var viewportNumber = _srcLog.user().assertNumber(parseFloat(rawValue), errorMessage);
  _srcLog.user().assert(viewportNumber >= 0 && viewportNumber <= 3, errorMessage);
  return viewportNumber;
}

/**
 * Increments loading ads count for throttling.
 * @param {!Window} win
 * @param {!Promise=} opt_loadingPromise
 */

function incrementLoadingAds(win, opt_loadingPromise) {
  if (win[LOADING_ADS_WIN_ID_] === undefined) {
    win[LOADING_ADS_WIN_ID_] = 0;
  }
  win[LOADING_ADS_WIN_ID_]++;
  _srcServices.timerFor(win).timeoutPromise(1000, opt_loadingPromise)['catch'](function () {}).then(function () {
    win[LOADING_ADS_WIN_ID_]--;
  });
}

},{"../../../src/log":49,"../../../src/services":65}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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

},{}],25:[function(require,module,exports){
exports.__esModule = true;
exports.getIframe = getIframe;
exports.addDataAndJsonAttributes_ = addDataAndJsonAttributes_;
exports.preloadBootstrap = preloadBootstrap;
exports.getBootstrapBaseUrl = getBootstrapBaseUrl;
exports.setDefaultBootstrapBaseUrlForTesting = setDefaultBootstrapBaseUrlForTesting;
exports.resetBootstrapBaseUrlForTesting = resetBootstrapBaseUrlForTesting;
exports.getDefaultBootstrapBaseUrl = getDefaultBootstrapBaseUrl;
exports.getSubDomain = getSubDomain;
exports.getRandom = getRandom;
exports.generateSentinel = generateSentinel;
exports.resetCountForTesting = resetCountForTesting;
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

var _srcIframeAttributes = require('../src/iframe-attributes');

var _json = require('./json');

var _mode = require('./mode');

var _string = require('./string');

var _utilsObject = require('./utils/object');

var _url = require('./url');

var _config = require('./config');

var _style = require('./style');

/** @type {!Object<string,number>} Number of 3p frames on the for that type. */
var count = {};

/** @type {string} */
var overrideBootstrapBaseUrl = undefined;

/**
 * Produces the attributes for the ad template.
 * @param {!Window} parentWindow
 * @param {!AmpElement} element
 * @param {string=} opt_type
 * @param {Object=} opt_context
 * @return {!JsonObject} Contains
 *     - type, width, height, src attributes of <amp-ad> tag. These have
 *       precedence over the data- attributes.
 *     - data-* attributes of the <amp-ad> tag with the "data-" removed.
 *     - A _context object for internal use.
 */
function getFrameAttributes(parentWindow, element, opt_type, opt_context) {
  var type = opt_type || element.getAttribute('type');
  _log.user().assert(type, 'Attribute type required for <amp-ad>: %s', element);
  var sentinel = generateSentinel(parentWindow);
  var attributes = _utilsObject.dict();
  // Do these first, as the other attributes have precedence.
  addDataAndJsonAttributes_(element, attributes);
  attributes = _srcIframeAttributes.getContextMetadata(parentWindow, element, sentinel, attributes);
  attributes['type'] = type;
  Object.assign(attributes['_context'], opt_context);
  return attributes;
}

/**
 * Creates the iframe for the embed. Applies correct size and passes the embed
 * attributes to the frame via JSON inside the fragment.
 * @param {!Window} parentWindow
 * @param {!AmpElement} parentElement
 * @param {string=} opt_type
 * @param {Object=} opt_context
 * @return {!Element} The iframe.
 */

function getIframe(parentWindow, parentElement, opt_type, opt_context) {
  // Check that the parentElement is already in DOM. This code uses a new and
  // fast `isConnected` API and thus only used when it's available.
  _log.dev().assert(parentElement['isConnected'] === undefined || parentElement['isConnected'] === true, 'Parent element must be in DOM');
  var attributes = getFrameAttributes(parentWindow, parentElement, opt_type, opt_context);
  var iframe = parentWindow.document.createElement('iframe');

  if (!count[attributes['type']]) {
    count[attributes['type']] = 0;
  }
  count[attributes['type']] += 1;

  var baseUrl = getBootstrapBaseUrl(parentWindow);
  var host = _url.parseUrl(baseUrl).hostname;
  // This name attribute may be overwritten if this frame is chosen to
  // be the master frame. That is ok, as we will read the name off
  // for our uses before that would occur.
  // @see https://github.com/ampproject/amphtml/blob/master/3p/integration.js
  var name = JSON.stringify(_utilsObject.dict({
    'host': host,
    'type': attributes['type'],
    // https://github.com/ampproject/amphtml/pull/2955
    'count': count[attributes['type']],
    'attributes': attributes
  }));

  iframe.src = baseUrl;
  iframe.ampLocation = _url.parseUrl(baseUrl);
  iframe.name = name;
  // Add the check before assigning to prevent IE throw Invalid argument error
  if (attributes['width']) {
    iframe.width = attributes['width'];
  }
  if (attributes['height']) {
    iframe.height = attributes['height'];
  }
  iframe.setAttribute('scrolling', 'no');
  _style.setStyle(iframe, 'border', 'none');
  /** @this {!Element} */
  iframe.onload = function () {
    // Chrome does not reflect the iframe readystate.
    this.readyState = 'complete';
  };
  iframe.setAttribute('data-amp-3p-sentinel', attributes['_context']['sentinel']);
  return iframe;
}

/**
 * Copies data- attributes from the element into the attributes object.
 * Removes the data- from the name and capitalizes after -. If there
 * is an attribute called json, parses the JSON and adds it to the
 * attributes.
 * @param {!Element} element
 * @param {!JsonObject} attributes The destination.
 * visibleForTesting
 */

function addDataAndJsonAttributes_(element, attributes) {
  for (var i = 0; i < element.attributes.length; i++) {
    var attr = element.attributes[i];
    if (attr.name.indexOf('data-') != 0) {
      continue;
    }
    attributes[_string.dashToCamelCase(attr.name.substr(5))] = attr.value;
  }
  var json = element.getAttribute('json');
  if (json) {
    var obj = _json.tryParseJson(json);
    if (obj === undefined) {
      throw _log.user().createError('Error parsing JSON in json attribute in element %s', element);
    }
    for (var key in obj) {
      attributes[key] = obj[key];
    }
  }
}

/**
 * Preloads URLs related to the bootstrap iframe.
 * @param {!Window} window
 * @param {!./preconnect.Preconnect} preconnect
 */

function preloadBootstrap(window, preconnect) {
  var url = getBootstrapBaseUrl(window);
  preconnect.preload(url, 'document');

  // While the URL may point to a custom domain, this URL will always be
  // fetched by it.
  var scriptUrl = _mode.getMode().localDev ? getAdsLocalhost(window) + '/dist.3p/current/integration.js' : _config.urls.thirdParty + '/1499663230322/f.js';
  preconnect.preload(scriptUrl, 'script');
}

/**
 * Returns the base URL for 3p bootstrap iframes.
 * @param {!Window} parentWindow
 * @param {boolean=} opt_strictForUnitTest
 * @return {string}
 * @visibleForTesting
 */

function getBootstrapBaseUrl(parentWindow, opt_strictForUnitTest) {
  // The value is cached in a global variable called `bootstrapBaseUrl`;
  var bootstrapBaseUrl = parentWindow.bootstrapBaseUrl;
  if (bootstrapBaseUrl) {
    return bootstrapBaseUrl;
  }
  return parentWindow.bootstrapBaseUrl = getCustomBootstrapBaseUrl(parentWindow, opt_strictForUnitTest) || getDefaultBootstrapBaseUrl(parentWindow);
}

function setDefaultBootstrapBaseUrlForTesting(url) {
  overrideBootstrapBaseUrl = url;
}

function resetBootstrapBaseUrlForTesting(win) {
  win.bootstrapBaseUrl = undefined;
}

/**
 * Returns the default base URL for 3p bootstrap iframes.
 * @param {!Window} parentWindow
 * @param {string=} opt_srcFileBasename
 * @return {string}
 */

function getDefaultBootstrapBaseUrl(parentWindow, opt_srcFileBasename) {
  var srcFileBasename = opt_srcFileBasename || 'frame';
  if (_mode.getMode().localDev || _mode.getMode().test) {
    if (overrideBootstrapBaseUrl) {
      return overrideBootstrapBaseUrl;
    }
    return getAdsLocalhost(parentWindow) + '/dist.3p/' + (_mode.getMode().minified ? '1499663230322/' + srcFileBasename : 'current/' + srcFileBasename + '.max') + '.html';
  }
  return 'https://' + getSubDomain(parentWindow) + ('.' + _config.urls.thirdPartyFrameHost + '/1499663230322/') + (srcFileBasename + '.html');
}

function getAdsLocalhost(win) {
  if (_config.urls.localDev) {
    return '//' + _config.urls.thirdPartyFrameHost;
  }
  return 'http://ads.localhost:' + (win.location.port || win.parent.location.port);
}

/**
 * Sub domain on which the 3p iframe will be hosted.
 * Because we only calculate the URL once per page, this function is only
 * called once and hence all frames on a page use the same URL.
 * @return {string}
 * @visibleForTesting
 */

function getSubDomain(win) {
  return 'd-' + getRandom(win);
}

/**
 * Generates a random non-negative integer.
 * @param {!Window} win
 * @return {string}
 */

function getRandom(win) {
  var rand = undefined;
  if (win.crypto && win.crypto.getRandomValues) {
    // By default use 2 32 bit integers.
    var uint32array = new Uint32Array(2);
    win.crypto.getRandomValues(uint32array);
    rand = String(uint32array[0]) + uint32array[1];
  } else {
    // Fall back to Math.random.
    rand = String(win.Math.random()).substr(2) + '0';
  }
  return rand;
}

/**
 * Returns the custom base URL for 3p bootstrap iframes if it exists.
 * Otherwise null.
 * @param {!Window} parentWindow
 * @param {boolean=} opt_strictForUnitTest
 * @return {?string}
 */
function getCustomBootstrapBaseUrl(parentWindow, opt_strictForUnitTest) {
  var meta = parentWindow.document.querySelector('meta[name="amp-3p-iframe-src"]');
  if (!meta) {
    return null;
  }
  var url = _url.assertHttpsUrl(meta.getAttribute('content'), meta);
  _log.user().assert(url.indexOf('?') == -1, '3p iframe url must not include query string %s in element %s.', url, meta);
  // This is not a security primitive, we just don't want this to happen in
  // practice. People could still redirect to the same origin, but they cannot
  // redirect to the proxy origin which is the important one.
  var parsed = _url.parseUrl(url);
  _log.user().assert(parsed.hostname == 'localhost' && !opt_strictForUnitTest || parsed.origin != _url.parseUrl(parentWindow.location.href).origin, '3p iframe url must not be on the same origin as the current doc' + 'ument %s (%s) in element %s. See https://github.com/ampproject/amphtml' + '/blob/master/spec/amp-iframe-origin-policy.md for details.', url, parsed.origin, meta);
  return url + '?1499663230322';
}

/**
 * Returns a randomized sentinel value for 3p iframes.
 * The format is "%d-%d" with the first value being the depth of current
 * window in the window hierarchy and the second a random integer.
 * @param {!Window} parentWindow
 * @return {string}
 * @visibleForTesting
 */

function generateSentinel(parentWindow) {
  var windowDepth = 0;
  for (var win = parentWindow; win && win != win.parent; win = win.parent) {
    windowDepth++;
  }
  return String(windowDepth) + '-' + getRandom(parentWindow);
}

/**
 * Resets the count of each 3p frame type
 * @visibleForTesting
 */

function resetCountForTesting() {
  count = {};
}

},{"../src/iframe-attributes":44,"./config":31,"./json":46,"./log":49,"./mode":51,"./string":66,"./style":68,"./url":71,"./utils/object":75}],26:[function(require,module,exports){
exports.__esModule = true;
exports.getAdCid = getAdCid;
exports.getOrCreateAdCid = getOrCreateAdCid;
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

var _services = require('./services');

var _ads_config = require('../ads/_config');

var _srcLog = require('../src/log');

/**
 * @param {AMP.BaseElement} adElement
 * @return {!Promise<string|undefined>} A promise for a CID or undefined if
 *     - the ad network does not request one or
 *     - `amp-analytics` which provides the CID service was not installed.
 */

function getAdCid(adElement) {
  var config = _ads_config.adConfig[adElement.element.getAttribute('type')];
  if (!config || !config.clientIdScope) {
    return Promise.resolve();
  }
  return getOrCreateAdCid(adElement.getAmpDoc(), config.clientIdScope, config.clientIdCookieName);
}

/**
 * @param {!./service/ampdoc-impl.AmpDoc|!Node} ampDoc
 * @param {!string} clientIdScope
 * @param {string=} opt_clientIdCookieName
 * @return {!Promise<string|undefined>} A promise for a CID or undefined.
 */

function getOrCreateAdCid(ampDoc, clientIdScope, opt_clientIdCookieName) {
  var cidPromise = _services.cidForDocOrNull(ampDoc).then(function (cidService) {
    if (!cidService) {
      return;
    }
    return cidService.get({
      scope: _srcLog.dev().assertString(clientIdScope),
      createCookieIfNotPresent: true,
      cookieName: opt_clientIdCookieName
    }, Promise.resolve(undefined))['catch'](function (error) {
      // Not getting a CID is not fatal.
      _srcLog.dev().error('AD-CID', error);
      return undefined;
    });
  });
  // The CID should never be crucial for an ad. If it does not come within
  // 1 second, assume it will never arrive.
  return _services.timerFor(ampDoc.win).timeoutPromise(1000, cidPromise, 'cid timeout')['catch'](function (error) {
    // Timeout is not fatal.
    _srcLog.dev().warn('AD-CID', error);
    return undefined;
  });
}

},{"../ads/_config":2,"../src/log":49,"./services":65}],27:[function(require,module,exports){
exports.__esModule = true;
exports.isAdPositionAllowed = isAdPositionAllowed;
exports.getAdContainer = getAdContainer;
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

var _style = require('./style');

var AD_CONTAINER_PROP = '__AMP__AD_CONTAINER';

/**
 * Tags that are allowed to have fixed positioning
 * @const {!Object<string, boolean>}
 */
var CONTAINERS = {
  'AMP-FX-FLYING-CARPET': true,
  'AMP-LIGHTBOX': true,
  'AMP-STICKY-AD': true
};

/**
 * Determines if an element is fixed-positioned.
 * OK to use, because it's only called from onLayoutMeasure
 * @param {!Element} el
 * @param {!Window} win
 * @return {boolean}
 */
function isPositionFixed(el, win) {
  var position = _style.computedStyle(win, el).position;
  // We consider sticky positions as fixed, since they can be fixed.
  return position == 'fixed' || position == 'sticky';
}

/**
 * @param {!Element} element
 * @param {!Window} win
 * @return {boolean} whether the element position is allowed. If the element
 * belongs to CONTAINERS, it is allowed to be position fixed.
 * If the element has a position fixed ancestor, it is not allowed.
 * This should only be called when a layout on the page was just forced
 * anyway.
 */

function isAdPositionAllowed(element, win) {
  var hasFixedAncestor = false;
  var containers = 0;
  var el = element;
  do {
    if (CONTAINERS[el.tagName]) {
      // The containers must not themselves be contained in a fixed-position
      // element. Continue the search.
      containers++;
      hasFixedAncestor = false;
    } else if (isPositionFixed(_log.dev().assertElement(el), win)) {
      // Because certain blessed elements may contain a position fixed
      // container (which contain an ad), we continue to search the
      // ancestry tree.
      hasFixedAncestor = true;
    }
    el = el.parentElement;
  } while (el && el.tagName != 'BODY');
  return !hasFixedAncestor && containers <= 1;
}

/**
 * Returns the blessed container element tagName if the ad is contained by one.
 * This is called during layout measure.
 * @param {!Element} element
 * @return {?string}
 */

function getAdContainer(element) {
  if (element[AD_CONTAINER_PROP] === undefined) {
    var el = element;
    do {
      el = el.parentElement;
      if (CONTAINERS[el.tagName]) {
        return element[AD_CONTAINER_PROP] = el.tagName;
      }
    } while (el && el.tagName != 'BODY');
    element[AD_CONTAINER_PROP] = null;
  }
  return element[AD_CONTAINER_PROP];
}

},{"./log":49,"./style":68}],28:[function(require,module,exports){
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

},{"./dom":35,"./element-service":36,"./log":49,"./service":61,"./services":65}],29:[function(require,module,exports){
exports.__esModule = true;
exports.installAnchorClickInterceptor = installAnchorClickInterceptor;
exports.maybeExpandUrlParamsForTesting = maybeExpandUrlParamsForTesting;
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

var _services = require('./services');

/** @private @const {string} */
var ORIG_HREF_ATTRIBUTE = 'data-a4a-orig-href';

/**
 * Registers a handler that performs URL replacement on the href
 * of an ad click.
 * @param {!./service/ampdoc-impl.AmpDoc} ampdoc
 * @param {!Window} win
 */

function installAnchorClickInterceptor(ampdoc, win) {
  win.document.documentElement.addEventListener('click', maybeExpandUrlParams.bind(null, ampdoc), /* capture */true);
}

/**
 * Handle click on links and replace variables in the click URL.
 * The function changes the actual href value and stores the
 * template in the ORIGINAL_HREF_ATTRIBUTE attribute
 * @param {!./service/ampdoc-impl.AmpDoc} ampdoc
 * @param {!Event} e
 */
function maybeExpandUrlParams(ampdoc, e) {
  var target = _dom.closestByTag(_log.dev().assertElement(e.target), 'A');
  if (!target || !target.href) {
    // Not a click on a link.
    return;
  }
  var hrefToExpand = target.getAttribute(ORIG_HREF_ATTRIBUTE) || target.getAttribute('href');
  if (!hrefToExpand) {
    return;
  }
  var vars = {
    'CLICK_X': function () {
      return e.pageX;
    },
    'CLICK_Y': function () {
      return e.pageY;
    }
  };
  var newHref = _services.urlReplacementsForDoc(ampdoc).expandSync(hrefToExpand, vars, undefined, /* opt_whitelist */{
    // For now we only allow to replace the click location vars
    // and nothing else.
    // NOTE: Addition to this whitelist requires additional review.
    'CLICK_X': true,
    'CLICK_Y': true
  });
  if (newHref != hrefToExpand) {
    // Store original value so that later clicks can be processed with
    // freshest values.
    if (!target.getAttribute(ORIG_HREF_ATTRIBUTE)) {
      target.setAttribute(ORIG_HREF_ATTRIBUTE, hrefToExpand);
    }
    target.setAttribute('href', newHref);
  }
}

function maybeExpandUrlParamsForTesting(ampdoc, e) {
  maybeExpandUrlParams(ampdoc, e);
}

},{"./dom":35,"./log":49,"./services":65}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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

},{}],32:[function(require,module,exports){
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

},{"./config":31,"./string":66,"./url":71}],33:[function(require,module,exports){
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

},{"./service":61}],34:[function(require,module,exports){
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

},{}],35:[function(require,module,exports){
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

},{"../third_party/css-escape/css-escape":78,"./log":49,"./string":66}],36:[function(require,module,exports){
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

},{"./dom":35,"./log":49,"./service":61}],37:[function(require,module,exports){
exports.__esModule = true;
exports.reportError = reportError;
exports.cancellation = cancellation;
exports.isCancellation = isCancellation;
exports.installErrorReporting = installErrorReporting;
exports.getErrorReportUrl = getErrorReportUrl;
exports.detectNonAmpJs = detectNonAmpJs;
exports.resetAccumulatedErrorMessagesForTesting = resetAccumulatedErrorMessagesForTesting;
exports.detectJsEngineFromStack = detectJsEngineFromStack;
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

var _exponentialBackoff = require('./exponential-backoff');

var _eventHelper = require('./event-helper');

var _log = require('./log');

var _url = require('./url');

var _experiments = require('./experiments');

var _styleInstaller = require('./style-installer');

var _string = require('./string');

var _config = require('./config');

/**
 * @const {string}
 */
var CANCELLED = 'CANCELLED';

/**
 * The threshold for throttled errors. Currently at 0.1%.
 * @const {number}
 */
var THROTTLED_ERROR_THRESHOLD = 1e-3;

/**
 * Collects error messages, so they can be included in subsequent reports.
 * That allows identifying errors that might be caused by previous errors.
 */
var accumulatedErrorMessages = self.AMPErrors || [];
// Use a true global, to avoid multi-module inclusion issues.
self.AMPErrors = accumulatedErrorMessages;

/**
 * A wrapper around our exponentialBackoff, to lazy initialize it to avoid an
 * un-DCE'able side-effect.
 * @param {function()} work the function to execute after backoff
 * @return {number} the setTimeout id
 */
var reportingBackoff = function (work) {
  // Set reportingBackoff as the lazy-created function. JS Vooodoooo.
  reportingBackoff = _exponentialBackoff.exponentialBackoff(1.5);
  return reportingBackoff(work);
};

/**
 * Attempts to stringify a value, falling back to String.
 * @param {*} value
 * @return {string}
 */
function tryJsonStringify(value) {
  try {
    // Cast is fine, because we really don't care here. Just trying.
    return JSON.stringify( /** @type {!JsonObject} */value);
  } catch (e) {
    return String(value);
  }
}

/**
 * The true JS engine, as detected by inspecting an Error stack. This should be
 * used with the userAgent to tell definitely. I.e., Chrome on iOS is really a
 * Safari JS engine.
 */
var detectedJsEngine = undefined;

/**
 * Reports an error. If the error has an "associatedElement" property
 * the element is marked with the `i-amphtml-element-error` and displays
 * the message itself. The message is always send to the console.
 * If the error has a "messageArray" property, that array is logged.
 * This way one gets the native fidelity of the console for things like
 * elements instead of stringification.
 * @param {*} error
 * @param {!Element=} opt_associatedElement
 * @return {!Error}
 */

function reportError(error, opt_associatedElement) {
  try {
    // Convert error to the expected type.
    var isValidError = undefined;
    if (error) {
      if (error.message !== undefined) {
        error = _log.duplicateErrorIfNecessary( /** @type {!Error} */error);
        isValidError = true;
      } else {
        var origError = error;
        error = new Error(tryJsonStringify(origError));
        error.origError = origError;
      }
    } else {
      error = new Error('Unknown error');
    }
    // Report if error is not an expected type.
    if (!isValidError && _mode.getMode().localDev && !_mode.getMode().test) {
      setTimeout(function () {
        var rethrow = new Error('_reported_ Error reported incorrectly: ' + error);
        throw rethrow;
      });
    }

    if (error.reported) {
      return (/** @type {!Error} */error
      );
    }
    error.reported = true;

    // Update element.
    var element = opt_associatedElement || error.associatedElement;
    if (element && element.classList) {
      element.classList.add('i-amphtml-error');
      if (_mode.getMode().development) {
        element.classList.add('i-amphtml-element-error');
        element.setAttribute('error-message', error.message);
      }
    }

    // Report to console.
    if (self.console) {
      var output = console.error || console.log;
      if (error.messageArray) {
        output.apply(console, error.messageArray);
      } else {
        if (element) {
          output.call(console, error.message, element);
        } else if (!_mode.getMode().minified) {
          output.call(console, error.stack);
        } else {
          output.call(console, error.message);
        }
      }
    }
    if (element && element.dispatchCustomEventForTesting) {
      element.dispatchCustomEventForTesting('amp:error', error.message);
    }

    // 'call' to make linter happy. And .call to make compiler happy
    // that expects some @this.
    reportErrorToServer['call'](undefined, undefined, undefined, undefined, undefined, error);
  } catch (errorReportingError) {
    setTimeout(function () {
      throw errorReportingError;
    });
  }
  return (/** @type {!Error} */error
  );
}

/**
 * Returns an error for a cancellation of a promise.
 * @return {!Error}
 */

function cancellation() {
  return new Error(CANCELLED);
}

/**
 * @param {*} errorOrMessage
 * @return {boolean}
 */

function isCancellation(errorOrMessage) {
  if (!errorOrMessage) {
    return false;
  }
  if (typeof errorOrMessage == 'string') {
    return _string.startsWith(errorOrMessage, CANCELLED);
  }
  if (typeof errorOrMessage.message == 'string') {
    return _string.startsWith(errorOrMessage.message, CANCELLED);
  }
  return false;
}

/**
 * Install handling of global unhandled exceptions.
 * @param {!Window} win
 */

function installErrorReporting(win) {
  win.onerror = /** @type {!Function} */reportErrorToServer;
  win.addEventListener('unhandledrejection', function (event) {
    if (event.reason && event.reason.message === CANCELLED) {
      event.preventDefault();
      return;
    }
    reportError(event.reason || new Error('rejected promise ' + event));
  });
}

/**
 * Signature designed, so it can work with window.onerror
 * @param {string|undefined} message
 * @param {string|undefined} filename
 * @param {string|undefined} line
 * @param {string|undefined} col
 * @param {*|undefined} error
 * @this {!Window|undefined}
 */
function reportErrorToServer(message, filename, line, col, error) {
  // Make an attempt to unhide the body.
  if (this && this.document) {
    _styleInstaller.makeBodyVisible(this.document);
  }
  if (_mode.getMode().localDev || _mode.getMode().development || _mode.getMode().test) {
    return;
  }
  var hasNonAmpJs = false;
  try {
    hasNonAmpJs = detectNonAmpJs(self);
  } catch (ignore) {
    // Ignore errors during error report generation.
  }
  if (hasNonAmpJs && Math.random() > 0.01) {
    // Only report 1% of errors on pages with non-AMP JS.
    // These errors can almost never be acted upon, but spikes such as
    // due to buggy browser extensions may be helpful to notify authors.
    return;
  }
  var url = getErrorReportUrl(message, filename, line, col, error, hasNonAmpJs);
  if (url) {
    reportingBackoff(function () {
      new Image().src = url;
    });
  }
}

/**
 * Signature designed, so it can work with window.onerror
 * @param {string|undefined} message
 * @param {string|undefined} filename
 * @param {string|undefined} line
 * @param {string|undefined} col
 * @param {*|undefined} error
 * @param {boolean} hasNonAmpJs
 * @return {string|undefined} The URL
 * visibleForTesting
 */

function getErrorReportUrl(message, filename, line, col, error, hasNonAmpJs) {
  var expected = false;
  if (error) {
    if (error.message) {
      message = error.message;
    } else {
      // This should never be a string, but sometimes it is.
      message = String(error);
    }
    // An "expected" error is still an error, i.e. some features are disabled
    // or not functioning fully because of it. However, it's an expected
    // error. E.g. as is the case with some browser API missing (storage).
    // Thus, the error can be classified differently by log aggregators.
    // The main goal is to monitor that an "expected" error doesn't deteriorate
    // over time. It's impossible to completely eliminate it.
    if (error.expected) {
      expected = true;
    }
  }
  if (!message) {
    message = 'Unknown error';
  }
  if (/_reported_/.test(message)) {
    return;
  }
  if (message == CANCELLED) {
    return;
  }

  // We throttle load errors and generic "Script error." errors
  // that have no information and thus cannot be acted upon.
  if (_eventHelper.isLoadErrorMessage(message) ||
  // See https://github.com/ampproject/amphtml/issues/7353
  // for context.
  message == 'Script error.') {
    expected = true;

    // Throttle load errors.
    if (Math.random() > THROTTLED_ERROR_THRESHOLD) {
      return;
    }
  }

  var isUserError = _log.isUserErrorMessage(message);

  // This is the App Engine app in
  // ../tools/errortracker
  // It stores error reports via https://cloud.google.com/error-reporting/
  // for analyzing production issues.
  var url = _config.urls.errorReporting + '?v=' + encodeURIComponent('1499663230322') + '&noAmp=' + (hasNonAmpJs ? 1 : 0) + '&m=' + encodeURIComponent(message.replace(_log.USER_ERROR_SENTINEL, '')) + '&a=' + (isUserError ? 1 : 0);
  if (expected) {
    // Errors are tagged with "ex" ("expected") label to allow loggers to
    // classify these errors as benchmarks and not exceptions.
    url += '&ex=1';
  }

  var runtime = '1p';
  if (self.context && self.context.location) {
    url += '&3p=1';
    runtime = '3p';
  } else if (_mode.getMode().runtime) {
    runtime = _mode.getMode().runtime;
  }
  url += '&rt=' + runtime;

  if (_experiments.isCanary(self)) {
    url += '&ca=1';
  }
  if (self.location.ancestorOrigins && self.location.ancestorOrigins[0]) {
    url += '&or=' + encodeURIComponent(self.location.ancestorOrigins[0]);
  }
  if (self.viewerState) {
    url += '&vs=' + encodeURIComponent(self.viewerState);
  }
  // Is embedded?
  if (self.parent && self.parent != self) {
    url += '&iem=1';
  }

  if (self.AMP && self.AMP.viewer) {
    var resolvedViewerUrl = self.AMP.viewer.getResolvedViewerUrl();
    var messagingOrigin = self.AMP.viewer.maybeGetMessagingOrigin();
    if (resolvedViewerUrl) {
      url += '&rvu=' + encodeURIComponent(resolvedViewerUrl);
    }
    if (messagingOrigin) {
      url += '&mso=' + encodeURIComponent(messagingOrigin);
    }
  }

  if (!detectedJsEngine) {
    detectedJsEngine = detectJsEngineFromStack();
  }
  url += '&jse=' + detectedJsEngine;

  var exps = [];
  var experiments = _experiments.experimentTogglesOrNull();
  for (var exp in experiments) {
    var on = experiments[exp];
    exps.push(exp + '=' + (on ? '1' : '0'));
  }
  url += '&exps=' + encodeURIComponent(exps.join(','));

  if (error) {
    var tagName = error && error.associatedElement ? error.associatedElement.tagName : 'u'; // Unknown
    url += '&el=' + encodeURIComponent(tagName);
    if (error.args) {
      url += '&args=' + encodeURIComponent(JSON.stringify(error.args));
    }

    if (!isUserError && !error.ignoreStack && error.stack) {
      // Shorten
      var stack = (error.stack || '').substr(0, 1000);
      url += '&s=' + encodeURIComponent(stack);
    }

    error.message += ' _reported_';
  } else {
    url += '&f=' + encodeURIComponent(filename || '') + '&l=' + encodeURIComponent(line || '') + '&c=' + encodeURIComponent(col || '');
  }
  url += '&r=' + encodeURIComponent(self.document.referrer);
  url += '&ae=' + encodeURIComponent(accumulatedErrorMessages.join(','));
  accumulatedErrorMessages.push(message);
  url += '&fr=' + encodeURIComponent(self.location.originalHash || self.location.hash);

  // Google App Engine maximum URL length.
  if (url.length >= 2072) {
    url = url.substr(0, 2072 - 8 /* length of suffix */)
    // Full remove last URL encoded entity.
    .replace(/\%[^&%]+$/, '')
    // Sentinel
     + '&SHORT=1';
  }
  return url;
}

/**
 * Returns true if it appears like there is non-AMP JS on the
 * current page.
 * @param {!Window} win
 * @return {boolean}
 * @visibleForTesting
 */

function detectNonAmpJs(win) {
  var scripts = win.document.querySelectorAll('script[src]');
  for (var i = 0; i < scripts.length; i++) {
    if (!_url.isProxyOrigin(scripts[i].src.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function resetAccumulatedErrorMessagesForTesting() {
  accumulatedErrorMessages = [];
}

/**
 * Does a series of checks on the stack of an thrown error to determine the
 * JS engine that is currently running. This gives a bit more information than
 * just the UserAgent, since browsers often allow overriding it to "emulate"
 * mobile.
 * @return {string}
 * @visibleForTesting
 */

function detectJsEngineFromStack() {
  /** @constructor */
  function Fn() {}
  Fn.prototype.t = function () {
    throw new Error('message');
  };
  var object = new Fn();
  try {
    object.t();
  } catch (e) {
    var stack = e.stack;

    // Safari only mentions the method name.
    if (_string.startsWith(stack, 't@')) {
      return 'Safari';
    }

    // Firefox mentions "prototype".
    if (stack.indexOf('.prototype.t@') > -1) {
      return 'Firefox';
    }

    // IE looks like Chrome, but includes a context for the base stack line.
    // Explicitly, we're looking for something like:
    // "    at Global code (https://example.com/app.js:1:200)" or
    // "    at Anonymous function (https://example.com/app.js:1:200)"
    // vs Chrome which has:
    // "    at https://example.com/app.js:1:200"
    var last = stack.split('\n').pop();
    if (/\bat .* \(/i.test(last)) {
      return 'IE';
    }

    // Finally, chrome includes the error message in the stack.
    if (_string.startsWith(stack, 'Error: message')) {
      return 'Chrome';
    }
  }

  return 'unknown';
}

},{"./config":31,"./event-helper":39,"./experiments":40,"./exponential-backoff":41,"./log":49,"./mode":51,"./string":66,"./style-installer":67,"./url":71}],38:[function(require,module,exports){
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

},{}],39:[function(require,module,exports){
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

},{"./event-helper-listen":38,"./log":49}],40:[function(require,module,exports){
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

},{"./cookies":32,"./json":46,"./log":49,"./service":61,"./url":71,"./utils/bytes":73}],41:[function(require,module,exports){
exports.__esModule = true;
exports.exponentialBackoff = exponentialBackoff;
exports.exponentialBackoffClock = exponentialBackoffClock;
exports.getJitter = getJitter;
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
 * @param {number=} opt_base Exponential base. Defaults to 2.
 * @return {function(function()): number} Function that when invoked will
 *     call the passed in function. On every invocation the next
 *     invocation of the passed in function will be exponentially
 *     later. Returned function returns timeout id.
 */

function exponentialBackoff(opt_base) {
  var getTimeout = exponentialBackoffClock(opt_base);
  return function (work) {
    return setTimeout(work, getTimeout());
  };
}

/**
 * @param {number=} opt_base Exponential base. Defaults to 2.
 * @return {function(): number} Function that when invoked will return
 *    a number that exponentially grows per invocation.
 */

function exponentialBackoffClock(opt_base) {
  var base = opt_base || 2;
  var count = 0;
  return function () {
    var wait = Math.pow(base, count++);
    wait += getJitter(wait);
    return wait * 1000;
  };
}

/**
 * Add jitter to avoid the thundering herd. This can e.g. happen when
 * we poll a backend and it fails for everyone at the same time.
 * We add up to 30% (default) longer or shorter than the given time.
 *
 * @param {number} wait the amount if base milliseconds
 * @param {number=} opt_perc the min/max percentage to add or sutract
 * @return {number}
 */

function getJitter(wait, opt_perc) {
  opt_perc = opt_perc || .3;
  var jitter = wait * opt_perc * Math.random();
  if (Math.random() > .5) {
    jitter *= -1;
  }
  return jitter;
}

},{}],42:[function(require,module,exports){
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

},{"./common-signals":30,"./document-ready":34,"./dom":35,"./event-helper":39,"./full-overlay-frame-child-helper":43,"./layout-rect":47,"./log":49,"./observable":52,"./service":61,"./services":65,"./style":68,"./utils/signals":77}],43:[function(require,module,exports){
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

},{"./dom":35,"./log":49}],44:[function(require,module,exports){
exports.__esModule = true;
exports.getContextMetadata = getContextMetadata;
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

var _config = require('./config');

var _services = require('./services');

var _experiments = require('./experiments');

var _layout = require('./layout');

var _modeObject = require('./mode-object');

var _utilsDomFingerprint = require('./utils/dom-fingerprint');

var _utilsObjectJs = require('./utils/object.js');

/**
 * Produces the attributes for the ad template.
 * @param {!Window} parentWindow
 * @param {!AmpElement} element
 * @param {!string} sentinel
 * @param {!JsonObject=} attributes
 * @return {!JsonObject}
 */

function getContextMetadata(parentWindow, element, sentinel, attributes) {
  var startTime = Date.now();
  var width = element.getAttribute('width');
  var height = element.getAttribute('height');
  attributes = attributes ? attributes : _utilsObjectJs.dict();
  attributes['width'] = _layout.getLengthNumeral(width);
  attributes['height'] = _layout.getLengthNumeral(height);
  var locationHref = parentWindow.location.href;
  // This is really only needed for tests, but whatever. Children
  // see us as the logical origin, so telling them we are about:srcdoc
  // will fail ancestor checks.
  if (locationHref == 'about:srcdoc') {
    locationHref = parentWindow.parent.location.href;
  }

  var docInfo = _services.documentInfoForDoc(element);
  var viewer = _services.viewerForDoc(element);
  var referrer = viewer.getUnconfirmedReferrerUrl();

  // TODO(alanorozco): Redesign data structure so that fields not exposed by
  // AmpContext are not part of this object.
  var layoutRect = element.getPageLayoutBox();
  attributes['_context'] = _utilsObjectJs.dict({
    'ampcontextVersion': '1499663230322',
    'ampcontextFilepath': _config.urls.cdn + '/1499663230322' + '/ampcontext-v0.js',
    'sourceUrl': docInfo.sourceUrl,
    'referrer': referrer,
    'canonicalUrl': docInfo.canonicalUrl,
    'pageViewId': docInfo.pageViewId,
    'location': {
      'href': locationHref
    },
    'startTime': startTime,
    'tagName': element.tagName,
    'mode': _modeObject.getModeObject(),
    'canary': _experiments.isCanary(parentWindow),
    'hidden': !viewer.isVisible(),
    'initialLayoutRect': layoutRect ? {
      'left': layoutRect.left,
      'top': layoutRect.top,
      'width': layoutRect.width,
      'height': layoutRect.height
    } : null,
    'initialIntersection': element.getIntersectionChangeEntry(),
    'domFingerprint': _utilsDomFingerprint.domFingerprint(element),
    'experimentToggles': _experiments.experimentToggles(parentWindow),
    'sentinel': sentinel
  });
  var adSrc = element.getAttribute('src');
  if (adSrc) {
    attributes['src'] = adSrc;
  }
  return attributes;
}

},{"./config":31,"./experiments":40,"./layout":48,"./mode-object":50,"./services":65,"./utils/dom-fingerprint":74,"./utils/object.js":75}],45:[function(require,module,exports){
exports.__esModule = true;
exports.getTrackImpressionPromise = getTrackImpressionPromise;
exports.resetTrackImpressionPromiseForTesting = resetTrackImpressionPromiseForTesting;
exports.maybeTrackImpression = maybeTrackImpression;
exports.doNotTrackImpression = doNotTrackImpression;
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

var _experiments = require('./experiments');

var _services = require('./services');

var _url = require('./url');

var _mode = require('./mode');

var TIMEOUT_VALUE = 8000;

var trackImpressionPromise = null;

/**
 * A function to get the trackImpressionPromise;
 * @return {!Promise}
 */

function getTrackImpressionPromise() {
  return _log.dev().assert(trackImpressionPromise);
}

/**
 * Function that reset the trackImpressionPromise only for testing
 * @visibleForTesting
 */

function resetTrackImpressionPromiseForTesting() {
  trackImpressionPromise = null;
}

/**
 * Emit a HTTP request to a destination defined on the incoming URL.
 * Protected by experiment.
 * @param {!Window} win
 */

function maybeTrackImpression(win) {
  var resolveImpression = undefined;

  trackImpressionPromise = new Promise(function (resolve) {
    resolveImpression = resolve;
  });

  if (!_experiments.isExperimentOn(win, 'alp')) {
    resolveImpression();
    return;
  }

  var viewer = _services.viewerForDoc(win.document);
  /** @const {string|undefined} */
  var clickUrl = viewer.getParam('click');

  if (!clickUrl) {
    resolveImpression();
    return;
  }
  if (clickUrl.indexOf('https://') != 0) {
    _log.user().warn('IMPRESSION', 'click fragment param should start with https://. Found ', clickUrl);
    resolveImpression();
    return;
  }
  if (win.location.hash) {
    // This is typically done using replaceState inside the viewer.
    // If for some reason it failed, get rid of the fragment here to
    // avoid duplicate tracking.
    win.location.hash = '';
  }

  viewer.whenFirstVisible().then(function () {
    // TODO(@zhouyx) need test with a real response.
    var promise = invoke(win, _log.dev().assertString(clickUrl)).then(function (response) {
      applyResponse(win, viewer, response);
    });

    // Timeout invoke promise after 8s and resolve trackImpressionPromise.
    resolveImpression(_services.timerFor(win).timeoutPromise(TIMEOUT_VALUE, promise, 'timeout waiting for ad server response')['catch'](function () {}));
  });
}

/**
 * Signal that impression tracking is not relevant in this environment.
 */

function doNotTrackImpression() {
  trackImpressionPromise = Promise.resolve();
}

/**
 * Send the url to ad server and wait for its response
 * @param {!Window} win
 * @param {string} clickUrl
 * @return {!Promise<!JsonObject>}
 */
function invoke(win, clickUrl) {
  if (_mode.getMode().localDev && !_mode.getMode().test) {
    clickUrl = 'http://localhost:8000/impression-proxy?url=' + clickUrl;
  }
  return _services.xhrFor(win).fetchJson(clickUrl, {
    credentials: 'include'
  }).then(function (res) {
    return res.json();
  });
}

/**
 * parse the response back from ad server
 * Set for analytics purposes
 * @param {!Window} win
 * @param {!JsonObject} response
 */
function applyResponse(win, viewer, response) {
  var adLocation = response['location'];
  var adTracking = response['tracking_url'];

  // If there is a tracking_url, need to track it
  // Otherwise track the location
  var trackUrl = adTracking || adLocation;

  if (trackUrl && !_url.isProxyOrigin(trackUrl)) {
    // To request the provided trackUrl for tracking purposes.
    new Image().src = trackUrl;
  }

  // Replace the location href params with new location params we get.
  if (adLocation) {
    if (!win.history.replaceState) {
      return;
    }
    var currentHref = win.location.href;
    var url = _url.parseUrl(adLocation);
    var params = _url.parseQueryString(url.search);
    var newHref = _url.addParamsToUrl(currentHref, params);
    win.history.replaceState(null, '', newHref);
  }
}

},{"./experiments":40,"./log":49,"./mode":51,"./services":65,"./url":71}],46:[function(require,module,exports){
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

},{"./types":69}],47:[function(require,module,exports){
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

},{}],48:[function(require,module,exports){
exports.__esModule = true;
exports.parseLayout = parseLayout;
exports.getLayoutClass = getLayoutClass;
exports.isLayoutSizeDefined = isLayoutSizeDefined;
exports.isInternalElement = isInternalElement;
exports.parseLength = parseLength;
exports.assertLength = assertLength;
exports.assertLengthOrPercent = assertLengthOrPercent;
exports.getLengthUnits = getLengthUnits;
exports.getLengthNumeral = getLengthNumeral;
exports.hasNaturalDimensions = hasNaturalDimensions;
exports.getNaturalDimensions = getNaturalDimensions;
exports.isLoadingAllowed = isLoadingAllowed;
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
 * @fileoverview Implements element layout. See https://goo.gl/9avXuT for
 * details.
 */

var _log = require('./log');

var _types = require('./types');

var _style = require('./style');

var _string = require('./string');

/**
 * @enum {string}
 */
var Layout = {
  NODISPLAY: 'nodisplay',
  FIXED: 'fixed',
  FIXED_HEIGHT: 'fixed-height',
  RESPONSIVE: 'responsive',
  CONTAINER: 'container',
  FILL: 'fill',
  FLEX_ITEM: 'flex-item'
};

exports.Layout = Layout;
/**
 * CSS Length type. E.g. "1px" or "20vh".
 * @typedef {string}
 */
var LengthDef = undefined;

exports.LengthDef = LengthDef;
/**
 * @typedef {{
 *   width: string,
 *   height: string
 * }}
 */
var DimensionsDef = undefined;

/**
 * The set of elements with natural dimensions, that is, elements
 * which have a known dimension either based on their value specified here,
 * or, if the value is null, a dimension specific to the browser.
 * `hasNaturalDimensions` checks for membership in this set.
 * `getNaturalDimensions` determines the dimensions for an element in the
 *    set and caches it.
 * @type {!Object<string, ?DimensionsDef>}
 * @private  Visible for testing only!
 */
var naturalDimensions_ = {
  'AMP-PIXEL': { width: '0px', height: '0px' },
  'AMP-ANALYTICS': { width: '1px', height: '1px' },
  // TODO(dvoytenko): audio should have width:auto.
  'AMP-AUDIO': null,
  'AMP-SOCIAL-SHARE': { width: '60px', height: '44px' }
};

exports.naturalDimensions_ = naturalDimensions_;
/**
 * Elements that the progess can be shown for. This set has to be externalized
 * since the element's implementation may not be downloaded yet.
 * @enum {boolean}
 * @private  Visible for testing only!
 */
var LOADING_ELEMENTS_ = {
  'AMP-ANIM': true,
  'AMP-BRIGHTCOVE': true,
  'AMP-EMBED': true,
  'AMP-IFRAME': true,
  'AMP-IMG': true,
  'AMP-INSTAGRAM': true,
  'AMP-LIST': true,
  'AMP-OOYALA-PLAYER': true,
  'AMP-PINTEREST': true,
  'AMP-PLAYBUZZ': true,
  'AMP-VIDEO': true,
  'AMP-YOUTUBE': true
};

exports.LOADING_ELEMENTS_ = LOADING_ELEMENTS_;
/**
 * @param {string} s
 * @return {Layout|undefined} Returns undefined in case of failure to parse
 *   the layout string.
 */

function parseLayout(s) {
  for (var k in Layout) {
    if (Layout[k] == s) {
      return Layout[k];
    }
  }
  return undefined;
}

/**
 * @param {!Layout} layout
 * @return {string}
 */

function getLayoutClass(layout) {
  return 'i-amphtml-layout-' + layout;
}

/**
 * Whether an element with this layout inherently defines the size.
 * @param {!Layout} layout
 * @return {boolean}
 */

function isLayoutSizeDefined(layout) {
  return layout == Layout.FIXED || layout == Layout.FIXED_HEIGHT || layout == Layout.RESPONSIVE || layout == Layout.FILL || layout == Layout.FLEX_ITEM;
}

/**
 * Whether the tag is an internal (service) AMP tag.
 * @param {!Node|string} tag
 * @return {boolean}
 */

function isInternalElement(tag) {
  var tagName = typeof tag == 'string' ? tag : tag.tagName;
  return tagName && _string.startsWith(tagName.toLowerCase(), 'i-');
}

/**
 * Parses the CSS length value. If no units specified, the assumed value is
 * "px". Returns undefined in case of parsing error.
 * @param {string|undefined} s
 * @return {!LengthDef|undefined}
 */

function parseLength(s) {
  if (typeof s == 'number') {
    return s + 'px';
  }
  if (!s) {
    return undefined;
  }
  if (!/^\d+(\.\d+)?(px|em|rem|vh|vw|vmin|vmax|cm|mm|q|in|pc|pt)?$/.test(s)) {
    return undefined;
  }
  if (/^\d+(\.\d+)?$/.test(s)) {
    return s + 'px';
  }
  return s;
}

/**
 * Asserts that the supplied value is a non-percent CSS Length value.
 * @param {!LengthDef|string|null|undefined} length
 * @return {!LengthDef}
 */

function assertLength(length) {
  _log.user().assert(/^\d+(\.\d+)?(px|em|rem|vh|vw|vmin|vmax|cm|mm|q|in|pc|pt)$/.test(length), 'Invalid length value: %s', length);
  return (/** @type {!LengthDef} */length
  );
}

/**
 * Asserts that the supplied value is a CSS Length value
 * (including percent unit).
 * @param {!LengthDef|string} length
 * @return {!LengthDef}
 */

function assertLengthOrPercent(length) {
  _log.user().assert(/^\d+(\.\d+)?(px|em|rem|vh|vw|vmin|vmax|%)$/.test(length), 'Invalid length or percent value: %s', length);
  return length;
}

/**
 * Returns units from the CSS length value.
 * @param {!LengthDef|string|null|undefined} length
 * @return {string}
 */

function getLengthUnits(length) {
  assertLength(length);
  _log.dev().assertString(length);
  var m = _log.user().assert(length.match(/[a-z]+/i), 'Failed to read units from %s', length);
  return m[0];
}

/**
 * Returns the numeric value of a CSS length value.
 * @param {!LengthDef|string|null|undefined} length
 * @return {number|undefined}
 */

function getLengthNumeral(length) {
  var res = parseFloat(length);
  return _types.isFiniteNumber(res) ? res : undefined;
}

/**
 * Determines whether the tagName is a known element that has natural dimensions
 * in our runtime or the browser.
 * @param {string} tagName The element tag name.
 * @return {boolean}
 */

function hasNaturalDimensions(tagName) {
  tagName = tagName.toUpperCase();
  return naturalDimensions_[tagName] !== undefined;
}

/**
 * Determines the default dimensions for an element which could vary across
 * different browser implementations, like <audio> for instance.
 * This operation can only be completed for an element whitelisted by
 * `hasNaturalDimensions`.
 * @param {!Element} element
 * @return {DimensionsDef}
 */

function getNaturalDimensions(element) {
  var tagName = element.tagName.toUpperCase();
  _log.dev().assert(naturalDimensions_[tagName] !== undefined);
  if (!naturalDimensions_[tagName]) {
    var doc = element.ownerDocument;
    var naturalTagName = tagName.replace(/^AMP\-/, '');
    var temp = doc.createElement(naturalTagName);
    // For audio, should no-op elsewhere.
    temp.controls = true;
    _style.setStyles(temp, {
      position: 'absolute',
      visibility: 'hidden'
    });
    doc.body.appendChild(temp);
    naturalDimensions_[tagName] = {
      width: (temp. /*OK*/offsetWidth || 1) + 'px',
      height: (temp. /*OK*/offsetHeight || 1) + 'px'
    };
    doc.body.removeChild(temp);
  }
  return (/** @type {DimensionsDef} */naturalDimensions_[tagName]
  );
}

/**
 * Whether the loading can be shown for the specified elemeent. This set has
 * to be externalized since the element's implementation may not be
 * downloaded yet.
 * @param {!Element} element.
 * @return {boolean}
 */

function isLoadingAllowed(element) {
  var tagName = element.tagName.toUpperCase();
  if (tagName == 'AMP-AD' || tagName == 'AMP-EMBED') {
    return true;
  }
  return LOADING_ELEMENTS_[tagName] || false;
}

},{"./log":49,"./string":66,"./style":68,"./types":69}],49:[function(require,module,exports){
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

},{"./mode":51,"./mode-object":50,"./types":69}],50:[function(require,module,exports){
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

},{"./mode":51}],51:[function(require,module,exports){
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

},{"./string":66,"./url-parse-query-string":70}],52:[function(require,module,exports){
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

},{}],53:[function(require,module,exports){
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

},{"./mode":51,"./polyfills/array-includes":54,"./polyfills/document-contains":55,"./polyfills/domtokenlist-toggle":56,"./polyfills/math-sign":57,"./polyfills/object-assign":58,"./polyfills/promise":59,"document-register-element/build/document-register-element.node":23}],54:[function(require,module,exports){
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

},{}],55:[function(require,module,exports){
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

},{}],56:[function(require,module,exports){
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

},{}],57:[function(require,module,exports){
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

},{}],58:[function(require,module,exports){
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

},{}],59:[function(require,module,exports){
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

},{"promise-pjs/promise":24}],60:[function(require,module,exports){
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

},{"./log":49,"./service":61,"./services":65}],61:[function(require,module,exports){
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

},{"./log":49,"./polyfills":53}],62:[function(require,module,exports){
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

},{"../dom":35,"../observable":52,"../service":61,"../style":68}],63:[function(require,module,exports){
exports.__esModule = true;
exports.extractClientIdFromGaCookie = extractClientIdFromGaCookie;
exports.installUrlReplacementsServiceForDoc = installUrlReplacementsServiceForDoc;
exports.installUrlReplacementsForEmbed = installUrlReplacementsForEmbed;
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

var _services = require('../services');

var _log = require('../log');

var _service = require('../service');

var _url = require('../url');

var _impressionJs = require('../impression.js');

var _variableSource = require('./variable-source');

/** @private @const {string} */
var TAG = 'UrlReplacements';
var EXPERIMENT_DELIMITER = '!';
var VARIANT_DELIMITER = '.';
var ORIGINAL_HREF_PROPERTY = 'amp-original-href';
var ORIGINAL_VALUE_PROPERTY = 'amp-original-value';

/**
 * Returns a encoded URI Component, or an empty string if the value is nullish.
 * @param {*} val
 * @return {string}
 */
function encodeValue(val) {
  if (val == null) {
    return '';
  }
  return encodeURIComponent( /** @type {string} */val);
};

/**
 * Class to provide variables that pertain to top level AMP window.
 */

var GlobalVariableSource = (function (_VariableSource) {
  babelHelpers.inherits(GlobalVariableSource, _VariableSource);

  function GlobalVariableSource(ampdoc) {
    babelHelpers.classCallCheck(this, GlobalVariableSource);

    _VariableSource.call(this);

    /** @const {!./ampdoc-impl.AmpDoc} */
    this.ampdoc = ampdoc;

    /**
     * @private
     * @const {function(!./ampdoc-impl.AmpDoc):!Promise<?AccessService>}
     */
    this.getAccessService_ = _services.accessServiceForDocOrNull;

    /** @private {?Promise<?Object<string, string>>} */
    this.variants_ = null;

    /** @private {?Promise<?ShareTrackingFragmentsDef>} */
    this.shareTrackingFragments_ = null;
  }

  /**
   * This class replaces substitution variables with their values.
   * Document new values in ../spec/amp-var-substitutions.md
   * @package For export
   */

  /**
   * Utility function for setting resolver for timing data that supports
   * sync and async.
   * @param {string} varName
   * @param {string} startEvent
   * @param {string=} endEvent
   * @return {!VariableSource}
   * @private
   */

  GlobalVariableSource.prototype.setTimingResolver_ = function setTimingResolver_(varName, startEvent, endEvent) {
    var _this = this;

    return this.setBoth(varName, function () {
      return _variableSource.getTimingDataSync(_this.ampdoc.win, startEvent, endEvent);
    }, function () {
      return _variableSource.getTimingDataAsync(_this.ampdoc.win, startEvent, endEvent);
    });
  };

  /** @override */

  GlobalVariableSource.prototype.initialize = function initialize() {
    var _this2 = this;

    /** @const {!./viewport-impl.Viewport} */
    var viewport = _services.viewportForDoc(this.ampdoc);

    // Returns a random value for cache busters.
    this.set('RANDOM', function () {
      return Math.random();
    });

    // Provides a counter starting at 1 per given scope.
    var counterStore = null;
    this.set('COUNTER', function (scope) {
      if (!counterStore) {
        counterStore = Object.create(null);
      }
      if (!counterStore[scope]) {
        counterStore[scope] = 0;
      }
      return ++counterStore[scope];
    });

    // Returns the canonical URL for this AMP document.
    this.set('CANONICAL_URL', this.getDocInfoValue_.bind(this, function (info) {
      return info.canonicalUrl;
    }));

    // Returns the host of the canonical URL for this AMP document.
    this.set('CANONICAL_HOST', this.getDocInfoValue_.bind(this, function (info) {
      var url = _url.parseUrl(info.canonicalUrl);
      return url && url.host;
    }));

    // Returns the hostname of the canonical URL for this AMP document.
    this.set('CANONICAL_HOSTNAME', this.getDocInfoValue_.bind(this, function (info) {
      var url = _url.parseUrl(info.canonicalUrl);
      return url && url.hostname;
    }));

    // Returns the path of the canonical URL for this AMP document.
    this.set('CANONICAL_PATH', this.getDocInfoValue_.bind(this, function (info) {
      var url = _url.parseUrl(info.canonicalUrl);
      return url && url.pathname;
    }));

    // Returns the referrer URL.
    this.setAsync('DOCUMENT_REFERRER', /** @type {AsyncResolverDef} */function () {
      return _services.viewerForDoc(_this2.ampdoc).getReferrerUrl();
    });

    // Returns the title of this AMP document.
    this.set('TITLE', function () {
      return _this2.ampdoc.win.document.title;
    });

    // Returns the URL for this AMP document.
    this.set('AMPDOC_URL', function () {
      return _url.removeFragment(_this2.ampdoc.win.location.href);
    });

    // Returns the host of the URL for this AMP document.
    this.set('AMPDOC_HOST', function () {
      var url = _url.parseUrl(_this2.ampdoc.win.location.href);
      return url && url.host;
    });

    // Returns the hostname of the URL for this AMP document.
    this.set('AMPDOC_HOSTNAME', function () {
      var url = _url.parseUrl(_this2.ampdoc.win.location.href);
      return url && url.hostname;
    });

    // Returns the Source URL for this AMP document.
    this.setBoth('SOURCE_URL', this.getDocInfoValue_.bind(this, function (info) {
      return _url.removeFragment(info.sourceUrl);
    }), function () {
      return _impressionJs.getTrackImpressionPromise().then(function () {
        return _this2.getDocInfoValue_(function (info) {
          return _url.removeFragment(info.sourceUrl);
        });
      });
    });

    // Returns the host of the Source URL for this AMP document.
    this.set('SOURCE_HOST', this.getDocInfoValue_.bind(this, function (info) {
      return _url.parseUrl(info.sourceUrl).host;
    }));

    // Returns the hostname of the Source URL for this AMP document.
    this.set('SOURCE_HOSTNAME', this.getDocInfoValue_.bind(this, function (info) {
      return _url.parseUrl(info.sourceUrl).hostname;
    }));

    // Returns the path of the Source URL for this AMP document.
    this.set('SOURCE_PATH', this.getDocInfoValue_.bind(this, function (info) {
      return _url.parseUrl(info.sourceUrl).pathname;
    }));

    // Returns a random string that will be the constant for the duration of
    // single page view. It should have sufficient entropy to be unique for
    // all the page views a single user is making at a time.
    this.set('PAGE_VIEW_ID', this.getDocInfoValue_.bind(this, function (info) {
      return info.pageViewId;
    }));

    this.setBoth('QUERY_PARAM', function (param) {
      var defaultValue = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];

      return _this2.getQueryParamData_(param, defaultValue);
    }, function (param) {
      var defaultValue = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];

      return _impressionJs.getTrackImpressionPromise().then(function () {
        return _this2.getQueryParamData_(param, defaultValue);
      });
    });

    /**
     * Stores client ids that were generated during this page view
     * indexed by scope.
     * @type {?Object<string, string>}
     */
    var clientIds = null;
    // Synchronous alternative. Only works for scopes that were previously
    // requested using the async method.
    this.setBoth('CLIENT_ID', function (scope) {
      if (!clientIds) {
        return null;
      }
      return clientIds[_log.dev().assertString(scope)];
    }, function (scope, opt_userNotificationId, opt_cookieName) {
      _log.user().assertString(scope, 'The first argument to CLIENT_ID, the fallback c' +
      /*OK*/'ookie name, is required');
      var consent = Promise.resolve();

      // If no `opt_userNotificationId` argument is provided then
      // assume consent is given by default.
      if (opt_userNotificationId) {
        consent = _services.userNotificationManagerFor(_this2.ampdoc.win).then(function (service) {
          return service.get(opt_userNotificationId);
        });
      }
      return _services.cidForDoc(_this2.ampdoc).then(function (cid) {
        return cid.get({
          scope: _log.dev().assertString(scope),
          createCookieIfNotPresent: true,
          cookieName: opt_cookieName
        }, consent);
      }).then(function (cid) {
        if (!clientIds) {
          clientIds = Object.create(null);
        }

        // A temporary work around to extract Client ID from _ga cookie. #5761
        // TODO: replace with "filter" when it's in place. #2198
        var cookieName = opt_cookieName || scope;
        if (cookieName == '_ga') {
          cid = extractClientIdFromGaCookie(cid);
        }

        clientIds[scope] = cid;
        return cid;
      });
    });

    // Returns assigned variant name for the given experiment.
    this.setAsync('VARIANT', /** @type {AsyncResolverDef} */function (experiment) {
      return _this2.getVairiantsValue_(function (variants) {
        var variant = variants[/** @type {string} */experiment];
        _log.user().assert(variant !== undefined, 'The value passed to VARIANT() is not a valid experiment name:' + experiment);
        // When no variant assigned, use reserved keyword 'none'.
        return variant === null ? 'none' : /** @type {string} */variant;
      }, 'VARIANT');
    });

    // Returns all assigned experiment variants in a serialized form.
    this.setAsync('VARIANTS', /** @type {AsyncResolverDef} */function () {
      return _this2.getVairiantsValue_(function (variants) {
        var experiments = [];
        for (var experiment in variants) {
          var variant = variants[experiment];
          experiments.push(experiment + VARIANT_DELIMITER + (variant || 'none'));
        }
        return experiments.join(EXPERIMENT_DELIMITER);
      }, 'VARIANTS');
    });

    // Returns incoming share tracking fragment.
    this.setAsync('SHARE_TRACKING_INCOMING', /** @type {AsyncResolverDef} */function () {
      return _this2.getShareTrackingValue_(function (fragments) {
        return fragments.incomingFragment;
      }, 'SHARE_TRACKING_INCOMING');
    });

    // Returns outgoing share tracking fragment.
    this.setAsync('SHARE_TRACKING_OUTGOING', /** @type {AsyncResolverDef} */function () {
      return _this2.getShareTrackingValue_(function (fragments) {
        return fragments.outgoingFragment;
      }, 'SHARE_TRACKING_OUTGOING');
    });

    // Returns the number of milliseconds since 1 Jan 1970 00:00:00 UTC.
    this.set('TIMESTAMP', function () {
      return Date.now();
    });

    // Returns the user's time-zone offset from UTC, in minutes.
    this.set('TIMEZONE', function () {
      return new Date().getTimezoneOffset();
    });

    // Returns a promise resolving to viewport.getScrollTop.
    this.set('SCROLL_TOP', function () {
      return viewport.getScrollTop();
    });

    // Returns a promise resolving to viewport.getScrollLeft.
    this.set('SCROLL_LEFT', function () {
      return viewport.getScrollLeft();
    });

    // Returns a promise resolving to viewport.getScrollHeight.
    this.set('SCROLL_HEIGHT', function () {
      return viewport.getScrollHeight();
    });

    // Returns a promise resolving to viewport.getScrollWidth.
    this.set('SCROLL_WIDTH', function () {
      return viewport.getScrollWidth();
    });

    // Returns the viewport height.
    this.set('VIEWPORT_HEIGHT', function () {
      return viewport.getSize().height;
    });

    // Returns the viewport width.
    this.set('VIEWPORT_WIDTH', function () {
      return viewport.getSize().width;
    });

    // Returns screen.width.
    this.set('SCREEN_WIDTH', function () {
      return _this2.ampdoc.win.screen.width;
    });

    // Returns screen.height.
    this.set('SCREEN_HEIGHT', function () {
      return _this2.ampdoc.win.screen.height;
    });

    // Returns screen.availHeight.
    this.set('AVAILABLE_SCREEN_HEIGHT', function () {
      return _this2.ampdoc.win.screen.availHeight;
    });

    // Returns screen.availWidth.
    this.set('AVAILABLE_SCREEN_WIDTH', function () {
      return _this2.ampdoc.win.screen.availWidth;
    });

    // Returns screen.ColorDepth.
    this.set('SCREEN_COLOR_DEPTH', function () {
      return _this2.ampdoc.win.screen.colorDepth;
    });

    // Returns document characterset.
    this.set('DOCUMENT_CHARSET', function () {
      var doc = _this2.ampdoc.win.document;
      return doc.characterSet || doc.charset;
    });

    // Returns the browser language.
    this.set('BROWSER_LANGUAGE', function () {
      var nav = _this2.ampdoc.win.navigator;
      return (nav.language || nav.userLanguage || nav.browserLanguage || '').toLowerCase();
    });

    // Returns the time it took to load the whole page. (excludes amp-* elements
    // that are not rendered by the system yet.)
    this.setTimingResolver_('PAGE_LOAD_TIME', 'navigationStart', 'loadEventStart');

    // Returns the time it took to perform DNS lookup for the domain.
    this.setTimingResolver_('DOMAIN_LOOKUP_TIME', 'domainLookupStart', 'domainLookupEnd');

    // Returns the time it took to connect to the server.
    this.setTimingResolver_('TCP_CONNECT_TIME', 'connectStart', 'connectEnd');

    // Returns the time it took for server to start sending a response to the
    // request.
    this.setTimingResolver_('SERVER_RESPONSE_TIME', 'requestStart', 'responseStart');

    // Returns the time it took to download the page.
    this.setTimingResolver_('PAGE_DOWNLOAD_TIME', 'responseStart', 'responseEnd');

    // Returns the time it took for redirects to complete.
    this.setTimingResolver_('REDIRECT_TIME', 'navigationStart', 'fetchStart');

    // Returns the time it took for DOM to become interactive.
    this.setTimingResolver_('DOM_INTERACTIVE_TIME', 'navigationStart', 'domInteractive');

    // Returns the time it took for content to load.
    this.setTimingResolver_('CONTENT_LOAD_TIME', 'navigationStart', 'domContentLoadedEventStart');

    // Access: Reader ID.
    this.setAsync('ACCESS_READER_ID', /** @type {AsyncResolverDef} */function () {
      return _this2.getAccessValue_(function (accessService) {
        return accessService.getAccessReaderId();
      }, 'ACCESS_READER_ID');
    });

    // Access: data from the authorization response.
    this.setAsync('AUTHDATA', /** @type {AsyncResolverDef} */function (field) {
      _log.user().assert(field, 'The first argument to AUTHDATA, the field, is required');
      return _this2.getAccessValue_(function (accessService) {
        return accessService.getAuthdataField(field);
      }, 'AUTHDATA');
    });

    // Returns an identifier for the viewer.
    this.setAsync('VIEWER', function () {
      return _services.viewerForDoc(_this2.ampdoc).getViewerOrigin().then(function (viewer) {
        return viewer == undefined ? '' : viewer;
      });
    });

    // Returns the total engaged time since the content became viewable.
    this.setAsync('TOTAL_ENGAGED_TIME', function () {
      return _services.activityForDoc(_this2.ampdoc).then(function (activity) {
        return activity.getTotalEngagedTime();
      });
    });

    this.set('NAV_TIMING', function (startAttribute, endAttribute) {
      _log.user().assert(startAttribute, 'The first argument to NAV_TIMING, the ' + 'start attribute name, is required');
      return _variableSource.getTimingDataSync(_this2.ampdoc.win,
      /**@type {string}*/startAttribute,
      /**@type {string}*/endAttribute);
    });
    this.setAsync('NAV_TIMING', function (startAttribute, endAttribute) {
      _log.user().assert(startAttribute, 'The first argument to NAV_TIMING, the ' + 'start attribute name, is required');
      return _variableSource.getTimingDataAsync(_this2.ampdoc.win,
      /**@type {string}*/startAttribute,
      /**@type {string}*/endAttribute);
    });

    this.set('NAV_TYPE', function () {
      return _variableSource.getNavigationData(_this2.ampdoc.win, 'type');
    });

    this.set('NAV_REDIRECT_COUNT', function () {
      return _variableSource.getNavigationData(_this2.ampdoc.win, 'redirectCount');
    });

    // returns the AMP version number
    this.set('AMP_VERSION', function () {
      return '1499663230322';
    });

    this.set('BACKGROUND_STATE', function () {
      return _services.viewerForDoc(_this2.ampdoc).isVisible() ? '0' : '1';
    });
  };

  /**
   * Resolves the value via document info.
   * @param {function(!./document-info-impl.DocumentInfoDef):T} getter
   * @return {T}
   * @template T
   */

  GlobalVariableSource.prototype.getDocInfoValue_ = function getDocInfoValue_(getter) {
    return getter(_services.documentInfoForDoc(this.ampdoc));
  };

  /**
   * Resolves the value via access service. If access service is not configured,
   * the resulting value is `null`.
   * @param {function(!AccessService):(T|!Promise<T>)} getter
   * @param {string} expr
   * @return {T|null}
   * @template T
   * @private
   */

  GlobalVariableSource.prototype.getAccessValue_ = function getAccessValue_(getter, expr) {
    return this.getAccessService_(this.ampdoc).then(function (accessService) {
      if (!accessService) {
        // Access service is not installed.
        _log.user().error(TAG, 'Access service is not installed to access: ', expr);
        return null;
      }
      return getter(accessService);
    });
  };

  /**
   * Return the QUERY_PARAM from the current location href
   * @param {*} param
   * @param {string} defaultValue
   * @return {string}
   * @private
   */

  GlobalVariableSource.prototype.getQueryParamData_ = function getQueryParamData_(param, defaultValue) {
    _log.user().assert(param, 'The first argument to QUERY_PARAM, the query string ' + 'param is required');
    _log.user().assert(typeof param == 'string', 'param should be a string');
    var url = _url.parseUrl(this.ampdoc.win.location.href);
    var params = _url.parseQueryString(url.search);
    return typeof params[param] !== 'undefined' ? params[param] : defaultValue;
  };

  /**
   * Resolves the value via amp-experiment's variants service.
   * @param {function(!Object<string, string>):(?string)} getter
   * @param {string} expr
   * @return {!Promise<?string>}
   * @template T
   * @private
   */

  GlobalVariableSource.prototype.getVairiantsValue_ = function getVairiantsValue_(getter, expr) {
    if (!this.variants_) {
      this.variants_ = _services.variantForOrNull(this.ampdoc.win);
    }
    return this.variants_.then(function (variants) {
      _log.user().assert(variants, 'To use variable %s, amp-experiment should be configured', expr);
      return getter(variants);
    });
  };

  /**
   * Resolves the value via amp-share-tracking's service.
   * @param {function(!ShareTrackingFragmentsDef):T} getter
   * @param {string} expr
   * @return {!Promise<T>}
   * @template T
   * @private
   */

  GlobalVariableSource.prototype.getShareTrackingValue_ = function getShareTrackingValue_(getter, expr) {
    if (!this.shareTrackingFragments_) {
      this.shareTrackingFragments_ = _services.shareTrackingForOrNull(this.ampdoc.win);
    }
    return this.shareTrackingFragments_.then(function (fragments) {
      _log.user().assert(fragments, 'To use variable %s, ' + 'amp-share-tracking should be configured', expr);
      return getter( /** @type {!ShareTrackingFragmentsDef} */fragments);
    });
  };

  return GlobalVariableSource;
})(_variableSource.VariableSource);

exports.GlobalVariableSource = GlobalVariableSource;

var UrlReplacements = (function () {
  /** @param {!./ampdoc-impl.AmpDoc} ampdoc */

  function UrlReplacements(ampdoc, variableSource) {
    babelHelpers.classCallCheck(this, UrlReplacements);

    /** @const {!./ampdoc-impl.AmpDoc} */
    this.ampdoc = ampdoc;

    /** @type {VariableSource} */
    this.variableSource_ = variableSource;
  }

  /**
   * Extracts client ID from a _ga cookie.
   * https://developers.google.com/analytics/devguides/collection/analyticsjs/cookies-user-id
   * @param {string} gaCookie
   * @returns {string}
   */

  /**
   * Synchronously expands the provided URL by replacing all known variables with
   * their resolved values. Optional `opt_bindings` can be used to add new
   * variables or override existing ones.  Any async bindings are ignored.
   *
   * TODO(mkhatib, #6322): Deprecate and please use expandUrlSync or expandStringSync.
   * @param {string} url
   * @param {!Object<string, (ResolverReturnDef|!SyncResolverDef)>=} opt_bindings
   * @param {!Object<string, ResolverReturnDef>=} opt_collectVars
   * @param {!Object<string, boolean>=} opt_whiteList Optional white list of names
   *     that can be substituted.
   * @return {string}
   */

  UrlReplacements.prototype.expandSync = function expandSync(url, opt_bindings, opt_collectVars, opt_whiteList) {
    return this.expandUrlSync(url, opt_bindings, opt_collectVars, opt_whiteList);
  };

  /**
   * Expands the provided URL by replacing all known variables with their
   * resolved values. Optional `opt_bindings` can be used to add new variables
   * or override existing ones.
   *
   * TODO(mkhatib, #6322): Deprecate and please use expandUrlAsync or expandStringAsync.
   * @param {string} url
   * @param {!Object<string, *>=} opt_bindings
   * @param {!Object<string, boolean>=} opt_whiteList Optional white list of names
   *     that can be substituted.
   * @return {!Promise<string>}
   */

  UrlReplacements.prototype.expandAsync = function expandAsync(url, opt_bindings, opt_whiteList) {
    return this.expandUrlAsync(url, opt_bindings, opt_whiteList);
  };

  /**
   * Synchronously expands the provided source by replacing all known variables with
   * their resolved values. Optional `opt_bindings` can be used to add new
   * variables or override existing ones.  Any async bindings are ignored.
   * @param {string} source
   * @param {!Object<string, (ResolverReturnDef|!SyncResolverDef)>=} opt_bindings
   * @param {!Object<string, ResolverReturnDef>=} opt_collectVars
   * @param {!Object<string, boolean>=} opt_whiteList Optional white list of names
   *     that can be substituted.
   * @return {string}
   */

  UrlReplacements.prototype.expandStringSync = function expandStringSync(source, opt_bindings, opt_collectVars, opt_whiteList) {
    return (/** @type {string} */this.expand_(source, opt_bindings, opt_collectVars, /* opt_sync */true, opt_whiteList)
    );
  };

  /**
   * Expands the provided source by replacing all known variables with their
   * resolved values. Optional `opt_bindings` can be used to add new variables
   * or override existing ones.
   * @param {string} source
   * @param {!Object<string, *>=} opt_bindings
   * @return {!Promise<string>}
   */

  UrlReplacements.prototype.expandStringAsync = function expandStringAsync(source, opt_bindings) {
    return (/** @type {!Promise<string>} */this.expand_(source, opt_bindings)
    );
  };

  /**
   * Synchronously expands the provided URL by replacing all known variables with
   * their resolved values. Optional `opt_bindings` can be used to add new
   * variables or override existing ones.  Any async bindings are ignored.
   * @param {string} url
   * @param {!Object<string, (ResolverReturnDef|!SyncResolverDef)>=} opt_bindings
   * @param {!Object<string, ResolverReturnDef>=} opt_collectVars
   * @param {!Object<string, boolean>=} opt_whiteList Optional white list of names
   *     that can be substituted.
   * @return {string}
   */

  UrlReplacements.prototype.expandUrlSync = function expandUrlSync(url, opt_bindings, opt_collectVars, opt_whiteList) {
    return this.ensureProtocolMatches_(url, /** @type {string} */this.expand_(url, opt_bindings, opt_collectVars, /* opt_sync */true, opt_whiteList));
  };

  /**
   * Expands the provided URL by replacing all known variables with their
   * resolved values. Optional `opt_bindings` can be used to add new variables
   * or override existing ones.
   * @param {string} url
   * @param {!Object<string, *>=} opt_bindings
   * @param {!Object<string, boolean>=} opt_whiteList Optional white list of names
   *     that can be substituted.
   * @return {!Promise<string>}
   */

  UrlReplacements.prototype.expandUrlAsync = function expandUrlAsync(url, opt_bindings, opt_whiteList) {
    var _this3 = this;

    return (/** @type {!Promise<string>} */this.expand_(url, opt_bindings, undefined, undefined, opt_whiteList).then(function (replacement) {
        return _this3.ensureProtocolMatches_(url, replacement);
      })
    );
  };

  /**
   * Expands an input element value attribute with variable substituted.
   * @param {!HTMLInputElement} element
   * @return {!Promise<string>}
   */

  UrlReplacements.prototype.expandInputValueAsync = function expandInputValueAsync(element) {
    return (/** @type {!Promise<string>} */this.expandInputValue_(element, /*opt_sync*/false)
    );
  };

  /**
   * Expands an input element value attribute with variable substituted.
   * @param {!HTMLInputElement} element
   * @return {string} Replaced string for testing
   */

  UrlReplacements.prototype.expandInputValueSync = function expandInputValueSync(element) {
    return (/** @type {string} */this.expandInputValue_(element, /*opt_sync*/true)
    );
  };

  /**
   * Expands in input element value attribute with variable substituted.
   * @param {!HTMLInputElement} element
   * @param {boolean=} opt_sync
   * @return {string|!Promise<string>}
   */

  UrlReplacements.prototype.expandInputValue_ = function expandInputValue_(element, opt_sync) {
    _log.dev().assert(element.tagName == 'INPUT' && (element.getAttribute('type') || '').toLowerCase() == 'hidden', 'Input value expansion only works on hidden input fields: %s', element);

    var whitelist = this.getWhitelistForElement_(element);
    if (!whitelist) {
      return opt_sync ? element.value : Promise.resolve(element.value);
    }
    if (element[ORIGINAL_VALUE_PROPERTY] === undefined) {
      element[ORIGINAL_VALUE_PROPERTY] = element.value;
    }
    var result = this.expand_(element[ORIGINAL_VALUE_PROPERTY] || element.value,
    /* opt_bindings */undefined,
    /* opt_collectVars */undefined,
    /* opt_sync */opt_sync,
    /* opt_whitelist */whitelist);

    if (opt_sync) {
      return element.value = result;
    }
    return result.then(function (newValue) {
      element.value = newValue;
      return newValue;
    });
  };

  /**
   * Returns a replacement whitelist from elements' data-amp-replace attribute.
   * @param {!Element} element.
   * @param {!Object<string, boolean>=} opt_supportedReplacement Optional supported
   * replacement that filters whitelist to a subset.
   * @return {!Object<string, boolean>|undefined}
   */

  UrlReplacements.prototype.getWhitelistForElement_ = function getWhitelistForElement_(element, opt_supportedReplacement) {
    var whitelist = element.getAttribute('data-amp-replace');
    if (!whitelist) {
      return;
    }
    var requestedReplacements = {};
    whitelist.trim().split(/\s+/).forEach(function (replacement) {
      if (!opt_supportedReplacement || opt_supportedReplacement && opt_supportedReplacement.hasOwnProperty(replacement)) {
        requestedReplacements[replacement] = true;
      } else if (opt_supportedReplacement) {
        _log.user().warn('URL', 'Ignoring unsupported replacement', replacement);
      }
    });
    return requestedReplacements;
  };

  /**
    * Returns whether variable substitution is allowed for given url.
    * @param {!Location} url.
    * @return {boolean}
    */

  UrlReplacements.prototype.isAllowedOrigin_ = function isAllowedOrigin_(url) {
    var docInfo = _services.documentInfoForDoc(this.ampdoc);

    if (url.origin == _url.parseUrl(docInfo.canonicalUrl).origin || url.origin == _url.parseUrl(docInfo.sourceUrl).origin) {
      return true;
    }

    var meta = this.ampdoc.getRootNode().querySelector('meta[name=amp-link-variable-allowed-origin]');

    if (meta && meta.hasAttribute('content')) {
      var whitelist = meta.getAttribute('content').trim().split(/\s+/);
      for (var i = 0; i < whitelist.length; i++) {
        if (url.origin == _url.parseUrl(whitelist[i]).origin) {
          return true;
        }
      }
    }

    return false;
  };

  /**
   * Replaces values in the link of an anchor tag if
   * - the link opts into it (via data-amp-replace argument)
   * - the destination is the source or canonical origin of this doc.
   * @param {!Element} element An anchor element.
   * @return {string|undefined} Replaced string for testing
   */

  UrlReplacements.prototype.maybeExpandLink = function maybeExpandLink(element) {
    _log.dev().assert(element.tagName == 'A');
    var supportedReplacements = {
      'CLIENT_ID': true,
      'QUERY_PARAM': true
    };
    var additionalUrlParameters = element.getAttribute('data-amp-addparams');
    var whitelist = this.getWhitelistForElement_(element, supportedReplacements);
    if (!whitelist && !additionalUrlParameters) {
      return;
    }
    // ORIGINAL_HREF_PROPERTY has the value of the href "pre-replacement".
    // We set this to the original value before doing any work and use it
    // on subsequent replacements, so that each run gets a fresh value.
    var href = _log.dev().assertString(element[ORIGINAL_HREF_PROPERTY] || element.getAttribute('href'));
    var url = _url.parseUrl(href);
    if (element[ORIGINAL_HREF_PROPERTY] == null) {
      element[ORIGINAL_HREF_PROPERTY] = href;
    }
    if (additionalUrlParameters) {
      href = _url.addParamsToUrl(href, _url.parseQueryString(additionalUrlParameters));
    }
    if (whitelist) {
      var isAllowedOrigin = this.isAllowedOrigin_(url);
      if (!isAllowedOrigin) {
        _log.user().warn('URL', 'Ignoring link replacement', href, ' because the link does not go to the document\'s' + ' source, canonical, or whitelisted origin.');
      } else {
        href = this.expandSync(href,
        /* opt_bindings */undefined,
        /* opt_collectVars */undefined,
        /* opt_whitelist */whitelist);
      }
    }
    return element.href = href;
  };

  /**
   * @param {string} url
   * @param {!Object<string, *>=} opt_bindings
   * @param {!Object<string, *>=} opt_collectVars
   * @param {boolean=} opt_sync
   * @param {!Object<string, boolean>=} opt_whiteList Optional white list of names
   *     that can be substituted.
   * @return {!Promise<string>|string}
   * @private
   */

  UrlReplacements.prototype.expand_ = function expand_(url, opt_bindings, opt_collectVars, opt_sync, opt_whiteList) {
    var _this4 = this;

    var expr = this.variableSource_.getExpr(opt_bindings);
    var replacementPromise = undefined;
    var replacement = url.replace(expr, function (match, name, opt_strargs) {
      var args = [];
      if (typeof opt_strargs == 'string') {
        args = opt_strargs.split(',');
      }
      if (opt_whiteList && !opt_whiteList[name]) {
        // Do not perform substitution and just return back the original
        // match, so that the string doesn't change.
        return match;
      }
      var binding = undefined;
      if (opt_bindings && name in opt_bindings) {
        binding = opt_bindings[name];
      } else if (binding = _this4.variableSource_.get(name)) {
        if (opt_sync) {
          binding = binding.sync;
          if (!binding) {
            _log.user().error(TAG, 'ignoring async replacement key: ', name);
            return '';
          }
        } else {
          binding = binding.async || binding.sync;
        }
      }
      var val = undefined;
      try {
        val = typeof binding == 'function' ? binding.apply(null, args) : binding;
      } catch (e) {
        // Report error, but do not disrupt URL replacement. This will
        // interpolate as the empty string.
        if (opt_sync) {
          val = '';
        }
        _log.rethrowAsync(e);
      }
      // In case the produced value is a promise, we don't actually
      // replace anything here, but do it again when the promise resolves.
      if (val && val.then) {
        var _ret = (function () {
          if (opt_sync) {
            _log.user().error(TAG, 'ignoring promise value for key: ', name);
            return {
              v: ''
            };
          }
          /** @const {Promise<string>} */
          var p = val['catch'](function (err) {
            // Report error, but do not disrupt URL replacement. This will
            // interpolate as the empty string.
            _log.rethrowAsync(err);
          }).then(function (v) {
            replacement = replacement.replace(match, encodeValue(v));
            if (opt_collectVars) {
              opt_collectVars[match] = v;
            }
          });
          if (replacementPromise) {
            replacementPromise = replacementPromise.then(function () {
              return p;
            });
          } else {
            replacementPromise = p;
          }
          return {
            v: match
          };
        })();

        if (typeof _ret === 'object') return _ret.v;
      }
      if (opt_collectVars) {
        opt_collectVars[match] = val;
      }
      return encodeValue(val);
    });

    if (replacementPromise) {
      replacementPromise = replacementPromise.then(function () {
        return replacement;
      });
    }

    if (opt_sync) {
      return replacement;
    }
    return replacementPromise || Promise.resolve(replacement);
  };

  /**
   * Collects all substitutions in the provided URL and expands them to the
   * values for known variables. Optional `opt_bindings` can be used to add
   * new variables or override existing ones.
   * @param {string} url
   * @param {!Object<string, *>=} opt_bindings
   * @return {!Promise<!Object<string, *>>}
   */

  UrlReplacements.prototype.collectVars = function collectVars(url, opt_bindings) {
    var vars = Object.create(null);
    return this.expand_(url, opt_bindings, vars).then(function () {
      return vars;
    });
  };

  /**
   * Ensures that the protocol of the original url matches the protocol of the
   * replacement url. Returns the replacement if they do, the original if they
   * do not.
   * @param {string} url
   * @param {string} replacement
   * @return {string}
   */

  UrlReplacements.prototype.ensureProtocolMatches_ = function ensureProtocolMatches_(url, replacement) {
    var newProtocol = _url.parseUrl(replacement, /* opt_nocache */true).protocol;
    var oldProtocol = _url.parseUrl(url, /* opt_nocache */true).protocol;
    if (newProtocol != oldProtocol) {
      _log.user().error(TAG, 'Illegal replacement of the protocol: ', url);
      return url;
    }
    _log.user().assert(_url.isProtocolValid(replacement), 'The replacement url has invalid protocol: %s', replacement);

    return replacement;
  };

  /**
   * @return {VariableSource}
   */

  UrlReplacements.prototype.getVariableSource = function getVariableSource() {
    return this.variableSource_;
  };

  return UrlReplacements;
})();

exports.UrlReplacements = UrlReplacements;

function extractClientIdFromGaCookie(gaCookie) {
  return gaCookie.replace(/^(GA1|1)\.[\d-]+\./, '');
}

/**
 * @param {!./ampdoc-impl.AmpDoc} ampdoc
 */

function installUrlReplacementsServiceForDoc(ampdoc) {
  _service.registerServiceBuilderForDoc(ampdoc, 'url-replace', function (doc) {
    return new UrlReplacements(doc, new GlobalVariableSource(doc));
  });
}

/**
 * @param {!./ampdoc-impl.AmpDoc} ampdoc
 * @param {!Window} embedWin
 * @param {*} varSource
 */

function installUrlReplacementsForEmbed(ampdoc, embedWin, varSource) {
  _service.installServiceInEmbedScope(embedWin, 'url-replace', new UrlReplacements(ampdoc, varSource));
}

/**
 * @typedef {{
 *   incomingFragment: string,
 *   outgoingFragment: string,
 * }}
 */
var ShareTrackingFragmentsDef = undefined;

},{"../impression.js":45,"../log":49,"../service":61,"../services":65,"../url":71,"./variable-source":64}],64:[function(require,module,exports){
exports.__esModule = true;
exports.getTimingDataAsync = getTimingDataAsync;
exports.getTimingDataSync = getTimingDataSync;
exports.getNavigationData = getNavigationData;
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

var _eventHelper = require('../event-helper');

var _types = require('../types');

/** @typedef {string|number|boolean|undefined|null} */
var ResolverReturnDef = undefined;

/** @typedef {function(...*):ResolverReturnDef} */
var SyncResolverDef = undefined;

/** @typedef {function(...*):!Promise<ResolverReturnDef>} */
var AsyncResolverDef = undefined;

/** @typedef {{sync: SyncResolverDef, async: AsyncResolverDef}} */
var ReplacementDef = undefined;

/**
 * Returns navigation timing information based on the start and end events.
 * The data for the timing events is retrieved from performance.timing API.
 * If start and end events are both given, the result is the difference between
 * the two. If only start event is given, the result is the timing value at
 * start event.
 * @param {!Window} win
 * @param {string} startEvent
 * @param {string=} endEvent
 * @return {!Promise<ResolverReturnDef>}
 */

function getTimingDataAsync(win, startEvent, endEvent) {
  var metric = getTimingDataSync(win, startEvent, endEvent);
  if (metric === '') {
    // Metric is not yet available. Retry after a delay.
    return _eventHelper.loadPromise(win).then(function () {
      return getTimingDataSync(win, startEvent, endEvent);
    });
  }
  return Promise.resolve(metric);
}

/**
 * Returns navigation timing information based on the start and end events.
 * The data for the timing events is retrieved from performance.timing API.
 * If start and end events are both given, the result is the difference between
 * the two. If only start event is given, the result is the timing value at
 * start event. Enforces synchronous evaluation.
 * @param {!Window} win
 * @param {string} startEvent
 * @param {string=} endEvent
 * @return {ResolverReturnDef} undefined if API is not available, empty string
 *    if it is not yet available, or value as string
 */

function getTimingDataSync(win, startEvent, endEvent) {
  var timingInfo = win['performance'] && win['performance']['timing'];
  if (!timingInfo || timingInfo['navigationStart'] == 0) {
    // Navigation timing API is not supported.
    return;
  }

  var metric = endEvent === undefined ? timingInfo[startEvent] : timingInfo[endEvent] - timingInfo[startEvent];

  if (!_types.isFiniteNumber(metric)) {
    // The metric is not supported.
    return;
  } else if (metric < 0) {
    ;
    return '';
  } else {
    return metric;
  }
}

/**
 * Returns navigation information from the current browsing context.
 * @param {!Window} win
 * @param {string} attribute
 * @return {ResolverReturnDef}
 * @private
 */

function getNavigationData(win, attribute) {
  var navigationInfo = win['performance'] && win['performance']['navigation'];
  if (!navigationInfo || navigationInfo[attribute] === undefined) {
    // PerformanceNavigation interface is not supported or attribute is not
    // implemented.
    return;
  }
  return navigationInfo[attribute];
}

/**
 * A class to provide variable substitution related features. Extend this class
 * and override initialize() to add more supported variables.
 */

var VariableSource = (function () {
  function VariableSource() {
    babelHelpers.classCallCheck(this, VariableSource);

    /** @private {!RegExp|undefined} */
    this.replacementExpr_ = undefined;

    /** @private @const {!Object<string, !ReplacementDef>} */
    this.replacements_ = Object.create(null);

    /** @private {boolean} */
    this.initialized_ = false;
  }

  /**
   * Lazily initialize the default replacements.
   * @private
   */

  VariableSource.prototype.initialize_ = function initialize_() {
    this.initialize();
    this.initialized_ = true;
  };

  /**
   * Override this method to set all the variables supported by derived class.
   */

  VariableSource.prototype.initialize = function initialize() {}
  // Needs to be implemented by derived classes.

  /**
   * Method exists to assist stubbing in tests.
   * @param {string} name
   * @return {!ReplacementDef}
   */
  ;

  VariableSource.prototype.get = function get(name) {
    if (!this.initialized_) {
      this.initialize_();
    }

    return this.replacements_[name];
  };

  /**
   * Sets a synchronous value resolver for the variable with the specified name.
   * The value resolver may optionally take an extra parameter.
   * Can be called in conjunction with setAsync to allow for additional
   * asynchronous resolver where expand will use async and expandSync the sync
   * version.
   * @param {string} varName
   * @param {!SyncResolverDef} syncResolver
   * @return {!VariableSource}
   */

  VariableSource.prototype.set = function set(varName, syncResolver) {
    _log.dev().assert(varName.indexOf('RETURN') == -1);
    this.replacements_[varName] = this.replacements_[varName] || { sync: undefined, async: undefined };
    this.replacements_[varName].sync = syncResolver;
    this.replacementExpr_ = undefined;
    return this;
  };

  /**
   * Sets an async value resolver for the variable with the specified name.
   * The value resolver may optionally take an extra parameter.
   * Can be called in conjuction with setAsync to allow for additional
   * asynchronous resolver where expand will use async and expandSync the sync
   * version.
   * @param {string} varName
   * @param {!AsyncResolverDef} asyncResolver
   * @return {!VariableSource}
   */

  VariableSource.prototype.setAsync = function setAsync(varName, asyncResolver) {
    _log.dev().assert(varName.indexOf('RETURN') == -1);
    this.replacements_[varName] = this.replacements_[varName] || { sync: undefined, async: undefined };
    this.replacements_[varName].async = asyncResolver;
    this.replacementExpr_ = undefined;
    return this;
  };

  /**
   * Helper method to set both sync and async resolvers.
   * @param {string} varName
   * @param {!SyncResolverDef} syncResolver
   * @param {!AsyncResolverDef} asyncResolver
   * @return {!VariableSource}
   */

  VariableSource.prototype.setBoth = function setBoth(varName, syncResolver, asyncResolver) {
    return this.set(varName, syncResolver).setAsync(varName, asyncResolver);
  };

  /**
   * Returns a Regular expression that can be used to detect all the variables
   * in a template.
   * @param {!Object<string, *>=} opt_bindings
   * @return {!RegExp}
   */

  VariableSource.prototype.getExpr = function getExpr(opt_bindings) {
    var _this = this;

    if (!this.initialized_) {
      this.initialize_();
    }

    var additionalKeys = opt_bindings ? Object.keys(opt_bindings) : null;
    if (additionalKeys && additionalKeys.length > 0) {
      var _ret = (function () {
        var allKeys = Object.keys(_this.replacements_);
        additionalKeys.forEach(function (key) {
          if (_this.replacements_[key] === undefined) {
            allKeys.push(key);
          }
        });
        return {
          v: _this.buildExpr_(allKeys)
        };
      })();

      if (typeof _ret === 'object') return _ret.v;
    }
    if (!this.replacementExpr_) {
      this.replacementExpr_ = this.buildExpr_(Object.keys(this.replacements_));
    }
    return this.replacementExpr_;
  };

  /**
   * @param {!Array<string>} keys
   * @return {!RegExp}
   * @private
   */

  VariableSource.prototype.buildExpr_ = function buildExpr_(keys) {
    // The keys must be sorted to ensure that the longest keys are considered
    // first. This avoids a problem where a RANDOM conflicts with RANDOM_ONE.
    keys.sort(function (s1, s2) {
      return s2.length - s1.length;
    });
    var all = keys.join('|');
    // Match the given replacement patterns, as well as optionally
    // arguments to the replacement behind it in parantheses.
    // Example string that match
    // FOO_BAR
    // FOO_BAR(arg1)
    // FOO_BAR(arg1,arg2)
    return new RegExp('\\$?(' + all + ')(?:\\(([0-9a-zA-Z-_.,]+)\\))?', 'g');
  };

  return VariableSource;
})();

exports.VariableSource = VariableSource;

},{"../event-helper":39,"../log":49,"../types":69}],65:[function(require,module,exports){
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

},{"./element-service":36,"./service":61}],66:[function(require,module,exports){
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

},{}],67:[function(require,module,exports){
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

},{"./log":49,"./render-delaying-services":60,"./service/document-state":62,"./services":65,"./style":68}],68:[function(require,module,exports){
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

},{"./string":66,"./utils/object.js":75}],69:[function(require,module,exports){
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

},{}],70:[function(require,module,exports){
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

},{}],71:[function(require,module,exports){
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

},{"./config":31,"./log":49,"./mode":51,"./string":66,"./types":69,"./url-parse-query-string":70}],72:[function(require,module,exports){
exports.__esModule = true;
exports.base64UrlDecodeToBytes = base64UrlDecodeToBytes;
exports.base64DecodeToBytes = base64DecodeToBytes;
exports.base64UrlEncodeFromBytes = base64UrlEncodeFromBytes;
exports.base64EncodeFromBytes = base64EncodeFromBytes;
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

var _bytes = require('./bytes');

/**
 * Character mapping from base64url to base64.
 * @const {!Object<string, string>}
 */
var base64UrlDecodeSubs = { '-': '+', '_': '/', '.': '=' };

/**
 * Character mapping from base64 to base64url.
 * @const {!Object<string, string>}
 */
var base64UrlEncodeSubs = { '+': '-', '/': '_', '=': '.' };

/**
 * Converts a string which is in base64url encoding into a Uint8Array
 * containing the decoded value.
 * @param {string} str
 * @return {!Uint8Array}
 */

function base64UrlDecodeToBytes(str) {
  var encoded = atob(str.replace(/[-_.]/g, function (ch) {
    return base64UrlDecodeSubs[ch];
  }));
  return _bytes.stringToBytes(encoded);
}

/**
 * Converts a string which is in base64 encoding into a Uint8Array
 * containing the decoded value.
 * @param {string} str
 * @return {!Uint8Array}
 */

function base64DecodeToBytes(str) {
  return _bytes.stringToBytes(atob(str));
}

/**
 * Converts a bytes array into base64url encoded string.
 * base64url is defined in RFC 4648. It is sometimes referred to as "web safe".
 * @param {!Uint8Array} bytes
 * @return {string}
 */

function base64UrlEncodeFromBytes(bytes) {
  var str = _bytes.bytesToString(bytes);
  return btoa(str).replace(/[+/=]/g, function (ch) {
    return base64UrlEncodeSubs[ch];
  });
}

/**
 * Converts a bytes array into base64 encoded string.
 * @param {!Uint8Array} bytes
 * @return {string}
 */

function base64EncodeFromBytes(bytes) {
  return btoa(_bytes.bytesToString(bytes));
}

},{"./bytes":73}],73:[function(require,module,exports){
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

},{"../log":49,"../types":69}],74:[function(require,module,exports){
exports.__esModule = true;
exports.domFingerprintPlain = domFingerprintPlain;
exports.domFingerprint = domFingerprint;
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

var _crypto = require('../crypto');

/**
 * Gets a string of concatenated element names and relative positions
 * of the DOM element and its parentElement's (up to 25).  Relative position
 * is the index of nodes with this tag within the parent's children.
 * The order is from the inner to outer nodes in DOM hierarchy.
 *
 * If a DOM hierarchy is the following:
 *
 * <div id='id1' ...>
 *   <div id='id2' ...>
 *     <table ...>       // table:0
 *       <tr>            // tr:0
 *         <td>...</td>  // td:0
 *         <td>          // td:1
 *           <amp-ad ...></amp-ad>
 *         </td>
 *       </tr>
 *       <tr>...</tr>    // tr:1
 *     </table>
 *   </div>
 * </div>
 *
 * With the amp-ad element passed in:
 * 'amp-ad.0,td.1,tr.0,table.0,div/id2.0,div/id1.0'
 *
 * Note: 25 is chosen arbitrarily.
 *
 * @param {?Element} element DOM node from which to get fingerprint.
 * @return {string} Concatenated element ids.
 */

function domFingerprintPlain(element) {
  var ids = [];
  var level = 0;
  while (element && element.nodeType == /* element */1 && level < 25) {
    var id = '';
    if (element.id) {
      id = '/' + element.id;
    }
    var nodeName = element.nodeName.toLowerCase();
    ids.push('' + nodeName + id + indexWithinParent(element));
    level++;
    element = element.parentElement;
  }
  return ids.join();
}

;

/**
 * Calculates ad slot DOM fingerprint.  This key is intended to
 * identify "same" ad unit across many page views. This is
 * based on where the ad appears within the page's DOM structure.
 *
 * @param {?Element} element The DOM element from which to collect
 *     the DOM chain element IDs.  If null, DOM chain element IDs are not
 *     included in the hash.
 * @return {string} The ad unit hash key string.
 */

function domFingerprint(element) {
  return _crypto.stringHash32(domFingerprintPlain(element));
}

;

/**
 * Gets a string showing the index of an element within
 * the children of its parent, counting only nodes with the same tag.
 * Stop at 25, just to have a limit.
 * @param {!Element} element DOM node to get index of.
 * @return {string} '.<index>' or ''.
 */
function indexWithinParent(element) {
  var nodeName = element.nodeName;
  // Find my index within my parent's children
  var i = 0;
  var count = 0;
  var sibling = element.previousElementSibling;
  // Different browsers have different children.
  // So count only nodes with the same tag.
  // Use a limit for the tags, so that different browsers get the same
  // count. So 25 and higher all return no index.
  while (sibling && count < 25 && i < 100) {
    if (sibling.nodeName == nodeName) {
      count++;
    }
    i++;
    sibling = sibling.previousElementSibling;
  }
  // If we got to the end, then the count is accurate; otherwise skip count.
  return count < 25 && i < 100 ? '.' + count : '';
};

},{"../crypto":33}],75:[function(require,module,exports){
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

},{"../types":69}],76:[function(require,module,exports){
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

},{}],77:[function(require,module,exports){
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

},{"./object":75}],78:[function(require,module,exports){
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

},{}]},{},[17])


})});
//# sourceMappingURL=amp-ad-network-doubleclick-impl-0.1.max.js.map