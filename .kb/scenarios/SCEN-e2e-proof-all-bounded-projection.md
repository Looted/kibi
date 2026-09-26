---
title: Installed prove-all selects contracts from large archived metadata
status: active
tags:
  - proof
  - consumer
  - projection
id: SCEN-e2e-proof-all-bounded-projection
type: scenario
---
Given 500 archived tests with large schema-valid metadata and one active proof contract, the installed public prove-all command selects only that contract, executes its real assertion command and persists one fresh passing receipt. Public paged queries independently establish that all full test properties exceed 10 MiB. This scenario does not claim receipt-history stress or multi-page contract selection.
