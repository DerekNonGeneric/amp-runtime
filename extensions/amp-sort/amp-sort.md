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
    1. adds `sorted`, `sort-by=<sort-by value>`, `sorted-direction=<sort-direction value>`, if it is a table, the `aria-sort=<aria-sort value>` to the `amp-sort` component to be used to target the sorted items with CSS (e.g. hide/show sorted UI indicators, etc.)
- It works with and without `amp-bind`

#### Example: Sorting a list

In this example, we sort a list, where a button is used to trigger the sorting of its items.

<!-- embedded example - displays in ampproject.org -->
<div>
<amp-iframe height="304"
            layout="fixed-height"
            sandbox="allow-same-origin allow-scripts allow-forms"
            resizable
            src="https://dereklewis.github.io/amp-samples/samples/ampsort.basic-list.embed.html">
  <div overflow tabindex="0" role="button" aria-label="Show more">Show full code</div>
  <div placeholder></div> 
</amp-iframe>
</div>

#### Example: Sorting a table

In this example, we sort a table, where the table's header is used to trigger the sorting of its rows. Also, we opted to update the sorting icons to reflect the direction of the sort.

<!-- embedded example - displays in ampproject.org -->
<div>
<amp-iframe height="646"
            layout="fixed-height"
            sandbox="allow-same-origin allow-scripts allow-forms"
            resizable
            src="https://dereklewis.github.io/amp-samples/samples/ampsort.basic-table.embed.html">
  <div overflow tabindex="0" role="button" aria-label="Show more">Show full code</div>
  <div placeholder></div> 
</amp-iframe>
</div>

{% call callout('Tip', type='success') %}
To see more demos of `amp-sort`, visit [AMP By Example](https://ampbyexample.com/components/amp-sort/).
{% endcall %}

## Attributes

**sort-by** (required)

The name of the sortable descendant elements' attribute whose `value` attribute will be used for sorting comparison.

**value-type**

Specifices the data-type of the values indicated by the `sort-by` attribute. Options include:
- `string`
- `number`

{% call callout('Note', type='note') %}
If `value-type` is not specified, the default value of `string` will be used.
{% endcall %}

**sort-direction**

The direction that descendant elements associated with a `sort-by` value will be sorted in once the `sort()` action is triggered. The possible values are:
- `toggle`: opposite of current `sorted-direction`
- `asc`: ascending
- `desc`: descending

`toggle` may be used in conjunction with `asc` or `desc` to specify the direction that descendant elements associated with a `sort-by` value will be sorted in the *first time* the `sort()` action is triggered while still maintaining the behavior of `toggle` each subsequent time the `sort()` action is triggered. This is useful for cases in which the data is *not* pre-sorted, hence the opposite direction of the current `sorted-direction` cannot be used to infer the behavior of `toggle`, and the default sort-direction most commonly associated with the data-type specified by `value-type` is not desired. The possible values are:
- `toggle|asc`: opposite of current `sorted-direction` or ascending if it's the first time the `sort()` action has been triggered
- `toggle|desc`: opposite of current `sorted-direction` or descending if it's first time the `sort()` action has been triggered

{% call callout('Note', type='note') %}
If `sort-direction` is not specified, the default sort-direction most commonly associated with data-type specified by `value-type` will be used. By using `toggle` on its own, the default sort-direction will be used the *first time* the `sort()` action is triggered. They are as follow:
- `string` defaults to `asc`
- `number` defaults to `desc`
{% endcall %}

**sorted-direction**

The current sort direction of descendant elements associated with a `sort-by` value. Pre-sorted data may be indicated as such with this attribute. The possible values are:
- `asc`: ascending
- `desc`: descending

**aria-sort**

The current sort direction of table cells associated with a table header's `sort-by` value. Pre-sorted table cells may be indicated as such with this attribute. The possible values are:
- `ascending`
- `descending`

{% call callout('Note', type='note') %}
`aria-sort` is an accessibility-specific attribute applied to sorted tables intended for use by assistive technologies such as screen readers. If table cells are not pre-sorted, it should be ommitted as it will be applied with the correct sort-direction once the the `sort()` action is triggered.
{% endcall %}

{% call callout('Learn more', type='read') %}
Read the [W3C Recommendation](https://www.w3.org/TR/wai-aria/states_and_properties#aria-sort) to learn more about how to properly implement `aria-sort`.
{% endcall %}

## Actions

`sort([sortBy:<attr>], [sortDirection:<dir>], [sortedDirecion:<dir>], [valueType=<type>])`

Calling the `sort()` action on `amp-sort` will trigger sorting. Optionally, new sorting configurations can be provided to override existing configuration attributes.

## Validation
See [amp-sort rules](https://github.com/ampproject/amphtml/blob/master/extensions/amp-sort/0.1/validator-amp-sort.protoascii) in the AMP validator specification.
