# 1 - PaperPause Autonomy System

Source of truth:
- PRD: `.docs/prd/autonomy-prd.md`
- Rollout map: `.docs/prd/autonomy-prd.rollout.md`
- Open questions / decisions log: `.docs/prd/autonomy-prd.issues.md`
- Agent mapping: `.docs/prd/autonomy-prd.agent-mapping.md`
- Story decomposition: `.docs/prd/autonomy-prd.epic-stories.md`
- Rollout schedule (Foreman input): `mission-control/rollout-schedule.md`

---

## Goal
Deliver a safe, phased autonomy system that can reliably produce **5 → 50 assets/day** with **no human intervention required to complete the daily production run**.

An **asset** is an **Approved PNG** that has **passed QA** and is ready to be turned into a PDF (and published as a Hugo page by finishing).

---

## Scope (what’s included)
- **Foreman (Scheduler)**: schedule-driven selection of active collections, plus maintenance throttling at cap.
- **Model Standard**: All decision agents (0, 1, 3, 4) use **gemini-3-flash-preview** (Thinking: **MEDIUM**).
- **Designer (Auto-Genesis)**: create missing collection scaffolding (prompt config + `_index.md`) for new categories/collections (e.g., `fantasy/*`).
- **Factory (Generation)**: generate candidate PNGs and produce a manifest for downstream steps.
- **Critic (QA)**: **1-strike fail-fast**; first failure rejects+logs and halts that collection for the run.
- **Finisher (SEO + Packaging)**:
  - deterministic naming (markdown slug/filename)
  - **Strict JIT PDFs**: generate PDFs only after QA passes (survivors only)
- **Trash Can logging**: machine-parseable Issue #4 comments for failures/rejections.

---

## Explicit non-goals (for this Epic)
- **Issue #2 “Hall of Fame / Primary SEO Monitoring” integration**: out of the autonomy control loop for now (remains external weekly reporting).
- Dashboarding (optional follow-on).
- Syndication/Make.com distributor (later phase).

---

## Key product decisions (locked for implementation)

### Scheduling model (Foreman)
- **Source of truth**: rollout schedule file (schema `rollout_schedule_v1`) read by Foreman.
- **Week boundary**: Monday 00:01 ET (`America/New_York`).
- **Week 1 start (ET)**: **2025-12-22**.
- **Week 1 content**: Animals (current) + Fantasy (new category via Designer).

### Maintenance mode
- **Cap threshold**: **75 published pages** (non-draft; excluding `_index.md`).
- **Behavior**:
  - If `< 75`: publish daily (for scheduled days).
  - If `>= 75`: publish **once per week** (first daily run after the week starts).

### QA rule
- **1-strike fail-fast** (no two-strike counters).
- On first QA failure in a collection during a run:
  - reject asset
  - log reason to Issue #4 (machine-parseable)
  - halt that collection for the remainder of the run
  - other collections continue

### JIT PDFs (Risk R4 decision)
- **Strict JIT**: PDF generation happens **only after QA passes** (survivors only).

### Self-healing constraints (Agent 1)
- **Mutation scope**: only `negative_prompt` (or a bounded `immunization_terms` list merged into it).
- **Hard prompt budget**: total model input (positive + negative + separators) must be **≤ 500 characters**.

---

## Rollout plan (phased)
Implement via the phases in `.docs/prd/autonomy-prd.rollout.md`:
- Phase 0: baseline stability + feature flags
- Phase A: Foreman + Designer preflight (dry-run → write-mode)
- Phase B: QA (observe → enforce_failfast)
- Phase C: Finishing + strict JIT PDFs
- Phase D: Immunization (bounded, reversible)
- Phase E: Syndication (optional)

---

## Acceptance criteria (Epic-level)
- Daily workflow can run end-to-end with all new features disabled (baseline safety).
- When enabled, Foreman deterministically schedules the week’s collections and applies maintenance throttling at cap.
- Designer can create new category/collection scaffolding without manual steps (e.g., `fantasy/*`).
- QA fail-fast works: first failure logs to Issue #4 and stops only that collection.
- PDFs are created only for survivors (strict JIT).
- Retry runs are idempotent (no duplicate markdown files/uploads), via a stable asset identity + upsert strategy.

---

## Story breakdown
See `.docs/prd/autonomy-prd.epic-stories.md` for the full phase-by-phase stories and acceptance criteria.


