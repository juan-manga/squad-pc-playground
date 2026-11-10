# Frontend Migration Checklist

Linear migration path for bringing a brownfield frontend onto the Platform stack. Each step is a separate OpenSpec change. Steps must run in order: each one depends on the previous.

Route A (joining the family) uses steps 1, 2, 5 and 6 to give the web app the shape the template expects before `copier copy`; the theme wiring, the shell and the platform DI registrations then arrive with the template in `src/shared/platform/`. Route B (own design) runs every step.

## Before starting

Capture Playwright characterization tests for every existing route. Take desktop (1280x720) and mobile (375x812) screenshots in light and dark themes. These are the visual parity baseline. No migration step is complete until these tests pass.

## Step 1: pnpm workspace

**Detect:** `pnpm-lock.yaml` does not exist, or `package-lock.json` / `yarn.lock` exists alongside it.

**Actions:**

1. Add `packageManager: "pnpm@10.x"` to root `package.json`.
2. Create `pnpm-workspace.yaml` with package globs (e.g. `apps/*`, `packages/*`).
3. Platform packages are public npm packages. No custom registry or package token is required.
4. Delete `package-lock.json` and `yarn.lock`.
5. Run `pnpm install` to generate `pnpm-lock.yaml`.
6. Update all CI workflows to use `pnpm/action-setup` before `setup-node`.
7. Convert all npm workspace scripts to `pnpm -r` or `pnpm --filter` syntax.

**Completion criterion:** Single `pnpm-lock.yaml`, no competing lockfiles, `pnpm install` succeeds, CI passes.

## Step 2: Next.js static export

**Detect:** No `next.config.*` file, or the project uses Vite/CRA.

**Actions:**

1. Add `next` and `react` / `react-dom` as dependencies.
2. Create `next.config.ts` with `output: "export"` and `images: { unoptimized: true }`.
3. Create `app/layout.tsx` that loads the fonts and a theme script (`public/theme-init.js`) before first paint, so dark mode does not flash.
4. Create `app/page.tsx` as a client component that mounts the existing SPA root (`App.tsx`) with `ssr: false`.
5. Add an empty `pages/.gitkeep` next to the root `app/` folder, so Next never reads `src/pages` (the FSD layer, step 6) as its Pages Router.
6. Replace `VITE_API_BASE_URL` with `NEXT_PUBLIC_API_BASE_URL` (production value: `/api/v1`), so the bundle has no environment-specific input.
7. Update `vite-env.d.ts` to Next.js type references.
8. Remove Vite devDeps: `@vitejs/plugin-react`, `vite`.
9. Change dev/build scripts to `next dev` / `next build`.
10. React Router stays as the client-side router. Next.js is the build shell only, and the API serves `out/` from the same origin.

**Completion criterion:** `pnpm build` produces `out/` directory, existing routes render with visual parity, Playwright tests pass.

## Step 3: Tailwind CSS v4

**Detect:** CSS file contains `@tailwind base; @tailwind components; @tailwind utilities;` (v3 syntax) or no Tailwind at all.

**Actions:**

1. Add `tailwindcss` and `@tailwindcss/postcss` as devDependencies.
2. Create `postcss.config.mjs` with the `@tailwindcss/postcss` plugin.
3. In the main CSS file, replace `@tailwind` directives with `@import "tailwindcss"`.
4. Define theme tokens in a `@theme` block using OKLCH values. Use semantic names: `--color-background`, `--color-foreground`, `--color-primary`, `--color-muted`, `--color-border`, `--color-ring`.
5. Set up dark mode with `@custom-variant dark (&:where(.dark, .dark *))`.
6. Add base styles in an `@layer base` block.

**Completion criterion:** Tailwind v4 classes render, dark mode toggles, no v3 `@tailwind` directives remain, build passes.

## Step 4: shadcn/ui

**Detect:** No `components.json` file.

**Actions:**

1. Create `components.json` with:
   - `style`: `"new-york"`
   - `rsc`: `false` (the SPA is not RSC)
   - `tsx`: `true`
   - Tailwind config aliases matching the FSD structure (step 6)
