---
title: Init scaffolds the canonical .kb/ contract
status: open
priority: must
tags:
  - cli
  - init
  - canonical-layout
semantic_text: 'kibi init must create the canonical .kb/ knowledge namespace: entity lanes under .kb/requirements, .kb/scenarios, .kb/tests, .kb/facts, .kb/adr, .kb/flags, and .kb/events, plus .kb/symbols.yaml, .kb/symbol-coordinates.yaml, and Kibi-owned .kb/manifest.json lifecycle metadata. It must not write user-configurable .kb/config.json, entity path overrides, or persistent check-disabling policy. Git hooks may be installed. Gitignore must track authored .kb/ knowledge lanes and ignore derived .kb/branches, .kb/recovery, .kb/verification, and .kb/briefs trees.'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8226cb0d3eea007fba322e0a61c569b9b5d77cd0888204eff04a387154ab2ba4
logic_claims:
  - CLAIM-9C2F47DE993B2F09
  - CLAIM-61EBDC8FA535AB94
  - CLAIM-D5CDBB89EBEAF3A0
  - CLAIM-AF0E9350F5CB0FFF
semantic_clauses:
  - 'kibi init must create the canonical .kb/ knowledge namespace: entity lanes under .kb/requirements, .kb/scenarios, .kb/tests, .kb/facts, .kb/adr, .kb/flags, and .kb/events, plus .kb/symbols.yaml, .kb/symbol-coordinates.yaml, and Kibi-owned .kb/manifest.json lifecycle metadata'
  - It must not write user-configurable .kb/config.json, entity path overrides, or persistent check-disabling policy
  - Git hooks may be installed
  - Gitignore must track authored .kb/ knowledge lanes and ignore derived .kb/branches, .kb/recovery, .kb/verification, and .kb/briefs trees
semantic_inventory:
  - claim_key: CLAIM-9C2F47DE993B2F09
    claim_text: 'kibi init must create the canonical .kb/ knowledge namespace: entity lanes under .kb/requirements, .kb/scenarios, .kb/tests, .kb/facts, .kb/adr, .kb/flags, and .kb/events, plus .kb/symbols.yaml, .kb/symbol-coordinates.yaml, and Kibi-owned .kb/manifest.json lifecycle metadata'
    role: normative
    status: modeled
    span:
      start: 0
      end: 275
  - claim_key: CLAIM-61EBDC8FA535AB94
    claim_text: It must not write user-configurable .kb/config.json, entity path overrides, or persistent check-disabling policy
    role: normative
    status: modeled
    span:
      start: 277
      end: 389
  - claim_key: CLAIM-D5CDBB89EBEAF3A0
    claim_text: Git hooks may be installed
    role: descriptive
    status: modeled
    span:
      start: 391
      end: 417
  - claim_key: CLAIM-AF0E9350F5CB0FFF
    claim_text: Gitignore must track authored .kb/ knowledge lanes and ignore derived .kb/branches, .kb/recovery, .kb/verification, and .kb/briefs trees
    role: normative
    status: modeled
    span:
      start: 419
      end: 555
id: REQ-cli-init-canonical
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the supersession reasons recovered from history in the KB gold-standard review (reasons batch 1): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---
kibi init must create the canonical .kb/ knowledge namespace: entity lanes under .kb/requirements, .kb/scenarios, .kb/tests, .kb/facts, .kb/adr, .kb/flags, and .kb/events, plus .kb/symbols.yaml, .kb/symbol-coordinates.yaml, and Kibi-owned .kb/manifest.json lifecycle metadata. It must not write user-configurable .kb/config.json, entity path overrides, or persistent check-disabling policy. Git hooks may be installed. Gitignore must track authored .kb/ knowledge lanes and ignore derived .kb/branches, .kb/recovery, .kb/verification, and .kb/briefs trees.

## Why this changed
Knowledge moved to the canonical .kb/ layout with Kibi-owned check enforcement, so init no longer writes config.json, and projects can no longer relocate entity paths or disable rules. Source: PR 215 "adopt a canonical .kb/ project contract".
