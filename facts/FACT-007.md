---
id: FACT-007
title: KB sync now uses two-pass relationship assertion
status: active
created_at: 2026-02-25T14:30:00Z
updated_at: 2026-02-25T14:30:00Z
source: packages/cli/src/commands/sync.ts
tags:
  - kb-sync
  - improvement
  - relationships
---

KB sync now uses a two-pass approach for relationship assertion:

1. First pass: Attempts to assert all relationships from entity frontmatter links
2. Retry passes (3x): Retries failed relationships - targets may have been created in first pass
3. Error reporting: Aggregates and reports all failed relationships at the end with clear error messages

This improvement addresses the issue where relationships to entities defined later in the same sync would fail silently.
