---
title: kb_search marks negative-path facts as forbidden and ranks them below the requirement they guard
status: open
priority: should
required_evidence: tested
tags:
  - search
  - answer-layer
  - search-hints
origin:
  kind: agent
  ref: 'Issue #697: "Mark negative-path facts wherever they are shown" and "Rank a negative-path fact below the requirement it guards, so it doesn''t become the top hint."'
  recorded_at: '2026-11-11T17:20:24.110Z'
semantic_text: kb_search must mark a negative-path fact as a forbidden situation wherever it shows the fact. kb_search must rank a negative-path fact below the current requirement it guards. Search hints must show a negative-path fact as the current requirement it guards.
semantic_clauses:
  - kb_search must mark a negative-path fact as a forbidden situation wherever it shows the fact.
  - kb_search must rank a negative-path fact below the current requirement it guards.
  - Search hints must show a negative-path fact as the current requirement it guards.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e8d0769486fb349f3a55e9ebb794269cbf0e48210bf08f4e6dd08a238f68b4aa
semantic_inventory:
  - claim_key: CLAIM-4220FD045062DC24
    claim_text: kb_search must mark a negative-path fact as a forbidden situation wherever it shows the fact
    role: normative
    status: modeled
    span:
      start: 0
      end: 92
  - claim_key: CLAIM-CAC1FEC0D1B34473
    claim_text: kb_search must rank a negative-path fact below the current requirement it guards
    role: normative
    status: modeled
    span:
      start: 94
      end: 174
  - claim_key: CLAIM-136651FCC12048C4
    claim_text: Search hints must show a negative-path fact as the current requirement it guards
    role: normative
    status: modeled
    span:
      start: 176
      end: 256
logic_claims:
  - CLAIM-4220FD045062DC24
  - CLAIM-CAC1FEC0D1B34473
  - CLAIM-136651FCC12048C4
id: REQ-kibi-negative-path-facts-marked
type: req
---
kb_search must mark a negative-path fact as a forbidden situation wherever it shows the fact. kb_search must rank a negative-path fact below the current requirement it guards. Search hints must show a negative-path fact as the current requirement it guards.

## Context

Issue #697. Negative-path facts (a fact a rejecting scenario assumes and no requirement grounds) state the forbidden situation as a plain title, for example "Building a migration plan from status, check or coverage changes a tracked file". Read alone in a search result or hint, such a title says the opposite of the requirement it guards; in Kibi's own KB one was the top search hint for a question about kb_check's JSON output. kb_search therefore asks the engine which matched facts are negative-path facts (kb_negative_path_facts/2) and which current requirements they guard, marks them, ranks each one directly below the requirement it guards when that requirement matched, and lifts a hint on one to the requirement. The authored titles stay as they are: the marking is applied wherever the fact is shown, on every agent host and the plain CLI, because all of them read the same kb_search operation.

## Source

> Mark negative-path facts wherever they are shown: search results, `queryAnalysis.hints`, the answer layer and hook snippets. [...] Rank a negative-path fact below the requirement it guards, so it doesn't become the top hint.

Issue #697, "Negative-path facts read as true statements in search results".