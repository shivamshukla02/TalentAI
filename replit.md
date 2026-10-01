# TalentAI

TalentAI reads resumes in the browser, compares candidates with job requirements, ranks match signals, and suggests job searches based on detected skills.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/talentai/src/App.tsx` — resume upload, analysis views, candidate ranking, and job suggestions.
- `artifacts/talentai/src/lib/analyzer.ts` — local document extraction, heuristic matching, and role catalog.
- `artifacts/talentai/src/index.css` — styles adapted from the supplied resume-analyzer demo.
- `artifacts/talentai/index.html` — browser title and social metadata.

## Architecture decisions

- Resume files are parsed in browser memory. Resume text is not sent to the API server or saved.
- Scores are transparent keyword/experience heuristics, not model-generated employment decisions.
- Job links open an external search; listings and availability are not fetched or verified by TalentAI.

## Product

- Accepts PDF, DOCX, and TXT resumes, including multi-resume batches.
- Extracts skills, education, contact details, experience signals, and requirement overlap.
- Ranks candidates against an optional job title and description.
- Suggests roles by skill overlap and opens current job searches in a separate tab.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
