# Agent Instructions for work-log-3d

## On Session Start

1. Read all `.cursor/rules/*.mdc` files.
2. Treat `AGENTS.md` and `.cursor/rules/` as the source of truth for repo-specific constraints.
3. If a referenced tool or MCP server is unavailable in the current client, continue with local inspection instead of assuming the tool exists.

**AGENTS.md** vs **`.cursor/rules/`:** This file is the compact invariant summary and verification commands—read it first when bootstrapping a session. **`.cursor/rules/*.mdc`** holds detailed patterns, file globs, and scoped guidance; apply it when your edits match those globs. Splitting content this way keeps one place for “what must never break” without duplicating every pattern in a single file.

## Core Behavior

- Think before coding. State assumptions when they matter.
- Prefer the smallest change that fully solves the task.
- Keep edits surgical. Do not refactor unrelated code.
- Verify the result with the repo's scripts before finishing.

## Project Stack

- Framework: Nuxt 4, Vue 3, TypeScript
- Styling: Tailwind CSS with theme tokens in `app/assets/css/main.css`
- State: Pinia for global UI state; `useState` for SSR-safe request-scoped state
- Database: Firebase Firestore via `nuxt-vuefire`
- Desktop: Electron shell with shared timer logic in `shared/worklog`

## Repo-Specific Invariants

- Project and tag **URLs** use human-readable **slugs** when linking (`getProjectPathFromProject`, `getTagPathFromTag`, etc.); the path segment may still be a document id (e.g. bookmarks). **Firestore** and `timeBoxes` still reference projects and tags by **document id**.
- Do not delete a project or tag while any `timeBoxes` still reference it.
- Keep validation centralized in shared code so UI, repositories, and tests use the same rules.
- Firestore rules must stay aligned with the current document shape for `projects`, `tags`, and `timeBoxes`.
- Avoid app-wide auth redirect watchers. Route middleware owns access control; the login page owns post-auth redirect behavior.

## Verification

- Primary check: `npm run verify`
- Nuxt sets `typescript.typeCheck: false` in `nuxt.config.ts` on purpose so dev builds stay fast; typechecking still runs via `npm run typecheck` (included in `npm run check` and `npm run verify`). Do not turn on in-app typecheck in Nuxt unless you have a deliberate reason.
- Dependency/unused export hygiene: `npm run knip`
- Web build when routing/build/assets/config change: `npm run build`
- Electron build when desktop behavior/config changes: `npm run electron:build`

## Documentation

- Update `README.md` when scripts, env vars, workflows, routing conventions, or Firestore behavior change.
- Update `AGENTS.md` or `.cursor/rules/*.mdc` when repo-specific engineering rules change.

## Firestore / Firebase

- This project uses Firestore, not SQL or Drizzle.
- Keep `firestore.rules` and `firestore.indexes.json` aligned with app behavior.
- Prefer emulator-backed rules tests for Firestore security changes.
