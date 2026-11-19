---
title: 'Launcher workspace resolution order: env keys, .git-bounded walk, pointer file, cwd'
status: open
semantic_text: The launcher must resolve the workspace from KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT when set. Otherwise it must walk from the cwd to the nearest ancestor owning .kb/manifest.json without crossing a .git boundary. Otherwise it must read a kibi-workspace.txt pointer file next to the launcher.
semantic_clauses:
  - The launcher must resolve the workspace from KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT when set
  - Otherwise it must walk from the cwd to the nearest ancestor owning .kb/manifest.json without crossing a .git boundary
  - Otherwise it must read a kibi-workspace.txt pointer file next to the launcher
semantic_inventory:
  - claim_key: CLAIM-30A7BBCB3BE7CC6F
    claim_text: The launcher must resolve the workspace from KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT when set
    role: normative
    status: modeled
    span:
      start: 0
      end: 100
  - claim_key: CLAIM-F9AB482037544557
    claim_text: Otherwise it must walk from the cwd to the nearest ancestor owning .kb/manifest.json without crossing a .git boundary
    role: normative
    status: modeled
    span:
      start: 102
      end: 219
  - claim_key: CLAIM-1A38B21877689128
    claim_text: Otherwise it must read a kibi-workspace.txt pointer file next to the launcher
    role: normative
    status: modeled
    span:
      start: 221
      end: 298
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 850c0819692d9a29254faf1056823f86324bd987ea92aba6d77a3f8821ec4b24
logic_claims:
  - CLAIM-30A7BBCB3BE7CC6F
  - CLAIM-F9AB482037544557
  - CLAIM-1A38B21877689128
origin:
  kind: agent
  ref: 'Maintainer review of PR #818, 2026-11-19: the five kibi-vibe requirements state the intended behavior and are approved as written.'
  approved_by: maintainer
  recorded_at: '2026-11-19T20:09:46.819Z'
id: REQ-vibe-workspace-resolution
type: req
firmness: firm
---
## Context

Requested by the maintainer (2026-11-19): Mistral Vibe Desktop spawns the stdio MCP server with a cwd that is not the session folder, so resolveWorkspace in packages/vibe/bin/kibi-runtime.mjs resolves the Kibi workspace deterministically — trimmed KIBI_WORKSPACE / KIBI_PROJECT_ROOT / KIBI_ROOT first, then a .git-bounded upward walk for .kb/manifest.json, then the kibi-workspace.txt pointer beside the launcher, then the cwd. Source: packages/vibe/bin/kibi-runtime.mjs.

See the linked scenarios for the executable behavior.