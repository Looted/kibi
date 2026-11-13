---
title: Bundled SWI-Prolog runtime resolution
status: active
fact_kind: subject
subject_key: kibi.prolog.bundled_runtime
canonical_key: kibi.prolog.bundled_runtime
text_ref: packages/cli/src/prolog/swipl-resolver.ts
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
id: FACT-prolog-bundled-subject
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

How Kibi finds the SWI-Prolog it runs: KIBI_SWIPL first, then the verified bundled runtime of the platform package, then PATH, with install advice naming the platform package when none works. A bundle runs only after its manifest and checksum are verified.
