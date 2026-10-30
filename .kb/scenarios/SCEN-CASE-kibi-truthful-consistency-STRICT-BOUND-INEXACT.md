---
title: A strict-bound value conflict is reported exactly and a compatible bound is not
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:58:21.987Z'
id: SCEN-CASE-kibi-truthful-consistency-STRICT-BOUND-INEXACT
type: scenario
---
Given current requirements on one subject that require the remaining quota to be gt 0, eq 0 and gte 0, when kb_check runs domain-contradictions, then only the gt 0 versus eq 0 pair is reported, and the gte 0 requirement keeps no_conflict_found, so a comparison that treated the strict bound inexactly in either direction is caught.

This covers one violating item past the invariant, `gt 0` on `numeric_comparisons_decided_inexactly`. packages/cli/tests/consumer/truthful-consistency.test.ts "reports incomplete analysis for unmodeled clauses and exact strict-bound conflicts" exercises it through kibi check and kibi coverage.
