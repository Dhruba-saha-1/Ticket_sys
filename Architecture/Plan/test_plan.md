# Ticketing Software — Test Plan

> Version 1.0 · 31 Oct 2026 · Status: Draft
> Based on: `Architecture/Plan/revised_plan.md` v1.2
> Section references (§) point to `revised_plan.md`.

---

## 1. Scope & Objectives

### Objectives

- Prove every business rule in the revised plan is enforced **by the API**, not just hidden in the UI.
- Catch regressions on every PR through automated unit and integration tests.
- Sign off each delivery phase (§15) against a clear, repeatable gate.
- Verify the low-cost production setup (one VPS, Atlas M0, domain SMTP) works end to end before go-live.

### In scope (v1 = Phases 1–5, web only)

Auth, Projects, Users & Memberships, Tickets, Insights/Dashboards, Notifications (domain SMTP), the Next.js web app, and the non-functional targets in §12.

### Out of scope

Comments, attachments, activity timeline, object storage (§6.4); mobile app and push (§11); billing; MFA/SSO/webhooks; real-time. These get test coverage when they are built (section 12).

---

## 2. Test Levels & Tooling

| Level | Tool | Location | What it covers |
|---|---|---|---|
| **Unit** | Jest | `packages/shared`, `apps/api/tests/unit` | `can()` and `PERMISSIONS`, ticket workflow table, displayId formatting, Zod schemas, resource-rule helpers, read-only project check, overdue rule |
| **API integration** | Jest + Supertest + mongodb-memory-server | `apps/api/tests/integration` | Every endpoint in §8: happy path, role matrix, validation, error codes, DB side effects |
| **Email** | Mocked Nodemailer transport (CI), Mailpit (local) | `apps/api/tests/integration` | Domain events → correct recipients, subject, links; retry behaviour |
| **Web component** | React Testing Library (light use) | `apps/web` | `<Can>`, forms wired to shared Zod schemas, error display |
| **E2E** | Playwright (later) | `apps/web/e2e` | A few critical journeys, once the MVP UI is stable |
| **Manual / UAT** | Checklist | This document | Per-phase sign-off and production smoke test |
| **Performance** | autocannon or k6 + seeded data | `apps/api/perf` | Ticket list p95 target (§12) |

**Test pyramid:** most tests are unit and API integration. The API is the single source of business logic (§3), so API integration tests carry most of the confidence. UI tests stay thin.

---

## 3. Test Environments & Data

| Environment | Database | Mail | Used for |
|---|---|---|---|
| Developer machine | docker-compose `mongo` | Mailpit (`localhost:8025`) | Manual testing, debugging |
| CI (GitHub Actions) | mongodb-memory-server | Mocked transport | Unit + integration on every PR |
| Production (VPS) | Atlas M0 | Domain SMTP | Post-deploy smoke test only |

There is no paid staging environment (§14), so the local docker-compose stack doubles as staging for UAT.

### Standard fixtures

A reusable seed/factory module builds this world for integration tests:

- **Users:** Super Admin (SA), Project Head (PH), Member, second Member, Customer, second Customer, user with no project role, disabled user, invited (not yet active) user.
- **Projects:**
  - Active project `PAY` with all ticket types and `customerSeesAllTickets = false`.
  - Active project `WEB` with `customerSeesAllTickets = true`.
  - Read-only projects: `completed`, `scrapped`, and one with `endDate` in the past.
  - One soft-deleted project.
- **Tickets:** one or more in every status, with and without an assignee, created by each role.

Factories issue tokens directly, so most tests do not have to go through login.

---

## 4. Functional Coverage by Module

### 4.1 Authentication (§9, Phase 1)

