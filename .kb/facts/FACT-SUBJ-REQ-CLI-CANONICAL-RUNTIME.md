---
title: Runtime operations honor the canonical .kb/ contract
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: kibi.kb.canonical_layout
canonical_key: req.req_cli_canonical_runtime
id: FACT-SUBJ-REQ-CLI-CANONICAL-RUNTIME
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The canonical .kb layout contract: init scaffolds it, the .kb manifest rather than a leftover config marks a project initialized, and source authoring writes only into authored lanes. It is the layout, not the content of entities.
