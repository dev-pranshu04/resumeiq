# ResumeIQ (React / TanStack Start build)

A Groq-powered resume analysis app: upload a resume, paste a job description, get a
structured ATS/job-match analysis, an interactive career roadmap, and grounded interview
preparation — all backed by real Groq calls with schema-validated output, not mock data.

This is a from-scratch functional rebuild on top of a Lovable-exported UI shell. The visual
design (tokens, layout, mascot, motion) came from that export; the upload flow, parsing,
Groq integration, state management, roadmap, interview prep, error handling, and tests were
built in this pass.

## Stack

- **TanStack Start** (React 19, file-based routing, server functions) on **Vite**
- **Tailwind CSS v4** with the existing OKLCH design-token system
- **Zustand** (+ `persist`) for client workspace state
- **Zod** for every AI input/output contract
- **pdfjs-dist** / **mammoth** for client-side PDF/DOCX text extraction
- **Vitest** for unit tests
- **Nitro (Vercel preset)** for deployment — this build target was changed from the
  Lovable-default Cloudflare preset; see "Why the Vercel preset" below.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and set GROQ_API_KEY
npm run dev
```

Scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build → `.vercel/output` |
| `npm run typecheck` | `tsc --noEmit`, strict mode |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit test suite (no network calls, Groq is mocked) |

## Architecture

```
src/lib/ai/schemas.ts            Zod contracts for every AI-generated shape
src/lib/ai/prompts.ts            Prompt builders — explicitly labels resume/JD as untrusted DATA
src/lib/ai/groq-client.ts        SERVER-ONLY: fetch, timeout, retry/backoff, JSON repair, validation
src/lib/ai/server-functions.ts   createServerFn wrappers — the only way the client reaches Groq
src/lib/parsing/resume-parser.ts Client-side PDF/DOCX/TXT text extraction + validation
src/store/workspace-store.ts     Zustand store: resume/JD/role inputs + async status per feature
src/routes/index.tsx             Landing page + real upload/JD/role flow
src/routes/analysis.overview.tsx ATS/job-match analysis (real Groq call, all states wired)
src/routes/roadmap.tsx           Career roadmap tree (real Groq call, desktop tree + mobile list)
src/routes/interview.tsx         Interview prep questions (real Groq call)
```

The Groq API key is read via `process.env.GROQ_API_KEY` only inside `groq-client.ts`, which
is only ever imported by `server-functions.ts`, which is only ever imported by route
components through `createServerFn` — so the key never reaches a client bundle. Verified by
grepping the production client build for the key and for `api.groq.com`: both absent.

### Why the Vercel preset

The Lovable export's shared Vite config defaults Nitro to the Cloudflare Workers preset. This
build pins `nitro.preset: "vercel"` in `vite.config.ts` so `npm run build` produces a real
`.vercel/output` directory out of the box, matching the deployment target you asked for.

### Prompt-injection handling

Resume text and job descriptions are user-uploaded, untrusted content. Every system prompt
wraps them in explicit `DATA` blocks and instructs the model never to treat their contents as
instructions — this is the mitigation if someone embeds "ignore previous instructions..." text
inside a resume or job posting.

### Error handling

Server functions never throw across the client/server boundary — they return a discriminated
union (`{ok:true,data}` / `{ok:false,errorKind,message}`), so the UI can render a specific,
honest state for config-missing vs. rate-limited vs. timed-out vs. bad-AI-output vs. network
failure, instead of one generic error screen. Every AI feature route has explicit empty,
loading (with `aria-busy`/`aria-live`), error-with-retry, and success states — no screen goes
blank during processing.

## What's real vs. what's an estimate (read this before demoing)

| Feature | Status |
|---|---|
| ATS / job-match scoring, skill gaps, missing keywords, prioritized fixes | ✅ Real Groq call, schema-validated, grounded in your actual resume text |
| Interview probability | ⚠️ Presented as a range with a confidence label, explicitly framed as an LLM-assisted estimate — never a guarantee |
| Career roadmap tree | ✅ Real Groq call, recursively validated against a Zod schema before rendering |
| Interview prep questions | ✅ Real Groq call, grounded in resume text; explicitly does not claim to evaluate voice/tone/delivery |
| Resume/DOCX/PDF parsing | ✅ Real client-side extraction (pdfjs-dist / mammoth), not a mock |
| Industry benchmarking, resume-twin generator, LinkedIn/portfolio analyzers, recruiter-persona simulator, application tracker, version manager, mascot FSM, full e2e/visual-regression/load-test suites | ❌ Not built in this pass — see Known Limitations |

## Feature checklist (against the original spec)

| # | Feature | Status |
|---|---|---|
| 1 | Resume upload & parsing (PDF/DOCX/TXT, drag-drop, validation, error states) | Complete |
| 2 | Job description input | Complete |
| 3 | ATS & job match analysis | Complete |
| 4 | Resume impact score / subscores | Complete (folded into analysis `scoreBreakdown`) |
| 5 | Recruiter attention simulation | Not implemented |
| 6 | Industry benchmarking | Not implemented |
| 7 | Missing skills predictor | Complete (folded into analysis `skillGaps`) |
| 8 | Interview probability estimate | Complete |
| 9 | AI career roadmap | Complete |
| 10 | Career intelligence graph | Not implemented (roadmap tree covers a subset of this) |
| 11 | Project quality analyzer | Not implemented |
| 12 | Resume version manager | Not implemented |
| 13 | Resume twin generator | Not implemented |
| 14 | LinkedIn profile optimizer | Not implemented |
| 15 | Portfolio analyzer | Not implemented |
| 16 | Recruiter persona simulator | Not implemented |
| 17 | Interview preparation | Complete |
| 18 | Application tracker | Not implemented |
| — | Mascot system (full FSM, 18 states) | Not modified — existing Lovable mascot component only |
| — | Full test pyramid (component/integration/e2e/visual-regression/load) | Only unit tests built (26 tests, schemas/parser/Groq-client logic) |

## Test report (this session)

```
npm run typecheck   → clean, 0 errors
npm run lint        → clean, 0 errors
npm run test        → 3 files, 26 tests, all passing (Groq fully mocked, no live calls)
npm run build       → succeeds, produces .vercel/output
```

Not run in this pass: component tests (React Testing Library), integration tests, Playwright
e2e, visual regression, accessibility audit tooling, load testing (k6/Artillery). These need
either a browser automation environment or a deployed preview URL that this sandbox doesn't
have; see Known Limitations for exact commands to run yourself.

## Deploying to Vercel

1. Push this project to a GitHub repo.
2. In Vercel: **New Project → Import** the repo.
3. Framework preset: Vercel should auto-detect Vite; if it doesn't, set:
   - Build command: `npm run build`
   - Output directory: `.vercel/output` (Nitro's vercel preset writes Vercel's native output format directly — leave this as Vercel's default detection if it offers "Other/Vite" with auto-detected output)
4. Add environment variables (Project Settings → Environment Variables):
   - `GROQ_API_KEY` — your Groq key, server-only
   - `GROQ_MODEL` — optional, defaults to `llama-3.3-70b-versatile`
5. Deploy.
6. Smoke test after deploy: upload a resume, paste a JD, confirm the analysis page loads real
   data (not stuck on loading/error). If you see a "config" error, double check the env var is
   set for the right environment (Production/Preview) and redeploy.

## Environment variables

| Variable | Required | Scope | Purpose |
|---|---|---|---|
| `GROQ_API_KEY` | Yes | Server-only | Groq API authentication. Never prefixed with `VITE_`, never sent to the client. |
| `GROQ_MODEL` | No | Server-only | Overrides the default model (`llama-3.3-70b-versatile`) without a code change. |

## Known limitations (honest, by design)

- **Live Groq calls were never executed from the build sandbox** — its network egress
  allowlist doesn't include `api.groq.com`. Every layer (retry, timeout, JSON repair, schema
  validation) was built defensively and covered by mocked unit tests, but you should do a real
  smoke test locally or on a Vercel preview before trusting it fully.
- **10 of the 18 originally-specified features are not built**: recruiter attention
  simulation, industry benchmarking, career intelligence graph, project quality analyzer,
  resume version manager, resume twin generator, LinkedIn optimizer, portfolio analyzer,
  recruiter persona simulator, application tracker. This pass focused on a solid core (upload →
  analysis → roadmap → interview prep) rather than shipping all 18 shallowly.
- **The mascot's full 18-state FSM was not built** — the existing Lovable mascot component
  (idle/cursor-follow visuals) was left as-is and not wired to analysis events (scan/celebrate/concerned).
- **No persistent backend** — workspace state (resume text, JD, role) persists to
  `localStorage` across a refresh, but there's no server-side database, so nothing survives
  across devices/browsers. A real version manager or application tracker would need one
  (e.g. Vercel Postgres / Supabase) — out of scope for this pass.
- **No component/integration/e2e/visual-regression/load tests** were written. Commands to add
  them yourself: React Testing Library for components, Playwright (`npm create playwright`)
  for e2e, and k6/Artillery against a mocked endpoint for load — none of this was run here.
- **No formal accessibility audit** (axe/Lighthouse) was run against a live server in this
  sandbox; the new UI uses semantic elements, `aria-live`/`aria-busy` on loading states, and
  keyboard handling on the roadmap tree, but hasn't been verified against WCAG 2.2 AA with
  tooling.
- **pdfjs-dist and mammoth get bundled into the server function's chunk list** even though
  they're only dynamically imported client-side — this is normal Rollup code-splitting output
  for an SSR app, not a functional bug, but it's worth trimming later if Vercel function size
  becomes a concern.
