---
title: Engine client reclaims dead Unix sockets under startLockPath and waits for draining daemons
status: open
firmness: default
origin:
  kind: agent
  ref: 'Maintainer reply (2026-11-23) approving the 4 new requirements in the Kibi signoff view for GitHub issue #829 (.2, .3, .7): "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-23T11:17:01Z'
rationale: 'Inferred from issue #829.3: recovering a crashed engine socket automatically must serialize against the bind-to-listen start window and active publication or drain phases without unlinking regular files.'
semantic_text: The engine client must reclaim a dead Unix socket refusing connections under the start lock, fail closed on non-socket files or ambiguous socket errors, and wait for a draining daemon before starting or replacing a writer.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: df37c34073af38e71b556a79230d169e093349f2e013ecad583a519f13ad91cf
semantic_inventory:
  - claim_key: CLAIM-528E25F76490BE42
    claim_text: The engine client must reclaim a dead Unix socket refusing connections under the start lock, fail closed on non-socket files or ambiguous socket errors, and wait for a draining daemon before starting or replacing a writer
    role: normative
    status: modeled
    span:
      start: 0
      end: 221
logic_claims:
  - CLAIM-528E25F76490BE42
id: REQ-engine-client-reclaim-dead-unix-socket
type: req
priority: should
tags:
  - cli
  - engine
  - socket
required_evidence: tested
semantic_clauses:
  - The engine client must reclaim a dead Unix socket refusing connections under the start lock, fail closed on non-socket files or ambiguous socket errors, and wait for a draining daemon before starting or replacing a writer.
---
The engine client must reclaim a dead Unix socket refusing connections under the start lock, fail closed on non-socket files or ambiguous socket errors, and wait for a draining daemon before starting or replacing a writer.

## Context

Inferred from issue #829.3: recovering a crashed engine socket automatically must serialize against the bind-to-listen start window and active publication or drain phases without unlinking regular files.
