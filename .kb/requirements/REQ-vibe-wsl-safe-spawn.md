---
title: Windows WSL spawn is shell-free, distro-aware, and hard-fails on unconvertible paths
status: open
semantic_text: On Windows with a qualifying WSL distribution the launcher must start Kibi through wsl.exe --cd and --exec with literal argv and never through a shell string. The WSL distribution must be passed with -d when the workspace path is a wsl.localhost UNC path. The launcher must fail loudly when a Windows path cannot be converted to a WSL path.
semantic_clauses:
  - On Windows with a qualifying WSL distribution the launcher must start Kibi through wsl.exe --cd and --exec with literal argv and never through a shell string
  - The WSL distribution must be passed with -d when the workspace path is a wsl.localhost UNC path
  - The launcher must fail loudly when a Windows path cannot be converted to a WSL path
semantic_inventory:
  - claim_key: CLAIM-C4B3392EC82DEBF6
    claim_text: On Windows with a qualifying WSL distribution the launcher must start Kibi through wsl.exe --cd and --exec with literal argv and never through a shell string
    role: normative
    status: modeled
    span:
      start: 0
      end: 157
  - claim_key: CLAIM-7AAA50578A87942E
    claim_text: The WSL distribution must be passed with -d when the workspace path is a wsl.localhost UNC path
    role: normative
    status: modeled
    span:
      start: 159
      end: 254
  - claim_key: CLAIM-EFCC898BD2D03D3A
    claim_text: The launcher must fail loudly when a Windows path cannot be converted to a WSL path
    role: normative
    status: modeled
    span:
      start: 256
      end: 339
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d301bbd73cdb0e9561227fc7fbbd7571c2688c696e9f7233af4a16e84651c68c
logic_claims:
  - CLAIM-C4B3392EC82DEBF6
  - CLAIM-7AAA50578A87942E
  - CLAIM-EFCC898BD2D03D3A
origin:
  kind: agent
  recorded_at: '2026-11-19T20:09:44.520Z'
id: REQ-vibe-wsl-safe-spawn
type: req
---
## Context

Requested by the maintainer (2026-11-19) as code-review hardening of the first vibe plugin PR: WSL wrapping must not interpolate paths into a shell string (injection), must use the distro from the UNC path, and must not silently cd elsewhere on conversion failure. Source: packages/vibe/bin/kibi-runtime.mjs.

See the linked scenario for the executable behavior.