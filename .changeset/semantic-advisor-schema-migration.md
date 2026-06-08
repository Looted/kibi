---
"kibi-cli": patch
---

Existing KBs now get an explicit semantic-advisor backfill marker when they migrate to the latest schema. This helps maintainers and agents distinguish deterministic schema upgrades from the separate, reviewable semantic modeling work that may still be needed.

- Bump the KB schema version and add `semanticAdvisorBackfill: "pending"` during migration.
- Record the marker in migration audit metadata without creating semantic facts automatically.
- Update the config schema so migrated configs validate with the new marker.
