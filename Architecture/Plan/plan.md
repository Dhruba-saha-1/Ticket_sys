# Ticketing Software — Architecture Plan

> Version 1.0 · 31 Oct 2026 · Status: Draft for review
> Source: `Ticketing-software.drawio` (functional diagram)

---

## 1. Overview

A multi-project ticketing platform. An **Admin** creates projects, adds users to each project and gives each user a **role within that project**. Tickets (Task / Bug / New Request) are raised inside a project and assigned to **Members**, who work on them.

### Module hierarchy

1. **Project Creation** (main module): title, description, duration, status, allowed ticket types
2. **User Management**: users, plus their role in each project
3. **Ticket Management**: tickets scoped to a project (create, assign, status, priority)
4. **Dashboards & Insights**: multi-project dashboard and per-project insights
5. **Billing** *(optional)*: current plan, monthly usage, plan selection

### Roles

| Role | Summary |
|---|---|
| **Admin** | Creates and manages projects and users, creates and assigns tickets |
| **Project Head** | Creates and assigns tickets within their project |
| **Customer / Guest** | Creates tickets and tracks them |
| **Member** | Is assigned tickets and updates their status |

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Web | React + **Next.js** (App Router), TypeScript | Admin panel and all role views |
| Mobile | **React Native** (Expo), TypeScript | Member, Customer and Project Head flows |
| Backend | **Node.js** + Express (or NestJS), TypeScript | Single source of business logic |
| Database | **MongoDB** + Mongoose | users, projects, projectMembers, tickets |
| Validation | Zod (shared) | Same schemas on client and server |
| Data fetching | TanStack Query + shared API client | Web and mobile |
| Auth | JWT access + refresh tokens, bcrypt/argon2 | httpOnly cookie (web), SecureStore (mobile) |
| Monorepo | Turborepo / Nx + pnpm workspaces | Shared types, enums, permissions |

---

## 3. High-Level Architecture

```
┌────────────────────┐    ┌──────────────────────┐
│ Web: Next.js       │    │ App: React Native     │
│ Admin / PH /       │    │ Member / Customer /   │
│ Member / Customer  │    │ Project Head          │
└─────────┬──────────┘    └──────────┬───────────┘
          │      HTTPS · REST · JWT   │
          └────────────┬──────────────┘
         ┌─────────────▼──────────────────────────┐
         │  Node.js API (modular monolith)         │
         │  authenticate → projectRole → authorize │
         │  → validate → controller → service      │
         │                                         │
         │  Auth │ Projects │ Users & Memberships  │
         │  Tickets │ Insights │ Billing (opt.)    │
         └─────────────┬──────────────────────────┘
                ┌──────▼──────┐
                │   MongoDB   │
                └─────────────┘
```

### Principles

- **One backend for all clients.** All business rules live in the Node API. Next.js is used only as the frontend (no business logic in Next API routes), so the mobile app never needs a duplicate copy of the logic.
- **Modular monolith.** One deployable API split into clear modules (see section 13 for trade-offs).
- **Project-scoped security.** Every project request works out the caller's role *in that project*.
- **Shared contracts.** Types, enums, Zod schemas and the permission matrix live in one shared package.

---

## 4. Repository Structure

```
ticketing/
├── apps/
│   ├── web/                Next.js (App Router)
│   ├── mobile/             React Native (Expo)
│   └── api/                Node.js + Express/NestJS + Mongoose
│       └── src/
│           ├── modules/
│           │   ├── auth/           controller · service · routes
│           │   ├── projects/
│           │   ├── users/
│           │   ├── memberships/
│           │   ├── tickets/
│           │   ├── insights/
│           │   └── billing/        (optional)
│           ├── middleware/         authenticate · projectRole · authorize · validate
│           ├── models/             User · Project · ProjectMember · Ticket
│           ├── events/             in-process event bus
│           ├── jobs/               background worker (insights, notifications)
│           └── config/
└── packages/
    ├── shared/             enums, TS types, Zod schemas, permissions.ts
    └── api-client/         typed HTTP client for web + mobile
```

---

## 5. Roles & Permissions

Roles are assigned **per project**, so one user can be Project Head in Project 1 and Customer in Project 2. A separate `isSuperAdmin` flag on the user gives platform-level rights: creating projects, managing users, and the admin panel and billing.

| Action | Admin | Project Head | Customer | Member |
|---|:-:|:-:|:-:|:-:|
| Create / edit / delete project | ✅ | ❌ | ❌ | ❌ |
| Add users to project & set role | ✅ | ❌ | ❌ | ❌ |
| **Create ticket** | ✅ | ✅ | ✅ | ❌ |
| **Assign ticket to a member** | ✅ | ✅ | ❌ | ❌ |
| **Can be assigned a ticket** | ❌ | ❌ | ❌ | ✅ |
| Edit ticket details / priority / due date | ✅ | ✅ | ✅ (own) | ❌ |
| Update ticket status | ✅ | ✅ | ❌ | ✅ (assigned) |
| View project tickets & insights | ✅ | ✅ | ✅ | ✅ |
| User dashboard, billing | ✅ | ❌ | ❌ | ❌ |

