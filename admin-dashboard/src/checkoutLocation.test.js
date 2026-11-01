import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ChevronDown } from 'lucide-react'
import { transformWithOxc } from 'vite'

// Render the actual checkout dropdown source without loading storefront images or APIs.
const source = await readFile(new URL('./pages/UserOrdering.jsx', import.meta.url), 'utf8')
const helper = source.match(/function normalizeLocationText\(value\) \{[\s\S]*?\n\}/)?.[0] ?? ''
const dropdown = source.slice(source.indexOf('function SearchableLocationDropdown('), source.indexOf('async function fetchCustomerOrders('))
const { code } = await transformWithOxc(
  `const { useState, useEffect, useMemo } = React;\n${helper}\n${dropdown}`,
  'checkout-location.jsx',
  { jsx: { runtime: 'classic' } },
)
const LocationDropdown = new Function('React', 'ChevronDown', `${code}; return SearchableLocationDropdown`)(React, ChevronDown)

test('Buy It Now checkout renders empty state and district dropdowns without crashing', () => {
  const html = renderToStaticMarkup(React.createElement(LocationDropdown, {
    value: '', options: ['Tamil Nadu', 'Karnataka'], placeholder: 'State', onChange() {},
  }))
  assert.match(html, /placeholder="State"/)
  assert.match(html, /<input/)
})

test('checkout renders a saved location and filters its options without crashing', () => {
  const html = renderToStaticMarkup(React.createElement(LocationDropdown, {
    value: 'Chennai', options: ['Chennai', 'Coimbatore'], placeholder: 'District', onChange() {},
  }))
  assert.match(html, /value="Chennai"/)
})
