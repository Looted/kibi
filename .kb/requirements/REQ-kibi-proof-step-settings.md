---
title: Proof step and per-test report settings
status: open
priority: must
firmness: firm
semantic_text: The default proof steps file shall be proof/steps.json. The per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT. The per-test proof report version shall be kibi.proof-test-report.v1. A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted.
semantic_clauses:
  - The default proof steps file shall be proof/steps.json.
  - The per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT.
  - The per-test proof report version shall be kibi.proof-test-report.v1.
  - A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T11:06:32.168Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0e1e2e6055a31dc4d2cd47cae9f07573c6563af49ab2e33d332323612ee84426
semantic_inventory:
  - claim_key: CLAIM-9C090DC61B833364
    claim_text: The default proof steps file shall be proof/steps.json
    role: normative
    status: modeled
    span:
      start: 0
      end: 54
  - claim_key: CLAIM-9B373E83EA0B0ACA
    claim_text: The per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT
    role: normative
    status: modeled
    span:
      start: 56
      end: 134
  - claim_key: CLAIM-EBFEB6B891A3FA1A
    claim_text: The per-test proof report version shall be kibi.proof-test-report.v1
    role: normative
    status: modeled
    span:
      start: 136
      end: 204
  - claim_key: CLAIM-C11CA176D75C6530
    claim_text: A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted
    role: normative
    status: modeled
    span:
      start: 206
      end: 296
logic_claims:
  - CLAIM-9C090DC61B833364
  - CLAIM-9B373E83EA0B0ACA
  - CLAIM-EBFEB6B891A3FA1A
  - CLAIM-C11CA176D75C6530
id: REQ-kibi-proof-step-settings
type: req
---
The default proof steps file shall be proof/steps.json. The per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT. The per-test proof report version shall be kibi.proof-test-report.v1. A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted.

## Context

REQ-kibi-fresh-verification-receipts-v2 lets a command proof integration attribute a failing step to the tests that own it through a per-test report. The steps file, the environment variable that names the report, its version and its outcomes are stated here so each is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"