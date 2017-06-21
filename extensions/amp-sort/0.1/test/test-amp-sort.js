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

// import {AmpSort} from '../amp-sort';
// import {
//   actionServiceForDoc,
//   documentInfoForDoc,
//   timerFor,
// } from '../../../../src/services';

// import {tryFocus} from '../../../../src/dom';
import '../amp-sort';

// import {KeyCodes} from '../../../../src/utils/key-codes';
import {adopt} from '../../../../src/runtime';
// import {platformFor} from '../../../../src/services';
// import {timerFor} from '../../../../src/services';
// import {assertScreenReaderElement} from '../../../../testing/test-helper';
// import {toggleExperiment} from '../../../../src/experiments';
// import * as sinon from 'sinon';

 /** @const */
// const DEFAULT_TOOLBAR_MEDIA = '(min-width: 768px)';


adopt(window);

describes.realWin('amp-sort', {
  win: { /* window spec */
    location: '...',
    historyOff: false,
  },
  amp: { /* amp spec */
    runtimeOn: false,
    extensions: ['amp-sort:0.1'],
  },
}, env => {
  let win;
  describe('amp-sort', () => {

    function getSort(options) {
      win = env.win;
      const attributes = options.attributes || {};
      const ampSort = win.document.createElement('amp-sort');
      ampSort.setAttribute('layout', 'container');
      ampSort.setAttribute('id', 'ampSort');
      if (attributes) {
        Object.keys(attributes).forEach(key => {
          ampSort.setAttribute(key, attributes[key]);
        });
      }
      ampSort.setAttribute('on',
          `tap:ampSort.sort(sortBy=${attributes.sortBy}`);
      const config = options.config || {};
      let noOfSortables = 3;
      if (config) {
        noOfSortables = config.count || 3;
      }

      const list = win.document.createElement('ul');

      for (let i = 0; i < noOfSortables; i++) {
        const listItem = win.document.createElement('li');
        listItem.setAttribute(attributes.sortBy, String.fromCharCode(65 + i));
        list.append(listItem);
      }
      ampSort.appendChild(list);

      win.document.body.appendChild(ampSort);
      return ampSort;
    }

    it('should build properly', () => {
      const ampSort = getSort({
        attributes: {
          'sort-by': 'data-string',
        },
      });
      ampSort.build();

      expect(win.document.querySelectorAll('amp-sort').length).to.equal(1);
    });

    it('should apply the `sorted` attribute on sort', () => {
      const ampSort = getSort({
        attributes: {
          'sort-by': 'data-string',
        },
      });
      const impl = ampSort.implementation_;
      ampSort.build();
      impl.sort_();

      expect(ampSort.hasAttribute('sorted')).to.be.true;
    });

    it('should apply the `sorted-by` attribute once triggered', () => {
      const ampSort = getSort({
        attributes: {
          'sort-by': 'data-string',
        },
      });
      const impl = ampSort.implementation_;
      ampSort.build();
      impl.sort_();

      expect(ampSort.hasAttribute('sorted-by')).to.be.true;
    });

    it('should still have the `sort-by` attribute once triggered', () => {
      const ampSort = getSort({
        attributes: {
          'sort-by': 'data-string',
        },
      });
      const impl = ampSort.implementation_;
      ampSort.build();
      impl.sort_();

      expect(ampSort.hasAttribute('sort-by')).to.be.true;
    });

    it('should still have the same value for `sort-by` once triggered', () => {
      const ampSort = getSort({
        attributes: {
          'sort-by': 'data-string',
        },
      });
      const impl = ampSort.implementation_;
      ampSort.build();
      impl.sort_();

      expect(ampSort.getAttribute('sort-by')).to.equal('data-string');
    });

    it('should apply the `sorted-direction` attribute once triggered', () => {
      const ampSort = getSort({
        attributes: {
          'sort-by': 'data-string',
        },
      });
      const impl = ampSort.implementation_;
      ampSort.build();
      impl.sort_();

      expect(ampSort.hasAttribute('sorted-direction')).to.be.true;
    });

    it('should apply the default `value-type` of `string`', () => {
      const ampSort = getSort({
        attributes: {
          'sort-by': 'data-string',
        },
      });
      const impl = ampSort.implementation_;
      ampSort.build();
      impl.sort_();

      expect(ampSort.getAttribute('value-type')).to.equal('string');
    });

    it('should apply the default `sorted-direction` of `asc`', () => {
      const ampSort = getSort({
        attributes: {
          'sort-by': 'data-string',
        },
      });
      const impl = ampSort.implementation_;
      ampSort.build();
      impl.sort_();

      expect(ampSort.getAttribute('sorted-direction')).to.equal('asc');
    });

    it('should apply the default `value-type` of `string`', () => {
      const ampSort = getSort({
        attributes: {
          'sort-by': 'data-string',
        },
      });
      const impl = ampSort.implementation_;
      ampSort.build();
      impl.sort_();

      expect(ampSort.getAttribute('value-type')).to.equal('string');
    });

  });
});



  // function getLetterList(doc = document) {
  //   const list = doc.createElement('ul');

  //   const charCodeRange = {
  //     start: 65,
  //     end: 90,
  //   };

  //   for (let i = 0; i < 10; i++) {
  //     const listItem = doc.createElement('li');

  //     listItem.setAttribute('data-string',
  //       String.fromCharCode(charCodeRange.start + i));

  //     list.append(listItem);
  //   }

  //   return list;
  // }


      // const keyDownEvent = {
      //   keyCode: KeyCodes.ENTER,
      //   target: ampSort,
      //   preventDefault: sandbox.spy(),
      // };

      // obj.ampSort.implementation_.keyDownHandler_(keyDownEvent);


  // it('should expand when header of a collapsed section is clicked', () => {
  //   return getAmpAccordion().then(obj => {
  //     const iframe = obj.iframe;
  //     const headerElements = iframe.doc.querySelectorAll(
  //         'section > *:first-child');
  //     const clickEvent = {
  //       target: headerElements[0],
  //       currentTarget: headerElements[0],
  //       preventDefault: sandbox.spy(),
  //     };
  //     expect(headerElements[0].parentNode.hasAttribute('expanded')).to.be.false;
  //     expect(headerElements[0].getAttribute('aria-expanded')).to.equal('false');
  //     obj.ampAccordion.implementation_.onHeaderPicked_(clickEvent);
  //     expect(headerElements[0].parentNode.hasAttribute('expanded')).to.be.true;
  //     expect(headerElements[0].getAttribute('aria-expanded')).to.equal('true');
  //     expect(clickEvent.preventDefault.called).to.be.true;
  //   });
  // });


    // function getSort(doc = document) {
    //   const ampSort = doc.createElement('amp-sort');
    //   ampSort.setAttribute('id', 'ampSort');

    //   return ampSort;
    // }







    // it('should apply the `sorted` attribute on sort', () => {
    //   const ampSort = getSort();

    //   ampSort.setAttribute(
    //       'on',
    //       'tap:ampSort.sort(sortBy=\'data-string\')'
    //   );

    //   ampSort.appendChild(getLetterList());
    //   document.body.appendChild(ampSort);

    //   actionServiceForDoc(ampSort).trigger(this.sort_, 'tap', null);

    //   expect(ampSort.hasAttribute('sorted'));

    //   document.body.removeChild(ampSort);
    // });

    // it('should still have the `sorted-by` attribute on sort', () => {
    //   const ampSort = getSort();

    //   ampSort.setAttribute(
    //       'on',
    //       'tap:ampSort.sort(sortBy=\'data-string\')'
    //   );

    //   ampSort.appendChild(getLetterList());
    //   document.body.appendChild(ampSort);

    //   actionServiceForDoc(ampSort).trigger(this.sort_, 'tap', null);

    //   expect(ampSort.hasAttribute('sorted-by'));

    //   document.body.removeChild(ampSort);
    // });
















    // it('should apply the `sorted-direction` attribute on sort', () => {
    //   const ampSort = getSort();

    //   ampSort.setAttribute(
    //       'on',
    //       'tap:ampSort.sort(sortBy=\'data-string\')'
    //   );

    //   ampSort.appendChild(getLetterList());
    //   document.body.appendChild(ampSort);

    //   actionServiceForDoc(ampSort).trigger(this.sort_, 'tap', null);

    //   expect(document.body.ampSort.hasAttribute('sorted-direction'));

    //   document.body.removeChild(ampSort);
    // });




    // function getSort(doc = document) {
    //   const ampSort = doc.createElement('amp-sort');
    //   ampSort.setAttribute('id', 'ampSort');

    //   win.document.createElement('amp-sort');

    //   return ampSort;
    // }











    // beforeEach(() => {
    //   sandbox = env.sandbox;
    // });

    // afterEach(() => {
    //   // Reset supported state for checkValidity and reportValidity.
    //   setCheckValiditySupportedForTesting(undefined);
    //   setReportValiditySupportedForTesting(undefined);
    // });


    ///COMBINATIONS
      // const options = {
      //   ariaSort: ['ascending', 'descending'],
      //   sortBy: 'testElement',
      //   sortDirection: ['asc', 'desc', 'toggle'],
      //   sortedDirection: ['asc', 'desc'],
      //   valueType: ['string', 'number'],
      // };

    // 3 * 2 * 2 * 2 = 24 test

      // beforeEach(() => {
      //   win = env.win;
      //   element = win.document.createElement('amp-sort');
      //   env.ampdoc.getBody().appendChild(form);
      //   win.document.body.appendChild(element);
      //   // toggleExperiment(window, 'amp-sort 1.0', true);
      // });

      // it('should apply the `sorted` attribute on sort', () => {
      //   const list = win.document.createElement('ul');

      //   list.setAttribute(
      //       'on',
      //       'tap:tableSorter.sort(sortBy=\'data-string\')'
      //   );

      //   const charCodeRange = {
      //     start: 65,
      //     end: 90,
      //   };

      //   for (let i = 0; i < 10; i++) {
      //     const listItem = win.document.create('li');
      //     listItem.setAttribute(String.fromCharCode(charCodeRange.start + i));
      //     list.append(listItem);
      //   }

      //   element.appendChild(list);

      //   element.build();

      //   actionServiceForDoc(doc.documentElement).trigger(this.form_,
      //     'tap:tableSorter.sort(sortBy=\'data-string\')', null);



      //   expect(element.querySelector('amp-sort').hasAttribute('sorted'));
      // });

    //   it('should still have the `sorted-by` attribute on sort', () => {
    //     list.setAttribute(
    //         'on',
    //         "tap:tableSorter.sort(sortBy='data-string')"
    //   );

    //   // ordered lists are broken
    //     const list = win.document.createElement('ul');

    //     const listItemD = win.document.create('li');
    //     listItem.setAttribute('data-string', 'd');
    //     list.append(listItemD);

    //     const listItemC = win.document.create('li');
    //     listItem.setAttribute('data-string', 'c');
    //     list.append(listItemC);

    //     const listItemB = win.document.create('li');
    //     listItem.setAttribute('data-string', 'b');
    //     list.append(listItemB);

    //     const listItemA = win.document.create('li');
    //     listItem.setAttribute('data-string', 'a');
    //     list.append(listItemA);

    //     element.appendChild(list);

    //     element.build();

    //     element.sort();

    //     expect(element.querySelector('amp-sort').hasAttribute('sorted-by'));
    //   });

    //   it('should apply the `sorted-direction` attribute on sort', () => {
    //   // ordered lists are broken
    //     const list = win.document.createElement('ul');

    //     list.setAttribute(
    //         'on',
    //         "tap:tableSorter.sort(sortBy='data-string')"
    //   );

    //     const listItemD = win.document.create('li');
    //     listItem.setAttribute('data-string', 'd');
    //     list.append(listItemD);

    //     const listItemC = win.document.create('li');
    //     listItem.setAttribute('data-string', 'c');
    //     list.append(listItemC);

    //     const listItemB = win.document.create('li');
    //     listItem.setAttribute('data-string', 'b');
    //     list.append(listItemB);

    //     const listItemA = win.document.create('li');
    //     listItem.setAttribute('data-string', 'a');
    //     list.append(listItemA);

    //     element.appendChild(list);

    //     element.build();

    //     element.sort();

    //     expect(
    //         element.querySelector('amp-sort').hasAttribute('sorted-direction')
    //   );
    //   });
    // }

