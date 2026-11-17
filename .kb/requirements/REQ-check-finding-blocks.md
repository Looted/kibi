---
title: Every kb_check finding says what it blocks
status: open
priority: must
required_evidence: tested
semantic_text: Each finding that kb_check returns must carry a blocks field that is commit when the commit gate refuses a commit over it, merge when the full check fails over it, and none when it is advice.
tags:
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
  ref: 'Measured on a test project, 2026-11-16: the check the hooks recommended returned no violations for a new unowned function, while kibi check --staged on the same diff refused the commit. Maintainer decision, 2026-11-16, approving this statement as worded.'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c960c1fd4bd42ba56e55c0b9da9a81c54a08792ad5601cc682da45cc40d39ad4
semantic_inventory:
  - claim_key: CLAIM-230C174F21872A17
    claim_text: Each finding that kb_check returns must carry a blocks field that is commit when the commit gate refuses a commit over it, merge when the full check fails over it, and none when it is advice
    role: normative
    status: modeled
    span:
      start: 0
      end: 190
logic_claims:
  - CLAIM-230C174F21872A17
id: REQ-check-finding-blocks
type: req
---
Each finding that kb_check returns must carry a blocks field that is commit when the commit gate refuses a commit over it, merge when the full check fails over it, and none when it is advice.

## Why

Three things are called check and they block different steps: the commit gate refuses a commit, the full check fails CI and the merge, and advisory diagnostics block nothing. An agent reading a finding could not tell which of these it faced, so it either fixed advice it could have left or left a finding that later refused its commit.

## Context

The full check tags violations, their diagnostics and violation groups merge, blocking quality diagnostics merge, blocking impact diagnostics commit and the rest none. The staged gate's JSON and kb_check changed:true tag violations commit and each diagnostic commit when it is blocking (blocking: true or severity error), none otherwise.

## Source

> Measured on a test project, 2026-11-16: the check the hooks recommended returned no violations for a new unowned function, while kibi check --staged on the same diff refused the commit.