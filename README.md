# Work Log 3D

Work Log 3D is a Nuxt 4 + Vue 3 time-tracking app with a Firebase-backed web UI and an Electron desktop shell. The shared timer and worklog domain logic live in `shared/worklog`, while the app UI lives under `app/` and the Electron host lives under `electron/`.

## Stack

- Nuxt 4
- Vue 3
- TypeScript
- Tailwind CSS v4
- Pinia
- Firebase Authentication
- Firestore via `nuxt-vuefire`
- Electron
- Vitest

## Key Conventions

- Project and tag pages use stable ID-based routes: `/project/:id` and `/tag/:id`
- `slug` is stored for display and backward-compatibility redirects only
- Projects and tags cannot be deleted while sessions still reference them
- Shared validation lives in `shared/worklog/validation.ts`
- Firestore rules in `firestore.rules` must match the current document shape

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

## Development

Web app:

```bash
npm run dev
```

Electron app:

```bash
npm run electron:dev
```

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

## Repo Layout

- `app/`: Nuxt app pages, components, composables, middleware, utilities
- `electron/`: Electron main and preload processes
- `shared/worklog/`: shared domain logic, validation, timer behavior, repository contracts
- `tests/`: Vitest unit tests and Firestore rules tests
- `.cursor/rules/`: repo-specific agent/coding rules
