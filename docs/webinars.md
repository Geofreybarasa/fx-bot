# Webinars — how to add sessions and notify clients

Audience: the backend team. Read top to bottom once; then use it as a checklist.

## 1. What already exists

| Piece | Where | State |
|---|---|---|
| Public page | `frontend/webinars.html` + `js/webinars.js` | Done. Shows the empty state, or session cards when the API returns some. |
| Public endpoint | `GET /api/v1/webinars` | Done. Returns `{ data: { upcoming: [], replays: [] } }`. Empty today. |
| Session data | `src/services/webinars.service.js` → `WEBINARS = []` | Placeholder array. Replace with a DB query. |
| Notifications | — | **Not built.** Section 4 is the plan. |

Nothing on the frontend needs to change to show real sessions. When the endpoint returns data, the "No sessions scheduled" card is replaced automatically.

## 2. Adding a session

### Quick way (before you have a database)
Add an object to `WEBINARS` in `webinars.service.js` (a commented example is there). Restart the server and the page shows it. Good enough to demo the page; not a real workflow.

### Proper way

**Table** (Postgres flavoured; adapt to your database):

```sql
CREATE TABLE webinars (
  id               TEXT PRIMARY KEY,            -- URL-safe slug, e.g. 'risk-controls-walkthrough'
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  host             TEXT NOT NULL DEFAULT '',
  starts_at        TIMESTAMPTZ NOT NULL,         -- always store UTC
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  join_url         TEXT,                          -- PRIVATE: never sent by the public endpoint
  replay_url       TEXT,                          -- PRIVATE
  replay_available BOOLEAN NOT NULL DEFAULT FALSE,
  is_published     BOOLEAN NOT NULL DEFAULT FALSE, -- FALSE = draft
  published_at     TIMESTAMPTZ,                    -- set when is_published flips to TRUE (see section 4)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Reading** — in `getWebinars()`, select `WHERE is_published`, map rows to the `Webinar` shape (camelCase) and pass them to the existing `partitionWebinars()`. That function already sorts, splits upcoming from replays and applies the public-fields allow-list, so you keep the same guarantees.

**Writing** — add admin-only routes; do not put these on the public router:

```
POST   /api/v1/admin/webinars          create (draft by default)
PATCH  /api/v1/admin/webinars/:id      edit / publish / attach replay
DELETE /api/v1/admin/webinars/:id
```
- Protect with `requireAuth` **and** a role check (e.g. `req.user.role === 'admin'`). `requireAuth` alone only proves someone is logged in, not that they're staff.
- Validate bodies with zod, like `auth.routes.js` does (title max length, `startsAt` must be a valid future date, `durationMinutes` 1–600, `id` matches `^[a-z0-9-]+$`).
- Until an admin UI exists, a small script or SQL is a perfectly fine way to add sessions.

**Rules to keep (both are tested in `tests/webinars.test.js`):**
1. Drafts (`is_published = false`) never appear on the public endpoint.
2. `toPublic()` is an allow-list. Do **not** add `joinUrl`/`replayUrl` to it: the endpoint is unauthenticated. Join and replay links are served only by an authenticated route in the logged-in app (e.g. `GET /api/v1/app/webinars/:id/access` behind `requireAuth`).

## 3. Registration and the join page (logged-in app, later)

Public cards link to `login.html?redirect=/webinars/{id}`. After sign-in the user should land on `/webinars/{id}` inside the logged-in app, which:
- shows the session and a **Register** button (store `webinar_registrations(user_id, webinar_id)`),
- reveals `join_url` only to registered, signed-in users, shortly before start time,
- reveals `replay_url` when `replay_available`.

You need `webinar_registrations` for reminders (section 4), so build it together with the join page.

## 4. Notifying clients

The page promises: *"Create an account to be notified when the schedule goes live."* Once accounts exist, that is a promise to keep. There are two different messages:

| Message | Sent to | When |
|---|---|---|
| **New session announced** | Everyone who opted in to webinar updates | When a session is published |
| **Reminder** | Only users registered for that session | 24 hours and 1 hour before start |

### 4.1 Consent first (decide before writing code)
- Add a column such as `users.notify_webinars BOOLEAN NOT NULL DEFAULT FALSE` and set it from an explicit checkbox at signup and in account settings. `register.html` does not have that checkbox yet. Add one, or at minimum cover it in the Privacy page.
- Rules differ by country (opt-in is generally required in the EU/UK; the US requires an easy opt-out and a valid postal address in the email). Get whoever owns compliance to confirm, and default to **opt-in + one-click unsubscribe**. This is not legal advice.
- Every marketing email needs a working unsubscribe link (per-user signed token that sets `notify_webinars = false` without requiring login) and the `List-Unsubscribe` header.
- Account/security emails (email confirmation, password reset) are separate and are always sent.

### 4.2 Architecture

```
admin publishes session
        │  (PATCH sets is_published = true, published_at = now())
        ▼
  enqueue "announce" job  ───────────►  worker (src/jobs/)
        │                                   │ loops opted-in users in batches
   HTTP request ends immediately            │ sends via email provider API
   (never send emails inside the request)   │ writes notification_log row per send
                                            ▼
                                      email provider  →  client inbox
