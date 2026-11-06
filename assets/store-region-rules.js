/* Shared AU/US recommendation rules. No network, tracking or page mutations. */
(function (root) {
  'use strict';
  function intersectsViewport(rect, width, height) {
    return Boolean(rect && Number.isFinite(width) && Number.isFinite(height) &&
      rect.width > 0 && rect.height > 0 && rect.left < width && rect.right > 0 &&
      rect.top < height && rect.bottom > 0);
  }
  function recommendation(country, store) {
    if (!['AU', 'US'].includes(store)) return null;
    if (country === 'AU' || country === 'NZ') {
      return store === 'US' ? { store: 'AU', country } : null;
    }
    return country === 'US' && store === 'AU'
      ? { store: 'US', country: 'US' } : null;
  }
  function beforeAdd(state) {
    if (!state || !state.enabled || !state.secondEnabled || !state.mismatch ||
        !state.storageAvailable || state.explicitChoice || !state.firstDismissed ||
        state.secondSeen || state.pending || state.quickPayment || !state.validForm) return false;
    return true;
  }
  // A source store's product IDs and query parameters must not cross stores.
  function destination(homepage, targetCountry) {
    if (!['AU', 'NZ', 'US'].includes(targetCountry)) return null;
    try {
      const url = new URL(homepage);
      if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
      url.pathname = '/';
      url.search = '';
      url.hash = '';
      url.searchParams.set('country', targetCountry);
      return url.href;
    } catch (_) { return null; }
  }
  const api = Object.freeze({ intersectsViewport, recommendation, beforeAdd, destination });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SofneuRegionRules = api;
})(globalThis);
