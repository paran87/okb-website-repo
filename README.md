# OKB Command Center

Enterprise GIS command-and-control platform for the **Department of Public Works
and Highways (DPWH)** — real-time monitoring for **Oplan Kontra Baha** (flood
control), designed to operate like a National Emergency Operations Center.

> **Phase status — Foundation (Prompt #2).** This build establishes the
> production architecture, application shell, theming, shared component library,
> state/data infrastructure, auth foundation, and API structure. **No business
> features are implemented yet**, and the Prisma schema is intentionally empty.
> Operational modules (flood monitoring, critical areas, equipment, etc.) are
> delivered in later phases — their routes, navigation, and RBAC entries are
> already wired into the shell.

---

## 1. Folder structure

```text
app/                      # Next.js App Router
  (command)/              # Authenticated shell route group
    layout.tsx            # Sidebar + Header + responsive main
    page.tsx              # Dashboard
    flood-monitoring/ … settings/   # One route per sidebar module
  api/                    # Route handlers (health, auth)
  error.tsx global-error.tsx not-found.tsx loading.tsx
components/
  ui/                     # Shared, generic component library
  layout/                 # Shell pieces (sidebar, header, logo, theme toggle)
  error-boundary.tsx
features/                 # Feature-first modules (13), each self-contained:
  <feature>/components|hooks|services   types.ts   index.ts
hooks/                    # Cross-feature React hooks (toast, overlay)
providers/                # App/theme/query providers
services/                 # Application service base layer
lib/
  api/                    # response, errors, handler, client, repository
  auth/                   # Auth.js config, instance, guards
  config/                 # navigation, icons
  env/                    # server + client env validation (Zod)
  logger/  rbac/  store/  validation/  constants.ts
types/                    # Global types (auth, api, geo)
utils/                    # cn, format, geo, storage, theme, validation
styles/                   # globals.css (theme tokens, typography, glass)
prisma/                   # schema.prisma (empty), configured for PostGIS
public/
```

**Feature-first** organization keeps each domain (`incident`, `equipment`, …)
self-contained with its own `components/`, `hooks/`, `services/`, and `types`.
Unrelated features never import each other; shared building blocks live in
`components/ui`, `lib`, and `utils`.

## 2. Architecture decisions

- **Feature-first + layered.** UI (components) → hooks → services → repositories
  → Prisma. Route handlers call services only; services orchestrate
  repositories. This enforces separation of concerns and keeps business logic
  out of React.
- **Server Components by default.** The root layout is a Server Component; all
  client providers are isolated behind `providers/app-providers.tsx`.
- **Typed, fail-fast configuration.** `lib/env/*` validate environment variables
  with Zod at boot, split into server-only and `NEXT_PUBLIC` client schemas.
- **Semantic theming via CSS variables.** Light/dark tokens are declared once and
  exposed to Tailwind through `@theme inline`, so every utility is theme-aware.
- **RBAC by permission, not role.** Navigation and guards check fine-grained
  permissions (`resource:action`) mapped from roles, so the access matrix can
  change without touching call sites.
- **Consistent API envelope.** All handlers return a uniform
  `{ success, data | error }` shape with correlation IDs and structured logging.

## 3. Installed packages

**Runtime:** next, react, react-dom, @prisma/client, next-auth (v5),
@tanstack/react-query, zustand, zod, react-hook-form, next-themes, lucide-react,
framer-motion, recharts, maplibre-gl, pino, clsx, tailwind-merge, bcryptjs,
server-only.

**Tooling:** typescript, tailwindcss (+ @tailwindcss/postcss), eslint (+
typescript-eslint, @next/eslint-plugin-next, eslint-plugin-react-hooks),
prettier (+ prettier-plugin-tailwindcss, @ianvs/prettier-plugin-sort-imports),
prisma, pino-pretty, tsx.

## 4. Configuration files

| File | Purpose |
| --- | --- |
| `tsconfig.json` | Strict TypeScript, `@/*` path aliases, bundler resolution |
| `eslint.config.mjs` | Flat ESLint config (Next + TS + hooks) |
| `.prettierrc.json` | Formatting + import sorting + Tailwind class sorting |
| `next.config.ts` | Standalone output, security headers, external packages |
| `postcss.config.mjs` | Tailwind v4 PostCSS pipeline |
| `styles/globals.css` | Theme tokens, typography tokens, glassmorphism |
| `.env.example` | Documented environment template |
| `prisma/schema.prisma` | PostgreSQL + PostGIS datasource (no models yet) |
| `Dockerfile` / `docker-compose.yml` / `nginx/` | Container + reverse proxy |

## 5. How to run the project

Prerequisites: **Node ≥ 20.9**, and PostgreSQL+PostGIS (via Docker).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env         # then edit values (AUTH_SECRET, DATABASE_URL, …)

# 3. Start the database (PostGIS) via Docker
docker compose up -d db

# 4. Sync the (empty) schema — resets local dev DB to match
npm run db:push

# 5. Run the dev server
npm run dev                  # http://localhost:3000
```

Quality gates:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run build        # production build
```

> **Prisma note:** the schema has no models yet, so the Prisma client is not
> generated. When you add the first model, run `npm run db:generate`, create the
> client singleton (see `lib/db/README.md`), and restore `prisma generate` in the
> `build` script and Dockerfile.

## 6. Why each decision was made

- **Next.js 16 App Router + React 19** — Server Components, streaming, and
  route-level error/loading boundaries reduce client JS and match modern
  conventions.
- **Feature-first structure** — scales to many modules without cross-coupling;
  each team can own a feature folder end-to-end.
- **Zod-validated env** — misconfiguration fails at boot with a clear message
  instead of surfacing as opaque runtime errors.
- **next-themes + CSS variables** — reliable, flash-free light/dark switching
  with persisted preference and zero prop drilling.
- **Zustand + React Query** — clear split between ephemeral UI state (client) and
  server cache state; avoids overloading a single global store.
- **Auth.js v5 foundation without login** — session types, RBAC, guards, and the
  middleware entry point are ready so protection can be switched on in one place
  once the login flow is built.
- **Empty Prisma schema** — establishes the data platform (PostgreSQL + PostGIS)
  and access-layer abstractions before committing to a domain model, keeping the
  foundation phase free of premature business decisions.

---

**DPWH · Oplan Kontra Baha — OKB Command Center**
