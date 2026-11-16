# DevFlow — Technical Decisions

> **Status:** Architecture decision summary, not a record of formal, dated ADR approvals. Decisions below are based on the supplied project context and configuration files. The difference between an **implemented behavior**, a **design intention**, and an **unverified operational state** is indicated where material.

## Decision summary

| Area | Decision | Why | Current evidence / caveat |
| --- | --- | --- | --- |
| Repository organization | pnpm monorepo | Keep web/API independently buildable while sharing repository tooling | Root workspace specifies `apps/*` and `packages/*` |
| Web platform | React + TypeScript + Vite | Typed, component-oriented SPA | `apps/web/package.json` |
| UI | Tailwind CSS + shadcn/ui | Consistent reusable components | Frontend dependencies and earlier source inventory |
| Navigation | React Router | Nested route layouts and access-aware navigation | Frontend route configuration supplied earlier |
| Server state | TanStack Query | Caching, refetch and invalidation of API data | Frontend dependency and hooks reviewed earlier |
| Shared UI/client state | Zustand only where needed | Avoid a heavyweight global store for all state | Auth and UI stores in earlier source inventory |
| Forms | React Hook Form + Zod | Explicit validation and form lifecycle | Frontend dependencies and feature schemas |
| API | Node.js + Express + TypeScript | Conventional HTTP application with explicit layers | API source and package manifest |
| Persistence | PostgreSQL + Prisma | Relational constraints and typed queries | Prisma schema, config and adapter |
| Authentication | JWT access token + refresh cookie | Keep access token short-lived; handle refresh via an HttpOnly cookie | Auth code reviewed earlier; end-to-end security is not certified by this document |
| API documentation | OpenAPI 3.1 + Swagger UI | Reviewable, standard API contract | Reported local Swagger UI success; current docs ZIP contains a possibly older root OpenAPI copy |
| Testing | Vitest, React Testing Library, Supertest, Playwright | Unit, integration, component, and browser coverage | Package manifests and CI workflows |
| Delivery | Docker + GitHub Actions | Repeatable builds and automated quality gates | Docker image workflow references Dockerfiles; actual Dockerfiles not provided in this review |

## 1. Modular monolith rather than microservices

DevFlow is organized as a single Express API with routes, middleware, controllers, services and repositories. This keeps deployment and debugging straightforward while preserving room for separation by domain. Microservices are **not** part of the current architecture.

**Trade-off:** The shared codebase and deployment are operationally simpler, but changes across domains are not independently deployable. Add services only if measurable scale or ownership needs justify them.

## 2. Feature-oriented frontend, layered backend

The frontend uses `features/` for domain logic and shared folders for infrastructure and reusable UI. The backend uses:

```text
Routes -> Middleware -> Controllers -> Services -> Repositories -> Prisma -> PostgreSQL
```

**Rationale:** HTTP transport, business rules and data access should not be mixed. Repository wrappers should be pragmatic: introduce them for meaningful query encapsulation, not merely to duplicate every ORM method.

**Trade-off:** Some extra files and coordination, balanced against testability and clear boundaries.

## 3. Separate server, form, and client state

- **TanStack Query** owns API-backed data and request lifecycle.
- **React Hook Form** owns form state; **Zod** validates inputs.
- **Zustand** holds genuinely shared client state such as in-memory access-token state.
- **Component state** remains local wherever possible.

Avoid duplicating authoritative server data in multiple stores. The reviewed authentication flow includes React Query/Zustand synchronization and has been a subject of explicit lifecycle hardening work; do not assume that every edge case is resolved without regression tests.

## 4. Data integrity and project authorization

The Prisma schema defines nine models: `User`, `RefreshToken`, `Project`, `ProjectMember`, `Task`, `Comment`, `ActivityLog`, `Notification`, and `Mention`.

- Project ownership is defined by `Project.ownerId`.
- `ProjectMember` has a unique `(projectId, userId)` pair.
- Each task has at most one assignee (`assigneeId` is nullable).
- Prisma relations use `Cascade`, `Restrict` and `SetNull` as specified per relation, rather than blanket cascading deletion.
- Project access is scoped by owner or membership in the project repository; update/delete queries apply additional ownership/role filters.

**Caveats:** `Notification.projectId` and `Notification.taskId` are scalar IDs, not declared foreign keys. The schema permits `ActivityLog.taskId` to be null, so activity can be project-scoped. See [database.md](database.md) for precise relationships and referential actions.

