---
title: kb_search fuses an embedding provider's meaning ranking into every search
status: open
priority: must
required_evidence: tested
firmness: firm
tags:
  - search
  - retrieval
semantic_text: When an embedding provider is installed, kb_search must fuse its similarity ranking with the word ranking by reciprocal rank on every search. Without an embedding provider, kb_search must rank by words alone. An embedding provider that fails, times out or returns an invalid result must give no scores and a diagnostic, and kb_search must still answer by words alone. Shadow embedding providers must be reported only as comparisons.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"'
  approved_by: maintainer
  recorded_at: '2026-11-25T19:29:14.953Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d0801a734cf9daa497a88fc9aab89f4987e2be927a5f2e56df6e473c42d5ceed
semantic_inventory:
  - claim_key: CLAIM-A646417B32AAB2E6
    claim_text: When an embedding provider is installed, kb_search must fuse its similarity ranking with the word ranking by reciprocal rank on every search
    role: condition
    status: modeled
    span:
      start: 0
      end: 140
  - claim_key: CLAIM-FABE453FC311BD2B
    claim_text: Without an embedding provider, kb_search must rank by words alone
    role: normative
    status: modeled
    span:
      start: 142
      end: 207
  - claim_key: CLAIM-23236A1C2E3E9D82
    claim_text: An embedding provider that fails, times out or returns an invalid result must give no scores and a diagnostic, and kb_search must still answer by words alone
    role: normative
    status: modeled
    span:
      start: 209
      end: 366
  - claim_key: CLAIM-A703DF6B631A84D3
    claim_text: Shadow embedding providers must be reported only as comparisons
    role: normative
    status: modeled
    span:
      start: 368
      end: 431
logic_claims:
  - CLAIM-A646417B32AAB2E6
  - CLAIM-FABE453FC311BD2B
  - CLAIM-23236A1C2E3E9D82
  - CLAIM-A703DF6B631A84D3
id: REQ-search-meaning-fusion
type: req
---
When an embedding provider is installed, kb_search must fuse its similarity ranking with the word ranking by reciprocal rank on every search. Without an embedding provider, kb_search must rank by words alone. An embedding provider that fails, times out or returns an invalid result must give no scores and a diagnostic, and kb_search must still answer by words alone. Shadow embedding providers must be reported only as comparisons.

## Why this changed

Asking the provider only on a weak answer left plain-language questions that matched some words strongly enough without meaning help: on Kibi's own reworded hints gold set the governing decision was in the top three for 5% of questions. Fusing the meaning ranking on every search, at the weight REQ-search-meaning-limits records, raised that to 45% and kept the repository gold set at 94% in the top three.

## Context

This replaces REQ-kibi-search-hints-when-asked, which asked the provider only on a weak answer, and the first clause of REQ-kibi-search-hints-advisory, which kept the provider from changing the ranked results. The provider-failure and shadow clauses of REQ-kibi-search-hints-advisory are kept here. The bundled provider and its opt-out stay as REQ-kibi-search-hints-default records them.

## Source

> Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six"