2. Add shadcn components as source files under `src/shared/ui/`. Start with: Button, Input, Label, Dialog, DropdownMenu, Select, Table, Card, Badge, Avatar, Separator, Skeleton, Popover, Tooltip, ScrollArea.
3. Icons: an own design app uses lucide-react (shadcn default). A family app uses Tabler (`@tabler/icons-react`) and aliases the few shadcn recipes that import Lucide, such as the calendar, to Tabler.
4. Create a `cn()` utility under `src/shared/lib/utils.ts` using `clsx` + `tailwind-merge`.
5. Migrate existing custom UI primitives to shadcn compositions. Use `Alert` for callouts, `Empty` for empty states, `Separator` for dividers, `Skeleton` for loading.
6. Do not override shadcn component colors or typography via `className`. Use `className` for layout only.

**Completion criterion:** `components.json` present, shadcn components render, existing UI replaced with shadcn compositions, Playwright tests pass.

## Step 5: Biome

**Detect:** `eslint.config.*` exists, or no `biome.json` exists.

**Actions:**

1. Add `@biomejs/biome` as a devDependency.
2. Create `biome.json` with formatter and linter config. Single quotes, 120 width.
3. Remove ESLint config and devDependencies.
4. Change lint scripts from `eslint` to `biome check`. Rename `lint:biome` to `lint`, `lint:biome:fix` to `lint:fix`.
5. Run `pnpm lint:fix` to auto-format the codebase.
6. Add Biome check step to CI.

**Completion criterion:** `biome.json` present, no ESLint config, `pnpm lint` passes, CI passes.

## Step 6: Feature-Sliced Design + Steiger

**Detect:** No `src/app/` directory, or flat `src/components/` / `src/pages/` structure.

**Actions:**

1. Create canonical FSD layers: `src/app/`, `src/pages/`, `src/widgets/`, `src/features/`, `src/entities/`, `src/shared/`. Do not use underscore-prefixed names or a renamed `views/` layer.
2. Move app-level code into `src/app/`:
   - Providers, router config, global styles into `src/app/providers/` and `src/app/styles/`.
3. Move page components into `src/pages/<page-name>/ui/` with an `index.ts` barrel per slice, e.g. `src/pages/claims/ui/ClaimsPage.tsx`.
4. Move large composite blocks used across pages into `src/widgets/<widget-name>/`.
5. Move reusable user interactions into `src/features/<feature-name>/`.
6. Move domain models used across multiple pages into `src/entities/<entity-name>/`.
7. Move infrastructure (UI kit, API client, utils, auth) into `src/shared/` with segments: `shared/ui/`, `shared/api/`, `shared/lib/`, `shared/auth/`, `shared/config/`.
8. Each slice gets an `index.ts` public API. External consumers import from the barrel, never from internal files.
9. Add `steiger.config.ts` with `@feature-sliced/steiger-plugin`. Enable: `forbidden-imports`, `no-public-api-sidestep`, `no-cross-imports`.
10. Add `lint:fsd` script: `steiger src`.
11. Add Steiger check step to CI.
12. Update `tsconfig.json` path aliases: `@/*` mapping to `src/*`.

**Domain-based file naming.** Name files after the business domain, not technical role. Use `user-dto.ts`, not `types.ts`. Use `format-currency.ts`, not `utils.ts`. Catch-all files (`constants.ts`, `types.ts`, `utils.ts`, `helpers.ts`, `config.ts`) are banned.

**Completion criterion:** FSD layers present with barrels, Steiger passes, CI passes, no flat `src/components/` dir and no route files outside `src/pages/` remain.

## Step 7: inversify-hooks

**Detect:** `inversify-hooks` not in `package.json` dependencies, or no composition root file.

**Actions:**

1. Add `inversify-hooks` as a dependency (it bundles inversify). Do not add `inversify` or `reflect-metadata` directly.
2. Define API contract interfaces in `src/shared/api/contracts/`. One interface per bounded context. Each interface declares the methods the frontend needs from that context.
3. Implement HTTP contracts in `src/shared/api/contracts/http/`. Each implementation uses the existing API client's `request<T>` method.
4. Create a composition root in `src/app/providers/composition-root.ts`:
   ```typescript
   import { container, cid } from 'inversify-hooks';

   export function buildContainer(): void {
     container.addSingleton<IQuoteContract>(HttpQuoteContract, cid.IQuoteContract);
     container.addSingleton<IAccountContract>(HttpAccountContract, cid.IAccountContract);
     // ...one per contract
   }
   ```
