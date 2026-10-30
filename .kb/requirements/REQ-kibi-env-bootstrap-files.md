---
title: Kibi's environment file names
status: open
priority: must
firmness: firm
semantic_text: The Kibi project environment file shall be .env.kibi. The legacy Kibi environment file shall be .env.
semantic_clauses:
  - The Kibi project environment file shall be .env.kibi.
  - The legacy Kibi environment file shall be .env.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:40:34.812Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: cdac56e77ff71b4ee917f23df98cb50e00933516b37b41ed72659c7ab77dec2a
semantic_inventory:
  - claim_key: CLAIM-34904BC7A1521580
    claim_text: The Kibi project environment file shall be .env.kibi
    role: normative
    status: modeled
    span:
      start: 0
      end: 52
  - claim_key: CLAIM-1F71DA2071DB7162
    claim_text: The legacy Kibi environment file shall be .env
    role: normative
    status: modeled
    span:
      start: 54
      end: 100
logic_claims:
  - CLAIM-34904BC7A1521580
  - CLAIM-1F71DA2071DB7162
id: REQ-kibi-env-bootstrap-files
type: req
---
The Kibi project environment file shall be .env.kibi. The legacy Kibi environment file shall be .env.

## Context

packages/cli/src/env/bootstrap.ts names the files REQ-kibi-env-bootstrap loads before a command runs: the project file Kibi owns and the legacy shared file it still reads. They are stated here so each name is proved against the constant; precedence and resolver use stay in REQ-kibi-env-bootstrap.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"