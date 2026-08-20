---
title: REQ-008 automatic branch initialization mode
status: active
tags:
  - branching
  - initialization
  - legacy-policy
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: initialization_mode
operator: eq
value_type: string
value_string: automatic
polarity: require
claim_key: CLAIM-4D1D4C3CFF05EA23
claim_text: 'On branch checkout, if the branch KB does not exist, it is created by copying from the resolved default branch (see brief.md for precedence: config `defaultBranch`, then `origin/HEAD`, then `main`)'
id: FACT-REQ-008-BRANCH-INITIALIZATION-MODE
type: fact
---
