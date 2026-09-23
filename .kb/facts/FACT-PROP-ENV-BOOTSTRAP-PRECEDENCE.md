---
title: Env bootstrap precedence order
status: active
tags:
  - lane:strict
  - env
  - bootstrap
text_ref: .kb/requirements/REQ-kibi-env-bootstrap.md
fact_kind: property_value
subject_key: kibi.env_bootstrap
property_key: precedence_order
operator: eq
value_type: string
value_string: process>project_env>user_env>legacy_env
canonical_key: kibi.env_bootstrap:precedence_order:eq:process>project_env>user_env>legacy_env
claim_key: CLAIM-9F67B4E7EF5AA95B
claim_text: Non-empty process environment values win over project `.env.kibi` or `KIBI_ENV_FILE`, which win over user `~/.config/kibi/env`, which win over legacy `.env` gap-fill
id: FACT-PROP-ENV-BOOTSTRAP-PRECEDENCE
type: fact
---
