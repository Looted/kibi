---
title: MCP input validation evaluates conditional schema rules like the CLI
status: open
priority: must
tags:
  - mcp
  - validation
  - facts
semantic_text: The MCP server must accept an observation or meta fact that quotes claim text without a claim key. The MCP server must require a claim key for every other fact kind that quotes claim text. The MCP server must evaluate not, enum, const and type conditions in conditional schema rules with the same result as the CLI validator.
semantic_clauses:
  - The MCP server must accept an observation or meta fact that quotes claim text without a claim key.
  - The MCP server must require a claim key for every other fact kind that quotes claim text.
  - The MCP server must evaluate not, enum, const and type conditions in conditional schema rules with the same result as the CLI validator.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a5d078a34402d68bfa0c3ccc78e36daf3dbf3c0f2fc8689f038393a001f31334
semantic_inventory:
  - claim_key: CLAIM-D5328BA890AE432E
    claim_text: The MCP server must accept an observation or meta fact that quotes claim text without a claim key
    role: normative
    status: modeled
    span:
      start: 0
      end: 97
  - claim_key: CLAIM-E4D4C67F8BF9FE7A
    claim_text: The MCP server must require a claim key for every other fact kind that quotes claim text
    role: normative
    status: modeled
    span:
      start: 99
      end: 187
  - claim_key: CLAIM-E30769F2BD9D33DE
    claim_text: The MCP server must evaluate not, enum, const and type conditions in conditional schema rules with the same result as the CLI validator
    role: normative
    status: modeled
    span:
      start: 189
      end: 324
logic_claims:
  - CLAIM-D5328BA890AE432E
  - CLAIM-E4D4C67F8BF9FE7A
  - CLAIM-E30769F2BD9D33DE
origin:
  kind: agent
  recorded_at: '2026-10-07T12:27:17.534Z'
id: REQ-mcp-conditional-input-validation
type: req
---
The MCP server must accept an observation or meta fact that quotes claim text without a claim key. The MCP server must require a claim key for every other fact kind that quotes claim text. The MCP server must evaluate not, enum, const and type conditions in conditional schema rules with the same result as the CLI validator.

## Context
An external onboarding evaluation wrote every ontology-gap review note over MCP as an observation fact with claim text and no claim key. All 73 writes failed with 'Required by conditional JSON Schema rule: claim_key' while the CLI accepted the same payloads, so the review lane added in the previous release did not exist over MCP. The MCP schema converter checked only the required keys of an if condition and ignored its not and enum parts. Piotr asked for MCP validation to agree with the CLI.

## Source
> MCP odrzuca obserwacje z claim_text bez claim_key ... Po CLI (ajv) ten sam payload przechodzi.

Onboarding evaluation of Kibi 2.7.0 and kibi-mcp 3.2.0 in a test project, round 4 analysis (2026-10-07), finding K1.
