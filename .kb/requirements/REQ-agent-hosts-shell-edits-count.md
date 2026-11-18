---
title: An in-place edit through the shell tool counts as a source edit on every host
status: open
priority: should
tags:
  - hooks
  - agent-core
rationale: Agents often edit with sed -i or a redirection instead of the edit tool, and those edits then skipped the rule capture, the firm-rule questions and the stop reminders.
semantic_text: Every host hook with a shell tool must count an in-place edit through that tool, such as sed -i, a redirection, tee or the same inside a shell -c script, as an edit of the files it writes.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 210c73ab04c6179bd51dcf176a355707402e06f8cc6bca46d5a80a4d42a57b00
semantic_inventory:
  - claim_key: CLAIM-19F6C81E1C710C8C
    claim_text: Every host hook with a shell tool must count an in-place edit through that tool, such as sed -i, a redirection, tee or the same inside a shell -c script, as an edit of the files it writes
    role: normative
    status: modeled
    span:
      start: 0
      end: 187
logic_claims:
  - CLAIM-19F6C81E1C710C8C
required_evidence: tested
origin:
  kind: agent
  ref: 'Maintainer approved this requirement on 2026-11-18 (pre-release host parity review).'
  approved_by: maintainer
  recorded_at: '2026-11-17T17:02:23.812Z'
id: REQ-agent-hosts-shell-edits-count
type: req
---
Every host hook with a shell tool must count an in-place edit through that tool, such as sed -i, a redirection, tee or the same inside a shell -c script, as an edit of the files it writes.

## Context

Agents often edit with sed -i or a redirection instead of the edit tool, and those edits then skipped the rule capture, the firm-rule questions and the stop reminders.
