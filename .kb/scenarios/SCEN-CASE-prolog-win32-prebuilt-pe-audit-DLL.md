---
title: A shipped *.dll binary passes the PE32+ x86-64 machine and import-closure audit
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-20T12:19:09.715Z'
id: SCEN-CASE-prolog-win32-prebuilt-pe-audit-DLL
type: scenario
---
Given a win32-x64 payload containing *.dll files, when scripts/swipl-windows-repack.py audits them, then each is PE32+ x86-64 and its imports resolve only to payload DLLs or Windows system DLLs; scripts/tests/swipl-windows-repack.test.ts covers the machine field and the import allowlist with synthetic PE fixtures.