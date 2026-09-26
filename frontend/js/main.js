/**
 * main.js
 * ------------------------------------------------------------------
 * Small, framework-free glue for the landing page:
 *   1. A single delegated click handler for every [data-action] element
 *      (buttons/links), so the backend/product team has ONE place to
 *      wire up real navigation, auth, and analytics.
 *   2. A couple of harmless progressive enhancements (current year).
 *
 * This file intentionally does NOT:
 *   - store or read any user/session/auth data
 *   - talk to any API
 *   - decide what happens after sign-in / account creation
 * Those decisions belong server-side. See docs/INTEGRATION.md.
 * ------------------------------------------------------------------
 */

(function () {
  'use strict';

  document.querySelectorAll('[data-current-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /**
   * Applies branding from window.APP_CONFIG (js/config.js) to every
   * element carrying a data-brand-* hook. This is the ONLY place brand
   * text gets written into the DOM — so renaming the product later is
   * a one-line edit in config.js, not a find-and-replace across HTML.
   */
  (function applyBranding() {
    var config = window.APP_CONFIG || {};
    var name = config.BRAND_NAME || 'FX Bot';
    var mark = config.BRAND_MARK || 'FX';
    var est = config.BRAND_ESTABLISHED || '';

    document.querySelectorAll('[data-brand-name]').forEach(function (el) { el.textContent = name; });
    document.querySelectorAll('[data-brand-mark]').forEach(function (el) { el.textContent = mark; });
    document.querySelectorAll('[data-brand-est]').forEach(function (el) { el.textContent = est; });
    document.querySelectorAll('[data-brand-label]').forEach(function (el) { el.setAttribute('aria-label', name + ' home'); });

    if (document.title.indexOf('—') > -1) {
      document.title = name + document.title.slice(document.title.indexOf('—'));
    }
  })();

  /**
   * ACTION_HANDLERS maps a data-action value to a function.
   * Anchor tags already carry a correct `href` fallback (so the page
   * degrades gracefully with JS disabled or before routes exist);
   * handlers here are for behaviour beyond a plain navigation, e.g.
   * opening an auth modal instead of a full page navigation.
   *
   * BACKEND / FRONTEND-APP TEAM: replace the bodies below once the
   * authenticated app and routing exist. Keep the keys stable —
   * they're also used for analytics event names if you want them to be.
   */
  var ACTION_HANDLERS = {
    'auth:sign-in': function (event) {
      // TODO: open real sign-in (modal or route to /login).
      // Left as a normal navigation for now: does nothing special.
    }
    // Add overrides here only when a data-action needs more than
    // "follow the href", e.g.:
    // 'account:open': function (event) { event.preventDefault(); openKycModal(); }
  };

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-action]');
    if (!trigger) return;

    var action = trigger.getAttribute('data-action');
    var handler = ACTION_HANDLERS[action];

    // Fire an analytics-friendly custom event regardless of handler,
    // so the backend/analytics team can listen without touching this file.
    document.dispatchEvent(new CustomEvent('landing:action', {
      detail: { action: action, href: trigger.getAttribute('href') || null }
    }));

    if (typeof handler === 'function') {
      handler(event);
    }
    // Otherwise: let the browser follow the element's normal href.
  });
})();
