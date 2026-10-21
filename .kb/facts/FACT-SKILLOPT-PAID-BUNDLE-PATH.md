---
title: Bundle suite gains its real paid pipeline
status: superseded
tags:
  - skillopt
  - bundle
fact_kind: observation
id: FACT-SKILLOPT-PAID-BUNDLE-PATH
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
---
id: FACT-SKILLOPT-PAID-BUNDLE-PATH
fact_kind: observation
title: Bundle suite gains its real paid pipeline
status: superseded
---

The bundle command previously had no non-fake path, so skillopt:suite could never run. runPaidBundleGate assembles baseline vs candidate four-skill bundles (per-skill frozen best_skill.md fallback canonical), replays the eight held-out bundle fixtures through the standard brokered cell runner and sealed scorer, applies absolute floors (security=0, mean>=70, hard-rate>=0.5 on the candidate arm), and writes bundle-verdict.json with external-verdict-required adoption semantics. Byte-identical assemblies report no-candidate-delta instead of dressing up baseline re-validation as compatibility.

The assembled four-skill bundle suite was later removed. SkillOpt now evaluates and packages one skill at a time, so the operator suite command, the paid bundle gate, the bundle manifest form of campaign package, and the held-out bundle cells no longer exist.
