---
title: Proof ingest accepts a narrowed playwright run for the tests whose specs it ran
status: open
priority: should
tags:
  - proof
  - cli
semantic_text: Proof ingest must accept a playwright run that kibi prove narrowed to the selected tests' spec files as evidence for each ingested test whose bound spec files the run included, and refuse it for any other test.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: cad572f6817f996d7159592d8880881b9d202db67fc97531868ecd96db629c4d
semantic_inventory:
  - claim_key: CLAIM-5E3CE03D8D48D980
    claim_text: Proof ingest must accept a playwright run that kibi prove narrowed to the selected tests' spec files as evidence for each ingested test whose bound spec files the run included, and refuse it for any other test
    role: normative
    status: modeled
    span:
      start: 0
      end: 209
logic_claims:
  - CLAIM-5E3CE03D8D48D980
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer reply (2026-11-20) to the request to sign off the two requirements recorded for GitHub issue 825, shown with their exact statements: "OK"'
  recorded_at: '2026-11-20T16:11:11.347Z'
id: REQ-cli-prove-narrowed-run-evidence
type: req
required_evidence: tested
---
Proof ingest must accept a playwright run that kibi prove narrowed to the selected tests' spec files as evidence for each ingested test whose bound spec files the run included, and refuse it for any other test.

## Context

kibi prove --test, --requirement and --stale append the selected tests' proof_bindings[].source_file spec files to a direct `playwright test` command, and the Kibi Playwright reporter records that narrowed command in the run artifact. Ingest compared the artifact's command_argv with the configured command exactly, so it refused every narrowed run, and proving one test in a large suite needed a full suite run (GitHub issue 825). A narrowed run is evidence only for the tests whose specs it ran: a test whose spec it skipped has no result in it and must not be judged by it. The appended arguments must be spec files of the tests ingested from that run. The receipt keeps the command that actually ran; the execution fingerprint still binds the configured command.

Who asked: the maintainer approved fixing issue 825 after an independent review found the narrowed-run refusal. Reason not stated beyond the issue.

## Source

> Ok, have fable double review first and proceed with the agreed upon fix.

Maintainer, 2026-11-20, approving the fix for GitHub issue 825 (kibi prove --test runs the whole integration and fails on suites with more than 1000 tests).
