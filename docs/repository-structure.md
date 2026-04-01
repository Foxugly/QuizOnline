# Repository Structure

## Decision

Keep a single monorepo.

The backend and frontend are already separated at runtime. The main shared boundary is the OpenAPI contract, so the priority is to make that boundary explicit and repeatable instead of splitting into two repositories now.

## Current State

- `wpref/` contains the Django backend, local database, media, and OpenAPI generation.
- `wpref-frontend/` contains the Angular frontend and the generated API client.
- The OpenAPI file is duplicated in both applications and synchronized manually.

## Target Structure

The recommended target is:

```text
WpRef/
|-- README.md
|-- .gitignore
|-- docs/
|   `-- repository-structure.md
|-- scripts/
|   `-- sync-openapi.ps1
|-- wpref/
|   |-- manage.py
|   |-- requirements.txt
|   |-- openapi.yaml
|   `-- ...
`-- wpref-frontend/
    |-- package.json
    |-- openapi.yaml
    |-- src/
    `-- ...
```

## Recommended Rules

- Treat `wpref/` and `wpref-frontend/` as two independent applications in one repository.
- Keep shared contracts explicit: OpenAPI only, not copied business logic.
- Keep local artifacts out of Git: virtualenv, SQLite database, coverage, caches, IDE state.
- Version the scripts that synchronize the contract.
- Keep CI separable later: backend jobs and frontend jobs should be runnable independently.

## When To Split Into Two Repositories

Split only if one of these becomes true:

- frontend and backend have different release cadences,
- different teams own them,
- access control must differ,
- the API becomes a product consumed by several clients,
- deployment pipelines need to evolve independently.

## Migration Path

1. Stabilize the monorepo conventions.
2. Automate OpenAPI sync.
3. Clean the Git surface.
4. Add separate backend/frontend CI jobs.
5. Re-evaluate a repo split later if organization demands it.
