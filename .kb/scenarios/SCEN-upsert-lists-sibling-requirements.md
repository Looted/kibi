---
title: kb_upsert lists the other requirements on the quantity it changes
status: active
priority: must
expects: success
tags:
  - upsert
  - sibling-requirements
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:37.416Z'
id: SCEN-upsert-lists-sibling-requirements
type: scenario
---
Changing client.call_quota.remaining from 500 to 400 lists the requirement grounded on the fact as shared_fact and the requirement grounded on the floor fact as same_quantity, each first in the warnings and as a required kb_upsert next action.