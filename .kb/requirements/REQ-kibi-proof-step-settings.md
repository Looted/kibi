---
title: Proof step and per-test report settings
status: open
priority: must
firmness: default
semantic_text: The default proof steps source shall be the proof/steps directory, with one file per proof-bearing test named after its test id, and proof/steps.json when that directory does not exist. A proof steps file whose test_id differs from its file name must be refused. The per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT. The per-test proof report version shall be kibi.proof-test-report.v1. A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted.
semantic_clauses:
  - The default proof steps source shall be the proof/steps directory, with one file per proof-bearing test named after its test id, and proof/steps.json when that directory does not exist.
  - A proof steps file whose test_id differs from its file name must be refused.
  - The per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT.
  - The per-test proof report version shall be kibi.proof-test-report.v1.
  - A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted.
tags:
  - proof
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-16, approving the proof steps directory statement: "Yes, all of them"'
  recorded_at: '2026-11-16T07:29:08.642Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ce303345492d9123f47fa45d0c5d96370bc300e7bd80979ab79d82afc43f5468
semantic_inventory:
  - claim_key: CLAIM-435BE68CBC8205AD
    claim_text: The default proof steps source shall be the proof/steps directory, with one file per proof-bearing test named after its test id, and proof/steps.json when that directory does not exist
    role: normative
    status: modeled
    span:
      start: 0
      end: 184
  - claim_key: CLAIM-FD5B11811D9BBC78
    claim_text: A proof steps file whose test_id differs from its file name must be refused
    role: normative
    status: modeled
    span:
      start: 186
      end: 261
  - claim_key: CLAIM-9B373E83EA0B0ACA
    claim_text: The per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT
    role: normative
    status: modeled
    span:
      start: 263
      end: 341
  - claim_key: CLAIM-EBFEB6B891A3FA1A
    claim_text: The per-test proof report version shall be kibi.proof-test-report.v1
    role: normative
    status: modeled
    span:
      start: 343
      end: 411
  - claim_key: CLAIM-C11CA176D75C6530
    claim_text: A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted
    role: normative
    status: modeled
    span:
      start: 413
      end: 503
logic_claims:
  - CLAIM-435BE68CBC8205AD
  - CLAIM-FD5B11811D9BBC78
  - CLAIM-9B373E83EA0B0ACA
  - CLAIM-EBFEB6B891A3FA1A
  - CLAIM-C11CA176D75C6530
id: REQ-kibi-proof-step-settings
type: req
required_evidence: tested
---
The default proof steps source shall be the proof/steps directory, with one file per proof-bearing test named after its test id, and proof/steps.json when that directory does not exist. A proof steps file whose test_id differs from its file name must be refused. The per-test proof report environment variable shall be KIBI_PROOF_TEST_REPORT. The per-test proof report version shall be kibi.proof-test-report.v1. A per-test proof report outcome shall be passed, failed, timed_out, errored or interrupted.

## Context

REQ-kibi-proof-per-test-attribution lets a command proof integration attribute a failing step to the tests that own it through a per-test report. The steps file, the environment variable that names the report, its version and its outcomes are stated here so each is proved against the constant.

## Why this changed

Every change that added a proof-bearing test appended an entry to the end of the single proof/steps.json, so any two such branches conflicted at the same spot. The default source is now a directory with one file per test, so parallel branches never edit the same file. proof/steps.json is still read when the directory does not exist, so existing projects keep working. A file named after one test that declares another would let two tests shadow each other, so it is refused.

## Source

> Maintainer decision, 2026-11-16, approving the proof steps directory statement: "Yes, all of them"


Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"