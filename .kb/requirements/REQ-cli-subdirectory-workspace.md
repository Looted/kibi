---
title: kibi run in a subdirectory uses the workspace knowledge base
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - cli
  - workspace
semantic_text: A kibi command run in a subdirectory of a Kibi workspace must use the knowledge base of the nearest enclosing directory that holds .kb/manifest.json. Relative path options must resolve from the directory where the command was typed. The init command and an explicit KIBI_WORKSPACE must keep the given directory.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7af9df58ab2a3828484af16d11d3ee7d5eba25feb1c7a8bed9b2b7d167eceba8
semantic_inventory:
  - claim_key: CLAIM-48D8BCC69F9C80EA
    claim_text: A kibi command run in a subdirectory of a Kibi workspace must use the knowledge base of the nearest enclosing directory that holds .kb/manifest.json
    role: normative
    status: modeled
    span:
      start: 0
      end: 148
  - claim_key: CLAIM-935847C38F7FF8AD
    claim_text: Relative path options must resolve from the directory where the command was typed
    role: normative
    status: modeled
    span:
      start: 150
      end: 231
  - claim_key: CLAIM-7A23B5C900230815
    claim_text: The init command and an explicit KIBI_WORKSPACE must keep the given directory
    role: normative
    status: modeled
    span:
      start: 233
      end: 310
logic_claims:
  - CLAIM-48D8BCC69F9C80EA
  - CLAIM-935847C38F7FF8AD
  - CLAIM-7A23B5C900230815
origin:
  kind: agent
  recorded_at: '2026-10-26T13:32:31.609Z'
id: REQ-cli-subdirectory-workspace
type: req
---
A kibi command run in a subdirectory of a Kibi workspace must use the knowledge base of the nearest enclosing directory that holds .kb/manifest.json. Relative path options must resolve from the directory where the command was typed. The init command and an explicit KIBI_WORKSPACE must keep the given directory.

## Context

A kibi command typed in a subdirectory of a repository, such as apps/server in a monorepo, compiled a second, empty branch store there instead of finding the repository's .kb. Queries then returned no requirements, kb_apply_plan wrote .kb/proof/integrations.json into the subdirectory, and kibi prove at the root reported no proof integration. Kibi now walks up to the nearest .kb/manifest.json, the way git finds its repository, and keeps relative path options meaning what the user typed.
