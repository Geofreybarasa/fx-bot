/**
 * services/webinars.service.js
 * ------------------------------------------------------------------
 * Source of truth for the public Webinar page (GET /api/v1/webinars).
 *
 * Today there are NO sessions (matching the "No sessions scheduled right
 * now" design), so WEBINARS is empty. To add one before a database exists,
 * push an object with the shape below into WEBINARS. The full plan for a
 * real table, an admin endpoint and notifying clients is in
 * backend/docs/WEBINARS.md.
 *
 * Two rules this file enforces so a mistake later can't leak data:
 *   1. Only isPublished sessions are ever returned (drafts stay private).
 *   2. toPublic() is an ALLOW-list: only the fields the public page needs
 *      leave this file. Join links, internal notes, attendee lists etc.
 *      must never be added to it — this endpoint is unauthenticated.
 * ------------------------------------------------------------------
 */

/**
 * @typedef {Object} Webinar
 * @property {string}  id
 * @property {string}  title
 * @property {string}  description
 * @property {string}  host
 * @property {string}  startsAt          ISO 8601 UTC, e.g. "2026-10-14T17:00:00Z"
 * @property {number}  durationMinutes
 * @property {boolean} isPublished       false = draft, never shown publicly
 * @property {boolean} replayAvailable   true once a recording is ready
 * // Internal-only fields (joinUrl, replayUrl, notes...) may exist on the
 * // record but are deliberately NOT exposed by toPublic().
 */

/** @type {Webinar[]} */
const WEBINARS = [
  // Example (uncomment to see the page render a session):
  // {
  //   id: 'intro-live-walkthrough',
  //   title: 'Live walkthrough: how the bot manages risk',
  //   description: 'A guided tour of the dashboard and risk controls, with live Q&A.',
  //   host: 'The support team',
  //   startsAt: '2026-10-14T17:00:00Z',
  //   durationMinutes: 45,
  //   isPublished: true,
  //   replayAvailable: false
  // }
];

const MAX_REPLAYS = 12;

function endsAtOf(webinar) {
  return new Date(new Date(webinar.startsAt).getTime() + webinar.durationMinutes * 60000);
}

/** Allow-list of public fields. See rule 2 in the file header. */
function toPublic(webinar) {
  return {
    id: webinar.id,
    title: webinar.title,
    description: webinar.description || '',
    host: webinar.host || '',
    startsAt: new Date(webinar.startsAt).toISOString(),
    endsAt: endsAtOf(webinar).toISOString(),
    durationMinutes: webinar.durationMinutes
  };
}

/**
 * Pure function (no I/O) so it's easy to unit test:
 *   upcoming = published, not yet finished (includes "live now"), soonest first
 *   replays  = published, finished, recording ready, newest first (capped)
 */
function partitionWebinars(list, now = new Date()) {
  const published = list.filter((w) => w.isPublished);

  const upcoming = published
    .filter((w) => endsAtOf(w) >= now)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
    .map(toPublic);

  const replays = published
    .filter((w) => endsAtOf(w) < now && w.replayAvailable)
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
    .slice(0, MAX_REPLAYS)
    .map(toPublic);

  return { upcoming, replays };
}

async function getWebinars() {
  // TODO: replace WEBINARS with a database query (see docs/WEBINARS.md).
  return partitionWebinars(WEBINARS);
}

module.exports = { getWebinars, partitionWebinars };