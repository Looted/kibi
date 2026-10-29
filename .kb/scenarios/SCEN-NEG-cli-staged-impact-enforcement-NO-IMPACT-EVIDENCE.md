---
title: A staged behavior edit without Kibi impact evidence is blocked by the staged check
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:36.879Z'
id: SCEN-NEG-cli-staged-impact-enforcement-NO-IMPACT-EVIDENCE
type: scenario
---
Given a packed consumer workspace with a committed, owned source file, when a commit stages only that file with a new exported function and no requirement, test or symbols manifest change, then kibi check --staged refuses the commit: it exits 1 and reports kibi_impact_evidence_missing for the source file.

This is the failure side of staged impact enforcement: a behavior change must arrive with the knowledge that explains it. documentation/tests/e2e/packed/traceability-gate.test.ts "rejects a staged behavior edit that carries no Kibi impact evidence" exercises it.
