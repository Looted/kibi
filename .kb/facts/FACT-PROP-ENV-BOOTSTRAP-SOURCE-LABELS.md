---
title: Env bootstrap source label set
status: active
tags:
  - lane:strict
  - env
  - bootstrap
text_ref: .kb/requirements/REQ-kibi-env-bootstrap.md
fact_kind: property_value
subject_key: kibi.env_bootstrap
property_key: source_label_set
operator: eq
value_type: string
value_string: process|project_env|user_env|legacy_env|missing
canonical_key: kibi.env_bootstrap:source_label_set:eq:process|project_env|user_env|legacy_env|missing
claim_key: CLAIM-65CFF32C6CEA6DF6
claim_text: Bootstrap source labels are process, project_env, user_env, legacy_env, or missing, and must never include secret values
id: FACT-PROP-ENV-BOOTSTRAP-SOURCE-LABELS
type: fact
---