//   it('should set `sorted-direction` to `asc` when `sort-direction` is `toggle`' () => {
//     list.setAttribute('on', 'tap:tableSorter.sort(sortBy=\'data-string\', sortDirecion=\'toggle\')');
//   }

//   list.setAttribute('on', 'tap:tableSorter.sort(sortBy=\'data-price\', sortDirecion=\'toggle\')');

//   it('should apply appropriate default valueType of `string` on sort', () => {
//     element.build();

//     on="tap:tableSorter.sort(sortBy='data-price', sortDirecion='toggle')"

//     // ordered lists are broken
//     let list = win.document.createElement('ul');

//     list.setAttribute('on', 'tap:tableSorter.sort(sortBy=\'data-price\', sortDirecion=\'toggle\')');

//     let listItemD = win.document.create('li');
//     listItem.setAttribute('value-type', 'd');
//     list.append(listItemD);

//     let listItemC = win.document.create('li');
//     listItem.setAttribute('value-type', 'c');
//     list.append(listItemC);

//     let listItemB = win.document.create('li');
//     listItem.setAttribute('value-type', 'b');
//     list.append(listItemB);

//     let listItemA = win.document.create('li');
//     listItem.setAttribute('value-type', 'a');
//     list.append(listItemA);

//     element.sort();

