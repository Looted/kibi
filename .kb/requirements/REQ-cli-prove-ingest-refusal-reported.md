---
title: kibi prove reports a refused ingest as that integration's failure and still prints its summary
status: open
priority: should
tags:
  - proof
  - cli
semantic_text: kibi prove must report an integration whose run artifact proof ingest refused as a failure of that integration, and still print its JSON summary with the receipts of every other integration.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 931b259d4fabb52acd6f564bc3a8d98cab7d9ed100da34541f8e542d52b6de0d
semantic_inventory:
  - claim_key: CLAIM-51C2E6202DFE60FA
    claim_text: kibi prove must report an integration whose run artifact proof ingest refused as a failure of that integration, and still print its JSON summary with the receipts of every other integration
    role: normative
    status: modeled
    span:
      start: 0
      end: 189
logic_claims:
  - CLAIM-51C2E6202DFE60FA
origin:
  kind: agent
  recorded_at: '2026-11-20T16:11:15.944Z'
id: REQ-cli-prove-ingest-refusal-reported
type: req
required_evidence: tested
---
kibi prove must report an integration whose run artifact proof ingest refused as a failure of that integration, and still print its JSON summary with the receipts of every other integration.

## Context

kibi prove ingests each integration's run artifact after the run. An ingest that refused the artifact (for example a command that does not match the configured one) threw out of kibi prove, so the command printed no JSON summary and the receipts other integrations had already written went unreported. Found while fixing GitHub issue 825, where a refused narrowed run left only a stack trace. Engine, lock and rollback errors still end the command; only refusals of the artifact (errors that begin "Proof ingest failed:") are reported this way, and a refused integration is not recorded as ingested, so --resume runs it again.

Who asked: the maintainer approved fixing issue 825 after an independent review found the missing summary. Reason not stated beyond the issue.

## Source

> Ok, have fable double review first and proceed with the agreed upon fix.

Maintainer, 2026-11-20, approving the fix for GitHub issue 825.
