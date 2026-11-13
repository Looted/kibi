---
title: Kibi Check
status: active
tags:
  - strict-modeling
  - cli
  - check
text_ref: .kb/requirements/REQ-cli-check.md
fact_kind: subject
subject_key: kibi.check
canonical_key: kibi.check
id: FACT-SUBJECT-KIBI-CHECK
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The kibi check command and kb_check operation that validate the KB against the rule registry, with rule selection and staged focus, a nonzero exit on violations, and strict pairing of requirements with the predicates about their subjects. It is the checker, not any one rule's policy.