```

Never send inside the HTTP request that publishes the session: it's slow, times out for large lists, and a failure would half-send.

**Log table (this is what prevents duplicate emails):**

```sql
CREATE TABLE notification_log (
  user_id     BIGINT NOT NULL,
  webinar_id  TEXT   NOT NULL,
  kind        TEXT   NOT NULL,            -- 'announce' | 'reminder_24h' | 'reminder_1h'
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, webinar_id, kind) -- the important part
);
```
Before sending, insert the row; if it already exists, skip. Jobs get retried and servers restart, so without this constraint people receive the same email twice.

### 4.3 The jobs (skeleton — an example, not built code)

```js
// src/jobs/webinarNotifier.js  (EXAMPLE)
async function announce(webinarId) {
  const webinar = await webinarRepository.findPublishedById(webinarId);
  if (!webinar) return;

  for await (const batch of userRepository.optedInForWebinars({ batchSize: 100 })) {
    for (const user of batch) {
      const claimed = await notificationLog.tryClaim(user.id, webinar.id, 'announce'); // INSERT ... ON CONFLICT DO NOTHING
      if (!claimed) continue;                                                          // already sent
      await emailService.send({
        to: user.email,
        template: 'webinar-announcement',
        data: { title: webinar.title, startsAt: webinar.startsAt, unsubscribeUrl: signUnsubscribeUrl(user.id) }
      });
    }
  }
}

// Runs every 5 minutes. Finds sessions starting in ~24h / ~1h and emails REGISTERED users only.
async function sendReminders() { /* same pattern, kind = 'reminder_24h' / 'reminder_1h' */ }
```

- **Scheduling:** `node-cron` is fine for one server. With more than one instance, every instance fires the cron: either use a real queue (BullMQ + Redis) or rely on the `notification_log` primary key to stay safe. The key already protects you from duplicates.
- **Pace yourself:** send in batches with a small delay and respect the provider's rate limit. Retry failures with backoff and stop after a few attempts.

### 4.4 Email provider and deliverability
- Use a transactional email provider (Resend, Postmark, Amazon SES, SendGrid all work). Keep the API key in `.env` (`EMAIL_API_KEY`, `EMAIL_FROM`) and read it through `config/index.js` like every other secret.
- Send from **your own domain**, not a free mailbox (e.g. `updates@yourdomain.com`), and set up **SPF, DKIM and DMARC** for it. Without these, your emails land in spam, and for a platform handling money, phishing-lookalike mail is a real risk for your users.
- Consider a separate sending subdomain for marketing mail so a spam complaint can't hurt your account/security emails.
- Include the session time in UTC **and** a calendar file (`.ics`) so people can convert it to their timezone. Your audience is worldwide.

### 4.5 Optional extras
- In-app notification (a bell in the logged-in app) reading from the same events.
- Telegram/WhatsApp/push channels: same architecture, different `send()` implementation, and each needs its own consent.

### 4.6 Security and privacy checklist
- [ ] Emails contain **no join links** unless they're personal, single-user, expiring links. A link in a mass email will be forwarded.
- [ ] Never log email bodies or full recipient lists; log counts and ids.
- [ ] Session titles/descriptions are admin-entered: escape them in email HTML templates.
- [ ] Unsubscribe works without logging in and takes effect immediately.
- [ ] Publishing/editing sessions is admin-only (role check), and audited (who changed what, when).
- [ ] Never send "announce" for a draft or for a session already sent (guard on `published_at` and the log table).

## 5. Suggested order of work

1. Database + replace `WEBINARS` with a query. The page now shows real sessions.
2. Admin create/publish endpoints (or a script).
3. `webinar_registrations` + the logged-in join page.
4. Consent checkbox + `notify_webinars`, unsubscribe endpoint.
5. Email provider, domain authentication (SPF/DKIM/DMARC), `notification_log`.
6. Announce job on publish, then the reminder job.