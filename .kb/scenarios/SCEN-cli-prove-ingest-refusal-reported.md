---
title: A refused ingest fails its integration and the summary still prints
status: active
expects: success
priority: should
tags:
  - proof
  - cli
origin:
  kind: agent
  recorded_at: '2026-11-20T16:10:50.168Z'
id: SCEN-cli-prove-ingest-refusal-reported
type: scenario
---
Given two integrations selected by kibi prove --all, when proof ingest refuses the first integration's artifact, then kibi prove lists "integration '<id>': Proof ingest failed: ..." in failures, prints the JSON summary with the other integration's run, exits 1, and records only the other integration as ingested. When one partition of a command run is refused, the receipts of the partitions ingested before it are still counted.