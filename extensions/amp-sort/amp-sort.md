<!--
Copyright 2017 The AMP HTML Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS-IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# <a name="`amp-sort`"></a> `amp-sort`

<table>
  <tr>
    <td class="col-fourty"><strong>Description</strong></td>
    <td>Sorts arbitrary elements.</td>
  </tr>
  <tr>
    <td class="col-fourty"><strong>Availability</strong></td>
    <td>Experimental</td>
  </tr>
  <tr>
    <td class="col-fourty"><strong>Required Script</strong></td>
    <td><code>&lt;script async custom-element="amp-sort" src="https://cdn.ampproject.org/v0/amp-sort-0.1.js">&lt;/script></code></td>
  </tr>
  <tr>
    <td class="col-fourty"><strong><a href="https://www.ampproject.org/docs/guides/responsive/control_layout.html">Supported Layouts</a></strong></td>
    <td>container</td>
  </tr>
  <tr>
    <td width="col-fourty"><strong>Examples</strong></td>
    <td>
      <ul>
        <li>AMP By Example's:
          <ul>
            <li><a href="https://ampbyexample.com/components/amp-sort/">Annotated code example for amp-sort</a></li>
            <li><a href="https://ampbyexample.com/advanced/sortable_tables_with_amp-sort/">Advanced sortable tables with amp-sort</a></li>
            <li><a href="https://ampbyexample.com/advanced/multiple_sort_fields_with_amp-sort/">Multiple sort fields with amp-sort</a></li>
            <li><a href="https://ampbyexample.com/advanced/multiple_sort_fields_with_amp-sort_and_amp-bind/">Multiple sort fields with amp-sort and amp-bind</a></li>
          </ul>
        </li>
        <li>Other example:
          <a href="https://github.com/ampproject/amphtml/blob/master/examples/amp-sort.amp.html">Source</a>,
          <a href="https://cdn.rawgit.com/ampproject/amphtml/master/examples/amp-sort.amp.html">Rendered</a>
        </li>
      </ul>
    </td>
  </tr>
</table>

## Behavior

The `amp-sort` extension enables DOM nodes to be rearranged by comparing values of HTML attributes present on its children nodes.

- It may contain any other HTML or AMP element (including nested `amp-sort`)
- It performs the following actions when `.sort()` is called:
    1. finds all the descendant elements that have the attribute specified by `sort-by`
    1. extracts the value of the attribute for each element and casts to the type specified by `value-type`
    1. sorts the elements using the now-typed value in ascending or descending order based on `sort-direction`
    1. rearranges the elements in the DOM based on the new sort order
    1. adds `sorted`, `aria-sort=<aria-sort value>`, `sort-by=<sort-by value>`, `sort-direction=<sort-direction value>` to the `amp-sort` component to be used to target the sorted items with CSS (e.g. hide/show sorted UI indicators, etc.)
- It works with and without `amp-bind`

#### Example: Sorting a list

In this example, we sort a list, where a button is used to trigger the sorting of its items.

<!-- embedded example - displays in ampproject.org -->
```html
<amp-sort id="priceSorter"
  sort-by="data-price"
  sort-direction="desc"
  value-type="number">
  <button on="tap:priceSorter.sort();">Sort by price - High to Low</button>
  <ul>
    <li data-price="20">Green Hoodie - $20</li>
    <li data-price="30">Red Shirt - $30</li>
    <li data-price="10">Blue T-Shirt - $10</li>
  </ul>
</amp-sort>
```
<div>
<amp-iframe height="89"
            width="200"
            layout="responsive"
            sandbox="allow-scripts"
            src="https://derekcecillewis.github.io/amp-samples/samples/ampsort.basic-list.preview.html">
</amp-iframe>
</div>

#### Example: Sorting a table

In this example, we sort a table, where the table's header is used to trigger the sorting of its rows. Also, we opted to update the sorting icons to reflect the direction of the sort.

<!-- embedded example - displays in ampproject.org -->
```html
<amp-sort id="tableSorter"
          value-type='number'>
  <table summary="Table showing prices">
    <thead>
      <th on="tap:tableSorter.sort(sortBy='data-price', sortDirecion='toggle')"
          aria-sort="ascending"
          class="priceCol">Price</th>
    </thead>
    <tbody>
      <tr data-price="25"><td>$25</td></tr>
      <tr data-price="50"><td>$50</td></tr>
      <tr data-price="75"><td>$75</td></tr>
      <tr data-price="100"><td>$100</td></tr>
    </tbody>
  </table>
</amp-sort>
```
<div>
<amp-iframe height="132"
            width="200"
            layout="responsive"
            sandbox="allow-scripts"
            src="https://derekcecillewis.github.io/amp-samples/samples/ampsort.basic-table.preview.html">
</amp-iframe>
</div>

{% call callout('Tip', type='success') %}
To see more demos of `amp-sort`, visit [AMP By Example](https://ampbyexample.com/components/amp-sort/).
{% endcall %}

## Attributes

**sort-by** (required)

The name of the attribute on descendants which its value is used for sorting comparison.

**value-type**

Specifices the data-type of the values indicated by the `sort-by` attribute. Options include:

- `string`
- `number`

{% call callout('Note', type='note') %}
If `value-type` is not specified, the default value of `string` will be used.
{% endcall %}

**sort-direction** (required)

The direction that elements associated with an interacive region will be sorted once the `sort()` action is triggered. Options include:

- `asc`
- `desc`

{% call callout('Note', type='note') %}
If `sort-direction` is not specified, the sort-direction most commonly associated with the data-type of the values will be used. They are as follow:
- `string` defaults to `asc`
- `number` defaults to `desc`
{% endcall %}

**sorted-direction**

The current sort direction of elements associated with an interacive region. Pre-sorted data may be indicated as such with this attribute. Options include:
- `asc`
- `desc`

**aria-sort**

The current sort direction of elements associated with an interacive region. Pre-sorted data may be indicated as such with this attribute. Options include:
- `ascending`
- `descending`

{% call callout('Note', type='note') %}
`aria-sort` is an accessibility-specific attribute to be used by assistive technologies such as screen readers. If data is not pre-sorted, it may be ommitted as it will be applied once the the `sort()` action is called.
{% endcall %}

## Actions

`sort([sortBy:<attr>], [sortDirection:<dir>], [valueType=<type>])`

Calling the `sort()` action on `amp-sort` will trigger sorting. Optionally, new sorting configurations can be provided to override existing configuration attributes.

## Validation
See [amp-sort rules](https://github.com/ampproject/amphtml/blob/master/extensions/amp-sort/0.1/validator-amp-sort.protoascii) in the AMP validator specification.
