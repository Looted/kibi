---
title: Kibi Testing Native Cli Diagnostics
status: active
text_ref: scripts/swipl-spike.py
tags:
  - strict-modeling
  - confidence:1.00
  - confidence-band:high
  - provenance:scripts-swipl-spike-py
  - lane:strict
  - fact:subject
  - vocabulary:new-subject
fact_kind: subject
subject_key: kibi.testing.native_cli_diagnostics
canonical_key: kibi.testing.native_cli_diagnostics
claim_key: CLAIM-3DBAB91DDA7FD513
claim_text: On Linux, native CLI diagnostics must preserve the monitored command exit code and stdout and stderr
id: FACT-native-cli-diagnostics-subject
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The diagnostic records the native Linux CLI test suite writes about each command it runs, which must keep the command's own result and output intact and bound the private metadata they store. It is test infrastructure, not the CLI's user-facing output.
