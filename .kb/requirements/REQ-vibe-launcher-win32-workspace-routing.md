---
title: On Windows the launcher routes drive-letter workspaces natively and wsl.localhost UNC workspaces through the named distro, with explicit force overrides
status: open
priority: must
tags:
  - vibe
  - launcher
  - win32
  - routing
semantic_text: 'On Windows, a drive-letter workspace (C:\...) must run Kibi natively: the project-local kibi-mcp and kibi bins are spawned directly with the current Node and SWI-Prolog comes from the bundled kibi-swipl-win32-x64 runtime, with no WSL probe. A wsl.localhost UNC workspace must run inside the distro named in the path through wsl.exe with -d, --cd and --exec as literal argv. KIBI_FORCE_WSL=1 must force the WSL wrap for drive-letter workspaces, converting paths with wsl.exe wslpath. KIBI_FORCE_DIRECT=1 must force a native spawn even for UNC workspaces, which Windows reads natively. A forced WSL wrap of a path that wslpath cannot convert must be a hard error, never a silent fallback to another directory.'
origin:
  kind: agent
  ref: 'Maintainer approval, 2026-11-24: Approved (claim texts as listed).'
  approved_by: maintainer
  recorded_at: '2026-11-20T18:00:00.000Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 30313b675da3c49cbb60f99a2227468cbaf584fe83287fa1fbfbc787286a9388
semantic_inventory:
  - claim_key: CLAIM-A724211EF602B0CE
    claim_text: 'On Windows, a drive-letter workspace (C:\...) must run Kibi natively: the project-local kibi-mcp and kibi bins are spawned directly with the current Node and SWI-Prolog comes from the bundled kibi-swipl-win32-x64 runtime, with no WSL probe'
    role: normative
    status: modeled
    span:
      start: 0
      end: 239
  - claim_key: CLAIM-84A885691B46634B
    claim_text: A wsl.localhost UNC workspace must run inside the distro named in the path through wsl.exe with -d, --cd and --exec as literal argv
    role: normative
    status: modeled
    span:
      start: 241
      end: 372
  - claim_key: CLAIM-C4A0FB33FAD447F4
    claim_text: KIBI_FORCE_WSL=1 must force the WSL wrap for drive-letter workspaces, converting paths with wsl.exe wslpath
    role: normative
    status: modeled
    span:
      start: 374
      end: 481
  - claim_key: CLAIM-6DBDCACBC64701B6
    claim_text: KIBI_FORCE_DIRECT=1 must force a native spawn even for UNC workspaces, which Windows reads natively
    role: normative
    status: modeled
    span:
      start: 483
      end: 582
  - claim_key: CLAIM-C116F79F9C6B93F5
    claim_text: A forced WSL wrap of a path that wslpath cannot convert must be a hard error, never a silent fallback to another directory
    role: normative
    status: modeled
    span:
      start: 584
      end: 706
logic_claims:
  - CLAIM-A724211EF602B0CE
  - CLAIM-84A885691B46634B
  - CLAIM-C4A0FB33FAD447F4
  - CLAIM-6DBDCACBC64701B6
  - CLAIM-C116F79F9C6B93F5
id: REQ-vibe-launcher-win32-workspace-routing
type: req
firmness: firm
---

## Context

PR #818 adds the kibi-vibe plugin. Now that kibi-swipl-win32-x64 bundles a native Windows SWI-Prolog runtime (PR #824), Windows sessions no longer need WSL at all unless the workspace itself is a wsl.localhost UNC path. planRuntime in packages/vibe/bin/kibi-runtime.mjs decides per workspace kind; this requirement pins the routing table and the two escape hatches. Covered by packages/vibe/tests/runtime.test.mjs via TEST-vibe-plugin-contract-v1.

## Rationale

Running natively on drive-letter workspaces removes a WSL probe from every launch and every hook invocation, and uses the verified bundled runtime instead of a distro-local Node.

## Source

> Maintainer approval, 2026-11-24: Approved (claim texts as listed).
