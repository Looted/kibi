---
title: One kibi check keeps every source analysis it parsed in the branch analysis cache
status: open
priority: must
required_evidence: tested
firmness: firm
semantic_text: kibi check must keep, in the branch's source analysis cache, every source file analysis that any of its steps parsed in that run.
tags:
  - check
  - symbols
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:00.000Z'
  ref: 'Measured on Kibi''s own repository, 2026-11-16: the granularity and symbol debt steps of kibi check each saved the source analysis cache with only their own analyses, so the second save dropped the first step''s. Maintainer decision, 2026-11-17, approving this statement as worded ("approve all").'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9939aa1717552a8e10c06377465a5ce65f2eb308cd2023f59fd7fa52fbb7d8da
semantic_inventory:
  - claim_key: CLAIM-8B129398A54207CA
    claim_text: kibi check must keep, in the branch's source analysis cache, every source file analysis that any of its steps parsed in that run
    role: normative
    status: modeled
    span:
      start: 0
      end: 128
logic_claims:
  - CLAIM-8B129398A54207CA
id: REQ-check-analysis-cache-shared
type: req
---
kibi check must keep, in the branch's source analysis cache, every source file analysis that any of its steps parsed in that run.

## Why

The symbol granularity step and the symbol debt step of kibi check each opened the branch's source analysis cache and saved only the analyses they had used. The cache keeps only the entries used in the run that saves it, so the second save dropped the first step's analyses and every run parsed those files again.

## Context

check-executor opens the cache once, passes it to both steps, and saves it after the symbol debt step; withSourceAnalysisCache lets a step either take that cache or open and save its own when called alone.

## Source

> Measured on Kibi's own repository, 2026-11-16: the granularity and symbol debt steps of kibi check each saved the source analysis cache with only their own analyses, so the second save dropped the first step's. Maintainer decision, 2026-11-17, approving this statement as worded ("approve all").
