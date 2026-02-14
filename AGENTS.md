# Agent Instructions for work-log-3d

## On Session Start

1. Read all `.cursor/rules/*.mdc` files to load project conventions, stack details, and verification steps.
2. Apply the behavioral guidelines below. Merge with project-specific instructions as needed.

Behavioral guidelines to reduce common LLM coding mistakes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

---

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

---

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

---

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project Stack

- **Framework:** Nuxt 4, Vue 3, TypeScript
- **Styling:** Tailwind CSS (see `.cursor/rules/tailwind.mdc`)
- **State:** Pinia for global state; `useState` for SSR-safe, request-scoped state
- **Database:** Firebase Firestore via nuxt-vuefire (VueFire)
- **Auth:** Firebase Authentication (when enabled in vuefire config)

Project-specific rules — import order, Tailwind conventions, Vue patterns, post-edit checks — are in `.cursor/rules/`.

---

## MCP Tools

### Nuxt MCP Server

Use for Nuxt/Vue questions and documentation:

- **`list_documentation_pages`** — Use FIRST when exploring topics (e.g. data fetching, routing, composables)
- **`get_documentation_page`** — Use when you know the path (e.g. `/docs/4.x/getting-started/data-fetching`)
- **`get_getting_started_guide`** — Setup and overview
- **`list_modules`** / **`get_module`** — Module discovery and Nuxt 4 compatibility
- **`list_deploy_providers`** / **`get_deploy_provider`** — Only when user asks about deployment
- **`list_blog_posts`** / **`get_blog_post`** — Announcements (e.g. Nuxt 4)
- Do **not** use playground links for code written to project files

### Firebase MCP Server

Use for Firebase setup, Firestore, auth, and deployment:

- **`firebase_get_environment`** — Current project, auth, config
- **`firebase_update_environment`** — Set project dir, active project
- **`firebase_read_resources`** — Load guides (e.g. `firebase://guides/init/firestore`, `firebase://guides/init/firestore_rules`)
- **`firebase_init`** — Initialize Firestore, Auth, Hosting, etc.
- **`firebase_list_projects`** / **`firebase_list_apps`** — Project and app discovery
- **`firebase_get_sdk_config`** — Web/iOS/Android config
- For Firestore rules, schema design, or backend setup: read the relevant `firebase://guides/*` resource first.

---

## Firebase / Firestore

- **Never** run `drizzle-kit` or other Drizzle commands — this project uses Firestore, not Drizzle/SQL.
- **Firestore rules:** Use `firebase_read_resources` with `firebase://guides/init/firestore_rules` when working on security. Validate with Firebase tools before deploying.
- **Deploying backend** (Firestore rules, indexes): Use `firebase deploy --only firestore` (or equivalent) after user confirms. For full backend setup, follow `firebase://guides/init/backend`.
- **Deploying the web app:** Use the Firebase MCP deploy prompt or guide the user — do not assume static vs SSR; let the deploy flow determine hosting configuration.
