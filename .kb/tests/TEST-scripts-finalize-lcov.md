---
id: TEST-scripts-finalize-lcov
title: Verify LCOV finalization script output
status: active
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
links:
  - type: validates
    target: REQ-014
  - type: validates
    target: SCEN-009
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Run the LCOV finalization script against a fixture report and assert that the normalized output and summary are emitted deterministically.
