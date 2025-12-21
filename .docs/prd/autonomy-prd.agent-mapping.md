# Autonomy PRD: Agent Mapping (PRD Roles ↔ Repo Reality)

Scope: reconcile the “Agent 0–5” roles in `.docs/prd/autonomy-prd.md` with how this repo actually structures automation:
- **Agents** live under `.agents/<agent-name>/` and return **structured output** (TypeScript types) with validation/idempotency expectations (see `.agents/README.md`).
- **Model Policy**: All decision-making agents MUST use `gemini-3-flash-preview` with **Thinking Level: MEDIUM**.
- **Entrypoints** are typically `scripts/morning-routine/tasks/*.ts` and orchestrate filesystem, Hugo content, R2/CF, and agent calls.

## Mapping table

| PRD Role | PRD Name | Current repo module(s) | Current status | Gaps / alignment needed |
|---|---|---|---|---|
| Agent 0 | Designer (Auto-Genesis) | *(none found)* | Missing | Add a task entrypoint (e.g. `scripts/morning-routine/tasks/design-collection.ts`) and (optionally) an LLM “designer” agent under `.agents/` for generating prompt variables + `_index.md` copy. Clarify where prompt configs live and their schema. |
| Agent 1 | Architect (Strategy & Immunization) | *(none found)* | Missing | Add a weekly task (workflow + script) that reads Issue feedback and updates prompt configs safely (bounded edits, rollback). Decide whether this is a true `.agents/*` LLM agent or deterministic rules first. |
| Agent 2 | Factory (Raw Production) | `scripts/morning-routine/tasks/generate-batch.ts` + `scripts/morning-routine/lib/gemini.ts`, `prompt-manager.ts`, `storage.ts`, `hugo-manager.ts` | Present | PRD says “PNG only” and temp filenames; repo also generates **PDFs during upload** via `storage.ts`. PRD vNext must either accept this as transitional or move PDF generation to a JIT finishing step post-QA. |
| Agent 3 | Art Critic (QA) | *(none found)* | Missing | Need a vision QA module (likely a new `.agents/art-critic/` with rubric + a task wrapper). Uses a **1-strike fail-fast** rule: first failure rejects+logs and halts the collection for the run. |
| Agent 4 | SEO Copywriter (Finishing) | `.agents/seo-copywriter/` + `scripts/morning-routine/tasks/seo-review-batch.ts`, `seo-review-one.ts` | Present (partial) | Current behavior: updates SEO fields + renames **markdown file** based on slug/date; does not rename R2/CF assets. PRD vNext should define what “finishing” owns: rename policy, ensuring `download_url` exists, and any JIT operations not already performed in generation. |
| Agent 5 | Distributor (Syndication) | *(not implemented as code here; typically Make.com)* | External | PRD vNext should reference the operational doc(s) and specify inputs (RSS fields, UTM schema) and failure handling. |

## Orchestration reality (today)
- Workflow: `.github/workflows/daily-generate-and-optimize.yml` runs:\n  - **Generate**: matrix over hardcoded collections, calls `generate-batch.ts`\n  - **SEO**: best-effort `seo-review-batch.ts` using the generation manifest\n  - **Commit**: downloads artifacts and commits `content/animals/...`\n- Tracking issue: workflow posts to Issue **#1** currently (PRD expects Issue #4 for rejections). Issue #2 is external reporting, not part of autonomy.

## Naming and boundary recommendation (for PRD vNext)
- Keep PRD roles (Agent 0–5) as **conceptual responsibilities**, but specify concrete repo deliverables:\n  - `.agents/<name>/...` only when an LLM call returns structured data.\n  - `scripts/morning-routine/tasks/<task>.ts` for orchestration.\n  - “Policies” (idempotency, deterministic merges, deletion rules) live with the orchestration layer, not the model prompt.


