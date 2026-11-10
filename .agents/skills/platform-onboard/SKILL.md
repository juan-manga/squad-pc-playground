---
name: platform-onboard
description: Bring an existing project onto the Plain Concepts Platform. For a Platform family app, adopt the Kitchen-Sink template with Copier, guided by its platform contract (.platform/contract.yml), and converge each capability onto it (preflight, adopt, converge, quality gates, template sync); for an own design app, migrate one domain at a time. Use when the user says "onboard this project", "join the family", "adopt the Kitchen-Sink template", "adopt platform standards", "migrate to Platform Foundations", or wants to add pnpm, a Next.js static export, shadcn/ui, FSD with Steiger, inversify-hooks, react-i18next, Biome, or OpenSpec to an existing project. Also use when another skill needs the onboarding sequence or its preflight checks.
---

# Platform Onboard

Bring an existing project onto the Plain Concepts Platform. There are two routes, and the first decision is which one applies.

- **Route A, join the family.** The app becomes a member of the Platform app family: its platform code (session and auth, permissions, audit, feature flags, errors, security headers, the API surfaces, the web shell) comes from the Kitchen-Sink template with Copier and stays identical to the other members. This is the default for a Platform product app with a .NET API and a web app. It needs read access to `PlainConceptsPlatform/Kitchen-Sink`, which is private.
- **Route B, own design.** The app keeps its own platform code and adopts the Platform conventions domain by domain. Use it when the app cannot share the family's platform code (a different backend, no web app, a library), or when Kitchen-Sink is not accessible.

For a repository with no code yet, use `platform-new-project` instead. For a change to platform code after the app has joined, use `platform-upstream`.

The rules both routes implement are in Foundations `ai/ARCHITECTURE.md`: "Platform family" (ownership, the platform contract, conformance, upstream first), "API surfaces", "REST", and the frontend and backend sections. Read them before starting.

On Route A the template's `.platform/contract.yml` is the authority, not a remembered list of paths: `owned` is what the template writes and owns, `reuse` is what the app must read and import instead of keeping its own, `source.changes` is where a change to an owned path is asked for, `exceptions` names the app's exceptions file, and `sync` says how the app takes the next version. Read it at the latest tag before A1:

```bash
gh api "repos/PlainConceptsPlatform/Kitchen-Sink/contents/.platform/contract.yml?ref=<tag>" -H "Accept: application/vnd.github.raw"
```

Kitchen-Sink also ships `.platform/manifest`, one owned glob per line. It is a legacy mirror of `owned` for older tool versions; read the contract.

## Scope

This skill targets **consumer Platform applications**, not the Foundations repository itself.

Foundations deliberately fails some of these checks, and that is correct rather than a gap to close: it keeps its canonical docs in `ai/` (so the docs site can sync them into a Reference section), it publishes the theme rather than consuming it, and it has no `pages/` or `entities/` layers because it is a docs site and two packages, not a product app. Do not "fix" the foundation to satisfy a checklist written for the apps that depend on it.

## Route A: adopt the Kitchen-Sink template

Five steps, in order, each as its own pull request (or a series of them for step 3).

```text
A1. PREFLIGHT     binary checks + a capability inventory, nothing changed
A2. ADOPT         copier copy --overwrite: owned paths in, app untouched, build green
A3. CONVERGE      one capability at a time onto the platform code, app copy deleted
A4. QUALITY GATES quality-gates, platform-template and the gates CI, floors in quality.config.json
A5. TEMPLATE SYNC the contract's sync.update for every new template tag, conformance checked
```

### A1. Preflight

Scan before touching anything. Each check is binary. Record the results in the OpenSpec change that opens the adoption, so the person sees the whole gap.

