---
title: Kibi CLI startup
status: active
fact_kind: subject
subject_key: kibi.cli.startup
canonical_key: kibi.cli.startup
text_ref: REQ-test-journaled-engine-harness
tags:
  - lane:strict
  - cli
origin:
  kind: agent
  recorded_at: '2026-10-30T12:00:00.000Z'
id: FACT-SUBJECT-KIBI-CLI-STARTUP
type: fact
---

How the kibi CLI starts: it loads only the implementation of the selected command, while its lightweight registration metadata matches the authoritative operation catalog exactly. It is startup and loading, not command behavior.
