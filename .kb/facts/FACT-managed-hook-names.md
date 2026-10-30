---
title: A Kibi-managed git hook shall be post-checkout, post-merge, post-rewrite or pre-commit
status: active
fact_kind: property_value
subject_key: kibi.git_hooks.managed
claim_key: CLAIM-3CDE819547F73291
claim_text: A Kibi-managed git hook shall be post-checkout, post-merge, post-rewrite or pre-commit
text_ref: REQ-git-hook-managed-names
property_key: managed_hooks
operator: eq
value_type: set
value_set:
  - post-checkout
  - post-merge
  - post-rewrite
  - pre-commit
origin:
  kind: agent
  recorded_at: '2026-10-28T22:40:18.337Z'
id: FACT-managed-hook-names
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.