| Check | How to detect | Pass condition |
|---|---|---|
| Template access | `git ls-remote https://github.com/PlainConceptsPlatform/Kitchen-Sink.git 'refs/tags/v*'` | Lists tags. If it fails, stop: take Route B or ask for access |
| Copier | `copier --version` | 9.4 or newer (`pipx install copier`) |
| Not yet adopted | `.platform/contract.yml` and `.copier-answers.yml` absent | Absent. If present, the app has joined: go to A5 |
| Layout | `apps/api/` holds the .NET solution with `Directory.Packages.props`; `apps/web/` is the pnpm web package | Both present. A different layout is moved first, as its own change |
| Web shape | `apps/web/next.config.*` has `output: "export"`, the root `app/page.tsx` mounts the SPA, react-router routes it, FSD layers in `apps/web/src/` with `pages/` and an empty root `apps/web/pages/.gitkeep` | All true. Otherwise run Route B domain 4 for the web first |
| Harness | `.opencode/harness.json` exists | Present (Route B domain 1) |
| Workflows | `.github/workflows/work-router.yml` carries the `Managed by @plainconceptsplatform/workflows` header | Present (Route B domain 5) |
| Characterization tests | Integration tests over sign-in, permissions, audit and the error contract; Playwright over the main routes | Present and green. They are what proves each convergence step kept behaviour |
| Clean tree | `git status --porcelain` | Empty, on a new branch |

Then write the **capability inventory**: one row per family module (auth and session; users, roles and permissions; settings; audit log; email; impersonation; MCP; changelog; health; security headers; rate limiting; i18n; web shell; section feature flags; guided tour; B2B), with the path of the app's own implementation or "missing". This list drives A3.

### A2. Adopt

```bash
copier copy --trust --overwrite -d app_name=<Name> -d app_slug=<name> --vcs-ref <latest v* tag> https://github.com/PlainConceptsPlatform/Kitchen-Sink.git .
```

Copier writes the paths the contract lists under `owned` (the contract itself, the neutral platform paths `apps/api/src/Platform/**` and `apps/web/src/shared/platform/**`, `Directory.Packages.Platform.props`, `docs/platform/`, the capability specs, the deploy workflows and the `Dockerfile`) and `.copier-answers.yml`, and nothing else. Check it with `git status`: a changed file outside `owned` means the template is misconfigured, so stop and report it at `source.changes`.

Then make the adoption build, in the same pull request:

1. Import `Directory.Packages.Platform.props` from `Directory.Packages.props`, and make the web package take its platform dependencies from `catalog:platform`. Remove the app's own versions of those packages.
2. Reference the platform projects from the API and add the app-side pieces the platform code reads through its ports: the permission catalog, the feature catalog, the audit event list. These are app files.
3. Leave the app's own implementations in place and running. Nothing switches over yet.
4. If an owned file cannot coexist with the app yet, do **not** edit it. Restore the app's file, and add the path to the exceptions file the contract names (`.platform/exceptions.yml`) with a reason, an issue at `source.changes` and an `expires` date.

The pull request is green when the app builds and its existing tests pass with the platform code present but unused.

### A3. Converge, one capability at a time

Each capability is its own OpenSpec change and pull request. A suggested order, which keeps every step small:

1. Errors (the exception hierarchy and the ProblemDetails envelope), because every later step returns errors.
2. Auth and session (the BFF cookie session and CSRF), then users, roles and permissions.
3. Audit log.
4. Security headers, crawler rules and rate limiting.
5. Section feature flags, settings, email, impersonation, health.
6. i18n and the web shell (layout, sidebar, theme provider and anti-flash script, tour, changelog).
7. The API surfaces: MCP (2026-07-28, Entra and Forge tokens only, no session and no own OAuth server) and B2B (`/api/b2b/v1`, Entra app tokens with app roles, closed until `B2B:Roles` grants a role).
8. REST: every endpoint to HAL-FORMS (`_links` and `_templates` keyed by action name, correct verbs, `201` with `Location`, RFC 9457 problems with `code` and `traceId`, `ETag`/`If-Match` with 412 and 428, link pagination, state transitions as noun sub-resources), and the SPA rendering its actions from `_templates`. The route-by-route method is in the template's `docs/platform/rest-hal-forms.md`.

Before converging a capability, read what the contract's `reuse.docs` say about it, and replace the app's own components with the exports of the `reuse.packages` packages rather than keeping a local copy.

For each capability:

1. Run the characterization tests and keep them as they are; they are the contract.
2. Move every caller onto the platform code.
3. Delete the app's own implementation completely: endpoints, ports, implementations, entities and their migration, seeded permissions, web routes and menu items, tests and specs that described the old version. A half-removed copy compiles and misleads the next agent.
4. Remove the capability's paths from the exceptions file, if they were there.
5. The tests pass, unchanged except where the platform contract deliberately differs (an error code, a status code); each such difference is listed in the change.

