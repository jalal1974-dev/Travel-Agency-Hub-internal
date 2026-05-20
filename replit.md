# الجود للسياحة والسفر — AL JUDE Travel Internal Portal

Internal employee web system for AL JUDE Travel & Tourism. Employees log in to access all 15 destination dashboards, update pricing, and export customer-facing PDFs with internal financial data automatically hidden.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/travel-portal run dev` — run the React portal (port 25433)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Default Accounts

| Username   | Password   | Role     |
|------------|------------|----------|
| admin      | admin123   | مدير (Admin)     |
| employee   | emp123     | موظف (Employee)  |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui
- API: Express 5 + express-session + bcryptjs
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/travel-portal/src/` — React shell (login, sidebar, iframe viewer)
- `artifacts/api-server/src/routes/auth.ts` — Login/logout/me endpoints
- `artifacts/api-server/src/routes/pages.ts` — Dashboard HTML serving with injected print CSS
- `artifacts/api-server/public/dashboards/` — All 15 HTML dashboard files
- `lib/db/src/schema/users.ts` — Users table (username, password_hash, role)
- `lib/api-spec/openapi.yaml` — API contract

## Architecture decisions

- HTML dashboard pages are served as-is by the API server with a single injected `<style>` block for print security — no redesign, no component conversion.
- Print CSS uses `@media print` to hide `.settings`, `.breakdown`, `.bar`, `.controls-bar` (all internal cost panels) automatically — employees just click the print button.
- Sessions are managed server-side with `express-session` using the `SESSION_SECRET` environment variable.
- The React shell wraps each dashboard in a sandboxed `<iframe>` — this guarantees zero visual interference with the original HTML designs.
- The iframe uses `sandbox="allow-scripts allow-same-origin"` so the dashboard JavaScript (pricing calculators) still works.

## Product

- Employee authentication (admin and employee roles)
- Unified sidebar navigation across all 15 destination dashboards
- Each dashboard loads inside an iframe — preserving exact original layout, styling, and JavaScript calculators
- Smart print/PDF button that automatically hides all internal cost data (ticket costs, profit margins, transport costs) via CSS `@media print` rules injected server-side
- "مؤمّن للطباعة" (print-secured) indicator in the toolbar
- 7-day session persistence

## User preferences

- DO NOT redesign or modify the HTML dashboard files — they are production-ready templates
- Keep all 15 dashboards exactly as-is visually
- Internal financial data must never appear in print/PDF output

## Gotchas

- The HTML dashboards use CDN-loaded resources (Tailwind, icon fonts) — they require an internet connection to render properly
- The iframe `sandbox` attribute allows scripts and same-origin, which is needed for the pricing calculators in the dashboards
- Sessions use memory store — employees will need to re-login after server restart in production (consider switching to connect-pg-simple for persistence)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
