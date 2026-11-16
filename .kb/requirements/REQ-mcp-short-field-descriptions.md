---
title: MCP advertises one-line field descriptions and kb_skills serves the full text
status: open
priority: must
required_evidence: tested
tags:
  - mcp
  - skills
  - context-cost
semantic_text: The MCP server must advertise each operation input field with a description of at most 120 characters. The full description of every operation input field must be readable through kb_skills. The advertised field description limit shall be 120 characters.
semantic_clauses:
  - The MCP server must advertise each operation input field with a description of at most 120 characters.
  - The full description of every operation input field must be readable through kb_skills.
  - The advertised field description limit shall be 120 characters.
origin:
  kind: agent
  approved_by: maintainer
  recorded_at: '2026-11-16T06:40:17.003Z'
rationale: Field descriptions were about 46,000 characters of the tool list every MCP session loads, while an agent needs most of them only for the field it is filling.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7ee67b6356ec4aa6878abc871e8003b9e6337f707708ed42183fbcfe7e7d6395
semantic_inventory:
  - claim_key: CLAIM-EE10A46F8437DC8F
    claim_text: The MCP server must advertise each operation input field with a description of at most 120 characters
    role: normative
    status: modeled
    span:
      start: 0
      end: 101
  - claim_key: CLAIM-6FE4AFC8E9590AF7
    claim_text: The full description of every operation input field must be readable through kb_skills
    role: normative
    status: modeled
    span:
      start: 103
      end: 189
  - claim_key: CLAIM-AF257391602037F6
    claim_text: The advertised field description limit shall be 120 characters
    role: normative
    status: modeled
    span:
      start: 191
      end: 253
logic_claims:
  - CLAIM-EE10A46F8437DC8F
  - CLAIM-6FE4AFC8E9590AF7
  - CLAIM-AF257391602037F6
id: REQ-mcp-short-field-descriptions
type: req
---
The MCP server must advertise each operation input field with a description of at most 120 characters. The full description of every operation input field must be readable through kb_skills. The advertised field description limit shall be 120 characters.

## Context

Every MCP session loads the input schemas of all Kibi tools into the model's context. The tool list measured about 152,000 characters, and field descriptions made up about 46,000 of the input schemas' 83,000. Many of them were long usage notes written for one field, repeated on each tool, such as the 439-character workspaceRoot description on all 16 tools. Each field now advertises a hand-written description of at most 120 characters, and the full text moves to resources/operation-fields.md in the kibi-usage skill, generated from the operation catalog, so an agent that needs the detail reads it on demand. The schemas themselves, and so validation, are unchanged.

## Source

Maintainer-approved statement (2026-11-16): "The MCP server must advertise each operation input field with a description of at most 120 characters. The full description of every operation input field must be readable through kb_skills."

Maintainer-approved addition (2026-11-16), stating the limit as its own sentence so a certificate can prove it: "The advertised field description limit shall be 120 characters."
