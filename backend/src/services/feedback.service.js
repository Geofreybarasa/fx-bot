/**
 * services/feedback.service.js
 * ------------------------------------------------------------------
 * Feedback is PRIVATE — the form promises "it is not posted publicly".
 * Keep it that way: nothing here should feed the public reviews section
 * on the homepage. If you ever want to publish a customer's words as a
 * testimonial, that needs a human review step and the author's consent.
 *
 * TODO before production (DATABASE_URL is mandatory in production, see
 * config/index.js, so the dev-only branch below can never run there):
 *   - Insert into a `feedback` table: id, rating, message, name, country,
 *     created_at (+ user_id if you later attach the signed-in user).
 *   - Notify the team (email/Slack) or expose an admin view.
 *   - The message is untrusted text: always render it escaped in any admin
 *     UI (never innerHTML), and never put it into an email as raw HTML.
 *   - If you store IPs for abuse handling, treat them as personal data
 *     and cover that in the Privacy page.
 * ------------------------------------------------------------------
 */
const config = require('../config');
const logger = require('../utils/logger');

async function saveFeedback({ rating, message, name, country }) {
  if (!config.databaseUrl) {
    // Dev only: no database yet, so log it (debug level = never in production
    // logs) instead of dropping it silently, so the whole flow is testable.
    // NB: don't log the field as `name` — pino reserves that key for the logger's own name.
    logger.debug({ rating, message, authorName: name, country }, 'Feedback received (DEV: not persisted — DATABASE_URL unset)');
    return;
  }

  // Example shape once a DB exists:
  // await feedbackRepository.create({ rating, message, name, country });
  // await notificationService.notifyTeam('New feedback', { rating });
}

module.exports = { saveFeedback };