---
title: The kibi-cursor portable Agent Plugin artifact has the Agent Plugins 1.0.0 layout
status: open
semantic_text: The kibi-cursor package must publish its agent-plugin directory alongside its .cursor-plugin manifest directory. The root plugin.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 plugin schema. The root plugin.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema, name, version, description, author, homepage, repository, license, keywords and extensions fields. The kibi-cursor portable Agent Plugin artifact must package the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others under its skills directory. The mcp.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 MCP schema. The mcp.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema and mcpServers fields.
semantic_source_field: semantic_text
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-10-27T07:56:53.887Z'
firmness: firm
semantic_clauses:
  - The kibi-cursor package must publish its agent-plugin directory alongside its .cursor-plugin manifest directory.
  - The root plugin.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 plugin schema.
  - The root plugin.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema, name, version, description, author, homepage, repository, license, keywords and extensions fields.
  - The kibi-cursor portable Agent Plugin artifact must package the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others under its skills directory.
  - The mcp.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 MCP schema.
  - The mcp.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema and mcpServers fields.
priority: must
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_hash: bb957ff7da083fb6f8391b31b6bb7dcb05099e3652af157a63ad1bb444e6db08
semantic_inventory:
  - claim_key: CLAIM-E598B71811986145
    claim_text: The kibi-cursor package must publish its agent-plugin directory alongside its .cursor-plugin manifest directory
    role: normative
    status: modeled
    span:
      start: 0
      end: 111
  - claim_key: CLAIM-E646BF9B4FA68963
    claim_text: The root plugin.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 plugin schema
    role: normative
    status: modeled
    span:
      start: 113
      end: 234
  - claim_key: CLAIM-C7B0F78EAB07CB58
    claim_text: The root plugin.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema, name, version, description, author, homepage, repository, license, keywords and extensions fields
    role: normative
    status: modeled
    span:
      start: 236
      end: 431
  - claim_key: CLAIM-8AE72DEF7EF73CAE
    claim_text: The kibi-cursor portable Agent Plugin artifact must package the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others under its skills directory
    role: normative
    status: modeled
    span:
      start: 433
      end: 666
  - claim_key: CLAIM-3CFB86CAE4410F0A
    claim_text: The mcp.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 MCP schema
    role: normative
    status: modeled
    span:
      start: 668
      end: 778
  - claim_key: CLAIM-55DF8815B6C4466A
    claim_text: The mcp.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema and mcpServers fields
    role: normative
    status: modeled
    span:
      start: 780
      end: 890
logic_claims:
  - CLAIM-E598B71811986145
  - CLAIM-E646BF9B4FA68963
  - CLAIM-C7B0F78EAB07CB58
  - CLAIM-8AE72DEF7EF73CAE
  - CLAIM-3CFB86CAE4410F0A
  - CLAIM-55DF8815B6C4466A
id: REQ-cursor-agent-plugin-package
type: req
---
The kibi-cursor package must publish its agent-plugin directory alongside its .cursor-plugin manifest directory. The root plugin.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 plugin schema. The root plugin.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema, name, version, description, author, homepage, repository, license, keywords and extensions fields. The kibi-cursor portable Agent Plugin artifact must package the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others under its skills directory. The mcp.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 MCP schema. The mcp.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema and mcpServers fields.

## Context

The Agent Plugins 1.0.0 standard defines a root plugin.json and an mcp.json, each with its own JSON schema. These claims pin the layout and fields of the artifact kibi-cursor publishes, so each one is proved by reading the artifact files. The field lists are the fields the two schemas define.
