---
title: Knowledge source kinds and claim kinds
status: open
priority: must
firmness: firm
semantic_text: A knowledge source kind shall be issue_tracker, wiki, specification, design, decision_log, support, chat, repository_docs or other. A knowledge source authority shall be authoritative, supporting or stale. An intent claim kind shall be intent, observation or open_question.
semantic_clauses:
  - A knowledge source kind shall be issue_tracker, wiki, specification, design, decision_log, support, chat, repository_docs or other.
  - A knowledge source authority shall be authoritative, supporting or stale.
  - An intent claim kind shall be intent, observation or open_question.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T19:19:11.738Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c2bcd95f149f96ac543f3e9f8c4013eb5e0bb873f378603e9e3abce89ad6dcb5
semantic_inventory:
  - claim_key: CLAIM-3FE1A4A9E6C8890E
    claim_text: A knowledge source kind shall be issue_tracker, wiki, specification, design, decision_log, support, chat, repository_docs or other
    role: normative
    status: modeled
    span:
      start: 0
      end: 130
  - claim_key: CLAIM-C8F9C5974CCDF2C1
    claim_text: A knowledge source authority shall be authoritative, supporting or stale
    role: normative
    status: modeled
    span:
      start: 132
      end: 204
  - claim_key: CLAIM-1CF6616CDA0B4638
    claim_text: An intent claim kind shall be intent, observation or open_question
    role: normative
    status: modeled
    span:
      start: 206
      end: 272
logic_claims:
  - CLAIM-3FE1A4A9E6C8890E
  - CLAIM-C8F9C5974CCDF2C1
  - CLAIM-1CF6616CDA0B4638
id: REQ-kibi-knowledge-source-vocabulary
type: req
---
A knowledge source kind shall be issue_tracker, wiki, specification, design, decision_log, support, chat, repository_docs or other. A knowledge source authority shall be authoritative, supporting or stale. An intent claim kind shall be intent, observation or open_question.

## Context

REQ-kibi-bootstrap-knowledge-sources reads intent from outside the repository. A source has one of a closed list of kinds and authorities, and a claim read from it has one of three kinds. They are stated here so every list is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"