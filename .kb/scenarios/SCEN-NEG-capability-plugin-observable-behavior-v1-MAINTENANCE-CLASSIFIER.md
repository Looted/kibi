---
title: Maintenance operations do not invoke external classifiers even when one is activated
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:16:26.738Z'
id: SCEN-NEG-capability-plugin-observable-behavior-v1-MAINTENANCE-CLASSIFIER
type: scenario
---
Given an activated augment classifier and a shadow classifier, when classification is composed for kb_check or the semantic advisor runs inside kb_check, then no external decision or shadow comparison is produced and no plugin is imported.

This is the failure side of the operation allowlist: maintenance must stay deterministic and offline. documentation/tests/e2e/capability-plugins.e2e.ts asserts "maintenance composition does not invoke external classifiers" and "maintenance operations do not import plugins".