When the platform code lacks something the app needs, that is not a reason to edit it here. Use `platform-upstream`: the change goes to Kitchen-Sink first, or the app carries a dated exception until it does.

#### Capability checks

Run these when a capability is converged and again after every template sync. Each is binary, and a failure is the app's file to fix, never an owned path.

| Capability | Check | Pass condition |
|---|---|---|
| Readiness | `GET /api/v1/ready` on a running replica; the `AddReadinessProbe` registrations; `SMOKE_TOKEN_PRE` and `SMOKE_PATHS` in workflows, environments and docs | `200 {"status":"ready"}`, one probe for each read the old smoke covered, and no smoke secret, path list or Entra smoke role left anywhere |
| Deploy environments | The GitHub environments the deploy uses, and the repository variables `PRE_ENVIRONMENT` and `PRO_ENVIRONMENT` | The variables are unset when the environments are `pre` and `pro`, and name the real ones otherwise, matching the identity's federated credential |
| Proxies | `Platform:TrustedProxies` and `Platform:ForwardLimit` in `appsettings.json`; `ASPNETCORE_FORWARDEDHEADERS_ENABLED` in the Dockerfile, the workflows and the environment | Set for a deployed app (`0.0.0.0/0,::/0` and `2` for an internal Container Apps instance behind the shared Application Gateway, `1` or an IP restriction for an external ingress), empty in `appsettings.Development.json`, and the ASP.NET Core flag nowhere |
| Sessions | A test that changes a person's roles; implementations of `ITokenRevocationStore` | The old token answers 401 and a refresh carries the new roles; `IsRevokedAsync` takes the stamp |
| Transactions | The app's own transaction or retry wrappers | Gone: every business write and its audit event run in `SerializableTransaction`, and a test that fails the first attempt leaves one audit event and a chain that verifies |
| Anonymous pages | Every SPA route outside `RequireAuth` | Each path prefix is in `Platform:AnonymousPages`, and an anonymous visitor to it does not land on the Entra sign-in |
| SSO cookies | Whether the app protected its SSO state and login hint under purposes of its own before joining | `Platform:LegacySsoPurposes:State` and `Platform:LegacySsoPurposes:Hint` set once, with a note to remove them after 90 days |
| Framing | Whether the SPA frames content served from its own origin | `Csp:AllowSameOriginFrames=true` only then, and no middleware ordering trick for the headers |
| Audit actions | The action names in the app's audit history against the platform's defaults | Where they differ, a `PlatformAuditActions` is passed to `AddPlatformInfrastructure`, so a filter by action finds all the history |
| MCP sections | Tools and resources of sections behind a flag | Declared with their section; served to the people it is on for, and one that declares no section is not served |
| Reading everything | Hand-written page loops on the server and the web | `PagedResults.ReadAllAsync` and `allItems`; tests over InMemory that need a 412 add `InMemoryRowVersions.Instance` |
| Web shell | The app's own mark and tours | `logo` and a list of scoped tours passed to the shell; no copy of the shell |
| Web tests and lint | Vitest `setupFiles`, `steiger.config.ts`, `biome.json` | The platform `test-support/setup.ts` is listed, `platformSteiger` is imported, no override for the platform folder remains, and the app's `test-support` wraps the platform helpers |
| Dockerfile | Extra web packages that ship inside the API | Each has a `build:image` script, and the app's `Dockerfile` exception is gone |

### A4. Quality gates

```bash
npx @plainconceptsplatform/workflows add --template quality-gates
npx @plainconceptsplatform/workflows add --template platform-template
npx @plainconceptsplatform/workflows add --template app-ci-dotnet-next
```

`quality-gates` installs the gate scripts, the facet builder, the Semgrep hygiene rules, `.jscpd.json` and the `.zap/` rules, managed by the workflows package. `platform-template` installs the template sync and the conformance guard, both driven by the contract. `app-ci-dotnet-next` is the gates CI with the `Platform conformance` job; it is the app's once installed, so merge it with the app's own CI rather than replacing that blindly. Move the app's coverage and mutation floors out of its own scripts into `quality.config.json`, keep its complexity and duplication baselines and its triaged DAST alerts as app files, and delete the app's own copies of the scripts. The floors do not move down: keep the measured values the app already had.

### A5. Template sync

For every new Kitchen-Sink tag, the `Platform: Template sync` workflow runs the contract's `sync.update` and opens one pull request; by hand it is the same command:

