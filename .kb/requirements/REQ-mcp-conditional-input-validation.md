---
title: MCP input validation evaluates conditional schema rules like the CLI
status: open
required_evidence: tested
priority: must
tags:
  - mcp
  - validation
  - facts
semantic_text: The MCP server must accept an observation or meta fact that quotes claim text without a claim key. The MCP server must accept a subject, property value or predicate fact that quotes claim text without a claim key. The MCP server must evaluate not, enum, const and type conditions in conditional schema rules with the same result as the CLI validator.
semantic_clauses:
  - The MCP server must accept an observation or meta fact that quotes claim text without a claim key.
  - The MCP server must accept a subject, property value or predicate fact that quotes claim text without a claim key.
  - The MCP server must evaluate not, enum, const and type conditions in conditional schema rules with the same result as the CLI validator.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: eceff2a3f4cca22b1d362c34dd7831b62de395dc10d77d599d35dd8f08cdff29
semantic_inventory:
  - claim_key: CLAIM-D5328BA890AE432E
    claim_text: The MCP server must accept an observation or meta fact that quotes claim text without a claim key
    role: normative
    status: modeled
    span:
      start: 0
      end: 97
  - claim_key: CLAIM-AA98C628B5151CE6
    claim_text: The MCP server must accept a subject, property value or predicate fact that quotes claim text without a claim key
    role: normative
    status: modeled
    span:
      start: 99
      end: 212
  - claim_key: CLAIM-E30769F2BD9D33DE
    claim_text: The MCP server must evaluate not, enum, const and type conditions in conditional schema rules with the same result as the CLI validator
    role: normative
    status: modeled
    span:
      start: 214
      end: 349
logic_claims:
  - CLAIM-D5328BA890AE432E
  - CLAIM-AA98C628B5151CE6
  - CLAIM-E30769F2BD9D33DE
origin:
  kind: agent
  recorded_at: '2026-10-07T12:27:17.534Z'
id: REQ-mcp-conditional-input-validation
type: req
---
The MCP server must accept an observation or meta fact that quotes claim text without a claim key. The MCP server must accept a subject, property value or predicate fact that quotes claim text without a claim key. The MCP server must evaluate not, enum, const and type conditions in conditional schema rules with the same result as the CLI validator.

## Context
An external onboarding evaluation wrote every ontology-gap review note over MCP as an observation fact with claim text and no claim key. All 73 writes failed with 'Required by conditional JSON Schema rule: claim_key' while the CLI accepted the same payloads, so the review lane added in the previous release did not exist over MCP. The MCP schema converter checked only the required keys of an if condition and ignored its not and enum parts. Piotr asked for MCP validation to agree with the CLI.

The CLI later began deriving claim_key from claim_text for every fact kind, so the input schema stopped demanding the key. On 2026-10-30 the second rule was reworded from requiring a claim key to accepting these facts without one.

## Source
> MCP odrzuca obserwacje z claim_text bez claim_key ... Po CLI (ajv) ten sam payload przechodzi.

Onboarding evaluation of Kibi 2.7.0 and kibi-mcp 3.2.0 in a test project, round 4 analysis (2026-10-07), finding K1.
