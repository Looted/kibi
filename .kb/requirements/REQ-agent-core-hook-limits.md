---
title: Agent hook snippet and candidate limits
status: open
priority: must
firmness: firm
semantic_text: An edit snippet shall hold at most 1200 characters. A hook shall offer at most 3 requirement candidates. Firm edit confirmation shall be switched by KIBI_CONFIRM_FIRM_EDITS. A snippet grounding link shall be constrains, requires_property, requires_predicate or requires_rule.
semantic_clauses:
  - An edit snippet shall hold at most 1200 characters.
  - A hook shall offer at most 3 requirement candidates.
  - Firm edit confirmation shall be switched by KIBI_CONFIRM_FIRM_EDITS.
  - A snippet grounding link shall be constrains, requires_property, requires_predicate or requires_rule.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T16:29:58.522Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 305d1c48c7db00e94988cae35f8cac7a7a53afe804b326eb592753507d6e6a69
semantic_inventory:
  - claim_key: CLAIM-FCC5400A046BAB07
    claim_text: An edit snippet shall hold at most 1200 characters
    role: normative
    status: modeled
    span:
      start: 0
      end: 50
  - claim_key: CLAIM-C133FB4D31CABA59
    claim_text: A hook shall offer at most 3 requirement candidates
    role: normative
    status: modeled
    span:
      start: 52
      end: 103
  - claim_key: CLAIM-779A77B3EC880CE7
    claim_text: Firm edit confirmation shall be switched by KIBI_CONFIRM_FIRM_EDITS
    role: normative
    status: modeled
    span:
      start: 105
      end: 172
  - claim_key: CLAIM-128DF93CAB36C7E3
    claim_text: A snippet grounding link shall be constrains, requires_property, requires_predicate or requires_rule
    role: normative
    status: modeled
    span:
      start: 174
      end: 274
logic_claims:
  - CLAIM-FCC5400A046BAB07
  - CLAIM-C133FB4D31CABA59
  - CLAIM-779A77B3EC880CE7
  - CLAIM-128DF93CAB36C7E3
id: REQ-agent-core-hook-limits
type: req
---
An edit snippet shall hold at most 1200 characters. A hook shall offer at most 3 requirement candidates. Firm edit confirmation shall be switched by KIBI_CONFIRM_FIRM_EDITS. A snippet grounding link shall be constrains, requires_property, requires_predicate or requires_rule.

## Context

packages/agent-core/src builds the edit snippets REQ-agent-core-edit-snippets shows agents before an edit, the request candidates REQ-claude-request-topic-candidates offers and the firm-edit guard REQ-claude-firm-edit-confirmation runs. Their limits and names are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"