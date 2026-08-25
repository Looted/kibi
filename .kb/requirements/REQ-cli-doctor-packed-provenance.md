---
title: Doctor reports installed package provenance without requiring exported manifests
status: open
tags:
  - doctor
  - packaging
  - provenance
priority: must
semantic_text: When kibi doctor runs with JSON output on an installed consumer workspace, it must report the installed kibi-mcp package version by resolving the package entrypoint whenever the package does not export its package.json subpath. The doctor must not emit the package-provenance-unresolved migration action when every probed Kibi package resolves to an installed manifest. The package-provenance-unresolved migration action is reserved for packages that are genuinely absent from the install graph.
logic_claims:
  - CLAIM-2F306D93E829A446
  - CLAIM-4C2B0FF892A705D9
  - CLAIM-BEE788A61C4A7D8B
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 850918f77ae6941cb8c081f28a0ba33fca5fd3897cdca4e2c5ecf522ffb98d2d
semantic_inventory:
  - claim_key: CLAIM-2F306D93E829A446
    claim_text: When kibi doctor runs with JSON output on an installed consumer workspace, it must report the installed kibi-mcp package version by resolving the package entrypoint whenever the package does not export its package.json subpath
    payload_hash: 59e231d9081285fe5945565a0e6321261fcd8c070ebefbc361274198bfb3d7a2
    reason: No accepted typed interpretation grounds this assertive proposition.
    role: condition
    span:
      end: 226
      start: 0
    status: missing
  - claim_key: CLAIM-BEE788A61C4A7D8B
    claim_text: The doctor must not emit the package-provenance-unresolved migration action when every probed Kibi package resolves to an installed manifest
    payload_hash: 59e231d9081285fe5945565a0e6321261fcd8c070ebefbc361274198bfb3d7a2
    reason: No accepted typed interpretation grounds this assertive proposition.
    role: normative
    span:
      end: 368
      start: 228
    status: missing
  - claim_key: CLAIM-4C2B0FF892A705D9
    claim_text: The package-provenance-unresolved migration action is reserved for packages that are genuinely absent from the install graph
    payload_hash: 59e231d9081285fe5945565a0e6321261fcd8c070ebefbc361274198bfb3d7a2
    reason: No accepted typed interpretation grounds this assertive proposition.
    role: descriptive
    span:
      end: 494
      start: 370
    status: missing
id: REQ-cli-doctor-packed-provenance
type: req
---
When kibi doctor runs with JSON output on an installed consumer workspace, it must report the installed kibi-mcp package version by resolving the package entrypoint whenever the package does not export its package.json subpath. The doctor must not emit the package-provenance-unresolved migration action when every probed Kibi package resolves to an installed manifest. The package-provenance-unresolved migration action is reserved for packages that are genuinely absent from the install graph.
