---
title: repack runs only on a clean windows-2025 runner and audits the shipped PE binaries, which include *.exe and *.dll
status: active
fact_kind: property_value
subject_key: kibi.prolog.win32_prebuilt
property_key: clean_runner_repack_with_pe_import_audit
operator: includes
value_type: set
value_set:
  - '*.exe'
  - '*.dll'
text_ref: scripts/swipl-windows-repack.py
claim_key: CLAIM-5B61A708BC19FE6A
claim_text: The win32-x64 repack must run only on a clean GitHub Actions windows-2025 runner and must audit every shipped .exe and .dll as PE32+ x86-64 whose imports resolve only to payload DLLs or Windows system DLLs
origin:
  kind: agent
  recorded_at: '2026-11-20T12:13:22.049Z'
id: FACT-prolog-win32-prebuilt-clean-runner-pe-audit
type: fact
---
build-archive refuses to run off GitHub Actions, off Windows, or with swipl on PATH; the shipped PE binaries (the *.exe and *.dll members) are audited as PE32+ x86-64 with imports resolving only to payload or system DLLs.