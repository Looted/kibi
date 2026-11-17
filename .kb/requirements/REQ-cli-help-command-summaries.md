---
title: kibi --help lists each command by its first sentence
status: open
priority: must
required_evidence: tested
semantic_text: The kibi --help output must list each command with the first sentence of its description. The kibi --help output must not list the narrow operations that the MCP composite tools route to. Those unlisted commands must still run. Each command's own help must keep its full description.
rationale: kibi --help printed every command's full description, about 16,700 characters, and is what an agent reads to find the CLI route of an operation the MCP server does not list. The first sentence names what each command does; the narrow routes that skill, model and an upsert dry run already cover only added length.
tags:
  - cli
  - tool-surface
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the W4 statements as worded in the statement file (decision card, 17:53Z). Requested as: Maintainer request, 2026-11-16: list six MCP tools by default and the rest under a full profile chosen by configuration, an environment variable or a flag, with the bootstrap tools also listed while the knowledge base is empty; advertise about 15 kb_upsert capture fields and point to the operation-fields resource for the rest; resolve the double delivery of discovery results by what each host forwards; and list each kibi --help command by the first sentence of its description.'
  recorded_at: '2026-11-16T20:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 527dfd5df5fd857e7379b6e0d09fc673af8a81c137db7d09420a2a19d1e1c48f
semantic_inventory:
  - claim_key: CLAIM-4CCA3B55B5B694D5
    claim_text: The kibi --help output must list each command with the first sentence of its description
    role: normative
    status: modeled
    span:
      start: 0
      end: 88
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-DBE041A3F524BB23
    claim_text: The kibi --help output must not list the narrow operations that the MCP composite tools route to
    role: normative
    status: modeled
    span:
      start: 90
      end: 186
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-1DC15822186B22F3
    claim_text: Those unlisted commands must still run
    role: normative
    status: modeled
    span:
      start: 188
      end: 226
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-B9E0DD86DA1E4C1F
    claim_text: Each command's own help must keep its full description
    role: normative
    status: modeled
    span:
      start: 228
      end: 282
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-4CCA3B55B5B694D5
  - CLAIM-DBE041A3F524BB23
  - CLAIM-1DC15822186B22F3
  - CLAIM-B9E0DD86DA1E4C1F
id: REQ-cli-help-command-summaries
type: req
---
The kibi --help output must list each command with the first sentence of its description. The kibi --help output must not list the narrow operations that the MCP composite tools route to. Those unlisted commands must still run. Each command's own help must keep its full description.

## Why

kibi --help printed every command's full description, about 16,700 characters, and is what an agent reads to find the CLI route of an operation the MCP server does not list. The first sentence names what each command does; the narrow routes that skill, model and an upsert dry run already cover only added length.

## Source

> Maintainer request, 2026-11-16: list six MCP tools by default and the rest under a full profile chosen by configuration, an environment variable or a flag, with the bootstrap tools also listed while the knowledge base is empty; advertise about 15 kb_upsert capture fields and point to the operation-fields resource for the rest; resolve the double delivery of discovery results by what each host forwards; and list each kibi --help command by the first sentence of its description.