### Shared permission matrix

```ts
// packages/shared/permissions.ts
export const ROLES = ['admin', 'project_head', 'customer', 'member'] as const;
export type Role = typeof ROLES[number];

export const PERMISSIONS = {
  'project:manage': ['admin'],
  'member:manage':  ['admin'],
  'ticket:create':  ['admin', 'project_head', 'customer'],
  'ticket:assign':  ['admin', 'project_head'],
  'ticket:status':  ['admin', 'project_head', 'member'],
  'ticket:view':    ['admin', 'project_head', 'customer', 'member'],
} as const satisfies Record<string, readonly Role[]>;

export const ASSIGNABLE_ROLES: Role[] = ['member'];

export const can = (role: Role, perm: keyof typeof PERMISSIONS) =>
  (PERMISSIONS[perm] as readonly Role[]).includes(role);
```

The API enforces `can()`. The web and mobile clients use the same function to show or hide actions.

---

## 6. Core Modules

### 6.1 Project Creation (main module)

| Field | Details |
|---|---|
| UID / key | System ID, plus a short `key` (e.g. `P`) used as the ticket ID prefix |
| Title, Description | Title required |
| Duration | `startDate`, `endDate` |
| Status | `todo` · `ongoing` · `completed` · `onhold` · `scraped` |
| Type of ticket needed | Any of `task`, `bug`, `new_request` |
| Actions | Edit, Delete (soft delete) |

### 6.2 User Management

- Admin creates or invites users. Each user can belong to **several projects**.
- User list: paginated, showing **Role · Projects assigned · Created at**.
- Inside a project, Admin adds users and sets their role.

### 6.3 Ticket Management (under a project)

| Field | Details |
|---|---|
| ID | Auto-generated per project: `P01`, `P02`, … |
| Type | One of the project's enabled ticket types |
| Title, Description | Title required |
| Status | Ticket workflow status (see section 15) |
| Priority | `low` · `mid` · `high` |
| Due date | Optional |
| Assigned person | Must hold the **Member** role in that project |
| Creator, Created at | Set by the system |

**Lifecycle:** `Create (Admin / PH / Customer)` → `Assign (Admin / PH → Member)` → `Member works & updates status` → `Completed`

### 6.4 Dashboards & Insights

- **Multiple Project dashboard** (Admin): a card for each project showing ticket counts by status over a date range, with "Show more".
- **Project insights** (all project roles): status and priority breakdown, overdue tickets.
- **Customer/Guest panel**: their projects with insights, plus a "Create new ticket" button.

### 6.5 Billing (optional)

Current plan with monthly usage (projects, users, tickets), plus a redirect to a billing page with a plan selection form, backed by a payment provider.

---

## 7. Data Model (MongoDB)

```
users 1───N projectMembers N───1 projects 1───N tickets
```

### users

```js
{
  _id, name, email,            // email: unique
  passwordHash,
  isSuperAdmin: Boolean,
  status: 'active' | 'invited' | 'disabled',
  createdAt, updatedAt
}
```

### projects

```js
{
  _id, uid, key: 'P', title, description,
  duration: { startDate, endDate },
  status: 'todo' | 'ongoing' | 'completed' | 'onhold' | 'scraped',
  ticketTypes: ['task', 'bug', 'new_request'],
  ticketSeq: Number,           // per-project ticket counter
  createdBy: ObjectId<User>,
  isDeleted: Boolean,
  createdAt, updatedAt
}
```

### projectMembers

```js
{
  _id, projectId: ObjectId<Project>, userId: ObjectId<User>,
  role: 'admin' | 'project_head' | 'customer' | 'member',
  createdAt
}
// unique { projectId: 1, userId: 1 }
// index  { userId: 1 }   → "my projects", user list "projects assigned"
```

### tickets

```js
{
  _id, projectId: ObjectId<Project>, displayId: 'P01',
  type: 'task' | 'bug' | 'new_request',
  title, description, status,
  priority: 'low' | 'mid' | 'high',
  dueDate?: Date,
  assigneeId?: ObjectId<User>,  // must be role 'member' in this project
  creatorId: ObjectId<User>,
  createdAt, updatedAt
}
// unique { projectId: 1, displayId: 1 }
// index  { projectId: 1, status: 1, createdAt: -1 }   → lists, insights
// index  { assigneeId: 1, status: 1 }                 → "assigned to me"
```

### Why a separate `projectMembers` collection?