//     expect(element.querySelector('amp-sort').hasAttribute('sorted-direction'));
//   }

//   it('should apply appropriate default sortDirection (ascending) on sort' () => {
//     element.build();

//     // ordered lists are broken
//     let list = win.document.createElement('ul');

//     let listItemD = win.document.create('li');
//     listItem.setAttribute('value-type', 'd');
//     list.append(listItemD);

//     let listItemC = win.document.create('li');
//     listItem.setAttribute('value-type', 'c');
//     list.append(listItemC);

//     let listItemB = win.document.create('li');
//     listItem.setAttribute('value-type', 'b');
//     list.append(listItemB);

//     let listItemA = win.document.create('li');
//     listItem.setAttribute('value-type', 'a');
//     list.append(listItemA);

//     element.sort();

//     expect(element.querySelector('ul').children[0]).to.equal('a');
//     expect(element.querySelector('ul').children[1]).to.equal('b');
//     expect(element.querySelector('ul').children[2]).to.equal('c');
//     expect(element.querySelector('ul').children[3]).to.equal('d');

//     expect(element.querySelector('amp-sort').hasAttribute('sorted-direction'));
//   }

//   it('should apply appropriate sortedDirection after sort', () => {
//     element.build();

//     element.setAttribute(Object.keys(options)[2], options[2][0]); // sortDirection = asc
//     element.setAttribute(Object.keys(options)[4], options[4][0]); // valueType = string