5. Call `buildContainer()` at the top level of a `'use client'` module that the root layout imports. Never inside `useEffect`.
6. Create a thin `DIProvider` component that calls `buildContainer()` and renders children:
   ```tsx
   'use client';
   import { buildContainer } from '@/app/providers/composition-root';
   buildContainer();
   export function DIProvider({ children }: { children: React.ReactNode }) {
     return <>{children}</>;
   }
   ```
7. Migrate components from direct `api` imports to `useInject`:
   ```tsx
   const [quoteContract] = useInject<IQuoteContract>(cid.IQuoteContract);
   ```
8. Decorators are optional; the family apps use none. If the app does use `@injectable()`, `tsconfig.json` needs `experimentalDecorators: true` and `useDefineForClassFields: false`.
9. Remove the legacy `api` singleton import after all consumers are migrated.

**Minification safety.** Always pass `cid.IContract` as the second argument to `addSingleton`. The default id is `Symbol(constructor.name)`, which minifiers mangle. The `cid` constant returns a stable cached symbol that survives minification.

**Completion criterion:** All components resolve dependencies via `useInject`, no direct `api` imports in components, build passes, tests pass.

## Step 8: react-i18next

**Detect:** `react-i18next` or `i18next` not in `package.json` dependencies, or hard-coded English strings in JSX.

**Actions:**

1. Add `react-i18next` and `i18next` as dependencies.
2. Create `src/shared/config/i18n.ts` with i18next initialization:
   ```typescript
   import i18n from 'i18next';
   import { initReactI18next } from 'react-i18next';
   import en from '@/shared/config/locales/en.json';

   i18n.use(initReactI18next).init({
     resources: { en: { translation: en } },
     lng: 'en',
     fallbackLng: 'en',
     interpolation: { escapeValue: false },
   });
   ```
3. Create translation JSON files in `src/shared/config/locales/`. Start with `en.json`. Organize by namespace: `common`, `nav`, `quotes`, `auth`, `settings`, `errors`.
4. Wrap the app root with the i18n provider. Initialize i18next before the first render.
5. Replace every hard-coded user-facing string with `<Trans>` or `useTranslation().t()` calls. Every label, title, tooltip, placeholder, error message, button text, `aria-label`, toast, and heading.
6. Add a Biome-compatible or CI check that flags hard-coded strings in JSX. No magic strings after migration.
7. Run `@humanizer` on all translation text to remove AI writing patterns.

**Completion criterion:** Zero hard-coded English strings in JSX, i18n initialized, translation JSON complete, build passes, no lint errors.

## Step 9: Platform theme and components

**Detect:** `@plainconceptsplatform/ui-theme` not in `package.json` dependencies.

**Actions:**

1. Install `@plainconceptsplatform/ui-theme`; install `@plainconceptsplatform/ui-components` when the app uses shared components such as `PlainLogo`. In a family app both come from the pnpm `platform` catalog (`catalog:platform`), with the platform `ThemeProvider` and anti-flash script in `src/shared/platform/`.
2. In the global stylesheet, import `@plainconceptsplatform/ui-theme`. The package supplies Tailwind v4, semantic tokens, base styles, and the dark-mode variant.
3. Use the semantic utility tokens directly. Do not create a parallel token layer or hardcode design values.
4. Load the Outfit font via `next/font/google` and expose it as `--font-sans` in the root layout.
5. Toggle the `dark` class on `<html>` for dark mode, set before first paint by an external script, so the content security policy needs no inline-script exception.
6. Replace custom `BrandMark` / logo components with `PlainLogo` from `@plainconceptsplatform/ui-components`.
7. Remove now-redundant custom CSS that the Platform theme replaces.

**Completion criterion:** Platform theme installed, semantic tokens are used, Outfit font loads, dark mode works, Playwright visual tests pass with updated baselines.

## After migration

1. Re-run all Playwright characterization tests. Update baselines only for intentional visual changes.
2. Run `pnpm lint`, `pnpm test`, `pnpm build`. All must pass.
3. Run Steiger: `pnpm lint:fsd`. Must pass.
4. Update `ARCHITECTURE.md` and `DESIGN.md` via `/make-architecture` and `/make-design` to reflect the migrated stack.
5. Update `pc-guardrails-project` via `/make-guardrails` to include the frontend discipline rules (FSD, inversify-hooks, react-i18next, no magic strings, no catch-all files, no comment slop).