```bash
copier update --trust --defaults --conflict inline
```

One pull request per tag, through the same gates as any change. An owned file the app had changed comes back with `<<<<<<< before updating` / `>>>>>>> after updating` markers: take the template's side, or, if the app's side is the better code, move it upstream with `platform-upstream`. Then check conformance with `node scripts/check-platform-conformance.mjs --compare`: every owned path identical to the version `sync.version` records, except live exceptions.

#### Known pitfalls

- **Duplicated test-support trips the duplication gate.** An app that copies the platform's fixtures and render helpers into its own `test-support` gives `check-duplication` a clone of an owned file. Delete the copy and wrap the platform helpers (`me`, `renderWithProviders`, `t`, the rest) with the app's fixtures and defaults. A baseline entry or an exception for it is the wrong fix.
- **The `.sh` executable bit is lost on Windows.** Git on Windows does not keep the mode of a file it did not set, so a script written or restored there is committed as `100644` and fails in CI with `Permission denied`. Check with `git ls-files -s '*.sh'` and fix with `git update-index --chmod=+x <script>`, on the template's scripts and on the app's.
- **The Copier cache path on Windows.** Copier clones the template into a cache directory under the user's profile, and the template's deep paths can pass the 260-character limit there, so `copier copy` or `copier update` fails on a long path. Turn on `git config --global core.longpaths true`, or point `TEMP` and `TMP` at a short folder such as `C:\t` for the command. Run it from a short checkout path too.
- **An app behaves differently without `Platform:TrustedProxies` set.** Unset, the platform trusts nothing: the address is the ingress's, so the sign-in rate limit is shared by every caller and one client can lock everyone out, and the scheme stays `http`, which reaches the MCP protected resource metadata when `Mcp:PublicBaseUrl` is unset. It also differs between environments, since development leaves it empty. When a deployed app behaves unlike the local one (429s on sign-in, `http` URLs in metadata), check this setting before anything else.

### Route A is complete when

- The version the contract's `sync.version` points at (`_commit` in `.copier-answers.yml`) is the latest template tag.
- Every owned path is identical to that tag, except entries in the exceptions file, each with a reason, an issue and an `expires` date that has not passed.
- The capability inventory has no app-owned implementation left.
- The quality-gates and platform-template templates are installed and the floors live in `quality.config.json`.
- Every capability check above passes, and none of the known pitfalls is present.
- The app's `ARCHITECTURE.md` describes the app's own domain and links to the `reuse.docs` paths for the platform capabilities, and `AGENTS.md` carries the harness's "Reuse before you build" block (agent-harness 3.8.0 or later).
- Route B domains 1, 2, 3, 5 and 6 pass (harness, docs, OpenSpec, workflows, .NET guardrails).

## Route B: own design, one domain at a time

Six domains, each with binary preflight checks. Start at the first failing check and work down.

```text
1. AGENTIC INFRA          Platform Harness + .opencode/ + agents + skills
2. ARCHITECTURE DOCS      ARCHITECTURE.md + DESIGN.md + guardrails
3. OPENSPEC               openspec/ change management
4. FRONTEND STACK         pnpm -> Next static export -> Tailwind v4 -> shadcn
                           -> Biome -> FSD + Steiger -> inversify-hooks
                           -> react-i18next -> Platform theme
5. AGENT AUTOMATION       one work router owning every trigger, gh-aw markdown
                           workers on agents-arc with engine: opencode
                           against Forge, the quality-gates template
6. BACKEND GUARDRAILS     (if .NET) build hygiene, arch tests, Aspire, search engines
```

Domains 1 through 3 are prerequisites for 4 and 5. Domain 6 runs in parallel with 4 for .NET projects.

### Domain 1: Agentic infra

| Check | How to detect | Pass condition |
|---|---|---|
| Harness config | `.opencode/harness.json` exists | File present with valid JSON |
| Agent definitions | `.opencode/agents/` has at least 3 `.md` files | frontend, backend, fullstack |
| Command definitions | `.opencode/commands/` has `.md` files | At least init, plan-propose, plan-apply |
| Root AGENTS.md | `AGENTS.md` exists at repo root | File present, references agent files |

Run `npx @plainconceptsplatform/agent-harness@latest` in the repository root, then `/repo-initialize`. On a repository that already has the harness, `npx @plainconceptsplatform/agent-harness@latest update` pulls in the current release and preserves files edited by hand.

