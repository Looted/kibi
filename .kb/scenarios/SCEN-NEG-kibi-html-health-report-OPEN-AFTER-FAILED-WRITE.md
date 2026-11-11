---
title: kibi report --open never opens the browser after a failed write
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-05T07:20:00.000Z'
id: SCEN-NEG-kibi-html-health-report-OPEN-AFTER-FAILED-WRITE
type: scenario
---
Given a packed CLI workspace with a stand-in browser launcher on PATH and a regular file where the output directory should be, when `kibi report --output report-blocker/index.html --open` runs, then the command exits non-zero and the launcher is never called. A following `kibi report --output kibi-report-open --open` succeeds and calls the launcher with the written index.html.

This is the failure side of opening only after a successful write. documentation/tests/e2e/packed/cli-workflows.test.ts "should open the health report only after it was written" exercises it.
