---
title: the audited PE set includes *.dll
status: active
fact_kind: property_value
subject_key: kibi.prolog.win32_prebuilt
property_key: clean_runner_repack_with_pe_import_audit
operator: includes
value_type: set
value_set:
  - '*.dll'
text_ref: scripts/swipl-windows-repack.py
origin:
  kind: agent
  recorded_at: '2026-11-20T12:19:05.364Z'
id: FACT-CASE-prolog-win32-prebuilt-pe-audit-DLL
type: fact
---
Case member of FACT-prolog-win32-prebuilt-clean-runner-pe-audit: the *.dll binaries shipped in the win32-x64 payload.