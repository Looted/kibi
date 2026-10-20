---
title: Symbol sourceFile paths stay inside the workspace
status: open
tags:
  - security
  - symbols
  - coordinates
  - mcp
  - cli
priority: must
semantic_text: Symbol sourceFile values must be workspace-relative paths. Coordinate refresh and related source reads must resolve paths under the workspace root only and must refuse absolute paths, .. escapes, and symlink targets outside the workspace so they cannot be used as an outside-file existence or substring oracle.
logic_claims:
  - CLAIM-7A590145B64A85FE
semantic_clauses:
  - Symbol sourceFile values must be workspace-relative paths. Coordinate refresh and related source reads must resolve paths under the workspace root only and must refuse absolute paths, .. escapes, and symlink targets outside the workspace so they cannot be used as an outside-file existence or substring oracle.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 99c00acb4c241b56c1c610d7e17d7e8336efee8edbe34f4b92e5b807c1f53430
semantic_inventory:
  - claim_key: CLAIM-7A590145B64A85FE
    claim_text: Symbol sourceFile values must be workspace-relative paths. Coordinate refresh and related source reads must resolve paths under the workspace root only and must refuse absolute paths, .. escapes, and symlink targets outside the workspace so they cannot be used as an outside-file existence or substring oracle
    role: normative
    status: modeled
    span:
      start: 0
      end: 309
id: REQ-symbol-sourcefile-workspace-confinement
type: req
origin:
  kind: human
  ref: private-disclosure:mcp-safeguard-2026-10-19
  recorded_at: '2026-10-19T12:21:49.894Z'
rationale: 'Private disclosure via mcp-safeguard: absolute sourceFile values let coordinate refresh act as an outside-workspace file oracle.'
---
# Symbol sourceFile paths stay inside the workspace

Symbol `sourceFile` values must be workspace-relative paths. Coordinate refresh and related source reads must resolve paths under the workspace root only and must refuse absolute paths, `..` escapes, and symlink targets outside the workspace so they cannot be used as an outside-file existence or substring oracle.

## Context

Reported privately against Looted/kibi by mcp-safeguard on 2026-10-19. Coordinate refresh accepted absolute `sourceFile` values and returned line/column plus content hash metadata, enabling an oracle against files outside the workspace. Reason for the rule: close that confused-deputy path while keeping workspace-relative symbol anchoring.
