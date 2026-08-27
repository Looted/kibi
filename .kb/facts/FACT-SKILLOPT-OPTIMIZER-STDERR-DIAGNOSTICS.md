---
title: Optimizer exit failures previously discarded stderr diagnostics
status: closed
tags:
  - skillopt
  - review:diagnostics
fact_kind: observation
id: FACT-SKILLOPT-OPTIMIZER-STDERR-DIAGNOSTICS
type: fact
---
---
id: FACT-SKILLOPT-OPTIMIZER-STDERR-DIAGNOSTICS
fact_kind: observation
title: Optimizer exit failures previously discarded stderr diagnostics
status: closed
---

During the 2026-08-24 paid suite, the kibi-freshness optimizer codex exec exited 1 with an empty runtime directory and CodexOptimizerError reported only optimizer_exit:1, making transient failures indistinguishable from systematic ones. runCodexOptimization now appends the last stderr lines (capped) to the thrown error so mid-suite paid failures carry their own evidence.
