# CarDiscovery — Engineering Guardrails

CarDiscovery is a blue-chip car intelligence platform.
The product vision: the obvious way Australians decide what car to buy next.
Natural language recommendations. Pack-aware comparison. Live dealer stock.

Design north star: Goldman Sachs built a car discovery tool.

---

## How to Use This File

Read this file before touching any code.
If a proposed change conflicts with anything here, stop and ask.
Minimise surface area on every task.

---

## Product Vision

Three things no competitor does:

1. **Natural language discovery** — "I need something for a family of 5, under $60k, good on fuel" returns ranked, explained results.
2. **Pack-aware comparison** — users configure option packs and see real price and spec deltas, live.
3. **Live dealer routing** — from decision to the right dealer with stock, in one flow.

Every feature must serve one of these three things or it doesn't ship.

---

## Architecture Contract

The data pipeline is fixed. Do not reinterpret it.

### Public Data Flow

```
fetchLiveVehicles()
  → resolveAdminVehicle(base, variant?)
  → adminVehicleToStructuredVehicle(resolved, packVariants)
  → StructuredVehicle   ← canonical UI data shape
```

### Invariants

- BASE rows hold entry pricing and full specs.
- VARIANT rows represent trims (`admin_variant_kind = 'variant'`) or packs (`admin_variant_kind = 'pack'`).
- `admin_variant_kind` ∈ `{ blank, variant, pack }`. No other values.
- Packs attach by `base_id`. Trim selection must not remove packs unless explicit dependency rules apply.
- Tags live in `tags`. Never in `admin_variant_kind`.
- UI must never reimplement pack or trim resolution logic.
- Derived state > stored state. Single source of truth is `StructuredVehicle`.
- BASE rows must not appear as selectable trims when VARIANT rows exist. The BASE-derived default trim is only used when `engineVariants.length === 0`.
- Trims are always sorted by `price_aud` ascending. Null prices sort to the end.

If anything is unclear, assume the above is correct. Do not scan the repo to reinterpret this.

---

## Database Schema

Table: `admin_vehicles`

| Column | Type | Notes |
|--------|------|-------|
| id | text | Primary key. Format: `make-model-year` for BASE, `MAKE##-VARIANTCODE` for VARIANT |
| row_type | text | `'BASE'` or `'VARIANT'` — always uppercase |
| base_id | text | VARIANT rows reference their BASE row id |
| variant_code | text | Raw code e.g. `LONG_RANGE_RWD`. Never shown to users. |
| display_name | text | Human-readable trim name e.g. `'Long Range RWD'`. Always use this over variant_code in UI. Falls back to `variant_code` if null. |
| admin_variant_kind | text | `'pack'` for option packs, `'variant'` for trims, blank for BASE |
| status | text | `'live'` or `'archived'`. Only live rows are fetched. |
| price_aud | text | Price in AUD as string |
| specs | jsonb | Full spec object |
| packs_catalog_jsonb | jsonb | Pack definitions |
| make, model, year | text | Display fields |
| body_type | text | e.g. `'SUV'`, `'Sedan'`, `'Van'` |
| cover_image_url | text | Hero image |
| gallery_image_urls | text[] | Gallery images |

RLS policy: `admin_vehicles_all` allows authenticated users. `admin_vehicles_anon_read` allows anon SELECT. Both must exist for the app to function.

---

## Key Files

Do not open files not listed in a prompt. This map exists so you don't need to explore.

| File | Purpose |
|------|---------|
| `src/lib/liveVehicles.ts` | Fetches and transforms Supabase data into StructuredVehicle[]. All DB column selections live here. `LIVE_VEHICLE_SELECT_COLUMNS` controls what is fetched. |
| `src/admin/lib/adminResolver.ts` | Resolves BASE + VARIANT rows into a single structured record. Trim and pack logic lives here. |
| `src/admin/adminTypes.ts` | Type definitions for raw admin rows including `AdminVehicle`. |
| `src/types/specs.ts` | `StructuredVehicle` and all derived types. |
| `src/lib/specResolver.ts` | Spec resolution helpers. |
| `src/lib/ai.ts` | Anthropic API call via Supabase Edge Function. Uses plain fetch with VITE_SUPABASE_ANON_KEY as Bearer token. |
| `src/lib/prompts.ts` | Prompt templates for AI calls. |
| `src/components/Discovery.tsx` | Discovery page. AI search bar with typewriter placeholder cycling suggestions. |
| `src/components/VehicleDetailPage.tsx` | Profile page. |
| `src/components/ComparisonPage.tsx` | Comparison page. Imported directly in App.tsx — no shim file. |
| `src/components/GaragePage.tsx` | Garage page. |
| `src/components/config/VehicleConfigurationControls.tsx` | Trim and pack selector UI. |
| `src/App.tsx` | Page state switching via window events. No routing. |
| `src/lib/supabase.ts` | Supabase client. Pattern for reading env vars — copy this pattern exactly. |
| `supabase/functions/ai-recommend/index.ts` | Edge Function proxy for Anthropic API. Deployed, verify_jwt = false. |
| `.githooks/pre-commit` | Claude-powered code review on every commit. Requires `ANTHROPIC_API_KEY` in shell env (not VITE_ prefixed). |
| `vite.config.ts` | envPrefix: 'VITE_' is explicitly set. Do not remove. |

