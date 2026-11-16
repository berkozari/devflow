# Changelog

Notable changes to DevFlow are documented in this file.

This project follows the structure of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and intends to use [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for GitHub releases.

## [Unreleased]

### Added

- GitHub release preparation and final repository verification.

## [1.0.0] - Unreleased (release candidate)

> **Release status:** This section describes the intended first GitHub release. The `v1.0.0` tag and GitHub Release have not yet been published. Replace this note and the heading date with the actual release date when publishing.

### Added

- Authentication flows with registration, login, logout, JWT access tokens and refresh tokens.
- Project management, project membership, and role-based access (`OWNER`, `ADMIN`, `MEMBER`).
- Task management with Kanban workflows, assignees, priorities and status changes.
- Dashboard views for project progress, workload and overdue tasks.
- Collaboration support including comments, mentions, activity history and notifications.
- REST API documentation using OpenAPI 3.1 and Swagger UI in supported local environments.
- PostgreSQL persistence with Prisma and Redis infrastructure for backend features.
- Automated testing infrastructure with Vitest, React Testing Library, Supertest and Playwright.
- Docker local-production environment with API, web, PostgreSQL, Redis and migration workflows.
- GitHub Actions CI and container image publishing configuration.
- Developer documentation: setup, architecture, database model, technical decisions and local deployment.
- Application screenshots for the README.

### Changed

- Made the **New Project** action accessible when a project list already contains projects.
- Updated the README to reflect the actual localhost-only portfolio scope and verified smoke-test results.
- Removed generated Prisma Client output from Git tracking, while retaining Prisma Client generation in the build and CI workflows.

### Security

- Implemented API authentication, authorization, validation, CSRF protection, rate limiting and security headers.
- Kept local-production API, PostgreSQL and Redis services on the internal Docker network; exposed the web interface on loopback.

### Validation

- The project author reported successful typechecking, backend tests and local-production smoke tests, including project and task creation, Kanban status updates, data persistence and authentication flows.
- Remote GitHub Actions checks and final release publication remain to be verified.

[Unreleased]: https://github.com/berkozari/devflow/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/berkozari/devflow/releases/tag/v1.0.0
