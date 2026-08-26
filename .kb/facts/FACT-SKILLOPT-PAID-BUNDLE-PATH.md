---
title: Bundle suite gains its real paid pipeline
status: closed
tags:
  - skillopt
  - bundle
fact_kind: observation
id: FACT-SKILLOPT-PAID-BUNDLE-PATH
type: fact
---
---
id: FACT-SKILLOPT-PAID-BUNDLE-PATH
fact_kind: observation
title: Bundle suite gains its real paid pipeline
status: closed
---

The bundle command previously had no non-fake path, so skillopt:suite could never run. runPaidBundleGate assembles baseline vs candidate four-skill bundles (per-skill frozen best_skill.md fallback canonical), replays the eight held-out bundle fixtures through the standard brokered cell runner and sealed scorer, applies absolute floors (security=0, mean>=70, hard-rate>=0.5 on the candidate arm), and writes bundle-verdict.json with external-verdict-required adoption semantics. Byte-identical assemblies report no-candidate-delta instead of dressing up baseline re-validation as compatibility.
