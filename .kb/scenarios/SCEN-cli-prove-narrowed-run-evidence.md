---
title: A narrowed playwright run proves the tests whose specs it ran
status: active
expects: success
priority: should
tags:
  - proof
  - cli
origin:
  kind: agent
  recorded_at: '2026-11-20T16:10:33.434Z'
id: SCEN-cli-prove-narrowed-run-evidence
type: scenario
---
Given a playwright integration configured as `npx playwright test` and a test whose proof_bindings name e2e/a.spec.ts, when kibi prove --test runs `npx playwright test e2e/a.spec.ts` and ingests the artifact the reporter wrote, then ingest accepts the narrowed command, writes a receipt for the test and records the command that ran. Two tests ingested from one run narrowed to both their specs each get a receipt.