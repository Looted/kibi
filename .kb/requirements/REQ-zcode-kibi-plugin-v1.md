---
id: REQ-zcode-kibi-plugin-v1
title: 'ZCode Kibi Plugin v1: Optional MCP adapter package'
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
semantic_text: |-
  The kibi-zcode package must remain optional.

  Installing or enabling kibi-zcode must not modify core Kibi runtime components.

  Project-local Kibi logic used through kibi-zcode must remain provided by kibi-core.

  Project-local Kibi command workflows used through kibi-zcode must remain provided by kibi-cli.

  Project-local Kibi MCP operations used through kibi-zcode must remain provided by kibi-mcp.

  When kibi-zcode is installed and enabled, it must expose a ZCode plugin manifest.

  When kibi-zcode is installed and enabled, it must expose bundled Kibi skills.

  When kibi-zcode is installed and enabled, it must expose a kibi-bootstrap command.

  When kibi-zcode is installed and enabled, it must expose advisory lifecycle hooks.

  When kibi-zcode is installed and enabled, it must expose an MCP configuration.

  The exposed MCP configuration must resolve the project-local kibi-mcp binary.

  When the resolved project root does not own .kb/manifest.json, kibi-zcode hooks must emit no output.

  When the resolved project root does not own .kb/manifest.json, the kibi-zcode MCP endpoint must expose no tools.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
type: req
semantic_source_hash: d594b6e4c1e6223e7fe7e4444c587a8156617da95236593740285d80ed18bfa7
semantic_inventory:
  - claim_key: CLAIM-BE46AFC52D56D8C6
    claim_text: The kibi-zcode package must remain optional
    role: normative
    status: modeled
    span:
      start: 0
      end: 43
    payload_hash: 3041e76cd6c75e2ec4087a0346949e0ef90df2e0df4dd5e03ae41a9450bdd2c6
  - claim_key: CLAIM-3EA60FAD58B289BD
    claim_text: Installing or enabling kibi-zcode must not modify core Kibi runtime components
    role: normative
    status: modeled
    span:
      start: 46
      end: 124
    payload_hash: 3041e76cd6c75e2ec4087a0346949e0ef90df2e0df4dd5e03ae41a9450bdd2c6
  - claim_key: CLAIM-2F4AE37AAF7B6983
    claim_text: Project-local Kibi logic used through kibi-zcode must remain provided by kibi-core
    role: normative
    status: modeled
    span:
      start: 127
      end: 209
    payload_hash: 3041e76cd6c75e2ec4087a0346949e0ef90df2e0df4dd5e03ae41a9450bdd2c6
  - claim_key: CLAIM-AB3C17FC03076577
    claim_text: Project-local Kibi command workflows used through kibi-zcode must remain provided by kibi-cli
    role: normative
    status: modeled
    span:
      start: 212
      end: 305
    payload_hash: 3041e76cd6c75e2ec4087a0346949e0ef90df2e0df4dd5e03ae41a9450bdd2c6
  - claim_key: CLAIM-90DE3F8567CC6DC9
    claim_text: Project-local Kibi MCP operations used through kibi-zcode must remain provided by kibi-mcp
    role: normative
    status: modeled
    span:
      start: 308
      end: 398
    payload_hash: 3041e76cd6c75e2ec4087a0346949e0ef90df2e0df4dd5e03ae41a9450bdd2c6
  - claim_key: CLAIM-D48239708EAC79D2
    claim_text: When kibi-zcode is installed and enabled, it must expose a ZCode plugin manifest
    role: condition
    status: modeled
    span:
      start: 401
      end: 481
    payload_hash: 3041e76cd6c75e2ec4087a0346949e0ef90df2e0df4dd5e03ae41a9450bdd2c6
  - claim_key: CLAIM-C0D035A1419FC268
    claim_text: When kibi-zcode is installed and enabled, it must expose bundled Kibi skills
    role: condition
    status: modeled
    span:
      start: 484
      end: 560
    payload_hash: 3041e76cd6c75e2ec4087a0346949e0ef90df2e0df4dd5e03ae41a9450bdd2c6
  - claim_key: CLAIM-AB1C7490C60B6553
    claim_text: When kibi-zcode is installed and enabled, it must expose a kibi-bootstrap command
    role: condition
    status: modeled
    span:
      start: 563
      end: 644
    payload_hash: 3041e76cd6c75e2ec4087a0346949e0ef90df2e0df4dd5e03ae41a9450bdd2c6
  - claim_key: CLAIM-90FABB726E325FA4
    claim_text: When kibi-zcode is installed and enabled, it must expose advisory lifecycle hooks
    role: condition
    status: modeled
    span:
      start: 647
      end: 728
    payload_hash: 3041e76cd6c75e2ec4087a0346949e0ef90df2e0df4dd5e03ae41a9450bdd2c6
  - claim_key: CLAIM-7B2EA05B04F0340C
    claim_text: When kibi-zcode is installed and enabled, it must expose an MCP configuration
    role: condition
    status: modeled
    span:
      start: 731
      end: 808
    payload_hash: 3041e76cd6c75e2ec4087a0346949e0ef90df2e0df4dd5e03ae41a9450bdd2c6
  - claim_key: CLAIM-0B200F96DEDB4D84
    claim_text: The exposed MCP configuration must resolve the project-local kibi-mcp binary
    role: normative
    status: modeled
    span:
      start: 811
      end: 887
    payload_hash: 3041e76cd6c75e2ec4087a0346949e0ef90df2e0df4dd5e03ae41a9450bdd2c6
  - claim_key: CLAIM-D736785D7DF3106F
    claim_text: When the resolved project root does not own .kb/manifest.json, kibi-zcode hooks must emit no output
    role: condition
    status: modeled
    span:
      start: 890
      end: 989
    payload_hash: 3041e76cd6c75e2ec4087a0346949e0ef90df2e0df4dd5e03ae41a9450bdd2c6
  - claim_key: CLAIM-A0E2B1D45E38797C
    claim_text: When the resolved project root does not own .kb/manifest.json, the kibi-zcode MCP endpoint must expose no tools
    role: condition
    status: modeled
    span:
      start: 992
      end: 1103
    payload_hash: 3041e76cd6c75e2ec4087a0346949e0ef90df2e0df4dd5e03ae41a9450bdd2c6