| Area | Key scenarios |
|---|---|
| Login | Valid credentials → access token + refresh cookie. Wrong password → 401. Disabled user → 401. Invited user with no password → 401. |
| Access token | Payload `{ sub, isSuperAdmin }`. Rejected after 15 min. Rejected if tampered. |
| Refresh | Rotates on every use (old token stops working). 14-day expiry. Reusing a revoked token revokes **all** of that user's tokens. Token stored hashed, not in plaintext. |
| Logout | Revokes the current refresh token only. |
| Invite accept | Sets password and activates user. Token expires after 72h, is single use, and is revoked by a re-invite. |
| Forgot / reset | `forgot-password` always returns 202, even for unknown emails. Reset token lasts 1h and is single use. |
| `/me` | Returns user, `isSuperAdmin`, memberships. `PATCH /me/password` requires the correct current password. |
| Bootstrap | Seed creates the first SA from env only when `users` is empty. It is a no-op otherwise. There is no public sign-up route. |

### 4.2 Projects (§6.1, Phase 2)

| Area | Key scenarios |
|---|---|
| Create | SA only. `key` is unique, uppercase, 2–8 chars. A duplicate key → 409. Title is required. `ticketSeq` starts at 0. |
| Edit | `key` is immutable after creation. Changes to dates, status and `ticketTypes` are saved. |
| Narrow `ticketTypes` | Removing a type that still has open tickets → 409 `TICKET_TYPE_IN_USE`. Removing an unused type succeeds. |
| Read-only | For `completed`, `scrapped` or a past `endDate`: creating, assigning or changing the status of a ticket → 409 `PROJECT_READ_ONLY`. SA can reopen the project by changing its status or end date, and writes then work again. |
| Soft-delete / restore | SA only. Deleted projects are hidden from lists and return 404 for non-SA users. Restore brings them back with their tickets intact. |
| List | SA sees all projects. Other users see only projects they belong to. |

### 4.3 Users & Memberships (§6.2, Phase 3)

| Area | Key scenarios |
|---|---|
| Invite | SA only. Sends the invite email. A duplicate email → 409. |
| Re-invite | Allowed only for `invited` users or expired invites. The previous token is revoked. |
| Disable | Refresh tokens are revoked immediately, and the user can no longer log in. Their assigned tickets **stay assigned**. |
| User list | Paginated. Shows each user's projects and the role in each. SA only. |
| Add member | SA, or the PH of **that** project. A PH of another project → 403. Exactly one role per project; a duplicate → 409. |
| Change role / remove | When the user still has open assigned tickets and leaves the `member` role → 409 `MEMBER_HAS_OPEN_TICKETS`. The request succeeds if it also reassigns or unassigns those tickets. |

### 4.4 Tickets (§6.3, Phase 4)

| Area | Key scenarios |
|---|---|
| Display ID | Format is `KEY-0001`. The sequence is per project. Padding grows past 9999 (`PAY-10000`). **Concurrent creates** (e.g. 50 in parallel) give unique, gap-free IDs. |
| Create | Allowed for all four roles. The type must be enabled in the project's `ticketTypes`. Status defaults to `open`. The creator is set by the server, not taken from the request body. |
| Assign | SA and PH only. The assignee must be a `member` in that project. A PH or Customer → rejected. SA is assignable **only** if also a Member. Unassign (`assigneeId: null`) and reassign work on any non-closed ticket. |
| Edit details | SA and PH can edit any ticket. A Customer can edit only their own, non-closed tickets. A Member cannot edit details. |
| Status machine | Every allowed row in the §6.3 table, tested with each permitted role. Every pair not in the table → 409 `INVALID_TRANSITION`. Moving to `in_progress` with no assignee → 409 `ASSIGNEE_REQUIRED`. A Member can change status only on tickets assigned to them. A Customer can never change status. |
| Closed tickets | Read-only except reopen (`closed → open`, SA/PH). The ticket is editable again after reopening. |

Use a **table-driven test** generated from the shared workflow table (`packages/shared/src/ticketWorkflow.ts`), so the tests and the rules cannot drift apart.

### 4.5 Visibility & Resource Rules (§9)

