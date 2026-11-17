const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, quantityUnit } = require('../assets/bundle-offer.js');
const au = { shipping: 999, freeAt: 5900 };
test('27.99 AU: delivered totals and marginal prices', () => {
  const rows = calculate(2799, au);
  assert.deepEqual(rows.map(r => r.total), [6597, 6897, 8196]);
  assert.deepEqual(rows.map(r => r.difference), [null, 300, 1299]);
  assert.equal(rows[2].average, 2049);
});
test('NZ has its own delivery cost; third item can cost no extra', () => {
  const rows = calculate(2799, { shipping: 1299, freeAt: 5900 });
  assert.deepEqual(rows.map(r => r.total), [6897, 6897, 8196]);
  assert.equal(rows[1].difference, 0);
});
test('24.99: calculate real price, no unconfirmed newcomer discount', () => {
  const rows = calculate(2499, au);
  assert.deepEqual(rows.map(r => r.total), [5997, 5997, 6996]);
  assert.deepEqual(rows.map(r => r.discount), [0, 1500, 3000]);
});
test('higher prices: two items may already qualify for free shipping', () => {
  assert.deepEqual(calculate(2999, au).map(r => r.total), [5998, 7497, 8996]);
});
test('threshold uses discounted merchandise, not pre-discount subtotal or delivery', () => {
  assert.equal(calculate(2400, au)[1].shipping, 999);
  assert.equal(calculate(2950, au)[0].shipping, 0);
});
test('low prices clamp the discount and allow a negative marginal total', () => {
  const rows = calculate(1000, au);
  assert.equal(rows[1].difference, -500);
  assert.equal(calculate(100, au)[2].subtotal, 0);
});
test('invalid money inputs are rejected', () => {
  for (const price of [-1, NaN, 2799.5]) assert.throws(() => calculate(price, au));
  assert.throws(() => calculate(2799, { shipping: -1, freeAt: 5900 }));
});

test('multipair variants are counted as sets, not physical pairs', () => {
  assert.deepEqual(quantityUnit('covers', { options: ['Honey', '8cm (AA-A)', '2 Pairs'] }), { plural: 'sets', singular: 'set', detail: '2 pairs per set' });
  assert.equal(quantityUnit('tights', { options: ['S/M'] }).singular, 'pair');
  assert.equal(quantityUnit('bra', { options: ['A'] }).singular, 'item');
});

test('US standard delivery is 6.99; no AU or NZ shipping rate', () => {
  const rows = calculate(2799, { shipping: 699, freeAt: 5900 });
  assert.deepEqual(rows.map(r => r.total), [6297, 6897, 8196]);
  assert.deepEqual(rows.map(r => r.difference), [null, 600, 1299]);
});
