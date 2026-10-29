---
title: 'Predicate: not conditional_behavior(kibi_usage_telemetry,ci_or_test_runner_without_explicit_opt_in,send_anonymous_events_to_posthog)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_usage_telemetry
  - ci_or_test_runner_without_explicit_opt_in
  - send_anonymous_events_to_posthog
canonical_key: conditional_behavior(kibi_usage_telemetry,ci_or_test_runner_without_explicit_opt_in,send_anonymous_events_to_posthog)
polarity: deny
claim_key: CLAIM-7B1E72BD214645FB
claim_text: Telemetry shall be off in CI and under test runners unless KIBI_TELEMETRY=1 is set
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-10-29T09:39:31.959Z'
id: FACT-PRED-telemetry-off-in-ci-and-tests
type: fact
---
Telemetry shall be off in CI and under test runners unless KIBI_TELEMETRY=1 is set. Grounds one clause of REQ-kibi-anonymous-usage-telemetry as a conditional behavior of anonymous usage telemetry.