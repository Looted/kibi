---
title: kb_search search hints
status: active
fact_kind: subject
subject_key: kibi.search.hints
canonical_key: kibi.search.hints
text_ref: packages/cli/src/search-hints.ts
origin:
  kind: agent
  recorded_at: '2026-10-29T19:21:32.785Z'
id: FACT-search-hints-host-subject
type: fact
---

How kb_search uses search hints: it asks a provider only when its own answer is weak, shows at most ten linked requirements beyond the top three answers, and keeps hints advisory so a failing provider never costs the answer.
