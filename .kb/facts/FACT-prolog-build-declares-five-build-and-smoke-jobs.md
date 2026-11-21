---
title: The build workflow declares separate build and smoke jobs for five launch targets
status: active
fact_kind: property_value
subject_key: kibi.prolog.build_pipeline_validation
property_key: launch_targets_with_separate_build_and_smoke_jobs
operator: eq
value_type: int
value_int: 5
text_ref: scripts/swipl-spike.py
claim_key: CLAIM-33572329C3AA610F
claim_text: The SWI-Prolog build workflow must declare separate build and clean-consumer smoke jobs for each of the five launch targets
origin:
  kind: agent
  recorded_at: '2026-11-20T11:29:40.512Z'
id: FACT-prolog-build-declares-five-build-and-smoke-jobs
type: fact
---
swipl-build.yml declares build and smoke jobs for all five launch targets; the win32-x64 pair (build-windows, smoke-windows) runs on windows-2025 and repacks instead of compiling. Supersedes the four-target value recorded by FACT-prolog-build-declares-separate-build-and-smoke-jobs.