logic_claims:
  - CLAIM-BE46AFC52D56D8C6
  - CLAIM-3EA60FAD58B289BD
  - CLAIM-2F4AE37AAF7B6983
  - CLAIM-AB3C17FC03076577
  - CLAIM-90DE3F8567CC6DC9
  - CLAIM-D48239708EAC79D2
  - CLAIM-C0D035A1419FC268
  - CLAIM-AB1C7490C60B6553
  - CLAIM-90FABB726E325FA4
  - CLAIM-7B2EA05B04F0340C
  - CLAIM-0B200F96DEDB4D84
  - CLAIM-D736785D7DF3106F
  - CLAIM-A0E2B1D45E38797C
semantic_clauses:
  - The kibi-zcode package must remain optional
  - Installing or enabling kibi-zcode must not modify core Kibi runtime components
  - Project-local Kibi logic used through kibi-zcode must remain provided by kibi-core
  - Project-local Kibi command workflows used through kibi-zcode must remain provided by kibi-cli
  - Project-local Kibi MCP operations used through kibi-zcode must remain provided by kibi-mcp
  - When kibi-zcode is installed and enabled, it must expose a ZCode plugin manifest
  - When kibi-zcode is installed and enabled, it must expose bundled Kibi skills
  - When kibi-zcode is installed and enabled, it must expose a kibi-bootstrap command
  - When kibi-zcode is installed and enabled, it must expose advisory lifecycle hooks
  - When kibi-zcode is installed and enabled, it must expose an MCP configuration
  - The exposed MCP configuration must resolve the project-local kibi-mcp binary
  - When the resolved project root does not own .kb/manifest.json, kibi-zcode hooks must emit no output
  - When the resolved project root does not own .kb/manifest.json, the kibi-zcode MCP endpoint must expose no tools
---
The `kibi-zcode` package is an optional ZCode adapter.

When installed and enabled, it retains `kibi-core`, `kibi-cli`, and `kibi-mcp` as the foundation for project-local Kibi operations. It exposes a ZCode plugin manifest, bundled Kibi skills, a `kibi-bootstrap` command, advisory lifecycle hooks, and an MCP configuration that resolves the project-local `kibi-mcp` binary. It emits advisory reminders and warnings only; it neither writes directly to `.kb` nor replaces MCP tooling behavior.

The adapter stays silent when the resolved Kibi project root does not own `.kb/manifest.json`. It is documented as optional and provides a supported manual MCP configuration path. Its scope is declarative plugin assets and advisory hooks; Kibi git hooks installed by `kibi init` retain hard-enforcement ownership.