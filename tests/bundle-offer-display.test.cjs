const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../assets/bundle-offer.js'), 'utf8');
function fixture(store) {
  const listeners = {}, changes = {}, cards = [], country = { value: '', addEventListener: (name, callback) => { changes[name] = callback; } };
  const title = { textContent: 'Test product' }, notice = {}, note = {};
  const variants = [{ id: 1, price: 2799, options: ['S/M'] }, { id: 2, price: 2999, options: ['L/XL'] }];
  const input = { get value() { return '2'; }, set value(_) { throw Error('Must not change product form'); } };
  const picker = { currentVariant: variants[1], dataset: { section: 'product' } };
  const context = { querySelector: selector => selector === 'variant-options' ? picker : input };
  const root = { dataset: { store, currency: store === 'US' ? 'USD' : 'AUD', country: 'AU', threshold: '5900', kind: 'tights', initialVariant: '1' }, querySelector(selector) {
    return { '[data-offer-country]': store === 'AU' ? country : null, '[data-offer-notice]': notice, '[data-offer-cards]': { replaceChildren: () => { cards.length = 0; }, append: card => cards.push(card) }, '[data-offer-variants]': { textContent: JSON.stringify(variants) }, '[data-offer-product]': title, '.sbo-note': note }[selector];
  } };
  const sandbox = { document: { readyState: 'complete', documentElement: {}, querySelectorAll: () => [root], addEventListener: (name, callback) => { listeners[name] = callback; }, getElementById: () => ({ querySelector: () => root }), createElement: () => ({ innerHTML: '', querySelector: () => ({ setAttribute() {} }) }) }, MutationObserver: class { observe() {} }, fetch() { throw Error('Must not send requests'); }, subscribe() {}, PUB_SUB_EVENTS: { variantChange: 'variant-change' } };
  vm.runInNewContext(source, sandbox);
  return { cards, country, changes, listeners, notice, context };
}
test('AU renders immediately, NZ changes estimates without writing the product form', () => {
  const f = fixture('AU');
  assert.match(f.cards[0].innerHTML, /A\$65.97/);
  f.country.value = 'NZ'; f.changes.change();
  assert.match(f.cards[0].innerHTML, /A\$68.97/);
  assert.match(f.cards[1].innerHTML, /No extra cost/);
});
test('US renders USD estimates without needing a destination selector', () => {
  const f = fixture('US');
  assert.match(f.cards[0].innerHTML, /US\$62.97/);
  assert.match(f.cards[1].innerHTML, /\+ US\$6</);
});
test('opening reads selected variant; unrelated add clicks are never intercepted', () => {
  const f = fixture('AU');
  const event = { target: { closest: () => ({ dataset: { sizeGuideOpen: 'test' }, closest: () => f.context }) }, preventDefault() { throw Error('Must not intercept'); }, stopPropagation() { throw Error('Must not intercept'); } };
  f.listeners.click(event);
  assert.match(f.cards[0].innerHTML, /A\$59.98/);
  event.target.closest = () => null;
  assert.doesNotThrow(() => f.listeners.click(event));
});
