---
title: A maintainer relies on numeric contradiction answers backed by a machine-checked proof
status: active
priority: should
tags:
  - proof
  - lean
  - contradictions
origin:
  kind: agent
  recorded_at: '2026-10-24T20:30:56.379Z'
id: SCEN-kibi-intervals-verified
type: scenario
---
Given the Lean 4 model in proof/lean of the folds intervals.pl runs (an interval with open or closed ends and excluded points for a real variable, an integer range with excluded integers for an integer variable), when CI builds it, then the theorems that each fold is true exactly when some value satisfies every constraint, and that satisfiable and entailed are exact for any number of variables, check with no sorry. When the differential run then decides hundreds of thousands of generated cases (bounds that collide, strict against closed ends, fractional bounds on integer variables, excluded end points, entailment with each negated operator) with intervals.pl on the bundled SWI-Prolog, the Lean model's executable and a CLP(Q) and CLP(FD) oracle, all three give the same answer on every case, and a planted change to intervals.pl makes them disagree.