---
title: The kibi-cursor portable Agent Plugin artifact has the Agent Plugins 1.0.0 layout
status: open
semantic_text: The kibi-cursor package must publish its agent-plugin directory alongside its .cursor-plugin manifest directory. The root plugin.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 plugin schema. The root plugin.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema, name, version, description, author, homepage, repository, license, keywords and extensions fields. The kibi-cursor portable Agent Plugin artifact must package the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills under its skills directory. The mcp.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 MCP schema. The mcp.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema and mcpServers fields.
semantic_source_field: semantic_text
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof."'
  approved_by: maintainer
  recorded_at: '2026-10-27T07:56:53.887Z'
firmness: firm
semantic_clauses:
  - The kibi-cursor package must publish its agent-plugin directory alongside its .cursor-plugin manifest directory.
  - The root plugin.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 plugin schema.
  - The root plugin.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema, name, version, description, author, homepage, repository, license, keywords and extensions fields.
  - The kibi-cursor portable Agent Plugin artifact must package the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills under its skills directory.
  - The mcp.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 MCP schema.
  - The mcp.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema and mcpServers fields.
priority: must
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_hash: 55f0cb7ec47eeb6d75056c42d93945cd58ba397b80f3edcdbe011cc9ea8809e5
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
  - claim_key: CLAIM-C57C6B8C72A91DE0
    claim_text: The kibi-cursor portable Agent Plugin artifact must package the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills under its skills directory
    role: normative
    status: modeled
    span:
      start: 433
      end: 631
  - claim_key: CLAIM-3CFB86CAE4410F0A
    claim_text: The mcp.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 MCP schema
    role: normative
    status: modeled
    span:
      start: 633
      end: 743
  - claim_key: CLAIM-55DF8815B6C4466A
    claim_text: The mcp.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema and mcpServers fields
    role: normative
    status: modeled
    span:
      start: 745
      end: 855
logic_claims:
  - CLAIM-E598B71811986145
  - CLAIM-E646BF9B4FA68963
  - CLAIM-C7B0F78EAB07CB58
  - CLAIM-C57C6B8C72A91DE0
  - CLAIM-3CFB86CAE4410F0A
  - CLAIM-55DF8815B6C4466A
id: REQ-cursor-agent-plugin-package
type: req
---
The kibi-cursor package must publish its agent-plugin directory alongside its .cursor-plugin manifest directory. The root plugin.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 plugin schema. The root plugin.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema, name, version, description, author, homepage, repository, license, keywords and extensions fields. The kibi-cursor portable Agent Plugin artifact must package the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills under its skills directory. The mcp.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 MCP schema. The mcp.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema and mcpServers fields.

## Context

The Agent Plugins 1.0.0 standard defines a root plugin.json and an mcp.json, each with its own JSON schema. These claims pin the layout and fields of the artifact kibi-cursor publishes, so each one is proved by reading the artifact files. The field lists are the fields the two schemas define.
