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

- Project creation lives at `/project/new`; project and tag pages live at `/project/:segment`, `/project/:segment/edit`, and `/tag/:segment`. In-app links use each entity’s **slug** (`slug || id` fallback); the segment may still be a Firestore document id (e.g. old bookmarks). Sessions still store **project** and **tags** by document id.
- `/project/:segment` is query-driven like `/sessions`: the default `List` mode omits `mode`, `Calendar` persists `mode=calendar`, and both modes preserve `date=YYYY-MM-DD` for the selected project day context
- `/sessions` is a single route with query-driven state: `mode=day|week|month|year|list` and `date=YYYY-MM-DD`; `mode=list` can also persist personal filters with `q`, `projects`, `tags`, `tagMode`, `from`, `to`, `min`, `max`, `untagged`, `notes`, and `sort`
- `/reports` is the authenticated saved-report workspace; `/r/:token` is the anonymous client-facing published report route
- `/settings` is the authenticated user settings workspace for synced appearance/workflow preferences and desktop-only alert sound controls
- Each project and tag has a `slug` derived from its name; URLs prefer it for readability while Firestore keeps using document ids
- Project slug `new` is reserved so `/project/new` always points to the create workspace
- Projects and tags cannot be deleted while sessions still reference them
- Shared validation lives in `shared/worklog/validation.ts`
- Firestore rules in `firestore.rules` must match the current document shape
- Theme preference is stored in `localStorage` per Firebase user, with a guest fallback before auth resolves
- Appearance and workflow settings are stored in Firestore at `users/{uid}/settings/preferences`, while desktop alert sounds stay local to each Electron install

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

Import the legacy public worklog into the default account:

```bash
npm run import:legacy
```

Useful options:

```bash
npm run seed:demo -- --dry-run
npm run seed:demo -- --end-date 2026-03-21 --seed 240321
npm run seed:demo -- --email seeds@modernthings.net
npm run import:legacy -- --dry-run
npm run import:legacy -- --email ben@modernthings.net
```

By default the seeder:

- resolves `seeds@modernthings.net` with Firebase Auth
- deletes `users/{uid}/timeBoxes` first, then `projects`, then `tags`
- writes a deterministic 14-day dataset with 10 projects, 5 tags, and realistic multi-hour daily sessions

The seed command is destructive only within the targeted user's worklog collections. It does not create auth users and it does not use or store the account password.

The legacy import uses the same Firebase Admin credentials for the destination project and reads the source dataset from the public Firestore REST API for `work-log-3806c`. It preserves existing target-user data, reuses existing projects and tags when the normalized name matches, and writes legacy sessions with deterministic document IDs so reruns stay additive and idempotent.

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

Standalone macOS app bundle for local dogfooding:

```bash
npm run electron:dist
```

`electron:build` only compiles the desktop renderer, preload, and main-process assets into `dist-electron/`.
`electron:dist` runs that build and then packages an unsigned macOS `.app` bundle into `release/mac-*/Work Log.app` for the current host architecture.
The packaged macOS app strips unused camera, microphone, audio-capture, and Bluetooth usage-description keys from its final `Info.plist` so the bundle does not advertise permissions the app does not use.

The desktop shell loads the renderer from a fixed localhost origin (`http://127.0.0.1` with a stable port, default `47821`, written to `electron-renderer-port.json` under the app user data directory if a different port had to be chosen). That keeps Firebase Auth’s browser storage keyed to the same origin between launches so you stay signed in after quitting. You can override the port with the `ELECTRON_RENDERER_PORT` environment variable.

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
  notes: string
  colors: {
    primary: string
    secondary: string | null
  }
}
```

New projects are created from `/project/new`, where the initial notes and curated color pair are chosen before the first save. Existing legacy projects without saved metadata fall back to a deterministic palette in the UI until they are edited and saved.

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

`tags` may be empty when a user enables the project-first workflow mode and hides tag UI.

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

`users/{uid}/dailyNotes/{yyyy-mm-dd}`

```ts
{
  content: Record<string, unknown> // Tiptap / ProseMirror JSON document
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

`users/{uid}/settings/preferences`

```ts
{
  appearance: {
    fontImportUrl: string
    fontFamilies: {
      ui: string
      data: string
      script: string
    }
    backgroundPreset: 'grid' | 'dots' | 'crosshatch' | 'aurora'
  }
  workflow: {
    hideTags: boolean
  }
}
```

`publicReports/{token}`

Server-managed published report snapshots for anonymous client access. The top-level document stores the frozen report snapshot metadata, while detailed session rows are written to a `sessionRows` subcollection so large reports stay within Firestore document limits.

## Sessions Views

- `Day` is the default `/sessions` experience and uses a focused single-day timed calendar with keyboard navigation
- On desktop, Day view keeps the right sidebar open with a private per-day scratchpad; selecting a session or drag-creating a new one swaps that sidebar to the contextual session tab until you return to the scratchpad
- `List` is a live-filter workspace with URL-synced search over notes, project names, and tag names, plus project/tag/date/duration filters and list-specific sorting
- `Week` uses a Monday-first timed grid with live today/now indicators, drag-to-create, drag-to-move, and resize handles
- `Month` uses a Monday-first month grid with compact session chips and day drill-down into Day mode
- `Year` uses a Monday-first contribution heatmap in mini months from the current month backward to the first month that has logged sessions (no future months), with day drill-down into Day mode
- Calendar deep links are preserved with route queries such as `/sessions?mode=week&date=2026-03-21`
- Week and Month both query Firestore by interval overlap so overnight sessions render in every affected day without changing the stored document shape

## Project Views

- `/project/new` is a create-only workspace with the same metadata form as edit, but no List/Calendar/Edit tabs until the project has been saved
- `List` is the default `/project/:segment` experience and keeps the existing grouped-by-day project session history
- `Calendar` is a long-scroll month stack from the current month back to the first logged month for that project only, with no prev/next navigation
- Project calendar state is shareable via route queries such as `/project/my-project-slug?mode=calendar&date=2026-03-21`
- The project calendar sidebar can open either the selected day’s sessions or an individual session editor without leaving the page

## Reports

- `/reports` lets authenticated users save named report drafts with a date range, timezone, project filters, tag filters, and a plain-text summary
- Project filtering is union-based because each session stores one project; tag filtering supports `any` or `all`
- When both project and tag filters are selected, the report can combine them with `intersection` or `union`
- When project-first mode hides tags, existing tag-based report data is preserved but tag editing controls are removed from the authenticated workspace
- Reports clamp session totals to the selected date range in the chosen timezone, so overnight sessions are split accurately across days
- Publishing creates or refreshes a frozen public snapshot at `/r/:token`; unpublishing removes the public snapshot without deleting the private draft
- Public reports include the summary, total hours, project/tag breakdowns, daily and weekly rollups, and individual session notes

## Repo Layout

- `app/`: Nuxt app pages, components, composables, middleware, utilities
- `electron/`: Electron main and preload processes
- `shared/worklog/`: shared domain logic, validation, timer behavior, repository contracts
- `tests/`: Vitest unit tests and Firestore rules tests
- `.cursor/rules/`: repo-specific agent/coding rules
