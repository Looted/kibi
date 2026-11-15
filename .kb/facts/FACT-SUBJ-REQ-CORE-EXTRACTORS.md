---
title: Markdown and YAML metadata extractors
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: kibi.sync.extractors
canonical_key: req.req_core_extractors
id: FACT-SUBJ-REQ-CORE-EXTRACTORS
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The extractors kibi sync uses to read authored knowledge: Markdown front matter with its plain and typed links, and the symbols declared in symbols.yaml, imported exactly as written. They read sources; they are not language-pack symbol extractors.
