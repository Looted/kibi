---
title: kibi migrate --apply-safe must apply an approved legacy branch migration against the legacy store its plan previewed, running that migration before it starts the KB engine, and must not create an empty hashed branch store beside a legacy store it has not migrated
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: cli_apply_safe_migrates_previewed_legacy_store
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-68C5169549CC9104
claim_text: kibi migrate --apply-safe must apply an approved legacy branch migration against the legacy store its plan previewed, running that migration before it starts the KB engine, and must not create an empty hashed branch store beside a legacy store it has not migrated
text_ref: REQ-kibi-cli-legacy-apply-safe
tags:
  - lane:strict
  - fact:property_value
  - branching
  - migration
origin:
  kind: agent
  recorded_at: '2026-11-15T17:00:00.000Z'
id: FACT-kibi-cli-legacy-apply-safe-migrates-previewed-store
type: fact
---
kibi migrate --apply-safe must apply an approved legacy branch migration against the legacy store its plan previewed, running that migration before it starts the KB engine, and must not create an empty hashed branch store beside a legacy store it has not migrated. Grounds a clause of REQ-kibi-cli-legacy-apply-safe.