### Domain 2: Architecture docs

| Check | How to detect | Pass condition |
|---|---|---|
| ARCHITECTURE.md | `ARCHITECTURE.md` exists | Not a placeholder (more than 10 lines) |
| DESIGN.md | `DESIGN.md` exists | Not a placeholder (more than 10 lines) |
| Project guardrails | `.agents/skills/pc-guardrails-project/SKILL.md` exists | Present when project guardrails are used |

Run `/make-architecture`, `/make-design` and `/make-guardrails`. They are idempotent; re-run them after any significant codebase change.

### Domain 3: OpenSpec

| Check | How to detect | Pass condition |
|---|---|---|
| OpenSpec config | `openspec/config.yaml` exists | File present |
| Archive directory | `openspec/changes/archive/` exists | Directory present |

Run `openspec init`. Each domain below is its own OpenSpec change; do not batch domains into one change.

### Domain 4: Frontend stack

| Check | How to detect | Pass condition |
|---|---|---|
| pnpm | `pnpm-lock.yaml` exists, no `package-lock.json` or `yarn.lock` | Single lockfile, pnpm |
| Next.js static export | `next.config.*` sets `output: "export"`; one page mounts the SPA; react-router routes it | Next is the build shell, not the router |
| Tailwind v4 | CSS file contains `@import "tailwindcss"` | v4 syntax, not v3 `@tailwind` directives |
| shadcn/ui | `components.json` exists | Config present with style + aliases |
| Biome | `biome.json` exists, no `eslint.config.*` other than a complexity-only one | Biome is the linter and formatter |
| FSD structure | `src/app/`, `src/pages/`, `src/shared/` exist; slices use canonical segments (`pages/x/ui/XPage.tsx`) | Canonical layer names, no `views/` |
| Root pages guard | Empty `pages/.gitkeep` next to the root `app/` | Next does not read `src/pages` as its Pages Router |
| Steiger | `steiger.config.*` exists and `lint:fsd` runs in CI | FSD boundaries fail the build |
| inversify-hooks | `inversify-hooks` in deps + a composition root under `src/app/providers/` | DI container registered |
| react-i18next | `react-i18next` + `i18next` in deps + message files exist | i18n infrastructure in place |
| Platform theme | `@plainconceptsplatform/ui-theme` in deps | Tokens package installed |
| Platform components | `@plainconceptsplatform/ui-components` in deps (optional) | Shared components installed |
| Section feature flags | `FeatureProvider` from `@plainconceptsplatform/ui-components/feature-flags` at the app root (only when the app has sections in development) | Unfinished sections are flagged |

This is the largest domain. Read `references/frontend-migration.md` before starting. The steps run in a strict order, each as its own OpenSpec change, with Playwright characterization tests captured before the first one and run after every step:

```text
pnpm -> Next.js static export -> Tailwind v4 -> shadcn/ui -> Biome -> FSD + Steiger -> inversify-hooks -> react-i18next -> Platform theme
```

### Domain 5: Agent automation

The Platform default is **GitHub Agentic Workflows installed by `@plainconceptsplatform/workflows`**, with `engine: opencode` pointed at the Forge gateway, on the self-hosted `agents-arc` runner fleet. That fleet serves private and internal repositories only.

| Check | How to detect | Pass condition |
|---|---|---|
| Work Router | `.github/workflows/work-router.yml` carries the `Managed by @plainconceptsplatform/workflows` header | One package-managed router present |
| Workers | Each `agent-*.md` declares `workflow_call` and no public trigger | Router owns every entry point |
| Runner wiring | Each `.md` sets both `runs-on` and `runs-on-slim` | Framework jobs land on the same runner |
| Engine | Each `.md` sets `engine.id: opencode` with `OPENAI_BASE_URL` pointed at Forge | Traffic reaches the gateway |
| Compiled locks | Each `.md` has a committed `.lock.yml` | Actions runs what the source says |
| Quality gates | The `quality-gates` template is installed and `quality.config.json` holds the floors | The engineering gates run from the managed scripts |

