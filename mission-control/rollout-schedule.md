# Autonomy Rollout Schedule (Foreman Input)

This file defines **which collections are active in each rollout week**.

## Week boundary rule
- Weeks start **Monday 12:01 AM Eastern time** (EST/ET).

## Schema (rollout_schedule_v1)
- timezone: America/New_York
- week_boundary: Monday 00:01 ET
- week_id: Week_1, Week_2, Week_3, Week_4_plus
- starts_at_et: YYYY-MM-DD (Monday)
- collections: list of category/collection (active collections for production)
- dry_run_collections (optional): list of category/collection (Foreman/Designer dry-run only; never scheduled for production)

## Schedule

### Week_1
- starts_at_et: 2025-12-22
- collections:
  - animals/cats
  - animals/dogs
  - animals/horses
  - animals/butterflies
  - animals/sharks
- dry_run_collections:
  - fantasy/dragons
  - fantasy/elves
  - fantasy/princesses
  - fantasy/knights
  - fantasy/fairies

### Week_2
- starts_at_et: 2025-12-29
- collections:
  - animals/cats
  - animals/dogs
  - animals/horses
  - animals/butterflies
  - animals/sharks
  - fantasy/dragons
  - fantasy/elves
  - fantasy/princesses
  - fantasy/knights
  - fantasy/fairies

### Week_3
- starts_at_et: 2025-12-29
- collections:
  - animals/cats
  - animals/dogs
  - animals/horses
  - animals/butterflies
  - animals/sharks
  - fantasy/dragons
  - fantasy/elves
  - fantasy/princesses
  - fantasy/knights
  - fantasy/fairies



## Notes
- Foreman must still apply **maintenance mode throttling**: when a collection is at/above cap, it is scheduled only **once per week** (not removed).
- Keep lists explicit (no “etc.” placeholders) so Foreman can parse deterministically.


