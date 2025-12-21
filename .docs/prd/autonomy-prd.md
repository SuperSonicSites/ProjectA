# Product Requirements Document (PRD): PaperPause Autonomous Enterprise System

**Version:** 6.3 (The "Genesis" Edition)

**Date:** December 20, 2025

**Status:** Approved for Execution

**Core Stack:** Hugo, Cloudflare (Pages/R2/Images), GitHub Actions, Gemini 3 Flash (Reasoning/Vision), Gemini 3 Pro (Image), Make.com



---



## 1. Executive Summary

**Objective:** Transform PaperPause from a "Managed Factory" into a "Self-Expanding Empire" capable of scaling from 5 to 50 assets per day with zero human intervention in the production loop.



**Key Innovations:**

1. **Just-in-Time (JIT) Manufacturing:** Expensive operations (PDF generation, SEO renaming) occur *only* after an asset passes Quality Assurance (QA).

2. **Auto-Genesis (Agent 0):** The system is not limited by existing configuration files. If the schedule calls for a collection that doesn't exist, the system designs and builds the infrastructure for it instantly.

3. **Circuit Breaker Safety:** A "Two-Strike" rule prevents API waste by halting specific collections that are failing consecutively.



---



## 2. System Architecture: The Agent Fleet



### 🎨 Agent 0: The Designer (Auto-Genesis)

* **Role:** R&D & Product Development.

* **Trigger:** Pre-production check (Daily).

* **Input:** The "Active Matrix" list from The Foreman.

* **Logic:**

1. Checks if `config/prompts/[category]-[collection].json` exists.

2. **If Missing:**

* Calls Gemini to brainstorm 50+ variables (Subjects, Actions, Settings).

* Generates the JSON config file.

* Creates the Hugo `_index.md` file with SEO title/description.

3. **Output:** A ready-to-use configuration file.



### 🧠 Agent 1: The Architect (Strategy & Immunization)

* **Role:** Product Manager & Doctor.

* **Trigger:** Weekly (Mondays @ 06:00).

