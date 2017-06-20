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

import {isExperimentOn} from '../../../src/experiments';
import {Layout} from '../../../src/layout';
import {isLayoutSizeDefined} from '../../../src/layout';
import {user} from '../../../src/log';
import {toArray} from '../../../src/types';

/** @const */
const EXPERIMENT = 'amp-sort';

/** @const */
const TAG = 'amp-sort';

export class AmpSort extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);
    this.prevSortDir_ = null;
  }

  /** @override */
  isLayoutSupported(layout) {
    return isLayoutSizeDefined(layout) || Layout.CONTAINER;
  }

  /** @override */
  buildCallback() {
    AMP.toggleExperiment(EXPERIMENT, true); // for dev
    user().assert(isExperimentOn(this.win, TAG),
        `Experiment ${EXPERIMENT} disabled`);

    this.registerAction('sort', invocation => {
      const args = invocation.args;
      const cellIndex = invocation.source.cellIndex;

      if (args) {
        if (args['sortBy'] !== undefined) {
          this.element.setAttribute('sort-by', args['sortBy']);
        }

        if (args['sortDirecion'] !== undefined) {
          this.element.setAttribute('sort-direction', args['sortDirecion']);
        }

        if (args['valueType'] !== undefined) {
          this.element.setAttribute('value-type', args['valueType']);
        }
      }

      this.sort_(cellIndex);
    });
  }

  /** @override */
  mutatedAttributesCallback(mutations) {
    if (mutations['sort-by'] || mutations['sort-direction']) {
      this.sort_();
    }
  }

  sort_(cellIndex) {
    const sortBy = this.element.getAttribute('sort-by');
    let sortDir = this.element.getAttribute('sort-direction') || 'asc';
    const sortType = this.element.getAttribute('value-type') || 'string';
    if (sortDir == 'toggle') {
      sortDir = this.prevSortDir_ == 'asc' ? 'desc' : 'asc';
    }
    const ariaSort = sortDir == 'asc' ? 'ascending' : 'descending';
    const elements = toArray(this.element.querySelectorAll(`[${sortBy}]`));
    const comparer = this.getComparer_(sortBy, sortDir, sortType);
    const sortedElements = elements.sort(comparer);

    sortedElements.forEach(e => {
      // A11Y: make parent an aria live region if it is not already.
      if (!e.parentNode.hasAttribute('aria-live')) {
        e.parentNode.setAttribute('aria-live', 'polite');
      }
      // A11Y: if element is a TR, find the corresponding TH and set aria-sort
      //       on it.
      if (e.nodeName == 'TR') {
        e.closest('table').querySelector('thead').querySelector('tr')
            .children[cellIndex].setAttribute('aria-sort', ariaSort);
      }
      e.parentNode.appendChild(e);
    });

    this.prevSortDir_ = sortDir;
    // set the following attributes on the parent amp-sort so they can be
    // targeted in CSS
    this.element.setAttribute('sorted', '');
    this.element.setAttribute('sorted-by', sortBy);
    this.element.setAttribute('sorted-direction', sortDir);
  }

  getComparer_(sortBy, sortDir, sortType) {
    return (e1, e2) => {
      if (sortDir == 'desc') {
        // if not ascending swap e1 with e2
        const tmp = e1;
        e1 = e2;
        e2 = tmp;
      }

      const v1 = e1.getAttribute(`${sortBy}`);
      const v2 = e2.getAttribute(`${sortBy}`);

      if (sortType == 'string') {
        return v1.localeCompare(v2);
      }

      if (sortType == 'number') {
        return Number(v1) - Number(v2);
      }
    };
  }
}

AMP.registerElement('amp-sort', AmpSort, CSS);