Users and projects are many-to-many, and each pairing has its own role. A separate collection makes "my projects", "members of this project" and "projects assigned to this user" simple indexed queries, and stores each membership only once.

### Ticket ID generation

```ts
const project = await Project.findOneAndUpdate(
  { _id: projectId },
  { $inc: { ticketSeq: 1 } },
  { new: true }
);
const displayId = `${project.key}${String(project.ticketSeq).padStart(2, '0')}`;
```

`$inc` is atomic in MongoDB, so two tickets created at the same moment can't get the same ID. The unique index acts as a second safeguard.

---

## 8. API Design

Base path `/api/v1`, REST/JSON. Every list endpoint takes `?page=&limit=` and returns `{ data, page, limit, total }`.

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/auth/login` | Login, returns tokens | Public |
| POST | `/auth/refresh` | Rotate access token | Refresh token |
| POST | `/auth/invite/accept` | Set password from invite | Invite token |
| GET | `/projects` | List projects (own projects, or all for admin) | Any user |
| POST | `/projects` | Create project | Admin |
| PATCH / DELETE | `/projects/:id` | Edit / soft-delete | Admin |
| GET | `/users` | Paginated users with roles and projects | Admin |
| POST / PATCH | `/users`, `/users/:id` | Create / invite / update | Admin |
| GET | `/projects/:id/members` | Members and their roles | Project roles |
| POST | `/projects/:id/members` | Add user with role | Admin |
| PATCH / DELETE | `/projects/:id/members/:userId` | Change role / remove | Admin |
| GET | `/projects/:id/tickets` | List; filter by status, type, priority, assignee | Project roles |
| POST | `/projects/:id/tickets` | Create ticket | Admin, PH, Customer |
| GET / PATCH | `/tickets/:id` | View / edit | Per matrix |
| PATCH | `/tickets/:id/assign` | Assign to a Member | Admin, PH |
| PATCH | `/tickets/:id/status` | Change status | Admin, PH, assigned Member |
| GET | `/me/tickets` | Assigned to me / created by me | Any user |
| GET | `/dashboard/projects` | Multi-project insight cards | Admin |
| GET | `/projects/:id/insights` | Status / priority breakdown | Project roles |
| GET / POST | `/billing/usage`, `/billing/checkout` | Usage, plan selection | Admin (optional) |

### Insights aggregation

```ts
Ticket.aggregate([
  { $match: { projectId, createdAt: { $gte: from, $lte: to } } },
  { $group: { _id: '$status', count: { $sum: 1 } } },
]);
```

### Error format

```json
{ "error": { "code": "FORBIDDEN", "message": "Role 'member' cannot create tickets" } }
```

`400` validation · `401` unauthenticated · `403` forbidden · `404` not found · `409` conflict

---

## 9. Authentication & Authorization

### Authentication

- Passwords hashed with bcrypt/argon2. Users are invited by email and set their own password.
- **Access token** (JWT, about 15 min) and **refresh token** (7–30 days), rotated on each use and stored hashed so they can be revoked.
- Web: refresh token in an httpOnly, Secure, SameSite cookie. Mobile: `expo-secure-store`.

### Request pipeline

```
authenticate     → verify JWT, set req.user
loadProjectRole  → projectMembers.findOne({ projectId, userId }) → req.role
                   (super-admin treated as 'admin')