* **Input:** "The Trash Can" (GitHub Issue #4) & "Hall of Fame" (Issue #2).

* **Action:**

* Parses rejection reasons from Issue #4.

* **Self-Healing:** If a specific error (e.g., "TEXT_OVERLAY") appears >5 times for a collection, it automatically edits the corresponding `.json` config to append "text, letters, watermark" to the `negative_prompt`.



### 🏭 Agent 2: The Factory (Raw Production)

* **Role:** Sketch Artist.

* **Trigger:** Daily Production Job.

* **Action:**

* Generates **Raw PNGs** only (Fast & Cheap).

* Uses temporary filenames: `temp-[timestamp].png`.

* **Constraint:** Operates blindly on the config provided (whether old or newly created by Agent 0).



### 🕵️‍♀️ Agent 3: The Art Critic (Quality Assurance)

* **Role:** Quality Control & Whistleblower.

* **Trigger:** Immediate Post-Generation.

* **Model:** `gemini-3-flash-preview` (Vision).

* **Rubric:** Text Overlay, Greyscale, Bad Anatomy, Blurring.

* **The "Two-Strike" Rule:**

* Maintains a counter for the current collection.

* If **2 images fail consecutively**, the agent throws a `FatalError` for that specific matrix item, halting further generation to save budget.

* **Rejection Handling:**

* **Rename:** `REJECTED_[Reason]_[Timestamp].png`.

* **Move:** Uploads to R2 folder `rejected/`.

* **Log:** Posts a comment to **GitHub Issue #4** with the R2 URL for manual review (False Negative check).



### ✍️ Agent 4: The SEO Copywriter (Finishing)

* **Role:** Packaging & Finalization.

* **Trigger:** Post-QA (Survivors only).

* **JIT Actions:**

1. **Renaming:** Renames `temp-[ts].png` to SEO-rich `kawaii-cat-reading.png`.

2. **PDF Generation:** Converts the raw PNG to A4/Letter PDF (300 DPI) with branded footers.

3. **Upload:** Pushes final PNG and PDF to R2 `public/` folder.

4. **Metadata:** Writes the Hugo Markdown file with `download_url` (PDF) and `image_url` (PNG).



### 📢 Agent 5: The Distributor (Syndication)

* **Role:** Social Media Manager.

* **Trigger:** Make.com (RSS Monitor).

* **Action:** Detects new items in RSS feed, posts to Pinterest with UTM tracking.



---



## 3. The "Brain": Scheduling Logic (The Foreman)



**Script:** `scripts/morning-routine/tasks/production-schedule.ts`



### 3.1 The Master Schedule (The Menu)

The Foreman relies on a "Master Taxonomy" (defined in code or `validate-taxonomy.ts`) representing the ideal full state of the business.



### 3.2 The Ramp-Up Logic

The Foreman calculates the number of weeks since `LAUNCH_DATE`.

* **Week 1:** Unlocks top 5 collections.

* **Week 2:** Unlocks top 10 collections.

* **Week 3:** Unlocks top 15 collections.

* **Week 4+:** Unlocks top 20 collections (Full Capacity).



### 3.3 Maintenance Mode (The Cap)

Before scheduling a collection, The Foreman calls `content-manager.ts` to count existing posts.

* **The Cap:** 75 Posts.

* **Logic:** If `Count >= 75`, the collection is **removed** from the Daily Production Matrix.

* *Result:* The system naturally pivots resources to newer/under-filled collections.



---



## 4. Workflow Orchestration



**Pipeline File:** `.github/workflows/daily-generate-and-optimize.yml`



### Job 1: Setup & Genesis

1. **Run Foreman:** Executes `production-schedule.ts`.

* *Output:* JSON Matrix (e.g., `["animals/cats", "space/aliens"]`).

2. **Run Designer:** Executes `design-collection.ts` for every item in the Matrix.

* *Check:* Does `config` exist?

* *Action:* If no, create it (Auto-Genesis).



### Job 2: Production (Matrix Strategy)

*Runs in parallel based on the Matrix output from Job 1.*

1. **Generate & QA:**

* Agent 2 (Factory) creates image.

* Agent 3 (Critic) validates.

* *Circuit Breaker:* Job fails fast if 2 consecutive failures occur.

2. **Optimize (JIT):**

* Agent 4 (SEO) performs renaming and PDF generation for survivors.

* Commits Markdown files to the repo.



### Job 3: Deploy

1. **Build:** Hugo Build.

2. **Deploy:** Cloudflare Pages.



---



## 5. Data Models & Logging



### 5.1 The "Trash Can" (GitHub Issue #4)

Used for autonomous feedback loops and manual review.


**REJECTED**

- **Collection:** animals/cats

- **Reason:** TEXT_OVERLAY

- **Prompt:** "A cute cat reading a book..."

- **Asset:** [Link to R2/rejected/REJECTED_TEXT_OVERLAY_12345.png]



5.2 The "Hall of Fame" (GitHub Issue #2)

Used by Agent 1 to reinforce successful styles. Contains top-performing queries and pages from GSC/GA4.

6. Implementation Roadmap

Phase 1: The Autonomous Core (Current Sprint)

* [ ] Task 1.1: Implement production-schedule.ts (The Foreman) with Master Taxonomy and Maintenance logic.

* [ ] Task 1.2: Implement design-collection.ts (The Designer) for Auto-Genesis.

* [ ] Task 1.3: Refactor GitHub Workflow to split Setup and Production jobs.

* [ ] Task 1.4: Update generate-batch.ts to implement strict "Two-Strike" rule and R2 rejection uploading.

* [ ] Task 1.5: Create seo-review-batch.ts to handle JIT PDF generation.

Phase 2: Intelligence

* [ ] Task 2.1: Connect Agent 3 to Issue #4 (Logging).

* [ ] Task 2.2: Connect Agent 1 to Issue #4 (Self-Healing/Config Updates).

Phase 3: Dashboarding

* [ ] Task 3.1: Localhost Dashboard to visualize the status of the "Empire" (Active vs. Maintenance collections).

<!-- end list -->