## 5. Authentication, CSRF and rate limiting

Earlier code review established these design choices:

- **Access token:** JWT, configured for 15 minutes, issuer `devflow-api`, audience `devflow-web`, algorithm HS256.
- **Refresh token:** Random opaque value, hashed at rest, stored in PostgreSQL, rotated on refresh with token-family tracking; delivered in an HttpOnly cookie scoped to `/api/v1/auth`.
- **Passwords:** Argon2id hashing.
- **CSRF:** Double-submit protection for unsafe HTTP methods, with `X-CSRF-Token` and cookies.
- **Rate limits:** General, authentication and refresh limits backed by Redis; the current API configuration requires `REDIS_URL`.
- **HTTP security:** Helmet, CORS allowlist and central error handling.

**Trade-offs:** Stateless JWT verification avoids a database read on each protected request, but existing tokens can remain valid until expiry following logout or role changes. Refresh token rotation and concurrent requests require integration tests. These decisions describe the implementation approach, not a blanket assertion of production security.

## 6. Why Redis is a current runtime dependency

Redis was originally deferred pending a concrete need. The current backend now imports Redis for rate limiting and requires a `REDIS_URL` during configuration validation. Therefore Redis is **not optional for the currently reviewed runtime configuration**, even though some older architectural sketches describe caching as optional.

**Trade-off:** Cross-instance rate-limit accounting is easier, but local development and production require an additional service and an availability/failure policy. WebSocket remains a future option; no working WebSocket implementation was verified.

## 7. Safe testing environments

The current CI definitions specify:

- Node.js 24, pnpm from the root `packageManager`, frozen lockfile installation.
- PostgreSQL 17 and Redis 7 as temporary service containers.
- A dedicated local/CI database named `devflow_test`.
- A dedicated test Redis endpoint on port `6380`.
- Prisma generate and migrations before backend testing.
- API unit/integration coverage, frontend unit/component coverage and Playwright Chromium E2E.
- Separate Docker build verification on pull requests and a GHCR publication workflow on the main branch, subject to CI jobs.

**Important:** These are configured pipeline intentions. The provided ZIP does not include GitHub run results or prove that Docker images have been published. A locally passing test run also does not establish that all remote CI jobs passed.

## 8. OpenAPI and documentation boundaries

A machine-readable OpenAPI document and interactive Swagger UI make endpoint behavior discoverable. API documentation should describe the **actual responses**, including endpoints with a `pagination` field and without a `message` property, rather than forcing all handlers into a uniform model that the code does not return.

The review archive contains `docs/openapi/openapi.yaml` with an older auth-focused draft. Earlier project work reports a more complete runtime API specification at `apps/api/docs/openapi/openapi.yaml`. Keep the runtime-loaded specification as the authoritative API document and reconcile or remove duplicate/outdated copies before release.

## 9. Deployment and secrets

Production should use HTTPS, distinct cryptographically random JWT/CSRF secrets, environment-managed database credentials, migrations, backup/restore procedures and service health checks. `LOCAL_PRODUCTION_HTTP` is reserved for a constrained local reverse-proxy scenario and must not be used to expose a public HTTP endpoint.

The supplied workflow references production API, frontend, and migration Dockerfiles. Since those Dockerfiles and Compose files were not included in this review archive, their actual build behavior and deployment commands remain **unverified**.

## 10. Deliberately deferred or scoped-out capabilities

- **Workspaces:** Outside the current model scope.
- **WebSocket realtime updates:** Deferred until a product requirement justifies them.
- **Additional infrastructure or state management libraries:** Add only to solve an actual problem.
- **Microservice decomposition:** Not currently planned.

## Release verification checklist

Before creating the GitHub `v1.0.0` release:

- [ ] Reconcile this document with actual source and eliminate stale docs copies.
- [ ] Re-run a clean installation using [getting-started.md](getting-started.md).
- [ ] Confirm the Prisma migrations, example environment files, Dockerfiles and Compose configuration.
- [ ] Confirm TypeScript checks, application builds, backend/frontend tests and browser E2E.
- [ ] Validate OpenAPI against the active routes and verify Swagger UI.
- [ ] Review authentication/authorization, secrets, cookies, CSRF, rate limits and logging in deployment.
- [ ] Confirm the demo URL, screenshots, deployment availability, and documented limitations.
- [ ] Confirm GitHub Actions results and image publishing before claiming CI/CD is green.