1. Run `gh aw init --no-mcp --no-skill --no-agent`. The flags suppress Copilot Chat scaffolding that Platform does not use.
2. Install the router, workers, composite actions, compile script and `opencode.ci.json` with `npx @plainconceptsplatform/workflows` (the TUI) or `npx @plainconceptsplatform/workflows@latest add <routes>`, and the gates with `add --template quality-gates`. Do not copy files by hand: `workflows update` refreshes package-managed files and keeps each worker's `env:` block.
3. Add the per-repository `FORGE_API_KEY`, plus the organization `BOT_APP_ID` and `BOT_PRIVATE_KEY` secrets for the Platform App.
4. Set each worker's `env:` values (`VERIFY_COMMANDS`, `REPO_RULES` and the other repository-owned rules), `CI_WORKFLOW_NAME` and a free `AUDIT_CRON` slot in the router, and make the CI's last job dispatch the merge train (`dispatch-merge-train` in the package's CI templates). The `workflow-consumer` skill from `PlainConceptsPlatform/agentic-workflows` covers each value.
5. Compile with `node scripts/compile-agent-workflows.mjs`, never bare `gh aw compile`, and **watch one real event end to end**. The compiler and actionlint both pass on workflows that produce zero jobs at runtime.

Never attach a self-hosted runner, the `agents-arc` fleet included, to a public repository: a pull request from a fork would execute arbitrary code on it. For a repository that is not on GitHub, [loop-task](https://github.com/PlainConceptsPlatform/loop-task) runs the same work on a schedule.

### Domain 6: Backend guardrails (.NET only)

Skip if there are no `.csproj` or `.slnx` files.

| Check | How to detect | Pass condition |
|---|---|---|
| Directory.Build.props | Exists at the solution root | Build defaults configured |
| Central Package Management | `Directory.Packages.props` exists | CPM enabled |
| .editorconfig | Exists at root, `EnforceCodeStyleInBuild` on | Code style rules fail the build |
| Architecture tests | A test project with NetArchTest layer rules | Layer direction enforced |
| Aspire AppHost | An `*.AppHost` project exists | Local orchestration is Aspire |
| ServiceDefaults | An `*.ServiceDefaults` project exists and the API references it | Telemetry and health defaults shared |
| AppHost dev script | Root `package.json` `dev` script runs the AppHost | One command starts the whole system |
| No docker-compose | No `docker-compose.yml` at repo root | The AppHost is the only composition |
| Noindex header | A middleware registered first sets `X-Robots-Tag` | `X-Robots-Tag: noindex, nofollow` on every response, including static files and errors |
| robots.txt switch | `/robots.txt` served behind `Robots:DisallowAll` | `Disallow: /` when on; switched on only after the noindex header is live (new hostnames: from day one) |
| No anonymous content at the root | Request `/` without a session | Redirects to the Entra ID sign-in |

Add the noindex header first and ship it before switching robots.txt on. For a repository still orchestrating locally with docker-compose, the move to Aspire is one OpenSpec change: add `{Project}.ServiceDefaults` and `{Project}.AppHost` (SQL Server with a persistent lifetime and data volume, the API with `.WithReference(...).WaitFor(...)`, the web app through `AddPnpmApp` on its fixed dev port), switch EF Core to the Aspire client integration, delete the compose files, and point the root `dev` script at the AppHost.

### Route B is complete when

Every preflight check across all six domains passes. Verify by re-running the full scan and confirming zero failures.

## Key rules

Each rule comes from a real migration. Skipping one causes rework.

1. Capture characterization tests before migrating anything. Playwright screenshots and integration tests catch regressions that review misses.
2. Every domain, and every converged capability, is a separate OpenSpec change. Batching makes review impossible.
3. In a family app, never edit a path the contract lists under `owned`. Change it in Kitchen-Sink first, or record a dated exception (`platform-upstream`).
4. FSD layers use canonical names: `app/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`, with canonical segments. No `views/`, no underscore-prefixed layers.
5. Next.js builds a static export (`output: "export"`) served by the API; react-router decides routes. There are no server components or route handlers in a Platform web app.
6. inversify-hooks registration passes `cid` as the second argument to `addSingleton`: `container.addSingleton<IContract>(HttpContract, cid.IContract)`. The container is built at module load in a client module, never inside `useEffect`.
7. react-i18next from the first day. Zero magic strings.
8. Biome is the linter and formatter. Remove ESLint config before adding Biome, except a complexity-only ESLint config the quality gates use.
9. Platform theme packages are public npm packages; no custom registry or token.
