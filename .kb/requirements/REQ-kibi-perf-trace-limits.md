---
title: Performance trace settings and limits
status: open
priority: must
firmness: firm
semantic_text: The performance timings environment variable shall be KIBI_PERF_TIMINGS. The performance trace folder environment variable shall be KIBI_PERF_TRACE_DIR. A performance trace shall be at most 524288 bytes. A performance trace shall hold at most 5000 events.
semantic_clauses:
  - The performance timings environment variable shall be KIBI_PERF_TIMINGS.
  - The performance trace folder environment variable shall be KIBI_PERF_TRACE_DIR.
  - A performance trace shall be at most 524288 bytes.
  - A performance trace shall hold at most 5000 events.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T17:35:44.637Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 993b9687b86927709c5549deeed61ca553bca7bfc2f1eba3394052eff8d30844
semantic_inventory:
  - claim_key: CLAIM-6BEEB64FC7E70756
    claim_text: The performance timings environment variable shall be KIBI_PERF_TIMINGS
    role: normative
    status: modeled
    span:
      start: 0
      end: 71
  - claim_key: CLAIM-D236C7BC49421956
    claim_text: The performance trace folder environment variable shall be KIBI_PERF_TRACE_DIR
    role: normative
    status: modeled
    span:
      start: 73
      end: 151
  - claim_key: CLAIM-3620E377E6B7BEAF
    claim_text: A performance trace shall be at most 524288 bytes
    role: normative
    status: modeled
    span:
      start: 153
      end: 202
  - claim_key: CLAIM-55F3786ECA1A6DD0
    claim_text: A performance trace shall hold at most 5000 events
    role: normative
    status: modeled
    span:
      start: 204
      end: 254
logic_claims:
  - CLAIM-6BEEB64FC7E70756
  - CLAIM-D236C7BC49421956
  - CLAIM-3620E377E6B7BEAF
  - CLAIM-55F3786ECA1A6DD0
id: REQ-kibi-perf-trace-limits
type: req
---
The performance timings environment variable shall be KIBI_PERF_TIMINGS. The performance trace folder environment variable shall be KIBI_PERF_TRACE_DIR. A performance trace shall be at most 524288 bytes. A performance trace shall hold at most 5000 events.

## Context

packages/cli/src/performance-trace.ts writes the timing traces REQ-installed-staged-impact-timing-integrity reads: two environment variables turn timings on and pick the trace folder, and a trace is cut at a byte and event bound. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"