- A Customer sees only tickets they created, unless `customerSeesAllTickets` is true. This applies to list, get, `/me/tickets` and insights.
- Member, PH and SA see all tickets in the project.
- A user with no role in the project → 403. A soft-deleted project → 404 for non-SA users.
- SA without a membership row is treated as PH.

### 4.6 Lists, Pagination & Search (§8)

- `page` defaults to 1 and `limit` to 20. `limit` is capped at 100. Responses have the shape `{ data, page, limit, total }`.
- `q` matches title (case-insensitive, partial) and displayId (exact, case-insensitive).
- Filters (status, type, priority, assignee) work on their own and combined.

### 4.7 Dashboards & Insights (§6.5, Phase 5)

- Project insights: counts by status and priority, correct for a known fixture set.
- Overdue = `dueDate < now` and status not `resolved`/`closed`. Test the boundaries (due exactly now, no due date).
- The date range defaults to the last 30 days. Custom `from`/`to` are respected.
- Customer insights count only the tickets that Customer can see.
- `GET /dashboard/projects` is SA only, with one card per non-deleted project.

### 4.8 Notifications (§6.6, Phases 1 & 5)

| Event | Assert |
|---|---|
| `user.invited` | One email to the invitee containing a valid set-password link |
| Forgot password | One email with a reset link; no email for an unknown address (but still 202) |
| `ticket.assigned` | One email to the new assignee; none on unassign |
| `ticket.status_changed` | Emails to the creator and the assignee, de-duplicated when they are the same person |

- From address = `MAIL_FROM`.
- An SMTP failure is retried 3 times with backoff, then logged. The **API request still succeeds**.

---

## 5. Authorization Matrix Testing (§5)

One table-driven integration suite:

- **Rows:** every endpoint in §8.
- **Columns:** SA, PH, Member, Customer, user with no role, anonymous.
- **Cells:** expected HTTP status (2xx / 401 / 403 / 404).

This suite is the main guard against privilege leaks. A new endpoint is not done until it has a row here.

Alongside it, unit-test `can()` against every key in `PERMISSIONS`, and assert `ASSIGNABLE_ROLES` is `['member']`.

---

## 6. Web Application (§10)

| Area | Checks |
|---|---|
| Routing | Anonymous users → redirected to `/login`. Each route in §10 loads for its allowed roles. |
| `<Can>` | Actions are hidden for roles without the permission (assign, status, member management, admin menus). |
| Resource-aware UI | Edit and status controls follow ticket data (own ticket, assigned to me). |
| Forms | Shared Zod errors show inline. API error codes (e.g. `PROJECT_READ_ONLY`) appear as readable messages. |
| Session | Access token is held in memory, never in localStorage. Silent refresh works after the 15-minute expiry. Logout clears state. |
| Responsive | Main screens are usable at phone width. |

Manual check per phase. Playwright journeys come later (section 12).

---

## 7. Non-Functional Testing (§12)

| Area | What to test |
|---|---|
| **Security** | Helmet headers are present. CORS rejects origins outside the allow-list. Rate limits trigger at their thresholds (auth 10 / 15 min / IP, writes 120 / min / user, reads 300 / min / user). Refresh cookie is `httpOnly`, `Secure`, `SameSite=Lax`. No secrets or hashes appear in responses or logs. Every endpoint rejects bad input with 400. Mongo operator injection (e.g. `{"$gt": ""}`) is rejected. |
| **Performance** | Seed about 5,000 tickets in one project. `GET /projects/:id/tickets` p95 < 300 ms on the VPS spec. `explain()` confirms the §7 indexes are used. |
| **Data integrity** | Unique indexes are enforced: project `key`, `(projectId, displayId)`, `(projectId, userId)`, user `email`. |
| **Observability** | pino JSON logs include `x-request-id`, and the ID is echoed in the response header. |
| **Backup** | One `mongodump` → restore drill against a scratch database before go-live. |
| **Time handling** | All dates are stored and compared in UTC. Overdue and past-`endDate` checks behave correctly around midnight UTC. |

