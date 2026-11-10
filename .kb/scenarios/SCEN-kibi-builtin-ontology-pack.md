---
title: 'Core, policy and product sentences match their predicate rules the same way each time'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-builtin-ontology-pack
type: scenario
---
Given the sentences "Paid launches must stay disabled until the budget is approved.", "Customer data must be stored in the EU region." and "Mobile builds must pass smoke tests before TestFlight distribution.", when the builtin ontology pack matches each one twice, then they yield the guard, data_residency_rule and release_gate_rule candidates, and both runs return identical candidates.

This is the success side of builtin ontology matching. documentation/tests/e2e/capability-plugins.e2e.ts, in its builtin providers section, exercises it.
