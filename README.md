# Work Log 3D

Work Log 3D is a Nuxt 4 + Vue 3 time-tracking app with a Firebase-backed web UI and an Electron desktop shell. The shared timer and worklog domain logic live in `shared/worklog`, while the app UI lives under `app/` and the Electron host lives under `electron/`.

## Stack

- Nuxt 4
- Vue 3
- TypeScript
- Tailwind CSS v4
- Pinia
- @nuxtjs/color-mode
- Firebase Authentication
- Firestore via `nuxt-vuefire`
- Electron
- Vitest

## Key Conventions

- Project and tag pages use stable ID-based routes: `/project/:id` and `/tag/:id`
- `/sessions` is a single route with query-driven state: `mode=day|week|month|year|list` and `date=YYYY-MM-DD`; `mode=list` can also persist personal filters with `q`, `projects`, `tags`, `tagMode`, `from`, `to`, `min`, `max`, `untagged`, `notes`, and `sort`
- `/reports` is the authenticated saved-report workspace; `/r/:token` is the anonymous client-facing published report route
- `slug` is stored for display and backward-compatibility redirects only
- Projects and tags cannot be deleted while sessions still reference them
- Shared validation lives in `shared/worklog/validation.ts`
- Firestore rules in `firestore.rules` must match the current document shape
- Theme preference is stored in `localStorage` per Firebase user, with a guest fallback before auth resolves

## Setup

Install dependencies:

```bash
npm install
```

Create a local env file:

```bash
cp .env.example .env
```

Fill in the Firebase web app config values from Firebase Console.

If you want SSR auth support for the web target, provide Firebase Admin credentials locally as well:

- Set `GOOGLE_APPLICATION_CREDENTIALS` to a service account JSON path, or
- Provide the equivalent credential configuration in your deployment environment

The demo seeder uses the same Firebase Admin credentials. It resolves an existing auth user by email and rewrites only that user's Firestore subtree.

## Development

Web app:

```bash
npm run dev
```

Electron app:

```bash
npm run electron:dev
```

Seed the dedicated demo account:

```bash
npm run seed:demo
```

Useful options:

```bash
npm run seed:demo -- --dry-run
npm run seed:demo -- --end-date 2026-03-21 --seed 240321
npm run seed:demo -- --email seeds@modernthings.net
```

By default the seeder:

- resolves `seeds@modernthings.net` with Firebase Auth
- deletes `users/{uid}/timeBoxes` first, then `projects`, then `tags`
- writes a deterministic 14-day dataset with 10 projects, 5 tags, and realistic multi-hour daily sessions

The seed command is destructive only within the targeted user's worklog collections. It does not create auth users and it does not use or store the account password.

## Verification

Static checks:

```bash
npm run check
```

Auto-fix lint and formatting:

```bash
npm run check:fix
```

Unit tests:

```bash
npm run test
```

Firestore rules tests:

```bash
npm run test:rules
```

This requires a local Java runtime because the Firestore emulator runs on Java.

Full verification:

```bash
npm run verify
```

Unused dependency/export scan:

```bash
npm run knip
```

## Builds

Web production build:

```bash
npm run build
```

Electron production build:

```bash
npm run electron:build
```

Static generate preview:

```bash
npm run preview
```

## Firestore Data Shape

`users/{uid}/projects/{projectId}`

```ts
{
  name: string
  slug: string
}
```

`users/{uid}/tags/{tagId}`

```ts
{
  name: string
  slug: string
}
```

`users/{uid}/timeBoxes/{timeBoxId}`

```ts
{
  startTime: Timestamp
  endTime: Timestamp
  notes: string
  project: string
  tags: string[]
}
```

`users/{uid}/reports/{reportId}`

```ts
{
  title: string
  summary: string
  timezone: string
  filters: {
    dateStart: string
    dateEnd: string
    projectIds: string[]
    tagIds: string[]
    groupOperator: 'intersection' | 'union'
    tagOperator: 'any' | 'all'
  }
  shareToken: string
  createdAt: Timestamp
  updatedAt: Timestamp
  publishedAt: Timestamp | null
}
```

`publicReports/{token}`

Server-managed published report snapshots for anonymous client access. The top-level document stores the frozen report snapshot metadata, while detailed session rows are written to a `sessionRows` subcollection so large reports stay within Firestore document limits.

## Sessions Views

- `Day` is the default `/sessions` experience and uses a focused single-day timed calendar with keyboard navigation
- `List` is a live-filter workspace with URL-synced search over notes, project names, and tag names, plus project/tag/date/duration filters and list-specific sorting
- `Week` uses a Monday-first timed grid with live today/now indicators, drag-to-create, drag-to-move, and resize handles
- `Month` uses a Monday-first month grid with compact session chips and day drill-down into Day mode
- `Year` uses a Monday-first contribution heatmap arranged into mini months for every year since the first logged session, with day drill-down into Day mode
- Calendar deep links are preserved with route queries such as `/sessions?mode=week&date=2026-03-21`
- Week and Month both query Firestore by interval overlap so overnight sessions render in every affected day without changing the stored document shape

## Reports

- `/reports` lets authenticated users save named report drafts with a date range, timezone, project filters, tag filters, and a plain-text summary
- Project filtering is union-based because each session stores one project; tag filtering supports `any` or `all`
- When both project and tag filters are selected, the report can combine them with `intersection` or `union`
- Reports clamp session totals to the selected date range in the chosen timezone, so overnight sessions are split accurately across days
- Publishing creates or refreshes a frozen public snapshot at `/r/:token`; unpublishing removes the public snapshot without deleting the private draft
- Public reports include the summary, total hours, project/tag breakdowns, daily and weekly rollups, and individual session notes

## Repo Layout

- `app/`: Nuxt app pages, components, composables, middleware, utilities
- `electron/`: Electron main and preload processes
- `shared/worklog/`: shared domain logic, validation, timer behavior, repository contracts
- `tests/`: Vitest unit tests and Firestore rules tests
- `.cursor/rules/`: repo-specific agent/coding rules
