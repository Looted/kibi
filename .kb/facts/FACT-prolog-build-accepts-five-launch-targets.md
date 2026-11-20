---
title: Accepts Five Launch Targets = true
status: active
fact_kind: property_value
subject_key: kibi.prolog.build_pipeline_validation
property_key: accepts_five_launch_targets
operator: eq
value_type: bool
value_bool: true
text_ref: scripts/swipl-spike.py
claim_text: The SWI-Prolog build pipeline configuration must accept linux-x64-gnu, linux-arm64-gnu, darwin-arm64, darwin-x64, and win32-x64
origin:
  kind: agent
  recorded_at: '2026-11-20T11:02:24.983Z'
claim_key: CLAIM-0BA6AB0B0F426510
id: FACT-prolog-build-accepts-five-launch-targets
type: fact
---
The pipeline configuration and workflow contract accept exactly five launch targets: the four POSIX source-built targets plus win32-x64 (repackaged from the pinned upstream installer, see REQ-prolog-win32-prebuilt-provenance). Any further target is refused (SCEN-NEG-prolog-build-pipeline-validation-FOREIGN-TARGET).