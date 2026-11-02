---
title: A Kibi hook command print format shall be shell, lefthook, husky or pre-commit
status: active
fact_kind: property_value
subject_key: kibi.git_hooks.print_formats
claim_key: CLAIM-325D4EB22241A28E
claim_text: A Kibi hook command print format shall be shell, lefthook, husky or pre-commit
text_ref: REQ-git-hook-print-formats
property_key: print_formats
operator: eq
value_type: set
value_set:
  - shell
  - lefthook
  - husky
  - pre-commit
origin:
  kind: agent
  recorded_at: '2026-10-30T19:39:42.777Z'
id: FACT-git-hook-print-formats
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.