---

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | `.env` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` | Supabase anon key — safe to use in browser |
| `VITE_ANTHROPIC_API_KEY` | `.env` | Local tooling only — not used in browser calls |
| `ANTHROPIC_API_KEY` | Shell `~/.zshrc` | Used by git pre-commit hook and Claude Code |
| `ANTHROPIC_API_KEY` | Supabase secret | Used inside Edge Function via `Deno.env.get()` |

Supabase project ref: `dnmtnfeivwwhdqygdguv`

---

## AI Infrastructure

- Anthropic API is never called directly from the browser — always via Edge Function.
- Edge Function URL: `https://dnmtnfeivwwhdqygdguv.supabase.co/functions/v1/ai-recommend`
- Deploy command: `npx supabase functions deploy ai-recommend --no-verify-jwt`
- AI calls live in `src/lib/ai.ts`. No AI logic in components.
- Prompts live in `src/lib/prompts.ts`.

---

## Application Structure

Four pages. Exactly four. No more.

| Page | Component | Purpose |
|------|-----------|---------|
| Discovery | `Discovery.tsx` | Funnel — search, filter, AI recommend |
| Profile | `VehicleDetailPage.tsx` | Immersive — full spec, trim + pack config |
| Comparison | `ComparisonPage.tsx` | Analytical — side-by-side, live deltas |
| Garage | `GaragePage.tsx` | Quiet shortlist — saved vehicles |

No routing changes. No framework changes. No structural rewrites.
Navigation uses window events — do not replace with React Router or Context.

---

## Page Contracts

### Discovery
**Owns:** search, filters, AI recommendations, add-to-garage, navigate to Profile/Compare.
**Must not:** contain full spec tables, contain trim/pack logic, duplicate Profile layout, contain comparison UI.

### Profile
**Owns:** hero imagery, trim selection, pack configuration, full structured spec breakdown, AI summary, best-for / trade-offs, navigate to Compare.
**Must not:** contain side-by-side comparison, duplicate comparison tables.

### Comparison
**Owns:** two-column layout (always on desktop), sticky banner, trim + pack toggling, vertical structured comparison table, highlighted differences, live price delta updates.
**Must not:** collapse to one column on desktop, introduce discovery UI, use parallel selector state machines.

State derives only from `v1` and `v2`.

### Garage
**Owns:** saved shortlist, remove-from-garage, navigate to Profile/Compare.
**Must not:** become discovery, contain deep configuration, contain comparison tables.

---

## AI Integration

| Surface | Trigger | Output |
|---------|---------|--------|
| Discovery recommender | Natural language query | Ranked vehicle list with plain-English reasoning |
| Profile summary | Vehicle load | `ai_summary`, `best_for`, `trade_offs` |
| Comparison narrator | Both vehicles loaded | Plain-English "which is better for you" summary |

AI output is supplementary. App must function fully without it.
Always handle loading and error states. Never block UI on an AI call.

---

## Data Rules

- `StructuredVehicle` is the only data shape used in UI.
- `display_name` is the source of truth for user-facing trim names. Never show raw `variant_code`.
- When adding a new column to Supabase selects, add it to `LIVE_VEHICLE_SELECT_COLUMNS` in `liveVehicles.ts`.
- `seedDatabase()` has been removed. `seedData.ts` is migration reference only — must not be imported.
- BASE rows must not have `admin_variant_kind` set.

---

## Image Rules

| Context | Rule |
|---------|------|
| Discovery | Thumbnail only |
| Profile | Large hero + reel |
| Comparison | Compact thumbnail only |
| Garage | Thumbnail only |

Always include image fallbacks.

---

## Design System

Goldman Sachs built a car intelligence platform.

**Use:** clean whitespace, precise typography, muted purposeful colour, data hierarchy.
**Never:** loud colours, gradients, emoji, marketing copy, decorative chrome.

If it feels like carsales, reconsider it.

---

## Editing Discipline

Before any edit:
1. State the change in ≤ 5 bullets.
2. List every file to be modified.
3. Confirm no contracts above are violated.

**Never:**
- Rename core files
- Introduce routing
- Add global React contexts
- Replace state management
- Perform structural refactors
- Touch or open files not listed in the prompt

---

## Deterministic Mode

If a prompt begins with `Execution Mode`:
- Do not restate requirements
- Do not propose alternatives
- Do not scan additional files
- Modify only the named files
- Explanation ≤ 3 bullets

---

## Token Efficiency

This file exists to eliminate wasted tokens. Use it.

- Do not re-explain architecture documented here.
- Do not scan files to understand the codebase — use the Key Files table.
- Do not run exploratory bash commands to understand project structure.
- Do not ask questions answered here.
- Do not propose prohibited changes.
- If you need a column, type, or file location — check this file first.

---

## Definition of Done

- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] No console errors
- [ ] Page contracts preserved
- [ ] No files modified outside stated scope

---

## When Unsure

Implement the smallest reversible change. Do not refactor. Ask one concise question.