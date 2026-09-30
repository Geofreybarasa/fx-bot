/**
 * webinars.js
 * ------------------------------------------------------------------
 * Fills the Webinar page from:
 *   GET {API_BASE_URL}/webinars
 * Expected response (see backend/src/controllers/webinars.controller.js):
 *   {
 *     "data": {
 *       "upcoming": [ Session, ... ],
 *       "replays":  [ Session, ... ]
 *     }
 *   }
 *   Session = { id, title, description, host, startsAt, endsAt, durationMinutes }
 *   (startsAt / endsAt are ISO 8601 UTC strings)
 *
 * Three outcomes:
 *   - API not configured, or zero sessions -> the "No sessions scheduled" card
 *     already in webinars.html (that's the true state today).
 *   - Sessions returned -> "Upcoming sessions" / "On-demand replays" cards.
 *   - Request failed -> an error card with a retry button (deliberately NOT
 *     the empty state: "we couldn't check" and "there's nothing" are different).
 *
 * Security: every value from the API is written with textContent, never
 * innerHTML, so a title like "<img onerror=...>" shows as harmless text.
 * The only link built here is login.html?redirect=/webinars/{id}, with the
 * id URL-encoded. No join/replay URLs are ever taken from this public API.
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  var page = document.querySelector('.webinars-page');
  var content = document.querySelector('[data-webinar-content]');
  var emptyCard = content && content.querySelector('[data-webinar-empty]');
  if (!page || !content || !emptyCard) return;

  // Everything rendered by this file lives in one wrapper so re-renders
  // (e.g. "Try again") can wipe it without touching the static empty card.
  var dynamic = document.createElement('div');
  content.appendChild(dynamic);

  var whenFormat = null;
  try {
    // Shown in the VISITOR's own timezone (this audience is worldwide),
    // with the zone name so "18:00" is never ambiguous.
    whenFormat = new Intl.DateTimeFormat(undefined, {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    });
  } catch (err) { /* very old browser: falls back to UTC text below */ }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatWhen(date) {
    if (isNaN(date.getTime())) return '';
    return whenFormat ? whenFormat.format(date) : date.toUTCString();
  }

  function clearDynamic() { dynamic.textContent = ''; }

  function showEmpty() {
    clearDynamic();
    emptyCard.hidden = false;
    page.removeAttribute('data-loading');
  }

  function showError() {
    clearDynamic();
    emptyCard.hidden = true;

    var card = emptyCard.cloneNode(true);
    card.hidden = false;
    card.removeAttribute('data-webinar-empty');
    card.querySelector('[data-webinar-title]').textContent = 'Couldn\u2019t load sessions';
    card.querySelector('[data-webinar-text]').textContent = 'Please check your connection and try again.';

    var retry = el('button', 'btn btn--primary btn--pill', 'Try again');
    retry.type = 'button';
    retry.addEventListener('click', load);
    card.querySelector('[data-webinar-cta]').replaceWith(retry);

    dynamic.appendChild(card);
    page.removeAttribute('data-loading');
  }

  function buildCard(session, kind, now) {
    var start = new Date(session.startsAt);
    var end = new Date(session.endsAt);
    var isLive = kind === 'upcoming' && now >= start && now <= end;

    var card = el('article', 'session-card');
    card.setAttribute('data-session-id', String(session.id));

    var meta = el('div', 'session-card__meta');
    var badgeKind = isLive ? 'live' : kind === 'replay' ? 'replay' : 'upcoming';
    meta.appendChild(el('span', 'session-badge session-badge--' + badgeKind,
      isLive ? 'Live now' : kind === 'replay' ? 'Replay' : 'Upcoming'));

    var when = el('time', 'session-card__when', formatWhen(start));
    if (!isNaN(start.getTime())) when.setAttribute('datetime', start.toISOString());
    meta.appendChild(when);
    card.appendChild(meta);

    card.appendChild(el('h3', 'session-card__title', String(session.title || 'Untitled session')));
    if (session.description) card.appendChild(el('p', 'session-card__desc', String(session.description)));

    var hostBits = [];
    if (session.host) hostBits.push('Hosted by ' + session.host);
    if (Number(session.durationMinutes) > 0) hostBits.push(Number(session.durationMinutes) + ' min');
    if (hostBits.length) card.appendChild(el('p', 'session-card__host', hostBits.join(' \u00b7 ')));

    // Visitors are signed out on this page, so every action goes through
    // login first and then lands on the session inside the logged-in app.
    // TODO (when the app shell exists): if a session cookie is present, link
    // straight to /webinars/{id} instead of via login.
    var cta = el('a', 'btn btn--primary btn--pill',
      isLive ? 'Join now' : kind === 'replay' ? 'Watch replay' : 'Register');
    cta.href = 'login.html?redirect=' + encodeURIComponent('/webinars/' + session.id);
    cta.setAttribute('data-action', 'webinar:open');
    card.appendChild(cta);

    return card;
  }

  function buildSection(title, sessions, kind, now) {
    var section = el('section', 'webinar-section');
    section.appendChild(el('h2', 'webinar-section__title', title));
    var list = el('div', 'session-list');
    sessions.forEach(function (session) { list.appendChild(buildCard(session, kind, now)); });
    section.appendChild(list);
    return section;
  }

  function render(upcoming, replays) {
    clearDynamic();
    emptyCard.hidden = true;
    var now = new Date();
    if (upcoming.length) dynamic.appendChild(buildSection('Upcoming sessions', upcoming, 'upcoming', now));
    if (replays.length) dynamic.appendChild(buildSection('On-demand replays', replays, 'replay', now));
    page.removeAttribute('data-loading');
  }

  async function load() {
    var config = window.APP_CONFIG || {};
    if (!config.API_BASE_URL) { showEmpty(); return; } // frontend-only dev: the empty state IS the design

    page.setAttribute('data-loading', '');
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);

    try {
      var response = await fetch(config.API_BASE_URL + '/webinars', { signal: controller.signal });
      if (!response.ok) throw new Error('Bad response: ' + response.status);
      var payload = await response.json();
      var data = (payload && payload.data) || {};
      var upcoming = Array.isArray(data.upcoming) ? data.upcoming : [];
      var replays = Array.isArray(data.replays) ? data.replays : [];

      if (!upcoming.length && !replays.length) showEmpty();
      else render(upcoming, replays);
    } catch (err) {
      console.error('[webinars] failed to load sessions', err);
      showError();
    } finally {
      clearTimeout(timeout);
    }
  }

  load();
})();