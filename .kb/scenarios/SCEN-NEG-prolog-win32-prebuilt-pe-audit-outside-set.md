---
title: An audited PE pattern outside [*.exe, *.dll] is rejected
status: active
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-20T15:12:29.942Z'
id: SCEN-NEG-prolog-win32-prebuilt-pe-audit-outside-set
type: scenario
---
Given the repack audit is asked to accept a PE pattern outside the pinned [*.exe, *.dll] set (for example *.sys), the audit rejects it: only the shipped .exe and .dll binaries are in scope, so an outside pattern makes the assumption impossible under REQ-prolog-win32-prebuilt-provenance.