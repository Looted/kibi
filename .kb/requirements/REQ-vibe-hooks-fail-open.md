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
firmness: firm
---
## Context

Requested by the maintainer (2026-11-19) for the Mistral Vibe hooks in packages/vibe/bin/hooks/: Vibe fires them at startup, before each agent turn and after each tool call, so they must stay cheap, resolve the Kibi workspace from the hook payload rather than the process cwd (a Vibe session may start in a subdirectory), and always fail open — any error, or a directory with no Kibi workspace, exits 0 with no stack trace. Source: packages/vibe/bin/hooks/, packages/vibe/ai.mistral.vibe/hooks.toml.

See the linked scenarios for the executable behavior.