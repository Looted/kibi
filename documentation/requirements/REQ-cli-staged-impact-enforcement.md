---
id: REQ-cli-staged-impact-enforcement
title: CLI staged check enforces Kibi impact evidence for behavior edits
status: open
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
source: packages/cli/src/traceability/staged-diagnostics.ts
priority: must
tags: [cli, check, traceability]
links:
  - type: specified_by
    target: SCEN-cli-staged-impact-enforcement
  - type: verified_by
    target: TEST-cli-staged-impact-enforcement
---

The staged check must block behavior-changing source edits unless the staged change set includes Kibi impact evidence or a fresh symbols manifest refresh.
