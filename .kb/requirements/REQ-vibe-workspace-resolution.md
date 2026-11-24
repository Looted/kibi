---
title: 'Launcher workspace resolution order: env keys, .git-bounded walk, pointer file outside other repos, cwd'
status: open
semantic_text: The launcher must resolve the workspace from KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT when set. Otherwise it must walk from the cwd to the nearest ancestor owning .kb/manifest.json without crossing a .git boundary. Otherwise, unless the cwd is inside a Git repository that does not hold the launcher, it must read a kibi-workspace.txt pointer file next to the launcher.
semantic_clauses:
  - The launcher must resolve the workspace from KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT when set
  - Otherwise it must walk from the cwd to the nearest ancestor owning .kb/manifest.json without crossing a .git boundary
  - Otherwise, unless the cwd is inside a Git repository that does not hold the launcher, it must read a kibi-workspace.txt pointer file next to the launcher
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
  - claim_key: CLAIM-5349E1C47AACB6AA
    claim_text: Otherwise, unless the cwd is inside a Git repository that does not hold the launcher, it must read a kibi-workspace.txt pointer file next to the launcher
    role: exception
    status: modeled
    span:
      start: 221
      end: 374
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b515f7bf2bd79f72baadc41626536e57d96cfd399e3d04750ac04af16c4afe92
logic_claims:
  - CLAIM-30A7BBCB3BE7CC6F
  - CLAIM-F9AB482037544557
  - CLAIM-5349E1C47AACB6AA
origin:
  kind: human
  ref: 'Maintainer decision, 2026-11-23, on "Should the Vibe workspace pointer skip folders inside other Git repos?": "Yes, scope the pointer".'
  recorded_at: '2026-11-23T04:00:17.498Z'
id: REQ-vibe-workspace-resolution
type: req
firmness: firm
---

## Context

Requested by the maintainer (2026-11-19): Mistral Vibe Desktop spawns the stdio MCP server with a cwd that is not the session folder, so resolveWorkspace in packages/vibe/bin/kibi-runtime.mjs resolves the Kibi workspace deterministically — trimmed KIBI_WORKSPACE / KIBI_PROJECT_ROOT / KIBI_ROOT first, then a .git-bounded upward walk for .kb/manifest.json, then the kibi-workspace.txt pointer beside the launcher, then the cwd. Source: packages/vibe/bin/kibi-runtime.mjs.

See the linked scenarios for the executable behavior.

## Source

> Maintainer decision, 2026-11-23, on "Should the Vibe workspace pointer skip folders inside other Git repos?": "Yes, scope the pointer".
