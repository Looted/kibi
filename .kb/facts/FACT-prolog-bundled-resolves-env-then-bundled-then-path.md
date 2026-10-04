---
title: Resolves Env Then Bundled Then Path = true
status: active
fact_kind: property_value
subject_key: kibi.prolog.bundled_runtime
property_key: resolves_env_then_bundled_then_path
operator: eq
value_type: bool
value_bool: true
canonical_key: packages-cli-src-prolog-swipl-resolver-ts:kibi.prolog.bundled_runtime:resolves_env_then_bundled_then_path:eq:true
claim_key: CLAIM-FDC71CEE4F0FEE05
claim_text: Kibi must resolve SWI-Prolog from KIBI_SWIPL first, then from the verified bundled platform package, then from swipl on PATH
claim_span_start: 0
claim_span_end: 124
text_ref: packages/cli/src/prolog/swipl-resolver.ts
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
id: FACT-prolog-bundled-resolves-env-then-bundled-then-path
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
