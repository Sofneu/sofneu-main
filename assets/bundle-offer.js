(function (global) {
  'use strict';
  function quantityUnit(kind, variant) {
    const pack = (variant?.options || []).map(value => String(value).match(/^(\d+)\s*pairs?$/i)).find(Boolean);
    const pairs = pack ? Number(pack[1]) : 1;
    if (pairs > 1) return { plural: 'sets', singular: 'set', detail: pairs + ' pairs per set' };
    return kind === 'tights' ? { plural: 'pairs', singular: 'pair', detail: '' } : { plural: 'items', singular: 'item', detail: '' };
  }
  function calculate(price, rule) {
    if (!Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(rule.shipping) || !Number.isSafeInteger(rule.freeAt) || rule.shipping < 0 || rule.freeAt < 0) throw new Error('Invalid offer inputs');
    let previous = null;
    return [2, 3, 4].map(quantity => {
      const discount = Math.min(price * quantity, quantity === 4 ? 3000 : quantity === 3 ? 1500 : 0);
      const subtotal = price * quantity - discount;
      const shipping = subtotal >= rule.freeAt ? 0 : rule.shipping;
      const total = subtotal + shipping;
      const row = { quantity, subtotal, shipping, discount, total, difference: previous == null ? null : total - previous, average: Math.round(total / quantity) };
      previous = total;
      return row;
    });
  }
  if (typeof module === 'object' && module.exports) { module.exports = { calculate, quantityUnit }; return; }
  if (global.__sofneuOfferBound) return;
  global.__sofneuOfferBound = true;
  const states = new WeakMap();
  function render(root) {
    const state = states.get(root);
    const store = root.dataset.store;
    const country = store === 'US' ? 'US' : root.querySelector('[data-offer-country]')?.value === 'NZ' ? 'NZ' : 'AU';
    const money = cents => (store === 'US' ? 'US$' : 'A$') + (cents / 100).toFixed(2).replace(/\.00$/, '');
    const notice = root.querySelector('[data-offer-notice]');
    const cards = root.querySelector('[data-offer-cards]');
    cards.replaceChildren();
    notice.hidden = false;
    if (!((store === 'AU' && root.dataset.currency === 'AUD') || (store === 'US' && root.dataset.currency === 'USD'))) { notice.textContent = 'Offer estimates are unavailable for this currency.'; return; }
    if (!state?.variant || !Number.isSafeInteger(Number(state.variant.price))) { notice.textContent = 'Select an available product option to see this offer.'; return; }
    const freeAt = Number(root.dataset.threshold);
    if (!Number.isSafeInteger(freeAt) || freeAt <= 0) { notice.textContent = 'Delivery estimate is currently unavailable.'; return; }
    const rows = calculate(Number(state.variant.price), { freeAt, shipping: country === 'US' ? 699 : country === 'NZ' ? 1299 : 999 });
    const quantity = quantityUnit(root.dataset.kind, state.variant);
    const unit = quantity.plural;
    root.querySelector('[data-offer-product]').textContent = state.title + (quantity.detail ? ' · ' + quantity.detail : '');
    rows.forEach((row, i) => {
      const card = document.createElement('div'); card.className = 'sbo-tier' + (i === 2 ? ' best' : '');
      const badge = i === 2 ? 'BEST PICK · BEST VALUE' : row.shipping === 0 ? 'FREE DELIVERY' : '';
      const delta = row.difference == null ? money(row.total) : row.difference > 0 ? '+ ' + money(row.difference) : row.difference === 0 ? 'No extra cost' : money(-row.difference) + ' less';
      const icons = Array.from({ length: row.quantity }, (_, index) => '<span class="sbo-item' + (index === row.quantity - 1 && i ? ' extra' : '') + '"></span>').join('');
      card.innerHTML = (badge ? '<span class="sbo-badge">' + badge + '</span>' : '') + '<div class="sbo-grid"><div class="sbo-art" aria-hidden="true">' + icons + '</div><div class="sbo-qty">' + row.quantity + ' ' + unit + '</div><div class="sbo-difference">' + delta + '</div><div class="sbo-shipping">' + (row.shipping === 0 ? 'FREE delivery' : money(row.shipping) + ' delivery included') + '</div></div>' + (i === 2 ? '<div class="sbo-average">Only <strong>' + money(row.average) + '</strong> per ' + quantity.singular + '</div>' : '') + (i ? '<div class="sbo-total"><span>You pay in total</span><strong>' + money(row.total) + '</strong></div>' : '');
      if (i) card.querySelector('.sbo-difference').setAttribute('aria-label', (row.difference > 0 ? 'Pay ' + money(row.difference) + ' more' : row.difference === 0 ? 'No extra cost' : 'Pay ' + money(-row.difference) + ' less') + ' compared with ' + (row.quantity - 1) + ' ' + unit);
      cards.append(card);
    });
    root.querySelector('.sbo-note').textContent = (country === 'US' ? 'United States' : country === 'NZ' ? 'New Zealand' : 'Australia') + ' standard delivery estimate. Totals before new-customer discount. Free standard delivery on ' + money(freeAt) + '+ after all discounts.';
    notice.hidden = true;
  }
  function init(root) {
    if (states.has(root)) return;
    let variants;
    try { variants = JSON.parse(root.querySelector('[data-offer-variants]').textContent); } catch (_) { return; }
    const variant = variants.find(v => String(v.id) === root.dataset.initialVariant);
    states.set(root, { variants, variant, context: null, title: root.querySelector('[data-offer-product]').textContent });
    const country = root.querySelector('[data-offer-country]');
    if (country) {
      country.value = root.dataset.country === 'NZ' ? 'NZ' : 'AU';
      country.addEventListener('change', () => render(root));
    }
    render(root);
  }
  function scan() { document.querySelectorAll('[data-bundle-offer]').forEach(init); }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-size-guide-open]');
    if (!button) return;
    const dialog = document.getElementById('SizeGuideDialog-' + button.dataset.sizeGuideOpen);
    const root = dialog?.querySelector('[data-bundle-offer]');
    if (!root) return;
    init(root);
    const state = states.get(root);
    if (!state) return;
    state.context = button.closest('[data-section-id]');
    const picker = state.context?.querySelector('variant-options');
    const input = state.context?.querySelector('form[action*="/cart/add"] [name="id"]');
    const selectedId = picker?.currentVariant?.id || input?.value;
    state.variant = state.variants.find(v => String(v.id) === String(selectedId)) || null;
    render(root);
  }, true);
  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') subscribe(PUB_SUB_EVENTS.variantChange, event => {
    document.querySelectorAll('[data-bundle-offer]').forEach(root => {
      const state = states.get(root);
      if (!state?.context) return;
      const section = state.context.querySelector('variant-options')?.dataset.section;
      if (String(event.data.sectionId) !== String(section)) return;
      state.variant = state.variants.find(v => String(v.id) === String(event.data.variant?.id)) || null;
      render(root);
    });
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, { once: true }); else scan();
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.matches('[data-bundle-offer]')) init(node);
      node.querySelectorAll('[data-bundle-offer]').forEach(init);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });
})(typeof globalThis === 'object' ? globalThis : this);
