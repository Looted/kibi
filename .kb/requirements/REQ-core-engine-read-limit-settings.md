---
title: Engine read limit settings
status: open
priority: must
firmness: firm
semantic_text: The engine read time limit environment variable shall be KIBI_ENGINE_READ_TIME_LIMIT_MS. The engine read inference limit environment variable shall be KIBI_ENGINE_READ_INFERENCE_LIMIT. The error code of a read that hits its limit shall be QUERY_LIMIT_EXCEEDED. The engine read time limit cap shall be 115000 milliseconds.
semantic_clauses:
  - The engine read time limit environment variable shall be KIBI_ENGINE_READ_TIME_LIMIT_MS.
  - The engine read inference limit environment variable shall be KIBI_ENGINE_READ_INFERENCE_LIMIT.
  - The error code of a read that hits its limit shall be QUERY_LIMIT_EXCEEDED.
  - The engine read time limit cap shall be 115000 milliseconds.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:30:30.201Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 967778e5aa32482ccbd9ed4ef59a26287b648dea4cf59931df85979ebc15891d
semantic_inventory:
  - claim_key: CLAIM-FE1B49EC94E4A1E4
    claim_text: The engine read time limit environment variable shall be KIBI_ENGINE_READ_TIME_LIMIT_MS
    role: normative
    status: modeled
    span:
      start: 0
      end: 87
  - claim_key: CLAIM-C990EF48B58A51D4
    claim_text: The engine read inference limit environment variable shall be KIBI_ENGINE_READ_INFERENCE_LIMIT
    role: normative
    status: modeled
    span:
      start: 89
      end: 183
  - claim_key: CLAIM-D353B291DCC8ABF9
    claim_text: The error code of a read that hits its limit shall be QUERY_LIMIT_EXCEEDED
    role: normative
    status: modeled
    span:
      start: 185
      end: 259
  - claim_key: CLAIM-446DAB32C6107945
    claim_text: The engine read time limit cap shall be 115000 milliseconds
    role: normative
    status: modeled
    span:
      start: 261
      end: 320
logic_claims:
  - CLAIM-FE1B49EC94E4A1E4
  - CLAIM-C990EF48B58A51D4
  - CLAIM-D353B291DCC8ABF9
  - CLAIM-446DAB32C6107945
id: REQ-core-engine-read-limit-settings
type: req
---
The engine read time limit environment variable shall be KIBI_ENGINE_READ_TIME_LIMIT_MS. The engine read inference limit environment variable shall be KIBI_ENGINE_READ_INFERENCE_LIMIT. The error code of a read that hits its limit shall be QUERY_LIMIT_EXCEEDED. The engine read time limit cap shall be 115000 milliseconds.

## Context

packages/cli/src/engine-limits.ts holds the environment variable names REQ-core-engine-read-limits uses to turn read limits on, the error code a read that hits its limit fails with, and the cap that keeps a requested time limit below the engine's 120 second hard query timeout. They are stated here so each is proved against the constant; how the limits behave stays in REQ-core-engine-read-limits.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"