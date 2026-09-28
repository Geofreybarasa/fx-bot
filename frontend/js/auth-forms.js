/**
 * auth-forms.js
 * ------------------------------------------------------------------
 * Shared logic for register.html and login.html:
 *   1. Populates country / currency <select> elements from
 *      countries.js (must load before this file).
 *   2. Password show/hide toggle + a simple strength meter (signup only).
 *   3. Client-side required-field validation with inline error text
 *      and aria-invalid — this is a UX nicety, NOT a security boundary.
 *      The backend must re-validate everything (see zod schemas in
 *      backend/src/routes/auth.routes.js) — never trust client checks alone.
 *   4. Submits to the backend and shows a plain-language result.
 *
 * This file does NOT store credentials anywhere itself. A successful
 * sign-in's token handling (where to put it, how long it lives) is a
 * TODO left for whoever wires up the authenticated app shell — see
 * the comment inside handleLoginSubmit().
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  var CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'AED' }
  ];

  function populateCountrySelect(select) {
    if (!select || !window.COUNTRIES) return;
    var countries = window.COUNTRIES.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });

    countries.forEach(function (country) {
      var option = document.createElement('option');
      option.value = country.code;
      option.dataset.dialCode = country.dialCode;
      // Flag glyph computed from the ISO code — see countries.js for
      // the Windows/font caveat noted there.
      option.textContent = window.isoToFlagEmoji(country.code) + '  ' + country.name;
      select.appendChild(option);
    });

    var defaultCode = select.getAttribute('data-default-country');
    if (defaultCode) select.value = defaultCode;
  }

  function populateCurrencySelect(select) {
    if (!select) return;
    CURRENCIES.forEach(function (currency) {
      var option = document.createElement('option');
      option.value = currency.code;
      option.textContent = currency.code + ' — ' + currency.name + ' (' + currency.symbol + ')';
      select.appendChild(option);
    });
    var defaultCode = select.getAttribute('data-default-currency');
    if (defaultCode) select.value = defaultCode;
  }

  function setUpPasswordToggle(button) {
    var targetId = button.getAttribute('data-toggle-password');
    var input = targetId && document.getElementById(targetId);
    if (!input) return;

    button.addEventListener('click', function () {
      var isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      button.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      button.classList.toggle('is-visible', isHidden);
    });
  }

  /** Simple, transparent heuristic — not a substitute for real breach-checking server-side. */
  function scorePassword(value) {
    var score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(score, 4);
  }

  function setUpPasswordStrength(input) {
    var meterId = input.getAttribute('data-strength-meter');
    var meter = meterId && document.getElementById(meterId);
    if (!meter) return;
    var segments = meter.querySelectorAll('.password-strength__segment');

    input.addEventListener('input', function () {
      var score = scorePassword(input.value);
      segments.forEach(function (segment, index) {
        segment.classList.toggle('is-filled', index < score);
        segment.classList.remove('is-weak', 'is-medium', 'is-strong');
        if (index < score) {
          segment.classList.add(score <= 1 ? 'is-weak' : score <= 2 ? 'is-medium' : 'is-strong');
        }
      });
    });
  }

  function setFieldError(field, message) {
    var errorEl = field.parentElement.querySelector('.field-error');
    field.classList.toggle('has-error', !!message);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (errorEl) errorEl.textContent = message || '';
  }

  /**
   * Validates every [required] field inside a form. Returns true if
   * valid. Focuses and reports the first invalid field otherwise.
   * Client-side only — see file header re: backend re-validation.
   */
  function validateForm(form) {
    var firstInvalid = null;
    var fields = form.querySelectorAll('[required]');

    fields.forEach(function (field) {
      var value = field.type === 'checkbox' ? field.checked : field.value.trim();
      var isValid = !!value;

      if (isValid && field.type === 'email') {
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }
      if (isValid && field.type === 'password') {
        isValid = value.length >= 8;
      }

      var message = '';
      if (!isValid) {
        message = field.type === 'checkbox'
          ? 'You need to accept this to continue.'
          : field.type === 'email'
          ? 'Enter a valid email address.'
          : field.type === 'password'
          ? 'Password must be at least 8 characters.'
          : 'This field is required.';
        if (!firstInvalid) firstInvalid = field;
      }

      // Checkboxes get their error rendered by the caller's own markup
      // (a shared line under the terms block), not per-field here.
      if (field.type !== 'checkbox') setFieldError(field, message);
    });

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  function setFormStatus(form, message, isError) {
    var statusEl = form.querySelector('[data-form-status]');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.toggle('is-error', !!isError);
    statusEl.classList.toggle('is-success', !isError && !!message);
  }

  async function postJson(path, body) {
    var config = window.APP_CONFIG || {};
    if (!config.API_BASE_URL) {
      throw Object.assign(new Error('Backend not configured yet (API_BASE_URL is null in js/config.js).'), { devOnly: true });
    }
    var response = await fetch(config.API_BASE_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error((payload.error && payload.error.message) || 'Something went wrong. Please try again.');
    }
    return payload;
  }

  function handleRegisterSubmit(form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var termsCheckbox = form.querySelector('#acceptTerms');
      if (!validateForm(form)) return;
      if (termsCheckbox && !termsCheckbox.checked) {
        setFormStatus(form, 'Please accept the Client Terms, Privacy Notice and Risk Disclosure to continue.', true);
        return;
      }

      var submitButton = form.querySelector('[type="submit"]');
      var originalLabel = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Creating your account…';
      setFormStatus(form, '', false);

      try {
        var countrySelect = form.querySelector('#countryOfResidence');
        await postJson('/auth/sign-up', {
          fullName: form.fullName.value.trim(),
          email: form.email.value.trim(),
          password: form.password.value,
          countryCode: countrySelect.value,
          currency: form.accountCurrency.value,
          referralCode: form.referralCode.value.trim() || null
          // NOTE: acceptedTerms is enforced client-side above and
          // should ALSO be required server-side — never trust the
          // client alone on a compliance-relevant checkbox.
        });

        // TODO: real flow is almost certainly "check your email to
        // confirm your address" rather than an immediate redirect —
        // backend team, wire the actual post-signup destination here
        // once email confirmation exists (see docs/INTEGRATION.md).
        setFormStatus(form, 'Account created. Check your email to confirm your address.', false);
      } catch (err) {
        setFormStatus(form, err.devOnly ? err.message : err.message, true);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    });
  }

  function handleLoginSubmit(form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!validateForm(form)) return;

      var submitButton = form.querySelector('[type="submit"]');
      var originalLabel = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Signing in…';
      setFormStatus(form, '', false);

      try {
        var result = await postJson('/auth/sign-in', {
          email: form.email.value.trim(),
          password: form.password.value
        });

        // TODO: decide where the session token lives (httpOnly cookie
        // set by the backend is the safer default vs. anything
        // JS-readable like localStorage) and where to redirect after
        // sign-in (likely a redirect= query param, same pattern as
        // the Markets page price rows already use). Nothing is stored
        // here on purpose — see file header.
        setFormStatus(form, 'Signed in. Redirecting…', false);
        void result;
      } catch (err) {
        setFormStatus(form, err.message, true);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-countries]').forEach(populateCountrySelect);
    document.querySelectorAll('[data-currencies]').forEach(populateCurrencySelect);
    document.querySelectorAll('[data-toggle-password]').forEach(setUpPasswordToggle);
    document.querySelectorAll('[data-strength-meter]').forEach(setUpPasswordStrength);

    var registerForm = document.querySelector('[data-form="register"]');
    if (registerForm) handleRegisterSubmit(registerForm);

    var loginForm = document.querySelector('[data-form="login"]');
    if (loginForm) handleLoginSubmit(loginForm);

    // Clear a field's error state as soon as the person fixes it,
    // rather than making them re-submit to find out it's now valid.
    document.querySelectorAll('input[required], select[required]').forEach(function (field) {
      field.addEventListener('input', function () { setFieldError(field, ''); });
      field.addEventListener('change', function () { setFieldError(field, ''); });
    });
  });
})();