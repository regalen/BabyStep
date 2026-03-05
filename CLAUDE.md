# BabyStep — Claude Context

## Project
Self-hosted baby tracker PWA. Next.js 16 app in this directory (`/app`).

## Stack
- **Next.js 16** — App Router, TypeScript, Turbopack (`npm run dev`)
- **SQLite** via `better-sqlite3` + **Drizzle ORM**
- **better-auth** for local credential auth (`@better-auth/drizzle-adapter`)
- **Tailwind CSS v4** + **Shadcn UI**
- **@ducanh2912/next-pwa** — disabled in dev, enabled in prod
- **Docker** — Alpine, standalone output

## Dev Commands
```bash
npm run dev               # start dev server (Turbopack)
npx drizzle-kit push      # sync schema changes to SQLite
npx drizzle-kit studio    # browse DB in browser
npm run build             # production build
docker compose up         # run via Docker on port 3000
```

## Key Files
| File | Purpose |
|------|---------|
| `lib/db/schema.ts` | All Drizzle table definitions |
| `lib/db/index.ts` | SQLite singleton (WAL mode, path `./data/babystep.db`) |
| `lib/auth.ts` | better-auth config |
| `lib/auth-client.ts` | Client-side auth helpers (signIn, signUp, signOut, useSession) |
| `lib/units.ts` | Metric/imperial conversion (formatVolume, parseVolumeToMl, formatWeight, etc.) |
| `lib/time.ts` | formatDistanceToNow, formatDuration, formatTime, toDatetimeLocal |
| `proxy.ts` | Next.js 16 route guard (replaces middleware.ts) |
| `app/globals.css` | CSS custom properties — warm light mode, charcoal/slate dark mode |
| `components/app/DashboardProvider.tsx` | Global context: activeBaby, settings, patchSettings |
| `components/app/ThemeProvider.tsx` | Dark/light toggle, persisted in localStorage |
| `drizzle.config.ts` | Points to `./data/babystep.db` |

## Database Tables
`user`, `session`, `account`, `verification` — better-auth managed
`babies` — userId FK, firstName, lastName, dob, birthWeightGrams
`feedings` — babyId FK, type, side, amountMl, startTime, endTime, notes
`diapers` — babyId FK, type, color, notes, timestamp
`sleeps` — babyId FK, startTime, endTime, notes
`medications` — babyId FK, name, dosage, timestamp, notes
`milestones` — babyId FK, title, date, notes
`appSettings` — userId FK (unique), units, formulaOnly, enabledActivities (JSON string)
`medicationPresets` — babyId FK, name, defaultDosage (nullable)

## Routes
| Path | Description |
|------|-------------|
| `/setup` | First-time install wizard (4 steps: account → baby → units → activities) |
| `/login` | Sign in |
| `/` | Home dashboard |
| `/feeding` | Log feeding |
| `/diaper` | Log diaper |
| `/sleep` | Sleep timer |
| `/medication` | Log medication |
| `/milestones` | Log milestone |
| `/settings` | App settings |

## API Routes (`app/api/`)
- `auth/[...all]` — better-auth handler
- `setup` — GET: `{ needsSetup: true/false }`
- `babies` — GET / POST
- `feedings`, `diapers`, `sleeps`, `medications`, `milestones` — GET / POST (sleeps also PATCH)
- `app-settings` — GET / POST / PATCH
- `medication-presets` — GET `?babyId=` / POST / DELETE `?id=`

## Architecture Notes
- **`proxy.ts`** (not `middleware.ts`) — Next.js 16 convention; must `export default function proxy(...)`
- **`DashboardProvider`** — client component wrapping all dashboard pages; provides `activeBaby` (localStorage-persisted), `settings` (fetched from `/api/app-settings`), and `patchSettings`
- **Units** — always stored as metric (ml, grams) in DB; converted at display/input layer via `lib/units.ts`
- **`enabledActivities`** — stored as JSON string in SQLite, parsed/stringified at API boundary
- **Sleep timer** — persisted across browser close via `localStorage` key `babystep-active-sleep`
- **Active baby** — persisted via `localStorage` key `babystep-active-baby`
- PWA requires `turbopack: {}` in `next.config.ts` to avoid webpack conflict

## Important Gotchas
- `@better-auth/drizzle-adapter` is a separate npm package — import from there, not `better-auth/adapters/drizzle`
- DB path: `./data/babystep.db` in dev; `/data/babystep.db` in Docker (mounted volume)
- Set `BETTER_AUTH_SECRET` env var in production
- After any schema change: run `npx drizzle-kit push`
