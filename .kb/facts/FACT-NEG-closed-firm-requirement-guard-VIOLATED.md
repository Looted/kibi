---
title: An edit reaches a closed firm requirement's code unguarded
status: active
fact_kind: property_value
subject_key: kibi.firm_edit_review
property_key: current_firm_requirements_unguarded
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T19:23:31.139Z'
id: FACT-NEG-closed-firm-requirement-guard-VIOLATED
type: fact
---
A hook or the commit gate treats a closed firm requirement as retired, so an edit of its code goes through without the ask or the keeps receipt.