authorize(perm)  → can(req.role, perm) or 403
validate(schema) → Zod
controller → service → model
```

### Service-layer rules

- The assignee must be a project member with the role `member`.
- The ticket type must be one of the project's enabled `ticketTypes`.
- A Member can only change the status of tickets assigned to them.
- `completed` / `scraped` projects can be set to read-only (configurable).

---

## 10. Web Application (Next.js)

| Route | Screen | Roles |
|---|---|---|
| `/login` | Login / accept invite | All |
| `/admin` | Multiple Project dashboard | Admin |
| `/admin/projects/new`, `/admin/projects/[id]/edit` | Project form | Admin |
| `/admin/users` | User dashboard (paginated) | Admin |
| `/admin/billing` | Plan, usage, plan selection | Admin (optional) |
| `/projects` | My projects with insights | All |
| `/projects/[id]` | Insights + ticket list | Project roles |
| `/projects/[id]/members` | Members and role assignment | Admin |
| `/projects/[id]/tickets/new` | Create ticket | Admin, PH, Customer |
| `/tickets/[id]` | Detail, assign, status | Per matrix |
| `/my-tickets` | Assigned to me / created by me | All |

- Next.js middleware checks the session. A `<Can perm="...">` component hides actions the user can't take.
- TanStack Query + `api-client`. React Hook Form + shared Zod schemas.
- UI library (shadcn/ui or MUI) with server-side paginated tables.

---

## 11. Mobile Application (React Native)

| Screen | Purpose | Roles |
|---|---|---|
| Login | Sign in, tokens in SecureStore | All |
| My Projects | List with insight summary | All |
| Project Detail | Insights + tickets | Project roles |
| Assigned to Me | Work queue, quick status update | Member |
| Create Ticket | New Task / Bug / Request | Admin, PH, Customer |
| Ticket Detail | View, assign (PH), status (Member) | Per matrix |

- Expo, React Navigation, TanStack Query, plus the shared `api-client`, schemas and permissions.
- Project creation, user management and billing stay **web-only**.
- Later: push notifications (Expo Notifications) for assignment and status changes.

---

## 12. Non-Functional Requirements

| Area | Approach |
|---|---|
| Security | HTTPS, Helmet, CORS allow-list, rate-limited auth routes, validation on every endpoint |
| Performance | Indexes from section 7, server-side pagination, `.lean()`, field projection; cache insights only if needed |
| Data integrity | Atomic ticket counter, unique indexes, soft delete for projects |
| Auditability | Timestamps everywhere; optional `ticketActivity` collection for history |
| Observability | pino structured logs, request IDs, Sentry (API, web, mobile) |
| Testing | Unit tests (permissions, services), API integration tests (Jest + Supertest + mongodb-memory-server), E2E (Playwright) |
| Scalability | Stateless API, horizontal scaling behind a load balancer, MongoDB replica set |

---

## 13. Modular Monolith: Trade-offs & Safeguards

### Why

The domain is small and closely linked (projects ↔ members ↔ tickets). One deployable API is simpler to build, test, deploy and debug.

### Future downsides

1. **Everything scales together.** Heavy insights force you to run more copies of the whole API.
2. **One deploy for everything.** A small billing fix redeploys ticketing too, and a bad deploy affects everything.
3. **Shared failure.** A slow query, memory leak or CPU-heavy task in one module affects all of them (Node is single-threaded).
4. **Module boundaries wear down.** Developers start importing other modules' models directly, and the code tangles. *This is the biggest risk.*
5. **Team scaling.** Many developers in one codebase and pipeline means merge conflicts and slower CI.
6. **One tech stack.** Every module must be Node and MongoDB.
7. **One database.** Contention affects everyone, and splitting the data later is the hardest part.

### Safeguards from day one

- **Strict boundaries:** modules talk only through service interfaces. Enforce with `eslint-plugin-boundaries` or NestJS modules.
- **Each module owns its collections:** no cross-module `$lookup`; call the other module's service instead.
- **Internal events** (`ticket.created`, `ticket.assigned`) through an in-process event bus, which can later become a queue (BullMQ / RabbitMQ).
- **Separate worker process** for insights, exports and notifications.
- **Stateless API** (JWT, no in-memory sessions).

### When to split

Split when there's a concrete signal: one module needs very different scaling, separate teams own separate modules, or deploys keep getting blocked. Likely first to move out: **Insights**, **Notifications**, **Billing**.

---

## 14. Deployment

| Component | Hosting |
|---|---|
| Web | Vercel or a Node container |
| API + worker | Docker on AWS ECS / Render / Railway / VM, behind HTTPS |
| Database | MongoDB Atlas (replica set, backups) |
| Mobile | Expo EAS Build/Submit; EAS Update for over-the-air fixes |
| CI/CD | GitHub Actions: lint, type-check, test on PR; deploy on merge to main |
| Environments | dev · staging · production (separate databases and secrets) |

---

## 15. Delivery Plan

| Phase | Scope | Deliverables |
|---|---|---|
| 1 | Foundation | Monorepo, shared package, API skeleton, MongoDB, auth (login, refresh, invite) |
| 2 | Project Creation | Project model and APIs, admin project form and list (web) |
| 3 | User Management | User and membership APIs, project roles, user dashboard (web) |
| 4 | Ticket Management | Ticket APIs, ID generation, create / assign / status flows, screens (web) |
| 5 | Dashboards | Multi-project dashboard, project insights, customer/guest panel |
| 6 | Mobile App | React Native screens on the same API |
| 7 | Billing (optional) | Plans, usage, payment provider |

---

## 16. Assumptions & Open Decisions

### Assumptions

- One super-admin (or a few) creates projects and manages users. Per-project roles are Admin, Project Head, Member and Customer/Guest.
- Only users with the **Member** role can be assigned tickets.
- Projects are soft-deleted to keep ticket history.

### Decisions needed

- [ ] **Ticket statuses:** same set as projects (todo / ongoing / completed / onhold / scraped), or their own (open / in-progress / resolved / closed)?
- [ ] **Customer visibility:** all tickets in their project, or only their own?
- [ ] **Multi-tenancy:** does billing mean several separate client organisations? If yes, add `orgId` to every collection now.
- [ ] **Project-level Admin:** can a per-project Admin manage that project's members, or only the super-admin?
- [ ] **Notifications:** email or push in the first release?
