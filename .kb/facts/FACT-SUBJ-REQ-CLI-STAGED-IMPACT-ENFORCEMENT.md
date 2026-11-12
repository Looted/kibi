---
title: CLI staged check enforces Kibi impact evidence for behavior edits
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: kibi.cli.check.staged
canonical_key: req.req_cli_staged_impact_enforcement
id: FACT-SUBJ-REQ-CLI-STAGED-IMPACT-ENFORCEMENT
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The kibi check --staged pre-commit check: it inventories every path in the git index, requires Kibi impact evidence for behavior edits and blocks consistency violations the commit introduces. It looks at the commit, not the whole KB.
