---
title: implementedBy links the tests that cover each symbol
status: open
priority: must
required_evidence: tested
semantic_text: An implementedBy entry of kb_upsert must accept coveredBy test ids and record a covered_by link from the entry's symbol to each of those tests.
tags:
  - mutation
  - traceability
origin:
  kind: agent
  ref: 'Measured on a test project, 2026-11-16: one new unowned function made kibi check --staged print four findings for one cause (3,278 characters). Maintainer decision, 2026-11-16, approving this statement as worded.'
  recorded_at: '2026-11-16T16:50:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c084d759eb91283f6cf032b1b621c6494ca043bbcfab1e85fa8aaba98b6da9de
semantic_inventory:
  - claim_key: CLAIM-98BE8CF9C9419C5F
    claim_text: An implementedBy entry of kb_upsert must accept coveredBy test ids and record a covered_by link from the entry's symbol to each of those tests
    role: normative
    status: modeled
    span:
      start: 0
      end: 142
logic_claims:
  - CLAIM-98BE8CF9C9419C5F
id: REQ-kb-upsert-implemented-by-covered-by
type: req
---
An implementedBy entry of kb_upsert must accept coveredBy test ids and record a covered_by link from the entry's symbol to each of those tests.

## Why

A production symbol needs both an implements and a covered_by link, but implementedBy wrote only the first, so a requirement written with it still left a symbol-coverage finding and a second upsert per symbol. Naming the covering tests in the same entry lets one paste-ready input, such as the staged check's owner block, clear both.

## Context

The links start at the same symbol the entry resolves to; a repeated test id is linked once, and a coveredBy that is not a list of test ids is refused before anything is written.

## Source

> Measured on a test project, 2026-11-16: one new unowned function made kibi check --staged print four findings for one cause (3,278 characters).