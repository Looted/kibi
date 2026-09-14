---
title: Coordinate refresh capability and authored repair regressions
status: passing
verification_scope: unit
id: TEST-coordinate-repair-capability
type: test
---
Behavioral regressions in packages/cli/tests/public/operations/symbol-repair-plan.test.ts verify repeated Python extraction misses, typed repair guidance, explicit coarse-anchor recovery, supported JS/TS and Python extraction, and mixed or unknown-symbol batches. The packed dependency-ordered repair-plan suite additionally exercises validate-upsert, upsert, repeated CLI refresh, coverage, migration actions, and coordinate recovery.