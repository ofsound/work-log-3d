# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Lint & type checking

This project uses **ESLint** (`@nuxt/eslint`), **Prettier**, and **TypeScript** (with `vue-tsc`). The Nuxt app is typechecked with `nuxi typecheck`; **Electron** main/preload and shared modules use a separate project (`tsconfig.electron.json` via `npm run typecheck:electron`).

One command runs static checks (typecheck for Nuxt + Electron, ESLint, Prettier):

```bash
npm run check
```

To auto-fix lint and formatting where possible:

```bash
npm run check:fix
```

**Full verification** (everything in `check`, plus unit tests):

```bash
npm run verify
```

**Unused dependencies and dead exports** ([Knip](https://knip.dev)):

```bash
npm run knip
```

Individual steps: `npm run typecheck`, `npm run typecheck:electron`, `npm run lint` / `npm run lint:fix`, `npm run format` / `npm run format:fix`, `npm run test`.

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