//     element.setAttribute(Object.keys(options)[2], options[2][1]); // sortDirection = desc
//     element.setAttribute(Object.keys(options)[4], options[4][0]); // valueType = string

//     list = win.document.createElement('ul');

//     for (let i = 0; i < 3; i++) {
//       let listItem = win.document.createElement('li');
//       listItem.text = i;
//       listItem.setAttribute('value', i);
//       list.appendChild(listItem);
//     }

//     element.appendChild();
//     expect(element.querySelector('div').textContent).to.equal('hello world');
//   });

//   // using 4 elements to ensure that no element stays in the same place for both
//   // ascending and descending tests
//     element.setAttribute(Object.keys(options)[2], options[2][2]); // sortDirection = toggle
//     element.setAttribute(Object.keys(options)[4], options[4][0]); // valueType = string

//   beforeEach(() => {
//     win = env.win;
//     element = win.document.createElement('amp-sort');
//     element.setAttribute("id", options.sortBy);
//     win.document.body.appendChild(element);
//   });

//   it('should have hello world when built', () => {
//     element.build();
//     element.setAttribute(options.sortDirection, options.sortBy);
//     expect(element.querySelector('div').textContent).to.equal('hello world');
//   });

// options.sortDirection.forEach((elem) => {

//   elem
// });
