/**
 * feedback.js
 * ------------------------------------------------------------------
 * Powers the "Send your feedback" modal (<dialog id="feedbackDialog">
 * on index.html). Any element with data-action="feedback:open" opens it.
 *
 * Submits POST {API_BASE_URL}/feedback with:
 *   { rating: 1-5, message: string, name: string|null, country: string|null }
 * Backend: backend/src/routes/feedback.routes.js (validates independently —
 * the checks here are UX only, never a security boundary).
 *
 * Spam handling on this side: a hidden honeypot field. If a bot fills it,
 * we pretend it worked and send nothing. Real protection (rate limiting)
 * lives on the backend.
 *
 * Feedback is private ("not posted publicly" per the UI copy). Nothing here
 * or on the backend should ever publish it to the homepage reviews section
 * without a human review and the author's consent.
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  var MIN_MESSAGE = 5;
  var MAX_MESSAGE = 2000;

  var dialog = document.getElementById('feedbackDialog');
  if (!dialog) return;

  var form = dialog.querySelector('[data-form="feedback"]');
  var success = dialog.querySelector('[data-feedback-success]');
  var ratingGroup = dialog.querySelector('[data-rating]');
  var stars = Array.prototype.slice.call(ratingGroup.querySelectorAll('.rating__star'));
  var messageEl = form.querySelector('[name="message"]');
  var nameEl = form.querySelector('[name="name"]');
  var countryEl = form.querySelector('[name="country"]');
  var honeypotEl = form.querySelector('[name="website"]');
  var counterEl = dialog.querySelector('[data-feedback-count]');
  var statusEl = form.querySelector('[data-form-status]');
  var submitButton = form.querySelector('[type="submit"]');
  var submitting = false;
  var pointerStartedOnBackdrop = false;

  /* ---------- helpers ---------- */

  function selectedRating() {
    var checked = form.querySelector('input[name="rating"]:checked');
    return checked ? Number(checked.value) : 0;
  }

  function paintStars(count) {
    stars.forEach(function (star, index) {
      star.classList.toggle('is-active', index < count);
    });
  }

  function setError(field, message) {
    var errorEl = form.querySelector('[data-error-for="' + field + '"]');
    if (errorEl) errorEl.textContent = message || '';
    if (field === 'message') messageEl.classList.toggle('has-error', !!message);
  }

  function setStatus(message, isError) {
    statusEl.textContent = message || '';
    statusEl.classList.toggle('is-error', !!isError);
  }

  function updateCounter() {
    if (counterEl) counterEl.textContent = String(messageEl.value.length);
  }

  function resetForm() {
    form.reset();
    paintStars(0);
    updateCounter();
    setError('rating', '');
    setError('message', '');
    setStatus('', false);
    form.hidden = false;
    success.hidden = true;
  }

  /* ---------- open / close ---------- */

  function openDialog() {
    resetForm();
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', ''); // very old browsers: shown, just not modal
    }
    document.body.classList.add('has-modal');
  }

  function closeDialog() {
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      document.body.classList.remove('has-modal');
    }
  }

  // Fires for every way of closing (X button, Esc key, backdrop, success button).
  dialog.addEventListener('close', function () {
    document.body.classList.remove('has-modal');
  });

  document.addEventListener('click', function (event) {
    var opener = event.target.closest('[data-action="feedback:open"]');
    if (opener) {
      event.preventDefault();
      openDialog();
    }
  });

  dialog.querySelectorAll('[data-feedback-close]').forEach(function (button) {
    button.addEventListener('click', closeDialog);
  });

  // Backdrop click closes — but only if the press STARTED on the backdrop
  // (otherwise selecting text in the textarea and releasing outside would
  // close it), and never while there's unsent text (don't lose someone's typing).
  dialog.addEventListener('pointerdown', function (event) {
    pointerStartedOnBackdrop = event.target === dialog;
  });
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog && pointerStartedOnBackdrop && !messageEl.value.trim()) {
      closeDialog();
    }
  });

  /* ---------- star rating ---------- */

  stars.forEach(function (star, index) {
    star.addEventListener('mouseenter', function () { paintStars(index + 1); });
  });
  ratingGroup.addEventListener('mouseleave', function () { paintStars(selectedRating()); });
  form.addEventListener('change', function (event) {
    if (event.target.name === 'rating') {
      paintStars(selectedRating());
      setError('rating', '');
    }
  });

  messageEl.addEventListener('input', function () {
    updateCounter();
    if (messageEl.value.trim().length >= MIN_MESSAGE) setError('message', '');
  });

  /* ---------- validation + submit ---------- */

  function validate() {
    var firstInvalid = null;
    var message = messageEl.value.trim();

    if (!selectedRating()) {
      setError('rating', 'Please choose a star rating.');
      firstInvalid = ratingGroup.querySelector('input');
    }
    if (message.length < MIN_MESSAGE) {
      setError('message', message.length
        ? 'Please write at least ' + MIN_MESSAGE + ' characters.'
        : 'Please tell us about your experience.');
      if (!firstInvalid) firstInvalid = messageEl;
    }

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  async function postFeedback(payload) {
    var config = window.APP_CONFIG || {};
    if (!config.API_BASE_URL) {
      throw new Error('Backend not configured yet (API_BASE_URL is null in js/config.js).');
    }

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var response = await fetch(config.API_BASE_URL + '/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      var body = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        throw new Error((body.error && body.error.message) || 'Something went wrong. Please try again.');
      }
      return body;
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('That took too long. Please try again.');
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  function showSuccess() {
    form.hidden = true;
    success.hidden = false;
    success.focus(); // announce the confirmation to screen readers
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (submitting) return;
    setStatus('', false);
    if (!validate()) return;

    // Honeypot: real people never see this field. Pretend success, send nothing.
    if (honeypotEl && honeypotEl.value) {
      showSuccess();
      return;
    }

    submitting = true;
    var originalLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending…';

    try {
      await postFeedback({
        rating: selectedRating(),
        message: messageEl.value.trim().slice(0, MAX_MESSAGE),
        name: nameEl.value.trim() || null,
        country: countryEl.value.trim() || null
      });
      showSuccess();
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      submitting = false;
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });
})();