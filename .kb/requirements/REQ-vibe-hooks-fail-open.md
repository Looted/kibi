---
title: Vibe hooks anchor at the workspace root and always fail open
status: open
semantic_text: Vibe hooks must resolve the workspace root from the payload cwd and match file paths against that root. On any error or in a non-Kibi workspace a hook must exit 0 with no output and no stack trace.
semantic_clauses:
  - Vibe hooks must resolve the workspace root from the payload cwd and match file paths against that root
  - On any error or in a non-Kibi workspace a hook must exit 0 with no output and no stack trace
semantic_inventory:
  - claim_key: CLAIM-B6723C9770B371F7
    claim_text: Vibe hooks must resolve the workspace root from the payload cwd and match file paths against that root
    role: normative
    status: modeled
    span:
      start: 0
      end: 102
  - claim_key: CLAIM-3DDF8BFFB218AF44
    claim_text: On any error or in a non-Kibi workspace a hook must exit 0 with no output and no stack trace
    role: normative
    status: modeled
    span:
      start: 104
      end: 196
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c339c739b735734199e6c6d88e7b8f066986a385ca514e53252568579c38b9ee
logic_claims:
  - CLAIM-B6723C9770B371F7
  - CLAIM-3DDF8BFFB218AF44
origin:
  kind: agent
  ref: 'Maintainer review of PR #818, 2026-11-19: the five kibi-vibe requirements state the intended behavior and are approved as written.'
  approved_by: maintainer
  recorded_at: '2026-11-19T20:09:49.089Z'
id: REQ-vibe-hooks-fail-open
type: req
---
## Context

Requested by the maintainer (2026-11-19): hooks run on every prompt and file read, so they must be cheap, anchored at the repo root (sessions may start in a subdirectory), and must never block or crash a session. Source: packages/vibe/bin/hooks/.

See the linked scenario for the executable behavior.