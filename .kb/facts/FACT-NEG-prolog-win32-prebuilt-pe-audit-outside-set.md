---
title: the audited PE set includes *.sys, outside the pinned [*.exe, *.dll] set
status: active
fact_kind: property_value
subject_key: kibi.prolog.win32_prebuilt
property_key: clean_runner_repack_with_pe_import_audit
operator: includes
value_type: set
value_set:
  - '*.sys'
claim_key: CLAIM-BB1EBDCA9866B634
claim_text: The audited PE set includes *.sys, a pattern outside the pinned [*.exe, *.dll] set
text_ref: scripts/swipl-windows-repack.py
origin:
  kind: agent
  recorded_at: '2026-11-20T15:12:25.765Z'
id: FACT-NEG-prolog-win32-prebuilt-pe-audit-outside-set
type: fact
---
