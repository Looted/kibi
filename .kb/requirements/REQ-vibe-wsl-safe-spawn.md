---
title: Windows WSL spawn is shell-free, distro-aware, and hard-fails on unconvertible paths
status: open
semantic_text: When the launcher runs Kibi inside WSL, every wsl.exe call (including wslpath) must use --exec with literal argv and never a shell string. The WSL distribution must be passed with -d when the workspace path is a wsl.localhost UNC path. The launcher must fail loudly when a Windows path cannot be converted to a WSL path.
semantic_clauses:
  - When the launcher runs Kibi inside WSL, every wsl.exe call (including wslpath) must use --exec with literal argv and never a shell string
  - The WSL distribution must be passed with -d when the workspace path is a wsl.localhost UNC path
  - The launcher must fail loudly when a Windows path cannot be converted to a WSL path
semantic_inventory:
  - claim_key: CLAIM-4CCC0E0B24616A4D
    claim_text: When the launcher runs Kibi inside WSL, every wsl.exe call (including wslpath) must use --exec with literal argv and never a shell string
    role: condition
    status: modeled
    span:
      start: 0
      end: 137
  - claim_key: CLAIM-7AAA50578A87942E
    claim_text: The WSL distribution must be passed with -d when the workspace path is a wsl.localhost UNC path
    role: normative
    status: modeled
    span:
      start: 139
      end: 234
  - claim_key: CLAIM-EFCC898BD2D03D3A
    claim_text: The launcher must fail loudly when a Windows path cannot be converted to a WSL path
    role: normative
    status: modeled
    span:
      start: 236
      end: 319
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0d03d2dbf38e0376a711e82ecbae23f065c08f89dc077207b1f3a184d639b119
logic_claims:
  - CLAIM-4CCC0E0B24616A4D
  - CLAIM-7AAA50578A87942E
  - CLAIM-EFCC898BD2D03D3A
origin:
  kind: agent
  ref: 'Maintainer approval, 2026-11-24: Approved (claim texts as listed; REQ-vibe-wsl-safe-spawn first claim reworded as above).'
  approved_by: maintainer
  recorded_at: '2026-11-19T20:09:44.520Z'
id: REQ-vibe-wsl-safe-spawn
type: req
firmness: firm
---

## Context

Requested by the maintainer (2026-11-19) as review hardening of the kibi-vibe plugin on Windows: when the workspace is a \\wsl.localhost\\<distro>\\ UNC path, the launcher starts Kibi through wsl.exe with --cd and --exec and a literal argument vector, passing that distro with -d, and never interpolates the path into a shell string; a drive-letter path that wslpath cannot convert is a hard error, never a silent cd elsewhere. Source: parseWslUnc, toWslPath, buildWslArgs in packages/vibe/bin/kibi-runtime.mjs.

See the linked scenarios for the executable behavior.

## Source

> Maintainer approval, 2026-11-24: Approved (claim texts as listed; REQ-vibe-wsl-safe-spawn first claim reworded as above).