---

## 8. Phase-wise Test Gates (§15)

Each phase is done only when its gate passes. This matches the definition of done in §15: types pass, unit tests for new rules, integration tests for new endpoints, and screens verified manually.

| Phase | Gate |
|---|---|
| 1 Foundation | CI is green. Auth suite (4.1) passes. Invite and reset emails land in Mailpit. Bootstrap seed works. Auth rows of the authorization matrix are in place. |
| 2 Projects | Project suite (4.2) passes, including read-only and `TICKET_TYPE_IN_USE`. Admin project screens are verified manually. |
| 3 Users | Users & memberships suite (4.3) passes, including `MEMBER_HAS_OPEN_TICKETS` and disable-revokes-tokens. User dashboard is verified. |
| 4 Tickets | Ticket suite (4.4), visibility suite (4.5) and list suite (4.6) pass. Full transition table is covered. Concurrent displayId test passes. Ticket screens are verified for every role. |
| 5 Dashboards + mail | Insights (4.7) and notifications (4.8) suites pass. Performance target is met. Full authorization matrix passes. UAT checklist (section 10) is signed off. |

---

## 9. CI & Quality Gates

- `.github/workflows/ci.yml` runs `lint`, `typecheck` and `test` on every PR and on pushes to `main`. A red build blocks merge.
- **Coverage targets:**
  - ≥ 90% lines for `packages/shared` and the API service layer, where the rules live.
  - About 70% overall.
  - Controllers and UI are not chased to 100%.
- Every bug fix ships with a regression test.
- Tests must be deterministic: no real network, no real SMTP, a controlled clock for time-based rules.

---

## 10. Release / UAT Checklist

Run on the local stack before release, then repeat as a smoke test on production after each deploy.

- [ ] HTTPS certificate is valid on the web and API origins.
- [ ] Log in as the bootstrap SA.
- [ ] Create a project. Invite a PH, a Member and a Customer. **The invite email arrives via domain SMTP** (check the spam folder too).
- [ ] Each invitee sets a password and sees the correct screens for their role.
- [ ] Customer creates a ticket → PH assigns it to the Member → the Member gets the assignment email.
- [ ] Member moves the ticket to `in_progress` → `resolved`. The creator gets status emails. PH closes the ticket.
- [ ] Customer cannot see another Customer's ticket.
- [ ] SA dashboard and project insights show correct counts.
- [ ] Forgot-password flow works end to end.
- [ ] MX records are unchanged, so the mailbox still receives mail.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Domain SMTP mail lands in spam or is rate-limited | Set up SPF/DKIM/DMARC on the domain. Include real-mailbox delivery in UAT. Keep send volume low. |
| Atlas M0 limits (connections, storage, no on-demand backups) | Test connection pooling settings. Watch storage. Run the `mongodump` drill (section 7). |
| Race conditions in ticket ID generation | Concurrent-create integration test (4.4). Unique index as a backstop. |
| Authorization drift as endpoints are added | Authorization matrix suite (section 5) is mandatory for new endpoints. |
| Workflow rules diverge between UI and API | Both import the single shared workflow table. Tests are generated from it. |
| Timezone bugs on due and end dates | UTC everywhere. Boundary tests with a controlled clock. |
| Single VPS, so no staging | Local docker-compose acts as staging. Smoke test after every deploy. |

---

## 12. Deferred Testing

These are added when the matching features are built:

- **Playwright E2E** for the UAT journeys in section 10, once the UI is stable after the MVP.
- **Mobile (Phase 6):** Expo screens against the same API. Token storage in SecureStore.
- **Comments, attachments, activity (Phase 8):** upload limits, signed URLs, comment emails, timeline accuracy.
- **Billing (Phase 7):** `orgId` tenant isolation, which needs a full cross-tenant authorization matrix.
- **Push notifications, real-time, SSO/MFA.**
