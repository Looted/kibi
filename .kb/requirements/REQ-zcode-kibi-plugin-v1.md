---
id: REQ-zcode-kibi-plugin-v1
title: "ZCode Kibi Plugin v1: Optional MCP adapter package"
status: open
created_at: 2026-09-15T00:00:00.000Z
updated_at: 2026-09-15T00:00:00.000Z
source: packages/zcode/
priority: must
tags:
  - kibi
  - zcode
  - plugin
  - mcp
links:
  - type: specified_by
    target: SCEN-zcode-kibi-plugin-v1
  - type: verified_by
    target: TEST-zcode-kibi-plugin-v1
semantic_text: >-
  The `kibi-zcode` package is an optional ZCode adapter for teams who want Kibi
  in ZCode workflows without changing core Kibi runtime components.


  When installed and enabled, it should:


  Keep `kibi-core`, `kibi-cli`, and `kibi-mcp` as the required foundation for
  project-local Kibi operations.

  Bundle and expose a ZCode plugin manifest, bundled Kibi skills, a
  kibi-bootstrap command, advisory lifecycle hooks, and an MCP server
  configuration that resolves the project-local `kibi-mcp` binary.

  Run hook-driven reminders and warnings only, so it does not replace MCP
  tooling behavior or write directly to `.kb`.

  Stay silent in workspaces whose Kibi project root does not own
  `.kb/manifest.json`.

  Remain clearly documented as optional, with a supported manual MCP
  configuration path when teams do not use the marketplace install path.


  This requirement scopes the adapter to declarative plugin assets plus advisory
  hooks; hard enforcement stays with the Kibi git hooks installed by `kibi
  init`.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
type: req
semantic_source_hash: c8db1f952d128c41477ca59341fc54e4b0af9e541cb78dc93fa0d597855e1923
semantic_inventory:
  - claim_key: CLAIM-3D83C00A13F6211D
    claim_text: The `kibi-zcode` package is an optional ZCode adapter for teams who
      want Kibi in ZCode workflows without changing core Kibi runtime components
    role: descriptive
    status: missing
    span:
      start: 0
      end: 142
    payload_hash: 6d396601c73e7208e322a16f6e38ac2be7c4d9432b3d17312aa82f7c94b9de9e
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-D4F92779716B9C05
    claim_text: When installed
    role: condition
    status: ontology_gap
    span:
      start: 145
      end: 159
    payload_hash: 6d396601c73e7208e322a16f6e38ac2be7c4d9432b3d17312aa82f7c94b9de9e
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-125AC9B7304A9D37
    claim_text: enabled, it should
    role: normative
    status: ontology_gap
    span:
      start: 164
      end: 182
    payload_hash: 6d396601c73e7208e322a16f6e38ac2be7c4d9432b3d17312aa82f7c94b9de9e
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-3171C2531952AE05
    claim_text: Keep `kibi-core`, `kibi-cli`, and `kibi-mcp` as the required
      foundation for project-local Kibi operations
    role: normative
    status: ontology_gap
    span:
      start: 185
      end: 290
    payload_hash: 6d396601c73e7208e322a16f6e38ac2be7c4d9432b3d17312aa82f7c94b9de9e
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-88D1BA09B30816FC
    claim_text: Bundle and expose a ZCode plugin manifest, bundled Kibi skills, a
      kibi-bootstrap command, advisory lifecycle hooks, and an MCP server
      configuration that resolves the project-local `kibi-mcp` binary
    role: descriptive
    status: missing
    span:
      start: 292
      end: 489
    payload_hash: 6d396601c73e7208e322a16f6e38ac2be7c4d9432b3d17312aa82f7c94b9de9e
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-3160BE8A381F6D96
    claim_text: Run hook-driven reminders and warnings only, so it does not replace
      MCP tooling behavior or write directly to `.kb`
    role: descriptive
    status: missing
    span:
      start: 491
      end: 606
    payload_hash: 6d396601c73e7208e322a16f6e38ac2be7c4d9432b3d17312aa82f7c94b9de9e
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-7BE01B5BB2914DD2
    claim_text: Stay silent in workspaces whose Kibi project root does not own
      `.kb/manifest.json`
    role: descriptive
    status: missing
    span:
      start: 608
      end: 690
    payload_hash: 6d396601c73e7208e322a16f6e38ac2be7c4d9432b3d17312aa82f7c94b9de9e
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-169D24C531F415B5
    claim_text: Remain clearly documented as optional, with a supported manual MCP
      configuration path when teams do not use the marketplace install path
    role: normative
    status: ontology_gap
    span:
      start: 692
      end: 828
    payload_hash: 6d396601c73e7208e322a16f6e38ac2be7c4d9432b3d17312aa82f7c94b9de9e
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-FD14E69F39484100
    claim_text: This requirement scopes the adapter to declarative plugin assets
      plus advisory hooks
    role: descriptive
    status: missing
    span:
      start: 831
      end: 915
    payload_hash: 6d396601c73e7208e322a16f6e38ac2be7c4d9432b3d17312aa82f7c94b9de9e
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-65956D223391AE0C
    claim_text: hard enforcement stays with the Kibi git hooks installed by `kibi init`
    role: descriptive
    status: missing
    span:
      start: 917
      end: 988
    payload_hash: 6d396601c73e7208e322a16f6e38ac2be7c4d9432b3d17312aa82f7c94b9de9e
    reason: No accepted typed interpretation grounds this assertive proposition.
logic_claims:
  - CLAIM-3D83C00A13F6211D
  - CLAIM-D4F92779716B9C05
  - CLAIM-125AC9B7304A9D37
  - CLAIM-3171C2531952AE05
  - CLAIM-88D1BA09B30816FC
  - CLAIM-3160BE8A381F6D96
  - CLAIM-7BE01B5BB2914DD2
  - CLAIM-169D24C531F415B5
  - CLAIM-FD14E69F39484100
  - CLAIM-65956D223391AE0C
---

The `kibi-zcode` package is an optional ZCode adapter for teams who want Kibi in ZCode workflows without changing core Kibi runtime components.

When installed and enabled, it should:

1. Keep `kibi-core`, `kibi-cli`, and `kibi-mcp` as the required foundation for project-local Kibi operations.
2. Bundle and expose a ZCode plugin manifest, bundled Kibi skills, a kibi-bootstrap command, advisory lifecycle hooks, and an MCP server configuration that resolves the project-local `kibi-mcp` binary.
3. Run hook-driven reminders and warnings only, so it does not replace MCP tooling behavior or write directly to `.kb`.
4. Stay silent in workspaces whose Kibi project root does not own `.kb/manifest.json`.
5. Remain clearly documented as optional, with a supported manual MCP configuration path when teams do not use the marketplace install path.

This requirement scopes the adapter to declarative plugin assets plus advisory hooks; hard enforcement stays with the Kibi git hooks installed by `kibi init`.
