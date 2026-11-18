---
title: A file whose changed declarations are all recorded needs no other impact evidence
status: active
expects: success
tags:
  - staged-gate
  - symbols
  - impact
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-staged-evidence-scoped-to-changed-declarations
type: scenario
---
Given a partially recorded file, when a commit changes only its recorded function, then kibi check --staged raises neither kibi_impact_evidence_missing nor symbols_manifest_stale for that file.

documentation/tests/e2e/packed/staged-inherited-symbol-gaps.test.ts exercises it through the installed CLI.